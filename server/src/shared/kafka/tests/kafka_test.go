package tests

import (
	"context"
	"testing"
	"time"

	"github.com/diploma/shared/kafka"
)

func TestKafkaConnection(t *testing.T) {
	// Пропускаем тест если Kafka не запущен
	t.Skip("Skipping integration test - requires running Kafka")

	cfg := &kafka.Config{
		Brokers: []string{"localhost:9092"},
		ClientID: "test-client",
		TopicComplaints: "test-complaints",
	}

	// Test producer
	producer, err := kafka.NewProducer(cfg)
	if err != nil {
		t.Fatalf("Failed to create producer: %v", err)
	}
	defer producer.Close()

	// Test sending message
	testEvent := kafka.NewComplaintCreatedEvent(
		1, 1, "Test User", "test@example.com",
		"Test complaint", "Test device", time.Now(),
	)

	err = producer.SendComplaintEvent(context.Background(), testEvent)
	if err != nil {
		t.Fatalf("Failed to send event: %v", err)
	}
}

func TestEventCreation(t *testing.T) {
	// Test ComplaintCreatedEvent
	event := kafka.NewComplaintCreatedEvent(
		123, 456, "John Doe", "john@example.com",
		"Application crashes", "Windows 10", time.Now(),
	)

	if event.Type != kafka.EventTypeComplaintCreated {
		t.Errorf("Expected event type %s, got %s", kafka.EventTypeComplaintCreated, event.Type)
	}

	if event.ComplaintID != 123 {
		t.Errorf("Expected complaint ID 123, got %d", event.ComplaintID)
	}

	if event.AuthorName != "John Doe" {
		t.Errorf("Expected author name 'John Doe', got '%s'", event.AuthorName)
	}
}

func TestStatusChangeEvent(t *testing.T) {
	changedBy := 789
	changedByName := "Admin User"
	comment := "Issue resolved"

	event := kafka.NewComplaintStatusChangedEvent(
		123, "pending", "resolved",
		&changedBy, &changedByName, &comment,
		456, "john@example.com",
	)

	if event.Type != kafka.EventTypeComplaintStatusChanged {
		t.Errorf("Expected event type %s, got %s", kafka.EventTypeComplaintStatusChanged, event.Type)
	}

	if event.OldStatus != "pending" || event.NewStatus != "resolved" {
		t.Errorf("Status change incorrect: %s -> %s", event.OldStatus, event.NewStatus)
	}

	if *event.ChangedBy != 789 {
		t.Errorf("Expected changed by 789, got %d", *event.ChangedBy)
	}

	if *event.Comment != "Issue resolved" {
		t.Errorf("Expected comment 'Issue resolved', got '%s'", *event.Comment)
	}
}
