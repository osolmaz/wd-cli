import type { SearchResponse } from "./types.js";
import { printJSON, printText } from "./output.js";
import { ensureClient } from "./root-options.js";
import type { RootOptions } from "./root-options.js";

export type SearchFunc = (
  query: string,
  lang: string,
  limit: number,
  disableVector: boolean,
) => Promise<SearchResponse>;

export async function runSearchCommand(
  opts: RootOptions,
  query: string,
  lang: string,
  limit: number,
  noVector: boolean,
  entityType: string,
  search: SearchFunc,
): Promise<void> {
  ensureClient(opts);

  const result = await search(query, lang, limit, noVector);

  if (opts.json) {
    const payload: Record<string, unknown> = {
      query,
      lang,
      limit,
      source: result.source,
      results: result.results,
    };

    if (result.results.length === 0) {
      payload.message = `No matching Wikidata ${entityType}s found.`;
    }

    printJSON(opts.stdout, payload);
    return;
  }

  if (result.results.length === 0) {
    printText(opts.stdout, `No matching Wikidata ${entityType}s found.`);
    return;
  }

  const lines: string[] = [];
  for (const item of result.results) {
    const label = item.label.trim();
    const description = item.description.trim();

    if (label === "" && description === "") {
      lines.push(item.id);
      continue;
    }

    lines.push(`${item.id}: ${label} — ${description}`);
  }

  printText(opts.stdout, lines.join("\n"));
}
