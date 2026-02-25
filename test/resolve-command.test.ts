import assert from "node:assert/strict";
import test from "node:test";

import { runResolveCommand } from "../src/resolve-command.js";
import { testRootOptions } from "./root-options-test-helpers.js";
import { createBufferWriter } from "./output-test-helpers.js";

test("runResolveCommand formats disambiguation output", async () => {
  const out = createBufferWriter();
  const opts = testRootOptions(out.writer);

  await runResolveCommand(
    opts,
    "Marie Curie",
    "en",
    3,
    false,
    async (query, lang, limit, disableVector) => {
      assert.equal(query, "Marie Curie");
      assert.equal(lang, "en");
      assert.equal(limit, 3);
      assert.equal(disableVector, false);

      return {
        source: "keyword",
        results: [
          {
            id: "Q7186",
            label: "Marie Curie",
            description: "Polish and naturalized-French physicist and chemist",
          },
          {
            id: "Q123",
            label: "Marie Curie (film)",
            description: "2016 biographical film",
          },
        ],
      };
    },
  );

  const got = out.output();
  assert.match(
    got,
    /1\. Q7186: Marie Curie — Polish and naturalized-French physicist and chemist/,
  );
  assert.match(got, /\[high confidence; exact label match, top search result\]/);
  assert.match(
    got,
    /2\. Q123: Marie Curie \(film\) — 2016 biographical film \[medium confidence; strong label overlap\]/,
  );
});

test("runResolveCommand prints empty-state message", async () => {
  const out = createBufferWriter();
  const opts = testRootOptions(out.writer);

  await runResolveCommand(opts, "nope", "en", 5, true, async () => ({
    source: "keyword",
    results: [],
  }));

  assert.equal(out.output(), "No matching Wikidata entities found.\n");
});

test("runResolveCommand JSON payload is stable", async () => {
  const out = createBufferWriter();
  const opts = testRootOptions(out.writer);
  opts.json = true;

  await runResolveCommand(opts, "Marie Curie", "en", 1, false, async () => ({
    source: "vector",
    results: [],
  }));

  const payload = JSON.parse(out.output()) as Record<string, unknown>;
  assert.equal(payload.query, "Marie Curie");
  assert.equal(payload.lang, "en");
  assert.equal(payload.limit, 1);
  assert.equal(payload.source, "vector");
  assert.equal(payload.message, "No matching Wikidata entities found.");
  assert.deepEqual(payload.candidates, []);
});

test("runResolveCommand marks non-top exact label candidates as high confidence", async () => {
  const out = createBufferWriter();
  const opts = testRootOptions(out.writer);
  opts.json = true;

  await runResolveCommand(opts, "Curie", "en", 2, false, async () => ({
    source: "keyword",
    results: [
      {
        id: "Q7076",
        label: "Curie temperature",
        description: "critical point in magnetic materials",
      },
      {
        id: "Q1212947",
        label: "Curie",
        description: "obsolete unit of radioactivity",
      },
    ],
  }));

  const payload = JSON.parse(out.output()) as {
    candidates: Array<{ id: string; confidence: string }>;
  };
  assert.equal(payload.candidates[1].id, "Q1212947");
  assert.equal(payload.candidates[1].confidence, "high");
});
