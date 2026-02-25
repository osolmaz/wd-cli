import { printJSON, printText } from "./output.js";
import type { RootOptions } from "./root-options.js";
import { getVersionPayload, renderVersionText } from "./version.js";

export function runVersionCommand(opts: RootOptions): void {
  if (opts.json) {
    printJSON(opts.stdout, getVersionPayload());
    return;
  }

  printText(opts.stdout, renderVersionText());
}
