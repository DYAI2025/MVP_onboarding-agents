# Multi-stage build for Full-Stack Deployment
# Stage 1: Build Frontend
FROM node:20 AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the frontend (Vite)
RUN npm run build

# Stage 2: Production Runtime
FROM node:20 AS runner

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built frontend from builder stage
COPY --from=builder /app/dist ./dist

# Copy server code and its internal dependencies
COPY server ./server

# Expose port
EXPOSE 8787

# Set environment
ENV NODE_ENV=production
ENV PORT=8787

# Start the server using npm start (which calls tsx)
CMD ["npm", "start"]
