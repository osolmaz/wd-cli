import assert from "node:assert/strict";
import test from "node:test";

import { stringify, tripletValuesToString } from "../src/format.js";
import type { TextifierEntity } from "../src/types.js";

test("stringify entity", () => {
  const value = {
    QID: "Q42",
    label: "Douglas Adams",
  };

  const got = stringify(value);
  assert.equal(got, "Douglas Adams (Q42)");
});

test("tripletValuesToString", () => {
  const entity: TextifierEntity = {
    label: "Douglas Adams",
    claims: [
      {
        PID: "P106",
        property_label: "occupation",
        values: [
          {
            value: {
              QID: "Q6625963",
              label: "novelist",
            },
            rank: "normal",
            qualifiers: [
              {
                PID: "P580",
                property_label: "start time",
                values: [{ value: { string: "1979" } }],
              },
            ],
          },
        ],
      },
    ],
  };

  const got = tripletValuesToString("Q42", "P106", entity);
  const expectedFragments = [
    "Douglas Adams (Q42): occupation (P106): novelist (Q6625963)",
    "Rank: normal",
    "Qualifier:",
    "start time (P580): 1979",
  ];

  for (const fragment of expectedFragments) {
    assert.match(got, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
