export type SearchSource = "vector" | "keyword";
export type ResolveConfidence = "high" | "medium" | "low";
export type ProfileType = "company" | "person" | "place";

export interface SearchResult {
  id: string;
  label: string;
  description: string;
}

export interface SearchResponse {
  source: SearchSource;
  results: SearchResult[];
}

export interface ResolveCandidate {
  rank: number;
  id: string;
  label: string;
  description: string;
  confidence: ResolveConfidence;
  hints: string[];
}

export interface ResolveResponse {
  source: SearchSource;
  candidates: ResolveCandidate[];
}

export interface HierarchyResult {
  tree?: Record<string, unknown>;
  message?: string;
}

export interface SPARQLResult {
  vars?: string[];
  rows?: Array<Record<string, string>>;
  csv?: string;
  message?: string;
}

export interface ProfileFieldValue {
  display: string;
  value?: string;
  source_property_id: string;
  source_property_label: string;
  rank: string;
  reference_count: number;
  entity_id?: string;
}

export interface ProfileField {
  label: string;
  property_ids: string[];
  values: ProfileFieldValue[];
}

export interface ProfileResult {
  entity_id: string;
  profile_type: ProfileType;
  lang: string;
  fetched_at: string;
  label: string;
  description: string;
  fields: Record<string, ProfileField>;
  sources: {
    provider: string;
    property_ids: string[];
  };
  message?: string;
}

export interface ApiLangValue {
  value?: string;
}

export interface TextifierEntity {
  QID?: string;
  PID?: string;
  label?: string;
  description?: string;
  claims: TextifierClaim[];
}

export interface TextifierClaim {
  PID?: string;
  property_label?: string;
  datatype?: string;
  values: TextifierClaimValue[];
}

export interface TextifierClaimValue {
  value: unknown;
  rank?: string;
  qualifiers?: TextifierQualifier[];
  references?: TextifierQualifier[][];
}

export interface TextifierQualifier {
  PID?: string;
  property_label?: string;
  datatype?: string;
  values: TextifierQualifierValue[];
}

export interface TextifierQualifierValue {
  value: unknown;
}
