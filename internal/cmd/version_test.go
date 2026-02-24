package cmd

import (
	"bytes"
	"encoding/json"
	"testing"
)

func TestVersionCommandTextOutputWithMetadata(t *testing.T) {
	restoreVersionGlobals(t, " 1.2.3 ", " abc123 ", " 2026-02-24T12:00:00Z ")

	var out bytes.Buffer
	opts := &rootOptions{stdout: &out}
	cmd := newVersionCommand(opts)

	if err := cmd.RunE(cmd, nil); err != nil {
		t.Fatalf("version command failed: %v", err)
	}

	if got, want := out.String(), "1.2.3 (abc123 2026-02-24T12:00:00Z)\n"; got != want {
		t.Fatalf("unexpected version output: got %q, want %q", got, want)
	}
}

func TestVersionCommandTextOutputDefaultsToDev(t *testing.T) {
	restoreVersionGlobals(t, "  ", "", "")

	var out bytes.Buffer
	opts := &rootOptions{stdout: &out}
	cmd := newVersionCommand(opts)

	if err := cmd.RunE(cmd, nil); err != nil {
		t.Fatalf("version command failed: %v", err)
	}

	if got, want := out.String(), "dev\n"; got != want {
		t.Fatalf("unexpected version output: got %q, want %q", got, want)
	}
}

func TestVersionCommandJSONOutput(t *testing.T) {
	restoreVersionGlobals(t, " 2.0.0 ", " 89abcd ", " 2026-02-24T18:11:00Z ")

	var out bytes.Buffer
	opts := &rootOptions{
		JSON:   true,
		stdout: &out,
	}
	cmd := newVersionCommand(opts)

	if err := cmd.RunE(cmd, nil); err != nil {
		t.Fatalf("version command failed: %v", err)
	}

	var payload map[string]string
	if err := json.Unmarshal(out.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode json output: %v", err)
	}

	if payload["version"] != "2.0.0" {
		t.Fatalf("unexpected version field: %q", payload["version"])
	}
	if payload["commit"] != "89abcd" {
		t.Fatalf("unexpected commit field: %q", payload["commit"])
	}
	if payload["date"] != "2026-02-24T18:11:00Z" {
		t.Fatalf("unexpected date field: %q", payload["date"])
	}
}

func restoreVersionGlobals(t *testing.T, v string, c string, d string) {
	t.Helper()

	oldVersion, oldCommit, oldDate := version, commit, date
	version, commit, date = v, c, d
	t.Cleanup(func() {
		version, commit, date = oldVersion, oldCommit, oldDate
	})
}
