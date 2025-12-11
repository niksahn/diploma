FROM golang:1.23-alpine AS builder

WORKDIR /app

# Копируем go.mod и go.sum (контекст сборки = server/src)
COPY services/chat/go.mod services/chat/go.sum ./
# Копируем общий модуль метрик
COPY shared/metrics ./shared/metrics
RUN go mod download

# Копируем исходный код
RUN echo "Build timestamp: $(date)" > /tmp/build_time
COPY services/chat/. .

# Собираем приложение
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o chat-service ./main.go

# Финальный образ
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Копируем бинарник из builder
COPY --from=builder /app/chat-service .

# Экспонируем порт
EXPOSE 8084

# Запускаем приложение
CMD ["./chat-service"]













