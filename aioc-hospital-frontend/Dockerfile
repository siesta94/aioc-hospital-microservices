# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

ARG VITE_API_URL=http://localhost:8000
ARG VITE_LOGIN_API_URL=http://localhost:8000
ARG VITE_MANAGEMENT_API_URL=http://localhost:8001
ARG VITE_SCHEDULING_API_URL=http://localhost:8002
ARG VITE_REPORTS_API_URL=http://localhost:8003
ARG VITE_PDF_API_URL=http://localhost:8004
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_LOGIN_API_URL=${VITE_LOGIN_API_URL}
ENV VITE_MANAGEMENT_API_URL=${VITE_MANAGEMENT_API_URL}
ENV VITE_SCHEDULING_API_URL=${VITE_SCHEDULING_API_URL}
ENV VITE_REPORTS_API_URL=${VITE_REPORTS_API_URL}
ENV VITE_PDF_API_URL=${VITE_PDF_API_URL}

COPY package*.json ./
RUN npm ci --frozen-lockfile

COPY . .
RUN npm run build

# ── Stage 2: serve ───────────────────────────────────────────────────────────
FROM node:22-alpine

RUN npm install -g serve@14

COPY --from=builder /app/dist /app/dist

EXPOSE 3000

CMD ["serve", "-s", "/app/dist", "-l", "3000"]
