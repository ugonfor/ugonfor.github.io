---
layout: post
title: "Playground Devlog #25 - 도슨트 온보딩, 관조 모드, NPC 끼임 수정"
date: 2026-02-23 23:00:00 +0900
categories: [playground, devlog]
tags: [docent, contemplation-mode, npc-stuck-fix, onboarding]
---

3단계 방문자 경험(관조 → 가이드 → 관계)의 앞 두 단계를 완성했습니다.

## 도슨트 온보딩 개선

### Before
유진이가 접근해서 하드코딩된 인사 두 줄을 말함:
```
유진: "안녕하세요! 마을에 오신 걸 환영합니다!"
유진: "E키로 말을 걸 수 있어요."
```

매번 똑같은 인사. 재방문해도 첫 방문처럼 대함.

### After
LLM이 상황에 맞는 인사를 생성합니다.

**첫 방문**: `(처음 방문한 ${player.name}을 환영. 안내원으로서 짧은 자기소개.)`
**재방문**: `(오랜만에 돌아온 ${player.name}을 반갑게 맞이. 마을에 새로운 일이 있으면 알려주기.)`

4초 후 후속 메시지도 LLM 생성:
- 첫 방문: "마을을 구경하라고 권유. E키로 말 걸 수 있다고."
- 재방문: "마을 근황을 한 문장으로."

결과: 매번 다른 인사, 재방문 인식, 자연스러운 온보딩.

## 관조 모드 (V키)

**"5초 체류 → 관조"** 경험을 위한 기능.

`V`키를 누르면 카메라가 자동으로 NPC들을 따라다닙니다. 6~10초마다 다른 NPC로 전환.

```js
function updateContemplation(now) {
  if (!contemplationMode) return;
  if (now < contemplationNextAt) return;
  contemplationNextAt = now + 6000 + Math.random() * 4000;
  const outdoor = npcs.filter(n => (n.currentScene || "outdoor") === "outdoor");
  const target = outdoor[contemplationTargetIdx];
  cameraPan.x = clamp((target.x - player.x) * 20, -320, 320);
  cameraPan.y = clamp((target.y - player.y) * 12, -220, 220);
}
```

아무 키나 누르지 않고 마을이 살아 숨쉬는 걸 구경할 수 있습니다. NPC들이 걸어다니고, 서로 대화하고, 혼잣말하는 모습을 관찰하는 모드.

## NPC 벽 끼임 수정

### Before
30프레임 stuck → 랜덤 1방향 탈출 시도 → 실패하면 계속 끼여있음

### After
30프레임 stuck → **8방향 순차 탈출 시도** → 전부 실패 시 **home으로 텔레포트**

```js
for (let attempt = 0; attempt < 8; attempt++) {
  const escAngle = (attempt / 8) * Math.PI * 2;
  // 8방향 시도...
}
if (!escaped && npc.home) {
  npc.x = npc.home.x;
  npc.y = npc.home.y;
  npc.currentScene = "outdoor";
}
```

이제 NPC가 영원히 벽에 끼이는 일은 없습니다.

## 이번 세션 전체 성과

오늘 하루 동안:

| 작업 | 커밋 |
|---|---|
| 디버그 모드 (Ctrl+Shift+D) | 1 |
| 룰 베이스 → LLM 전환 | 1 |
| 언어 토글 UI 제거 | 1 |
| 모바일 텍스트 최적화 | 4 |
| 모바일 핀치 줌 수정 | 1 |
| HTML 라벨 오버레이 | 1 |
| main.js 모듈화 (7034→4400줄) | 5 |
| NPC 기억 강화 + Firebase 저장 | 2 |
| 도슨트 온보딩 + 관조 모드 | 1 |
| 버그 수정 | 3 |
| DevLog | 4 |
| **합계** | **24커밋** |

- 새 모듈: 7개 (weather, multiplayer, npc-data, quest, memory-sync, label-overlay, +서버 프롬프트 강화)
- main.js: -38.8% (7034 → 4400줄)
- 서버 재배포: 3회

3단계 방문자 경험이 구현되었습니다:
1. **5초 체류 → 관조**: V키로 마을 구경
2. **첫 방문 → 가이드**: 유진이 LLM으로 자연스러운 안내
3. **재방문 → 관계**: NPC가 과거를 기억하고 맞이
