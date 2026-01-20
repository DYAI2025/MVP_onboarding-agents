# Multi-stage build for Full-Stack Deployment
# Stage 1: Build Frontend and Backend
FROM node:20 AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (needed for TypeScript compilation)
RUN npm ci

# Copy source code
COPY . .

# Build both frontend (Vite) and backend (TypeScript compilation)
RUN npm run build

# Stage 2: Production Runtime
FROM node:20 AS runner

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled output from builder stage
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 8787

# Set environment
ENV NODE_ENV=production
ENV PORT=8787

# Start the compiled server (no tsx needed in production)
CMD ["npm", "start"]
