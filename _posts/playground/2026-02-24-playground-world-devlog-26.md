---
layout: post
title: "Playground Devlog #26 - i18n 완전 정복: 639키, 에이전트 팀 작업"
date: 2026-02-24 00:30:00 +0900
categories: [playground, devlog]
tags: [i18n, internationalization, translation, agent-team, english]
---

유저/NPC 이름을 제외한 모든 텍스트를 한/영 번역 가능하게 만들었습니다.

## 왜 i18n을 다시 했나?

기존에 i18n.js에 360개 키가 있었지만, 실제로는 코드 곳곳에 한글이 하드코딩되어 있었습니다. 영어로 바꿔도 한글이 섞여 나오는 상태. "제대로" 하려면 전수조사가 필요했습니다.

## 에이전트 팀 작업

혼자 하면 실수를 놓치기 때문에, **번역팀 4명 + 검수팀 2명**으로 나눠서 작업했습니다.

### 번역 단계 (병렬)

| 에이전트 | 담당 | 규모 |
|---|---|---|
| translator-constants | 건물/아이템/발견장소/호감도/계절 | 266줄 |
| translator-main | UI 메시지, LLM 프롬프트, 도슨트 | 220줄 |
| translator-quest | 퀘스트 11종 + helpers + npc-data | 95줄 |
| translator-html-server | HTML UI + 서버 프롬프트 | 139줄 |

4명이 동시에 작업, 각자 담당 파일을 수정.

### 검수 단계 (교차 검수)

번역팀을 전원 교체하고 새 검수팀 투입:

| 에이전트 | 역할 | 발견 |
|---|---|---|
| reviewer-1 | 한글 잔류 검사 | 누락 프롬프트 1건 수정, 중복 키 2쌍 제거 |
| reviewer-2 | 영어 품질 검수 | 어색한 표현 15건 수정 |

**교차 검수의 가치**: 본인이 놓친 문제를 다른 눈이 잡아냅니다.

- reviewer-2가 한국어 조사 `{particle}`이 영어에 남아있던 것 발견
- reviewer-1이 enrichQuestDialogue의 하드코딩 프롬프트 발견
- 둘 다 빌드 검증까지 수행

## 주요 변경

### 1. i18n 키: 360 → 639

카테고리별:
- 시스템 메시지: ~60키
- 퀘스트 (11종): ~110키
- 건물/장소/아이템: ~80키
- LLM 프롬프트: ~40키
- UI/모바일: ~65키
- NPC 대사/분위기: ~50키
- 기타 (날씨, 관계, 호감도): ~30키

### 2. HTML 정적 번역

`playground/index.md`의 모든 한글 요소에 `data-i18n` 속성 추가:

```html
<button data-i18n="mobile_talk">대화</button>
<h3 data-i18n="card_controls_heading">조작법</h3>
<input data-i18n-placeholder="chat_placeholder_npc" placeholder="NPC에게 말 걸기...">
```

`translateStaticDOM()` 함수가 언어 변경 시 모든 DOM 텍스트를 일괄 갱신.

### 3. 데이터 레이블 키 치환

constants.js의 데이터 객체들이 문자열 대신 i18n 키를 저장:

```js
// Before
{ id: "cafe", label: "카페", ... }

// After
{ id: "cafe", label: "bld_cafe", ... }
```

렌더링 시점에 `t(building.label)`로 번역.

### 4. 서버 프롬프트 동기화

`buildPromptEn`이 `buildPromptKo`와 완전히 동일한 기능을 갖추도록 보강:

- 재방문 인식 (conversationCount 기반)
- 기억 활용 지시 ("must weave at least one recent memory")
- 관계 단계별 행동 (5단계)
- 퀘스트 대화 enrichment

### 5. 함수 시그니처 변경

```js
// Before
npcRelationLabel(value)
getMemoryBasedTone(npc)
getNpcSocialContext(npc, npcs, getNpcRelation)

// After
npcRelationLabel(value, t)
getMemoryBasedTone(npc, t)
getNpcSocialContext(npc, npcs, getNpcRelation, t)
```

`t` 함수를 파라미터로 전달하여 모듈 독립성 유지.

## 수치

| 항목 | Before | After |
|---|---|---|
| i18n 키 | 360 | 639 |
| 수정 파일 | - | 10개 |
| 삽입/삭제 | - | +1304 / -391 |
| 에이전트 | - | 6명 (번역4 + 검수2) |
| 빌드 | - | 7/7 통과 |

## 남은 것

1. **NPC 이름**: 한국어 고유명사로 유지 (디자인 결정). 영어 모드에서도 "허승준"으로 표시
2. **placeAliases**: 한국어 → 키 매핑만 있어서 영어 NPC 응답에서 장소 안내 미작동 가능
3. **실제 플레이 테스트**: 영어 모드로 전체 플로우 확인 필요

이제 언어를 바꾸면 진짜로 전체가 바뀝니다.
