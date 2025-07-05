FROM node:20-alpine as build

WORKDIR /app/server

COPY package*.json ./

# Don't download Chromium browser for puppeteer, we will use the one from Alpine repositories
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN npm install

COPY . .

RUN npm run build

FROM node:20-alpine as production

# Install chromium and necessary dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nss-tools

WORKDIR /app/server

COPY --from=build /app/server/package*.json ./
COPY --from=build /app/server/node_modules ./node_modules
COPY --from=build /app/server/dist ./dist
COPY --from=build /app/server/prisma ./prisma

# Tell puppeteer to use the system-installed chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

EXPOSE 3000

CMD [ "node", "dist/index.js" ]