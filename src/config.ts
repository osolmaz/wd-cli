const DEFAULT_WIKIDATA_API_URL = "https://www.wikidata.org/w/api.php";
const DEFAULT_WIKIDATA_QUERY_URL = "https://query.wikidata.org/sparql";
const DEFAULT_TEXTIFIER_URL = "https://wd-textify.wmcloud.org";
const DEFAULT_VECTOR_SEARCH_URL = "https://wd-vectordb.wmcloud.org";
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_USER_AGENT = "wd-cli/0.1 (+https://github.com/osolmaz/wd-cli)";

export interface Config {
  wikidataApiUrl: string;
  wikidataQueryUrl: string;
  textifierUrl: string;
  vectorSearchUrl: string;
  vectorApiSecret: string;
  userAgent: string;
  timeoutMs: number;
}

export function defaultConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const timeoutMs = parseTimeoutMs(env.REQUEST_TIMEOUT_SECONDS) ?? DEFAULT_TIMEOUT_MS;
  const userAgent = firstNonEmpty(env.USER_AGENT, DEFAULT_USER_AGENT);
  const textifierUrl = firstNonEmpty(
    env.TEXTIFER_URI,
    env.TEXTIFIER_URI,
    DEFAULT_TEXTIFIER_URL,
  );

  return {
    wikidataApiUrl: firstNonEmpty(env.WD_API_URI, DEFAULT_WIKIDATA_API_URL),
    wikidataQueryUrl: firstNonEmpty(env.WD_QUERY_URI, DEFAULT_WIKIDATA_QUERY_URL),
    textifierUrl,
    vectorSearchUrl: firstNonEmpty(env.VECTOR_SEARCH_URI, DEFAULT_VECTOR_SEARCH_URL),
    vectorApiSecret: firstNonEmpty(env.WD_VECTORDB_API_SECRET),
    userAgent,
    timeoutMs,
  };
}

export function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    if (value && value.trim() !== "") {
      return value.trim();
    }
  }
  return "";
}

function parseTimeoutMs(value: string | undefined): number | undefined {
  if (!value || value.trim() === "") {
    return undefined;
  }
  const parsed = Number.parseFloat(value.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return Math.round(parsed * 1000);
}

export function parseDuration(value: string): number {
  const input = value.trim();
  if (input === "") {
    throw new Error("duration cannot be empty");
  }

  const match = /^(\d+(?:\.\d+)?)(ms|s|m|h)?$/i.exec(input);
  if (!match) {
    throw new Error(`invalid duration: ${value}`);
  }

  const amount = Number.parseFloat(match[1]);
  const unit = (match[2] || "ms").toLowerCase();
  const unitMs: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
  };

  return Math.round(amount * unitMs[unit]);
}

export function formatDuration(ms: number): string {
  if (ms % 3600000 === 0) {
    return `${ms / 3600000}h`;
  }
  if (ms % 60000 === 0) {
    return `${ms / 60000}m`;
  }
  if (ms % 1000 === 0) {
    return `${ms / 1000}s`;
  }
  return `${ms}ms`;
}
