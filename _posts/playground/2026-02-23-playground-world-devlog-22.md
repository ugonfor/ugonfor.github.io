---
layout: post
title: "Playground Devlog #22 - 모바일 최적화와 디버그 모드"
date: 2026-02-23 10:00:00 +0900
categories: [playground, devlog]
tags: [mobile, debug-mode, html-overlay, pinch-zoom, llm-gossip]
---

모바일에서의 경험을 대폭 개선하고, 개발 편의를 위한 디버그 모드를 추가한 세션.

## 디버그 모드 (Ctrl+Shift+D)

LLM inference가 어떻게 작동하는지 투명하게 보고 싶었습니다.

**토글**: `Ctrl+Shift+D` (채팅 입력 중에도 동작)

콘솔에 출력되는 정보:
- **Request**: NPC 이름, 전체 payload (persona, memory, tone, needs, socialContext)
- **Full Prompt**: 서버가 조립한 system 지시 + 마을 lore + 응답규칙 + 유저 메시지
- **Response**: reply, emotion, farewell, action, suggestions, mention
- 혼잣말/관계 혼잣말 등 간이 호출도 로깅

서버에 `x-debug: 1` 헤더를 보내면 응답에 `_debug.prompt`가 포함됩니다. CORS에 `X-Debug` 헤더도 추가.

## 룰 베이스 관계 혼잣말 → LLM

NPC가 다른 NPC에 대해 혼잣말하는 코드가 하드코딩이었습니다:

```js
// Before
const lines = rel >= 65
  ? ["잘 지내고 있어.", "좋은 친구야."]
  : rel < 35
    ? ["좀 서먹해...", "사이가 좀 그래."]
    : ["그냥 평범한 사이야."];
```

```js
// After
llmReplyOrEmpty(a, `(${b.name}과의 관계: ${relLabel}. 중얼거려주세요. 10자 이내.)`)
```

**메타인지 문제도 수정**: "혼잣말을 해주세요"라고 하면 LLM이 "나 지금 혼잣말하는 중이야..."라고 답하는 문제. 프롬프트를 `"지금 느끼는 것을 자연스럽게 중얼거려주세요. '~하다', '~네' 식의 독백"` 으로 변경.

## 언어 토글 UI 제거

매번 접속 시 이름/언어 설정 모달이 뜨니까, 별도 언어 토글 버튼은 불필요. HTML + CSS + JS 모두 삭제. 63줄 삭제.

## 모바일 텍스트 깨짐 → HTML 오버레이

### 문제

NPC 이름과 건물 라벨이 **Canvas 텍스처 → 3D Sprite** 방식이었습니다. 모바일 고DPI 화면에서 텍스처가 늘어나면서 글자가 깨졌습니다.

### 시행착오

1. 스프라이트 크기만 키움 → 텍스처 해상도 부족으로 더 깨짐
2. 캔버스 해상도 2배 → 조금 나아졌지만 여전히 흐림
3. `devicePixelRatio` 반영 → DPR 3 기기에서도 부족
4. **최종 해결**: Canvas 텍스처 자체를 버리고 HTML DOM으로 전환

### 해결: LabelOverlay

말풍선(`SpeechOverlay`)이 HTML div로 렌더링되어 항상 선명한 것에서 착안.

```
3D 월드 좌표 → camera.project() → 스크린 좌표 → CSS position
```

`LabelOverlay` 클래스가 NPC 이름과 건물 라벨을 HTML div로 생성하고, 매 프레임 3D 좌표를 스크린 좌표로 프로젝션해서 배치합니다.

| 방식 | 해상도 | 성능 | 구현 |
|---|---|---|---|
| Canvas 텍스처 Sprite | DPI에 따라 깨짐 | GPU 처리 | 복잡 (dpr, font, scale 조정) |
| HTML DOM 오버레이 | 항상 선명 | CPU 처리 (가벼움) | 단순 (CSS font) |

**결과**: 어떤 해상도에서도 선명한 이름 표시. 코드도 단순해짐.

## 모바일 핀치 줌 수정

터치/휠 이벤트가 2D HUD 캔버스(`pointer-events: none`)에 걸려 있어서 모바일에서 핀치 줌이 안 되고 있었습니다. 3D 캔버스(`canvas3D`)로 이벤트를 옮겨서 해결.

## 이번 세션 숫자

- 커밋: 8개
- 새 파일: 1개 (`label-overlay.js`)
- 삭제: ~100줄 (언어 토글 + 캔버스 텍스처 코드)
- 서버 재배포: 2회

텍스트 렌더링 하나에 4번의 시행착오를 거쳤지만, 결국 가장 단순한 방법(HTML)이 정답이었습니다.
