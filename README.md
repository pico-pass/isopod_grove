# 🪲 ISOPOD GROVE (콩벌레 숲)

콩벌레(등각류)를 키우고 모으고 싸우게 하는 **브라우저 방치형 육성 게임**이에요.
사육장을 가꿔 식구를 늘리고, 숲을 탐색해 새로운 종을 만나고, 전투·장비·보스 타워로 성장하고, 친구와 채팅하고 우편으로 보상을 받아요.

- 서비스 주소: <https://isopogrove.click>
- 로그인: Google 계정

---

## 목차

1. [주요 기능](#주요-기능)
2. [기술 스택](#기술-스택)
3. [프로젝트 구조](#프로젝트-구조)
4. [시작하기 (로컬 개발)](#시작하기-로컬-개발)
5. [환경 변수](#환경-변수)
6. [Docker로 실행](#docker로-실행)
7. [운영 배포](#운영-배포)
8. [게임 규칙 요약](#게임-규칙-요약)
9. [API 개요](#api-개요)
10. [개발 가이드](#개발-가이드)
11. [라이선스](#라이선스)

---

## 주요 기능

### 사육과 수집
- **사육장 관리**: 사육장마다 먹이·습도·온도를 돌봐요. 환경이 쾌적하면 식구가 번식하고 자동 수익이 나와요(자리를 비워도 최대 8시간까지 진행돼요).
- **등각류 도감**: 55종(일반 11 · 희귀 6 · 에픽 16 · 전설 14 · 신화 8)을 모아요. 새 종을 만나면 다이아를 받아요.
- **숲 탐색**: 탐색할 때마다 같은 종 2마리를 만나요. 등급 확률이 낮고 비용이 계속 올라가요.
- **분양 마켓**: 시세가 5분마다 ±25% 범위에서 오르내려요.
- **업그레이드**: 사육장 확장, 바닥재(수익), 번식 쉼터(번식 시간), 자동 먹이 공급기, 자동 분무기.
- **종 별명**: 내 화면에서만 보이는 별명을 지어줄 수 있어요.

### 전투와 성장
- **야생 배틀**: 상대 희귀도를 직접 골라 턴제로 싸워요. 종마다 전투 레벨이 따로 올라요.
- **전투 훈련**: 강도 3단계(가벼움·보통·강도 높음)와 극한 훈련(다이아 소모, 경험치 ×12).
- **투기장(PvP)**: 다른 유저가 정해 둔 방어 식구와 비동기로 싸우고 레이팅을 올려요. 이긴 상대에게는 30분 동안 재도전할 수 없어요.
- **보스 타워**: 50층, 5층마다 패턴 보스가 있어요. 난이도 4단계(쉬움·보통·어려움·매우 어려움)가 있고 깬 층은 난이도별로 따로 기록돼요.
- **장비**: 다이아 뽑기(천장 있음), 레벨업(중복 획득 개수 필요), 각성, 슬롯 확장. 야생 배틀·투기장·보스 타워에 모두 적용돼요.
- **업적 80종**과 **일일 퀘스트 4종**, **랭킹**(숲 레벨 · 분당 수익 · 투기장 레이팅 · 보스 타워).

### 소셜
- **친구**: 요청·수락·삭제, 하루 한 번 서로에게 다이아 선물(시스템이 지급하고 선물한 사람은 잃는 게 없어요), 접속 중 표시.
- **친구 채팅**: 친구끼리 1:1 채팅, 읽음 표시, 내 메시지 삭제, 메시지 신고.
- **공동 채팅방**: 자유방·질문방·문의방 3개 채널과 현재 접속자 목록.
- **프로필**: 닉네임(다이아로 변경)과 프로필 메시지, 다른 유저 프로필 보기.

### 우편함과 알림
- **우편함**: 운영자가 보낸 메시지와 자원(골드·다이아·탐색권)을 받아요.
- **웹 푸시 알림**: 친구 메시지·우편이 오면 브라우저로 알려줘요. 알림 종류별 켜기·끄기를 지원해요.

### 관리자 (서버 관리 페이지)
- 서버·경제 현황, **우편 발송**(전체/선택 유저, 프리셋, 발송 내역), **채팅 신고 처리**와 **채팅 정지**(N일, 해제).
- 관리자 지정은 `users` 컬렉션에서 해당 유저의 `isAdmin`을 `true`로 바꿔요(화면에서 바꾸는 기능은 없어요).

---

## 기술 스택

| 영역 | 사용 기술 |
|---|---|
| 백엔드 | NestJS 11, TypeScript, Mongoose 9, class-validator, Passport(Google OAuth · JWT), web-push |
| 데이터베이스 | MongoDB (Atlas 등) |
| 프론트엔드 | React 19, TypeScript, Vite 8 (상태관리 라이브러리 없이 훅 사용) |
| 실시간 | WebSocket 없이 **폴링**(게임 상태 5초, 채팅 3~4초, 우편 1분 등) |
| 배포 | pm2 + nginx(정적 파일 + `/api` 프록시), 또는 Docker |

---

## 프로젝트 구조

```
isopod_grove/
├── backend/                 NestJS API 서버
│   └── src/
│       ├── game-state/      게임 핵심: 상태·돌봄·전투·장비·탐색·보스
│       │   └── game-engine.ts   순수 계산 로직(상수·공식·전투 시뮬레이션)
│       ├── species/ upgrades/ quests/ achievements/   콘텐츠 데이터(시드)
│       ├── equipment/ boss/     장비 카탈로그, 보스 층 정보
│       ├── auth/ users/         Google 로그인, JWT, 사용자
│       ├── friends/ friend-chat/ chat/ presence/   소셜
│       ├── mail/ push/          우편함, 웹 푸시
│       └── leaderboard/ admin/  랭킹, 관리자
├── frontend/                React + Vite SPA
│   ├── public/sw.js         푸시 알림 서비스 워커
│   ├── nginx/               Docker 이미지용 nginx 설정
│   └── src/
│       ├── components/      화면(사육장·마켓·전투·보스·장비·친구·우편함·관리자 …)
│       ├── hooks/           useGameEngine(상태 로딩·주기 갱신), useBattleReplay
│       ├── utils/           gameCalc.ts(서버 계산식의 프론트 사본), push.ts
│       └── api/             API 클라이언트와 타입
└── docker-compose.yml       백엔드 + 프론트엔드(nginx) 함께 실행
```

---

## 시작하기 (로컬 개발)

### 준비물
- Node.js 22 이상 (운영 서버와 Docker 이미지는 24)
- MongoDB 접속 주소 (로컬 MongoDB 또는 Atlas)
- Google OAuth 클라이언트 (Google Cloud Console → 사용자 인증 정보)
  - 승인된 리디렉션 URI: `http://localhost:3000/api/auth/google/callback`

### 백엔드

```bash
cd backend
cp .env.example .env      # 값을 채운다(아래 환경 변수 표 참고)
npm install
npm run start:dev         # http://localhost:3000/api  (파일을 바꾸면 자동으로 다시 시작)
```

서버가 시작될 때 종·업그레이드·퀘스트·업적 데이터가 DB에 자동으로 반영돼요(시딩).

### 프론트엔드

```bash
cd frontend
cp .env.example .env      # VITE_API_URL=http://localhost:3000/api
npm install
npm run dev               # http://localhost:5173
```

로그인하면 백엔드가 `FRONTEND_URL/auth/callback?token=...`으로 돌려보내고, 프론트가 토큰을 저장해요(JWT 유효기간 7일).

### 자주 쓰는 명령

| 위치 | 명령 | 설명 |
|---|---|---|
| backend | `npm run build` | 컴파일(`dist/`) |
| backend | `npm run start:prod` | 컴파일 결과로 실행 |
| backend | `npm run lint` / `npm test` | 린트 / 테스트(지금은 기본 예제 테스트만 있어요) |
| frontend | `npm run build` | 타입 검사 + 프로덕션 빌드(`dist/`) |
| frontend | `npm run lint` | 린트 |

---

## 환경 변수

### 백엔드 (`backend/.env`, `backend/.env.example` 참고)

| 변수 | 설명 |
|---|---|
| `PORT` | 서버 포트(기본 3000) |
| `MONGODB_URI` | MongoDB 접속 주소 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth 클라이언트 |
| `GOOGLE_CALLBACK_URL` | 로그인 콜백 주소. 예: `http://localhost:3000/api/auth/google/callback` |
| `FRONTEND_URL` | 로그인 후 돌아갈 프론트엔드 주소. 예: `http://localhost:5173` |
| `JWT_SECRET` | JWT 서명 키(`openssl rand -hex 32` 등으로 생성) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | 웹 푸시용 키. 비워 두면 푸시만 꺼져요. 생성: `npx web-push generate-vapid-keys` |

> `.env`는 git에 올라가지 않아요. 비공개 키와 비밀번호를 저장소에 커밋하지 마세요.

### 프론트엔드 (`frontend/.env`)

| 변수 | 설명 |
|---|---|
| `VITE_API_URL` | 백엔드 API 주소. 빌드할 때 코드에 박혀요. 예: `http://localhost:3000/api` 또는 같은 도메인이면 `/api` |

---

## Docker로 실행

백엔드·프론트엔드 각각 `Dockerfile`이 있고, `docker-compose.yml`로 함께 실행해요.

```bash
cp backend/.env.example backend/.env    # 값을 채운다. MongoDB는 외부(Atlas 등)를 가리켜요
docker compose up -d --build
# 접속: http://localhost:8080   (포트 변경: WEB_PORT=80 docker compose up -d)
```

- 프론트 컨테이너(nginx, 8080 포트)가 정적 파일을 서비스하고 `/api`를 백엔드 컨테이너로 프록시해요. 같은 도메인이라 CORS 설정이 필요 없어요.
- compose로 띄울 때는 `backend/.env`의 `FRONTEND_URL`을 `http://localhost:8080`으로, `GOOGLE_CALLBACK_URL`을 `http://localhost:8080/api/auth/google/callback`으로 바꾸고 Google 콘솔에도 같은 콜백 주소를 등록해야 로그인돼요.
- `VITE_API_URL`은 빌드 인자예요(기본 `/api`). 백엔드를 다른 주소로 따로 서비스하면 `--build-arg VITE_API_URL=...`로 넣어요.
- `.env`는 이미지에 들어가지 않고 실행할 때 주입돼요.

---

## 운영 배포

현재 운영 구성(참고용): 한 서버에서 **nginx**가 `frontend/dist`를 정적 서비스하고 `/api/`를 NestJS(**pm2**, 포트 3000)로 프록시해요.

```bash
# 백엔드
cd backend && npm ci && npm run build
pm2 restart backend            # 처음이면: pm2 start dist/main.js --name backend

# 프론트엔드
cd frontend && npm ci && npm run build   # VITE_API_URL=https://<도메인>/api
```

- **HTTPS가 필요해요**: Google 로그인 콜백과 웹 푸시(서비스 워커)는 HTTPS에서 동작해요.
- nginx는 `sw.js`와 `index.html`을 캐시하지 않게 해야 새 배포와 푸시 알림이 바로 반영돼요(Docker용 `frontend/nginx/default.conf.template` 참고).
- **단일 서버 프로세스를 전제로 해요**: 접속 정보, 채팅 도배 방지, 보스·투기장 동시 요청 잠금이 메모리에 있어요. 서버를 여러 대로 늘리려면 이 상태를 Redis 같은 공유 저장소로 옮겨야 해요.
- 일일 초기화(일일 퀘스트, 무료 탐색권 충전 등)는 **서버의 로컬 시간** 기준이에요.

---

## 게임 규칙 요약

> 수치는 `backend/src/game-state/game-engine.ts`와 시드 데이터(`*.seed-data.ts`)가 기준이에요. 조정할 때는 [개발 가이드](#개발-가이드)를 먼저 읽어 주세요.

### 등급별 수치

| 등급 | 종 수 | 탐색 확률 | 분양 기준가 | 마리당 분당 수익 | 번식 주기 |
|---|---|---|---|---|---|
| 일반 | 11 | 70% | 72 G | 2.7 G | 5분 |
| 희귀 | 6 | 20% | 180 G | 3.3 G | 20분 |
| 에픽 | 16 | 8% | 1,500 G | 4 G | 1시간 |
| 전설 | 14 | 1.9% | 9,000 G | 5 G | 4시간 |
| 신화 | 8 | 0.1% | 24,000 G | 6.2 G | 10시간 |

### 사육
- 환경이 **쾌적**(먹이 25 이상, 습도 65~85%, 온도 20~26°C)하면 수익 100%, 아니면 40%예요. 번식은 먹이 15 이상·습도 50~92%·온도 18~28°C에서만 돼요.
- 돌봄: 먹이 +30, 분무(습도 78%), 온도 조절(24°C). 같은 동작은 10초마다 한 번.
- 사육장은 최대 10개, 다음 사육장 비용은 `2,500 × 2.5^(보유 수 − 1)` G. 수용량은 기본 20마리에 확장 단계마다 +20.
- 분양할 때는 번식을 위해 2마리가 남아야 해요.
- 업그레이드: 공간 확장(5단계) · 바닥재(수익 +25%/단계, 5단계) · 번식 쉼터(번식 시간 −12%/단계, 5단계) · 자동 먹이 공급기 · 자동 분무기.

### 숲 탐색
- 첫 탐색 **500 G**, 탐색할 때마다 다음 비용이 **25 G씩 올라가요**(매일 초기화되지 않아요). 탐색권으로 한 탐색도 횟수에 포함돼요.
- **탐색권**은 골드로 살 수 없어요. 하루 1장 무료 충전(최대 5장까지), 일일 퀘스트·업적·우편 보상으로 얻어요. 탐색권을 쓰면 골드가 들지 않아요.

### 일일 퀘스트
먹이 3번(80 G) · 관찰 3번(60 G) · 새 식구 2마리(120 G) · 숲 탐색 1번(100 G + 탐색권 1장).

### 전투
- **야생 배틀**: 상대 희귀도를 골라요. 보상 10 / 25 / 70 / 180 / 450 G(등급별), 다이아 확률 4~14%. 쿨다운 8초, 최대 20턴, 능력치·피해 ±15% 편차.
- **전투 레벨**: 종마다 따로, 레벨당 능력치 +8%.
- **훈련**: 쿨다운 30초 / 2분 / 8분, 골드 소모. 극한 훈련은 다이아 4개를 더 쓰고 경험치가 12배.
- **투기장**: 시작 레이팅 1000, 승리 +18 / 패배 −12, 승리 보상 120 G(+8% 확률로 💎1), 쿨다운 10초. 이긴 상대에게는 30분간 재도전 불가. 연승 기록이 업적에 반영돼요.

### 보스 타워
- 50층, 5층마다 보스. 층마다 능력치가 15%씩(복리) 올라가요.
- **보스 패턴 5종**: 웅크리기(3턴마다 받는 피해 40%) · 분노(HP 50% 이하에서 공격 ×1.5) · 강타(4번째 공격 ×2) · 재생(매 턴 HP 3% 회복) · 가시갑옷(준 피해의 15% 반사). 30층 이후는 겹쳐요.
- 하루 **5회**, 전투 사이 **15분** 쿨타임.
- **난이도**: 쉬움 ×1 · 보통 ×1.5 · 어려움 ×2 · 매우 어려움 ×3. 배율은 보스 능력치와 골드·경험치 보상에 곱해져요. 깬 층은 난이도마다 따로 기록되고, 다이아·장비는 난이도별 첫 클리어마다 한 번씩 받아요.
- 보상: 첫 클리어 골드(200 + 120×층, 보스 층 ×3), 보스 층 첫 클리어 시 💎10과 장비 1개. 다시 이기면 골드 25%, 보스 층은 장비 복사본 40%·💎5(2%) 확률.

### 장비
- 뽑기 1회 💎40, 10연차 💎360(마지막에 희귀 이상 보장). 등급 확률 55 / 28 / 12 / 4 / 1%, **50회 연속** 전설 이상이 안 나오면 50번째는 확정.
- 종류: 무기(공격) · 방어구(방어) · 장신구(HP), 총 30종. 효과 = 등급별 기본값(2 / 3 / 5 / 7 / 10%) × (1 + 0.15 × (레벨 − 1) + 0.05 × 각성 횟수).
- 레벨업은 같은 장비를 **현재 레벨 수치만큼** 모아야 해요(수동). 최대 레벨(기본 5)에서 골드로 **각성**(성공 70%, 실패할 때마다 +5%p)하면 최대 레벨 +3, 효과 +5%.
- 슬롯은 기본 3칸, 4번째 💎500, 5번째 💎1,250.

### 성장과 보상
- 계정 레벨업마다 다이아 3개. 새 종을 처음 만나면 다이아(일반 1 ~ 신화 15).
- 닉네임 변경 💎200, 종 별명은 무료.
- 친구 선물: 하루 한 번 서로에게 💎2.

---

## API 개요

모든 주소는 `/api` 아래에 있어요. 로그인(`auth/google*`)과 종·업그레이드·퀘스트·업적 목록(`species`, `upgrades`, `quests`, `achievements`)은 로그인 없이 열려 있고, 나머지는 `Authorization: Bearer <JWT>`가 필요해요. 관리자 전용은 `admin/...`이고 관리자 계정만 접근할 수 있어요.

| 영역 | 경로 |
|---|---|
| 인증 | `GET auth/google` · `GET auth/google/callback` · `GET auth/me` · `POST auth/profile-message` |
| 콘텐츠 | `GET species` · `upgrades` · `quests` · `achievements` · `equipment` · `boss` |
| 게임 상태 | `GET game-state` · `POST game-state/{advance, care, observe, collect, explore, sell, upgrade, terrariums, move, claim, claim-achievement, set-nickname, species-nickname}` |
| 전투 | `POST game-state/{battle, train, pvp/defense, pvp/battle, boss/battle}` · `GET game-state/pvp/opponent` |
| 장비 | `POST game-state/equipment/{pull, level-up, awaken, equip, expand-slot}` |
| 프로필 | `GET game-state/profile/:userId` |
| 랭킹 | `GET leaderboard/{level, income, pvp, boss}` |
| 친구 | `GET friends` · `GET friends/search` · `POST friends/{request, accept, decline, remove, gift}` |
| 친구 채팅 | `GET friend-chat/unread` · `GET/POST friend-chat/:friendId/messages` · `DELETE friend-chat/:friendId/messages/:messageId` · `POST friend-chat/reports` |
| 공동 채팅·접속 | `GET/POST chat/messages` · `GET presence/online` |
| 우편함 | `GET mail` · `GET mail/summary` · `POST mail/claim-all` · `POST mail/:id/{claim, read}` · `DELETE mail/:id` |
| 푸시 | `GET push/config` · `GET/POST push/preferences` · `POST push/{subscribe, unsubscribe}` |
| 관리자 | `GET admin/stats` · `POST/GET admin/mail` · `GET admin/mail/users` · `GET admin/friend-chat/reports` · `POST admin/friend-chat/reports/:id/resolve` · `GET admin/chat-bans` · `POST admin/chat-bans/:userId/lift` |

요청 본문은 `class-validator`로 검증하고, 잘못된 값은 `400`과 한국어 오류 메시지로 돌려줘요.

---

## 개발 가이드

### 서버와 프론트에 같은 계산이 두 벌 있어요
미리보기(비용·스탯·진행도)를 화면에서 바로 보여주려고 일부 상수와 함수가 양쪽에 있어요. **값을 바꿀 때는 두 곳을 함께** 고쳐야 해요.

| 백엔드 | 프론트엔드 |
|---|---|
| `game-state/game-engine.ts` | `frontend/src/utils/gameCalc.ts` |

예: 탐색 비용(`EXPLORE_COST_*`), 장비 효과, 전투 스탯, 보스 난이도 진행도 필드, 업적 진행도 계산 등. 보스 층의 능력치·보상은 서버가 `GET /boss`로 내려줘서 프론트에 계산식이 없어요.

### 데이터의 기준
- 종·업그레이드·퀘스트·업적은 **시드 파일이 기준**이에요. 서버가 시작될 때마다 DB에 덮어써요(upsert). 종의 분양가와 분당 수익은 `species.seed-data.ts`의 `RARITIES` 한 곳에서 정해요.
- 장비 카탈로그(`equipment/equipment.data.ts`)와 보스 층 정보(`getBossFloor`)는 DB에 저장하지 않고 **코드가 기준**이에요.
- 새 업적 통계를 추가하려면 `AchievementStatKey`(백엔드 스키마), `game-engine.ts`의 `getAchievementProgress`, 프론트 `types.ts`·`gameCalc.ts`, 업적 아이콘(`AchievementsView.tsx`)을 함께 고쳐요.

### Mongoose 주의점
- `@Prop({ type: Types.ObjectId })`로 선언한 필드는 스키마상 `Mixed`예요. 쿼리할 때 문자열 id를 그대로 쓰면 매칭되지 않으니 **항상 `new Types.ObjectId(id)`로 변환**해요.
- `string | null` 같은 유니온 타입은 `@Prop({ type: String })`처럼 타입을 명시해야 해요(안 하면 서버가 시작 중에 죽어요).
- `.lean()`은 스키마 기본값을 채우지 않아요. 새 필드를 추가하면 예전 문서는 값이 없을 수 있으니 `?? 기본값`으로 읽어요.
- 배열은 원소를 직접 대입하지 말고 배열 전체를 다시 대입해야 변경이 저장돼요.

### 배포 전 점검 (권장)
`npm run build` 후 다른 포트에서 먼저 띄워서(`PORT=3099 node dist/main.js`) 정상 시작하는지 확인하고 나서 운영 프로세스를 재시작하면 잘못된 배포로 서비스가 죽는 것을 막을 수 있어요.

---

## 라이선스

[Mozilla Public License 2.0](LICENSE)
