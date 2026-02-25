---
layout: post
title: "Playground Devlog #29 - 분위기 만들기: BGM, 인트로, NPC 개성"
date: 2026-02-25 01:00:00 +0900
categories: [playground, devlog]
tags: [bgm, audio, intro-camera, npc-personality, atmosphere, retention]
---

체류시간 고민(DevLog #27)의 실행편. 게임이 아니라 **공간**을 만드는 데 집중했습니다.

## 3가지를 동시에

에이전트 팀 3명이 병렬로 작업:

| 에이전트 | 담당 |
|---|---|
| audio-team | BGM + 오디오 시스템 |
| intro-team | 첫 30초 인트로 연출 |
| personality-team | NPC 개성 quirk |

### 1. BGM + 오디오 시스템

Web Audio API 기반 오디오 매니저를 새로 만들었습니다.

```js
const audioManager = createAudioManager();
audioManager.init();  // 첫 유저 인터랙션 후 (autoplay policy)
audioManager.updateForScene(weather, hour);  // 자동 전환
```

**기능:**
- 날씨/시간별 BGM 자동 전환 (낮→어쿠스틱, 밤→피아노, 비→빗소리)
- 크로스페이드 전환 (1초 페이드아웃 → 2초 페이드인)
- 효과음: 대화 시작, 아이템 줍기
- 음소거 토글 (localStorage 저장)
- 모든 오디오 로딩 실패 graceful 처리

현재 placeholder(무음) MP3. 실제 음원은 아래에서 구해서 교체 예정.

### 2. 첫 30초 인트로

**Before**: 게임 시작 → NPC가 집에서 idle → 3초 후 유진이 느릿느릿 다가옴

**After**:

```
0초:    NPC 60초분 사전 시뮬레이션 완료 (이미 돌아다니는 상태)
0-3초:  카메라가 마을을 훑어줌 (사인파 수평 패닝 + 줌아웃)
3-5초:  카메라가 플레이어로 줌인
5초~:   유진이 다가오기 시작 (인트로 끝난 후)
2-3초:  NPC들이 이미 대화/혼잣말 시작 (ambient timer 조기화)
```

핵심은 `presimulateNpcs(60)`:

```js
function presimulateNpcs(seconds) {
  for (let i = 0; i < seconds * 10; i++) {
    for (const npc of npcs) {
      if (npc.id === "guide") continue;  // 유진은 안내소 고정
      // 0.1초 단위로 이동만 시뮬레이션
      // home → work → hobby 사이를 랜덤으로 걸어다님
    }
  }
}
```

게임 시작 전에 NPC를 미리 60초 움직여놓으니, 들어온 순간부터 마을이 살아있습니다.

### 3. NPC 개성 극대화

8명의 NPC에 고유 말버릇(quirk) 부여:

| NPC | quirk |
|---|---|
| 한소영 (빵집) | 빵에 비유 ("인생은 크루아상 같아요") |
| 송재현 (도서관) | 책/명언 인용 ("어떤 책에서 읽었는데...") |
| 윤동혁 (체육관) | 운동 연결 ("오늘 운동했어?") |
| 이준혁 (경찰서) | 의심/확인 ("그거 확실해?") |
| 송지은 (병원) | 건강 걱정 ("요즘 잠은 잘 자?") |
| 정태현 (음식점) | 음식 추천 ("점심은 먹었어?") |
| 김하늘 (카페) | 커피 비유 ("에스프레소처럼 진한 이야기네") |
| 김복동 (할아버지) | 옛날 이야기 ("내가 젊었을 때는...") |

LLM 프롬프트에 quirk를 직접 지시:

```
말버릇/특성: 모든 비유를 빵이나 요리로 함.
이 특성을 대화에 자연스럽게 녹여주세요.
매 대화에서 반드시 이 특성이 드러나야 합니다.
```

"은근히" 대신 **"반드시"**. 이전 기억 강화 때 배운 교훈입니다.

## 수치

| 항목 | 수치 |
|---|---|
| 새 모듈 | audio.js |
| 수정 파일 | 6개 |
| 추가/삭제 | +282 / -12 |
| 오디오 파일 | 5개 (placeholder) |
| NPC quirk | 8명 |
| 빌드 | 7/7 통과 |

## 다음: 실제 음원

placeholder를 실제 음원으로 교체 필요. `assets/audio/`에 MP3 넣으면 즉시 동작.

필요한 파일:
- `bgm-day.mp3` — 밝은 lo-fi/어쿠스틱 (루프)
- `bgm-night.mp3` — 조용한 피아노/앰비언트 (루프)
- `bgm-rain.mp3` — 빗소리 + 잔잔한 음악 (루프)
- `sfx-chat.mp3` — 대화 시작 효과음 (0.3초)
- `sfx-pickup.mp3` — 아이템 줍기 효과음 (0.2초)

## 핵심 질문에 대한 답

> 이 마을에 소리가 있고, NPC가 진짜 살아있는 것처럼 보이면, 사람들은 5분 더 머물까?

이제 테스트할 수 있게 되었습니다.
