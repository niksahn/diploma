package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port           string
	DBHost         string
	DBPort         string
	DBName         string
	DBUser         string
	DBPassword     string
	AuthServiceURL string
	UserServiceURL string
}

func Load() (*Config, error) {
	// Загружаем .env файл если он существует (не критично если его нет)
	_ = godotenv.Load()

	return &Config{
		Port:           getEnv("PORT", "8083"),
		DBHost:         getEnv("DB_HOST", "postgres"),
		DBPort:         getEnv("DB_PORT", "5432"),
		DBName:         getEnv("DB_NAME", "messenger_db"),
		DBUser:         getEnv("DB_USER", "user"),
		DBPassword:     getEnv("DB_PASSWORD", "password"),
		AuthServiceURL: getEnv("AUTH_SERVICE_URL", "http://localhost:8081"),
		UserServiceURL: getEnv("USER_SERVICE_URL", "http://localhost:8082"),
	}, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
