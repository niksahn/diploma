package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type AggregateHandler struct {
	Client           *http.Client
	UserService      string
	WorkspaceService string
}

type userMeResponse struct {
	ID      int    `json:"id"`
	Login   string `json:"login"`
	Name    string `json:"name"`
	Surname string `json:"surname"`
	Status  int    `json:"status"`
}

type workspacesResponse struct {
	Workspaces []map[string]any `json:"workspaces"`
}

type aggregatedProfile struct {
	User       *userMeResponse  `json:"user"`
	Workspaces []map[string]any `json:"workspaces,omitempty"`
}

// Me returns current user profile + workspaces (fan-out example).
// Designed to be replaced by generated OpenAPI clients later.
func (h *AggregateHandler) Me(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		http.Error(w, "missing Authorization header", http.StatusUnauthorized)
		return
	}

	user, err := h.fetchUser(ctx, authHeader)
	if err != nil {
		http.Error(w, fmt.Sprintf("user fetch failed: %v", err), http.StatusBadGateway)
		return
	}

	workspaces, err := h.fetchWorkspaces(ctx, authHeader)
	if err != nil {
		http.Error(w, fmt.Sprintf("workspaces fetch failed: %v", err), http.StatusBadGateway)
		return
	}

	resp := aggregatedProfile{
		User:       user,
		Workspaces: workspaces,
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

func (h *AggregateHandler) fetchUser(ctx context.Context, authHeader string) (*userMeResponse, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, h.UserService+"/api/v1/users/me", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", authHeader)

	res, err := h.Client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("status %s", res.Status)
	}

	var parsed userMeResponse
	if err := json.NewDecoder(res.Body).Decode(&parsed); err != nil {
		return nil, err
	}
	return &parsed, nil
}

func (h *AggregateHandler) fetchWorkspaces(ctx context.Context, authHeader string) ([]map[string]any, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, h.WorkspaceService+"/api/v1/workspaces", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", authHeader)

	res, err := h.Client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("status %s", res.Status)
	}

	var parsed workspacesResponse
	if err := json.NewDecoder(res.Body).Decode(&parsed); err != nil {
		return nil, err
	}
	return parsed.Workspaces, nil
}
