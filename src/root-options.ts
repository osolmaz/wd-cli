import type { Writable } from "node:stream";

import type { Client } from "./client.js";
import type { Config } from "./config.js";
import { defaultConfig } from "./config.js";

export interface RootOptions {
  json: boolean;
  timeoutMs: number;
  userAgent: string;
  wikidataApiUrl: string;
  wikidataQueryUrl: string;
  textifierUrl: string;
  vectorSearchUrl: string;
  vectorSecret: string;
  createClient?: (config: Config) => Client;
  client?: Client;
  stdout: Writable;
}

export function newRootOptions(
  stdout: Writable = process.stdout,
  env: NodeJS.ProcessEnv = process.env,
): RootOptions {
  const defaults = defaultConfig(env);

  return {
    json: false,
    timeoutMs: defaults.timeoutMs,
    userAgent: defaults.userAgent,
    wikidataApiUrl: defaults.wikidataApiUrl,
    wikidataQueryUrl: defaults.wikidataQueryUrl,
    textifierUrl: defaults.textifierUrl,
    vectorSearchUrl: defaults.vectorSearchUrl,
    vectorSecret: defaults.vectorApiSecret,
    stdout,
  };
}

export function ensureClient(opts: RootOptions): Client {
  if (!opts.client) {
    throw new Error("wikidata client is not initialized");
  }
  return opts.client;
}

export function defaultsOrValue(value: string, fallback: string): string {
  if (value.trim() === "") {
    return fallback;
  }
  return value;
}

export function rootOptionsToConfig(opts: RootOptions, defaults: Config): Config {
  return {
    wikidataApiUrl: defaultsOrValue(opts.wikidataApiUrl, defaults.wikidataApiUrl),
    wikidataQueryUrl: defaultsOrValue(opts.wikidataQueryUrl, defaults.wikidataQueryUrl),
    textifierUrl: defaultsOrValue(opts.textifierUrl, defaults.textifierUrl),
    vectorSearchUrl: defaultsOrValue(opts.vectorSearchUrl, defaults.vectorSearchUrl),
    vectorApiSecret: opts.vectorSecret,
    userAgent: defaultsOrValue(opts.userAgent, defaults.userAgent),
    timeoutMs: opts.timeoutMs,
  };
}
