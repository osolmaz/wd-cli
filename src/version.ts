export const buildMetadata = {
  version: (process.env.WIKIDATA_CLI_VERSION || "0.1.0-dev").trim(),
  commit: (process.env.WIKIDATA_CLI_COMMIT || "").trim(),
  date: (process.env.WIKIDATA_CLI_DATE || "").trim(),
};

export function getVersionPayload(): {
  version: string;
  commit: string;
  date: string;
} {
  return {
    version: buildMetadata.version.trim(),
    commit: buildMetadata.commit.trim(),
    date: buildMetadata.date.trim(),
  };
}

export function renderVersionText(): string {
  let ver = buildMetadata.version.trim();
  if (ver === "") {
    ver = "dev";
  }

  const commit = buildMetadata.commit.trim();
  const date = buildMetadata.date.trim();

  if (commit !== "" || date !== "") {
    ver = `${ver} (${commit} ${date})`;
  }

  return ver;
}
