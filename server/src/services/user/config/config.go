package config

import (
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port         string
	DBHost       string
	DBPort       string
	DBName       string
	DBUser       string
	DBPassword   string
	KafkaBrokers []string
	SMTPHost     string
	SMTPPort     string
	SMTPUser     string
	SMTPPassword string
	FromEmail    string
}

func Load() (*Config, error) {
	// Загружаем .env файл если он существует (не критично если его нет)
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
		Port:          getEnv("PORT", "8082"),
		DBHost:        getEnv("DB_HOST", "postgres"),
		DBPort:        getEnv("DB_PORT", "5432"),
		DBName:        getEnv("DB_NAME", "messenger_db"),
		DBUser:        getEnv("DB_USER", "user"),
		DBPassword:    getEnv("DB_PASSWORD", "password"),
		KafkaBrokers:  kafkaBrokers,
		SMTPHost:      getEnv("SMTP_HOST", ""),
		SMTPPort:      getEnv("SMTP_PORT", "587"),
		SMTPUser:      getEnv("SMTP_USER", ""),
		SMTPPassword:  getEnv("SMTP_PASSWORD", ""),
		FromEmail:     getEnv("FROM_EMAIL", "noreply@messenger.local"),
	}, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}




















