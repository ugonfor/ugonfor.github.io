# README for Agents

이 문서는 이 저장소에서 작업하는 코드 에이전트를 위한 운영 메모입니다. 사용자-facing 설명은 `README.md`, 가치/방향성은 `CLAUDE.md`, 실제 빌드 로직은 `scripts/build-html.mjs`와 `scripts/site-config.mjs`를 우선 확인하세요.

가장 중요한 운영 원칙: 이 저장소는 최대한 단순하게 유지합니다. 새 도구, 새 런타임, 새 디렉터리, 큰 정적 자산을 추가하기 전에 기존 파일 수정으로 해결할 수 있는지 먼저 확인하세요.

## 현재 저장소 요약

- 개인 홈페이지 정적 사이트입니다.
- 운영 도메인: `https://ugonfor.kr`
- 배포: GitHub Actions가 `main` 브랜치 push 시 `npm run build`를 실행하고 `dist/`를 GitHub Pages에 배포합니다.
- 빌드 도구: Node.js ESM 스크립트 (`scripts/build-html.mjs`)
- 주요 런타임 의존성: 없음. 빌드 시 `gray-matter`, `marked`를 사용합니다.
- Playground 게임 엔진은 이 저장소에 없습니다. `/playground` 페이지가 jsDelivr CDN의 `@ugonfor/ai-npc-world@0.1.1` CSS/JS를 로드하고 `PlaygroundWorld.init(...)`을 호출합니다.

## 자주 쓰는 명령

```bash
npm install
npm run build
npm run dev
```

- `npm run build`: Markdown/front matter를 읽어 `dist/`에 정적 HTML을 생성합니다.
- `npm run dev`: 빌드 후 `dist/`를 `localhost:4000`에서 서빙합니다. 내부적으로 `npx serve dist -l 4000`을 사용하므로 `serve` 다운로드가 필요할 수 있습니다.
- 이 저장소에는 별도 테스트 스크립트가 없습니다. 변경 후 최소한 `npm run build`로 검증하세요.

## 주요 파일

```text
.
├── index.md                    # 홈 페이지 본문
├── about/index.md              # Legacy About 원본. 현재 빌드는 /about을 /로 리다이렉트함
├── playground/index.md         # Playground DOM 쉘과 init 설정
├── _posts/                     # 글 원본 Markdown
│   ├── lecture/
│   └── playground/
├── assets/
│   ├── css/                    # 사이트 스타일
│   ├── js/                     # 소형 공용 JS
│   ├── img/, images/           # 이미지 자산
│   └── files/                  # PDF 등 문서
├── scripts/
│   ├── build-html.mjs          # 정적 사이트 빌더
│   └── site-config.mjs         # 사이트 메타데이터, 링크, Playground 설정
├── dist/                       # 빌드 산출물. 직접 편집하지 말 것
├── .github/workflows/deploy.yml
├── CLAUDE.md
├── README.md
└── package.json
```

## 빌드 동작

`scripts/build-html.mjs`가 다음 일을 합니다.

1. 실제로 배포에 필요한 정적 자산 allowlist와 `CNAME`, `robots.txt`를 `dist/`로 복사합니다.
2. `index.md`를 `dist/index.html`로 렌더링합니다.
3. `about/index.html`은 홈(`/`)으로 리다이렉트하는 HTML로 생성합니다.
4. `playground/index.md`의 Liquid 스타일 토큰을 `site-config.mjs` 값으로 치환해 `dist/playground/index.html`을 만듭니다.
5. `_posts/**/*.md`를 스캔해 front matter와 본문을 파싱하고 개별 글 및 `dist/posts/index.html`을 생성합니다.

빌드는 시작 시 `dist/`를 비우고 다시 생성합니다.

## 콘텐츠 수정 가이드

- 홈 내용은 `index.md`를 수정합니다.
- 사이트 이름, 직함, 링크, publication 데이터, Playground API/Firebase 설정은 `scripts/site-config.mjs`를 수정합니다.
- 사이트 스타일은 주로 `assets/css/landing.css`, `assets/css/custom-theme.css`, `assets/css/top-menu.css`, `assets/css/post.css`를 확인합니다.
- 새 글은 `_posts/<category>/YYYY-MM-DD-slug.md` 형식으로 추가합니다.
- 글 front matter에는 보통 `title`, `date`, `categories`, `tags`를 둡니다. URL은 첫 번째/이후 카테고리와 날짜, slug로 생성됩니다.
- `dist/`는 빌드 산출물이므로 원본 변경은 `index.md`, `playground/index.md`, `_posts/`, `assets/`, `scripts/` 쪽에 하세요.

## Playground 작업 시 주의

- 이 저장소의 `playground/index.md`는 UI 컨테이너와 CDN 로딩 코드만 갖고 있습니다.
- 실제 게임 로직, 렌더러, NPC 동작, 패키지 빌드는 별도 저장소 `https://github.com/ugonfor/ai-npc-world` 영역입니다.
- 이 저장소에서 할 수 있는 Playground 변경은 주로 다음 범위입니다.
  - 페이지 DOM 쉘 수정
  - CDN 패키지 버전 변경
  - `scripts/site-config.mjs`의 LLM API, Turnstile, Firebase 설정 변경
  - 주변 CSS/메타데이터 조정
- 엔진 API가 바뀌면 `playground/index.md`와 `scripts/build-html.mjs`의 hard-coded CDN 버전을 함께 확인하세요.

## 작업 원칙

- 먼저 주변 파일의 스타일을 확인하고, 기존 구조를 유지하세요.
- 단순성을 우선하세요. 쓰지 않는 코드와 자산을 늘리지 말고, 기능 변경과 무관한 파일은 추가하지 마세요.
- `CLAUDE.md`의 제품 방향성을 우선 존중하세요. 특히 Playground는 수치/게이미피케이션보다 기억, 분위기, 느린 마을 경험을 지향합니다.
- 사용자가 개발 로그 작성을 요청하거나 작업 규모가 의미 있게 크면 `_posts/playground/`에 DevLog 추가를 고려하세요.
- 외부 설명과 실제 코드가 다르면 실제 코드와 빌드 스크립트를 기준으로 판단하고, 필요하면 문서도 같이 정리하세요.
- 보안 키나 비밀값을 커밋하지 마세요. 현재 `site-config.mjs`의 Firebase 값은 클라이언트 공개 설정으로 취급됩니다.

## 변경 후 확인

```bash
npm run build
```

확인할 것:

- 빌드가 에러 없이 끝나는지
- 수정한 페이지가 `dist/`에 반영되는지
- 링크가 절대경로(`/...`)와 상대경로 사이에서 깨지지 않는지
- Playground 관련 변경이면 CDN URL, `PlaygroundWorld.init(config)`, Firebase/LLM 설정 치환 결과가 올바른지
