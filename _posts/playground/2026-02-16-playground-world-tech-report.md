---
layout: post
title: "Playground Tech Report - 전체 시스템 현황 및 Merge 가이드"
date: 2026-02-16 16:00:00 +0900
categories: [playground, tech-report]
tags: [architecture, merge, quest, weather, multiplayer, card, discovery]
---

세 명의 작업자가 동시에 작업한 결과를 merge하기 전, 전체 시스템 현황과 변경 사항을 정리한 기술 리포트입니다.

---

## 1. 프로젝트 개요

**Playground**는 브라우저 기반 오픈 월드 시뮬레이션 게임입니다.

- **프론트엔드**: GitHub Pages (Jekyll) + Canvas 렌더링
- **백엔드**: Cloud Run (Google Gemini LLM 프록시)
- **멀티플레이어**: Firebase Realtime DB (옵션)
- **코어 엔진**: `assets/js/playground-world.js` (약 4,960줄)

### 핵심 파일 구조

```
├── _config.yml                    # Jekyll 설정 + API/Firebase 키
├── assets/
│   ├── css/playground.css         # UI 스타일 (765줄)
│   └── js/playground-world.js     # 게임 엔진 (4,960줄)
├── playground/index.md            # HTML 구조 (Jekyll)
└── server/
    ├── llm-proxy.mjs              # LLM 프록시 서버
    ├── firebase-rules.json        # DB 보안 규칙
    └── README.md                  # 배포 가이드
```

---

## 2. 현재 구현 완료된 시스템 전체 목록

### A. 월드 & 환경

| 시스템 | 설명 |
|--------|------|
| 맵 | 34×34 타일 그리드, 아이소메트릭 프로젝션 |
| 시간 | 인게임 시계 (실시간 1초 = 게임 14분), 낮/밤 주기 |
| 날씨 | clear, cloudy, rain, storm, snow, fog (3~8분 간격 자동 전환) |
| 날씨 파티클 | 비/눈/번개/물튀김/나뭇잎/반딧불이 |
| 하늘 렌더링 | 시간대별 그라데이션, 태양/달/별/구름 |
| 물 애니메이션 | sin() 기반 반짝임, 비 올 때 웅덩이+파문 |
| 눈 쌓임 | 눈 intensity > 0.3 시 풀밭에 흰 타원 |
| 가로등 글로우 | 밤 18~6시 radialGradient 원형 빛 |

### B. 캐릭터 & NPC

| 시스템 | 설명 |
|--------|------|
| 기본 NPC 9명 | 각자 집/직장/취미 장소, 일과 루틴, 성격, 종족별 스프라이트 |
| NPC 일과 | 8~17시 출근, 17~21시 취미, 나머지 귀가 |
| NPC 배회 | 목적지 주변 랜덤 이동 + 간헐적 장거리 이동 |
| 커스텀 NPC 생성 | 이름/성격 지정, 로컬 저장 또는 공유 서버 동기화 |
| NPC 제거 | 모든 NPC 제거 가능, 관련 이벤트/요청 자동 취소 |
| NPC 대피 | 폭풍/강한 비 시 건물로 이동 |
| 앰비언트 대사 | 종족별 혼잣말, 6~17초 간격 |
| NPC 사교 | 가까운 NPC끼리 자동 상호작용 |
| 기분 표시 | 이모지 (😊/😢/😐) 머리 위 표시 |

### C. 플레이어

| 시스템 | 설명 |
|--------|------|
| 이동 | WASD/방향키, 모바일 조이스틱 |
| 달리기 | Shift 키 (1.75배속), 날씨에 따른 감속 |
| 자동산책 | NPC/장소 간 자동 배회 + 자동 대화 |
| 이름 | 첫 접속 시 설정, localStorage 저장 |

### D. 퀘스트 시스템

**하드코딩 메인 퀘스트: "이웃의 실타래" (6단계)**
- Stage 0~5: NPC 간 메시지 전달, 공원 기념비 야간 조사
- 완료 후 동적 퀘스트 자동 해금

**동적 퀘스트 (10개 타입)**

