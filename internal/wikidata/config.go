package wikidata

import (
	"os"
	"strconv"
	"strings"
	"time"
)

const (
	defaultWikidataAPIURL   = "https://www.wikidata.org/w/api.php"
	defaultWikidataQueryURL = "https://query.wikidata.org/sparql"
	defaultTextifierURL     = "https://wd-textify.wmcloud.org"
	defaultVectorSearchURL  = "https://wd-vectordb.wmcloud.org"
	defaultTimeout          = 15 * time.Second
	defaultUserAgent        = "wikidata-cli/0.1 (+https://github.com/bob/wikidata-cli)"
)

type Config struct {
	WikidataAPIURL   string
	WikidataQueryURL string
	TextifierURL     string
	VectorSearchURL  string
	VectorAPISecret  string
	UserAgent        string
	Timeout          time.Duration
}

func DefaultConfig() Config {
	timeout := defaultTimeout
	if timeoutValue := strings.TrimSpace(os.Getenv("REQUEST_TIMEOUT_SECONDS")); timeoutValue != "" {
		if parsed, err := strconv.ParseFloat(timeoutValue, 64); err == nil && parsed > 0 {
			timeout = time.Duration(parsed * float64(time.Second))
		}
	}

	userAgent := strings.TrimSpace(os.Getenv("USER_AGENT"))
	if userAgent == "" {
		userAgent = defaultUserAgent
	}

	textifierURL := firstNonEmpty(
		strings.TrimSpace(os.Getenv("TEXTIFER_URI")),
		strings.TrimSpace(os.Getenv("TEXTIFIER_URI")),
		defaultTextifierURL,
	)

	return Config{
		WikidataAPIURL: firstNonEmpty(
			strings.TrimSpace(os.Getenv("WD_API_URI")),
			defaultWikidataAPIURL,
		),
		WikidataQueryURL: firstNonEmpty(
			strings.TrimSpace(os.Getenv("WD_QUERY_URI")),
			defaultWikidataQueryURL,
		),
		TextifierURL: textifierURL,
		VectorSearchURL: firstNonEmpty(
			strings.TrimSpace(os.Getenv("VECTOR_SEARCH_URI")),
			defaultVectorSearchURL,
		),
		VectorAPISecret: strings.TrimSpace(os.Getenv("WD_VECTORDB_API_SECRET")),
		UserAgent:       userAgent,
		Timeout:         timeout,
	}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}
