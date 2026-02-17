---
layout: post
title: "Playground Devlog #7 - 멀티플레이 채팅, 이름 모달, 국기 표시"
date: 2026-02-18 12:00:00 +0900
categories: [playground, devlog]
tags: [multiplayer, chat, firebase, ip-geolocation, modal]
---

기존 멀티플레이어는 위치 동기화만 되고 플레이어 간 소통이 불가능했습니다. 이번 업데이트로 플레이어 채팅, 이름 설정 모달, IP 기반 국기 표시를 추가했습니다.

## 플레이어 설정 모달

기존의 `window.prompt`를 커스텀 모달로 교체했습니다.

- 첫 방문 시 이름 입력 모달이 표시됨
- Enter 키 또는 확인 버튼으로 제출
- 이름 변경 버튼으로 언제든 재설정 가능
- `initPlayerName()`이 async로 변경되어 모달 완료 후 멀티플레이어 초기화

## IP 기반 국기 자동 감지

국가 선택을 유저에게 맡기지 않고, IP 기반으로 자동 감지합니다.

- `ipapi.co/country_code/` API 호출 (타임아웃 3초)
- 국가 코드를 Regional Indicator 이모지로 변환 (`countryCodeToFlag`)
- 16개국 화이트리스트(`COUNTRY_LIST`)로 검증
- 결과를 localStorage에 캐싱하여 재방문 시 API 호출 생략
- 캔버스에서 이름 앞에 국기 이모지 표시 (로컬/리모트 모두)

## 플레이어 간 채팅

NPC가 근처에 없을 때 채팅 입력이 전체 채팅으로 전환됩니다.

### 전송 흐름
1. `chatTargetNpc()`이 근처 NPC를 찾지 못하고 `mp.enabled`이면 전체 채팅 모드
2. `mpSendMessage()`가 Firebase `playground/messages`에 push
3. 1.5초 쿨다운으로 스팸 방지
4. 로컬 플레이어 머리 위에 말풍선 4초 표시

### 수신 흐름
1. `initMultiplayer()`에서 `messages` 경로에 `child_added` 리스너 등록
2. 자기 세션 메시지는 필터링 (`d.sessionId === mp.sessionId`)
3. 수신된 메시지를 채팅 로그에 추가 + 리모트 플레이어 말풍선 표시
4. 60초 지난 메시지는 주기적으로 자동 삭제 (`mpCleanMessages`)

### UI 변경
- 채팅 대상이 없고 mp 활성화 시: "대상: 전체 채팅", "상태: 전체 채팅"
- placeholder가 "플레이어에게 말하기..."로 변경
- 채팅 로그에서 리모트 메시지는 파란색, 로컬 플레이어 메시지는 초록색
- 모바일 대화 버튼도 NPC 없이 mp 채팅 열기 가능

## Firebase 규칙 업데이트

```json
{
  "players/$sessionId": { "flag": "string, max 8자" },
  "messages/$msgId": {
    "name": "string, max 20자",
    "text": "string, max 200자",
    "sessionId": "string",
    "flag": "string, max 8자",
    "ts": "<= now"
  }
}
```

- `messages` 경로에 `ts` 인덱스 추가 (`orderByChild` 쿼리 최적화)

## 핵심 버그 수정

`chatTargetNpc()`이 `focusedNpcId`가 설정되어 있으면 먼 NPC라도 항상 target을 반환하는 문제가 있었습니다. 이로 인해 `!target` 조건이 거의 참이 되지 않아 mp 채팅 경로에 도달하지 못했습니다.

수정: 조건을 `!target`에서 `!npcNear` (`target && target.near`)로 변경하여, NPC가 실제로 근처에 있을 때만 NPC 대화로 라우팅합니다.
