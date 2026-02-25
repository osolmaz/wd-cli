# wikidata-cli

`wikidata-cli` is a native TypeScript CLI for exploring and querying Wikidata.

## Features

- Native CLI commands for item/property search, statement lookup, statement value extraction, hierarchy traversal, and SPARQL execution
- Human-friendly text output by default
- Script-friendly JSON output via `--json`
- Configurable endpoints, timeout, and `User-Agent`
- Vector-first search with keyword fallback

Parity note: command coverage tracks the original Wikidata MCP implementations as a reference baseline: [zzaebok/mcp-wikidata](https://github.com/zzaebok/mcp-wikidata) and [philippesaade-wmde/WikidataMCP](https://github.com/philippesaade-wmde/WikidataMCP).

## Install / Build

```bash
npm ci
npm run build
node dist/cli.js --help
```

## Commands

- `search-items <query>`
- `search-properties <query>`
- `get-statements <entity-id>`
- `get-statement-values <entity-id> <property-id>`
- `get-instance-and-subclass-hierarchy <entity-id>`
- `execute-sparql <query>`

## Examples

```bash
node dist/cli.js search-items "Douglas Adams"
node dist/cli.js search-properties "occupation"
node dist/cli.js get-statements Q42
node dist/cli.js get-statement-values Q42 P106
node dist/cli.js get-instance-and-subclass-hierarchy Q42 --max-depth 2
node dist/cli.js execute-sparql 'SELECT ?human WHERE { ?human wdt:P31 wd:Q5 } LIMIT 2'
```

JSON mode:

```bash
node dist/cli.js --json search-items "Douglas Adams"
```

## Environment Variables

- `WD_API_URI` (default `https://www.wikidata.org/w/api.php`)
- `WD_QUERY_URI` (default `https://query.wikidata.org/sparql`)
- `TEXTIFER_URI` or `TEXTIFIER_URI` (default `https://wd-textify.wmcloud.org`)
- `VECTOR_SEARCH_URI` (default `https://wd-vectordb.wmcloud.org`)
- `WD_VECTORDB_API_SECRET` (optional)
- `USER_AGENT` (recommended to set a descriptive value)
- `REQUEST_TIMEOUT_SECONDS` (default `15`)
- `WIKIDATA_CLI_VERSION` (optional version override for `version` command)
- `WIKIDATA_CLI_COMMIT` (optional commit override for `version` command)
- `WIKIDATA_CLI_DATE` (optional date override for `version` command)

## Operational docs

- [Usage guide](docs/operations/usage.md)
- [Configuration guide](docs/operations/configuration.md)
- [Troubleshooting guide](docs/operations/troubleshooting.md)
- [Release guide](docs/operations/release.md)
