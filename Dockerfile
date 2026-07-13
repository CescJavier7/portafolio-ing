# Etapa 1: Construcción
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx prisma generate
RUN npm run build

# Etapa 2: Producción (Runner)
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production

# 🔴 EL PARCHE ATÓMICO DE RED PARA TRAEFIK 🔴
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/content ./content

USER nextjs

EXPOSE 3000
CMD ["npm", "run", "start"]