package kafka

import (
	"log"

	"github.com/IBM/sarama"
)

// MessageHandler функция-обработчик сообщений
type MessageHandler func(topic string, message []byte) error

// Consumer представляет Kafka консьюмера
type Consumer struct {
	consumer sarama.Consumer
}

// NewConsumer создает новый Kafka консьюмер
func NewConsumer(brokers []string) (*Consumer, error) {
	config := sarama.NewConfig()
	config.Consumer.Return.Errors = true

	consumer, err := sarama.NewConsumer(brokers, config)
	if err != nil {
		return nil, err
	}

	return &Consumer{
		consumer: consumer,
	}, nil
}

// Subscribe подписывается на топик и начинает обработку сообщений
func (c *Consumer) Subscribe(topic string, handler MessageHandler) error {
	partitionConsumer, err := c.consumer.ConsumePartition(topic, 0, sarama.OffsetNewest)
	if err != nil {
		return err
	}

	go func() {
		defer partitionConsumer.Close()

		for {
			select {
			case msg := <-partitionConsumer.Messages():
				log.Printf("Received message from topic %s: %s", topic, string(msg.Value))

				if err := handler(msg.Topic, msg.Value); err != nil {
					log.Printf("Error handling message: %v", err)
				}

			case err := <-partitionConsumer.Errors():
				log.Printf("Consumer error: %v", err)
			}
		}
	}()

	return nil
}

// Close закрывает консьюмера
func (c *Consumer) Close() error {
	return c.consumer.Close()
}
