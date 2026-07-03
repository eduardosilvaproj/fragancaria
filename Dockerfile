# Single stage build
FROM node:20-alpine

WORKDIR /app

# Copy everything first
COPY . .

# Declare ARGs for client-side (Vite) env vars. Railway automatically
# provides these to the build from the service's Variables tab.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_MERCADOPAGO_PUBLIC_KEY
ARG VITE_MERCADOPAGO_ACCESS_TOKEN
ARG VITE_MP_PUBLIC_KEY
ARG VITE_GA_MEASUREMENT_ID
ARG VITE_META_PIXEL_ID
ARG VITE_SENDER_DOCUMENT
ARG VITE_SENDER_NAME
ARG VITE_SENDER_POSTAL_CODE
ARG VITE_ENVIOFACIL_API_KEY

# Make Vite able to read these as process.env.* at build time
# (Vite's import.meta.env reads from process.env when prefixed appropriately;
#  ARGs are NOT passed to RUN steps as plain env. We have to propagate them.)
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_MERCADOPAGO_PUBLIC_KEY=$VITE_MERCADOPAGO_PUBLIC_KEY \
    VITE_MERCADOPAGO_ACCESS_TOKEN=$VITE_MERCADOPAGO_ACCESS_TOKEN \
    VITE_MP_PUBLIC_KEY=$VITE_MP_PUBLIC_KEY \
    VITE_GA_MEASUREMENT_ID=$VITE_GA_MEASUREMENT_ID \
    VITE_META_PIXEL_ID=$VITE_META_PIXEL_ID \
    VITE_SENDER_DOCUMENT=$VITE_SENDER_DOCUMENT \
    VITE_SENDER_NAME=$VITE_SENDER_NAME \
    VITE_SENDER_POSTAL_CODE=$VITE_SENDER_POSTAL_CODE \
    VITE_ENVIOFACIL_API_KEY=$VITE_ENVIOFACIL_API_KEY

# Install dependencies
RUN npm ci

# Run build (Vite interpolates VITE_* here)
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "start.js"]
