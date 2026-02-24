package cmd

import (
	"fmt"
	"os"
	"strings"

	"github.com/spf13/cobra"
)

func newExecuteSPARQLCommand(opts *rootOptions) *cobra.Command {
	var queryFlag string
	var queryFile string
	var limit int

	cmd := &cobra.Command{
		Use:     "execute-sparql [query]",
		Aliases: []string{"sparql"},
		Short:   "Execute SPARQL against Wikidata and return semicolon-separated CSV",
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := ensureClient(opts); err != nil {
				return err
			}

			query, err := resolveSPARQLQuery(args, queryFlag, queryFile)
			if err != nil {
				return err
			}

			result, err := opts.client.ExecuteSPARQL(cmd.Context(), query, limit)
			if err != nil {
				return err
			}

			if opts.JSON {
				return printJSON(opts.stdout, map[string]any{
					"query":  query,
					"limit":  limit,
					"result": result,
				})
			}

			if result.Message != "" {
				return printText(opts.stdout, result.Message)
			}
			return printText(opts.stdout, result.CSV)
		},
	}

	cmd.Flags().StringVarP(
		&queryFlag,
		"query",
		"q",
		"",
		"SPARQL query string (alternative to positional query argument)",
	)
	cmd.Flags().StringVar(
		&queryFile,
		"file",
		"",
		"Path to file containing SPARQL query text",
	)
	cmd.Flags().IntVar(&limit, "k", 10, "Maximum rows to return")
	return cmd
}

func resolveSPARQLQuery(args []string, queryFlag string, queryFile string) (string, error) {
	sourceCount := 0
	var query string

	if len(args) > 1 {
		return "", fmt.Errorf("expected at most one positional query argument")
	}
	if len(args) == 1 && strings.TrimSpace(args[0]) != "" {
		sourceCount++
		query = args[0]
	}
	if strings.TrimSpace(queryFlag) != "" {
		sourceCount++
		query = queryFlag
	}
	if strings.TrimSpace(queryFile) != "" {
		sourceCount++
		content, err := os.ReadFile(queryFile)
		if err != nil {
			return "", fmt.Errorf("failed to read query file: %w", err)
		}
		query = string(content)
	}

	if sourceCount == 0 {
		return "", fmt.Errorf("provide a query as an argument, via --query, or via --file")
	}
	if sourceCount > 1 {
		return "", fmt.Errorf("provide only one query source among positional arg, --query, and --file")
	}
	query = strings.TrimSpace(query)
	if query == "" {
		return "", fmt.Errorf("SPARQL query cannot be empty")
	}
	return query, nil
}
