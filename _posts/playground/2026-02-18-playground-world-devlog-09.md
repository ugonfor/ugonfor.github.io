---
layout: post
title: "Playground Devlog #9 - NPC 기억 시스템부터 경제·탐험까지, 6개 Phase 한번에 구현"
date: 2026-02-18 22:00:00 +0900
categories: [playground, devlog]
tags: [npc, memory, social-graph, story-arc, economy, achievement, challenge]
---

기존 NPC는 대화를 전혀 기억하지 못했습니다. 이번 업데이트에서 총 6개 Phase를 한 번에 구현했습니다. 아래 다이어그램은 전체 시스템이 어떻게 맞물리는지 보여줍니다.

<div class="mermaid">
graph TB
  subgraph "🎮 클라이언트 (playground-world.js)"
    P[플레이어 입력] --> SA[감정 분석<br/>analyzeSentiment]
    P --> CM[채팅 명령어<br/>상점·업적·도전]
    SA --> CE[대화 효과 적용<br/>applyConversationEffect]
    CE --> MEM[NPC 기억 저장<br/>addNpcMemory]
    CE --> REL[관계 변동<br/>adjustRelation]
    CE --> MOOD[기분 변화<br/>mood·moodUntil]
    MEM --> SUMMARY[기억 요약 생성<br/>getNpcMemorySummary]
    SUMMARY --> LLM_PAY[LLM 페이로드]
    SOC[소셜 그래프] --> LLM_PAY
    TONE[톤 힌트<br/>getMemoryBasedTone] --> LLM_PAY
  end

  subgraph "🌐 서버 (llm-proxy.mjs)"
    LLM_PAY --> BP[buildPrompt]
    BP --> |기억·톤·소셜| GEMINI[Gemini API]
    GEMINI --> REPLY[NPC 응답]
  end

  subgraph "🔄 백그라운드 루프"
    AMB[updateAmbientEvents] --> GOSSIP[가십 전파]
    AMB --> SOCIAL[NPC 소셜 상호작용]
    AMB --> STORY[스토리 아크 체크]
    AMB --> SEASON[계절 변화]
    AMB --> ACH[업적 체크]
    AMB --> CHAL[도전 퀘스트 업데이트]
  end

  subgraph "💾 저장소 (localStorage)"
    SAVE[saveState] --- D1[memory]
    SAVE --- D2[npcSocialGraph]
    SAVE --- D3[storyArc]
    SAVE --- D4[coins · shopInventory]
    SAVE --- D5[unlockedAchievements]
  end

  style P fill:#4CAF50,color:#fff
  style GEMINI fill:#4285F4,color:#fff
  style SAVE fill:#FF9800,color:#fff
</div>

플레이어가 말을 걸면 감정 분석 → 기억 저장 → LLM 프롬프트 조립 → 서버 호출이 순서대로 일어나고, 백그라운드에서는 가십·스토리·계절·업적이 동시에 돌아갑니다. 이제 각 Phase를 하나씩 살펴보겠습니다.

---

## Phase 1 — NPC 기억 시스템

NPC의 `memory: []` 배열을 구조화된 객체로 교체했습니다.

```
memory: { entries: [], conversationCount, giftsReceived, questsShared }
```

대화, 선물, 퀘스트, 호감도 변화 — 4가지 이벤트가 발생할 때마다 기억이 쌓이고, 이 기억은 LLM 프롬프트 주입, 말풍선 대사, 로컬 폴백 응답의 3곳에서 활용됩니다.

<div class="mermaid">
flowchart LR
  subgraph "이벤트 발생"
    A1[💬 대화]
    A2[🎁 선물]
    A3[📋 퀘스트 완료]
    A4[💕 호감도 레벨업]
  end

  subgraph "기억 저장"
    B[addNpcMemory<br/>최대 20개, FIFO]
  end

  subgraph "기억 활용"
    C1[LLM 프롬프트 주입<br/>getNpcMemorySummary]
    C2[말풍선 대사<br/>npcAmbientLine]
    C3[로컬 폴백 톤<br/>npcReply]
  end

  A1 --> B
  A2 --> B
  A3 --> B
  A4 --> B
  B --> C1
  B --> C2
  B --> C3

  style B fill:#E91E63,color:#fff
