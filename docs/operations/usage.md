# Usage Guide

## Build and run

```bash
npm ci
npm run build
node dist/cli.js --help
```

For local development:

```bash
npm run dev -- --help
```

## Output modes

- Default output is plain text.
- Use `--json` on any command for machine-readable output.

Example:

```bash
node dist/cli.js --json search-items "Douglas Adams"
```

## Commands

- `search-items <query>`
- `search-properties <query>`
- `get-statements <entity-id>`
- `get-statement-values <entity-id> <property-id>`
- `get-instance-and-subclass-hierarchy <entity-id>`
- `execute-sparql [query]`

## Common command examples

```bash
node dist/cli.js search-items "Douglas Adams"
node dist/cli.js search-properties "occupation"
node dist/cli.js get-statements Q42
node dist/cli.js get-statement-values Q42 P106
node dist/cli.js get-instance-and-subclass-hierarchy Q42 --max-depth 2
node dist/cli.js execute-sparql 'SELECT ?human WHERE { ?human wdt:P31 wd:Q5 } LIMIT 2'
```

Use a query file for SPARQL:

```bash
node dist/cli.js execute-sparql --file ./query.sparql
```
