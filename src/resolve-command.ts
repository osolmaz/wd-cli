import { printJSON, printText } from "./output.js";
import { ensureClient } from "./root-options.js";
import type { RootOptions } from "./root-options.js";
import type {
  ResolveCandidate,
  ResolveConfidence,
  ResolveResponse,
  SearchResponse,
} from "./types.js";

export type ResolveFunc = (
  query: string,
  lang: string,
  limit: number,
  disableVector: boolean,
) => Promise<SearchResponse>;

export async function runResolveCommand(
  opts: RootOptions,
  query: string,
  lang: string,
  limit: number,
  noVector: boolean,
  resolve: ResolveFunc,
): Promise<void> {
  ensureClient(opts);

  const search = await resolve(query, lang, limit, noVector);
  const response = toResolveResponse(query, search);

  if (opts.json) {
    const payload: Record<string, unknown> = {
      query,
      lang,
      limit,
      source: response.source,
      candidates: response.candidates,
    };

    if (response.candidates.length === 0) {
      payload.message = "No matching Wikidata entities found.";
    }

    printJSON(opts.stdout, payload);
    return;
  }

  if (response.candidates.length === 0) {
    printText(opts.stdout, "No matching Wikidata entities found.");
    return;
  }

  const lines = response.candidates.map((candidate) => {
    const confidence = `${candidate.confidence} confidence`;
    const hints = candidate.hints.length > 0 ? `; ${candidate.hints.join(", ")}` : "";
    return `${candidate.rank}. ${renderCandidate(candidate)} [${confidence}${hints}]`;
  });

  printText(opts.stdout, lines.join("\n"));
}

function toResolveResponse(query: string, search: SearchResponse): ResolveResponse {
  const normalizedQuery = query.trim().toLowerCase();

  const candidates: ResolveCandidate[] = search.results.map((result, index) => {
    const [confidence, hints] = confidenceHints(normalizedQuery, result, index);

    return {
      rank: index + 1,
      id: result.id,
      label: result.label,
      description: result.description,
      confidence,
      hints,
    };
  });

  return {
    source: search.source,
    candidates,
  };
}

function confidenceHints(
  query: string,
  candidate: { id: string; label: string; description: string },
  rankIndex: number,
): [ResolveConfidence, string[]] {
  const id = candidate.id.trim().toLowerCase();
  const label = candidate.label.trim().toLowerCase();
  const description = candidate.description.trim().toLowerCase();

  let score = 0;
  const hints: string[] = [];

  if (id !== "" && id === query) {
    score += 5;
    hints.push("entity id matches input");
  }

  if (label !== "" && label === query) {
    score += 5;
    hints.push("exact label match");
  } else if (
    label !== "" &&
    query !== "" &&
    (label.startsWith(query) || query.startsWith(label))
  ) {
    score += 3;
    hints.push("strong label overlap");
  } else if (
    label !== "" &&
    query !== "" &&
    (label.includes(query) || query.includes(label))
  ) {
    score += 2;
    hints.push("partial label overlap");
  }

  if (query.length >= 3 && description.includes(query)) {
    score += 1;
    hints.push("description mentions query");
  }

  if (rankIndex === 0) {
    score += 1;
    hints.push("top search result");
  }

  if (score >= 5) {
    return ["high", hints];
  }
  if (score >= 3) {
    return ["medium", hints];
  }
  return ["low", hints];
}

function renderCandidate(candidate: ResolveCandidate): string {
  const label = candidate.label.trim();
  const description = candidate.description.trim();

  if (label === "" && description === "") {
    return candidate.id;
  }

  if (label === "") {
    return `${candidate.id}: ${description}`;
  }

  if (description === "") {
    return `${candidate.id}: ${label}`;
  }

  return `${candidate.id}: ${label} — ${description}`;
}