</div>

기억이 20개를 초과하면 가장 오래된 것부터 밀려납니다(FIFO). LLM에는 최근 8개만 요약해서 전달하므로 프롬프트가 과하게 길어지지 않습니다. 실제로 서버에 전달되는 기억 요약은 이렇게 생겼습니다:

```
관계: 친구 (호감도 2단계)
통계: 대화 7회, 선물 2회, 퀘스트 1회
최근 기억:
[대화] 플레이어: "오늘 뭐해?" → 나: "카페 갈까 생각 중이야"
[선물] 커피 원두을(를) 선물 받음
[관계] 관계가 '친구'(으)로 발전
```

호감도가 올라갈수록 NPC의 말투도 자연스럽게 변합니다. 존댓말에서 반말로, 서먹함에서 친밀함으로:

<div class="mermaid">
graph LR
  L0["Lv.0 낯선 사이<br/>🧊 정중한 존댓말"] --> L1["Lv.1 아는 사이<br/>🙂 약간 친근한 존댓말"]
  L1 --> L2["Lv.2 친구<br/>😊 편한 존댓말 + 반말"]
  L2 --> L3["Lv.3 절친<br/>😄 친근한 반말"]
  L3 --> L4["Lv.4 소울메이트<br/>🥰 매우 친밀한 반말"]

  style L0 fill:#B0BEC5,color:#000
  style L1 fill:#90CAF9,color:#000
  style L2 fill:#81C784,color:#000
  style L3 fill:#FFB74D,color:#000
  style L4 fill:#F06292,color:#fff
</div>

NPC 근처를 지나갈 때도 30% 확률로 기억 기반 대사가 말풍선으로 뜹니다 — "그때 받은 선물… 아직 간직하고 있어", "같이 퀘스트 했던 거 기억나" 같은 대사들입니다. 나머지 70%는 기존 species 기반 대사가 유지됩니다.

---

## Phase 2 — 의미있는 대화 반응

Phase 1이 "NPC가 기억한다"였다면, Phase 2는 "플레이어의 말이 실제로 영향을 미친다"입니다. 매 대화 후 `analyzeSentiment()`가 플레이어 메시지를 분석하고, 감정에 따라 관계와 기분이 자동으로 변합니다.

<div class="mermaid">
flowchart TD
  MSG[플레이어 메시지] --> ANA{analyzeSentiment}

  ANA -->|"사랑, 최고, 고마워"| POS_S["긍정 강 ❤️"]
  ANA -->|"좋아, 괜찮, 재밌"| POS_W["긍정 약 💛"]
  ANA -->|"싫어, 바보, 최악"| NEG["부정 💔"]
  ANA -->|"뭐? 왜? 어떻게?"| CUR["호기심 🤔"]
  ANA -->|"그냥, 음, 글쎄"| NEU["중립 😐"]

  POS_S --> E1["관계 +4<br/>기분 → 😊 happy (20초)"]
  POS_W --> E2["관계 +2"]
  NEG --> E3["관계 -4<br/>기분 → 😢 sad (15초)"]
  CUR --> E4["관계 +1"]
  NEU --> E5["변화 없음"]

  style POS_S fill:#E91E63,color:#fff
  style POS_W fill:#FF9800,color:#fff
  style NEG fill:#F44336,color:#fff
  style CUR fill:#2196F3,color:#fff
  style NEU fill:#9E9E9E,color:#fff
</div>

"고마워"라고 하면 NPC 머리 위에 😊가 뜨고, "바보"라고 하면 😢가 뜹니다. 호감도 포인트도 같이 변하기 때문에 칭찬을 꾸준히 하면 관계 레벨이 올라가고, 반대로 공격적인 말을 계속하면 관계가 나빠집니다. 호감도가 100을 넘으면 레벨업이 발생하면서 Phase 1의 톤 변화가 적용됩니다.

---

## Phase 3 — NPC 소셜 그래프

여기까지는 플레이어↔NPC 관계였습니다. Phase 3에서는 **NPC끼리의 관계**를 추가했습니다. 각 NPC 쌍마다 0~100 수치로 관계가 관리됩니다.

