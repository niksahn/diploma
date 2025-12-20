package config

import (
	"os"
	"strings"

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
	KafkaBrokers []string
}

// Load возвращает конфигурацию, подставляя значения по умолчанию если переменные не заданы.
func Load() (*Config, error) {
	_ = godotenv.Load()

	kafkaBrokersStr := getEnv("KAFKA_BROKERS", "")
	var kafkaBrokers []string
	if kafkaBrokersStr != "" {
		// Разделяем по запятой и убираем пробелы
		parts := strings.Split(kafkaBrokersStr, ",")
		for _, part := range parts {
			trimmed := strings.TrimSpace(part)
			if trimmed != "" {
				kafkaBrokers = append(kafkaBrokers, trimmed)
			}
		}
	}

	return &Config{
		Port:         getEnv("PORT", "8086"),
		DBHost:       getEnv("DB_HOST", "localhost"),
		DBPort:       getEnv("DB_PORT", "5432"),
		DBName:       getEnv("DB_NAME", "messenger_db"),
		DBUser:       getEnv("DB_USER", "user"),
		DBPassword:   getEnv("DB_PASSWORD", "password"),
		KafkaBrokers: kafkaBrokers,
	}, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
