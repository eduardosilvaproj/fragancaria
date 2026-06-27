# Build stage
FROM node:20-alpine as builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build
RUN npm run build

# Verify outputs
RUN find dist/client/assets -type f -name "*.css" | head -2

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Copy built artifacts from builder - make sure all are included
COPY --from=builder /app/dist ./dist

# Verify copy worked
RUN ls -la dist/client/assets/ | head -5 && echo "Total CSS files:" && find dist/client/assets -type f -name "*.css" | wc -l

COPY --from=builder /app/start.js ./start.js
COPY --from=builder /app/package.json ./package.json

# Install only production dependencies
RUN npm ci --only=production

EXPOSE 3000

CMD ["node", "start.js"]


