package cmd

import "github.com/spf13/cobra"

func newGetStatementsCommand(opts *rootOptions) *cobra.Command {
	var includeExternalIDs bool
	var lang string

	cmd := &cobra.Command{
		Use:     "get-statements <entity-id>",
		Aliases: []string{"statements"},
		Short:   "Return direct Wikidata statements for an entity",
		Args:    cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := ensureClient(opts); err != nil {
				return err
			}
			result, err := opts.client.GetStatements(
				cmd.Context(),
				args[0],
				includeExternalIDs,
				lang,
			)
			if err != nil {
				return err
			}

			if opts.JSON {
				return printJSON(opts.stdout, map[string]any{
					"entity_id":            args[0],
					"include_external_ids": includeExternalIDs,
					"lang":                 lang,
					"result":               result,
				})
			}
			return printText(opts.stdout, result)
		},
	}

	cmd.Flags().BoolVar(
		&includeExternalIDs,
		"include-external-ids",
		false,
		"Include external identifier statements",
	)
	cmd.Flags().StringVar(&lang, "lang", "en", "Language code for labels/descriptions")
	return cmd
}

func newGetStatementValuesCommand(opts *rootOptions) *cobra.Command {
	var lang string

	cmd := &cobra.Command{
		Use:     "get-statement-values <entity-id> <property-id>",
		Aliases: []string{"statement-values", "values"},
		Short:   "Return detailed values, qualifiers, ranks, and references for a statement",
		Args:    cobra.ExactArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := ensureClient(opts); err != nil {
				return err
			}
			result, err := opts.client.GetStatementValues(cmd.Context(), args[0], args[1], lang)
			if err != nil {
				return err
			}

			if opts.JSON {
				return printJSON(opts.stdout, map[string]any{
					"entity_id":   args[0],
					"property_id": args[1],
					"lang":        lang,
					"result":      result,
				})
			}
			return printText(opts.stdout, result)
		},
	}

	cmd.Flags().StringVar(&lang, "lang", "en", "Language code for labels/descriptions")
	return cmd
}
