package kafka

import (
	"encoding/json"
	"log"

	"github.com/IBM/sarama"
)

// Producer представляет Kafka продюсера
type Producer struct {
	producer sarama.SyncProducer
}

// NewProducer создает новый Kafka продюсер
func NewProducer(brokers []string) (*Producer, error) {
	config := sarama.NewConfig()
	config.Producer.Return.Successes = true
	config.Producer.RequiredAcks = sarama.WaitForAll
	config.Producer.Retry.Max = 5

	producer, err := sarama.NewSyncProducer(brokers, config)
	if err != nil {
		return nil, err
	}

	return &Producer{
		producer: producer,
	}, nil
}

// Publish отправляет сообщение в указанный топик
func (p *Producer) Publish(topic string, message interface{}) error {
	// Сериализуем сообщение в JSON
	jsonData, err := json.Marshal(message)
	if err != nil {
		log.Printf("Failed to marshal message: %v", err)
		return err
	}

	// Создаем Kafka сообщение
	msg := &sarama.ProducerMessage{
		Topic: topic,
		Value: sarama.StringEncoder(jsonData),
	}

	// Отправляем сообщение
	partition, offset, err := p.producer.SendMessage(msg)
	if err != nil {
		log.Printf("Failed to send message to Kafka: %v", err)
		return err
	}

	log.Printf("Message sent to topic %s, partition %d, offset %d", topic, partition, offset)
	return nil
}

// Close закрывает продюсера
func (p *Producer) Close() error {
	return p.producer.Close()
}







