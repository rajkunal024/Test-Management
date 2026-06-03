# PrepRoute Test Management

A separated React frontend and Node/Express backend for test management. The backend proxies authenticated API calls to the staging PrepRoute API, while the frontend remains a React 18 + TypeScript app.

## Setup

```bash
npm install
npm run dev
```

Frontend:

```text
http://127.0.0.1:5173
```

Backend:

```text
http://127.0.0.1:4000
```

## Environment

Copy the examples if you need custom values:

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

The backend forwards to:

```text
https://admin-moderator-backend-staging.up.railway.app/api
```

## Architecture

- `frontend/` contains the React 18 + TypeScript UI.
- `frontend/src/services/api.ts` owns frontend Axios calls to the local backend.
- `frontend/src/store` contains Zustand auth and current-test stores.
- `frontend/src/hooks` wraps React Query calls for tests, subjects, topics, and sub-topics.
- `frontend/src/pages` contains login, dashboard, create/edit, questions, and preview/publish.
- `backend/` contains the Express API proxy and health endpoint.
- `backend/src/upstream.ts` forwards `/api/*` requests to the staging API while preserving bearer auth.

Authentication tokens and user data are persisted to `localStorage`. Protected routes redirect unauthenticated users to `/login`; API `401` responses clear auth and return the app to login.
