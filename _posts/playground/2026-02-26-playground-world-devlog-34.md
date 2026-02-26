---
layout: post
title: "Playground Devlog #34 - main.js 대수술: 4,474줄 → 3,370줄, 사이드이펙트 제거"
date: 2026-02-26 17:00:00 +0900
categories: [playground, devlog]
tags: [refactoring, clean-code, architecture, state-machine, module-extraction]
---

"하나 고치면 다른 게 깨진다" — 이 문제의 근본 원인을 잡았습니다.

## 문제

main.js가 4,474줄짜리 IIFE 모놀리스. 50+개 `let` 클로저 변수를 100+ 함수가 자유롭게 읽고 쓴다. 특히:

- `conversationFocusNpcId` — **8개 함수에서 쓰기, 15곳**
- `player.moveTarget` — 6곳에서 쓰기
- 비동기 LLM 콜백이 2~5초 뒤 상태 변경 → 레이스 컨디션

## Phase 0: ConversationManager

가장 위험한 변수 `conversationFocusNpcId`를 상태 머신으로 캡슐화.

```
Before: conversationFocusNpcId = npc.id; (15곳에서 자유롭게)
After:  convoMgr.startConversation(npcId, holdMs, "reason");
```

비동기 잠금으로 레이스 컨디션 방지:
```js
convoMgr.lockForAsync("proactive_greet");
// LLM 호출...
convoMgr.unlockAsync("proactive_greet");
```

유저가 NPC 클릭 → proactive 잠금 걸려있으면 거부. 기존에는 마지막 쓰기가 승리하는 구조.

## Phase 1: ChatManager + GameState

채팅 관련 상태 5개(`npcChatHistories`, `globalChats`, `speechBubbles`, `logs`, `systemToasts`)와 함수 10개를 `chat-manager.js`로 이관.

`game-state.js`는 world/player/npcs/quest를 하나의 컨테이너로 묶어 서브시스템에 전달.

## Phase 2: 7개 서브시스템 추출

| 모듈 | 이관 내용 | 캡슐화된 let 변수 |
|---|---|---|
| `ambient-speech.js` | NPC 혼잣말, 선제 인사, 자동 대화 | 9개 (타이밍/플래그) |
| `npc-social-events.js` | NPC간 대화, 가십 시스템 | 3개 |
| `guide-greeting.js` | 도슨트 접근 + 인사 시퀀스 | 2개 |
| `intro-sequence.js` | 인트로 카메라, NPC 사전 시뮬레이션 | 6개 |
| `scene-manager.js` | 건물 진입/퇴장, 페이드 | 1개 |
| `save-load.js` | localStorage 저장/복원 | 0개 |
| `camera.js` | 대화 카메라, 관조모드, 팬/줌 | 6개 |

에이전트 4명이 isolated worktree에서 병렬 작업 → 모듈 파일 생성 → 리드가 main.js 통합.

## Phase 3: PlayerController

`updatePlayer(dt)`와 autoWalk 로직을 `player-controller.js`로 이관. `player.moveTarget` 쓰기를 `playerCtrl.setMoveTarget()`으로 통일.

## Phase 4: AsyncGuard + 프레임 루프 문서화

비동기 연산 동시성 가드:
```js
asyncGuard.guarded('ambient', async () => {
  const line = await llmReplyOrEmpty(npc, prompt);
  if (line) chatMgr.upsertSpeechBubble(npc.id, line, 4000);
});
// 이미 ambient 슬롯이 사용 중이면 자동 스킵
```

`frame()` 함수에 실행 순서 문서화:
```
Phase A: 시간
Phase B: 플레이어 이동 (NPC보다 먼저)
Phase C: NPC 이동 (가이드 → 일반)
Phase D: NPC 소셜
Phase E: 환경 (날씨, 발견)
Phase F: 카메라
Phase G: 네트워크
```

## 결과

| 지표 | Before | After |
|---|---|---|
| main.js 줄 수 | 4,474 | 3,370 |
| 새 모듈 | 0 | 11개 |
| conversationFocusNpcId 직접 쓰기 | 15곳 | 0곳 |
| 캡슐화된 let 변수 | 0 | 30+ |
| 프레임 루프 문서 | 없음 | Phase A-G |

## 이번 커밋들

| 커밋 | 내용 |
|---|---|
| Phase 0: ConversationManager | conversationFocusNpcId 상태 머신 |
| Phase 1: ChatManager + GameState | 채팅/로그 캡슐화, 상태 컨테이너 |
| Phase 2: Extract 7 subsystems | 7개 서브시스템 모듈화 |
| Phase 2 complete: Wire remaining | 나머지 3개 모듈 연결 |
| Phase 3+4: PlayerController + AsyncGuard | 플레이어 이동 + 비동기 가드 + 프레임 루프 문서화 |
