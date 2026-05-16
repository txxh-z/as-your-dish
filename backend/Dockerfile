FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY shared/package.json shared/package.json
RUN npm ci

COPY backend backend
COPY shared shared
RUN npm run build -w shared
RUN npm run build -w backend
RUN cp -r backend/src/db/migrations backend/dist/db/migrations

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY shared/package.json shared/package.json
RUN npm ci --omit=dev --workspaces --include-workspace-root=false

COPY --from=build /app/backend/dist backend/dist
COPY --from=build /app/shared/dist shared/dist
COPY --from=build /app/backend/src/db/migrations backend/src/db/migrations
COPY --from=build /app/backend/examples backend/examples

# The monorepo uses source exports for local TypeScript tooling. The runtime
# image points the shared workspace package at compiled JS so Node can start
# the built backend without a TypeScript loader.
RUN node -e "const fs=require('fs'); const p='shared/package.json'; const pkg=JSON.parse(fs.readFileSync(p)); pkg.main='./dist/index.js'; pkg.types='./dist/index.d.ts'; pkg.exports={'.':{types:'./dist/index.d.ts',import:'./dist/index.js'}}; fs.writeFileSync(p, JSON.stringify(pkg));"

EXPOSE 3000

CMD ["sh", "-c", "node backend/dist/db/migrate.js && node backend/dist/index.js"]
