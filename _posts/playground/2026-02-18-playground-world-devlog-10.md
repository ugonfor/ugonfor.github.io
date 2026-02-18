---
layout: post
title: "Playground Devlog #10 - LLM 모델 체인 수정 & 채팅 UI 분리"
date: 2026-02-18 23:30:00 +0900
categories: [playground, devlog]
tags: [llm, gemini, chat-ui, toast, npc, streaming]
---

두 가지 큰 문제를 수정했습니다: NPC 대화 응답이 느린 문제, 그리고 채팅창에 모든 메시지가 뒤섞이는 문제.

## 1. LLM 모델 체인 수정

### 문제
NPC에게 말을 걸면 응답이 매우 느렸습니다. 원인을 조사해보니:

- 배포 환경(Cloud Run)에 `MODEL_CHAIN` 환경변수가 **설정되어 있지 않아** 코드 기본값 사용
- 기본값의 `gemini-2.0-flash`, `gemini-2.5-pro`가 **무료 티어 quota가 0**으로 항상 429 실패
- 매번 2개 모델 실패 후 `gemma-3-27b-it`으로 폴백 → 느린 응답

```
gemini-2.0-flash → 429 (quota: 0)
gemini-2.5-pro   → 429 (quota: 0)
gemma-3-27b-it   → 200 (여기서 겨우 응답)
```

### 해결
사용 가능한 모델을 테스트하여 새 체인으로 교체:

```
gemini-2.5-flash → gemini-3-flash-preview → gemini-2.5-flash-lite → gemma-3-27b-it
```

추가로, `gemini-2.5-flash`와 `gemini-3-flash-preview`는 **thinking 모델**이라 `maxOutputTokens: 180` 중 대부분을 "생각"에 소모하는 문제가 있었습니다. `thinkingConfig: { thinkingBudget: 0 }`을 추가하여 해결했습니다.

**변경 파일:** `server/llm-proxy.mjs`, `server/.env`, Cloud Run 환경변수

## 2. 채팅 UI 분리

### 문제
채팅창이 단일 배열(`chats[]`)에 모든 메시지를 저장:
- 다른 NPC와의 대화가 섞임
- 시스템 알림(퀘스트, 발견 등)이 대화 사이에 끼어듦

### 해결

**NPC별 대화 분리:**

```javascript
// 기존: 모든 메시지가 하나의 배열
const chats = [];

// 변경: NPC별 독립 기록
const npcChatHistories = {};  // { npcId: messages[] }
const globalChats = [];        // 멀티플레이어
const systemToasts = [];       // 시스템 알림
```

- `addNpcChat(npcId, speaker, text)` — NPC별 기록에 추가
- `renderCurrentChat()` — 현재 대화 대상의 기록만 표시
- NPC를 바꾸면 해당 NPC의 대화 기록으로 자동 전환

**시스템 알림 토스트:**
- `addSystemToast(text)` — 4초 후 자동 소멸
- 채팅창과 분리된 별도 영역에 표시
- 데스크탑: 채팅 독 위쪽 / 모바일: 상단 중앙

**LLM 컨텍스트 개선:**

```javascript
// 기존: 모든 메시지 섞인 채로 6개
recentMessages: chats.slice(0, 6).reverse()

// 변경: 해당 NPC 대화만 8개
recentMessages: getNpcChats(npc.id).slice(0, 8).reverse()
```

**하위호환:** 기존 99곳의 `addChat()` 호출은 래퍼 함수가 자동 분기하여 모두 정상 동작.

**변경 파일:** `assets/js/playground-world.js`, `assets/css/playground.css`, `playground/index.md`
