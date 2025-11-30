.PHONY: swagger
swagger:
	@echo "Generating Swagger documentation..."
	@swag init -g main.go -o docs --parseDependency --parseInternal

.PHONY: run
run:
	@go run main.go

.PHONY: build
build:
	@go build -o user-service main.go

.PHONY: test
test:
	@go test -v ./...


