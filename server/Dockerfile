## Dockerfile for the Node/Express server
# Multi-stage: install deps, copy sources, run in lightweight image

FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files first to take advantage of layer caching
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . ./

FROM node:18-alpine
WORKDIR /app

# Copy only what we need from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app .

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- http://localhost:3001/ || exit 1

CMD ["npm", "start"]
