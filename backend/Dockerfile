# ---- Stage 1: Builder ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build
RUN npm run build

# ---- Stage 2: Production ----
FROM node:20-alpine AS production

WORKDIR /app

# Install production only dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

# Environment variables (override at runtime)
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/src/main.js"]
