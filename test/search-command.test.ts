import assert from "node:assert/strict";
import test from "node:test";

import { runSearchCommand } from "../src/search-command.js";
import { newRootOptions } from "../src/root-options.js";
import { testRootOptions } from "./root-options-test-helpers.js";
import { createBufferWriter } from "./output-test-helpers.js";

test("runSearchCommand formats text output", async () => {
  const out = createBufferWriter();
  const opts = testRootOptions(out.writer);

  await runSearchCommand(
    opts,
    "Douglas Adams",
    "en",
    5,
    false,
    "item",
    async (query, lang, limit, disableVector) => {
      assert.equal(query, "Douglas Adams");
      assert.equal(lang, "en");
      assert.equal(limit, 5);
      assert.equal(disableVector, false);

      return {
        source: "keyword",
        results: [
          {
            id: "Q42",
            label: "Douglas Adams",
            description: "English writer",
          },
          {
            id: "Q5",
            label: "",
            description: "",
          },
        ],
      };
    },
  );

  const got = out.output();
  assert.match(got, /Q42: Douglas Adams/);
  assert.match(got, /Q5/);
});

test("runSearchCommand no results message", async () => {
  const out = createBufferWriter();
  const opts = testRootOptions(out.writer);

  await runSearchCommand(opts, "missing", "en", 10, false, "property", async () => ({
    source: "keyword",
    results: [],
  }));

  assert.equal(out.output(), "No matching Wikidata propertys found.\n");
});

test("runSearchCommand JSON output", async () => {
  const out = createBufferWriter();
  const opts = testRootOptions(out.writer);
  opts.json = true;

  await runSearchCommand(opts, "Douglas Adams", "en", 3, true, "item", async () => ({
    source: "vector",
    results: [],
  }));

  const payload = JSON.parse(out.output()) as Record<string, unknown>;
  assert.equal(payload.query, "Douglas Adams");
  assert.equal(payload.source, "vector");
  assert.equal(payload.message, "No matching Wikidata items found.");
});

test("runSearchCommand requires client", async () => {
  const out = createBufferWriter();
  const opts = newRootOptions(out.writer);

  await assert.rejects(
    runSearchCommand(opts, "Douglas Adams", "en", 1, false, "item", async () => ({
      source: "keyword",
      results: [],
    })),
    /wikidata client is not initialized/,
  );
});
