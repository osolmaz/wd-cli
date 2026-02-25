#!/usr/bin/env node

import { findSkillsRoot, maybeHandleSkillflag } from "skillflag";

import { execute } from "./root.js";

await maybeHandleSkillflag(process.argv, {
  skillsRoot: findSkillsRoot(import.meta.url),
  includeBundledSkill: false,
});

await execute(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
