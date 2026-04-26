FROM golang:1.23-alpine AS builder

WORKDIR /app/services/task

COPY services/task/go.mod services/task/go.sum ./
COPY shared/metrics /app/shared/metrics
RUN go mod download

COPY services/task/. ./

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o task-service .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/

COPY --from=builder /app/services/task/task-service .

EXPOSE 8085

CMD ["./task-service"]
