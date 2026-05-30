FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json

RUN npm ci

COPY apps/api/prisma ./apps/api/prisma
RUN npx prisma generate --schema=./apps/api/prisma/schema.prisma

COPY apps/api ./apps/api
RUN npm run build --workspace=apps/api

RUN npm prune --omit=dev --workspace=apps/api

FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY apps/api/entrypoint.sh ./entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["sh", "./entrypoint.sh"]