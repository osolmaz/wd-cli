import assert from "node:assert/strict";
import test from "node:test";

import { runVersionCommand } from "../src/version-command.js";
import { buildMetadata } from "../src/version.js";
import { createBufferWriter } from "./output-test-helpers.js";
import { testRootOptions } from "./root-options-test-helpers.js";

function withVersionMetadata(
  version: string,
  commit: string,
  date: string,
  fn: () => void,
): void {
  const old = {
    version: buildMetadata.version,
    commit: buildMetadata.commit,
    date: buildMetadata.date,
  };

  buildMetadata.version = version;
  buildMetadata.commit = commit;
  buildMetadata.date = date;

  try {
    fn();
  } finally {
    buildMetadata.version = old.version;
    buildMetadata.commit = old.commit;
    buildMetadata.date = old.date;
  }
}

test("version command text output with metadata", () => {
  withVersionMetadata(" 1.2.3 ", " abc123 ", " 2026-02-24T12:00:00Z ", () => {
    const out = createBufferWriter();
    const opts = testRootOptions(out.writer);

    runVersionCommand(opts);

    assert.equal(out.output(), "1.2.3 (abc123 2026-02-24T12:00:00Z)\n");
  });
});

test("version command text output defaults to dev", () => {
  withVersionMetadata("  ", "", "", () => {
    const out = createBufferWriter();
    const opts = testRootOptions(out.writer);

    runVersionCommand(opts);

    assert.equal(out.output(), "dev\n");
  });
});

test("version command JSON output", () => {
  withVersionMetadata(" 2.0.0 ", " 89abcd ", " 2026-02-24T18:11:00Z ", () => {
    const out = createBufferWriter();
    const opts = testRootOptions(out.writer);
    opts.json = true;

    runVersionCommand(opts);

    const payload = JSON.parse(out.output()) as Record<string, string>;
    assert.equal(payload.version, "2.0.0");
    assert.equal(payload.commit, "89abcd");
    assert.equal(payload.date, "2026-02-24T18:11:00Z");
  });
});
