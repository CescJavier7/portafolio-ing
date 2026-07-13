# Etapa 1: Construcción
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

# Límite de memoria para evitar colapsos del VPS durante el build
ENV NODE_OPTIONS="--max-old-space-size=1024"

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

# 🔴 CREACIÓN DEL USUARIO DE SISTEMA (SECURITY FIX) 🔴
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiamos asignando propiedad al nuevo usuario para evitar errores EACCES
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/content ./content

# Bajamos privilegios al usuario creado
USER nextjs

EXPOSE 3000
CMD ["npm", "run", "start"]

# (Añadir al final del Dockerfile)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1