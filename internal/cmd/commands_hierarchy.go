package cmd

import (
	"encoding/json"

	"github.com/spf13/cobra"
)

func newGetHierarchyCommand(opts *rootOptions) *cobra.Command {
	var maxDepth int
	var lang string

	cmd := &cobra.Command{
		Use:     "get-instance-and-subclass-hierarchy <entity-id>",
		Aliases: []string{"hierarchy"},
		Short:   "Return a hierarchy based on P31 (instance of) and P279 (subclass of)",
		Args:    cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := ensureClient(opts); err != nil {
				return err
			}

			result, err := opts.client.GetInstanceAndSubclassHierarchy(
				cmd.Context(),
				args[0],
				maxDepth,
				lang,
			)
			if err != nil {
				return err
			}

			if opts.JSON {
				return printJSON(opts.stdout, map[string]any{
					"entity_id": args[0],
					"max_depth": maxDepth,
					"lang":      lang,
					"result":    result,
				})
			}

			if result.Message != "" {
				return printText(opts.stdout, result.Message)
			}

			rendered, err := json.MarshalIndent(result.Tree, "", "  ")
			if err != nil {
				return err
			}
			return printText(opts.stdout, string(rendered))
		},
	}

	cmd.Flags().IntVar(&maxDepth, "max-depth", 5, "Maximum hierarchy depth")
	cmd.Flags().StringVar(&lang, "lang", "en", "Language code for labels/descriptions")
	return cmd
}
