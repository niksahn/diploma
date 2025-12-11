package kafka

import (
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// Config содержит настройки подключения к Kafka
type Config struct {
	Brokers           []string
	ClientID          string
	TopicComplaints   string
	TopicNotifications string
	TopicAnalytics    string

	// Producer настройки
	ProducerMaxRetries    int
	ProducerRetryBackoff  time.Duration
	ProducerFlushTimeout  time.Duration

	// Consumer настройки
	ConsumerGroupID       string
	ConsumerSessionTimeout time.Duration
	ConsumerHeartbeatInterval time.Duration
	ConsumerMaxProcessingTime time.Duration
}

// Load загружает конфигурацию из переменных окружения
func Load() *Config {
	_ = godotenv.Load()

	return &Config{
		Brokers:           getBrokers(),
		ClientID:          getEnv("KAFKA_CLIENT_ID", "messenger-service"),
		TopicComplaints:   getEnv("KAFKA_TOPIC_COMPLAINTS", "complaint-events"),
		TopicNotifications: getEnv("KAFKA_TOPIC_NOTIFICATIONS", "complaint-notifications"),
		TopicAnalytics:    getEnv("KAFKA_TOPIC_ANALYTICS", "complaint-analytics"),

		ProducerMaxRetries:   getEnvInt("KAFKA_PRODUCER_MAX_RETRIES", 3),
		ProducerRetryBackoff: getEnvDuration("KAFKA_PRODUCER_RETRY_BACKOFF", "100ms"),
		ProducerFlushTimeout: getEnvDuration("KAFKA_PRODUCER_FLUSH_TIMEOUT", "10s"),

		ConsumerGroupID:       getEnv("KAFKA_CONSUMER_GROUP_ID", "messenger-group"),
		ConsumerSessionTimeout: getEnvDuration("KAFKA_CONSUMER_SESSION_TIMEOUT", "10s"),
		ConsumerHeartbeatInterval: getEnvDuration("KAFKA_CONSUMER_HEARTBEAT_INTERVAL", "3s"),
		ConsumerMaxProcessingTime: getEnvDuration("KAFKA_CONSUMER_MAX_PROCESSING_TIME", "300s"),
	}
}

func getBrokers() []string {
	brokersStr := getEnv("KAFKA_BROKERS", "localhost:9092")
	return strings.Split(brokersStr, ",")
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}

func getEnvDuration(key string, defaultValue string) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	if duration, err := time.ParseDuration(defaultValue); err == nil {
		return duration
	}
	return time.Second
}
