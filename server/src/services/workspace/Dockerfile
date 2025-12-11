FROM golang:1.23-alpine AS builder

WORKDIR /app

# Копируем go.mod и go.sum (контекст сборки = server/src)
COPY services/workspace/go.mod services/workspace/go.sum ./

# Копируем общий модуль метрик
COPY shared/metrics ./shared/metrics

# Загружаем зависимости
RUN go mod download

# Копируем исходный код
COPY services/workspace/. .

# Собираем приложение
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o workspace-service .

# Финальный образ
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Копируем бинарник из builder
COPY --from=builder /app/workspace-service .

# Открываем порт
EXPOSE 8083

# Запускаем приложение
CMD ["./workspace-service"]
