---
layout: post
title: "Playground Devlog #31 - 디테일 폴리시: NPC 행동, 오디오, 대화 품질"
date: 2026-02-25 22:00:00 +0900
categories: [playground, devlog]
tags: [npc-behavior, audio-fix, prompt-fix, ux-polish, camera]
---

큰 기능이 아니라 디테일의 연속. 실제로 플레이하면서 발견한 문제들을 하나씩 고쳤습니다.

## NPC가 플레이어를 따라오게

### 대화 중 따라오기

대화 중인 NPC가 제자리에 고정되어 있었습니다. 플레이어가 걸어가면 NPC가 허공에 대고 말하는 상황.

```js
// 대화 중 플레이어가 멀어지면 따라감 (멀수록 빠르게)
if (chatDist > 1.5) {
  const speedMult = chatDist > 5 ? 2.0 : chatDist > 3 ? 1.2 : 0.7;
  // ...이동
}
```

거리별 속도: 5타일 이상이면 뛰기(2x), 3타일 이상이면 빠른 걸음(1.2x), 가까이면 천천히(0.7x).

### 유진 접근 버그 (canStandInScene)

유진이 절대 못 걸어오는 버그가 있었습니다. 원인: `canStandInScene(nx, ny, npc)` — 세 번째 인자에 NPC **객체**를 넘겼는데, 함수는 **문자열**("outdoor")을 기대. NPC 객체 !== "outdoor" → 항상 `false` → 한 발짝도 못 움직임.

```js
// Before (모든 이동 차단)
canStandInScene(nx, ny, npc)

// After
canStandInScene(nx, ny, npc.currentScene || "outdoor")
```

### NPC가 플레이어를 바라보게

대화 중 NPC가 플레이어를 안 쳐다보고 있었습니다. 렌더러에서 `state === "chatting"`일 때 `rotation.y`를 플레이어 방향으로 설정.

## 오디오

### Web Audio API → HTML5 Audio

Web Audio API로 BGM을 재생하면 치지직/하울링이 발생했습니다.

원인:
- `gain.linearRampToValueAtTime` 스케줄링 충돌
- MP3 루프 시작점 인코더 갭
- 다중 gain 노드 간섭

해결: Web Audio API를 버리고 `<audio>` 엘리먼트 사용. 브라우저가 루프를 네이티브로 처리해서 깨끗합니다.

### BGM 교체

lo-fi → 동물의 숲 스타일 BGM (Pixabay: Chill Yume Animal Crossing).

## LLM 프롬프트

### Ambient 독백이 자기소개하는 문제

NPC 혼잣말인데 "안녕하세요, 처음 뵙죠? 저는 모카라고 해요"라고 함.

원인: 서버에서 ambient 요청도 일반 대화 프롬프트 전체를 받아서, "처음 만나는 사람입니다. 자기소개를 해주세요"가 포함됨.

해결: 유저 메시지에 "독백/중얼거/혼잣말" 키워드가 있으면 경량 프롬프트 사용:

```
당신은 모카입니다. 성격: 쾌활한 바리스타.
[말버릇] 커피에 빗대어 말함
시간: 21:26
→ 중얼거려
```

(+버그: `payload.message` 대신 `payload.userMessage`를 읽어야 했음)

### 유진 이중 인사 제거

4초 간격으로 2번 인사 → 1번만 인사하고 바로 대화 가능.

### 대화 중 다른 NPC 채팅 끼어듦 방지

`conversationFocusNpcId`가 있으면 ambient/gossip을 채팅 로그에서 제외. 말풍선은 유지.

## 인트로 카메라

### Before
단순한 사인파 수평 패닝 → 밋밋

### After
랜덤 NPC 4명 + 광장을 1.8초씩 순회 → 마을이 살아있는 걸 직접 보여줌 → 플레이어로 부드럽게 복귀.

## NPC간 대화

### 간격 수정
22~56분 → **10~25초**. 혼잣말(8~20초)과 비슷한 빈도.

### 쌍 선택 개선
랜덤 NPC → 가장 가까운 쌍 우선. 거리 2.3 → 6타일. 멀면 서로 걸어가게.

## Rule-base 혼잣말 → 이모티콘만

"흠흠", "와~", "그래?" 같은 텍스트 제거. 🎵 🎶 💭 ✨ 😄 😮 이모티콘만 남김. LLM 혼잣말은 여전히 텍스트.

## 같은 NPC 연속 혼잣말 방지

`lastAmbientNpcId`를 기억해서 직전과 같은 NPC면 2번째로 가까운 NPC 선택.

## 이번 커밋들

| 커밋 | 내용 |
|---|---|
| NPC follow + face player | 대화 중 따라오기 + 바라보기 |
| canStandInScene fix | NPC 이동 불가 버그 수정 |
| Guide greeting teleport | 8초 도착 못하면 텔레포트 |
| Audio rewrite | Web Audio → HTML5 Audio |
| BGM replace | 동숲 스타일 BGM |
| Ambient prompt fix | 독백 경량 프롬프트 |
| Double greeting fix | 유진 이중 인사 제거 |
| Intro camera | NPC 순회 시네마틱 |
| Emoji-only ambient | 텍스트 제거 |
| NPC social frequency | 10~25초 간격 |
| Consecutive ambient fix | 연속 혼잣말 방지 |
