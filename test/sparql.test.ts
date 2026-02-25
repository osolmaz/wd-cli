import assert from "node:assert/strict";
import test from "node:test";

import { shortenWikidataEntityURI, toSemicolonCSV } from "../src/client.js";

test("shortenWikidataEntityURI", () => {
  const got = shortenWikidataEntityURI("http://www.wikidata.org/entity/Q42");
  assert.equal(got, "Q42");

  const untouched = shortenWikidataEntityURI("https://example.com");
  assert.equal(untouched, "https://example.com");
});

test("toSemicolonCSV", () => {
  const csvText = toSemicolonCSV(
    ["human", "humanLabel"],
    [
      { human: "Q42", humanLabel: "Douglas Adams" },
      { human: "Q23", humanLabel: "George Washington" },
    ],
  );

  const expectedLines = [
    ";human;humanLabel",
    "0;Q42;Douglas Adams",
    "1;Q23;George Washington",
  ];

  for (const line of expectedLines) {
    assert.match(csvText, new RegExp(line.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
