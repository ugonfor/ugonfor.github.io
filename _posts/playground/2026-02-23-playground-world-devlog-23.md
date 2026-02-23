---
layout: post
title: "Playground Devlog #23 - main.js 모듈화: 7034줄 → 4303줄"
date: 2026-02-23 18:00:00 +0900
categories: [playground, devlog]
tags: [modularization, refactoring, code-organization, systems]
---

7000줄짜리 단일 파일을 4개 모듈로 분할하고, 1780줄의 사용하지 않는 2D 렌더러를 삭제했습니다.

## 문제

`main.js`가 하나의 IIFE 안에 게임 전체 로직을 담고 있었습니다:
- 날씨, 퀘스트, 멀티플레이어, NPC, 채팅, 입력, 렌더링, 저장/불러오기
- 7034줄 — 스크롤만으로 함수를 찾기 어려운 수준
- 새 기능 추가 시 영향 범위 파악 불가

## 원칙

1. **main.js는 오케스트레이터로 남긴다** — 상태 선언 + 게임 루프 + 모듈 조합
2. **모듈은 상태를 가지지 않는다** — 함수 파라미터로 받는다 (DI)
3. **점진적 추출** — 하나씩 옮기고, 매번 빌드 검증
4. **실용주의** — 클로저 의존이 너무 깊으면 무리하지 않는다

## 추출된 모듈

### 1. `systems/weather.js` (~130줄)
서울 실시간 날씨 API + 날씨 파티클 시뮬레이션.

```js
export function createWeatherState() { ... }
export function updateWeather(weather, dt, apiUrl) { ... }
export function updateWeatherParticles(weather, particles, dt, w, h, hour) { ... }
```

가장 독립적이라 첫 번째로 추출. main.js에서는 래퍼 한 줄로 호출:

```js
function updateWeather(dt) {
  _updateWeather(weather, dt, WEATHER_API_URL);
  _updateWeatherParticles(weather, weatherParticles, dt, canvas.width, canvas.height, hourOfDay());
}
```

### 2. `systems/multiplayer.js` (~170줄)
Firebase Realtime DB 기반 멀티플레이어. 파일 하단에 고립되어 있어서 깔끔하게 추출.

```js
export function createMultiplayer(ctx) {
  return { init, broadcast, interpolate, cleanStale, sendMessage, onlineCount, remotePlayerList };
}
```

`ctx` 객체로 `player`, `world`, `addChat` 등을 전달.

### 3. `systems/npc-data.js` (~95줄)
NPC 팩토리, 메모리 관리, 관계 톤.

```js
export function makeNpc(id, name, color, home, work, hobby, ...) { ... }
export function ensureMemoryFormat(npc) { ... }
export function addNpcMemory(npc, type, summary, metadata, totalMinutes) { ... }
export function getNpcMemorySummary(npc, t) { ... }
export function getMemoryBasedTone(npc) { ... }
```

순수 함수에 가까워서 추출이 쉬웠습니다.

### 4. `systems/quest.js` (~510줄)
11개 퀘스트 템플릿, 생성/진행/완료 로직, 게시판 UI.

```js
export const questTemplates = [...];
export function generateDynamicQuest(ctx) { ... }
export function handleDynamicQuestProgress(npc, ctx) { ... }
export function completeDynamicQuest(ctx) { ... }
```

가장 복잡한 추출. `questCtx()` 팩토리로 15개 이상의 클로저 변수를 ctx 객체로 조립:

```js
function questCtx() {
  return {
    quest, questHistory, get questCount() { return questCount; },
    npcs, inventory, relations, player,
    addChat, t, addNpcMemory, npcById, getNpcRelation, ...
  };
}
```

## 2D 렌더러 삭제 (~1780줄)

`USE_3D = true`가 기본이고, 3D 렌더러(`renderer/`)가 모든 렌더링을 담당합니다. 2D 캔버스 렌더링 코드는 폴백용이었지만, 실제로 사용되지 않으므로 삭제했습니다.

삭제된 함수들:
- `drawWorld`, `drawGround`, `drawBuilding`, `drawEntity`, `drawProp`
- `drawWeatherEffects`, `drawLampGlow`, `drawFireflies`, `drawDiscoverySparkles`
- `drawInteriorGround/Walls/Furniture/ExitHotspot`
- `drawSpeechBubbles`, `drawTagGameHud`, `drawSceneFade`
- `spriteCanvas`, `getGroundSprite`, `getEntitySprite`, `getPropSprite`

`drawMinimap`은 3D 모드에서도 사용되므로 잔류.

## 추출하지 않은 것들과 이유

| 시스템 | 줄 수 | 이유 |
|---|---|---|
| 채팅/LLM | ~700 | 비동기 + DOM 조작 + 15+ 클로저 참조 |
| 입력/컨트롤 | ~400 | DOM 이벤트 리스너, 모든 게임 상태 참조 |
| 저장/불러오기 | ~155 | 모든 상태 변수 접근, 추출 비용 > 효과 |

4303줄이면 충분히 관리 가능한 크기이고, 무리한 추출은 오히려 복잡도를 높입니다.

## 숫자

| 항목 | Before | After | 변화 |
|---|---|---|---|
| main.js | 7,034줄 | 4,303줄 | **-38.8%** |
| 모듈 파일 | 0개 | 4개 | +4 |
| 커밋 | - | 5개 | - |

## 교훈

- **IIFE 클로저 패턴**은 모듈화의 적입니다. 모든 함수가 수십 개의 클로저 변수를 참조.
- **ctx 패턴**이 유일한 현실적 해법 — 클로저를 ctx 객체로 조립해서 전달.
- **가장 큰 효과는 삭제** — 2D 렌더러 1780줄 삭제가 추출 4개 모듈 합산(~905줄)보다 컸음.
- **실용적 손절** — 4300줄이면 더 쪼갤 필요 없음. 완벽한 모듈화보다 적정 수준이 중요.
