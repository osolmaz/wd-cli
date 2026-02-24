package wikidata

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"
)

func TestNewClientValidatesConfig(t *testing.T) {
	cfg := testConfig("http://example.com")

	testCases := []struct {
		name     string
		mutate   func(*Config)
		errorSub string
	}{
		{
			name: "invalid wikidata api url",
			mutate: func(c *Config) {
				c.WikidataAPIURL = "://bad-url"
			},
			errorSub: "invalid wikidata api url",
		},
		{
			name: "invalid timeout",
			mutate: func(c *Config) {
				c.Timeout = 0
			},
			errorSub: "timeout must be greater than zero",
		},
		{
			name: "empty user agent",
			mutate: func(c *Config) {
				c.UserAgent = "   "
			},
			errorSub: "user agent cannot be empty",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			candidate := cfg
			tc.mutate(&candidate)

			_, err := NewClient(candidate)
			if err == nil {
				t.Fatalf("expected config validation error")
			}
			if !strings.Contains(err.Error(), tc.errorSub) {
				t.Fatalf("unexpected error, got %q want substring %q", err.Error(), tc.errorSub)
			}
		})
	}
}

func TestGetJSONSendsHeadersAndQueryParams(t *testing.T) {
	var (
		gotPath   string
		gotQuery  url.Values
		gotAccept string
		gotUA     string
		gotCustom string
	)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		gotQuery = r.URL.Query()
		gotAccept = r.Header.Get("Accept")
		gotUA = r.Header.Get("User-Agent")
		gotCustom = r.Header.Get("X-Test")

		w.Header().Set("Content-Type", "application/json")
		_, _ = fmt.Fprint(w, `{"status":"ok"}`)
	}))
	defer server.Close()

	client, err := NewClient(testConfig(server.URL))
	if err != nil {
		t.Fatalf("NewClient returned error: %v", err)
	}

	params := url.Values{}
	params.Set("query", "Douglas Adams")
	params.Set("lang", "en")

	var response struct {
		Status string `json:"status"`
	}
	err = client.getJSON(
		context.Background(),
		server.URL+"/search",
		params,
		map[string]string{
			"X-Test":  "enabled",
			"X-Blank": "   ",
		},
		&response,
	)
	if err != nil {
		t.Fatalf("getJSON returned error: %v", err)
	}

	if gotPath != "/search" {
		t.Fatalf("unexpected path: %q", gotPath)
	}
	if gotQuery.Get("query") != "Douglas Adams" {
		t.Fatalf("unexpected query parameter: %q", gotQuery.Get("query"))
	}
	if gotAccept != "application/json" {
		t.Fatalf("unexpected Accept header: %q", gotAccept)
	}
	if gotUA != "wikidata-cli-test/1.0" {
		t.Fatalf("unexpected User-Agent header: %q", gotUA)
	}
	if gotCustom != "enabled" {
		t.Fatalf("unexpected custom header: %q", gotCustom)
	}
	if response.Status != "ok" {
		t.Fatalf("unexpected response payload: %+v", response)
	}
}

func TestGetJSONReturnsHTTPError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusBadGateway)
		_, _ = fmt.Fprint(w, "upstream timeout")
	}))
	defer server.Close()

	client, err := NewClient(testConfig(server.URL))
	if err != nil {
		t.Fatalf("NewClient returned error: %v", err)
	}

	var response map[string]any
	err = client.getJSON(context.Background(), server.URL+"/failing", nil, nil, &response)
	if err == nil {
		t.Fatalf("expected error")
	}

	httpErr := &HTTPError{}
	if !AsHTTPError(err, &httpErr) {
		t.Fatalf("expected HTTPError, got %T", err)
	}
	if httpErr.StatusCode != http.StatusBadGateway {
		t.Fatalf("unexpected status code: %d", httpErr.StatusCode)
	}
	if strings.TrimSpace(httpErr.Body) != "upstream timeout" {
		t.Fatalf("unexpected error body: %q", httpErr.Body)
	}
}

func TestGetJSONReturnsDecodeError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = fmt.Fprint(w, "{invalid")
	}))
	defer server.Close()

	client, err := NewClient(testConfig(server.URL))
	if err != nil {
		t.Fatalf("NewClient returned error: %v", err)
	}

	var response map[string]any
	err = client.getJSON(context.Background(), server.URL+"/invalid", nil, nil, &response)
	if err == nil {
		t.Fatalf("expected decode error")
	}
	if !strings.Contains(err.Error(), "failed to decode response json") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestAsHTTPErrorReturnsFalseForOtherErrors(t *testing.T) {
	var target *HTTPError
	if AsHTTPError(errors.New("boom"), &target) {
		t.Fatalf("expected false for non-http error")
	}
}

func TestClientTimeoutUsesConfiguredValue(t *testing.T) {
	cfg := testConfig("http://example.com")
	cfg.Timeout = 7 * time.Second

	client, err := NewClient(cfg)
	if err != nil {
		t.Fatalf("NewClient returned error: %v", err)
	}

	if got, want := client.Timeout(), 7*time.Second; got != want {
		t.Fatalf("unexpected timeout: got %s want %s", got, want)
	}
}

func testConfig(baseURL string) Config {
	return Config{
		WikidataAPIURL:   strings.TrimSuffix(baseURL, "/") + "/w/api.php",
		WikidataQueryURL: strings.TrimSuffix(baseURL, "/") + "/sparql",
		TextifierURL:     strings.TrimSuffix(baseURL, "/") + "/textify",
		VectorSearchURL:  strings.TrimSuffix(baseURL, "/") + "/vector",
		UserAgent:        "wikidata-cli-test/1.0",
		Timeout:          2 * time.Second,
	}
}
