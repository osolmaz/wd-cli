import { readFile } from "node:fs/promises";

export async function resolveSPARQLQuery(
  args: string[],
  queryFlag: string,
  queryFile: string,
): Promise<string> {
  let sourceCount = 0;
  let query = "";

  if (args.length > 1) {
    throw new Error("expected at most one positional query argument");
  }

  if (args.length === 1 && args[0].trim() !== "") {
    sourceCount += 1;
    query = args[0];
  }

  if (queryFlag.trim() !== "") {
    sourceCount += 1;
    query = queryFlag;
  }

  if (queryFile.trim() !== "") {
    sourceCount += 1;
    let content: Buffer;
    try {
      content = await readFile(queryFile);
    } catch (error) {
      throw new Error(`failed to read query file: ${String(error)}`, {
        cause: error,
      });
    }
    query = content.toString();
  }

  if (sourceCount === 0) {
    throw new Error("provide a query as an argument, via --query, or via --file");
  }

  if (sourceCount > 1) {
    throw new Error(
      "provide only one query source among positional arg, --query, and --file",
    );
  }

  query = query.trim();
  if (query === "") {
    throw new Error("SPARQL query cannot be empty");
  }

  return query;
}
