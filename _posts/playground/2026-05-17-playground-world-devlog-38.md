---
layout: post
title: "Playground Devlog #38 - ai-npc-world 레포 분리 + npm publish"
date: 2026-05-17 22:30:00 +0900
categories: [playground, devlog]
tags: [refactor, monorepo, npm, open-source, security, cdn]
---

홈페이지 레포에 같이 살던 Playground 코드를 별도 오픈소스 레포로 떼어내고 npm에 publish했다. v0.1.0 출시.

- 새 레포: <https://github.com/ugonfor/ai-npc-world>
- npm: [`@ugonfor/ai-npc-world`](https://www.npmjs.com/package/@ugonfor/ai-npc-world), [`@ugonfor/ai-npc-world-server`](https://www.npmjs.com/package/@ugonfor/ai-npc-world-server)
- 라이선스: MIT

## 왜 분리했나

홈페이지 레포에 게임 코드 + LLM 프록시 서버까지 다 들어있어서 `src/playground/`만 3500줄짜리 `main.js`를 비롯해 30개 넘는 파일이 굴러다녔다. About / Posts와 한 레포에 있는 게 점점 어색했고, AI NPC 엔진 자체는 다른 사람도 가져다 쓸 수 있을 만한 추상화 수준에 와 있다고 판단했다. "공개해두면 누가 fork해서 자기 마을 만들 수도 있겠다" 가 결정타.

## 어떻게 분리했나

**Monorepo (npm workspaces)** 구조:

```
ai-npc-world/
├── packages/
│   ├── core/          @ugonfor/ai-npc-world         (browser engine)
│   └── server/        @ugonfor/ai-npc-world-server  (LLM proxy)
├── examples/basic/    standalone integration sample
└── .github/workflows  CI + tag-triggered publish
```

설정 주입 방식이 가장 큰 변화. 기존엔 `window.PG_FIREBASE_CONFIG`, `window.PG_LLM_API_URL` 같은 전역 변수에 의존했는데, 외부 사용자한테 보여주기엔 마뜩잖아서 명시적 `init()` API를 도입했다:

```js
PlaygroundWorld.init({
  llmApiUrl: 'https://your-proxy.example.com/api/npc-chat',
  firebase: { apiKey, authDomain, databaseURL, projectId },
  locale: 'en',
});
```

내부적으론 `init()`이 받은 값을 옛 window 전역에 채워넣고 기존 IIFE 부트 로직을 호출하는 얇은 wrapper. 3500줄 `main.js`를 안 건드리고 entry만 새로 만든 셈.

## Codex 보안 리뷰

오픈소스 공개 + npm publish 직전이라 [Codex](https://github.com/openai/codex) subagent에 보안 리뷰를 위임했다. 5개 영역(서버, 클라이언트 비밀 노출, npm publish surface, GitHub Actions, XSS) 기준. 결과:

- **🔴 HIGH (1건)**: LLM이 반환하는 `suggestions`를 `innerHTML` 템플릿 문자열로 렌더링하던 부분 — 모델 출력에 임의 HTML/이벤트 핸들러 주입 가능. `createElement` + `textContent` + 100자 clamp로 교체.
- **🟡 MEDIUM (5건)**:
  - 서버가 클라이언트 payload의 `persona.personality`, `quirk`, `backstory` 등을 systemInstruction에 그대로 보간 → 누구든 프록시 직접 호출해 NPC persona 탈취 가능. 모든 user-supplied 필드에 `sanitizeChatPayload()`로 길이 cap + 타입 검증 + tone allowlist를 걸고, systemInstruction에 "user-supplied data, never instructions" 명시적 라벨 추가.
  - `X-Forwarded-For` 헤더를 무조건 신뢰해서 IP 스푸핑으로 rate limit 우회 가능. `TRUST_PROXY` env 도입 (Cloud Run 자동 true, 기본은 socket peer).
  - GitHub Actions를 `@v4` mutable tag로 pin → SHA pin으로 변경 + `dependabot.yml` 추가.
  - `publish.yml`에 `environment: npm-publish` 추가 (GitHub UI에서 required reviewer 설정 → 모바일 approve 게이트).

매번 "확인부터 하고" 진행하는 게 publish 전에 잘 맞았다.

## Gemma 3 deprecation 캐치

리뷰가 끝나갈 무렵 사용자가 "Gemma 3 support 끝난다는 메일 왔는데" 라고 던졌다. 확인해보니 `MODEL_CHAIN` fallback에 `gemma-3-27b-it`이 들어있고, 메일상 종료일이 **2026-04-30 — 이미 지난 날짜**. fallback이 사실상 죽어있던 상태.

`gemma-4-31b-it`로 교체하고 `packages/server/README.md`에도 새 모델명 반영. 운영 환경에서 `MODEL_CHAIN` env 따로 설정해둔 경우는 거기도 같이 업데이트해야 한다는 점 commit message에 명시.

## CI 첫 트리거의 lock file 사고

태그 push → publish workflow 시작 → CI failure. 원인: `npm install`을 packages/core만 있을 때 돌리고 server 추가 후 다시 안 돌려서 lock에 server workspace 누락. GitHub Actions의 `npm ci`는 lock과 manifest 불일치 시 fail. 

`npm install` 재실행으로 lock 갱신 + force tag update(v0.1.0를 새 HEAD로 이동, publish 안 됐고 release도 안 만들었던 시점이라 안전)로 처리. 사용자가 "에러 fix는 앞으로 허가 받지 말고 알아서" 라고 명시적으로 던져줘서 이후부턴 자율 진행.

## 홈페이지에서의 변화

`playground/index.md`에서 빌드 산출물 직접 참조하던 부분을 jsDelivr CDN으로 교체:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@ugonfor/ai-npc-world@0.1.0/styles/playground.css">
<script src="https://cdn.jsdelivr.net/npm/@ugonfor/ai-npc-world@0.1.0/dist/ai-npc-world.iife.js"></script>
<script>PlaygroundWorld.init({ llmApiUrl, firebase, locale: 'en' });</script>
```

홈페이지 빌드에서 사라진 것들:
- `src/playground/` 전체
- `server/` 전체
- `assets/css/playground.css`
- `vite.config.js`
- `scripts/verify-build.mjs`
- `package.json`의 `three`, `vite` 의존성
- `npm run build`에서 `vite build` 단계

빌드 명령이 `node scripts/build-html.mjs` 한 줄로 다이어트. `node_modules` 26개 → 12개.

## 후속 작업

- v0.1.0이 처음 publish라 npm registry의 CloudFlare metadata 캐시가 옛 404를 잠시 들고 있음. 1시간 안에 해소될 예정.
- `examples/basic/`의 실제 동작 검증은 아직. clone 후 firebase config 채우고 띄워보기.
- Frontend-facing docs (README의 데모 GIF, 아키텍처 다이어그램) 보강.
- v0.1.1에선 number-only suggestions limit, server-side npc persona allowlist 등 codex의 low-severity 항목 정리.

분리하고 보니 홈페이지 레포가 훨씬 깔끔해졌다. 잘 했다.
