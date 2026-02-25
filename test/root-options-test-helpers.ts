import type { Writable } from "node:stream";

import type { RootOptions } from "../src/root-options.js";
import { newRootOptions } from "../src/root-options.js";

export function testRootOptions(stdout: Writable): RootOptions {
  return {
    ...newRootOptions(stdout),
    client: {} as never,
  };
}
