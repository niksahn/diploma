FROM golang:1.23-alpine AS builder

WORKDIR /app/services/user

COPY services/user/go.mod services/user/go.sum ./
RUN go mod download

COPY services/user/. ./

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o user-service .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/

COPY --from=builder /app/services/user/user-service .

EXPOSE 8082

CMD ["./user-service"]