<div class="mermaid">
graph TD
  HEO["허승준"] ---|65 친구| KIM["김민수"]
  HEO ---|52 보통| CHOI["최민영"]
  KIM ---|28 서먹| CHOI
  HEO ---|70 친구| JUNG["정욱진"]
  KIM ---|45 보통| SEO["서창근"]
  JUNG ---|38 서먹| SEO
  SEO ---|55 보통| LEE["이진원"]

  style HEO fill:#e56f6f,color:#fff
  style KIM fill:#6fa1e5,color:#fff
  style CHOI fill:#79c88b,color:#fff
  style JUNG fill:#b88be6,color:#fff
  style SEO fill:#e6a76f,color:#fff
  style LEE fill:#6fc7ba,color:#fff
</div>

이 관계는 고정이 아닙니다. NPC끼리 가까이 있으면 자연스럽게 변합니다 — 친한 사이(60+)면 관계가 더 좋아지고, 서먹한 사이(40 미만)면 더 나빠집니다. 그리고 **가십**이 퍼집니다:

<div class="mermaid">
sequenceDiagram
  participant A as NPC A
  participant B as NPC B (근처)
  participant C as NPC C (근처)
  participant Q as gossipQueue

  A->>Q: spreadGossip(A, B, "positive")
  Note over Q: 가십 큐에 저장
  Q->>C: processGossip()
  Note over C: C의 B에 대한 관계 +2

  Note over A,B: 거리 3.0 이내, 관계 ≥ 60
  A->>A: 관계 자연 상승 +1
  A-->>A: 💬 "김민수이랑은 잘 지내고 있어."
</div>

A가 B에 대해 좋게 말하면, 근처에 있던 C도 B에 대한 인식이 좋아집니다. 플레이어 근처에서 이런 일이 벌어지면 말풍선으로 볼 수 있습니다.

NPC 대화 시에도 이 소셜 정보가 LLM에 전달됩니다 (`NPC 인간관계: 김민수: 친구(68), 최민영: 보통(52)...`). 덕분에 "김민수는 어때?"라고 물으면 NPC가 자기 관계에 맞는 대답을 합니다.

서먹한 NPC 쌍이 있으면 **중재 퀘스트**가 생성될 수 있습니다:

<div class="mermaid">
flowchart LR
  S1["A의 고민 듣기"] --> S2["B의 입장 듣기"]
  S2 --> S3["A에게 전달"]
  S3 --> S4["B에게 화해 소식"]
  S4 --> R["✅ 완료<br/>NPC 간 관계 +20"]

  style R fill:#4CAF50,color:#fff
</div>

플레이어가 중간에서 양쪽 이야기를 듣고 전달해주면 NPC 간 관계가 크게 회복됩니다.

---

## Phase 4 — 동적 스토리 아크

Phase 3까지의 관계/기억 데이터가 충분히 쌓이면, **스토리 아크**가 자동으로 트리거됩니다. 매 프레임 `checkStoryArcTriggers()`가 조건을 검사합니다:

<div class="mermaid">
flowchart TD
  CHECK["checkStoryArcTriggers()"] --> C1{"NPC 불화<br/>관계 < 30?"}
  CHECK --> C2{"NPC 호감도<br/> ≥ 2?"}
  CHECK --> C3{"선물 3회+<br/>받은 NPC?"}
  CHECK --> C4{"퀘스트<br/>10개+ 완료?"}

  C1 -->|Yes| S1["📖 라이벌의 탄생"]
  C2 -->|Yes| S2["📖 비밀 편지"]
  C3 -->|Yes| S3["📖 잃어버린 보물"]
  C4 -->|Yes| S4["📖 마을 축제 준비"]

  style S1 fill:#F44336,color:#fff
  style S2 fill:#E91E63,color:#fff
  style S3 fill:#FF9800,color:#fff
  style S4 fill:#4CAF50,color:#fff
</div>

조건을 만족하면 해당 스토리가 시작되고, 퀘스트 배너에 📖 표시와 함께 진행 상황이 표시됩니다. 한 번 트리거된 스토리는 다시 발생하지 않습니다.

