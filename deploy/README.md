# CI/CD Docker Hub SSH Deploy

This project deploys with GitHub Actions, Docker Hub, and SSH.

## What Gets Deployed

- Backend services from Docker Hub images via:
  - `server/src/docker-compose.yml`
  - `server/src/docker-compose.prod.yml`
- Frontend static assets:
  - `front/app/dist` -> `/var/www/diploma/app`
  - `admin/dist` -> `/var/www/diploma/admin`
- Nginx reverse proxy and SPA hosting:
  - `deploy/nginx.conf` -> `/etc/nginx/conf.d/diploma.conf`

## Required GitHub Secrets

- `SSH_HOST` (example: `89.125.89.201`)
- `SSH_USER` (example: `root`)
- `SSH_PRIVATE_KEY` (private key for `SSH_USER`)
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN` (Docker Hub access token)
- `DOCKERHUB_NAMESPACE` (Docker Hub namespace/org)
- `VITE_API_BASE_URL` (example: `http://89.125.89.201`)
- `VITE_WS_BASE_URL` (example: `ws://89.125.89.201`)

## Docker Hub Repositories

Create these repositories under `DOCKERHUB_NAMESPACE`:

- `diploma-gateway`
- `diploma-auth`
- `diploma-user`
- `diploma-workspace`
- `diploma-chat`
- `diploma-task`
- `diploma-complaint`
- `diploma-migrate`

Images are tagged as:

- immutable: `sha-<commit>`
- moving: `main`

The server deploy script uses `IMAGE_TAG`, defaulting to a CI-provided `sha-<commit>`.

## First-Time Server Setup

Run on the server (`root@89.125.89.201`):

```bash
apt-get update
apt-get install -y docker.io docker-compose-plugin nginx rsync curl
systemctl enable docker
systemctl start docker
mkdir -p /opt/diploma/server/src
mkdir -p /var/www/diploma/app /var/www/diploma/admin
```

Prepare environment:

```bash
cp /opt/diploma/server/src/.env.example /opt/diploma/server/src/.env
```

Then edit `/opt/diploma/server/src/.env` and set production values at least for:

- `DB_PASSWORD`
- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `DOCKERHUB_NAMESPACE`
- optional default `IMAGE_TAG`

If Docker Hub repos are private, verify login works:

```bash
echo "<DOCKERHUB_TOKEN>" | docker login -u "<DOCKERHUB_USERNAME>" --password-stdin
```

## Deploy Flow

On push to `main`, workflow:

1. Lints and builds `front/app` and `admin`.
2. Runs Go tests for backend services.
3. Builds and pushes backend images to Docker Hub.
4. Copies deploy files and frontend artifacts to `/opt/diploma`.
5. Runs `/opt/diploma/deploy/deploy.sh` over SSH.

Deploy script performs:

- optional `docker login`
- update `IMAGE_TAG` in server `.env`
- `docker compose pull`
- `docker compose up -d`
- install/reload nginx config
- health check `http://127.0.0.1:8080/health`

## Rollback

Set a previous image tag and redeploy:

```bash
sed -i.bak 's/^IMAGE_TAG=.*/IMAGE_TAG=sha-<old-commit>/' /opt/diploma/server/src/.env
cd /opt/diploma/server/src
docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Verification

After deploy:

```bash
curl -f http://89.125.89.201/
curl -f http://89.125.89.201/admin/
curl -f http://89.125.89.201/api/health || curl -f http://89.125.89.201/health
```

On server:

```bash
docker ps
docker compose --env-file /opt/diploma/server/src/.env \
  -f /opt/diploma/server/src/docker-compose.yml \
  -f /opt/diploma/server/src/docker-compose.prod.yml ps
```
