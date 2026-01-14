# Multi-stage build for Full-Stack Deployment
# Stage 1: Build Frontend
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the frontend (Vite)
RUN npm run build

# Stage 2: Production Runtime
FROM node:20-slim AS runner

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Install tsx for running TypeScript server
RUN npm install -g tsx

# Copy built frontend from builder stage
COPY --from=builder /app/dist ./dist

# Copy server code
COPY server ./server
COPY src ./src

# Expose port
EXPOSE 8787

# Set environment
ENV NODE_ENV=production
ENV PORT=8787

# Start the server
CMD ["tsx", "server/server.ts"]
