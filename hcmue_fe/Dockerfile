FROM node:24.11-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=/api
ARG VITE_USE_MOCK=false
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_USE_MOCK=$VITE_USE_MOCK

RUN npm run build

FROM alpine:3.20

WORKDIR /app

# This image only owns the FE build output; nginx remains in init/nginx.
COPY --from=build /app/dist ./dist

CMD ["sh", "-c", "rm -rf /dist/* && cp -r /app/dist/* /dist/"]
