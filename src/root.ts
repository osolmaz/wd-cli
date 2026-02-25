import { Command, CommanderError } from "commander";

import { Client } from "./client.js";
import { defaultConfig, formatDuration, parseDuration } from "./config.js";
import { printJSON, printText } from "./output.js";
import { runProfileCommand } from "./profile-command.js";
import { runResolveCommand } from "./resolve-command.js";
import { ensureClient, newRootOptions, rootOptionsToConfig } from "./root-options.js";
import type { RootOptions } from "./root-options.js";
import { runSearchCommand } from "./search-command.js";
import { resolveSPARQLQuery } from "./sparql-command.js";
import type { ProfileType } from "./types.js";
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

interface SearchCommandOptions {
  lang: string;
  limit: number;
  vector: boolean;
}

interface StatementsCommandOptions {
  includeExternalIds: boolean;
  lang: string;
}

interface LangCommandOptions {
  lang: string;
}

interface HierarchyCommandOptions {
  maxDepth: number;
  lang: string;
}

interface SPARQLCommandOptions {
  query: string;
  file: string;
  k: number;
}

interface ProfileCommandOptions {
  type: string;
  lang: string;
}

type SearchLikeHandler = (
  query: string,
  lang: string,
  limit: number,
  noVector: boolean,
) => Promise<void>;

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
    .name("wd-cli")
    .description("Explore and query Wikidata from your terminal")
    .addHelpText(
      "after",
      '\nExamples:\n  wd-cli resolve "Hartree"\n  wd-cli profile Q113465975 --type company\n  wd-cli search-items "Douglas Adams"\n  wd-cli get-statements Q42\n  wd-cli --json execute-sparql \'SELECT ?item WHERE { ?item wdt:P31 wd:Q5 } LIMIT 2\'',
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

    const config = rootOptionsToConfig(opts, defaults);
    opts.client = opts.createClient ? opts.createClient(config) : new Client(config);
  });

  const searchItemsCommand = newSearchLikeCommand(
    "search-items",
    "Search Wikidata items (QIDs)",
    "Maximum search results",
    10,
    async (query, lang, limit, noVector) => {
      const client = ensureClient(opts);
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
    },
    "si",
  );

  const searchPropertiesCommand = newSearchLikeCommand(
    "search-properties",
    "Search Wikidata properties (PIDs)",
    "Maximum search results",
    10,
    async (query, lang, limit, noVector) => {
      const client = ensureClient(opts);
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
    },
    "sp",
  );

  const resolveCommand = newSearchLikeCommand(
    "resolve",
    "Resolve free-text names to likely Wikidata item IDs",
    "Maximum candidates to return",
    5,
    async (query, lang, limit, noVector) => {
      const client = ensureClient(opts);
      await runResolveCommand(
        opts,
        query,
        lang,
        limit,
        noVector,
        (searchQuery, searchLang, searchLimit, disableVector) =>
          client.searchItems(searchQuery, searchLang, searchLimit, disableVector),
      );
    },
  );

  const profileCommand = new Command("profile")
    .description("Return a curated profile for a company, person, or place")
    .argument("<entity-id>")
    .option("--type <type>", "Profile type: company|person|place", "company")
    .option("--lang <lang>", "Language code for labels/descriptions", "en")
    .action(async (entityID: string, options: ProfileCommandOptions) => {
      const client = ensureClient(opts);
      const profileType = parseProfileType(options.type);
      const lang = options.lang;

      await runProfileCommand(opts, entityID, profileType, lang, (id, type, langCode) =>
        client.getProfile(id, type, langCode),
      );
    });

  const getStatementsCommand = new Command("get-statements")
    .alias("statements")
    .description("Return direct Wikidata statements for an entity")
    .argument("<entity-id>")
    .option("--include-external-ids", "Include external identifier statements", false)
    .option("--lang <lang>", "Language code for labels/descriptions", "en")
    .action(async (entityID: string, options: StatementsCommandOptions) => {
      const client = ensureClient(opts);
      const includeExternalIDs = Boolean(options.includeExternalIds);
      const lang = options.lang;
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
    .action(
      async (entityID: string, propertyID: string, options: LangCommandOptions) => {
        const client = ensureClient(opts);
        const lang = options.lang;
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
      },
    );

  const getHierarchyCommand = new Command("get-instance-and-subclass-hierarchy")
    .alias("hierarchy")
    .description("Return a hierarchy based on P31 (instance of) and P279 (subclass of)")
    .argument("<entity-id>")
    .option("--max-depth <depth>", "Maximum hierarchy depth", parseIntOption, 5)
    .option("--lang <lang>", "Language code for labels/descriptions", "en")
    .action(async (entityID: string, options: HierarchyCommandOptions) => {
      const client = ensureClient(opts);
      const maxDepth = options.maxDepth;
      const lang = options.lang;
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
    .action(async (queryArg: string | undefined, options: SPARQLCommandOptions) => {
      const client = ensureClient(opts);
      const queryFlag = options.query;
      const queryFile = options.file;
      const limit = options.k;

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
  program.addCommand(resolveCommand);
  program.addCommand(profileCommand);
  program.addCommand(getStatementsCommand);
  program.addCommand(getStatementValuesCommand);
  program.addCommand(getHierarchyCommand);
  program.addCommand(executeSPARQLCommand);
  program.addCommand(versionCommand);

  return program;
}

function newSearchLikeCommand(
  name: string,
  description: string,
  limitDescription: string,
  defaultLimit: number,
  handler: SearchLikeHandler,
  alias = "",
): Command {
  const command = new Command(name)
    .description(description)
    .argument("<query>")
    .option("--lang <lang>", "Language code for labels/descriptions", "en")
    .option("--limit <limit>", limitDescription, parseIntOption, defaultLimit)
    .option("--no-vector", "Disable vector search and use keyword search only", false)
    .action(async (query: string, options: SearchCommandOptions) => {
      const lang = options.lang;
      const limit = options.limit;
      const noVector = !options.vector;
      await handler(query, lang, limit, noVector);
    });

  if (alias.trim() !== "") {
    command.alias(alias);
  }

  return command;
}

function parseIntOption(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`invalid integer value: ${value}`);
  }
  return parsed;
}

function parseProfileType(value: string): ProfileType {
  const profileType = value.trim().toLowerCase();
  switch (profileType) {
    case "company":
    case "person":
    case "place":
      return profileType;
    default:
      throw new Error(
        `invalid profile type: ${value} (expected one of: company, person, place)`,
      );
  }
}
