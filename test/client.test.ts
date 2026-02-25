import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import test from "node:test";

import { asHTTPError, Client } from "../src/client.js";
import type { HTTPError } from "../src/client.js";
import type { Config } from "../src/config.js";

async function withServer(
  handler: (req: IncomingMessage, res: ServerResponse) => void,
  fn: (baseURL: string) => Promise<void>,
): Promise<void> {
  const server = createServer(handler);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("failed to resolve server address");
  }

  try {
    await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}

function testConfig(baseURL: string): Config {
  return {
    wikidataApiUrl: `${baseURL}/w/api.php`,
    wikidataQueryUrl: `${baseURL}/sparql`,
    textifierUrl: `${baseURL}/textify`,
    vectorSearchUrl: `${baseURL}/vector`,
    userAgent: "wd-cli-test/1.0",
    timeoutMs: 2000,
    vectorApiSecret: "",
  };
}

test("Client validates config", () => {
  const cfg = testConfig("http://example.com");

  const cases: Array<{
    name: string;
    mutate: (candidate: Config) => void;
    errorSub: string;
  }> = [
    {
      name: "invalid wikidata api url",
      mutate: (candidate) => {
        candidate.wikidataApiUrl = "://bad-url";
      },
      errorSub: "invalid wikidata api url",
    },
    {
      name: "invalid timeout",
      mutate: (candidate) => {
        candidate.timeoutMs = 0;
      },
      errorSub: "timeout must be greater than zero",
    },
    {
      name: "empty user agent",
      mutate: (candidate) => {
        candidate.userAgent = "   ";
      },
      errorSub: "user agent cannot be empty",
    },
  ];

  for (const tc of cases) {
    const candidate = { ...cfg };
    tc.mutate(candidate);

    assert.throws(() => new Client(candidate), new RegExp(tc.errorSub));
  }
});

test("getJSON sends headers and query params", async () => {
  let gotPath = "";
  let gotQuery = "";
  let gotAccept = "";
  let gotUA = "";
  let gotCustom = "";

  await withServer(
    (req, res) => {
      gotPath = req.url || "";
      const [path, query] = gotPath.split("?");
      gotPath = path;
      gotQuery = query || "";
      gotAccept = String(req.headers.accept || "");
      gotUA = String(req.headers["user-agent"] || "");
      gotCustom = String(req.headers["x-test"] || "");

      res.setHeader("Content-Type", "application/json");
      res.end('{"status":"ok"}');
    },
    async (baseURL) => {
      const client = new Client(testConfig(baseURL));

      const params = new URLSearchParams();
      params.set("query", "Douglas Adams");
      params.set("lang", "en");

      const response = await client.getJSON<{ status: string }>(
        `${baseURL}/search`,
        params,
        {
          "X-Test": "enabled",
          "X-Blank": "   ",
        },
      );

      assert.equal(gotPath, "/search");
      assert.match(gotQuery, /query=Douglas\+Adams/);
      assert.match(gotQuery, /lang=en/);
      assert.equal(gotAccept, "application/json");
      assert.equal(gotUA, "wd-cli-test/1.0");
      assert.equal(gotCustom, "enabled");
      assert.equal(response.status, "ok");
    },
  );
});

test("getJSON returns HTTP error", async () => {
  await withServer(
    (_req, res) => {
      res.statusCode = 502;
      res.end("upstream timeout");
    },
    async (baseURL) => {
      const client = new Client(testConfig(baseURL));

      await assert.rejects(
        client.getJSON<Record<string, unknown>>(`${baseURL}/failing`),
        (error: unknown) => {
          assert.equal(asHTTPError(error), true);
          const httpError = error as HTTPError;
          assert.equal(httpError.statusCode, 502);
          assert.equal(httpError.body.trim(), "upstream timeout");
          return true;
        },
      );
    },
  );
});

test("getJSON returns decode error", async () => {
  await withServer(
    (_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end("{invalid");
    },
    async (baseURL) => {
      const client = new Client(testConfig(baseURL));

      await assert.rejects(
        client.getJSON<Record<string, unknown>>(`${baseURL}/invalid`),
        /failed to decode response json/,
      );
    },
  );
});

test("asHTTPError returns false for other errors", () => {
  assert.equal(asHTTPError(new Error("boom")), false);
});

test("client timeout uses configured value", () => {
  const cfg = testConfig("http://example.com");
  cfg.timeoutMs = 7000;

  const client = new Client(cfg);
  assert.equal(client.timeout(), 7000);
});
