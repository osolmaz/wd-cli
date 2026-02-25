import assert from "node:assert/strict";
import test from "node:test";

import { hierarchyToJSON } from "../src/client.js";

test("hierarchyToJSON", () => {
  const graph = {
    Q42: {
      label: "Douglas Adams",
      instanceOf: ["Q5"],
      subclassOf: [],
    },
    Q5: {
      label: "human",
      instanceOf: [],
      subclassOf: ["Q729"],
    },
    Q729: {
      label: "mammal",
      instanceOf: [],
      subclassOf: [],
    },
  };

  const rendered = hierarchyToJSON("Q42", graph, 2);

  assert.equal(typeof rendered, "object");
  assert.ok(rendered && !Array.isArray(rendered));

  const top = rendered as Record<string, unknown>;
  assert.ok(Object.hasOwn(top, "Douglas Adams (Q42)"));
});
