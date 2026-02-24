package cmd

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestResolveSPARQLQueryFromPositionalArg(t *testing.T) {
	got, err := resolveSPARQLQuery([]string{"  SELECT * WHERE { ?s ?p ?o } LIMIT 1  "}, "", "")
	if err != nil {
		t.Fatalf("resolveSPARQLQuery returned error: %v", err)
	}
	if got != "SELECT * WHERE { ?s ?p ?o } LIMIT 1" {
		t.Fatalf("unexpected query text: %q", got)
	}
}

func TestResolveSPARQLQueryFromFlag(t *testing.T) {
	got, err := resolveSPARQLQuery(nil, "ASK { ?s ?p ?o }", "")
	if err != nil {
		t.Fatalf("resolveSPARQLQuery returned error: %v", err)
	}
	if got != "ASK { ?s ?p ?o }" {
		t.Fatalf("unexpected query text: %q", got)
	}
}

func TestResolveSPARQLQueryFromFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "query.sparql")
	content := "  SELECT ?item WHERE { ?item wdt:P31 wd:Q5 } LIMIT 2  "
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatalf("failed to write query file: %v", err)
	}

	got, err := resolveSPARQLQuery(nil, "", path)
	if err != nil {
		t.Fatalf("resolveSPARQLQuery returned error: %v", err)
	}
	if got != "SELECT ?item WHERE { ?item wdt:P31 wd:Q5 } LIMIT 2" {
		t.Fatalf("unexpected query text: %q", got)
	}
}

func TestResolveSPARQLQueryRejectsMultipleSources(t *testing.T) {
	_, err := resolveSPARQLQuery([]string{"SELECT * WHERE { ?s ?p ?o }"}, "ASK { ?s ?p ?o }", "")
	if err == nil {
		t.Fatalf("expected error for multiple query sources")
	}
	if !strings.Contains(err.Error(), "only one query source") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestResolveSPARQLQueryRejectsMissingSource(t *testing.T) {
	_, err := resolveSPARQLQuery(nil, "", "")
	if err == nil {
		t.Fatalf("expected error when query source is missing")
	}
	if !strings.Contains(err.Error(), "provide a query") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestResolveSPARQLQueryRejectsEmptyQuery(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "query.sparql")
	if err := os.WriteFile(path, []byte("   "), 0o600); err != nil {
		t.Fatalf("failed to write query file: %v", err)
	}

	_, err := resolveSPARQLQuery(nil, "", path)
	if err == nil {
		t.Fatalf("expected error for empty query")
	}
	if !strings.Contains(err.Error(), "cannot be empty") {
		t.Fatalf("unexpected error: %v", err)
	}
}
