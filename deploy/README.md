# Deploy helper

This `deploy` folder contains a PowerShell helper script to build and push a Docker image
and a Portainer-friendly `docker-compose.yml` to deploy the image with configurable environment
variables via the Portainer UI.

Files
- `build-and-push.ps1` — PowerShell script to build and push an image to Docker Hub. Uses env vars or parameters:
  - `DOCKERHUB_USERNAME` (or `-Username`)
  - `DOCKERHUB_REPO` (or `-Repo`)
  - `IMAGE_TAG` (or `-Tag`, default `latest`)
  - `DOCKERHUB_TOKEN` (optional, used for `docker login` via stdin)

- `docker-compose.yml` — Compose file intended for Portainer stacks. It references `${DOCKER_IMAGE}` and other env vars so you can configure them in Portainer when creating a stack.

Quick usage

1) Build & push locally (PowerShell / pwsh) from repo root:

```powershell
# set env vars (example)
$env:DOCKERHUB_USERNAME = 'myuser'
$env:DOCKERHUB_REPO = 'maisonpardailhe-server'
$env:DOCKERHUB_TOKEN = 'xxx'   # optional
$env:IMAGE_TAG = 'v1.0.0'

powershell ./deploy/build-and-push.ps1 -ContextPath server
```

2) Deploy with Portainer

- In Portainer > Stacks > Add stack: paste the contents of `deploy/docker-compose.yml`.
- In the "Environment variables" section, define `DOCKER_IMAGE` (e.g. `myuser/maisonpardailhe-server:v1.0.0`) and DB/SESSION env vars.
- Deploy the stack. Portainer will substitute variables and create the container.

Notes
- The `server/Dockerfile` included in the repo builds the Node.js server and exposes port `3001`.
- The application requires MySQL environment variables (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) and `SESSION_SECRET` to operate fully.