| 타입 | Tier | 핵심 메커닉 |
|------|------|------------|
| deliver | 1 | NPC 간 메시지 전달 |
| explore | 1 | 장소 방문 후 귀환 |
| social | 1 | NPC와 다단계 대화 |
| observe | 1 | 특정 시간에 장소 방문 |
| fetch | 1 | 아이템 가져다주기 (인벤토리 소모) |
| chain | 2 | 3명 NPC 순서대로 소식 전파 (5단계) |
| investigate | 2 | 단서 장소 방문 → 미스터리 NPC 찾기 |
| gift_quest | 2 | 아이템 수집 → 다른 NPC에게 전달 |
| nightwatch | 3 | 밤 20시 이후 2곳 순찰 |
| urgent | 3 | 긴급 배달 (60초 내 완료 시 보너스) |

**Tier 시스템**: questCount 0~5 → Tier1, 6~15 → Tier2, 16+ → Tier3

**반복 방지**: 최근 3회 같은 타입 금지, 최근 2회 같은 NPC 우선 회피

### E. 관계도 & 호감도

| 시스템 | 설명 |
|--------|------|
| 관계도 | 0~100 수치 (대화/퀘스트로 증가) |
| 호감 레벨 | 0 낯선 사이 → 1 아는 사이 → 2 친구 → 3 절친 → 4 소울메이트 |
| 호감 요청 | 레벨별 3종 템플릿 (아이템/배달/방문), 3분 제한 |
| 카드 효과 | relation 카드로 관계도 증가 배율 적용 |

### F. 아이템 & 인벤토리

| 아이템 | 설명 |
|--------|------|
| 🌹 빨간 꽃 | 선물용 |
| 🌼 노란 꽃 | 선물용 |
| ☕ 커피콩 | 선물용 |
| 🍪 간식 | 선물용, 카드 효과로 2배 |
| 💌 편지 | 퀘스트 재료 |
| 💎 보석 | 희귀 아이템, 카드 효과로 리스폰 단축 |

- 맵에 12개 고정 스폰, 3분 리스폰
- NPC에게 선물 가능 (관계도/기분 상승)

### G. 카드 시스템

| 카드 | 등급 | 효과 |
|------|------|------|
| 첫 일출 | Rare | 이동속도 +5% |
| 별이 빛나는 밤 | Rare | 야간 시야 개선 |
| 우정의 증표 | Epic | 관계도 +10% |
| 탐험가의 발자국 | Common | 아이템 줍기 범위 +15% |
| 요리사의 비밀 | Common | 간식 2배 드롭 |
| 보석 사냥꾼 | Epic | 보석 리스폰 +20% |
| 사교계의 달인 | Rare | 호감 포인트 +15% |
| 전설의 주민 | Legendary | 모든 보상 2배 |

**드롭 확률**: 퀘스트 완료 25%, NPC 대화 6%, 아이템 줍기 4%, 이벤트 30%

**등급 비율**: Legendary 2%, Epic 12%, Rare 25%, Common 50%

### H. 발견 시스템 (15곳)

맵 곳곳에 숨겨진 15개 장소. 특정 조건(시간대/날씨)에서만 발견 가능.

| 이름 | 조건 | 보상 |
|------|------|------|
| 비밀 정원 | 항상 | 보석 |
| 강변의 편지 | 항상 | 편지 |
| 자정의 빛 | 밤 (22~4시) | 보석 |
| 비 오는 날의 버섯 | 비/폭풍 | 간식 |
| 숨겨진 우물 | 항상 | 보석 |
| 노을 전망대 | 저녁 (17~20시) | 빨간 꽃 |
| 안개 속 그림자 | 안개 | 보석 |
| 시장 뒷골목 비밀 | 항상 | 간식 |
| 밤의 고양이들 | 밤 | 간식 |
| 비밀 꽃밭 | 항상 | 빨간 꽃 |
| 폭풍의 수정 | 폭풍 | 보석 |
| 눈 위의 천사 | 눈 | 보석 |
| 새벽의 노래 | 새벽 (4~7시) | 편지 |
| 광장의 흔적 | 항상 | 커피 |
| 소원의 가로등 | 밤 | 편지 |

### I. 돌발 이벤트 (3종)

| 이벤트 | 시간 | 설명 |
|--------|------|------|
| 깜짝 세일 | 90초 | NPC에게 아이템 가져다주기 |
| 마을 모임 | 120초 | 장소 방문 시 무료 아이템 |
| NPC 위기 | 90초 | NPC에게 달려가기 (호감 보상) |

