import { firstNonEmpty } from "./config.js";
import { stringify } from "./format.js";
import type {
  ProfileField,
  ProfileFieldValue,
  ProfileType,
  TextifierEntity,
} from "./types.js";

export interface ProfileFieldDefinition {
  key: string;
  label: string;
  propertyIDs: string[];
}

const PROFILE_FIELDS: Record<ProfileType, ProfileFieldDefinition[]> = {
  company: [
    { key: "instance_of", label: "Instance of", propertyIDs: ["P31"] },
    { key: "industry", label: "Industry", propertyIDs: ["P452"] },
    { key: "country", label: "Country", propertyIDs: ["P17"] },
    { key: "headquarters", label: "Headquarters location", propertyIDs: ["P159"] },
    { key: "inception", label: "Inception date", propertyIDs: ["P571"] },
    { key: "founded_by", label: "Founded by", propertyIDs: ["P112"] },
    {
      key: "chief_executive_officer",
      label: "Chief executive officer",
      propertyIDs: ["P169"],
    },
    { key: "owner", label: "Owner", propertyIDs: ["P127"] },
    { key: "employees", label: "Number of employees", propertyIDs: ["P1128"] },
    { key: "official_website", label: "Official website", propertyIDs: ["P856"] },
  ],
  person: [
    { key: "instance_of", label: "Instance of", propertyIDs: ["P31"] },
    { key: "occupation", label: "Occupation", propertyIDs: ["P106"] },
    { key: "citizenship", label: "Country of citizenship", propertyIDs: ["P27"] },
    { key: "date_of_birth", label: "Date of birth", propertyIDs: ["P569"] },
    { key: "date_of_death", label: "Date of death", propertyIDs: ["P570"] },
    { key: "place_of_birth", label: "Place of birth", propertyIDs: ["P19"] },
    { key: "place_of_death", label: "Place of death", propertyIDs: ["P20"] },
    { key: "employer", label: "Employer", propertyIDs: ["P108"] },
    { key: "educated_at", label: "Educated at", propertyIDs: ["P69"] },
    { key: "official_website", label: "Official website", propertyIDs: ["P856"] },
  ],
  place: [
    { key: "instance_of", label: "Instance of", propertyIDs: ["P31"] },
    { key: "country", label: "Country", propertyIDs: ["P17"] },
    {
      key: "located_in_administrative_entity",
      label: "Located in administrative entity",
      propertyIDs: ["P131"],
    },
    { key: "continent", label: "Continent", propertyIDs: ["P30"] },
    { key: "inception", label: "Inception date", propertyIDs: ["P571"] },
    { key: "population", label: "Population", propertyIDs: ["P1082"] },
    { key: "area", label: "Area", propertyIDs: ["P2046"] },
    { key: "elevation", label: "Elevation above sea level", propertyIDs: ["P2048"] },
    { key: "coordinate_location", label: "Coordinate location", propertyIDs: ["P625"] },
    { key: "official_website", label: "Official website", propertyIDs: ["P856"] },
  ],
};

export function profileFieldDefinitions(profileType: ProfileType): ProfileFieldDefinition[] {
  const definitions = PROFILE_FIELDS[profileType];
  if (!definitions) {
    throw new Error(`unsupported profile type: ${profileType}`);
  }

  return definitions.map((definition) => ({
    ...definition,
    propertyIDs: [...definition.propertyIDs],
  }));
}

export function profilePropertyIDs(definitions: ProfileFieldDefinition[]): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const definition of definitions) {
    for (const propertyID of definition.propertyIDs) {
      if (seen.has(propertyID)) {
        continue;
      }
      seen.add(propertyID);
      ids.push(propertyID);
    }
  }

  return ids;
}

export function emptyProfileFields(
  definitions: ProfileFieldDefinition[],
): Record<string, ProfileField> {
  const fields: Record<string, ProfileField> = {};

  for (const definition of definitions) {
    fields[definition.key] = {
      label: definition.label,
      property_ids: [...definition.propertyIDs],
      values: [],
    };
  }

  return fields;
}

export function profileFieldsFromEntity(
  entity: TextifierEntity,
  definitions: ProfileFieldDefinition[],
): Record<string, ProfileField> {
  const fields = emptyProfileFields(definitions);

  for (const definition of definitions) {
    const values: ProfileFieldValue[] = [];
    const seen = new Set<string>();

    for (const claim of entity.claims || []) {
      const propertyID = (claim.PID || "").trim();
      if (propertyID === "" || !definition.propertyIDs.includes(propertyID)) {
        continue;
      }

      const propertyLabel = firstNonEmpty(claim.property_label, propertyID);
      for (const claimValue of claim.values || []) {
        const [entityID, entityLabel] = extractEntityIdentifier(claimValue.value);
        const display =
          entityID !== ""
            ? firstNonEmpty(entityLabel, entityID)
            : stringify(claimValue.value).trim();

        if (display === "") {
          continue;
        }

        const normalized: ProfileFieldValue = {
          display,
          value: display,
          source_property_id: propertyID,
          source_property_label: propertyLabel,
          rank: firstNonEmpty(claimValue.rank, "normal"),
          reference_count: (claimValue.references || []).length,
        };

        if (entityID !== "") {
          normalized.entity_id = entityID;
        }

        const dedupeKey = [
          normalized.display,
          normalized.entity_id || "",
          normalized.source_property_id,
          normalized.rank,
          String(normalized.reference_count),
        ].join("|");
        if (seen.has(dedupeKey)) {
          continue;
        }

        seen.add(dedupeKey);
        values.push(normalized);
      }
    }

    fields[definition.key] = {
      ...fields[definition.key],
      values,
    };
  }

  return fields;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function extractEntityIdentifier(value: unknown): [string, string] {
  const entityMap = asRecord(value);
  if (!entityMap) {
    return ["", ""];
  }

  if (typeof entityMap.QID === "string" && entityMap.QID.trim() !== "") {
    return [
      entityMap.QID.trim(),
      typeof entityMap.label === "string" ? entityMap.label.trim() : "",
    ];
  }

  if (typeof entityMap.PID === "string" && entityMap.PID.trim() !== "") {
    return [
      entityMap.PID.trim(),
      typeof entityMap.label === "string" ? entityMap.label.trim() : "",
    ];
  }

  return ["", ""];
}
