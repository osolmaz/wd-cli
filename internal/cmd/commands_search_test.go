package cmd

import (
	"bytes"
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/bob/wikidata-cli/internal/wikidata"
)

func TestRunSearchCommandFormatsTextOutput(t *testing.T) {
	var out bytes.Buffer
	opts := &rootOptions{
		client: &wikidata.Client{},
		stdout: &out,
	}

	err := runSearchCommand(
		context.Background(),
		opts,
		"Douglas Adams",
		"en",
		5,
		false,
		"item",
		func(_ context.Context, query, lang string, limit int, disableVector bool) (wikidata.SearchResponse, error) {
			if query != "Douglas Adams" {
				t.Fatalf("unexpected query: %q", query)
			}
			if lang != "en" {
				t.Fatalf("unexpected language: %q", lang)
			}
			if limit != 5 {
				t.Fatalf("unexpected limit: %d", limit)
			}
			if disableVector {
				t.Fatalf("expected vector search to be enabled")
			}

			return wikidata.SearchResponse{
				Source: wikidata.SearchSourceKeyword,
				Results: []wikidata.SearchResult{
					{
						ID:          "Q42",
						Label:       "Douglas Adams",
						Description: "English writer",
					},
					{
						ID: "Q5",
					},
				},
			}, nil
		},
	)
	if err != nil {
		t.Fatalf("runSearchCommand returned error: %v", err)
	}

	got := out.String()
	if !strings.Contains(got, "Q42: Douglas Adams") {
		t.Fatalf("expected text output to include first row, got %q", got)
	}
	if !strings.Contains(got, "Q5") {
		t.Fatalf("expected text output to include bare identifier row, got %q", got)
	}
}

func TestRunSearchCommandNoResultsMessage(t *testing.T) {
	var out bytes.Buffer
	opts := &rootOptions{
		client: &wikidata.Client{},
		stdout: &out,
	}

	err := runSearchCommand(
		context.Background(),
		opts,
		"missing",
		"en",
		10,
		false,
		"property",
		func(_ context.Context, _, _ string, _ int, _ bool) (wikidata.SearchResponse, error) {
			return wikidata.SearchResponse{
				Source:  wikidata.SearchSourceKeyword,
				Results: nil,
			}, nil
		},
	)
	if err != nil {
		t.Fatalf("runSearchCommand returned error: %v", err)
	}

	if got, want := out.String(), "No matching Wikidata propertys found.\n"; got != want {
		t.Fatalf("unexpected no-results output: got %q, want %q", got, want)
	}
}

func TestRunSearchCommandJSONOutput(t *testing.T) {
	var out bytes.Buffer
	opts := &rootOptions{
		JSON:   true,
		client: &wikidata.Client{},
		stdout: &out,
	}

	err := runSearchCommand(
		context.Background(),
		opts,
		"Douglas Adams",
		"en",
		3,
		true,
		"item",
		func(_ context.Context, _, _ string, _ int, _ bool) (wikidata.SearchResponse, error) {
			return wikidata.SearchResponse{
				Source:  wikidata.SearchSourceVector,
				Results: nil,
			}, nil
		},
	)
	if err != nil {
		t.Fatalf("runSearchCommand returned error: %v", err)
	}

	var payload map[string]any
	if err := json.Unmarshal(out.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode json output: %v", err)
	}

	if payload["query"] != "Douglas Adams" {
		t.Fatalf("unexpected query in payload: %#v", payload["query"])
	}
	if payload["source"] != string(wikidata.SearchSourceVector) {
		t.Fatalf("unexpected source in payload: %#v", payload["source"])
	}
	if payload["message"] != "No matching Wikidata items found." {
		t.Fatalf("unexpected message in payload: %#v", payload["message"])
	}
}

func TestRunSearchCommandRequiresClient(t *testing.T) {
	var out bytes.Buffer
	opts := &rootOptions{
		stdout: &out,
	}

	err := runSearchCommand(
		context.Background(),
		opts,
		"Douglas Adams",
		"en",
		1,
		false,
		"item",
		func(_ context.Context, _, _ string, _ int, _ bool) (wikidata.SearchResponse, error) {
			t.Fatalf("search function should not have been called")
			return wikidata.SearchResponse{}, nil
		},
	)
	if err == nil {
		t.Fatalf("expected error when client is missing")
	}
}
