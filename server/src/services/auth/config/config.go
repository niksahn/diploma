package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                string
	DBHost              string
	DBPort              string
	DBName              string
	DBUser              string
	DBPassword          string
	JWTSecret           string
	JWTAccessExpiration int
	JWTRefreshExpiration int
	BcryptCost          int
}

func Load() (*Config, error) {
	// Загружаем .env файл если он существует (не критично если его нет)
	_ = godotenv.Load()

	accessExp, _ := strconv.Atoi(getEnv("JWT_ACCESS_EXPIRATION", "3600"))
	refreshExp, _ := strconv.Atoi(getEnv("JWT_REFRESH_EXPIRATION", "604800"))
	bcryptCost, _ := strconv.Atoi(getEnv("BCRYPT_COST", "12"))

	return &Config{
		Port:                getEnv("PORT", "8081"),
		DBHost:              getEnv("DB_HOST", "postgres"),
		DBPort:              getEnv("DB_PORT", "5432"),
		DBName:              getEnv("DB_NAME", "messenger_db"),
		DBUser:              getEnv("DB_USER", "user"),
		DBPassword:          getEnv("DB_PASSWORD", "password"),
		JWTSecret:           getEnv("JWT_SECRET", "default_secret_key_minimum_32_characters_long_for_production"),
		JWTAccessExpiration: accessExp,
		JWTRefreshExpiration: refreshExp,
		BcryptCost:          bcryptCost,
	}, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

