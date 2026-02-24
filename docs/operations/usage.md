# Usage Guide

## Build and run

```bash
make tidy
make build
./bin/wikidata-cli --help
```

For release-like binaries with embedded metadata:

```bash
make release
./bin/wikidata-cli version
```

## Output modes

- Default output is plain text.
- Use `--json` on any command for machine-readable output.

Example:

```bash
wikidata-cli --json search-items "Douglas Adams"
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
wikidata-cli search-items "Douglas Adams"
wikidata-cli search-properties "occupation"
wikidata-cli get-statements Q42
wikidata-cli get-statement-values Q42 P106
wikidata-cli get-instance-and-subclass-hierarchy Q42 --max-depth 2
wikidata-cli execute-sparql 'SELECT ?human WHERE { ?human wdt:P31 wd:Q5 } LIMIT 2'
```

Use a query file for SPARQL:

```bash
wikidata-cli execute-sparql --file ./query.sparql
```
