import type { Config } from "./config.js";
import { firstNonEmpty } from "./config.js";
import { tripletValuesToString } from "./format.js";
import type {
  ApiLangValue,
  HierarchyResult,
  SearchResponse,
  SearchResult,
  SPARQLResult,
  TextifierClaim,
  TextifierEntity,
} from "./types.js";

interface EntityMetadata {
  label: string;
  description: string;
}

interface TextifierOptions {
  externalIDs: boolean;
  allRanks: boolean;
  references: boolean;
  qualifiers: boolean;
  lang: string;
}

interface HierarchyNode {
  label: string;
  instanceOf: string[];
  subclassOf: string[];
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

export class HTTPError extends Error {
  readonly statusCode: number;
  readonly body: string;

  constructor(statusCode: number, body: string) {
    const trimmedBody = body.trim();
    const message =
      trimmedBody === ""
        ? `remote service returned HTTP ${statusCode}`
        : `remote service returned HTTP ${statusCode}: ${trimmedBody}`;

    super(message);
    this.statusCode = statusCode;
    this.body = body;
  }
}

export function asHTTPError(error: unknown): error is HTTPError {
  return error instanceof HTTPError;
}

export class Client {
  private readonly cfg: Config;

  constructor(cfg: Config) {
    validateConfig(cfg);
    this.cfg = cfg;
  }

  timeout(): number {
    return this.cfg.timeoutMs;
  }

  async getJSON<T>(
    endpoint: string,
    params?: URLSearchParams,
    headers?: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<T> {
    const requestURL = new URL(endpoint);
    if (params) {
      for (const [key, value] of params.entries()) {
        requestURL.searchParams.set(key, value);
      }
    }

    const requestHeaders = new Headers();
    requestHeaders.set("Accept", "application/json");
    requestHeaders.set("User-Agent", this.cfg.userAgent);

    for (const [key, value] of Object.entries(headers || {})) {
      if (value.trim() !== "") {
        requestHeaders.set(key, value);
      }
    }

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => {
      controller.abort(new Error("request timeout"));
    }, this.cfg.timeoutMs);

    if (signal) {
      if (signal.aborted) {
        controller.abort(signal.reason);
      } else {
        signal.addEventListener(
          "abort",
          () => {
            controller.abort(signal.reason);
          },
          { once: true },
        );
      }
    }

    let response: Response;
    try {
      response = await fetch(requestURL, {
        method: "GET",
        headers: requestHeaders,
        signal: controller.signal,
      });
    } catch (error) {
      throw new Error(`request failed: ${errorMessage(error)}`, {
        cause: error,
      });
    } finally {
      clearTimeout(timeoutHandle);
    }

    if (response.status >= 400) {
      const body = (await response.text()).slice(0, 1 << 16);
      throw new HTTPError(response.status, body);
    }

    try {
      return (await response.json()) as T;
    } catch (error) {
      throw new Error(`failed to decode response json: ${errorMessage(error)}`, {
        cause: error,
      });
    }
  }

  async searchItems(
    query: string,
    lang: string,
    limit: number,
    disableVector: boolean,
  ): Promise<SearchResponse> {
    return this.search(query, lang, limit, "item", disableVector);
  }

  async searchProperties(
    query: string,
    lang: string,
    limit: number,
    disableVector: boolean,
  ): Promise<SearchResponse> {
    return this.search(query, lang, limit, "property", disableVector);
  }

  private async search(
    query: string,
    lang: string,
    limit: number,
    kind: "item" | "property",
    disableVector: boolean,
  ): Promise<SearchResponse> {
    const cleanQuery = query.trim();
    if (cleanQuery === "") {
      throw new Error("query cannot be empty");
    }

    const cleanLang = lang.trim() === "" ? "en" : lang.trim();
    const cleanLimit = limit <= 0 ? 10 : limit;

    if (!disableVector) {
      try {
        const vectorResults = await this.vectorSearch(
          cleanQuery,
          cleanLang,
          cleanLimit,
          kind,
        );
        if (vectorResults.length > 0) {
          return {
            source: "vector",
            results: vectorResults,
          };
        }
      } catch {
        // Vector failures should not block keyword fallback.
      }
    }

    const keywordResults = await this.keywordSearch(
      cleanQuery,
      cleanLang,
      cleanLimit,
      kind,
    );

    return {
      source: "keyword",
      results: keywordResults,
    };
  }

