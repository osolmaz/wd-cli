# wikidata-cli

`wikidata-cli` is a production-oriented native Go CLI for Wikidata exploration and querying.

## Features

- Native CLI commands for item/property search, statement lookup, statement value extraction, hierarchy traversal, and SPARQL execution
- Human-friendly text output by default
- Script-friendly JSON output via `--json`
- Configurable endpoints, timeout, and `User-Agent`
- Vector-first search with keyword fallback

Parity note: command coverage tracks the original Wikidata MCP implementations as a reference baseline: [zzaebok/mcp-wikidata](https://github.com/zzaebok/mcp-wikidata) and [philippesaade-wmde/WikidataMCP](https://github.com/philippesaade-wmde/WikidataMCP).

## Install / Build

```bash
make tidy
make build
./bin/wikidata-cli --help
```

Release-like build with embedded `version/commit/date` metadata:

```bash
make release
./bin/wikidata-cli version
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
wikidata-cli search-items "Douglas Adams"
wikidata-cli search-properties "occupation"
wikidata-cli get-statements Q42
wikidata-cli get-statement-values Q42 P106
wikidata-cli get-instance-and-subclass-hierarchy Q42 --max-depth 2
wikidata-cli execute-sparql 'SELECT ?human WHERE { ?human wdt:P31 wd:Q5 } LIMIT 2'
```

JSON mode:

```bash
wikidata-cli --json search-items "Douglas Adams"
```

## Environment Variables

- `WD_API_URI` (default `https://www.wikidata.org/w/api.php`)
- `WD_QUERY_URI` (default `https://query.wikidata.org/sparql`)
- `TEXTIFER_URI` or `TEXTIFIER_URI` (default `https://wd-textify.wmcloud.org`)
- `VECTOR_SEARCH_URI` (default `https://wd-vectordb.wmcloud.org`)
- `WD_VECTORDB_API_SECRET` (optional)
- `USER_AGENT` (recommended to set a descriptive value)
- `REQUEST_TIMEOUT_SECONDS` (default `15`)

## Operational docs

- [Usage guide](docs/operations/usage.md)
- [Configuration guide](docs/operations/configuration.md)
- [Troubleshooting guide](docs/operations/troubleshooting.md)
- [Release guide](docs/operations/release.md)
