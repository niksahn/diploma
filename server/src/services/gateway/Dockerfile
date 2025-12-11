FROM golang:1.23-alpine AS builder

WORKDIR /app

COPY services/gateway/go.mod services/gateway/go.sum ./
COPY shared/metrics ./shared/metrics
RUN go mod download

COPY services/gateway/. .

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o gateway-service ./main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/

COPY --from=builder /app/gateway-service .

EXPOSE 8080

CMD ["./gateway-service"]


