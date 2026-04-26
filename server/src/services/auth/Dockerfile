FROM golang:1.23-alpine AS builder

WORKDIR /app/services/auth

COPY services/auth/go.mod services/auth/go.sum ./
RUN go mod download

COPY services/auth/. ./

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o auth-service .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/

COPY --from=builder /app/services/auth/auth-service .

EXPOSE 8081

CMD ["./auth-service"]