  private async vectorSearch(
    query: string,
    lang: string,
    limit: number,
    kind: "item" | "property",
  ): Promise<SearchResult[]> {
    const params = new URLSearchParams();
    params.set("query", query);
    params.set("k", String(limit));

    const headers: Record<string, string> = {};
    if (this.cfg.vectorApiSecret !== "") {
      headers["x-api-secret"] = this.cfg.vectorApiSecret;
    }

    const response = await this.getJSON<Array<{ QID?: string; PID?: string }>>(
      `${this.cfg.vectorSearchUrl.replace(/\/$/, "")}/${kind}/query/`,
      params,
      headers,
    );

    const ids: string[] = [];
    const seen = new Set<string>();

    for (const candidate of response) {
      const id =
        kind === "item" ? (candidate.QID || "").trim() : (candidate.PID || "").trim();
      if (id === "" || seen.has(id)) {
        continue;
      }
      seen.add(id);
      ids.push(id);
    }

    if (ids.length === 0) {
      return [];
    }

    const metadata = await this.getEntitiesLabelsAndDescriptions(ids, lang);
    const results: SearchResult[] = ids.map((id) => ({
      id,
      label: metadata[id]?.label || "",
      description: metadata[id]?.description || "",
    }));

    return results.slice(0, limit);
  }

  private async keywordSearch(
    query: string,
    lang: string,
    limit: number,
    kind: "item" | "property",
  ): Promise<SearchResult[]> {
    const params = new URLSearchParams();
    params.set("action", "wbsearchentities");
    params.set("type", kind);
    params.set("search", query);
    params.set("limit", String(limit));
    params.set("language", lang);
    params.set("format", "json");
    params.set("origin", "*");

    const response = await this.getJSON<{
      search: Array<{
        id: string;
        label?: string;
        description?: string;
        display?: {
          label?: { value?: string };
          description?: { value?: string };
        };
      }>;
    }>(this.cfg.wikidataApiUrl, params);

    return (response.search || []).map((candidate) => ({
      id: candidate.id,
      label: firstNonEmpty(candidate.display?.label?.value, candidate.label),
      description: firstNonEmpty(
        candidate.display?.description?.value,
        candidate.description,
      ),
    }));
  }

  private async getEntitiesLabelsAndDescriptions(
    ids: string[],
    lang: string,
  ): Promise<Record<string, EntityMetadata>> {
    if (ids.length === 0) {
      return {};
    }

    const result: Record<string, EntityMetadata> = {};

    for (let start = 0; start < ids.length; start += 50) {
      const chunk = ids.slice(start, start + 50);

      const params = new URLSearchParams();
      params.set("action", "wbgetentities");
      params.set("ids", chunk.join("|"));
      params.set("languages", `${lang}|mul|en`);
      params.set("props", "labels|descriptions");
      params.set("format", "json");
      params.set("origin", "*");

      const response = await this.getJSON<{
        entities: Record<
          string,
          {
            labels?: Record<string, ApiLangValue>;
            descriptions?: Record<string, ApiLangValue>;
          }
        >;
      }>(this.cfg.wikidataApiUrl, params);

      for (const [id, entity] of Object.entries(response.entities || {})) {
        result[id] = {
          label: pickLangValue(entity.labels || {}, lang),
          description: pickLangValue(entity.descriptions || {}, lang),
        };
      }
    }

    return result;
  }

