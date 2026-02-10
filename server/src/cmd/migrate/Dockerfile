# Build stage
FROM golang:1.21-alpine AS builder
WORKDIR /app

COPY cmd/migrate/go.mod ./
COPY cmd/migrate/*.go ./
RUN go mod tidy && CGO_ENABLED=0 GOOS=linux go build -o /migrate .

# Runtime: binary + migrations + entrypoint
FROM alpine:3.18
RUN apk --no-cache add ca-certificates
WORKDIR /app

COPY --from=builder /migrate /app/migrate
COPY migrations /app/migrations
COPY cmd/migrate/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
