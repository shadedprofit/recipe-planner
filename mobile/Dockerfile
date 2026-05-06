FROM node:22-bookworm-slim AS build

WORKDIR /app

ENV HUSKY=0
ARG EXPO_PUBLIC_API_URL=http://localhost:3001
ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}

COPY package.json package-lock.json ./
COPY tsconfig.base.json tsconfig.base.json
COPY mobile/package.json mobile/package.json
COPY shared/package.json shared/package.json
COPY server/package.json server/package.json

RUN npm ci --workspace mobile --workspace shared --include-workspace-root

COPY shared shared
COPY mobile mobile

RUN npm run build:web -w mobile

FROM nginx:1.27-alpine AS runtime

COPY mobile/nginx.conf /etc/nginx/conf.d/default.conf
COPY mobile/nginx-entrypoint.sh /nginx-entrypoint.sh
COPY --from=build /app/mobile/dist /usr/share/nginx/html

RUN chmod +x /nginx-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/nginx-entrypoint.sh"]
