# syntax=docker/dockerfile:1

# ISOPOD GROVE 프론트엔드(React + Vite) 이미지: 빌드한 정적 파일을 nginx로 서비스하고 /api는 백엔드로 넘긴다.
#   빌드:  docker build -t isopod-grove-frontend ./frontend
#   실행:  docker run -p 8080:8080 -e BACKEND_UPSTREAM=<백엔드 host:port> isopod-grove-frontend
#
# VITE_API_URL은 "빌드할 때" 코드에 박힌다(런타임에 바꿀 수 없다).
#   /api (기본)  같은 주소의 nginx가 /api를 백엔드로 프록시한다 → 같은 도메인이라 CORS 설정이 필요 없다.
#   https://api.example.com/api  백엔드를 다른 주소로 따로 서비스할 때: --build-arg VITE_API_URL=...

ARG NODE_VERSION=24
ARG NGINX_TAG=stable-alpine

# ---------- 1단계: 빌드 ----------
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# ---------- 2단계: nginx ----------
# nginx-unprivileged: root가 아닌 사용자로 실행되는 공식 변형 이미지(8080 포트).
FROM nginxinc/nginx-unprivileged:${NGINX_TAG} AS runner

# /etc/nginx/templates/*.template 는 컨테이너가 시작될 때 환경 변수가 치환되어 conf.d/에 만들어진다.
ENV BACKEND_UPSTREAM=backend:3000 \
    DNS_RESOLVER=127.0.0.11
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