40% 확률, 60~180초마다 발생

### J. 채팅 & LLM

| 시스템 | 설명 |
|--------|------|
| 로컬 채팅 | 주제 감지 (퀘스트/사람/세계/긍정/일반) → 룰 기반 응답 |
| LLM 채팅 | Google Gemini 프록시, 스트리밍 SSE 지원 |
| 폴백 | LLM 실패 시 로컬 응답 자동 전환 |
| 월드 컨텍스트 | 시간/퀘스트/관계도/근처 NPC 정보 포함 |
| 특수 명령어 | `선물`, `인벤`, `제거` |
| 퀘스트 대사 강화 | enrichQuestDialogue()로 NPC 성격 기반 대사 비동기 교체 |
| 말풍선 | 14자 줄바꿈, truncation 없음 |

### K. 렌더링 & 그래픽

| 시스템 | 설명 |
|--------|------|
| 아이소메트릭 | 타일 기반 지형 (물/도로/풀밭) |
| 건물 | 원근 그림자 + 3D 지붕 |
| 프롭 | 나무/덤불/꽃/울타리/가로등 |
| 스프라이트 | 9종 NPC + 플레이어 (색상/성별 동적) |
| 야간 오버레이 | 20~5시 점진적 어두워짐 (최대 0.35), nightVision 카드로 감소 |
| 카메라 | 플레이어 중심, 대화 시 숄더뷰 줌, 마우스/터치 팬/줌 |
| 미니맵 | 월드/건물/NPC/플레이어/원격플레이어 표시 |
| 발견 반짝임 | 미발견 장소에 황금빛 파티클 |

### L. 멀티플레이어 (Firebase)

| 시스템 | 설명 |
|--------|------|
| 실시간 동기화 | Firebase Realtime DB, 100ms 간격 위치 브로드캐스트 |
| 위치 보간 | lerp로 부드러운 원격 플레이어 이동 |
| 자동 정리 | 12초 미응답 플레이어 제거 |
| 접속자 표시 | UI에 현재 접속자 수 |
| 비활성화 가능 | Firebase 키 비워두면 싱글플레이어로 동작 |

### M. 데이터 저장

**localStorage 키**

| 키 | 내용 |
|----|------|
| `playground_world_state_v2` | 전체 게임 상태 |
| `playground_ui_pref_v1` | UI 패널 표시 설정 |
| `playground_player_name_v1` | 플레이어 이름 |
| `playground_mobile_sheet_v1` | 모바일 탭 상태 |
| `playground_auto_walk_v1` | 자동 산책 설정 |

**저장되는 상태**: NPC 위치/호감/관계도, 인벤토리, 보유 카드, 카드 앨범, 퀘스트 진행, 발견 목록, 제거 NPC 목록, 퀘스트 히스토리/카운트

### N. 모바일 지원

- 가상 조이스틱 (96px)
- 동적 상호작용 버튼 (나가기/문 열기/대화하기 자동 전환)
- 달리기/일시정지/시점초기화 버튼
- 추가기능 패널 (카드/NPC 관리)
- 접이식 상태/로그 패널
- 터치 팬/핀치 줌

### O. 서버 인프라

| 시스템 | 설명 |
|--------|------|
| LLM 프록시 | Cloud Run, Gemini 모델 체인 폴백 |
| Rate Limiting | IP 기반 60초/30요청 |
| Turnstile | Cloudflare 인간 검증 (옵션) |
| CORS | 허용 오리진 제한 |
| 감사 로그 | GCS 기반 (옵션) |
| API 키 로테이션 | 복수 Google API 키 지원 |

---

## 3. 세 작업자 변경 사항 요약

### 작업자 1: 퀘스트 시스템 확장

**변경 파일**: `assets/js/playground-world.js`

| 항목 | 내용 |
|------|------|
| 새 상태 변수 | `questHistory` (최근 5개), `questCount` (누적 완료) |
| 기존 4개 템플릿 개선 | tier: 1 속성, dialogueVariants 3~4개 변형 |
| 새 퀘스트 6개 | fetch, chain, investigate, gift_quest, nightwatch, urgent |
| 공통 함수 | `relationKeyForNpc()`, `advanceDynamicQuest()`, `completeDynamicQuest()` 리팩터 |
| requireItem 스테이지 | 아이템 확인 → 소모 로직 |
| handleDynamicQuestProgress | requireItem/visit/npcId 3종 핸들러 분리 |
| generateDynamicQuest | tier 기반 필터링 + 반복 방지 |
| LLM 대사 강화 | `enrichQuestDialogue()` 비동기 교체 |
| 저장/불러오기 | questHistory, questCount, questType, primaryNpcId, startedAt |

