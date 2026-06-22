# VeriTalent API — production image for CI/CD and deployment
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
RUN mkdir -p uploads && chown -R nestjs:nodejs /app

USER nestjs
EXPOSE 3001

HEALTHCHECK --interval=10s --timeout=5s --retries=12 \
  CMD wget -qO- http://127.0.0.1:3001/ >/dev/null 2>&1 || exit 1

CMD ["sh", "-c", "node dist/src/run-migrations.js && node dist/src/main.js"]
