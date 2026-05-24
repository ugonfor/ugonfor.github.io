# ugonfor.github.io

Hyogon Ryu 개인 홈페이지 저장소입니다.

- 운영 도메인: `https://ugonfor.kr`
- 배포: GitHub Actions → GitHub Pages
- 빌드: Node.js 정적 HTML 생성 (`scripts/build-html.mjs`)
- Playground 엔진: CDN의 `@ugonfor/ai-npc-world`

## 실행

```bash
npm install
npm run build
npm run dev
```

- `npm run build`: `dist/`를 비우고 정적 사이트를 다시 생성합니다.
- `npm run dev`: 빌드 후 `dist/`를 `localhost:4000`에서 서빙합니다.

## 구조

```text
.
├── index.md                    # 홈 페이지
├── playground/index.md         # Playground 페이지 쉘
├── _posts/                     # 글 원본
├── assets/                     # CSS, 이미지, PDF 등 정적 자산
├── scripts/
│   ├── build-html.mjs          # 정적 사이트 빌더
│   └── site-config.mjs         # 사이트 설정
├── dist/                       # 빌드 산출물, 커밋하지 않음
├── CNAME
├── package.json
└── README-for-agent.md
```

## 콘텐츠 수정

- 홈 문구: `index.md`
- Playground 페이지: `playground/index.md`
- 사이트 메타데이터, 링크, Playground API/Firebase 설정: `scripts/site-config.mjs`
- 글: `_posts/**/*.md`
- 스타일: `assets/css/`

`dist/`는 산출물이므로 직접 수정하지 않습니다.

## Playground

이 저장소는 Playground 엔진을 직접 포함하지 않습니다. `playground/index.md`가 jsDelivr에서 `@ugonfor/ai-npc-world@0.1.1` CSS/JS를 로드하고 `PlaygroundWorld.init(config)`를 호출합니다.

게임 로직, 렌더러, NPC 동작 변경은 별도 저장소에서 처리합니다.

## 배포

`main` 브랜치에 push하면 `.github/workflows/deploy.yml`이 `npm ci`, `npm run build`를 실행하고 `dist/`를 GitHub Pages에 배포합니다.
