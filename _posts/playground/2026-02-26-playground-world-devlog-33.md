---
layout: post
title: "Playground Devlog #33 - NPC 프롬프트 대수술: 메타 언어 제거, 개인 서사 추가"
date: 2026-02-26 00:30:00 +0900
categories: [playground, devlog]
tags: [llm-prompt, npc-backstory, immersion, multi-turn, korean-nlp]
---

NPC가 "플레이어"라는 단어를 알면 안 됩니다. LLM 프롬프트에서 게임적 언어를 전부 걷어내고, 각 NPC에게 깊은 개인 서사를 부여한 세션.

## 1. NPC 개인 서사 (backstory) 추가

기존 프롬프트에는 성격 한 줄 + 말버릇만 있었습니다.

### Before
```
이름: 새벽
프로필: 남성, 20대, 성격: 새벽 감성. 조용하지만 깊은 생각을 품고 있음.
[캐릭터 말버릇] 새벽/밤 감성의 시적인 말투.
```

### After
```
[캐릭터 배경] 새벽은 불면증이 친구를 만들어줬다고 말한다. 매일 새벽 4시에
깨서 마을이 잠든 사이 혼자 산책하며 시를 쓴다. 별이와 옥상에서 만나 밤새
이야기하는 날이 일주일에 두 번은 있다. 밀순이가 빵을 굽기 시작하는 새벽
5시면 빵집 앞에 서 있는데, 둘은 말없이 따뜻한 빵을 나누는 사이다.
```

25개 NPC 전원에게 2~4문장의 서사를 부여했고, NPC 간 교차 참조가 엮여 있습니다:

| 연결 | 내용 |
|---|---|
| 도깨비 ↔ 구름 | 기숙사 '그림자'의 정체 = 야식 사러 나가는 구름 |
| 별이 ↔ 새벽 | 옥상 심야 대화 파트너 |
| 밀순이 ↔ 별이 | 관측 성공한 날만 만드는 '별빛 크루아상' |
| 꽃잎 ↔ 나비 | 서로를 위한 행동을 하면서 모름 (양방향 비밀) |
| 글타래 ↔ 느티 | '유곤포르 연대기' 집필 중 |
| 모카 | 주민 25명 이름 딴 비밀 메뉴 |
| 돌담 | 마을 주민 전원의 미니어처 조각 중 |

## 2. 메타 언어 전면 제거

NPC는 "플레이어"라는 개념을 모릅니다.

| Before | After |
|---|---|
| `플레이어와의 관계: 낯선 사이 (0/4단계)` | `효곤과의 사이: 낯선 사이` |
| `유저 메시지: 안녕` | `효곤: 안녕` |
| `NPC 답변:` | `새벽:` |
| `월드 컨텍스트:` | `지금 상황:` |
| `배고픔 23/100, 에너지 88/100` | (평범하면 안 보임, 극단적이면 "슬슬 배가 고파진다") |
| `도깨비: 보통(50)` | `도깨비: 보통` |

## 3. Gemini multi-turn 구조

단일 문자열에 모든 것을 넣던 방식에서, Gemini API의 구조적 턴으로 전환.

### Before
```
contents: [{
  role: "user",
  text: "시스템프롬프트 + 대화내역 + 유저메시지 전부 하나로"
}]
```

### After
```
systemInstruction: "캐릭터 설정 + 규칙 + 배경"
contents: [
  { role: "user",  text: "안녕" },
  { role: "model", text: "반가워요" },
  { role: "user",  text: "뭐해?" }
]
```

Gemma 폴백 시에는 systemInstruction을 첫 user 메시지에 합쳐서 호환성 유지.

## 4. 8가지 프롬프트 버그 수정

디버그 로그를 분석해서 발견한 문제들:

| # | 문제 | 수정 |
|---|---|---|
| 1 | 철벽 프롬프트에 "근처에 철벽이 있다" (자기참조) | 대상 NPC를 nearby에서 제외 |
| 2 | NPC끼리 대화하는데 "처음 만나는 사람" | NPC-to-NPC에 `favorLevel: 2` |
| 3 | 철벽이 "개발자 홈페이지 속 세계" 읊음 | meta lore를 유효곤/느티/유진에게만 |
| 4 | "보통(50)" 수치 노출 | 숫자 제거 |
| 5 | "글타래이(가)" 조사 깨짐 | `particle()` 받침 판별 함수 |
| 6 | 12자 독백에 suggestions/emotion 반환 | ambient는 structured output 스킵 |

### particle() 함수

한국어 조사를 받침 유무에 따라 자동 선택:

```js
function particle(name, consonantForm, vowelForm) {
  const last = name.charCodeAt(name.length - 1);
  if (last >= 0xAC00 && last <= 0xD7A3) {
    return (last - 0xAC00) % 28 === 0 ? vowelForm : consonantForm;
  }
  return consonantForm;
}
// "철벽" → 받침 있음 → "철벽이", "철벽과", "철벽은"
// "모카" → 받침 없음 → "모카가", "모카와", "모카는"
```

### meta lore 분리

일반 NPC:
```
마을의 기원은 아무도 정확히 모른다.
어느 날 사람들이 하나둘 모여 자연스럽게 마을이 형성되었다.
```

유효곤/느티/유진만:
```
이 마을의 이름은 '유곤포르'. 개발자 Hyogon Ryu의 홈페이지 속에 자리잡은 작은 세계.
원래는 텅 빈 웹페이지였지만, 어느 날 AI 주민들이 하나둘 생겨나면서...
```

## 이번 커밋들

| 커밋 | 내용 |
|---|---|
| Add rich NPC backstories | 25개 NPC 개인 서사 (한/영) |
| Remove meta-game language | "플레이어" → 실제 이름 |
| Humanize world context | 수치 → 자연어, 메타 용어 제거 |
| Multi-turn systemInstruction | Gemini API 구조적 턴 전환 |
| Fix 8 prompt issues | 자기참조, NPC-NPC, lore, 조사, ambient |
