## Dockerfile for the Node/Express server
# Multi-stage: install deps, copy sources, run in lightweight image

FROM node:18-alpine AS builder
WORKDIR /app

# This Dockerfile expects the build context to be the repository root so we
# can copy both the `server/` sources and the `maisonpardailhe/` static site.

# Install production dependencies for the server
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production

# Copy server sources and the static site into the image
COPY server ./server
COPY maisonpardailhe ./maisonpardailhe

FROM node:18-alpine
WORKDIR /app/server

# Copy only the installed node_modules and app files from the builder
COPY --from=builder /app/server/node_modules ./node_modules
COPY --from=builder /app/server ./
COPY --from=builder /app/maisonpardailhe ../maisonpardailhe

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Simple HTTP healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- http://localhost:3001/ || exit 1

CMD ["npm", "start"]
