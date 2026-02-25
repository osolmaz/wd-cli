# Usage Guide

## Run options

### No install (npx)

```bash
npx -y @osolmaz/wd-cli --help
```

### Global install

```bash
npm install -g @osolmaz/wd-cli
wd-cli --help
```

### Build and run from source

```bash
npm ci
npm run build
node dist/cli.js --help
```

For local development:

```bash
npm run dev -- --help
```

## Bundled skill export

`wd-cli` supports `skillflag` and ships a bundled `wikidata` skill.

```bash
wd-cli --skill list
wd-cli --skill show wikidata
wd-cli --skill export wikidata | npx skillflag install --agent codex --scope repo
```

## Output modes

- Default output is plain text.
- Use `--json` on any command for machine-readable output.

Example:

```bash
wd-cli --json search-items "Douglas Adams"
```

## Commands

- `search-items <query>`
- `search-properties <query>`
- `resolve <query>`
- `profile <entity-id>`
- `get-statements <entity-id>`
- `get-statement-values <entity-id> <property-id>`
- `get-instance-and-subclass-hierarchy <entity-id>`
- `execute-sparql [query]`

## Common command examples

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

Use a query file for SPARQL:

```bash
wd-cli execute-sparql --file ./query.sparql
```

No-install equivalent example:

```bash
npx -y @osolmaz/wd-cli execute-sparql --file ./query.sparql
```
