import type { Writable } from "node:stream";

export function printJSON(writer: Writable, value: unknown): void {
  writer.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function printText(writer: Writable, text: string): void {
  if (text.endsWith("\n")) {
    writer.write(text);
    return;
  }
  writer.write(`${text}\n`);
}
