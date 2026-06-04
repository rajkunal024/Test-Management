# PrepRoute Test Management

A separated React frontend and native Node.js HTTP backend (zero external web framework dependencies) for test management, persisting data in MongoDB.

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

Create the following `.env` configuration files (these are ignored by Git):

**Frontend (`frontend/.env`)**:
```env
VITE_API_BASE_URL=http://127.0.0.1:4000/api
```

**Backend (`backend/.env`)**:
```env
PORT=4000
FRONTEND_ORIGIN=http://127.0.0.1:5173
MONGODB_URI=your_own_key
ADMIN_SIGNUP_KEY=your_own_key
JWT_SECRET=your_own_key
```

## Architecture & Core Features

- **Frontend (`frontend/`)**: React 18 + TypeScript + Zustand + React Query app.
  - Interceptors automatically enable `withCredentials: true` to forward HTTP-only session cookies.
  - App Shell includes an interactive, glassmorphic notifications panel polling every 15s.
- **Backend (`backend/`)**: Native Node.js `node:http` server with MongoDB persistence via Mongoose.
  - **Secure Cryptography**: Password hashing using pbkdf2Sync (with hex salt), incorporating dynamic database migration of legacy plain-text passwords to hashed passwords on startup.
  - **Cookie-Based Authentication**: Secure HS256 JSON Web Tokens (JWT) signed with `JWT_SECRET` and transmitted via secure, cross-origin `HttpOnly; SameSite=Lax` cookies.
  - **Randomized Question Slices**: Deterministic Fisher-Yates shuffle & Mulberry32 pseudo-random slice based on `studentId-testId` seed, ensuring students receive unique question combinations while maintaining consistent pages on refresh.
  - **Result Filtering**: Strict question filters on results page ensuring students only see their assigned questions.
  - **Notification Feed**: Live feed alerts generated when a test goes live or when results are declared.

## Author

- **Kunal Raj**

