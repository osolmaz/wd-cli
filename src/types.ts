export type SearchSource = "vector" | "keyword";

export interface SearchResult {
  id: string;
  label: string;
  description: string;
}

export interface SearchResponse {
  source: SearchSource;
  results: SearchResult[];
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
