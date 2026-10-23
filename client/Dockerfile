# Build context: repository root (see docker-compose.yml)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci -w client --include-workspace-root
COPY client client
# NEXT_PUBLIC_* values are inlined into the bundle at build time.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build -w client

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
# `public/` may not exist yet; the standalone output keeps the monorepo layout (client/server.js).
COPY --from=build /app/client/.next/standalone ./
COPY --from=build /app/client/.next/static client/.next/static
USER node
EXPOSE 3000
CMD ["node", "client/server.js"]
