import { printJSON, printText } from "./output.js";
import { ensureClient } from "./root-options.js";
import type { RootOptions } from "./root-options.js";
import type { ProfileResult, ProfileType } from "./types.js";

const MAX_VALUES_PER_FIELD = 5;

export type ProfileFunc = (
  entityID: string,
  profileType: ProfileType,
  lang: string,
) => Promise<ProfileResult>;

export async function runProfileCommand(
  opts: RootOptions,
  entityID: string,
  profileType: ProfileType,
  lang: string,
  profile: ProfileFunc,
): Promise<void> {
  ensureClient(opts);

  const result = await profile(entityID, profileType, lang);

  if (opts.json) {
    printJSON(opts.stdout, result);
    return;
  }

  if (result.message) {
    printText(opts.stdout, result.message);
    return;
  }

  printText(opts.stdout, profileToText(result));
}

function profileToText(result: ProfileResult): string {
  const lines: string[] = [];
  const cleanLabel = result.label.trim();
  if (cleanLabel === "") {
    lines.push(result.entity_id);
  } else {
    lines.push(`${cleanLabel} (${result.entity_id})`);
  }

  const cleanDescription = result.description.trim();
  if (cleanDescription !== "") {
    lines.push(cleanDescription);
  }

  lines.push(`Profile type: ${result.profile_type}`);

  for (const field of Object.values(result.fields)) {
    if (field.values.length === 0) {
      continue;
    }

    lines.push("");
    lines.push(`${field.label}:`);

    const shownValues = field.values.slice(0, MAX_VALUES_PER_FIELD);
    for (const value of shownValues) {
      const display = (value.display || value.value || "").trim();
      if (display === "") {
        continue;
      }

      const entityID =
        value.entity_id && display !== value.entity_id
          ? ` [${value.entity_id}]`
          : "";
      const refs = value.reference_count > 0 ? ` (refs: ${value.reference_count})` : "";
      lines.push(`- ${display}${entityID}${refs}`);
    }

    const remaining = field.values.length - shownValues.length;
    if (remaining > 0) {
      lines.push(`- ... +${remaining} more`);
    }
  }

  lines.push("");
  lines.push(`Fetched at: ${result.fetched_at}`);

  return lines.join("\n");
}
