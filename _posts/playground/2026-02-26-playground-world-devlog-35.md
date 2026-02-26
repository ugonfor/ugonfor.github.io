---
layout: post
title: "Playground Devlog #35 - 멀티플레이어 완성: 3D 렌더링, NPC 동기화, 공유 기억"
date: 2026-02-26 19:00:00 +0900
categories: [playground, devlog]
tags: [multiplayer, firebase, 3d-rendering, npc-sync, shared-memory]
---

"다른 사람이 놀러왔는데, 투명인간이었다" — 이 문제를 잡겠습니다.

## 현재 상태

Firebase Realtime DB 멀티플레이어 인프라는 이미 구현되어 있다:
- 플레이어 위치 브로드캐스트 (100ms 간격)
- 채팅 메시지 송수신
- NPC 메모리 영구 저장

**하지만:**
1. 원격 플레이어가 3D 월드에 안 보인다 (미니맵 점만)
2. NPC가 클라이언트별 독립 시뮬레이션 (각자 다른 NPC 위치를 봄)
3. NPC 기억이 플레이어별 분리 (마을의 공유 기억 없음)

## Phase 1: 원격 플레이어 3D 렌더링

4파일, ~65줄. 기존 `CharacterFactory`를 그대로 활용.

- `renderer.js`: 별도 `remotePlayerMeshes` Map으로 원격 플레이어 메시 관리
- NPC entityMeshes와 분리하여 기존 코드에 간섭 없음
- 이동 감지 → walk/idle 애니메이션
- 말풍선: `"remote_"` prefix로 위치 해석
- 라벨: 파란색 배경으로 NPC와 시각적 구별

## Phase 2: NPC 호스트 동기화

호스트 권한 모델:
- 첫 접속자 = 호스트 (Firebase presence 기반 자동 선출)
- 호스트만 `updateNpcs()` 실행 → Firebase로 브로드캐스트
- 비호스트는 Firebase에서 수신한 NPC 상태 적용 (자체 시뮬레이션 스킵)
- 호스트 이탈 → 자동 승계

동기화 필드: x, y, state, pose, mood, currentScene

## Phase 3: NPC 공유 기억

핵심: NPC가 모든 방문자의 대화를 기억.

Firebase 구조 변경:
```
// Before: per-player
playground/memories/{playerId}/{npcId}

// After: shared entries + per-player favor
playground/npc-memory/{npcId}/entries/[...tagged with playerName]
playground/npc-memory/{npcId}/favor/{playerName}/level
```

Alice가 유진과 대화 → Bob이 유진에게 말 걸면 → "전에 Alice라는 사람이..."

LLM 프롬프트에 다른 방문자 기억을 포함하여, 마을이 진짜 살아있는 느낌을 준다.

## 생명주기

| 상황 | NPC 위치 | NPC 기억 |
|------|---------|---------|
| 모두 나감 → 재접속 | 새로 시작 (30초 타임아웃) | 영구 유지 |
| 호스트만 나감 | 새 호스트 자동 승계 | 영구 유지 |
| 싱글플레이어 | 기존과 동일 | 기존과 동일 |

## 예상 결과

| 지표 | Before | After |
|------|--------|-------|
| 원격 플레이어 가시성 | 미니맵 점 | 3D 캐릭터 + 이름 + 말풍선 |
| NPC 위치 동기화 | 독립 (각자 다른 위치) | 호스트 권한 통일 |
| NPC 기억 | 플레이어별 분리 | 모든 방문자 공유 |
| 호감도 | 플레이어별 | 플레이어별 유지 |
