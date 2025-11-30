package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                  string
	DBHost                string
	DBPort                string
	DBName                string
	DBUser                string
	DBPassword            string
	AuthServiceURL        string
	UserServiceURL        string
	WorkspaceServiceURL   string
	WebSocketEnabled      bool
	WebSocketPingInterval int
}

func Load() (*Config, error) {
	// Загружаем .env файл если он существует (не критично если его нет)
	_ = godotenv.Load()

	websocketEnabled := getEnv("WEBSOCKET_ENABLED", "true") == "true"
	pingInterval := 30
	if intervalStr := getEnv("WEBSOCKET_PING_INTERVAL", "30"); intervalStr != "" {
		if interval, err := parseInt(intervalStr); err == nil {
			pingInterval = interval
		}
	}

	return &Config{
		Port:                  getEnv("PORT", "8084"),
		DBHost:                getEnv("DB_HOST", "postgres"),
		DBPort:                getEnv("DB_PORT", "5432"),
		DBName:                getEnv("DB_NAME", "messenger_db"),
		DBUser:                getEnv("DB_USER", "user"),
		DBPassword:            getEnv("DB_PASSWORD", "password"),
		AuthServiceURL:        getEnv("AUTH_SERVICE_URL", "http://localhost:8081"),
		UserServiceURL:        getEnv("USER_SERVICE_URL", "http://localhost:8082"),
		WorkspaceServiceURL:   getEnv("WORKSPACE_SERVICE_URL", "http://localhost:8083"),
		WebSocketEnabled:      websocketEnabled,
		WebSocketPingInterval: pingInterval,
	}, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func parseInt(s string) (int, error) {
	return strconv.Atoi(s)
}
