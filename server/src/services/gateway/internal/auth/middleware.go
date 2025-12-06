package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type Validator struct {
	client   *http.Client
	baseURL  string
	endpoint string
}

type validateResponse struct {
	Valid     bool    `json:"valid"`
	UserID    *int    `json:"user_id"`
	Role      string  `json:"role"`
	ExpiresAt *string `json:"expires_at"`
	Error     string  `json:"error"`
}

func NewValidator(client *http.Client, authBaseURL, endpoint string) *Validator {
	return &Validator{
		client:   client,
		baseURL:  strings.TrimSuffix(authBaseURL, "/"),
		endpoint: endpoint,
	}
}

func (v *Validator) Middleware(skipPaths []string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Always allow preflight to continue without auth
			if r.Method == http.MethodOptions {
				next.ServeHTTP(w, r)
				return
			}

			if isSkipped(r.URL.Path, skipPaths) {
				next.ServeHTTP(w, r)
				return
			}

			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, "missing Authorization header", http.StatusUnauthorized)
				return
			}

			userID, roles, err := v.validateToken(r.Context(), authHeader)
			if err != nil {
				http.Error(w, err.Error(), http.StatusUnauthorized)
				return
			}

			// propagate identity downstream
			r.Header.Set("X-User-ID", userID)
			r.Header.Set("X-User-Roles", roles)

			next.ServeHTTP(w, r)
		})
	}
}

func (v *Validator) validateToken(ctx context.Context, authHeader string) (userID string, role string, err error) {
	body := bytes.NewBuffer(nil)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, v.baseURL+v.endpoint, body)
	if err != nil {
		return "", "", err
	}

	req.Header.Set("Authorization", authHeader)

	resp, err := v.client.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return "", "", fmt.Errorf("token validation failed: %s", strings.TrimSpace(string(raw)))
	}

	var parsed validateResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return "", "", err
	}
	if !parsed.Valid || parsed.UserID == nil {
		return "", "", errors.New("token is not valid")
	}

	return fmt.Sprintf("%d", *parsed.UserID), parsed.Role, nil
}

func isSkipped(path string, skips []string) bool {
	for _, p := range skips {
		if strings.HasPrefix(path, p) {
			return true
		}
	}
	return false
}

// NewHTTPClient returns http client with sane defaults for gateway calls.
func NewHTTPClient(timeout time.Duration) *http.Client {
	return &http.Client{
		Timeout: timeout,
	}
}
