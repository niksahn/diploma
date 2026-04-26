FROM golang:1.23-alpine AS builder

WORKDIR /app/services/workspace

COPY services/workspace/go.mod services/workspace/go.sum ./
COPY shared/metrics /app/shared/metrics
RUN go mod download

COPY services/workspace/. ./

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o workspace-service .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/

COPY --from=builder /app/services/workspace/workspace-service .

EXPOSE 8083

CMD ["./workspace-service"]
