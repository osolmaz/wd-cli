package wikidata

import "testing"

func TestHierarchyToJSON(t *testing.T) {
	graph := map[string]hierarchyNode{
		"Q42": {
			Label:      "Douglas Adams",
			InstanceOf: []string{"Q5"},
			SubclassOf: nil,
		},
		"Q5": {
			Label:      "human",
			InstanceOf: nil,
			SubclassOf: []string{"Q729"},
		},
		"Q729": {
			Label:      "mammal",
			InstanceOf: nil,
			SubclassOf: nil,
		},
	}

	rendered := hierarchyToJSON("Q42", graph, 2)
	top, ok := rendered.(map[string]any)
	if !ok {
		t.Fatalf("expected map output, got %T", rendered)
	}
	if _, ok := top["Douglas Adams (Q42)"]; !ok {
		t.Fatalf("expected root key not found in rendered hierarchy: %#v", top)
	}
}
