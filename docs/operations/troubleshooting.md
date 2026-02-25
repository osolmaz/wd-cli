# Troubleshooting Guide

## `wikidata client is not initialized`

This indicates command execution is bypassing normal root command setup.

Actions:

- Run commands through the CLI entrypoint (`node dist/cli.js <command> ...`).
- Avoid calling command handlers directly without root command initialization.

## HTTP errors from remote services

Symptoms:

- `remote service returned HTTP <status>`

Actions:

- Confirm endpoint flags/env vars point to valid services.
- Check outbound network access from the runtime environment.
- Retry with `--timeout` increased for slow links.

## SPARQL failures

Symptoms:

- Command returns a message from the SPARQL service for invalid queries.

Actions:

- Validate syntax in a known-good SPARQL editor.
- Ensure only one query source is supplied:
  - positional argument, or
  - `--query`, or
  - `--file`

## Empty or unexpected search results

Actions:

- Run again with `--no-vector` to force keyword search.
- Verify query language (`--lang`) and result limit (`--limit`).
- Confirm configured vector/textifier endpoints are reachable.

## Request timeout issues

Symptoms:

- `request failed: ...`

Actions:

- Increase `--timeout` or `REQUEST_TIMEOUT_SECONDS`.
- Check service latency and network routing.

## JSON parsing errors

Symptoms:

- `failed to decode response json`

Actions:

- Verify the endpoint returns JSON for the expected path.
- Inspect reverse proxies/gateways for HTML or plain text error bodies.
