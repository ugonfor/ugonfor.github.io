---
layout: post
title: "Playground Devlog #35 - 멀티플레이어 완성: 3D 렌더링, NPC 동기화, 공유 기억"
date: 2026-02-26 19:00:00 +0900
categories: [playground, devlog]
tags: [multiplayer, firebase, 3d-rendering, npc-sync, shared-memory]
---

"다른 사람이 놀러왔는데, 투명인간이었다" — 이 문제를 잡았습니다.

## 문제

Firebase Realtime DB 멀티플레이어 인프라는 이미 구현되어 있었다:
- 플레이어 위치 브로드캐스트 (100ms 간격)
- 채팅 메시지 송수신
- NPC 메모리 영구 저장

**하지만:**
1. 원격 플레이어가 3D 월드에 안 보인다 (미니맵 점만)
2. NPC가 클라이언트별 독립 시뮬레이션 (각자 다른 NPC 위치를 봄)
3. NPC 기억이 플레이어별 분리 (마을의 공유 기억 없음)

## Phase 1: 원격 플레이어 3D 렌더링

4파일, ~65줄. 기존 `CharacterFactory`를 그대로 활용.

**핵심 설계: 별도 Map 분리**

`remotePlayerMeshes` Map을 NPC `entityMeshes`와 분리. NPC 메시는 영구적이고, 원격 플레이어 메시는 일시적(접속/이탈)이라 생명주기가 다르다.

```
renderer.js:
  this.entityMeshes → NPC 전용 (변경 없음)
  this.remotePlayerMeshes → 원격 플레이어 전용 (신규)
```

- 접속 시 `createCharacter(species, color, false)` → 씬에 추가
- 매 프레임 위치/애니메이션 업데이트 (walk/idle)
- 이탈 시 씬에서 제거 + Map에서 삭제
- 말풍선: `b.id.startsWith("remote_")` 분기 추가
- 라벨: 파란색 배경 `.pg-label-remote`로 NPC와 시각적 구별

## Phase 2: NPC 호스트 동기화

**호스트 권한 모델:**

```
Firebase: playground/hosts/{sessionId} = { ts: serverTimestamp }
→ orderByChild("ts").limitToFirst(1) → 가장 오래된 = 호스트
→ onDisconnect().remove() → 이탈 시 자동 탈락
```

- 호스트만 `updateNpcs(dt)` 실행 → 200ms마다 NPC 상태 브로드캐스트
- 비호스트: `updateNpcs()` 스킵, Firebase에서 수신한 상태 직접 적용
- 호스트 이탈 → 다음 가장 오래된 클라이언트가 자동 승계
- 승계 시 Firebase의 마지막 NPC 상태를 로드하여 위치 점프 방지

동기화 필드: `x, y, state, pose, mood, currentScene`

**대역폭:** 25 NPC × 80바이트 × 5회/초 = 10KB/s (Firebase 무료 한도 내)

## Phase 3: NPC 공유 기억

핵심: **NPC가 모든 방문자의 대화를 기억한다.**

Firebase 구조 변경:
```
Before (per-player):
  playground/memories/{playerId}/{npcId}

After (shared + per-player favor):
  playground/npc-memory/{npcId}/entries = [
    { type: "chat", summary: "...", playerName: "Alice", time: 1234 },
    { type: "gift", summary: "...", playerName: "Bob", time: 5678 },
  ]
  playground/npc-memory/{npcId}/favor/{playerName} = { level: 2, points: 45 }
```

- Alice가 유진과 대화 → Bob이 유진에게 말 걸면 → "전에 Alice라는 사람이..."
- 호감도는 플레이어별 독립 유지 (Alice의 유진 호감 ≠ Bob의 유진 호감)
- LLM 프롬프트에 `[이름]` 태그로 다른 방문자 기억 표시
- 기존 per-player 데이터 자동 마이그레이션

## 생명주기

| 상황 | NPC 위치 | NPC 기억 |
|------|---------|---------|
| 모두 나감 → 재접속 | 새로 시작 (30초 타임아웃) | 영구 유지 |
| 호스트만 나감 | 새 호스트 자동 승계 | 영구 유지 |
| 싱글플레이어 | 기존과 동일 | 기존과 동일 |

## 결과

| 지표 | Before | After |
|------|--------|-------|
| 원격 플레이어 가시성 | 미니맵 점 | 3D 캐릭터 + 이름 + 말풍선 |
| NPC 위치 동기화 | 독립 (각자 다른 위치) | 호스트 권한 통일 |
| NPC 기억 | 플레이어별 분리 | 모든 방문자 공유 |
| 호감도 | 플레이어별 | 플레이어별 유지 |
| 수정 파일 | — | 10개 |
| 추가/변경 줄 수 | — | +354 / -37 |

## 이번 커밋

| 커밋 | 내용 |
|------|------|
| Multiplayer: 3D remote players, NPC host sync, shared NPC memory | Phase 1~3 전체 구현 |
