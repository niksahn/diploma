FROM golang:1.23-alpine AS builder

WORKDIR /app

# Копируем go.mod и go.sum (контекст сборки = server/src)
COPY services/user/go.mod services/user/go.sum ./
# Копируем общий модуль метрик
COPY shared/metrics ./shared/metrics
RUN go mod download

# Копируем исходный код
COPY services/user/. .

# Собираем приложение
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o user-service ./main.go

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















