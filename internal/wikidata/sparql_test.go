package wikidata

import (
	"strings"
	"testing"
)

func TestShortenWikidataEntityURI(t *testing.T) {
	got := shortenWikidataEntityURI("http://www.wikidata.org/entity/Q42")
	if got != "Q42" {
		t.Fatalf("expected shortened URI to be Q42, got %q", got)
	}

	untouched := shortenWikidataEntityURI("https://example.com")
	if untouched != "https://example.com" {
		t.Fatalf("expected non-wikidata URI to stay unchanged, got %q", untouched)
	}
}

func TestToSemicolonCSV(t *testing.T) {
	csvText, err := toSemicolonCSV(
		[]string{"human", "humanLabel"},
		[]map[string]string{
			{"human": "Q42", "humanLabel": "Douglas Adams"},
			{"human": "Q23", "humanLabel": "George Washington"},
		},
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	expectedLines := []string{
		";human;humanLabel",
		"0;Q42;Douglas Adams",
		"1;Q23;George Washington",
	}
	for _, line := range expectedLines {
		if !strings.Contains(csvText, line) {
			t.Fatalf("expected CSV output to contain %q, got:\n%s", line, csvText)
		}
	}
}
