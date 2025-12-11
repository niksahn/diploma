package kafka

import (
	"context"
	"encoding/json"
	"log"
	"sync"

	"github.com/Shopify/sarama"
)

// MessageHandler обработчик сообщений
type MessageHandler interface {
	HandleMessage(ctx context.Context, topic string, event ComplaintEvent) error
}

// Consumer обертка для чтения сообщений из Kafka
type Consumer struct {
	consumer sarama.ConsumerGroup
	config   *Config
	handler  MessageHandler
	wg       sync.WaitGroup
}

// NewConsumer создает новый Consumer
func NewConsumer(cfg *Config, handler MessageHandler) (*Consumer, error) {
	config := sarama.NewConfig()
	config.Consumer.Group.Rebalance.Strategy = sarama.BalanceStrategyRoundRobin
	config.Consumer.Offsets.Initial = sarama.OffsetOldest
	config.Consumer.Group.Session.Timeout = cfg.ConsumerSessionTimeout
	config.Consumer.Group.Heartbeat.Interval = cfg.ConsumerHeartbeatInterval
	config.Consumer.MaxProcessingTime = cfg.ConsumerMaxProcessingTime
	config.ClientID = cfg.ClientID + "-consumer"

	consumer, err := sarama.NewConsumerGroup(cfg.Brokers, cfg.ConsumerGroupID, config)
	if err != nil {
		return nil, err
	}

	return &Consumer{
		consumer: consumer,
		config:   cfg,
		handler:  handler,
	}, nil
}

// Start начинает потребление сообщений из указанных топиков
func (c *Consumer) Start(ctx context.Context, topics []string) error {
	c.wg.Add(1)
	defer c.wg.Done()

	handler := &consumerGroupHandler{
		handler: c.handler,
	}

	for {
		select {
		case <-ctx.Done():
			log.Println("Consumer stopping...")
			return nil
		default:
			err := c.consumer.Consume(ctx, topics, handler)
			if err != nil {
				log.Printf("Error from consumer: %v", err)
				return err
			}
		}
	}
}

// Close закрывает consumer
func (c *Consumer) Close() error {
	return c.consumer.Close()
}

// Wait ожидает завершения работы consumer
func (c *Consumer) Wait() {
	c.wg.Wait()
}

// consumerGroupHandler реализует sarama.ConsumerGroupHandler
type consumerGroupHandler struct {
	handler MessageHandler
}

// Setup вызывается в начале новой сессии
func (h *consumerGroupHandler) Setup(sarama.ConsumerGroupSession) error {
	log.Println("Consumer group session started")
	return nil
}

// Cleanup вызывается в конце сессии
func (h *consumerGroupHandler) Cleanup(sarama.ConsumerGroupSession) error {
	log.Println("Consumer group session ended")
	return nil
}

// ConsumeClaim обрабатывает сообщения из партиции
func (h *consumerGroupHandler) ConsumeClaim(session sarama.ConsumerGroupSession, claim sarama.ConsumerGroupClaim) error {
	for {
		select {
		case message := <-claim.Messages():
			if message == nil {
				continue
			}

			if err := h.processMessage(session.Context(), message); err != nil {
				log.Printf("Failed to process message: %v", err)
				// В реальном приложении здесь может быть dead letter queue
			}

			session.MarkMessage(message, "")

		case <-session.Context().Done():
			return nil
		}
	}
}

// processMessage обрабатывает отдельное сообщение
func (h *consumerGroupHandler) processMessage(ctx context.Context, msg *sarama.ConsumerMessage) error {
	log.Printf("Received message from topic %s, partition %d, offset %d",
		msg.Topic, msg.Partition, msg.Offset)

	// Определяем тип события по топику и содержимому
	var event ComplaintEvent
	var err error

	switch msg.Topic {
	case "complaint-events":
		event, err = h.parseComplaintEvent(msg.Value)
	default:
		log.Printf("Unknown topic: %s", msg.Topic)
		return nil
	}

	if err != nil {
		return err
	}

	if event != nil {
		return h.handler.HandleMessage(ctx, msg.Topic, event)
	}

	return nil
}

// parseComplaintEvent парсит событие жалобы
func (h *consumerGroupHandler) parseComplaintEvent(data []byte) (ComplaintEvent, error) {
	// Сначала определяем тип события
	var baseEvent BaseEvent
	if err := json.Unmarshal(data, &baseEvent); err != nil {
		return nil, err
	}

	switch baseEvent.Type {
	case EventTypeComplaintCreated:
		var event ComplaintCreatedEvent
		if err := json.Unmarshal(data, &event); err != nil {
			return nil, err
		}
		return event, nil

	case EventTypeComplaintStatusChanged:
		var event ComplaintStatusChangedEvent
		if err := json.Unmarshal(data, &event); err != nil {
			return nil, err
		}
		return event, nil

	default:
		log.Printf("Unknown event type: %s", baseEvent.Type)
		return nil, nil
	}
}
