GO ?= go
BIN_DIR ?= bin
BINARY ?= wikidata-cli
PKG ?= github.com/bob/wikidata-cli/internal/cmd

VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo 0.1.0-dev)
COMMIT ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo unknown)
DATE ?= $(shell date -u +%Y-%m-%dT%H:%M:%SZ)
LDFLAGS ?= -X '$(PKG).version=$(VERSION)' -X '$(PKG).commit=$(COMMIT)' -X '$(PKG).date=$(DATE)'

.PHONY: build release test test-race coverage vet lint fmt tidy run ci clean

build:
	mkdir -p $(BIN_DIR)
	$(GO) build -o $(BIN_DIR)/$(BINARY) ./cmd/wikidata-cli

release:
	mkdir -p $(BIN_DIR)
	CGO_ENABLED=0 $(GO) build -trimpath -ldflags "$(LDFLAGS)" -o $(BIN_DIR)/$(BINARY) ./cmd/wikidata-cli

test:
	$(GO) test ./...

test-race:
	$(GO) test -race ./...

coverage:
	$(GO) test -covermode=atomic -coverprofile=coverage.out ./...
	$(GO) tool cover -func=coverage.out

vet:
	$(GO) vet ./...

lint:
	test -z "$$(gofmt -l $$(find . -type f -name '*.go' -not -path './vendor/*'))"

fmt:
	$(GO) fmt ./...

tidy:
	$(GO) mod tidy

run:
	$(GO) run ./cmd/wikidata-cli --help

ci: lint vet test-race coverage release

clean:
	rm -f coverage.out
	rm -f $(BIN_DIR)/$(BINARY)
