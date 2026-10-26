# Build from the repository root. Runtime secrets never enter the build.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci
COPY server server
COPY client client
ENV NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_SOCKET_URL="" NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_MAP_TILE_URL=
ARG NEXT_PUBLIC_MAP_TILE_ATTRIBUTION=
ENV NEXT_PUBLIC_MAP_TILE_URL=$NEXT_PUBLIC_MAP_TILE_URL NEXT_PUBLIC_MAP_TILE_ATTRIBUTION=$NEXT_PUBLIC_MAP_TILE_ATTRIBUTION
RUN npm run build

FROM node:22-alpine AS api-dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci -w server --omit=dev --include-workspace-root

FROM node:22-alpine
RUN apk add --no-cache nginx tini
WORKDIR /opt/inventory
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=10000 AUTH_COOKIE_SECURE=true
COPY --from=build --chown=node:node /app/client/.next/standalone ./web
COPY --from=build --chown=node:node /app/client/.next/static ./web/client/.next/static
COPY --from=build --chown=node:node /app/client/public ./web/client/public
COPY --from=api-dependencies /app/node_modules ./api/node_modules
COPY --from=build /app/server/package.json ./api/server/package.json
COPY --from=build /app/server/dist ./api/server/dist
COPY deploy/start.mjs deploy/config.mjs deploy/nginx.conf ./deploy/
USER node
EXPOSE 10000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "deploy/start.mjs"]
