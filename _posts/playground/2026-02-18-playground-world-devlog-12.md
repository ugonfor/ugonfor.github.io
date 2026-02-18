---
layout: post
title: "Playground Devlog #12 - 리포지토리 리팩토링: Vite 도입과 모듈 분리"
date: 2026-02-18 23:59:30 +0900
categories: [playground, devlog]
tags: [refactoring, vite, build, modules, github-actions, ci-cd]
---

`playground-world.js`가 5,932줄짜리 단일 파일이었습니다. 기능을 추가할 때마다 스크롤을 오르내리고, 함수 이름이 충돌하지 않는지 확인하고, 전역 변수를 추적해야 했습니다. 유지보수 한계에 도달해서 리팩토링을 시작했습니다.

## 1단계: 리포지토리 구조 정리

코드를 건드리기 전에 리포 자체를 먼저 정리했습니다.

- **강의 PDF 이동:** 루트에 있던 강의 자료 PDF들을 `assets/files/` 하위로 이동. 루트 디렉토리가 깔끔해졌습니다.
- **`_config.yml` exclude 정리:** Jekyll이 빌드하지 않아야 할 파일들(`node_modules`, `server/`, `src/` 등)을 exclude 목록에 추가했습니다.
- **`.gitignore` 정리:** `dist/`, `node_modules/`, 빌드 산출물 등을 추가하여 불필요한 파일이 커밋되지 않도록 했습니다.

## 2단계: Vite 빌드 도구 도입

5,932줄을 모듈로 쪼개려면 빌드 도구가 필요했습니다. **Vite**를 선택한 이유:

- ES Module 기반으로 개발 서버가 빠름
- Library 모드로 IIFE 번들 출력 가능 — 기존 Jekyll 페이지와 호환
- 설정이 간결함

### 빌드 구성

```javascript
// vite.config.js — library 모드, IIFE 출력
build: {
  lib: {
    entry: 'src/main.js',
    formats: ['iife'],
    name: 'PlaygroundWorld'
  },
  outDir: 'assets/js',
  rollupOptions: { /* ... */ }
}
```

`npm run build`를 실행하면 `src/` 아래 모듈들이 하나의 `playground-world.js`로 번들링됩니다. 기존과 동일한 경로에 동일한 형태의 파일이 나오므로 Jekyll 페이지는 수정할 필요가 없었습니다.

### 검증 스크립트

빌드할 때마다 기존 코드와의 호환성을 자동 검증하는 스크립트를 만들었습니다.

- **DOM ID 42개** — `getElementById`, `querySelector` 등으로 참조하는 HTML 요소들이 빌드 결과에 모두 존재하는지 확인
- **localStorage 키 6개** — 세이브/로드에 쓰이는 키가 빠지지 않았는지 확인
- **핵심 함수 9개** — `initGame`, `gameLoop`, `handleResize` 등 외부에서 호출되는 함수가 export되었는지 확인

하나라도 누락되면 빌드가 실패합니다. 모듈을 분리하면서 실수로 참조가 끊기는 것을 방지합니다.

## GitHub Actions: 빌드 → 배포 파이프라인

기존에는 Jekyll만 빌드하면 됐지만, 이제는 Vite 빌드가 선행되어야 합니다.

```
Push → Vite Build (npm run build) → 검증 스크립트 → Jekyll Build → GitHub Pages 배포
```

GitHub Actions 워크플로우에 Node.js 세팅과 `npm ci && npm run build` 단계를 추가했습니다. Vite 빌드나 검증이 실패하면 배포가 중단됩니다.

## 3단계: JS 모듈 분리 (진행중)

5,932줄을 한 번에 쪼개면 위험하므로, 의존성이 적은 유틸리티부터 분리하고 있습니다.

**첫 번째 분리: `src/utils/helpers.js`**

- 순수 함수들(좌표 변환, 거리 계산, 랜덤 선택 등)을 별도 모듈로 추출
- 게임 상태에 의존하지 않아 독립적으로 테스트 가능
- `src/main.js`에서 import하여 기존과 동일하게 동작

나머지 코드는 아직 `src/main.js`에 그대로 있습니다. 검증 스크립트가 통과하는 것을 확인하면서 점진적으로 분리할 예정입니다.

## 향후 계획

- **모듈 분리 계속:** renderer, input, npc, quest, ui 등 기능 단위로 분리
- **건물 인테리어:** 건물에 들어가면 내부가 보이는 기능 추가 예정
