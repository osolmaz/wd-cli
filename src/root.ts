import { Command, CommanderError } from "commander";

import { Client } from "./client.js";
import { defaultConfig, formatDuration, parseDuration } from "./config.js";
import { printJSON, printText } from "./output.js";
import { ensureClient, newRootOptions, rootOptionsToConfig } from "./root-options.js";
import type { RootOptions } from "./root-options.js";
import { runSearchCommand } from "./search-command.js";
import { resolveSPARQLQuery } from "./sparql-command.js";
import { runVersionCommand } from "./version-command.js";

interface RootFlagValues {
  json: boolean;
  timeout: string;
  userAgent: string;
  wikidataApiUrl: string;
  wikidataQueryUrl: string;
  textifierUrl: string;
  vectorSearchUrl: string;
  vectorApiSecret: string;
}

export async function execute(args: string[]): Promise<void> {
  const program = newRootCommand();
  try {
    await program.parseAsync(args, { from: "user" });
  } catch (error) {
    if (error instanceof CommanderError) {
      if (error.code === "commander.helpDisplayed") {
        return;
      }
      throw new Error(error.message, { cause: error });
    }
    throw error;
  }
}

export function newRootCommand(opts: RootOptions = newRootOptions()): Command {
  const defaults = defaultConfig();

  const program = new Command();
  program
    .name("wikidata-cli")
    .description("Explore and query Wikidata from your terminal")
    .addHelpText(
      "after",
      "\nExamples:\n  wikidata-cli search-items \"Douglas Adams\"\n  wikidata-cli get-statements Q42\n  wikidata-cli --json execute-sparql 'SELECT ?item WHERE { ?item wdt:P31 wd:Q5 } LIMIT 2'",
    )
    .showSuggestionAfterError()
    .exitOverride();

  program.option("--json", "Write output as JSON", opts.json);
  program.option(
    "--timeout <duration>",
    "HTTP timeout for outbound requests",
    formatDuration(opts.timeoutMs),
  );
  program.option(
    "--user-agent <userAgent>",
    "User-Agent header used for Wikidata services",
    opts.userAgent,
  );
  program.option(
    "--wikidata-api-url <url>",
    "Wikidata API base URL",
    opts.wikidataApiUrl,
  );
  program.option(
    "--wikidata-query-url <url>",
    "Wikidata Query Service URL",
    opts.wikidataQueryUrl,
  );
  program.option(
    "--textifier-url <url>",
    "Wikidata textifier API URL",
    opts.textifierUrl,
  );
  program.option(
    "--vector-search-url <url>",
    "Wikidata vector search API URL",
    opts.vectorSearchUrl,
  );
  program.option(
    "--vector-api-secret <secret>",
    "Optional API secret for vector search",
    opts.vectorSecret,
  );

  program.hook("preAction", () => {
    const flags = program.opts<RootFlagValues>();

    opts.json = Boolean(flags.json);
    opts.timeoutMs = parseDuration(String(flags.timeout));
    opts.userAgent = flags.userAgent;
    opts.wikidataApiUrl = flags.wikidataApiUrl;
    opts.wikidataQueryUrl = flags.wikidataQueryUrl;
    opts.textifierUrl = flags.textifierUrl;
    opts.vectorSearchUrl = flags.vectorSearchUrl;
    opts.vectorSecret = flags.vectorApiSecret;

    opts.client = new Client(rootOptionsToConfig(opts, defaults));
  });

  const searchItemsCommand = new Command("search-items")
    .alias("si")
    .description("Search Wikidata items (QIDs)")
    .argument("<query>")
    .option("--lang <lang>", "Language code for labels/descriptions", "en")
    .option("--limit <limit>", "Maximum search results", parseIntOption, 10)
    .option("--no-vector", "Disable vector search and use keyword search only", false)
    .action(async (query: string, command: Command) => {
      const client = ensureClient(opts);
      const lang = command.getOptionValue("lang") as string;
      const limit = command.getOptionValue("limit") as number;
      const noVector = !(command.getOptionValue("vector") as boolean);

      await runSearchCommand(
        opts,
        query,
        lang,
        limit,
        noVector,
        "item",
        (searchQuery, searchLang, searchLimit, disableVector) =>
          client.searchItems(searchQuery, searchLang, searchLimit, disableVector),
      );
    });

  const searchPropertiesCommand = new Command("search-properties")
    .alias("sp")
    .description("Search Wikidata properties (PIDs)")
    .argument("<query>")
    .option("--lang <lang>", "Language code for labels/descriptions", "en")
    .option("--limit <limit>", "Maximum search results", parseIntOption, 10)
    .option("--no-vector", "Disable vector search and use keyword search only", false)
    .action(async (query: string, command: Command) => {
      const client = ensureClient(opts);
      const lang = command.getOptionValue("lang") as string;
      const limit = command.getOptionValue("limit") as number;
      const noVector = !(command.getOptionValue("vector") as boolean);

      await runSearchCommand(
        opts,
        query,
        lang,
        limit,
        noVector,
        "property",
        (searchQuery, searchLang, searchLimit, disableVector) =>
          client.searchProperties(searchQuery, searchLang, searchLimit, disableVector),
      );
    });

  const getStatementsCommand = new Command("get-statements")
    .alias("statements")
    .description("Return direct Wikidata statements for an entity")
    .argument("<entity-id>")
    .option("--include-external-ids", "Include external identifier statements", false)
    .option("--lang <lang>", "Language code for labels/descriptions", "en")
    .action(async (entityID: string, command: Command) => {
      const client = ensureClient(opts);
      const includeExternalIDs = Boolean(command.getOptionValue("includeExternalIds"));
      const lang = command.getOptionValue("lang") as string;
      const result = await client.getStatements(entityID, includeExternalIDs, lang);

      if (opts.json) {
        printJSON(opts.stdout, {
          entity_id: entityID,
          include_external_ids: includeExternalIDs,
          lang,
          result,
        });
        return;
      }

      printText(opts.stdout, result);
    });

  const getStatementValuesCommand = new Command("get-statement-values")
    .aliases(["statement-values", "values"])
    .description(
      "Return detailed values, qualifiers, ranks, and references for a statement",
    )
    .argument("<entity-id>")
    .argument("<property-id>")
    .option("--lang <lang>", "Language code for labels/descriptions", "en")
    .action(async (entityID: string, propertyID: string, command: Command) => {
      const client = ensureClient(opts);
      const lang = command.getOptionValue("lang") as string;
      const result = await client.getStatementValues(entityID, propertyID, lang);

      if (opts.json) {
        printJSON(opts.stdout, {
          entity_id: entityID,
          property_id: propertyID,
          lang,
          result,
        });
        return;
      }

      printText(opts.stdout, result);
    });

  const getHierarchyCommand = new Command("get-instance-and-subclass-hierarchy")
    .alias("hierarchy")
    .description("Return a hierarchy based on P31 (instance of) and P279 (subclass of)")
    .argument("<entity-id>")
    .option("--max-depth <depth>", "Maximum hierarchy depth", parseIntOption, 5)
    .option("--lang <lang>", "Language code for labels/descriptions", "en")
    .action(async (entityID: string, command: Command) => {
      const client = ensureClient(opts);
      const maxDepth = command.getOptionValue("maxDepth") as number;
      const lang = command.getOptionValue("lang") as string;
      const result = await client.getInstanceAndSubclassHierarchy(
        entityID,
        maxDepth,
        lang,
      );

      if (opts.json) {
        printJSON(opts.stdout, {
          entity_id: entityID,
          max_depth: maxDepth,
          lang,
          result,
        });
        return;
      }

      if (result.message) {
        printText(opts.stdout, result.message);
        return;
      }

      printText(opts.stdout, JSON.stringify(result.tree, null, 2));
    });

  const executeSPARQLCommand = new Command("execute-sparql")
    .alias("sparql")
    .description("Execute SPARQL against Wikidata and return semicolon-separated CSV")
    .argument("[query]")
    .option(
      "-q, --query <query>",
      "SPARQL query string (alternative to positional query argument)",
      "",
    )
    .option("--file <path>", "Path to file containing SPARQL query text", "")
    .option("--k <limit>", "Maximum rows to return", parseIntOption, 10)
    .action(async (queryArg: string | undefined, command: Command) => {
      const client = ensureClient(opts);
      const queryFlag = command.getOptionValue("query") as string;
      const queryFile = command.getOptionValue("file") as string;
      const limit = command.getOptionValue("k") as number;

      const query = await resolveSPARQLQuery(
        queryArg ? [queryArg] : [],
        queryFlag,
        queryFile,
      );
      const result = await client.executeSPARQL(query, limit);

      if (opts.json) {
        printJSON(opts.stdout, {
          query,
          limit,
          result,
        });
        return;
      }

      if (result.message) {
        printText(opts.stdout, result.message);
        return;
      }

      printText(opts.stdout, result.csv || "");
    });

  const versionCommand = new Command("version")
    .description("Print build version")
    .action(() => {
      runVersionCommand(opts);
    });

  program.addCommand(searchItemsCommand);
  program.addCommand(searchPropertiesCommand);
  program.addCommand(getStatementsCommand);
  program.addCommand(getStatementValuesCommand);
  program.addCommand(getHierarchyCommand);
  program.addCommand(executeSPARQLCommand);
  program.addCommand(versionCommand);

  return program;
}

function parseIntOption(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`invalid integer value: ${value}`);
  }
  return parsed;
}
