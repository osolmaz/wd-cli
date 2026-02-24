package wikidata

import (
	"context"
	"fmt"
	"net/url"
	"strconv"
	"strings"
)

type searchType string

const (
	searchTypeItem     searchType = "item"
	searchTypeProperty searchType = "property"
)

type apiLangValue struct {
	Value string `json:"value"`
}

func (c *Client) SearchItems(
	ctx context.Context,
	query string,
	lang string,
	limit int,
	disableVector bool,
) (SearchResponse, error) {
	return c.search(ctx, query, lang, limit, searchTypeItem, disableVector)
}

func (c *Client) SearchProperties(
	ctx context.Context,
	query string,
	lang string,
	limit int,
	disableVector bool,
) (SearchResponse, error) {
	return c.search(ctx, query, lang, limit, searchTypeProperty, disableVector)
}

func (c *Client) search(
	ctx context.Context,
	query string,
	lang string,
	limit int,
	kind searchType,
	disableVector bool,
) (SearchResponse, error) {
	query = strings.TrimSpace(query)
	if query == "" {
		return SearchResponse{}, fmt.Errorf("query cannot be empty")
	}
	if lang == "" {
		lang = "en"
	}
	if limit <= 0 {
		limit = 10
	}

	if !disableVector {
		vectorResults, vectorErr := c.vectorSearch(ctx, query, lang, limit, kind)
		if vectorErr == nil && len(vectorResults) > 0 {
			return SearchResponse{
				Source:  SearchSourceVector,
				Results: vectorResults,
			}, nil
		}
	}

	keywordResults, err := c.keywordSearch(ctx, query, lang, limit, kind)
	if err != nil {
		return SearchResponse{}, err
	}
	return SearchResponse{
		Source:  SearchSourceKeyword,
		Results: keywordResults,
	}, nil
}

func (c *Client) vectorSearch(
	ctx context.Context,
	query string,
	lang string,
	limit int,
	kind searchType,
) ([]SearchResult, error) {
	params := url.Values{}
	params.Set("query", query)
	params.Set("k", strconv.Itoa(limit))

	headers := map[string]string{}
	if c.cfg.VectorAPISecret != "" {
		headers["x-api-secret"] = c.cfg.VectorAPISecret
	}

	type vectorCandidate struct {
		QID string `json:"QID"`
		PID string `json:"PID"`
	}

	var response []vectorCandidate
	endpoint := strings.TrimSuffix(c.cfg.VectorSearchURL, "/") + "/" + string(kind) + "/query/"
	if err := c.getJSON(ctx, endpoint, params, headers, &response); err != nil {
		return nil, err
	}

	ids := make([]string, 0, len(response))
	seen := map[string]struct{}{}
	for _, candidate := range response {
		var id string
		if kind == searchTypeItem {
			id = strings.TrimSpace(candidate.QID)
		} else {
			id = strings.TrimSpace(candidate.PID)
		}
		if id == "" {
			continue
		}
		if _, exists := seen[id]; exists {
			continue
		}
		seen[id] = struct{}{}
		ids = append(ids, id)
	}
	if len(ids) == 0 {
		return nil, nil
	}

	metadata, err := c.getEntitiesLabelsAndDescriptions(ctx, ids, lang)
	if err != nil {
		return nil, err
	}

	results := make([]SearchResult, 0, len(ids))
	for _, id := range ids {
		meta := metadata[id]
		results = append(results, SearchResult{
			ID:          id,
			Label:       meta.Label,
			Description: meta.Description,
		})
	}
	if len(results) > limit {
		results = results[:limit]
	}
	return results, nil
}

func (c *Client) keywordSearch(
	ctx context.Context,
	query string,
	lang string,
	limit int,
	kind searchType,
) ([]SearchResult, error) {
	params := url.Values{}
	params.Set("action", "wbsearchentities")
	params.Set("type", string(kind))
	params.Set("search", query)
	params.Set("limit", strconv.Itoa(limit))
	params.Set("language", lang)
	params.Set("format", "json")
	params.Set("origin", "*")

	var response struct {
		Search []struct {
			ID          string `json:"id"`
			Label       string `json:"label"`
			Description string `json:"description"`
			Display     struct {
				Label struct {
					Value string `json:"value"`
				} `json:"label"`
				Description struct {
					Value string `json:"value"`
				} `json:"description"`
			} `json:"display"`
		} `json:"search"`
	}
	if err := c.getJSON(ctx, c.cfg.WikidataAPIURL, params, nil, &response); err != nil {
		return nil, err
	}

	results := make([]SearchResult, 0, len(response.Search))
	for _, candidate := range response.Search {
		label := firstNonEmpty(candidate.Display.Label.Value, candidate.Label)
		description := firstNonEmpty(candidate.Display.Description.Value, candidate.Description)
		results = append(results, SearchResult{
			ID:          candidate.ID,
			Label:       label,
			Description: description,
		})
	}
	return results, nil
}

type entityMetadata struct {
	Label       string
	Description string
}

func (c *Client) getEntitiesLabelsAndDescriptions(
	ctx context.Context,
	ids []string,
	lang string,
) (map[string]entityMetadata, error) {
	if len(ids) == 0 {
		return map[string]entityMetadata{}, nil
	}

	result := make(map[string]entityMetadata, len(ids))
	for start := 0; start < len(ids); start += 50 {
		end := start + 50
		if end > len(ids) {
			end = len(ids)
		}
		chunk := ids[start:end]

		params := url.Values{}
		params.Set("action", "wbgetentities")
		params.Set("ids", strings.Join(chunk, "|"))
		params.Set("languages", strings.Join([]string{lang, "mul", "en"}, "|"))
		params.Set("props", "labels|descriptions")
		params.Set("format", "json")
		params.Set("origin", "*")

		var response struct {
			Entities map[string]struct {
				Labels       map[string]apiLangValue `json:"labels"`
				Descriptions map[string]apiLangValue `json:"descriptions"`
			} `json:"entities"`
		}

		if err := c.getJSON(ctx, c.cfg.WikidataAPIURL, params, nil, &response); err != nil {
			return nil, err
		}

		for id, entity := range response.Entities {
			result[id] = entityMetadata{
				Label:       pickLangValue(entity.Labels, lang),
				Description: pickLangValue(entity.Descriptions, lang),
			}
		}
	}
	return result, nil
}

func pickLangValue(values map[string]apiLangValue, lang string) string {
	if value := strings.TrimSpace(values[lang].Value); value != "" {
		return value
	}
	if value := strings.TrimSpace(values["mul"].Value); value != "" {
		return value
	}
	return strings.TrimSpace(values["en"].Value)
}
