package cmd

import (
	"encoding/json"
	"fmt"
	"io"
	"strings"
)

func printJSON(w io.Writer, value any) error {
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	return enc.Encode(value)
}

func printText(w io.Writer, text string) error {
	if strings.HasSuffix(text, "\n") {
		_, err := io.WriteString(w, text)
		return err
	}
	_, err := fmt.Fprintln(w, text)
	return err
}
