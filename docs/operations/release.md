# Release Guide

## Package identity

- npm package: `@osolmaz/wd-cli`
- executable binary: `wd-cli`

## Build metadata

`version` command metadata is sourced from environment variables at runtime:

- `WD_CLI_VERSION`
- `WD_CLI_COMMIT`
- `WD_CLI_DATE`

## Local release build

```bash
npm ci
npm run build
WD_CLI_VERSION=v1.2.3 WD_CLI_COMMIT=abc1234 WD_CLI_DATE=2026-02-25T12:00:00Z node dist/cli.js version
```

## Pre-release checks

```bash
npm run typecheck
npm run lint
npm run format:check
npm run build
npm test
```

## Verify package visibility

```bash
npm view @osolmaz/wd-cli version
npx -y @osolmaz/wd-cli --help
```

## Suggested release workflow

1. Ensure `main` is up to date and clean.
2. Run pre-release checks.
3. Build and verify metadata with `node dist/cli.js version`.
4. Run the GitHub `Release` workflow.
5. Verify npm resolution with `npm view @osolmaz/wd-cli version`.
