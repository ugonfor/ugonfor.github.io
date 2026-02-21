# ugonfor.github.io

Hyogon Ryu 개인 홈페이지 저장소입니다.
Node.js 프리빌드 + Vite 기반 정적 사이트에, Playground용 LLM 프록시(`server/`)가 별도 서비스로 결합된 구조입니다.

- 운영 도메인: `https://ugonfor.kr`
- 빌드: Node.js prebuild (`build-html.mjs`) + Vite (IIFE 번들)
- 배포: GitHub Actions → GitHub Pages
- 동적 백엔드: Node.js LLM Proxy (Google Gemini API)

## 주요 기능

- 이력/연구/링크 중심 개인 홈페이지
- `Posts` 페이지 기반 개발 로그 아카이브
- `Playground` 페이지:
  - 캔버스 기반 오픈월드 시뮬레이션
  - NPC 상호작용 및 LLM 채팅
  - 퀘스트, 날씨, 경제, 업적, 발견 시스템
  - Firebase 멀티플레이어 지원
  - 모바일 조이스틱/액션 버튼 지원
- 보안/운영 제어:
  - CORS Origin allowlist
  - IP rate limit
  - 선택적 Cloudflare Turnstile 검증

## 저장소 구조

```text
.
├── index.md                        # 홈 페이지 (랜딩)
├── about/index.md                  # About Me 페이지
├── playground/index.md             # Playground 페이지
├── _posts/                         # 포스트 마크다운 소스
│   ├── lecture/
│   └── playground/
├── src/playground/                 # 게임 JS 소스 (Vite가 번들)
│   ├── main.js                     # 엔트리포인트
│   ├── core/constants.js           # 상수/설정
│   └── utils/helpers.js            # 순수 유틸 함수
├── assets/
│   ├── css/                        # 스타일시트
│   ├── js/playground-world.js      # Vite 빌드 출력물
│   ├── img/                        # 이미지
│   └── files/                      # PDF 등 문서
├── scripts/
│   ├── site-config.mjs             # 사이트 설정 (title, API URL 등)
│   ├── build-html.mjs              # HTML 생성 (레이아웃, 페이지, 포스트)
│   └── verify-build.mjs            # 빌드 검증 (DOM ID, localStorage 키 등)
├── vite.config.js                  # Vite 빌드 설정
├── package.json                    # npm 의존성 및 스크립트
├── dist/                           # 빌드 출력 (GitHub Pages 배포용)
├── server/
│   ├── llm-proxy.mjs               # LLM/NPC API 프록시 서버
│   ├── .env.example                # 서버 환경변수 예시
│   ├── Dockerfile                  # Cloud Run 배포용
│   └── README.md                   # 서버 배포 메모
└── .github/workflows/deploy.yml    # GitHub Actions 배포
```

## 요구사항

- Node.js 20+
- Google AI API Key (`GOOGLE_API_KEY`) — 프록시 서버용

## 로컬 실행

### 1) 사이트 빌드 및 실행

```bash
npm install
npm run build    # HTML 생성 → Vite 번들 → 빌드 검증
npm run dev      # 빌드 후 localhost:4000에서 서빙
```

### 2) LLM 프록시 실행

```bash
cd server
cp .env.example .env
# .env에 GOOGLE_API_KEY 등 실제 값 설정

node --env-file=.env llm-proxy.mjs
```

기본 주소: `http://127.0.0.1:8787`

헬스체크:

```bash
curl http://127.0.0.1:8787/healthz
```

### 3) 사이트와 프록시 연결

`scripts/site-config.mjs`의 `playgroundLlmApi`를 로컬 주소로 변경:

```js
playgroundLlmApi: "http://127.0.0.1:8787/api/npc-chat"
```

변경 후 `npm run build`를 다시 실행하세요.

## 빌드 시스템

```
npm run build
├── node scripts/build-html.mjs     # 마크다운 → HTML, 레이아웃 적용, dist/에 출력
├── vite build                       # src/playground/main.js → dist/assets/js/playground-world.js
└── node scripts/verify-build.mjs   # DOM ID 42개, localStorage 키 6개, 핵심 패턴 9개 검증
```

- `scripts/site-config.mjs` — 사이트 메타데이터, API 엔드포인트 등 설정
- `scripts/build-html.mjs` — 레이아웃 렌더링, 페이지/포스트 HTML 생성, 정적 파일 복사
- `scripts/verify-build.mjs` — 빌드 결과물 무결성 자동 검증
- devDependencies: `vite`, `gray-matter`, `marked`

## 배포

### 정적 사이트

GitHub Actions가 `main` 브랜치 push 시 자동 빌드/배포합니다.
`.github/workflows/deploy.yml` → `npm run build` → `dist/` → GitHub Pages

### 프록시 서버 (Cloud Run)

`server/README.md`의 절차를 참고하세요.

핵심 포인트:
- `GOOGLE_API_KEY` 필수
- `ALLOWED_ORIGINS`에 실제 도메인 등록 필수
- 운영 환경에서 `PROXY_AUTH_TOKEN`, `TURNSTILE_SECRET_KEY` 설정 권장

## 주요 환경변수 (`server/.env`)

- `GOOGLE_API_KEY`: Gemini API 키
- `MODEL_CHAIN`: 모델 fallback 순서 (쉼표 구분)
- `ALLOWED_ORIGINS`: 허용 Origin 목록
- `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`: 요청 제한
- `MAX_BODY_BYTES`: 요청 본문 크기 제한
- `PROXY_AUTH_TOKEN` (선택): 인증 헤더 강제
- `TURNSTILE_SECRET_KEY` (선택): 사람 인증 강제

## 콘텐츠 관리

- 홈 페이지: `index.md`
- About 페이지: `about/index.md`
- Playground: `playground/index.md` + `src/playground/`
- 사이트 설정: `scripts/site-config.mjs`
- 개발 로그 포스트: `_posts/**/*.md`

## 라이선스

- 코드/콘텐츠 라이선스: `LICENSE`
