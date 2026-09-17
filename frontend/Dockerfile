FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Same-origin relative path by default: the reverse-proxy Nginx routes /api/* to the api
# service, so the SPA never needs to know a real hostname. Override at build time
# (--build-arg VITE_API_BASE_URL=https://api.example.com/api/v1) only for a setup where the
# frontend and API are served from different origins.
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
# wget ships with Alpine's busybox — no extra package needed.
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
    CMD wget -q -O - http://localhost/healthz || exit 1