  async getStatements(
    entityID: string,
    includeExternalIDs: boolean,
    lang: string,
  ): Promise<string> {
    const cleanEntityID = entityID.trim();
    if (cleanEntityID === "") {
      throw new Error("entity ID cannot be empty");
    }

    const cleanLang = lang.trim() === "" ? "en" : lang.trim();
    const params = new URLSearchParams();
    params.set("id", cleanEntityID);
    params.set("external_ids", String(includeExternalIDs));
    params.set("all_ranks", "false");
    params.set("qualifiers", "false");
    params.set("lang", cleanLang);
    params.set("format", "triplet");

    const response = await this.getJSON<Record<string, string>>(
      this.cfg.textifierUrl,
      params,
    );

    const text = (response[cleanEntityID] || "").trim();
    if (text === "") {
      return `Entity ${cleanEntityID} not found`;
    }
    return text;
  }

  async getStatementValues(
    entityID: string,
    propertyID: string,
    lang: string,
  ): Promise<string> {
    const cleanEntityID = entityID.trim();
    const cleanPropertyID = propertyID.trim();

    if (cleanEntityID === "") {
      throw new Error("entity ID cannot be empty");
    }
    if (cleanPropertyID === "") {
      throw new Error("property ID cannot be empty");
    }

    const cleanLang = lang.trim() === "" ? "en" : lang.trim();

    const result = await this.getTripletValues([cleanEntityID], [cleanPropertyID], {
      externalIDs: true,
      references: true,
      allRanks: true,
      qualifiers: true,
      lang: cleanLang,
    });

    const entity = result[cleanEntityID];
    if (!entity) {
      return `Entity ${cleanEntityID} not found`;
    }

    const text = tripletValuesToString(cleanEntityID, cleanPropertyID, entity);
    if (text.trim() === "") {
      return `No statement found for ${cleanEntityID} with property ${cleanPropertyID}`;
    }

    return text;
  }

  async getInstanceAndSubclassHierarchy(
    entityID: string,
    maxDepth: number,
    lang: string,
  ): Promise<HierarchyResult> {
    const cleanEntityID = entityID.trim();
    if (cleanEntityID === "") {
      throw new Error("entity ID cannot be empty");
    }
    if (maxDepth < 0) {
      throw new Error("max-depth must be zero or greater");
    }

    const cleanLang = lang.trim() === "" ? "en" : lang.trim();

    let qids = [cleanEntityID];
    const graph: Record<string, HierarchyNode> = {};
    const labels: Record<string, string> = {};
    let level = 0;

    while (qids.length > 0 && level <= maxDepth) {
      const response = await this.getTripletValues(qids, ["P31", "P279"], {
        externalIDs: false,
        allRanks: false,
        references: false,
        qualifiers: true,
        lang: cleanLang,
      });

      const nextLevel = new Set<string>();

      for (const qid of qids) {
        const entity = response[qid];
        if (!entity) {
          continue;
        }

        if ((entity.label || "").trim() !== "") {
          labels[qid] = entity.label || "";
        }

        const [instanceIDs, subclassIDs, discoveredLabels] = extractHierarchyRelations(
          entity.claims || [],
        );

        for (const [id, label] of Object.entries(discoveredLabels)) {
          if (label.trim() !== "") {
            labels[id] = label;
          }
        }

        graph[qid] = {
          label: "",
          instanceOf: instanceIDs,
          subclassOf: subclassIDs,
        };

        for (const id of instanceIDs) {
          if (id.trim() !== "") {
            nextLevel.add(id);
          }
        }

        for (const id of subclassIDs) {
          if (id.trim() !== "") {
            nextLevel.add(id);
          }
        }
      }

      const next: string[] = [];
      for (const id of nextLevel) {
        if (graph[id]) {
          continue;
        }
        next.push(id);
      }

      qids = next;
      level += 1;
    }

    if (!graph[cleanEntityID]) {
      return {
        message: `Entity ${cleanEntityID} not found`,
      };
    }

    for (const [id, node] of Object.entries(graph)) {
      graph[id] = {
        ...node,
        label: firstNonEmpty(labels[id], id),
      };
    }

    const rendered = hierarchyToJSON(cleanEntityID, graph, maxDepth);
    if (asRecord(rendered)) {
      return {
        tree: rendered as Record<string, unknown>,
      };
    }

    return {
      tree: {
        result: rendered,
      },
    };
  }

