import assert from "node:assert/strict";
import test from "node:test";

import { runProfileCommand } from "../src/profile-command.js";
import type { ProfileResult } from "../src/types.js";
import { testRootOptions } from "./root-options-test-helpers.js";
import { createBufferWriter } from "./output-test-helpers.js";

function companyProfile(): ProfileResult {
  return {
    entity_id: "Q999999",
    profile_type: "company",
    lang: "en",
    fetched_at: "2026-02-25T18:00:00.000Z",
    label: "Example Company",
    description: "example holding company",
    fields: {
      instance_of: {
        label: "Instance of",
        property_ids: ["P31"],
        values: [
          {
            display: "business",
            entity_id: "Q4830453",
            source_property_id: "P31",
            source_property_label: "instance of",
            rank: "normal",
            reference_count: 1,
          },
        ],
      },
      country: {
        label: "Country",
        property_ids: ["P17"],
        values: [
          {
            display: "Singapore",
            entity_id: "Q334",
            source_property_id: "P17",
            source_property_label: "country",
            rank: "normal",
            reference_count: 0,
          },
        ],
      },
      headquarters: {
        label: "Headquarters location",
        property_ids: ["P159"],
        values: [],
      },
      official_website: {
        label: "Official website",
        property_ids: ["P856"],
        values: [
          {
            display: "https://example.com",
            source_property_id: "P856",
            source_property_label: "official website",
            rank: "normal",
            reference_count: 0,
          },
          {
            display: "https://example-2.test",
            source_property_id: "P856",
            source_property_label: "official website",
            rank: "normal",
            reference_count: 0,
          },
          {
            display: "https://example-3.test",
            source_property_id: "P856",
            source_property_label: "official website",
            rank: "normal",
            reference_count: 0,
          },
          {
            display: "https://example-4.test",
            source_property_id: "P856",
            source_property_label: "official website",
            rank: "normal",
            reference_count: 0,
          },
          {
            display: "https://example-5.test",
            source_property_id: "P856",
            source_property_label: "official website",
            rank: "normal",
            reference_count: 0,
          },
          {
            display: "https://example-6.test",
            source_property_id: "P856",
            source_property_label: "official website",
            rank: "normal",
            reference_count: 0,
          },
        ],
      },
    },
    sources: {
      provider: "https://wd-textify.wmcloud.org",
      property_ids: ["P31", "P17", "P159", "P856"],
    },
  };
}

test("runProfileCommand formats concise text profile", async () => {
  const out = createBufferWriter();
  const opts = testRootOptions(out.writer);

  await runProfileCommand(
    opts,
    "Q999999",
    "company",
    "en",
    async (entityID, profileType, lang) => {
      assert.equal(entityID, "Q999999");
      assert.equal(profileType, "company");
      assert.equal(lang, "en");
      return companyProfile();
    },
  );

  const got = out.output();
  assert.match(got, /^Example Company \(Q999999\)/m);
  assert.match(got, /Profile type: company/);
  assert.match(got, /Instance of:\n- business \[Q4830453\] \(refs: 1\)/);
  assert.match(got, /Country:\n- Singapore \[Q334\]/);
  assert.match(got, /Official website:/);
  assert.match(got, /- \.\.\. \+1 more/);
  assert.match(got, /Fetched at: 2026-02-25T18:00:00.000Z/);
});

test("runProfileCommand prints message responses", async () => {
  const out = createBufferWriter();
  const opts = testRootOptions(out.writer);

  await runProfileCommand(opts, "Q0", "company", "en", async () => ({
    ...companyProfile(),
    entity_id: "Q0",
    label: "",
    description: "",
    message: "Entity Q0 not found",
  }));

  assert.equal(out.output(), "Entity Q0 not found\n");
});

test("runProfileCommand JSON output mirrors result schema", async () => {
  const out = createBufferWriter();
  const opts = testRootOptions(out.writer);
  opts.json = true;

  const expected = companyProfile();
  await runProfileCommand(opts, "Q999999", "company", "en", async () => expected);

  const payload = JSON.parse(out.output()) as Record<string, unknown>;
  assert.equal(payload.entity_id, "Q999999");
  assert.equal(payload.profile_type, "company");
  assert.equal(payload.fetched_at, "2026-02-25T18:00:00.000Z");
  assert.ok(payload.fields);
  assert.ok(payload.sources);
});
