# ---- Stage 1: Install dependencies ----
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ---- Stage 2: Build the application ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set the FHIR server URL at build time (NEXT_PUBLIC_ vars are inlined during build)
ARG NEXT_PUBLIC_FHIR_SERVER_URL=https://fhir-bootcamp.medblocks.com/fhir
ENV NEXT_PUBLIC_FHIR_SERVER_URL=$NEXT_PUBLIC_FHIR_SERVER_URL

RUN npm run build

# ---- Stage 3: Production runtime ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
