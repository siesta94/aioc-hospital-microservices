# AIOC Hospital Frontend

React + TypeScript + Vite + Tailwind CSS frontend for the AIOC Hospital platform.

## Setup

```bash
cd aioc-hospital-frontend
npm install
npm run dev
```

Runs on `http://localhost:5173`

## Routes

| URL                  | Description                          |
|----------------------|--------------------------------------|
| /login               | Staff login → redirects to /dashboard |
| /admin               | Admin login → redirects to /admin/dashboard |
| /dashboard           | Staff dashboard (protected)          |
| /admin/dashboard     | Admin dashboard (protected)          |

## Stack

- React 18 + TypeScript
- Vite (bundler)
- Tailwind CSS v4 (via @tailwindcss/vite)
- React Router v7
- Axios
- Lucide React (icons)

## Backend

Expects FastAPI backend running at `http://localhost:8000`.
API calls are proxied through Vite dev server (`/api/*` → `http://localhost:8000`).
