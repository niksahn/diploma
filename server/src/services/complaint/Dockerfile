FROM golang:1.23-alpine AS builder

WORKDIR /app

COPY services/complaint/go.mod services/complaint/go.sum ./
COPY shared/metrics ./shared/metrics
RUN go mod download

COPY services/complaint/. .

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o complaint-service ./main.go

FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

COPY --from=builder /app/complaint-service .

EXPOSE 8086

CMD ["./complaint-service"]


