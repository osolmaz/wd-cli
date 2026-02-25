import assert from "node:assert/strict";
import test from "node:test";

import type { Client } from "../src/client.js";
import { newRootOptions } from "../src/root-options.js";
import { newRootCommand } from "../src/root.js";
import { createBufferWriter } from "./output-test-helpers.js";

function commandWithClient(stubClient: Client) {
  const out = createBufferWriter();
  const opts = newRootOptions(out.writer);
  opts.createClient = () => stubClient;
  const command = newRootCommand(opts);

  return {
    command,
    output: out.output,
  };
}

test("search-items action uses parsed option values", async () => {
  const calls: Array<{
    query: string;
    lang: string;
    limit: number;
    disableVector: boolean;
  }> = [];

  const stubClient = {
    searchItems: async (
      query: string,
      lang: string,
      limit: number,
      disableVector: boolean,
    ) => {
      calls.push({ query, lang, limit, disableVector });
      return {
        source: "keyword",
        results: [
          {
            id: "Q42",
            label: "Douglas Adams",
            description: "English writer",
          },
        ],
      };
    },
  } as unknown as Client;

  const { command, output } = commandWithClient(stubClient);

  await command.parseAsync(
    ["search-items", "Douglas Adams", "--lang", "de", "--limit", "7", "--no-vector"],
    {
      from: "user",
    },
  );

  assert.deepEqual(calls, [
    {
      query: "Douglas Adams",
      lang: "de",
      limit: 7,
      disableVector: true,
    },
  ]);
  assert.match(output(), /Q42: Douglas Adams — English writer/);
});

test("get-statements action parses boolean option", async () => {
  const calls: Array<{
    entityID: string;
    includeExternalIDs: boolean;
    lang: string;
  }> = [];

  const stubClient = {
    getStatements: async (
      entityID: string,
      includeExternalIDs: boolean,
      lang: string,
    ) => {
      calls.push({ entityID, includeExternalIDs, lang });
      return "ok";
    },
  } as unknown as Client;

  const { command, output } = commandWithClient(stubClient);

  await command.parseAsync(
    ["get-statements", "Q42", "--include-external-ids", "--lang", "tr"],
    {
      from: "user",
    },
  );

  assert.deepEqual(calls, [
    {
      entityID: "Q42",
      includeExternalIDs: true,
      lang: "tr",
    },
  ]);
  assert.equal(output(), "ok\n");
});

test("execute-sparql action parses query and limit options", async () => {
  const calls: Array<{
    query: string;
    limit: number;
  }> = [];

  const stubClient = {
    executeSPARQL: async (query: string, limit: number) => {
      calls.push({ query, limit });
      return {
        csv: ";item\n0;Q42\n",
      };
    },
  } as unknown as Client;

  const { command, output } = commandWithClient(stubClient);

  await command.parseAsync(
    [
      "execute-sparql",
      "--query",
      "SELECT ?item WHERE { ?item wdt:P31 wd:Q5 } LIMIT 1",
      "--k",
      "3",
    ],
    {
      from: "user",
    },
  );

  assert.deepEqual(calls, [
    {
      query: "SELECT ?item WHERE { ?item wdt:P31 wd:Q5 } LIMIT 1",
      limit: 3,
    },
  ]);
  assert.equal(output(), ";item\n0;Q42\n");
});
