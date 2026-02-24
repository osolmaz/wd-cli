package cmd

import (
	"context"
	"fmt"
	"strings"

	"github.com/spf13/cobra"

	"github.com/bob/wikidata-cli/internal/wikidata"
)

func newSearchItemsCommand(opts *rootOptions) *cobra.Command {
	var lang string
	var limit int
	var noVector bool

	cmd := &cobra.Command{
		Use:     "search-items <query>",
		Aliases: []string{"si"},
		Short:   "Search Wikidata items (QIDs)",
		Args:    cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runSearchCommand(
				cmd.Context(),
				opts,
				args[0],
				lang,
				limit,
				noVector,
				"item",
				opts.client.SearchItems,
			)
		},
	}
	cmd.Flags().StringVar(&lang, "lang", "en", "Language code for labels/descriptions")
	cmd.Flags().IntVar(&limit, "limit", 10, "Maximum search results")
	cmd.Flags().BoolVar(&noVector, "no-vector", false, "Disable vector search and use keyword search only")
	return cmd
}

func newSearchPropertiesCommand(opts *rootOptions) *cobra.Command {
	var lang string
	var limit int
	var noVector bool

	cmd := &cobra.Command{
		Use:     "search-properties <query>",
		Aliases: []string{"sp"},
		Short:   "Search Wikidata properties (PIDs)",
		Args:    cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runSearchCommand(
				cmd.Context(),
				opts,
				args[0],
				lang,
				limit,
				noVector,
				"property",
				opts.client.SearchProperties,
			)
		},
	}
	cmd.Flags().StringVar(&lang, "lang", "en", "Language code for labels/descriptions")
	cmd.Flags().IntVar(&limit, "limit", 10, "Maximum search results")
	cmd.Flags().BoolVar(&noVector, "no-vector", false, "Disable vector search and use keyword search only")
	return cmd
}

type searchFunc func(
	ctx context.Context,
	query string,
	lang string,
	limit int,
	disableVector bool,
) (wikidata.SearchResponse, error)

func runSearchCommand(
	ctx context.Context,
	opts *rootOptions,
	query string,
	lang string,
	limit int,
	noVector bool,
	entityType string,
	search searchFunc,
) error {
	if err := ensureClient(opts); err != nil {
		return err
	}

	result, err := search(ctx, query, lang, limit, noVector)
	if err != nil {
		return err
	}

	if opts.JSON {
		payload := map[string]any{
			"query":   query,
			"lang":    lang,
			"limit":   limit,
			"source":  result.Source,
			"results": result.Results,
		}
		if len(result.Results) == 0 {
			payload["message"] = fmt.Sprintf("No matching Wikidata %ss found.", entityType)
		}
		return printJSON(opts.stdout, payload)
	}

	if len(result.Results) == 0 {
		return printText(opts.stdout, fmt.Sprintf("No matching Wikidata %ss found.", entityType))
	}

	lines := make([]string, 0, len(result.Results))
	for _, item := range result.Results {
		label := strings.TrimSpace(item.Label)
		description := strings.TrimSpace(item.Description)
		if label == "" && description == "" {
			lines = append(lines, item.ID)
			continue
		}
		lines = append(lines, fmt.Sprintf("%s: %s — %s", item.ID, label, description))
	}
	return printText(opts.stdout, strings.Join(lines, "\n"))
}
