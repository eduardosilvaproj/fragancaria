# Single stage build
FROM node:20-alpine

WORKDIR /app

# Copy everything first
COPY . .

# Install dependencies
RUN npm ci

# Run build
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "start.js"]



