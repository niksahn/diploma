#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-/opt/diploma}"
DEPLOY_ASSETS_DIR="${DEPLOY_ASSETS_DIR:-$PROJECT_ROOT/deploy-assets}"
SERVER_SRC_DIR="$PROJECT_ROOT/server/src"
ENV_FILE="$SERVER_SRC_DIR/.env"
NGINX_CONF_SOURCE="$PROJECT_ROOT/deploy/nginx.conf"
NGINX_CONF_TARGET="/etc/nginx/conf.d/diploma.conf"
APP_DIST_SOURCE="$DEPLOY_ASSETS_DIR/front-app-dist"
ADMIN_DIST_SOURCE="$DEPLOY_ASSETS_DIR/admin-dist"
APP_DIST_TARGET="/var/www/diploma/app"
ADMIN_DIST_TARGET="/var/www/diploma/admin"

if [[ -z "${IMAGE_TAG:-}" ]]; then
  echo "IMAGE_TAG is required"
  exit 1
fi

mkdir -p "$PROJECT_ROOT" "$SERVER_SRC_DIR" "$APP_DIST_TARGET" "$ADMIN_DIST_TARGET"

if [[ ! -f "$SERVER_SRC_DIR/docker-compose.yml" ]]; then
  echo "Missing $SERVER_SRC_DIR/docker-compose.yml"
  exit 1
fi

if [[ ! -f "$SERVER_SRC_DIR/docker-compose.prod.yml" ]]; then
  echo "Missing $SERVER_SRC_DIR/docker-compose.prod.yml"
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  if [[ -f "$SERVER_SRC_DIR/.env.example" ]]; then
    cp "$SERVER_SRC_DIR/.env.example" "$ENV_FILE"
  else
    echo "Missing .env and .env.example in $SERVER_SRC_DIR"
    exit 1
  fi
fi

if [[ -n "${DOCKERHUB_USERNAME:-}" && -n "${DOCKERHUB_TOKEN:-}" ]]; then
  echo "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin
fi

if grep -q '^IMAGE_TAG=' "$ENV_FILE"; then
  sed -i.bak "s/^IMAGE_TAG=.*/IMAGE_TAG=$IMAGE_TAG/" "$ENV_FILE"
else
  echo "IMAGE_TAG=$IMAGE_TAG" >> "$ENV_FILE"
fi

if [[ -n "${DOCKERHUB_NAMESPACE:-}" ]]; then
  if grep -q '^DOCKERHUB_NAMESPACE=' "$ENV_FILE"; then
    sed -i.bak "s/^DOCKERHUB_NAMESPACE=.*/DOCKERHUB_NAMESPACE=$DOCKERHUB_NAMESPACE/" "$ENV_FILE"
  else
    echo "DOCKERHUB_NAMESPACE=$DOCKERHUB_NAMESPACE" >> "$ENV_FILE"
  fi
fi

if [[ -d "$APP_DIST_SOURCE" ]]; then
  rsync -a --delete "$APP_DIST_SOURCE"/ "$APP_DIST_TARGET"/
fi

if [[ -d "$ADMIN_DIST_SOURCE" ]]; then
  rsync -a --delete "$ADMIN_DIST_SOURCE"/ "$ADMIN_DIST_TARGET"/
fi

if [[ ! -f "$NGINX_CONF_SOURCE" ]]; then
  echo "Missing $NGINX_CONF_SOURCE"
  exit 1
fi

install -m 644 "$NGINX_CONF_SOURCE" "$NGINX_CONF_TARGET"
nginx -t
systemctl reload nginx

cd "$SERVER_SRC_DIR"
docker compose --env-file "$ENV_FILE" -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose --env-file "$ENV_FILE" -f docker-compose.yml -f docker-compose.prod.yml up -d

curl --fail --silent http://127.0.0.1:8080/health > /dev/null
echo "Deploy completed successfully"
