package config

import (
	"os"

	"github.com/joho/godotenv"
)

// Config описывает переменные окружения complaint-service.
type Config struct {
	Port       string
	DBHost     string
	DBPort     string
	DBName     string
	DBUser     string
	DBPassword string
}

// Load возвращает конфигурацию, подставляя значения по умолчанию если переменные не заданы.
func Load() (*Config, error) {
	_ = godotenv.Load()

	return &Config{
		Port:       getEnv("PORT", "8086"),
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBName:     getEnv("DB_NAME", "messenger_db"),
		DBUser:     getEnv("DB_USER", "user"),
		DBPassword: getEnv("DB_PASSWORD", "password"),
	}, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
