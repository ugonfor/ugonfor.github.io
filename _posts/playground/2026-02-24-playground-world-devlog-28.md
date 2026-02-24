---
layout: post
title: "Playground Devlog #28 - 리팩토링 + 완성도: 도슨트, 말풍선 동기화, 대화 순서"
date: 2026-02-24 18:00:00 +0900
categories: [playground, devlog]
tags: [refactoring, bug-fix, docent, speech-sync, ux, og-meta]
---

코드 스캔으로 발견한 버그 수정, 매직 넘버 상수화, 모듈 추출. 그리고 플레이 중 느낀 완성도 문제 3가지를 고쳤습니다.

## Part 1: 코드 리팩토링

에이전트 팀 4명으로 병렬 작업.

### 버그 수정

**placeAliases 영어 미지원**

NPC가 영어로 "Let's go to the cafe"라고 말해도 장소 안내가 안 되었습니다. `detectActionFromReply()`의 장소 매핑이 한국어만 있었기 때문.

```js
// Before: 한국어만
const placeAliases = { "카페": "cafe", "공원": "park", ... };

// After: constants.js로 이동, 양언어
export const PLACE_ALIASES = {
  "카페": "cafe", "공원": "park", ...     // Korean
  "cafe": "cafe", "park": "park", ...     // English
};
```

**relationKeyForNpc 깨지기 쉬운 매칭**

```js
// Before: NPC ID 앞 3글자로 관계 키 검색 → shared/custom NPC에서 깨짐
return Object.keys(relations).find(k => k.toLowerCase().includes(npcId.slice(0, 3)));

// After: 직접 키 생성 + 레거시 호환 + 자동 초기화
const directKey = `playerTo_${npcId}`;
if (relations[directKey] !== undefined) return directKey;
// 레거시 폴백 + 새 NPC 자동 생성
```

**inferSentimentFromReply 변수 섀도잉**

```js
// Before: t = replyText.toLowerCase() → i18n t() 함수 섀도잉
const t = replyText.toLowerCase();
if (/고마워/.test(t)) ...  // t는 문자열인데, 바깥의 t()는 함수

// After
const text = replyText.toLowerCase();
if (/고마워/.test(text)) ...
```

### 매직 넘버 상수화

30+ 상수를 `GAME` 객체로 추출:

```js
export const GAME = {
  GOSSIP_RANGE: 6,              // 가십 전파 범위
  PROACTIVE_GREET_DIST: 3.5,    // NPC 선제 인사 거리
  TAG_CATCH_DIST: 1.5,          // 술래잡기 잡기 거리
  LLM_TIMEOUT_MS: 15000,        // LLM 응답 타임아웃
  PROACTIVE_GREET_CHANCE: 0.15, // 선제 인사 확률
  NEED_HUNGER_RATE: 0.08,       // 배고픔 증가율/초
  // ... 30개 이상
};
```

25+ 곳의 하드코딩 숫자를 `GAME.XXX`로 교체. 이제 게임 밸런스를 한 곳에서 조절 가능.

### 모듈 추출

| 새 모듈 | 줄 수 | 추출 내용 |
|---|---|---|
| `conversation.js` | 334 | LLM 요청, 감정 분석, 액션 감지 |
| `tag-game.js` | 103 | 술래잡기 미니게임 |

main.js: 4532 → 4197줄 (-335줄). input.js는 의존성이 30+ 변수/20+ 함수라 보류.

### Async 에러 핸들링

9개의 unhandled promise chain에 `.catch()` 추가. 조용히 실패하던 것들이 이제 콘솔에 경고를 남깁니다.

---

## Part 2: 완성도 개선

실제로 플레이하면서 느낀 3가지 문제.

### 1. 도슨트를 도슨트로 인식 못함

**문제**: 유진이 안내원인지 모른다. 분홍색 NPC일 뿐.

**수정**: 이름 옆에 역할 라벨 표시.

```
Before: 유진
After:  유진 (안내원)     ← 분홍 하이라이트 배지
```

label-overlay.js에서 `isDocent` 플래그를 체크하고, CSS로 분홍 배경 + 볼드 처리.

```css
.pg-label-docent {
  background: rgba(240, 160, 192, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.5);
  font-weight: bold;
}
```

### 2. 말풍선은 뜨는데 채팅 로그에 안 나옴

**문제**: NPC가 혼잣말하거나, NPC끼리 대화할 때 말풍선은 뜨지만 채팅 로그에는 기록 안 됨. 플레이어가 못 보면 영원히 사라지는 대화.

| 상황 | 말풍선 | 채팅 | Before |
|---|---|---|---|
| NPC 혼잣말 (ambient) | O | X | 유실 |
| NPC간 대화 (gossip) | O | X | 이벤트 로그만 |
| 플레이어 독백 | O | X | 유실 |
| 선제 인사 | O | O | 정상 |
| 일반 대화 | O | O | 정상 |

**수정**: ambient 혼잣말과 NPC간 대화에 `addChat()` 호출 추가. 이제 말풍선에 뜨는 모든 LLM 대화가 채팅 로그에도 기록됩니다.

### 3. 선제 인사 대화 순서 꼬임

**문제**: NPC가 먼저 말을 걸 때, `conversationFocusNpcId`가 `addChat()` 이후에 설정됨. NPC의 인사가 글로벌 채팅으로 잘못 라우팅되고, 플레이어가 동시에 타이핑하면 순서가 꼬임.

**수정**: 순서를 뒤집음.

```js
// Before
addChat(npc.name, line);            // ← 이 시점에 focusNpcId = null
conversationFocusNpcId = npc.id;    // 뒤늦게 설정

// After
conversationFocusNpcId = npc.id;    // 먼저 설정
setChatSession(npc.id, timeout);    // 세션도 먼저
addChat(npc.name, line);            // 올바른 NPC 채팅으로 라우팅
```

---

## 이번 세션 전체 성과

| 작업 | 상세 |
|---|---|
| i18n 완전 적용 | 639키, ko/en 완벽 매칭, 에이전트 6명 |
| OG 썸네일 | 마을 이미지 + 메타 태그 |
| 리팩토링 | GAME 상수 30+, conversation.js, tag-game.js |
| 버그 수정 | placeAliases, relationKeyForNpc, 변수 섀도잉 |
| 완성도 개선 | 도슨트 라벨, 말풍선 동기화, 대화 순서 |
| Async 안정화 | 9개 promise chain 에러 핸들링 |
| DevLog | 3편 (#26, #27, #28) |