### 작업자 2: 날씨 & 발견 & 비주얼

**변경 파일**: `assets/js/playground-world.js`

| 항목 | 내용 |
|------|------|
| weather 객체 | 상태 관리 (current, intensity, wind, lightning) |
| weatherParticles | rain/snow/fireflies/leaves/splashes 파티클 시스템 |
| discoveries 15개 | 시간/날씨 조건부 숨겨진 장소 |
| `updateWeather(dt)` | 3~8분 간격 전환, 번개, 파티클 생성 |
| `updateDiscoveries()` | 근접 + 조건 충족 시 발견 처리 |
| NPC 대피 | 폭풍/강한 비 시 건물로 이동 |
| 이동속도 감속 | 폭풍 0.8배, 눈 0.88배 |
| drawGround() 대폭 수정 | 밤하늘(달/별), 동적 구름, 물 애니메이션, 웅덩이, 눈 쌓임 |
| 새 렌더링 함수 | drawWeatherEffects, drawLampGlow, drawFireflies, drawDiscoverySparkles, drawWeatherIndicator |
| drawWorld() 호출순서 | 레이어 순서 재구성 |

### 작업자 3: 카드 효과 & 멀티플레이어

**변경 파일**: `_config.yml`, `playground/index.md`, `server/`, `assets/js/playground-world.js`

| 항목 | 내용 |
|------|------|
| 카드 효과 연결 (6곳) | adjustRelation, updatePlayer, pickupItem, nearestGroundItem, completeFavor, itemRespawnMs |
| 야간 오버레이 | 20~5시 점진적 어두움, nightVision 카드 적용 |
| NPC 제거 보강 | removedNpcIds 추적, 연쇄 취소 (타이머/호감요청), 동기화 가드 |
| 저장 확장 | inventory, ownedCards, cardAlbum, removedNpcIds, favorLevel/Points 저장/복원 |
| 멀티플레이어 | Firebase 초기화, 위치 브로드캐스트, 보간, 정리, 접속자 수 |
| 렌더링 수정 | 원격 플레이어 스프라이트/미니맵 표시 |
| Firebase 설정 | _config.yml + index.md 조건부 로드 |

---

## 4. Merge 충돌 지점 분석

### 높음 (수동 merge 필수)

| 위치 | 충돌 원인 |
|------|-----------|
| `drawGround()` | 작업자 2가 하늘/구름/물 대폭 변경 + 작업자 3의 야간 오버레이가 drawWorld 끝에 위치 |
| `drawWorld()` 끝부분 | 작업자 2가 호출 순서 재구성 + 작업자 3이 야간 오버레이 추가 |
| `updatePlayer()` spd 계산 | 작업자 2의 weatherSlow + 작업자 3의 cardEffectMultiplier("speed") → 둘 다 합쳐야 함 |

### 중간

| 위치 | 충돌 원인 |
|------|-----------|
| `saveState()` / `loadState()` | 3명 모두 필드 추가. 순서만 맞추면 됨 |
| `pickNpcRoamTarget()` | 작업자 2의 날씨 대피 로직 시작부 추가 |
| `frame()` 루프 | 3명 모두 호출 추가. 순서 정리 필요 |
| `updateUI()` | 작업자 2의 날씨+발견 표시 + 작업자 3의 접속자 수 |
| `playground/index.md` | 작업자 3의 Firebase 스크립트/접속자 요소 |

### 낮음 (자동 merge 가능)

| 위치 | 설명 |
|------|------|
| 데이터/상태 선언부 | 각각 다른 위치에 삽입 |
| 멀티플레이어 블록 | 파일 끝에 독립적 추가 |
| `_config.yml` | 파일 끝에 추가만 |
| `server/` | 새 파일 추가만 |

### Merge 시 spd 계산 통합 예시

