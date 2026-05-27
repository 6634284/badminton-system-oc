FROM node:20-alpine AS builder

ARG APP_NAME=client-api

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npx nest build ${APP_NAME}

FROM node:20-alpine AS runner

ARG APP_NAME=client-api

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/polyfills ./polyfills

ENV NODE_ENV=production

EXPOSE 3000

CMD ["sh", "-c", "node dist/apps/${APP_NAME}/src/main.js"]