특히 "라이벌의 탄생"에는 **선택지 분기**가 있습니다. 불화 중인 두 NPC 사이에서 누구 편을 들지, 아니면 중재할지를 선택할 수 있고, 선택에 따라 결과가 달라집니다:

<div class="mermaid">
flowchart TD
  START["📖 라이벌의 탄생"] --> T1["A: '그 사람이 나를 무시하는 것 같아'"]
  T1 --> T2["B: '오해가 있었나봐'"]
  T2 --> CHOICE{"🤔 선택"}

  CHOICE -->|"1. A 편"| R1["A 관계↑ B↔A 관계↓"]
  CHOICE -->|"2. B 편"| R2["B 관계↑ B↔A 관계↓"]
  CHOICE -->|"3. 중재"| R3["A↔B 관계 +15"]

  R1 --> END["A: '고마워. 생각이 정리됐어.'"]
  R2 --> END
  R3 --> END

  style CHOICE fill:#FF9800,color:#fff
  style R3 fill:#4CAF50,color:#fff
</div>

"마을 축제 준비"는 퀘스트를 10개 이상 클리어한 플레이어에게 열리는 엔드게임 콘텐츠로, 여러 NPC를 돌아다니며 재료를 모으면 마을 전체가 축제 분위기가 됩니다 (전 NPC 기분 happy + 보석 보상).

---

## Phase 5 — 경제 & 생활 시뮬

지금까지 아이템은 바닥에서 줍거나 퀘스트 보상으로만 얻었습니다. Phase 5에서 **코인 화폐**와 **상점**을 도입해서 경제 순환 구조를 만들었습니다.

<div class="mermaid">
flowchart LR
  subgraph "💰 코인 획득"
    Q["퀘스트 완료<br/>5+스테이지×2"]
    A["업적 달성<br/>+10"]
    CH["도전 성공<br/>15~25"]
  end

  subgraph "💰 코인 소비"
    BUY["상점 구매"]
  end

  subgraph "🏪 상점"
    SHOP["재고 관리<br/>계절마다 재입고"]
  end

  subgraph "🎁 활용"
    GIFT["NPC에게 선물"]
    QITEM["퀘스트 아이템 납품"]
  end

  Q --> |코인| BUY
  A --> |코인| BUY
  CH --> |코인| BUY
  BUY --> |아이템| GIFT
  BUY --> |아이템| QITEM
  GIFT --> |관계↑ 기억 저장| Q
  SHOP --> BUY

  style Q fill:#4CAF50,color:#fff
  style SHOP fill:#2196F3,color:#fff
</div>

퀘스트를 깨면 코인을 벌고, 코인으로 상점에서 아이템을 사고, 아이템을 NPC에게 선물하면 관계가 올라가고, 관계가 올라가면 새 퀘스트가 열립니다. 채팅에 `상점` 을 입력하면 가격과 재고를 볼 수 있고, `구매 커피 원두` / `판매 보석` 같은 명령으로 거래합니다. 판매가는 매입가의 60%입니다.

게임 내 7일마다 계절이 바뀌고, 계절마다 상점 재고가 자동 보충됩니다:

<div class="mermaid">
graph LR
  SP["🌸 봄<br/>꽃 자주 피어남"] -->|7일| SU["☀️ 여름<br/>NPC 활발 활동"]
  SU -->|7일| AU["🍂 가을<br/>특별 상품 등장"]
  AU -->|7일| WI["❄️ 겨울<br/>NPC 실내 체류↑"]
  WI -->|7일| SP

  style SP fill:#F8BBD0,color:#000
  style SU fill:#FFF9C4,color:#000
  style AU fill:#FFE0B2,color:#000
  style WI fill:#BBDEFB,color:#000
</div>

가을에는 보석·간식 재고가 추가로 들어옵니다. 시작 자금은 10코인이며, 플레이어 정보 패널에 잔액이 항상 표시됩니다.

---

## Phase 6 — 탐험 & 도전 확장

마지막으로, 장기 목표를 제공하는 **업적 시스템**과 순간적인 긴장감을 주는 **도전 퀘스트**를 추가했습니다.

업적은 12종이며, 난이도별로 나뉩니다. 달성할 때마다 10코인을 받습니다:

