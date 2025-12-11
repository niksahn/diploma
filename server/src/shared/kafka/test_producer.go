package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/diploma/shared/kafka"
)

func main() {
	// Загружаем конфигурацию
	cfg := kafka.Load()
	fmt.Printf("Kafka config loaded: Brokers=%v, Topics: %s, %s, %s\n",
		cfg.Brokers, cfg.TopicComplaints, cfg.TopicNotifications, cfg.TopicAnalytics)

	// Создаем producer
	producer, err := kafka.NewProducer(cfg)
	if err != nil {
		log.Fatalf("Failed to create producer: %v", err)
	}
	defer producer.Close()

	// Создаем тестовое событие
	event := kafka.NewComplaintCreatedEvent(
		1, 1, "Test User", "test@example.com",
		"Test complaint message", "Test Device", time.Now(),
	)

	// Отправляем событие
	fmt.Println("Sending test event...")
	err = producer.SendComplaintEvent(context.Background(), event)
	if err != nil {
		log.Fatalf("Failed to send event: %v", err)
	}

	fmt.Println("Event sent successfully!")

	// Отправляем еще одно событие изменения статуса
	statusEvent := kafka.NewComplaintStatusChangedEvent(
		1, "pending", "in_progress",
		nil, nil, nil,
		1, "test@example.com",
	)

	fmt.Println("Sending status change event...")
	err = producer.SendComplaintEvent(context.Background(), statusEvent)
	if err != nil {
		log.Fatalf("Failed to send status event: %v", err)
	}

	fmt.Println("Status change event sent successfully!")
	fmt.Println("Check Kafka UI at http://localhost:8087 to see messages")
}
