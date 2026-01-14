FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy server code
COPY server ./server
COPY src/config.ts ./src/config.ts

# Build TypeScript (for production, we'd need a build step)
RUN npm install -g tsx

EXPOSE 8787

CMD ["tsx", "server/server.ts"]
