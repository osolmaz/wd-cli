# wd-cli

[![npm version](https://img.shields.io/npm/v/%40osolmaz%2Fwd-cli.svg)](https://www.npmjs.com/package/@osolmaz/wd-cli)
[![npm downloads](https://img.shields.io/npm/dm/%40osolmaz%2Fwd-cli.svg)](https://www.npmjs.com/package/@osolmaz/wd-cli)
[![CI](https://github.com/osolmaz/wd-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/osolmaz/wd-cli/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/node/v/%40osolmaz%2Fwd-cli.svg)](https://nodejs.org)

`wd-cli` is a TypeScript command-line client for exploring and querying Wikidata.

- Search items and properties
- Resolve names to likely entities
- Build curated profiles for company/person/place
- Inspect statements and statement values
- Traverse instance/subclass hierarchies
- Execute SPARQL queries
- Use plain-text output by default or `--json` for automation

Parity note: command coverage tracks the original Wikidata MCP implementations as a reference baseline: [zzaebok/mcp-wikidata](https://github.com/zzaebok/mcp-wikidata) and [philippesaade-wmde/WikidataMCP](https://github.com/philippesaade-wmde/WikidataMCP).

## Quick Start

### Run without installing (npx)

```bash
npx -y @osolmaz/wd-cli --help
npx -y @osolmaz/wd-cli search-items "Douglas Adams"
```

### Install globally with npm

```bash
npm install -g @osolmaz/wd-cli
wd-cli --help
```

## Agent Skill (skillflag)

`wd-cli` bundles a `wikidata` agent skill under `skills/wikidata`.

List bundled skills:

```bash
wd-cli --skill list
```

Inspect the skill:

```bash
wd-cli --skill show wikidata
```

Install it into your coding agent (example: Codex repo scope):

```bash
wd-cli --skill export wikidata | npx skillflag install --agent codex --scope repo
```

### Build from source

```bash
git clone https://github.com/osolmaz/wd-cli.git
cd wd-cli
npm ci
npm run build
node dist/cli.js --help
```

## Usage Examples

```bash
wd-cli resolve "Hartree"
wd-cli profile Q113465975 --type company
wd-cli search-items "Douglas Adams"
wd-cli search-properties "occupation"
wd-cli get-statements Q42
wd-cli get-statement-values Q42 P106
wd-cli get-instance-and-subclass-hierarchy Q42 --max-depth 2
wd-cli execute-sparql 'SELECT ?human WHERE { ?human wdt:P31 wd:Q5 } LIMIT 2'
```

JSON mode:

```bash
wd-cli --json search-items "Douglas Adams"
```

Equivalent one-shot usage with no install:

```bash
npx -y @osolmaz/wd-cli --json search-items "Douglas Adams"
```

## Commands

- `search-items <query>`
- `search-properties <query>`
- `resolve <query>`
- `profile <entity-id>`
- `get-statements <entity-id>`
- `get-statement-values <entity-id> <property-id>`
- `get-instance-and-subclass-hierarchy <entity-id>`
- `execute-sparql <query>`

## Environment Variables

- `WD_API_URI` (default `https://www.wikidata.org/w/api.php`)
- `WD_QUERY_URI` (default `https://query.wikidata.org/sparql`)
- `TEXTIFER_URI` or `TEXTIFIER_URI` (default `https://wd-textify.wmcloud.org`)
- `VECTOR_SEARCH_URI` (default `https://wd-vectordb.wmcloud.org`)
- `WD_VECTORDB_API_SECRET` (optional)
- `USER_AGENT` (recommended to set a descriptive value)
- `REQUEST_TIMEOUT_SECONDS` (default `15`)
- `WD_CLI_VERSION` (optional version override for `version` command)
- `WD_CLI_COMMIT` (optional commit override for `version` command)
- `WD_CLI_DATE` (optional date override for `version` command)

## Operational docs

- [Usage guide](docs/operations/usage.md)
- [Configuration guide](docs/operations/configuration.md)
- [Troubleshooting guide](docs/operations/troubleshooting.md)
- [Release guide](docs/operations/release.md)

## License

MIT
