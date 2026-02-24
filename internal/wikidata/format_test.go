package wikidata

import (
	"strings"
	"testing"
)

func TestStringifyEntity(t *testing.T) {
	value := map[string]any{
		"QID":   "Q42",
		"label": "Douglas Adams",
	}
	got := Stringify(value)
	if got != "Douglas Adams (Q42)" {
		t.Fatalf("expected formatted entity, got %q", got)
	}
}

func TestTripletValuesToString(t *testing.T) {
	entity := textifierEntity{
		Label: "Douglas Adams",
		Claims: []textifierClaim{
			{
				PID:           "P106",
				PropertyLabel: "occupation",
				Values: []textifierClaimValue{
					{
						Value: map[string]any{
							"QID":   "Q6625963",
							"label": "novelist",
						},
						Rank: "normal",
						Qualifiers: []textifierQualifier{
							{
								PID:           "P580",
								PropertyLabel: "start time",
								Values: []textifierQualifierValue{
									{Value: map[string]any{"string": "1979"}},
								},
							},
						},
					},
				},
			},
		},
	}

	got := TripletValuesToString("Q42", "P106", entity)
	expectedFragments := []string{
		"Douglas Adams (Q42): occupation (P106): novelist (Q6625963)",
		"Rank: normal",
		"Qualifier:",
		"start time (P580): 1979",
	}
	for _, fragment := range expectedFragments {
		if !strings.Contains(got, fragment) {
			t.Fatalf("expected output to contain %q, got:\n%s", fragment, got)
		}
	}
}
