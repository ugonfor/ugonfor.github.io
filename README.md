# ugonfor.github.io

Hyogon Ryu 개인 홈페이지 저장소입니다.  
GitHub Pages(Jekyll) 기반 정적 사이트에, Playground용 LLM 프록시(`server/`)가 별도 서비스로 결합된 구조입니다.

- 운영 도메인: `https://ugonfor.kr`
- 정적 사이트: Jekyll (`remote_theme: yaoyao-liu/minimal-light`)
- 동적 기능: Node.js LLM Proxy (Google Gemini API 연동)

## 주요 기능

- 이력/연구/링크 중심 개인 홈페이지
- `Posts` 페이지 기반 개발 로그 아카이브
- `Playground` 페이지:
  - 캔버스 기반 오픈월드 시뮬레이션
  - NPC 상호작용 및 채팅
  - 공유 NPC 생성 API 연동
  - 모바일 조이스틱/액션 버튼 지원
- 보안/운영 제어:
  - CORS Origin allowlist
  - 간단한 IP rate limit
  - 선택적 `X-Proxy-Token`
  - 선택적 Cloudflare Turnstile 검증

## 저장소 구조

```text
.
├── _config.yml                 # 사이트 설정 + Playground API endpoint
├── index.md                    # 메인(About/Experience/Education)
├── _posts/                     # devlog/요구사항 포스트
├── posts/index.html            # 포스트 목록 페이지
├── playground/index.md         # Playground 페이지
├── assets/js/playground-world.js
├── assets/css/playground.css
├── _includes/                  # publications/services include
├── _data/publications.yml      # publication 데이터
├── server/
│   ├── llm-proxy.mjs           # LLM/NPC API 프록시 서버
│   ├── .env.example            # 서버 환경변수 예시
│   ├── Dockerfile              # Cloud Run 배포용
│   └── README.md               # 서버 배포 메모
└── Gemfile                     # Jekyll 로컬 실행 의존성
```

## 요구사항

### 사이트(Jekyll)

- Ruby 2.6+ (현재 `Gemfile` 기준)
- Bundler

### 프록시 서버

- Node.js 20+ 권장
- Google AI API Key (`GOOGLE_API_KEY`)

## 로컬 실행

### 1) 정적 사이트 실행

```bash
bundle install
bundle exec jekyll serve
```

기본 주소: `http://127.0.0.1:4000` 또는 `http://localhost:4000`

### 2) LLM 프록시 실행

```bash
cd server
cp .env.example .env
# .env에 GOOGLE_API_KEY 등 실제 값 설정

# 의존 패키지 없음 (Node 내장 모듈만 사용)
node --env-file=.env llm-proxy.mjs
```

기본 주소: `http://127.0.0.1:8787`

헬스체크:

```bash
curl http://127.0.0.1:8787/healthz
```

### 3) 사이트와 프록시 연결

루트 `_config.yml`의 `playground_llm_api`를 로컬 주소로 바꿔서 테스트할 수 있습니다.

```yaml
playground_llm_api: "http://127.0.0.1:8787/api/npc-chat"
```

변경 후 `jekyll serve`를 재시작하세요.

## 배포

### 정적 사이트

- GitHub Pages로 배포 (기본 `remote_theme` 사용)
- `_config.yml`의 `canonical`, 링크, 프로필 정보 관리

### 프록시 서버 (Cloud Run 예시)

`server/README.md`의 절차를 사용합니다.

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
- `TURNSTILE_EXPECTED_HOSTNAMES` (선택): Turnstile hostname 제한

## 콘텐츠 관리

- 메인 페이지: `index.md`
- Publications 데이터: `_data/publications.yml`
- 서비스/리뷰어 목록: `_includes/services.md`
- 개발 로그 포스트: `_posts/*.md`

`_config.yml`에 `future: true`가 설정되어 있어 미래 날짜 포스트도 목록에 노출됩니다.

## 라이선스

- 코드/콘텐츠 라이선스: `LICENSE`
- 테마 기반: `yaoyao-liu/minimal-light`
