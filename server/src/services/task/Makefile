.PHONY: run build swagger clean

run:
	go run main.go

build:
	go build -o task-service main.go

swagger:
	swag init -g main.go

clean:
	rm -f task-service




