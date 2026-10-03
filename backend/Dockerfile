# syntax=docker/dockerfile:1

# ISOPOD GROVE 백엔드(NestJS) 이미지.
#   빌드:  docker build -t isopod-grove-backend ./backend
#   실행:  docker run --env-file backend/.env -p 3000:3000 isopod-grove-backend
# 환경 변수(.env)는 이미지에 넣지 않고 실행할 때 주입한다(.dockerignore가 .env를 제외한다).

ARG NODE_VERSION=24

# ---------- 1단계: 빌드 ----------
# 개발 의존성까지 설치해서 TypeScript를 컴파일한다. 이 단계의 node_modules는 최종 이미지에 들어가지 않는다.
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# ---------- 2단계: 운영 의존성 ----------
# 실행에 필요한 패키지만 따로 설치해서 이미지를 가볍게 유지한다.
FROM node:${NODE_VERSION}-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---------- 3단계: 실행 ----------
FROM node:${NODE_VERSION}-alpine AS runner
# tini: 컨테이너의 PID 1로 종료 신호(SIGTERM)를 앱에 전달하고 좀비 프로세스를 정리한다.
# (node가 PID 1이면 SIGTERM을 무시해서 `docker stop`이 10초 기다렸다가 강제 종료된다.)
RUN apk add --no-cache tini

ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./

# root가 아닌 기본 사용자(node)로 실행한다.
USER node
EXPOSE 3000

# GET /api 가 200이면 정상(NestJS 전역 접두사 'api').
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/api" || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