<div class="mermaid">
graph TD
  subgraph "🟢 쉬움"
    A1["💬 첫 대화"]
    A2["🦋 사교왕<br/>5명 대화"]
  end
  subgraph "🟡 보통"
    A3["🎁 선물의 달인<br/>10회 선물"]
    A4["🗺️ 탐험가<br/>10곳 발견"]
    A5["💰 부자<br/>100코인"]
    A6["🦉 올빼미<br/>야간 발견"]
  end
  subgraph "🔴 어려움"
    A7["💖 소울메이트<br/>호감 4단계"]
    A8["⭐ 퀘스트 마스터<br/>20개 완료"]
    A9["🕊️ 중재자"]
    A10["📦 수집가<br/>전 아이템 보유"]
    A11["📖 스토리텔러<br/>스토리 완료"]
    A12["🌍 사계절<br/>28일 플레이"]
  end

  style A1 fill:#C8E6C9,color:#000
  style A2 fill:#C8E6C9,color:#000
  style A3 fill:#FFF9C4,color:#000
  style A4 fill:#FFF9C4,color:#000
  style A5 fill:#FFF9C4,color:#000
  style A6 fill:#FFF9C4,color:#000
  style A7 fill:#FFCDD2,color:#000
  style A8 fill:#FFCDD2,color:#000
  style A9 fill:#FFCDD2,color:#000
  style A10 fill:#FFCDD2,color:#000
  style A11 fill:#FFCDD2,color:#000
  style A12 fill:#FFCDD2,color:#000
</div>

"중재자"는 Phase 3의 중재 퀘스트를, "스토리텔러"는 Phase 4의 스토리 아크를, "부자"는 Phase 5의 경제 시스템을 활용해야 달성할 수 있습니다. Phase들이 서로 맞물려 있는 셈입니다.

도전 퀘스트는 퀘스트 5개 이상 클리어 후 랜덤으로 등장합니다. 제한 시간 안에 목표를 달성해야 합니다:

| 도전 | 시간 | 목표 | 보상 |
|------|------|------|------|
| ⚔️ 번개 배달 | 45초 | NPC 3명 순서대로 방문 | 20코인 |
| ⚔️ 아이템 사냥 | 60초 | 아이템 3개 줍기 | 15코인 |
| ⚔️ 소셜 스프린트 | 90초 | NPC 4명과 대화 | 25코인 |

채팅에 `도전`을 입력하면 남은 시간과 진행 상황을 확인할 수 있습니다.

---

## 채팅 명령어 총정리

| 명령어 | 기능 |
|--------|------|
| `인벤토리` / `가방` | 아이템 + 코인 확인 |
| `상점` / `가게` | 상점 목록 보기 |
| `구매 [아이템]` | 아이템 구매 |
| `판매 [아이템]` | 아이템 판매 |
| `업적` | 업적 진행 상황 |
| `도전` | 진행 중 도전 퀘스트 확인 |

---

## 수정 파일 & 저장

| 파일 | 변경 내용 |
|------|-----------|
| `assets/js/playground-world.js` | 6개 Phase 전체 (기억, 감정, 소셜, 스토리, 경제, 도전) |
| `server/llm-proxy.mjs` | 기억·톤·소셜 컨텍스트를 LLM 프롬프트에 주입 |
| `_layouts/default.html` | Mermaid.js CDN 추가 |

모든 신규 데이터는 `localStorage`에 저장·복원됩니다. 구 세이브 파일도 `ensureMemoryFormat()` 마이그레이션으로 호환됩니다.

<div class="mermaid">
graph LR
  SAVE["saveState()"] --> M["memory<br/>(NPC별 기억)"]
  SAVE --> SG["npcSocialGraph<br/>(NPC간 관계)"]
  SAVE --> SA["storyArc<br/>(스토리 진행)"]
  SAVE --> EC["coins · shopInventory"]
  SAVE --> AC["unlockedAchievements"]

  LOAD["loadState()"] --> MIG["ensureMemoryFormat()<br/>구 세이브 호환"]

  style SAVE fill:#FF9800,color:#fff
  style LOAD fill:#4CAF50,color:#fff
  style MIG fill:#9C27B0,color:#fff
</div>
