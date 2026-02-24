# Release Guide

## Build metadata

Release binaries embed version metadata into:

- `internal/cmd.version`
- `internal/cmd.commit`
- `internal/cmd.date`

The metadata is injected using `-ldflags -X ...` in `make release`.

## Local release build

```bash
make release
./bin/wikidata-cli version
```

Default values are sourced from git and UTC time:

- `VERSION`: `git describe --tags --always --dirty`
- `COMMIT`: `git rev-parse --short HEAD`
- `DATE`: `date -u +%Y-%m-%dT%H:%M:%SZ`

Override values when needed:

```bash
make release VERSION=v1.2.3 COMMIT=abc1234 DATE=2026-02-24T20:00:00Z
```

## Pre-release checks

```bash
make lint
make vet
make test
make test-race
make coverage
```

## Suggested release workflow

1. Ensure `main` is up to date and clean.
2. Run pre-release checks.
3. Build and verify metadata with `wikidata-cli version`.
4. Create and push a git tag.
5. Publish release artifacts from the tagged commit.
