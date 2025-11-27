FROM golang:1.21-alpine AS builder

WORKDIR /app

# Копируем go.mod и go.sum
COPY go.mod ./
RUN go mod download

# Копируем исходный код
COPY . .

# Собираем приложение
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o auth-service ./main.go

# Финальный образ
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Копируем бинарник из builder
COPY --from=builder /app/auth-service .

# Экспонируем порт
EXPOSE 8081

# Запускаем приложение
CMD ["./auth-service"]

