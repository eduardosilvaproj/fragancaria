# Build stage
FROM node:20-alpine as builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build with verbose output
RUN echo "Starting build..." && npm run build 2>&1 && echo "Build completed. Checking output:" && ls -la dist/client/assets/*.css 2>/dev/null | head -2 || echo "No CSS found in dist/client/assets"

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/start.js ./start.js
COPY --from=builder /app/package.json ./package.json

# Install only production dependencies
RUN npm ci --only=production

EXPOSE 3000

CMD ["node", "start.js"]

