package config

import (
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                 string
	AuthServiceURL       string
	UserServiceURL       string
	WorkspaceServiceURL  string
	ChatServiceURL       string
	TaskServiceURL       string
	ComplaintServiceURL  string
	SwaggerUIServiceURL  string
	RequestTimeout       time.Duration
	AuthValidateEndpoint string
	PublicRoutes         []string
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	return &Config{
		Port:                 getenv("PORT", "8080"),
		AuthServiceURL:       getenv("AUTH_SERVICE_URL", "http://auth-service:8081"),
		UserServiceURL:       getenv("USER_SERVICE_URL", "http://user-service:8082"),
		WorkspaceServiceURL:  getenv("WORKSPACE_SERVICE_URL", "http://workspace-service:8083"),
		ChatServiceURL:       getenv("CHAT_SERVICE_URL", "http://chat-service:8084"),
		TaskServiceURL:       getenv("TASK_SERVICE_URL", "http://task-service:8085"),
		ComplaintServiceURL:  getenv("COMPLAINT_SERVICE_URL", "http://complaint-service:8086"),
		SwaggerUIServiceURL:  getenv("SWAGGER_UI_SERVICE_URL", "http://swagger-ui:8080"),
		RequestTimeout:       durationEnv("REQUEST_TIMEOUT", 10*time.Second),
		AuthValidateEndpoint: getenv("AUTH_VALIDATE_ENDPOINT", "/api/v1/auth/validate"),
		PublicRoutes:         listEnv("PUBLIC_ROUTES", "/health,/api/v1/auth,/api/v1/auth/admin/login,/api/v1/auth/admin/register,/swagger,/ws"),
	}, nil
}

func getenv(key, def string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return def
}

func durationEnv(key string, def time.Duration) time.Duration {
	if val := os.Getenv(key); val != "" {
		if d, err := time.ParseDuration(val); err == nil {
			return d
		}
	}
	return def
}

func listEnv(key, def string) []string {
	raw := getenv(key, def)
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if v := strings.TrimSpace(p); v != "" {
			out = append(out, v)
		}
	}
	return out
}
