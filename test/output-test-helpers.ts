import { Writable } from "node:stream";

export interface BufferWriter {
  writer: Writable;
  output(): string;
}

export function createBufferWriter(): BufferWriter {
  const chunks: string[] = [];

  const writer = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk));
      callback();
    },
  });

  return {
    writer,
    output(): string {
      return chunks.join("");
    },
  };
}
