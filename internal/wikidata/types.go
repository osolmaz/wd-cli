package wikidata

type SearchSource string

const (
	SearchSourceVector  SearchSource = "vector"
	SearchSourceKeyword SearchSource = "keyword"
)

type SearchResult struct {
	ID          string `json:"id"`
	Label       string `json:"label"`
	Description string `json:"description"`
}

type SearchResponse struct {
	Source  SearchSource   `json:"source"`
	Results []SearchResult `json:"results"`
}

type HierarchyResult struct {
	Tree    map[string]any `json:"tree,omitempty"`
	Message string         `json:"message,omitempty"`
}

type SPARQLResult struct {
	Vars    []string            `json:"vars,omitempty"`
	Rows    []map[string]string `json:"rows,omitempty"`
	CSV     string              `json:"csv,omitempty"`
	Message string              `json:"message,omitempty"`
}

type textifierEntity struct {
	QID         string           `json:"QID"`
	PID         string           `json:"PID"`
	Label       string           `json:"label"`
	Description string           `json:"description"`
	Claims      []textifierClaim `json:"claims"`
}

type textifierClaim struct {
	PID           string                `json:"PID"`
	PropertyLabel string                `json:"property_label"`
	Datatype      string                `json:"datatype"`
	Values        []textifierClaimValue `json:"values"`
}

type textifierClaimValue struct {
	Value      any                    `json:"value"`
	Rank       string                 `json:"rank"`
	Qualifiers []textifierQualifier   `json:"qualifiers"`
	References [][]textifierQualifier `json:"references"`
}

type textifierQualifier struct {
	PID           string                    `json:"PID"`
	PropertyLabel string                    `json:"property_label"`
	Datatype      string                    `json:"datatype"`
	Values        []textifierQualifierValue `json:"values"`
}

type textifierQualifierValue struct {
	Value any `json:"value"`
}