```javascript
// 작업자 2 + 작업자 3 통합
const weatherSlow = weather.current === "storm" ? 0.8
  : weather.current === "snow" ? 0.88 : 1;
const spd = player.speed * runMul
  * cardEffectMultiplier("speed")
  * weatherSlow;
```

### drawWorld 끝부분 통합 순서 권장

```javascript
drawDiscoverySparkles();     // 작업자 2
drawSpeechBubbles();         // 기존

// 야간 오버레이 (작업자 3)
const nh = hourOfDay();
let nightAlpha = /* ... */;
ctx.fillStyle = `rgba(10,10,40,${nightAlpha})`;
ctx.fillRect(0, 0, canvas.width, canvas.height);

drawLampGlow();              // 작업자 2
drawFireflies();             // 작업자 2
drawWeatherEffects();        // 작업자 2
drawWeatherIndicator();      // 작업자 2
```

---

## 5. 미완성 / 도움 필요 항목

### 기능 미완성

| 항목 | 상태 | 필요 작업 |
|------|------|-----------|
| Firebase 실제 연동 | 설정만 됨 | Firebase 프로젝트 생성 + 키 입력 |
| Turnstile 인간 검증 | 코드 준비됨 | Cloudflare 사이트키 발급 + 적용 |
| 퀘스트 LLM 대사 강화 | 함수 작성됨 | LLM 프록시 서버 가동 시 테스트 필요 |
| 카드 앨범 UI | 데이터 구조만 존재 | 앨범 뷰어 UI 미구현 |

### 테스트 필요

| 항목 | 확인 사항 |
|------|-----------|
| 날씨 + 퀘스트 연동 | nightwatch/urgent 퀘스트가 날씨 영향 받는지 |
| 카드 효과 + 날씨 감속 | speed 카드와 폭풍 감속이 동시 적용될 때 밸런스 |
| 발견 + 날씨 조건 | storm/fog 조건 발견이 실제로 트리거되는지 |
| 멀티플레이어 + NPC 제거 | 한 플레이어가 NPC 제거 시 다른 플레이어에게 영향 |
| 저장/불러오기 호환 | 3명의 저장 필드가 모두 포함된 상태에서 기존 세이브 로드 |
| chain 퀘스트 5단계 | 중간에 NPC가 제거되면 어떻게 되는지 |

### 밸런스 조정 필요

| 항목 | 현재 값 | 비고 |
|------|---------|------|
| 날씨 전환 주기 | 3~8분 | 너무 자주? 체험 후 조정 |
| 폭풍 이동속도 | 0.8배 | 답답할 수 있음 |
| Tier3 퀘스트 해금 | 16회 완료 후 | 도달까지 시간이 꽤 걸림 |
| urgent 제한시간 | 60초 | 맵 크기 대비 적절한지 |
| 카드 드롭률 | 퀘스트 25% | 체감 확인 필요 |

---

## 6. 향후 로드맵

### 단기 (merge 후 즉시)

- [ ] 세 작업자 코드 merge 및 충돌 해소
- [ ] 통합 테스트 (저장/불러오기, 퀘스트 진행, 날씨 전환)
- [ ] Firebase 프로젝트 생성 및 멀티플레이어 테스트

### 중기

- [ ] 카드 앨범 뷰어 UI
- [ ] NPC 간 관계도 시각화
- [ ] 건물 내부 진입
- [ ] 더 많은 발견 장소 추가
- [ ] BGM / 효과음

### 장기

- [ ] 마을 확장 (새 구역)
- [ ] NPC 스토리 아크
- [ ] 플레이어 간 상호작용 (멀티플레이어)
- [ ] 계절 시스템

---

## 7. 기술 스택 요약

| 분류 | 기술 |
|------|------|
| 프론트엔드 | HTML5 Canvas, Vanilla JS, Jekyll |
| 호스팅 | GitHub Pages |
| LLM | Google Gemini (2.0-flash → 2.5-pro → gemma 폴백) |
| 프록시 서버 | Node.js, Cloud Run (asia-northeast3) |
| 멀티플레이어 | Firebase Realtime Database |
| 보안 | Cloudflare Turnstile, CORS, Rate Limiting |
| 저장 | localStorage (클라이언트), GCS (감사 로그) |

---

*이 리포트는 2026-02-16 기준 작성되었습니다.*
*세 명의 공동작업자 코드를 merge하기 전 현황 정리 목적입니다.*
