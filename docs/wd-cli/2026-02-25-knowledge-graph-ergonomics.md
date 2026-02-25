# wd-cli Ergonomic Knowledge-Graph UX (2026-02-25)

## Context

`wd-cli` already exposes strong low-level Wikidata primitives (search, statements, hierarchy, SPARQL).

To make the tool more useful for everyday workflows, we should optimize for how people actually ask questions, not how Wikidata is internally structured.

## What users typically ask

In practice, most requests cluster around a few intents:

1. "What is this thing?"
2. "Are these names the same entity?"
3. "Give me a clean profile of this company/person/place."
4. "How is X connected to Y?"
5. "Find entities matching a filter (country, sector, type)."
6. "What changed recently?"
7. "Give this in JSON so I can automate it."

## Ergonomic design goals

- QID-first identity: resolve names to stable IDs early.
- Minimal cognitive load: hide SPARQL for common tasks.
- Fast, repeatable outputs: concise normalized views over raw dumps.
- Safe automation: stable JSON contracts and explicit provenance.

## Proposed interaction model

Default journey:

`resolve -> profile -> relate/neighbors -> find/watch`

### 1) Resolve

Command concept:

```bash
wd-cli resolve "Hartree"
```

Behavior:

- disambiguate input text
- return top candidate QIDs with confidence hints
- provide canonical label + description

Why it helps:

- removes ambiguity before all downstream operations

### 2) Profile

Command concept:

```bash
wd-cli profile Q113465975 --type company
```

Behavior:

- return curated, normalized summary by profile type
- include only high-signal properties
- include source/reference metadata

Why it helps:

- users usually want a concise answer, not raw claim dumps

### 3) Relate / Neighbors

Command concepts:

```bash
wd-cli neighbors Q113465975
wd-cli relate Q113465975 Q145
```

Behavior:

- show direct graph edges grouped by relation type
- for `relate`, show shortest meaningful paths and predicates

Why it helps:

- supports "how are these connected?" without manual SPARQL

### 4) Find (templated query)

Command concept:

```bash
wd-cli find companies --country Q145 --industry "energy"
```

Behavior:

- run parameterized SPARQL templates under the hood
- emit clear table/JSON output

Why it helps:

- turns expert query language into approachable filters

### 5) Watch / Diff

Command concepts:

```bash
wd-cli watch Q113465975
wd-cli diff Q113465975 --since 30d
```

Behavior:

- snapshot selected entities
- compare key fields across time windows

Why it helps:

- supports monitoring and change detection workflows

## Output ergonomics

### Human output

- concise, grouped sections
- explicit QIDs and labels side-by-side
- avoid noisy low-value fields by default

### JSON output

- deterministic schema
- include `entity_id`, `fetched_at`, and `sources`
- preserve stable field names across versions

## Design principles for implementation

1. Keep existing low-level commands as power-user primitives.
2. Add higher-level commands incrementally (`resolve`, `profile`, `neighbors`, `find`, `watch`).
3. Prefer additive compatibility; do not break current automation.
4. For each new command, define a JSON schema contract and add tests.

## Recommended phased rollout

### Phase 1

- `resolve`
- `profile` (company/person/place)
- JSON schema contracts and tests

### Phase 2

- `neighbors`
- `find` templated query family

### Phase 3

- `watch` / `diff`
- optional local cache for speed and offline comparisons

## Success criteria

- Fewer multi-command manual workflows for common questions.
- Lower SPARQL dependence for non-expert users.
- Higher confidence outputs due to identity-first + provenance metadata.
