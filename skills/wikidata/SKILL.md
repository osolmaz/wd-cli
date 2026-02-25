---
name: wikidata
description: Use wd-cli for Wikidata lookup and querying tasks, including item/property search, statement inspection, hierarchy traversal, and SPARQL execution.
---

# wikidata

## When to use this skill

Use this skill when a user asks to retrieve or inspect Wikidata information from the terminal, especially when they ask for:

- item/property lookups by label
- direct statements for an entity
- values for a specific property on an entity
- `instance of` / `subclass of` hierarchy traversal
- ad-hoc SPARQL queries against Wikidata Query Service

## Tool overview

`wd-cli` is a CLI for querying Wikidata and related services.

Install globally:

```bash
npm i -g @osolmaz/wd-cli
```

Or run without installing:

```bash
npx -y @osolmaz/wd-cli --help
```

## Command map

```bash
wd-cli search-items <query>
wd-cli search-properties <query>
wd-cli get-statements <entity-id>
wd-cli get-statement-values <entity-id> <property-id>
wd-cli get-instance-and-subclass-hierarchy <entity-id>
wd-cli execute-sparql [query]
```

Useful aliases:

- `search-items` -> `si`
- `search-properties` -> `sp`
- `get-statements` -> `statements`
- `get-statement-values` -> `statement-values`, `values`
- `get-instance-and-subclass-hierarchy` -> `hierarchy`
- `execute-sparql` -> `sparql`

## High-signal usage patterns

Search entities:

```bash
wd-cli search-items "Douglas Adams"
wd-cli search-properties "occupation"
```

Inspect entity facts:

```bash
wd-cli get-statements Q42
wd-cli get-statement-values Q42 P106
wd-cli hierarchy Q42 --max-depth 2
```

Run SPARQL:

```bash
wd-cli execute-sparql 'SELECT ?human WHERE { ?human wdt:P31 wd:Q5 } LIMIT 2'
wd-cli execute-sparql --file ./query.sparql
```

Machine-readable output:

```bash
wd-cli --json search-items "Douglas Adams"
wd-cli --json sparql --query 'SELECT ?item WHERE { ?item wdt:P31 wd:Q5 } LIMIT 2'
```

## Operational guidance

- Default output is text; use `--json` for automation.
- Prefer QIDs/PIDs when known (`Q42`, `P31`) to avoid ambiguity.
- Use `--no-vector` on search commands when you need strict keyword search behavior.
- Use `--timeout` for slow networks/services.
- For SPARQL, provide only one query source at a time: positional arg, `--query`, or `--file`.

## Relevant global flags

- `--json`
- `--timeout <duration>`
- `--user-agent <userAgent>`
- `--wikidata-api-url <url>`
- `--wikidata-query-url <url>`
- `--textifier-url <url>`
- `--vector-search-url <url>`
- `--vector-api-secret <secret>`

## Environment variables

- `WD_API_URI`
- `WD_QUERY_URI`
- `TEXTIFER_URI` / `TEXTIFIER_URI`
- `VECTOR_SEARCH_URI`
- `WD_VECTORDB_API_SECRET`
- `USER_AGENT`
- `REQUEST_TIMEOUT_SECONDS`
