---
title: Wikidata CLI Implementation Plan
author: Codex <codex@openai.com>
date: 2026-02-24
---

## Scope

Build a production-leaning Go CLI named `wd-cli` with full parity for the current Wikimedia Wikidata MCP toolset:

1. `search_items`
2. `search_properties`
3. `get_statements`
4. `get_statement_values`
5. `get_instance_and_subclass_hierarchy`
6. `execute_sparql`

## Goals

- Provide an elegant, script-friendly CLI interface.
- Keep behavior aligned with Wikidata MCP semantics and defaults.
- Use stable Go conventions and widely adopted libraries.
- Avoid reinventing wheel: wrap existing public Wikidata-related APIs cleanly.

## Command Design

- Binary name: `wd-cli`
- Primary commands (MCP parity):
  - `search-items`
  - `search-properties`
  - `get-statements`
  - `get-statement-values`
  - `get-instance-and-subclass-hierarchy`
  - `execute-sparql`
- Cross-cutting flags:
  - `--json`
  - `--timeout`
  - endpoint and `User-Agent` overrides

## Architecture

- `cmd/wd-cli/`: executable entrypoint
- `internal/cmd/`: Cobra command definitions and output handling
- `internal/wikidata/`: typed API client + formatters and transformation logic
- `docs/wd-cli/`: operational and planning documentation

## API/Config Compatibility

- Respect Wikimedia MCP-compatible environment variables:
  - `WD_API_URI`
  - `WD_QUERY_URI`
  - `TEXTIFER_URI` (and `TEXTIFIER_URI` fallback)
  - `VECTOR_SEARCH_URI`
  - `WD_VECTORDB_API_SECRET`
  - `USER_AGENT`
  - `REQUEST_TIMEOUT_SECONDS`

## Quality Plan

1. Unit-test critical transformation paths:
   - entity URI shortening
   - semicolon CSV shaping for SPARQL output
   - statement value string formatting
   - hierarchy recursion rendering
2. Build and run CLI against live Wikidata endpoints for smoke verification.
3. Keep command output stable for automation (`--json` and text output paths).

## Risks and Mitigations

- External API schema drift: keep JSON parsing defensive and error messages explicit.
- Endpoint transient failures: map network failures to actionable CLI errors.
- Large hierarchy expansions: enforce `max_depth` and avoid unbounded traversal.

## Validation Checklist

- `go mod tidy`
- `go fmt ./...`
- `go test ./...`
- `go build ./cmd/wd-cli`
- Live smoke tests for all six MCP-equivalent commands

