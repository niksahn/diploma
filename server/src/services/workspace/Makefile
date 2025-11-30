.PHONY: run build swagger clean

run:
	go run main.go

build:
	go build -o workspace-service main.go

swagger:
	swag init -g main.go

clean:
	rm -f workspace-service
