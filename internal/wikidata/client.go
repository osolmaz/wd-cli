package wikidata

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Client struct {
	cfg        Config
	httpClient *http.Client
}

type HTTPError struct {
	StatusCode int
	Body       string
}

func (e *HTTPError) Error() string {
	body := strings.TrimSpace(e.Body)
	if body == "" {
		return fmt.Sprintf("remote service returned HTTP %d", e.StatusCode)
	}
	return fmt.Sprintf("remote service returned HTTP %d: %s", e.StatusCode, body)
}

func NewClient(cfg Config) (*Client, error) {
	if err := validateConfig(cfg); err != nil {
		return nil, err
	}
	return &Client{
		cfg: cfg,
		httpClient: &http.Client{
			Timeout: cfg.Timeout,
		},
	}, nil
}

func validateConfig(cfg Config) error {
	if _, err := url.ParseRequestURI(cfg.WikidataAPIURL); err != nil {
		return fmt.Errorf("invalid wikidata api url: %w", err)
	}
	if _, err := url.ParseRequestURI(cfg.WikidataQueryURL); err != nil {
		return fmt.Errorf("invalid wikidata query url: %w", err)
	}
	if _, err := url.ParseRequestURI(cfg.TextifierURL); err != nil {
		return fmt.Errorf("invalid textifier url: %w", err)
	}
	if _, err := url.ParseRequestURI(cfg.VectorSearchURL); err != nil {
		return fmt.Errorf("invalid vector search url: %w", err)
	}
	if cfg.Timeout <= 0 {
		return fmt.Errorf("timeout must be greater than zero")
	}
	if strings.TrimSpace(cfg.UserAgent) == "" {
		return fmt.Errorf("user agent cannot be empty")
	}
	return nil
}

func (c *Client) getJSON(
	ctx context.Context,
	endpoint string,
	params url.Values,
	headers map[string]string,
	out any,
) error {
	requestURL := endpoint
	if len(params) > 0 {
		requestURL = endpoint + "?" + params.Encode()
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", c.cfg.UserAgent)
	for key, value := range headers {
		if strings.TrimSpace(value) != "" {
			req.Header.Set(key, value)
		}
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer func() {
		_ = resp.Body.Close()
	}()

	if resp.StatusCode >= http.StatusBadRequest {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<16))
		return &HTTPError{
			StatusCode: resp.StatusCode,
			Body:       string(body),
		}
	}

	if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
		return fmt.Errorf("failed to decode response json: %w", err)
	}
	return nil
}

func (c *Client) Timeout() time.Duration {
	return c.cfg.Timeout
}

func AsHTTPError(err error, target **HTTPError) bool {
	return errors.As(err, target)
}
