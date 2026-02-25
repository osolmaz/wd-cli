import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { resolveSPARQLQuery } from "../src/sparql-command.js";

test("resolveSPARQLQuery from positional arg", async () => {
  const got = await resolveSPARQLQuery(
    ["  SELECT * WHERE { ?s ?p ?o } LIMIT 1  "],
    "",
    "",
  );

  assert.equal(got, "SELECT * WHERE { ?s ?p ?o } LIMIT 1");
});

test("resolveSPARQLQuery from flag", async () => {
  const got = await resolveSPARQLQuery([], "ASK { ?s ?p ?o }", "");
  assert.equal(got, "ASK { ?s ?p ?o }");
});

test("resolveSPARQLQuery from file", async () => {
  const dir = await mkdtemp(join(tmpdir(), "wikidata-cli-test-"));
  const path = join(dir, "query.sparql");
  await writeFile(path, "  SELECT ?item WHERE { ?item wdt:P31 wd:Q5 } LIMIT 2  ");

  const got = await resolveSPARQLQuery([], "", path);
  assert.equal(got, "SELECT ?item WHERE { ?item wdt:P31 wd:Q5 } LIMIT 2");
});

test("resolveSPARQLQuery rejects multiple sources", async () => {
  await assert.rejects(
    resolveSPARQLQuery(["SELECT * WHERE { ?s ?p ?o }"], "ASK { ?s ?p ?o }", ""),
    /only one query source/,
  );
});

test("resolveSPARQLQuery rejects missing source", async () => {
  await assert.rejects(resolveSPARQLQuery([], "", ""), /provide a query/);
});

test("resolveSPARQLQuery rejects empty query", async () => {
  const dir = await mkdtemp(join(tmpdir(), "wikidata-cli-test-"));
  const path = join(dir, "query.sparql");
  await writeFile(path, "   ");

  await assert.rejects(resolveSPARQLQuery([], "", path), /cannot be empty/);
});
