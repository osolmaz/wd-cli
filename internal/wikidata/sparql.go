package wikidata

import (
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"net/url"
	"regexp"
	"strconv"
	"strings"
)

var wikidataEntityURIRegex = regexp.MustCompile(`^http://www\.wikidata\.org/entity/([A-Z]\d+)$`)

func (c *Client) ExecuteSPARQL(
	ctx context.Context,
	query string,
	limit int,
) (SPARQLResult, error) {
	query = strings.TrimSpace(query)
	if query == "" {
		return SPARQLResult{}, fmt.Errorf("SPARQL query cannot be empty")
	}
	if limit <= 0 {
		limit = 10
	}

	params := url.Values{}
	params.Set("query", query)
	params.Set("format", "json")

	var response struct {
		Head struct {
			Vars []string `json:"vars"`
		} `json:"head"`
		Results struct {
			Bindings []map[string]struct {
				Type  string `json:"type"`
				Value string `json:"value"`
			} `json:"bindings"`
		} `json:"results"`
	}

	err := c.getJSON(ctx, c.cfg.WikidataQueryURL, params, nil, &response)
	if err != nil {
		httpErr := &HTTPError{}
		if AsHTTPError(err, &httpErr) && httpErr.StatusCode == 400 {
			return SPARQLResult{
				Message: cleanSPARQLErrorMessage(httpErr.Body),
			}, nil
		}
		return SPARQLResult{}, err
	}

	rowLimit := limit
	if len(response.Results.Bindings) < rowLimit {
		rowLimit = len(response.Results.Bindings)
	}

	rows := make([]map[string]string, 0, rowLimit)
	for i := 0; i < rowLimit; i++ {
		binding := response.Results.Bindings[i]
		row := make(map[string]string, len(response.Head.Vars))
		for _, variable := range response.Head.Vars {
			value := binding[variable].Value
			row[variable] = shortenWikidataEntityURI(value)
		}
		rows = append(rows, row)
	}

	csvText, err := toSemicolonCSV(response.Head.Vars, rows)
	if err != nil {
		return SPARQLResult{}, err
	}
	return SPARQLResult{
		Vars: response.Head.Vars,
		Rows: rows,
		CSV:  csvText,
	}, nil
}

func cleanSPARQLErrorMessage(body string) string {
	body = strings.TrimSpace(body)
	if body == "" {
		return "SPARQL query failed"
	}

	lines := strings.Split(body, "\n")
	first := strings.TrimSpace(lines[0])
	if first == "" {
		return "SPARQL query failed"
	}
	parts := strings.Split(first, "\tat ")
	return strings.TrimSpace(parts[0])
}

func shortenWikidataEntityURI(value string) string {
	match := wikidataEntityURIRegex.FindStringSubmatch(value)
	if len(match) == 2 {
		return match[1]
	}
	return value
}

func toSemicolonCSV(vars []string, rows []map[string]string) (string, error) {
	var buffer bytes.Buffer
	writer := csv.NewWriter(&buffer)
	writer.Comma = ';'

	header := append([]string{""}, vars...)
	if err := writer.Write(header); err != nil {
		return "", err
	}

	for index, row := range rows {
		record := make([]string, 0, len(vars)+1)
		record = append(record, strconv.Itoa(index))
		for _, variable := range vars {
			record = append(record, row[variable])
		}
		if err := writer.Write(record); err != nil {
			return "", err
		}
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return "", err
	}
	return buffer.String(), nil
}
