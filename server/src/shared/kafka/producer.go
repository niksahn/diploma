package kafka

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/Shopify/sarama"
)

// Producer обертка для отправки сообщений в Kafka
type Producer struct {
	producer sarama.SyncProducer
	config   *Config
}

// NewProducer создает новый Producer
func NewProducer(cfg *Config) (*Producer, error) {
	config := sarama.NewConfig()
	config.Producer.RequiredAcks = sarama.WaitForAll
	config.Producer.Retry.Max = cfg.ProducerMaxRetries
	config.Producer.Retry.Backoff = cfg.ProducerRetryBackoff
	config.Producer.Return.Successes = true
	config.ClientID = cfg.ClientID

	producer, err := sarama.NewSyncProducer(cfg.Brokers, config)
	if err != nil {
		return nil, err
	}

	return &Producer{
		producer: producer,
		config:   cfg,
	}, nil
}

// SendComplaintEvent отправляет событие жалобы в соответствующий топик
func (p *Producer) SendComplaintEvent(ctx context.Context, event ComplaintEvent) error {
	var topic string

	switch event.GetType() {
	case EventTypeComplaintCreated, EventTypeComplaintStatusChanged:
		topic = p.config.TopicComplaints
	default:
		log.Printf("Unknown event type: %s", event.GetType())
		return nil
	}

	return p.sendEvent(ctx, topic, event)
}

// SendNotificationEvent отправляет событие уведомления
func (p *Producer) SendNotificationEvent(ctx context.Context, event interface{}) error {
	return p.sendEvent(ctx, p.config.TopicNotifications, event)
}

// SendAnalyticsEvent отправляет событие аналитики
func (p *Producer) SendAnalyticsEvent(ctx context.Context, event interface{}) error {
	return p.sendEvent(ctx, p.config.TopicAnalytics, event)
}

// sendEvent отправляет событие в указанный топик
func (p *Producer) sendEvent(ctx context.Context, topic string, event interface{}) error {
	eventBytes, err := json.Marshal(event)
	if err != nil {
		return err
	}

	msg := &sarama.ProducerMessage{
		Topic:     topic,
		Value:     sarama.ByteEncoder(eventBytes),
		Timestamp: time.Now(),
	}

	partition, offset, err := p.producer.SendMessage(msg)
	if err != nil {
		log.Printf("Failed to send message to topic %s: %v", topic, err)
		return err
	}

	log.Printf("Message sent to topic %s, partition %d, offset %d", topic, partition, offset)
	return nil
}

// SendMessage отправляет произвольное сообщение в топик
func (p *Producer) SendMessage(ctx context.Context, topic, key string, value interface{}) error {
	valueBytes, err := json.Marshal(value)
	if err != nil {
		return err
	}

	msg := &sarama.ProducerMessage{
		Topic:     topic,
		Key:       sarama.StringEncoder(key),
		Value:     sarama.ByteEncoder(valueBytes),
		Timestamp: time.Now(),
	}

	_, _, err = p.producer.SendMessage(msg)
	return err
}

// Flush сбрасывает буфер сообщений
func (p *Producer) Flush(ctx context.Context) error {
	return p.producer.Close()
}

// Close закрывает producer
func (p *Producer) Close() error {
	return p.producer.Close()
}
