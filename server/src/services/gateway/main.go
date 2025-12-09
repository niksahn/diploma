package main

import (
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/diploma/gateway-service/config"
	"github.com/diploma/gateway-service/internal/auth"
	"github.com/diploma/gateway-service/internal/handlers"
	"github.com/diploma/gateway-service/internal/proxy"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	log.Printf("Public routes: %v", cfg.PublicRoutes)

	httpClient := auth.NewHTTPClient(cfg.RequestTimeout)

	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(cfg.RequestTimeout))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodOptions},
		AllowedHeaders:   []string{"*", "Authorization", "Content-Type", "Accept", "Origin"},
		ExposedHeaders:   []string{"X-User-ID", "X-User-Roles"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	// Auth middleware: skip auth endpoints, swagger, health.
	validator := auth.NewValidator(httpClient, cfg.AuthServiceURL, cfg.AuthValidateEndpoint)
	r.Use(validator.Middleware(cfg.PublicRoutes))

	// Health
	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"status":"ok","service":"gateway"}`))
	})

	// Passthrough proxies for services (keep original paths).
	mountProxy(r, "/api/v1/auth", cfg.AuthServiceURL)
	mountProxy(r, "/api/v1/users", cfg.UserServiceURL)
	mountProxy(r, "/api/v1/workspaces", cfg.WorkspaceServiceURL)
	mountProxy(r, "/api/v1/chats", cfg.ChatServiceURL)
	mountProxy(r, "/api/v1/tasks", cfg.TaskServiceURL)
	mountProxy(r, "/api/v1/complaints", cfg.ComplaintServiceURL)

	// WebSocket pass-through - direct routing without auth check
	r.Route("/ws", func(r chi.Router) {
		r.Use(middleware.Timeout(30 * time.Second)) // Longer timeout for WebSocket
		r.Handle("/*", proxy.NewReverseProxy(cfg.ChatServiceURL+"/ws", false))
	})

	// Swagger per-service (strip prefix)
	mountStripProxy(r, "/swagger/auth", cfg.AuthServiceURL)
	mountStripProxy(r, "/swagger/user", cfg.UserServiceURL)
	mountStripProxy(r, "/swagger/workspace", cfg.WorkspaceServiceURL)
	mountStripProxy(r, "/swagger/chat", cfg.ChatServiceURL)
	mountStripProxy(r, "/swagger/task", cfg.TaskServiceURL)
	mountStripProxy(r, "/swagger/complaint", cfg.ComplaintServiceURL)
	mountStripProxy(r, "/swagger/ui", cfg.SwaggerUIServiceURL)

	// Aggregation example: profile + workspaces
	agg := &handlers.AggregateHandler{
		Client:           httpClient,
		UserService:      strings.TrimSuffix(cfg.UserServiceURL, "/"),
		WorkspaceService: strings.TrimSuffix(cfg.WorkspaceServiceURL, "/"),
	}
	r.Get("/api/v1/gateway/me", agg.Me)

	addr := ":" + cfg.Port
	log.Printf("Gateway listening on %s", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Printf("gateway stopped: %v", err)
		os.Exit(1)
	}
}

func mountProxy(r chi.Router, prefix string, target string) {
	targetURL := mustParseURL(target)
	handler := proxy.NewReverseProxy(targetURL.String(), false)

	sub := chi.NewRouter()
	sub.Handle("/*", handler)
	sub.Handle("/", handler)

	r.Mount(prefix, sub)
}

func mountStripProxy(r chi.Router, prefix string, target string) {
	targetURL := mustParseURL(target)
	handler := proxy.NewReverseProxy(targetURL.String(), true)
	sub := chi.NewRouter()
	sub.Handle("/*", http.StripPrefix(prefix, handler))
	sub.Handle("/", http.StripPrefix(prefix, handler))
	r.Mount(prefix, sub)
}

func mustParseURL(raw string) *url.URL {
	u, err := url.Parse(raw)
	if err != nil {
		log.Fatalf("invalid url %s: %v", raw, err)
	}
	return u
}