  private async getTripletValues(
    ids: string[],
    properties: string[],
    opts: TextifierOptions,
  ): Promise<Record<string, TextifierEntity>> {
    if (ids.length === 0) {
      return {};
    }

    const params = new URLSearchParams();
    params.set("id", ids.join(","));
    params.set("external_ids", String(opts.externalIDs));
    params.set("all_ranks", String(opts.allRanks));
    params.set("references", String(opts.references));
    params.set("qualifiers", String(opts.qualifiers));
    params.set("lang", firstNonEmpty(opts.lang, "en"));
    params.set("format", "json");
    if (properties.length > 0) {
      params.set("pid", properties.join(","));
    }

    return this.getJSON<Record<string, TextifierEntity>>(this.cfg.textifierUrl, params);
  }

  async executeSPARQL(query: string, limit: number): Promise<SPARQLResult> {
    const cleanQuery = query.trim();
    if (cleanQuery === "") {
      throw new Error("SPARQL query cannot be empty");
    }

    const cleanLimit = limit <= 0 ? 10 : limit;

    const params = new URLSearchParams();
    params.set("query", cleanQuery);
    params.set("format", "json");

    let response: {
      head: { vars: string[] };
      results: {
        bindings: Array<Record<string, { type?: string; value?: string }>>;
      };
    };

    try {
      response = await this.getJSON<{
        head: { vars: string[] };
        results: {
          bindings: Array<Record<string, { type?: string; value?: string }>>;
        };
      }>(this.cfg.wikidataQueryUrl, params);
    } catch (error) {
      if (asHTTPError(error) && error.statusCode === 400) {
        return {
          message: cleanSPARQLErrorMessage(error.body),
        };
      }
      throw error;
    }

    const rowLimit = Math.min(cleanLimit, response.results.bindings.length);

    const rows: Array<Record<string, string>> = [];
    for (let i = 0; i < rowLimit; i += 1) {
      const binding = response.results.bindings[i];
      const row: Record<string, string> = {};
      for (const variable of response.head.vars) {
        row[variable] = shortenWikidataEntityURI(binding[variable]?.value || "");
      }
      rows.push(row);
    }

    const csv = toSemicolonCSV(response.head.vars, rows);

    return {
      vars: response.head.vars,
      rows,
      csv,
    };
  }
}

function validateConfig(cfg: Config): void {
  try {
    new URL(cfg.wikidataApiUrl);
  } catch (error) {
    throw new Error(`invalid wikidata api url: ${errorMessage(error)}`, {
      cause: error,
    });
  }

  try {
    new URL(cfg.wikidataQueryUrl);
  } catch (error) {
    throw new Error(`invalid wikidata query url: ${errorMessage(error)}`, {
      cause: error,
    });
  }

  try {
    new URL(cfg.textifierUrl);
  } catch (error) {
    throw new Error(`invalid textifier url: ${errorMessage(error)}`, {
      cause: error,
    });
  }

  try {
    new URL(cfg.vectorSearchUrl);
  } catch (error) {
    throw new Error(`invalid vector search url: ${errorMessage(error)}`, {
      cause: error,
    });
  }

  if (cfg.timeoutMs <= 0) {
    throw new Error("timeout must be greater than zero");
  }

  if (cfg.userAgent.trim() === "") {
    throw new Error("user agent cannot be empty");
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function pickLangValue(
  values: Record<string, ApiLangValue>,
  lang: string,
): string {
  const preferred = values[lang]?.value?.trim() || "";
  if (preferred !== "") {
    return preferred;
  }

  const multi = values.mul?.value?.trim() || "";
  if (multi !== "") {
    return multi;
  }

  return values.en?.value?.trim() || "";
}

export function extractHierarchyRelations(
  claims: TextifierClaim[],
): [string[], string[], Record<string, string>] {
  const instanceIDs: string[] = [];
  const subclassIDs: string[] = [];
  const labels: Record<string, string> = {};
  const seenInstance = new Set<string>();
  const seenSubclass = new Set<string>();

  for (const claim of claims) {
    let target: "instance" | "subclass" | "" = "";

    switch (claim.PID) {
      case "P31":
        target = "instance";
        break;
      case "P279":
        target = "subclass";
        break;
      default:
        break;
    }

    if (target === "") {
      continue;
    }

    for (const claimValue of claim.values || []) {
      const [id, label] = extractEntityIdentifier(claimValue.value);
      if (id === "") {
        continue;
      }

      if (label.trim() !== "") {
        labels[id] = label;
      }

      if (target === "instance") {
        if (seenInstance.has(id)) {
          continue;
        }
        seenInstance.add(id);
        instanceIDs.push(id);
      } else {
        if (seenSubclass.has(id)) {
          continue;
        }
        seenSubclass.add(id);
        subclassIDs.push(id);
      }
    }
  }

  return [instanceIDs, subclassIDs, labels];
}

export function extractEntityIdentifier(value: unknown): [string, string] {
  const entityMap = asRecord(value);
  if (!entityMap) {
    return ["", ""];
  }

  if (typeof entityMap.QID === "string" && entityMap.QID.trim() !== "") {
    return [
      entityMap.QID.trim(),
      typeof entityMap.label === "string" ? entityMap.label.trim() : "",
    ];
  }

  if (typeof entityMap.PID === "string" && entityMap.PID.trim() !== "") {
    return [
      entityMap.PID.trim(),
      typeof entityMap.label === "string" ? entityMap.label.trim() : "",
    ];
  }

  return ["", ""];
}

export function hierarchyToJSON(
  qid: string,
  graph: Record<string, HierarchyNode>,
  level: number,
): unknown {
  const node = graph[qid];
  if (!node) {
    return qid;
  }

  const label = firstNonEmpty(node.label, qid);
  if (level <= 0) {
    return `${label} (${qid})`;
  }

  const instance: unknown[] = [];
  for (const instanceID of node.instanceOf) {
    if (!graph[instanceID]) {
      continue;
    }
    instance.push(hierarchyToJSON(instanceID, graph, level - 1));
  }

  const subclass: unknown[] = [];
  for (const subclassID of node.subclassOf) {
    if (!graph[subclassID]) {
      continue;
    }
    subclass.push(hierarchyToJSON(subclassID, graph, level - 1));
  }

  return {
    [`${label} (${qid})`]: {
      "instance of (P31)": instance,
      "subclass of (P279)": subclass,
    },
  };
}

export function cleanSPARQLErrorMessage(body: string): string {
  const trimmed = body.trim();
  if (trimmed === "") {
    return "SPARQL query failed";
  }

  const firstLine = trimmed.split("\n")[0]?.trim() || "";
  if (firstLine === "") {
    return "SPARQL query failed";
  }

  return firstLine.split("\tat ")[0].trim();
}

const WIKIDATA_ENTITY_URI_REGEX = /^http:\/\/www\.wikidata\.org\/entity\/([A-Z]\d+)$/;

export function shortenWikidataEntityURI(value: string): string {
  const match = WIKIDATA_ENTITY_URI_REGEX.exec(value);
  if (match && match.length === 2) {
    return match[1];
  }
  return value;
}

function escapeCSVField(field: string): string {
  if (/[^\x20-\x7E]/.test(field) || /[;"\n\r]/.test(field)) {
    return `"${field.replaceAll('"', '""')}"`;
  }
  return field;
}

export function toSemicolonCSV(
  vars: string[],
  rows: Array<Record<string, string>>,
): string {
  const lines: string[] = [];

  const header = ["", ...vars].map(escapeCSVField).join(";");
  lines.push(header);

  rows.forEach((row, index) => {
    const record: string[] = [String(index)];
    for (const variable of vars) {
      record.push(row[variable] || "");
    }
    lines.push(record.map(escapeCSVField).join(";"));
  });

  return `${lines.join("\n")}\n`;
}
