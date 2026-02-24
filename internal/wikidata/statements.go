package wikidata

import (
	"context"
	"fmt"
	"net/url"
	"strconv"
	"strings"
)

func (c *Client) GetStatements(
	ctx context.Context,
	entityID string,
	includeExternalIDs bool,
	lang string,
) (string, error) {
	entityID = strings.TrimSpace(entityID)
	if entityID == "" {
		return "", fmt.Errorf("entity ID cannot be empty")
	}
	if strings.TrimSpace(lang) == "" {
		lang = "en"
	}

	params := url.Values{}
	params.Set("id", entityID)
	params.Set("external_ids", strconv.FormatBool(includeExternalIDs))
	params.Set("all_ranks", "false")
	params.Set("qualifiers", "false")
	params.Set("lang", lang)
	params.Set("format", "triplet")

	var response map[string]string
	if err := c.getJSON(ctx, c.cfg.TextifierURL, params, nil, &response); err != nil {
		return "", err
	}

	text := strings.TrimSpace(response[entityID])
	if text == "" {
		return fmt.Sprintf("Entity %s not found", entityID), nil
	}
	return text, nil
}

func (c *Client) GetStatementValues(
	ctx context.Context,
	entityID string,
	propertyID string,
	lang string,
) (string, error) {
	entityID = strings.TrimSpace(entityID)
	propertyID = strings.TrimSpace(propertyID)
	if entityID == "" {
		return "", fmt.Errorf("entity ID cannot be empty")
	}
	if propertyID == "" {
		return "", fmt.Errorf("property ID cannot be empty")
	}
	if strings.TrimSpace(lang) == "" {
		lang = "en"
	}

	result, err := c.getTripletValues(ctx, []string{entityID}, []string{propertyID}, textifierOptions{
		ExternalIDs: true,
		References:  true,
		AllRanks:    true,
		Qualifiers:  true,
		Lang:        lang,
	})
	if err != nil {
		return "", err
	}

	entity, ok := result[entityID]
	if !ok {
		return fmt.Sprintf("Entity %s not found", entityID), nil
	}

	text := TripletValuesToString(entityID, propertyID, entity)
	if strings.TrimSpace(text) == "" {
		return fmt.Sprintf("No statement found for %s with property %s", entityID, propertyID), nil
	}
	return text, nil
}

type textifierOptions struct {
	ExternalIDs bool
	AllRanks    bool
	References  bool
	Qualifiers  bool
	Lang        string
}

func (c *Client) getTripletValues(
	ctx context.Context,
	ids []string,
	properties []string,
	opts textifierOptions,
) (map[string]textifierEntity, error) {
	if len(ids) == 0 {
		return map[string]textifierEntity{}, nil
	}

	params := url.Values{}
	params.Set("id", strings.Join(ids, ","))
	params.Set("external_ids", strconv.FormatBool(opts.ExternalIDs))
	params.Set("all_ranks", strconv.FormatBool(opts.AllRanks))
	params.Set("references", strconv.FormatBool(opts.References))
	params.Set("qualifiers", strconv.FormatBool(opts.Qualifiers))
	params.Set("lang", firstNonEmpty(opts.Lang, "en"))
	params.Set("format", "json")
	if len(properties) > 0 {
		params.Set("pid", strings.Join(properties, ","))
	}

	var response map[string]textifierEntity
	if err := c.getJSON(ctx, c.cfg.TextifierURL, params, nil, &response); err != nil {
		return nil, err
	}
	return response, nil
}
