#!/bin/bash

echo "Setting up Kong Gateway configuration..."

# Create services
echo "Creating services..."
curl -X POST http://localhost:8001/services \
  -d "name=auth-service" \
  -d "url=http://auth-service:8081"

curl -X POST http://localhost:8001/services \
  -d "name=user-service" \
  -d "url=http://user-service:8082"

curl -X POST http://localhost:8001/services \
  -d "name=workspace-service" \
  -d "url=http://workspace-service:8083"

curl -X POST http://localhost:8001/services \
  -d "name=chat-service" \
  -d "url=http://chat-service:8084"

# Create routes
echo "Creating routes..."
curl -X POST http://localhost:8001/services/auth-service/routes \
  -d "paths[]=/api/v1/auth" \
  -d "strip_path=false"

curl -X POST http://localhost:8001/services/user-service/routes \
  -d "paths[]=/api/v1/users" \
  -d "strip_path=false"

curl -X POST http://localhost:8001/services/workspace-service/routes \
  -d "paths[]=/api/v1/workspaces" \
  -d "strip_path=false"

curl -X POST http://localhost:8001/services/chat-service/routes \
  -d "paths[]=/api/v1/chats" \
  -d "strip_path=false"

# Add JWT plugin to protected services
echo "Adding JWT plugins..."
curl -X POST http://localhost:8001/services/user-service/plugins \
  -d "name=jwt" \
  -d "config.secret_is_base64=false"

curl -X POST http://localhost:8001/services/workspace-service/plugins \
  -d "name=jwt" \
  -d "config.secret_is_base64=false"

curl -X POST http://localhost:8001/services/chat-service/plugins \
  -d "name=jwt" \
  -d "config.secret_is_base64=false"

# Add request transformer for protected services
echo "Adding request transformers..."
curl -X POST http://localhost:8001/services/user-service/plugins \
  -d "name=request-transformer" \
  -d 'config.add.headers=X-User-ID:$(jwt.claims.user_id),X-User-Role:$(jwt.claims.role)'

curl -X POST http://localhost:8001/services/workspace-service/plugins \
  -d "name=request-transformer" \
  -d 'config.add.headers=X-User-ID:$(jwt.claims.user_id),X-User-Role:$(jwt.claims.role)'

curl -X POST http://localhost:8001/services/chat-service/plugins \
  -d "name=request-transformer" \
  -d 'config.add.headers=X-User-ID:$(jwt.claims.user_id),X-User-Role:$(jwt.claims.role)'

# Add rate limiting
echo "Adding rate limiting..."
curl -X POST http://localhost:8001/services/auth-service/plugins \
  -d "name=rate-limiting" \
  -d "config.minute=5" \
  -d "config.policy=local"

curl -X POST http://localhost:8001/services/user-service/plugins \
  -d "name=rate-limiting" \
  -d "config.minute=100" \
  -d "config.policy=local"

curl -X POST http://localhost:8001/services/workspace-service/plugins \
  -d "name=rate-limiting" \
  -d "config.minute=100" \
  -d "config.policy=local"

curl -X POST http://localhost:8001/services/chat-service/plugins \
  -d "name=rate-limiting" \
  -d "config.minute=100" \
  -d "config.policy=local"

# Add CORS
echo "Adding CORS..."
for service in auth-service user-service workspace-service chat-service; do
  curl -X POST http://localhost:8001/services/$service/plugins \
    -d "name=cors" \
    -d 'config.origins=http://localhost:3000,https://messenger.example.com' \
    -d 'config.methods=GET,POST,PUT,DELETE,OPTIONS'
done

# Add Prometheus
echo "Adding Prometheus metrics..."
for service in user-service workspace-service chat-service; do
  curl -X POST http://localhost:8001/services/$service/plugins \
    -d "name=prometheus"
done

# Create Swagger routes
echo "Creating Swagger routes..."
curl -X POST http://localhost:8001/services/auth-service/routes \
  -d "paths[]=/swagger/auth" \
  -d "methods[]=GET"

curl -X POST http://localhost:8001/services/user-service/routes \
  -d "paths[]=/swagger/user" \
  -d "methods[]=GET"

curl -X POST http://localhost:8001/services/workspace-service/routes \
  -d "paths[]=/swagger/workspace" \
  -d "methods[]=GET"

curl -X POST http://localhost:8001/services/chat-service/routes \
  -d "paths[]=/swagger/chat" \
  -d "methods[]=GET"

# Add request transformers for Swagger routes to redirect to /docs/swagger.json
echo "Adding Swagger request transformers..."
for service in auth-service user-service workspace-service chat-service; do
  # Get route ID for swagger route
  ROUTE_ID=$(curl -s http://localhost:8001/routes | jq -r ".data[] | select(.service.name==\"$service\" and (.paths[] | contains(\"swagger\"))) | .id")
  if [ ! -z "$ROUTE_ID" ]; then
    curl -X POST http://localhost:8001/routes/$ROUTE_ID/plugins \
      -d "name=request-transformer" \
      -d 'config.replace.uri=/docs/swagger.json'
  fi
done

# Create health check route
echo "Creating health check route..."
curl -X POST http://localhost:8001/routes \
  -d "paths[]=/health" \
  -d "methods[]=GET" \
  -d "service.name=auth-service"

echo "Kong Gateway configuration completed!"
echo ""
echo "Test endpoints:"
echo "- Kong Gateway: http://localhost:8080"
echo "- Kong Manager: http://localhost:8002"
echo "- Swagger UI: http://localhost:8089"
echo "- Health check: http://localhost:8080/health"






