#!/bin/bash

echo "Setting up Swagger routes..."

# Create routes for each service
curl -X POST http://localhost:8001/services/swagger-static/routes \
  -d "paths[]=/swagger/auth" \
  -d "methods[]=GET" \
  -d "strip_path=false"

curl -X POST http://localhost:8001/services/swagger-static/routes \
  -d "paths[]=/swagger/user" \
  -d "methods[]=GET" \
  -d "strip_path=false"

curl -X POST http://localhost:8001/services/swagger-static/routes \
  -d "paths[]=/swagger/workspace" \
  -d "methods[]=GET" \
  -d "strip_path=false"

curl -X POST http://localhost:8001/services/swagger-static/routes \
  -d "paths[]=/swagger/chat" \
  -d "methods[]=GET" \
  -d "strip_path=false"

# Create Kong API route
curl -X POST http://localhost:8001/services/swagger-static/routes \
  -d "paths[]=/swagger/kong.json" \
  -d "methods[]=GET" \
  -d "strip_path=false"

echo "Swagger routes created!"






