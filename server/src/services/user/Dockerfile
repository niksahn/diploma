FROM golang:1.23-alpine AS builder

WORKDIR /app

# Копируем go.mod и go.sum (контекст сборки = server/src)
COPY services/user/go.mod services/user/go.sum ./
# Копируем общие модули
COPY shared/metrics ./shared/metrics
COPY shared/kafka ./shared/kafka
RUN go mod download

# Копируем исходный код
COPY services/user/ .

# Собираем приложение
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o user-service .

# Финальный образ
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Копируем бинарник из builder
COPY --from=builder /app/user-service .

# Экспонируем порт
EXPOSE 8082

# Запускаем приложение
CMD ["./user-service"]















