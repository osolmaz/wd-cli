import type {
  TextifierClaim,
  TextifierEntity,
  TextifierQualifier,
  TextifierQualifierValue,
} from "./types.js";

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

export function stringify(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object") {
    const typed = asRecord(value);
    if (!typed) {
      return String(value);
    }

    const values = typed.values;
    if (Array.isArray(values)) {
      const formatted = values.map((item) => {
        const itemMap = asRecord(item);
        return stringify(itemMap?.value);
      });
      return formatted.join(", ");
    }

    if (Object.hasOwn(typed, "value")) {
      return stringify(typed.value);
    }

    if (Object.hasOwn(typed, "string")) {
      return stringify(typed.string);
    }

    if (typeof typed.QID === "string" && typed.QID !== "") {
      const label = typeof typed.label === "string" ? typed.label : "";
      if (label.trim() === "") {
        return typed.QID;
      }
      return `${label} (${typed.QID})`;
    }

    if (typeof typed.PID === "string" && typed.PID !== "") {
      const label = typeof typed.label === "string" ? typed.label : "";
      if (label.trim() === "") {
        return typed.PID;
      }
      return `${label} (${typed.PID})`;
    }

    if (Object.hasOwn(typed, "amount")) {
      const amount = String(typed.amount);
      const unit = typeof typed.unit === "string" ? typed.unit : "";
      const text = unit.trim() === "" ? amount : `${amount} ${unit}`;
      return text.trim();
    }

    const keys = Object.keys(typed).sort();
    const parts = keys.map((key) => `${key}=${stringify(typed[key])}`);
    return parts.join(", ");
  }

  return String(value);
}

function stringifyQualifier(q: TextifierQualifier): string {
  const values: string[] = [];
  for (const value of q.values || []) {
    values.push(stringify((value as TextifierQualifierValue).value));
  }
  return values.join(", ");
}

export function tripletValuesToString(
  entityID: string,
  propertyID: string,
  entity: TextifierEntity,
): string {
  if (!entity.claims || entity.claims.length === 0) {
    return "";
  }

  const blocks: string[] = [];

  entity.claims.forEach((claim: TextifierClaim) => {
    (claim.values || []).forEach((claimValue) => {
      const lines: string[] = [];
      const property = (claim.PID || "").trim() === "" ? propertyID : claim.PID || "";
      const entityLabel =
        (entity.label || "").trim() === "" ? entityID : entity.label || entityID;

      lines.push(
        `${entityLabel} (${entityID}): ${claim.property_label} (${property}): ${stringify(claimValue.value)}`,
      );

      const rank = (claimValue.rank || "").trim() === "" ? "normal" : claimValue.rank;
      lines.push(`  Rank: ${rank}`);

      if (claimValue.qualifiers && claimValue.qualifiers.length > 0) {
        lines.push("  Qualifier:");
        for (const qualifier of claimValue.qualifiers) {
          lines.push(
            `    - ${qualifier.property_label} (${qualifier.PID}): ${stringifyQualifier(qualifier)}`,
          );
        }
      }

      if (claimValue.references && claimValue.references.length > 0) {
        claimValue.references.forEach((referenceClaims, referenceIndex) => {
          lines.push(`  Reference ${referenceIndex + 1}:`);
          for (const refClaim of referenceClaims) {
            lines.push(
              `    - ${refClaim.property_label} (${refClaim.PID}): ${stringifyQualifier(refClaim)}`,
            );
          }
        });
      }

      blocks.push(lines.join("\n"));
    });
  });

  return blocks.join("\n").trim();
}
