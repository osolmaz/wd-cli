# Configuration Guide

## Configuration precedence

1. Command flags
2. Environment variables
3. Built-in defaults

Flags are defined at the root command and apply to all subcommands.

## Global flags

- `--json` (default: `false`)
- `--timeout` (default from `REQUEST_TIMEOUT_SECONDS`, fallback `15s`)
- `--user-agent` (default from `USER_AGENT`)
- `--wikidata-api-url` (default from `WD_API_URI`)
- `--wikidata-query-url` (default from `WD_QUERY_URI`)
- `--textifier-url` (default from `TEXTIFER_URI` or `TEXTIFIER_URI`)
- `--vector-search-url` (default from `VECTOR_SEARCH_URI`)
- `--vector-api-secret` (default from `WD_VECTORDB_API_SECRET`)

## Environment variables

- `WD_API_URI` (default `https://www.wikidata.org/w/api.php`)
- `WD_QUERY_URI` (default `https://query.wikidata.org/sparql`)
- `TEXTIFER_URI` or `TEXTIFIER_URI` (default `https://wd-textify.wmcloud.org`)
- `VECTOR_SEARCH_URI` (default `https://wd-vectordb.wmcloud.org`)
- `WD_VECTORDB_API_SECRET` (optional)
- `USER_AGENT` (recommended)
- `REQUEST_TIMEOUT_SECONDS` (supports integer or float seconds, must be `> 0`)
- `WD_CLI_VERSION` (optional)
- `WD_CLI_COMMIT` (optional)
- `WD_CLI_DATE` (optional)

## Recommended settings

- Set a descriptive `USER_AGENT` with team/project contact information.
- Set explicit service endpoint URLs in test or custom environments.
- Start with `REQUEST_TIMEOUT_SECONDS=15` and tune based on observed latency.
- Provide `WD_VECTORDB_API_SECRET` only when required by your vector endpoint.
