# ai-playground

A set of small AI demos. Each demo is a page in the frontend and a service in the backend.

- `frontend/` — React, Tailwind, React Router
- `backend/` — NestJS monorepo, one app per demo, each on its own port with CORS enabled

## Run

```bash
docker compose up --build
```

Open `http://localhost:8080`. The chat API runs on port 3001.

Secrets such as API keys go in `.env`. It is optional and unused so far: `cp .env.example .env`.

## Develop without Docker

Backend apps read `.env` from the repo root when it exists.

```bash
cd backend && npm install
npm run start:dev:llm-simple-chat
```

```bash
cd frontend && npm install && npm run dev
```

## Add a demo

1. Backend: create `backend/apps/<name>`, give it its own port, and add it to `nest-cli.json` and `docker-compose.yml`.
2. Frontend: add a page wrapped in `DemoLayout` and register it in `frontend/src/demos/registry.ts`.
