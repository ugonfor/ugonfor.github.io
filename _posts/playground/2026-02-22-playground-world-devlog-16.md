---
layout: post
title: "Playground Devlog #16 - LLM 프록시 500 에러 디버깅 & 수정"
date: 2026-02-22 02:00:00 +0900
categories: [playground, devlog]
tags: [llm, gemini, gemma, cloud-run, bugfix, debugging]
---

NPC 대화가 전부 "나 말하는 법을 까먹은 거 같아..."로 뜨는 문제를 추적해서 수정했습니다.

## 증상

브라우저 콘솔에 `/api/npc-chat` 500 에러가 연속으로 찍혔습니다. 스트림 엔드포인트(`/api/npc-chat-stream`)도 실패하고, fallback인 non-stream도 실패해서 로컬 응답으로 전환되는 상황.

## 원인 추적

Cloud Run 로그를 확인하니 서버 자체는 살아있고 `/api/world-npcs`는 200을 반환하는데, `/api/npc-chat`만 500.

Gemini API를 직접 호출해보니 **무료 티어 일일 쿼타(20회)가 초과**되어 있었습니다.

```
gemini-2.5-flash       → 429 (quota exceeded)
gemini-3-flash-preview → 429 (quota exceeded)
gemini-2.5-flash-lite  → 429 (quota exceeded)
gemma-3-27b-it         → ???
```

마지막 fallback인 `gemma-3-27b-it`은 쿼타 문제가 없는데도 실패. 원인은 `thinkingConfig` 주입 조건:

```js
// 문제 코드
model.includes("2.5") || model.includes("3-")
```

`gemma-3-27b-it`도 `"3-"`을 포함하므로 조건에 걸려서, thinking을 지원하지 않는 gemma 모델에 `thinkingConfig: { thinkingBudget: 0 }`이 들어갔습니다. Gemini API가 `400 Thinking is not enabled for models/gemma-3-27b-it`을 반환. 400은 retryable이 아니라 즉시 break → 전체 실패.

## 수정

```js
// 수정 후: gemini- 접두사 모델에만 적용
const needsThinkingOff = model.startsWith("gemini-") && (model.includes("2.5") || model.includes("3-"));
```

`callGemini`와 `callGeminiStream` 두 곳 모두 동일하게 수정. Cloud Run 재배포 후 `/api/npc-chat`이 200을 반환하는 것을 확인했습니다.

## 교훈

- 문자열 매칭으로 모델 기능을 판별하면 새 모델 추가 시 깨지기 쉽다
- fallback 체인의 마지막 모델이 실패하면 전체가 무너진다 — 마지막 모델은 특히 견고해야 함
- 무료 티어 쿼타(일 20회)는 개발 테스트만으로도 금방 소진됨
