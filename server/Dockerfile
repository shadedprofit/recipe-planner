FROM node:22-bookworm-slim

WORKDIR /app

ENV HUSKY=0

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY mobile/package.json ./mobile/package.json
COPY server/package.json ./server/package.json
COPY shared/package.json ./shared/package.json

RUN npm ci --workspace server --workspace shared --include-workspace-root

COPY shared ./shared
COPY server ./server

ENV PORT=3001
ENV RECIPE_DB_PATH=/data/recipes.db

EXPOSE 3001

CMD ["npm", "run", "start", "-w", "server"]
