#!/bin/bash

# Скрипт для инициализации топиков Kafka
# Запускать после запуска Kafka: ./init-kafka-topics.sh

KAFKA_CONTAINER="messenger_kafka"
KAFKA_BROKERS="localhost:9092"

echo "Waiting for Kafka to be ready..."
sleep 10

echo "Creating Kafka topics..."

# Топик для событий жалоб
docker exec $KAFKA_CONTAINER kafka-topics --create \
    --topic complaint-events \
    --bootstrap-server $KAFKA_BROKERS \
    --partitions 3 \
    --replication-factor 1 \
    --if-not-exists

# Топик для уведомлений
docker exec $KAFKA_CONTAINER kafka-topics --create \
    --topic complaint-notifications \
    --bootstrap-server $KAFKA_BROKERS \
    --partitions 3 \
    --replication-factor 1 \
    --if-not-exists

# Топик для аналитики
docker exec $KAFKA_CONTAINER kafka-topics --create \
    --topic complaint-analytics \
    --bootstrap-server $KAFKA_BROKERS \
    --partitions 3 \
    --replication-factor 1 \
    --if-not-exists

echo "Topics created successfully!"

# Проверяем созданные топики
echo "Listing all topics:"
docker exec $KAFKA_CONTAINER kafka-topics --list --bootstrap-server $KAFKA_BROKERS
