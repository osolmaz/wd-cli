GO ?= go
BIN_DIR ?= bin
BINARY ?= wikidata-cli

.PHONY: build test fmt tidy run

build:
	mkdir -p $(BIN_DIR)
	$(GO) build -o $(BIN_DIR)/$(BINARY) ./cmd/wikidata-cli

test:
	$(GO) test ./...

fmt:
	$(GO) fmt ./...

tidy:
	$(GO) mod tidy

run:
	$(GO) run ./cmd/wikidata-cli --help

