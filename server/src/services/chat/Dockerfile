FROM golang:1.23-alpine AS builder

WORKDIR /app/services/chat

COPY services/chat/go.mod services/chat/go.sum ./
RUN go mod download

COPY services/chat/. ./

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o chat-service .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/

COPY --from=builder /app/services/chat/chat-service .

EXPOSE 8084

CMD ["./chat-service"]
