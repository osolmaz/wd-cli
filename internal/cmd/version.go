package cmd

import (
	"fmt"
	"strings"

	"github.com/spf13/cobra"
)

func newVersionCommand(opts *rootOptions) *cobra.Command {
	return &cobra.Command{
		Use:   "version",
		Short: "Print build version",
		RunE: func(_ *cobra.Command, _ []string) error {
			if opts.JSON {
				return printJSON(opts.stdout, map[string]string{
					"version": strings.TrimSpace(version),
					"commit":  strings.TrimSpace(commit),
					"date":    strings.TrimSpace(date),
				})
			}
			ver := strings.TrimSpace(version)
			if ver == "" {
				ver = "dev"
			}
			if strings.TrimSpace(commit) != "" || strings.TrimSpace(date) != "" {
				ver = fmt.Sprintf(
					"%s (%s %s)",
					ver,
					strings.TrimSpace(commit),
					strings.TrimSpace(date),
				)
			}
			return printText(opts.stdout, ver)
		},
	}
}
