package cmd

import (
	"fmt"
	"io"
	"os"
	"time"

	"github.com/spf13/cobra"

	"github.com/bob/wikidata-cli/internal/wikidata"
)

var (
	version = "0.1.0-dev"
	commit  = ""
	date    = ""
)

type rootOptions struct {
	JSON bool

	Timeout        time.Duration
	UserAgent      string
	WikidataAPIURL string
	WikidataQuery  string
	TextifierURL   string
	VectorURL      string
	VectorSecret   string

	client *wikidata.Client
	stdout io.Writer
}

func Execute(args []string) error {
	cmd := NewRootCommand()
	cmd.SetArgs(args)
	return cmd.Execute()
}

func NewRootCommand() *cobra.Command {
	defaults := wikidata.DefaultConfig()
	opts := &rootOptions{
		Timeout:        defaults.Timeout,
		UserAgent:      defaults.UserAgent,
		WikidataAPIURL: defaults.WikidataAPIURL,
		WikidataQuery:  defaults.WikidataQueryURL,
		TextifierURL:   defaults.TextifierURL,
		VectorURL:      defaults.VectorSearchURL,
		VectorSecret:   defaults.VectorAPISecret,
		stdout:         os.Stdout,
	}

	cmd := &cobra.Command{
		Use:           "wikidata-cli",
		Short:         "Wikidata command-line client with MCP-equivalent tooling",
		SilenceUsage:  true,
		SilenceErrors: true,
		PersistentPreRunE: func(_ *cobra.Command, _ []string) error {
			client, err := wikidata.NewClient(wikidata.Config{
				WikidataAPIURL: defaultsOrValue(opts.WikidataAPIURL, defaults.WikidataAPIURL),
				WikidataQueryURL: defaultsOrValue(
					opts.WikidataQuery,
					defaults.WikidataQueryURL,
				),
				TextifierURL: defaultsOrValue(opts.TextifierURL, defaults.TextifierURL),
				VectorSearchURL: defaultsOrValue(
					opts.VectorURL,
					defaults.VectorSearchURL,
				),
				VectorAPISecret: opts.VectorSecret,
				UserAgent:       defaultsOrValue(opts.UserAgent, defaults.UserAgent),
				Timeout:         opts.Timeout,
			})
			if err != nil {
				return err
			}
			opts.client = client
			return nil
		},
	}

	cmd.PersistentFlags().BoolVar(
		&opts.JSON,
		"json",
		false,
		"Output JSON to stdout",
	)
	cmd.PersistentFlags().DurationVar(
		&opts.Timeout,
		"timeout",
		opts.Timeout,
		"HTTP timeout for outbound requests",
	)
	cmd.PersistentFlags().StringVar(
		&opts.UserAgent,
		"user-agent",
		opts.UserAgent,
		"User-Agent header used for Wikidata services",
	)
	cmd.PersistentFlags().StringVar(
		&opts.WikidataAPIURL,
		"wikidata-api-url",
		opts.WikidataAPIURL,
		"Wikidata API base URL",
	)
	cmd.PersistentFlags().StringVar(
		&opts.WikidataQuery,
		"wikidata-query-url",
		opts.WikidataQuery,
		"Wikidata Query Service URL",
	)
	cmd.PersistentFlags().StringVar(
		&opts.TextifierURL,
		"textifier-url",
		opts.TextifierURL,
		"Wikidata textifier API URL",
	)
	cmd.PersistentFlags().StringVar(
		&opts.VectorURL,
		"vector-search-url",
		opts.VectorURL,
		"Wikidata vector search API URL",
	)
	cmd.PersistentFlags().StringVar(
		&opts.VectorSecret,
		"vector-api-secret",
		opts.VectorSecret,
		"Optional API secret for vector search",
	)

	cmd.AddCommand(
		newSearchItemsCommand(opts),
		newSearchPropertiesCommand(opts),
		newGetStatementsCommand(opts),
		newGetStatementValuesCommand(opts),
		newGetHierarchyCommand(opts),
		newExecuteSPARQLCommand(opts),
		newVersionCommand(opts),
	)

	return cmd
}

func defaultsOrValue(value string, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}

func ensureClient(opts *rootOptions) error {
	if opts.client == nil {
		return fmt.Errorf("wikidata client is not initialized")
	}
	return nil
}
