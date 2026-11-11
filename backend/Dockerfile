# ---- Etapa de build: compila TypeScript ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY sql ./sql
RUN npm run build

# ---- Etapa de ejecución: solo dependencias de producción ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY sql ./sql

# Aplica el esquema (idempotente) y arranca la API
CMD ["sh", "-c", "node dist/database/migrate.js && node dist/server.js"]

EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=20s \
  CMD wget -qO- http://localhost:3001/api/health > /dev/null 2>&1 || exit 1
