---
layout: post
title: "Playground Devlog #21 - Structured Output으로 완성한 AI NPC 시스템"
date: 2026-02-22 10:00:00 +0900
categories: [playground, devlog]
tags: [structured-output, companion-fix, park, buildings, npcs, streaming-removal]
---

이번 세션의 마무리. AI NPC와의 상호작용을 근본적으로 재설계했습니다.

## Structured Output 통합

가장 큰 변화입니다. NPC가 대화에서 할 수 있는 모든 행동을 JSON 스키마로 정의했습니다.

```json
{
  "reply": "대사",
  "suggestions": ["선택지1", "선택지2", "선택지3"],
  "emotion": "happy | sad | angry | neutral",
  "farewell": false,
  "action": { "type": "guide_npc", "target": "heo" },
  "mention": { "npc": "heo", "place": "ksa_main" }
}
```

### 10가지 action type
- none, follow, unfollow, guide_place, guide_npc, go_place
- request_item, request_deliver, request_visit, give_item

### 기존 대비 개선
- `emotion` → regex 감정 분석(`inferSentimentFromReply`) 대체
- `farewell` → farewell regex 패턴 매칭 대체
- `action` → 모든 태그 파싱(`[동행]`, `[부탁:]`, `[안내:]`) 대체
- `suggestions` → `[선택지:]` 태그 대체
- `mention` → NPC/장소 하이라이트 가능

## 스트리밍 제거

큰 결정이었습니다. 스트리밍은 실시간 표시가 멋지지만:
- Structured output과 양립 불가 (JSON chunk가 그대로 보임)
- Gemma 폴백 시 JSON이 채팅에 노출되는 버그
- 태그 파싱, JSON 파싱, 키워드 폴백의 3중 복잡도

**해결**: 스트리밍을 제거하고 non-streaming structured output만 사용.
- 응답 대기 중: ". . ." 표시 (말풍선 + 채팅)
- 응답 도착: ". . ."을 실제 텍스트로 교체
- 결과: **-100줄**, 코드 단순화, JSON 노출 원천 차단

1~3문장 응답이라 지연은 1~2초. 체감상 문제 없습니다.

## Gemma 모델 대응

Gemma는 `responseMimeType`/`responseSchema`를 지원하지 않습니다. 대응:
- Gemma 감지 시 스키마 필드 제거
- 프롬프트 끝에 "반드시 JSON으로만 응답하세요" 텍스트 추가
- 응답 파싱 3단계: 전체 JSON → 코드블록 추출 → 중괄호 추출
- 실패 시 일반 텍스트로 폴백 → 클라이언트 키워드 감지

## 동행/안내 시스템 수정

**원인 분석**: 스트리밍 경로에서 structured data를 완전히 무시하고 있었고, 키워드 감지 함수(`detectActionFromReply`)가 정의만 되고 호출되지 않았습니다.

**수정**: 3단계 액션 감지 파이프라인:
1. Structured output (serverAction)
2. 태그 파싱 (폴백)
3. 키워드 감지 ("따라갈게", "카페로 가자", "데려다줄게" 등)

## NPC 9명 추가 (총 25명)

| NPC | 직업 | 위치 |
|---|---|---|
| 김하늘 | 바리스타 | 카페 |
| 박민지 | 꽃집 사장 | 꽃집 |
| 정태현 | 셰프 | 음식점 |
| 이준혁 | 경찰관 | 경찰서 |
| 윤동혁 | 운동선수 | 체육관 |
| 송지은 | 의사 | 병원 |
| 오준서 | 학생 | KSA |
| 한수빈 | 학생 | KSA |
| 김복동 | 할아버지 | 광장 |

## 공원 시각화

3D 렌더러에서 공원 영역(y=3~13, x=10~50) 시각 처리:
- 밝은 잔디색 (`#8ecc6a`, 일반 잔디보다 밝음)
- 십자형 산책로 (모래색 `#d4c4a0`)
- 어두운 녹색 경계선

## 건물별 특색

| 건물 | 특징 |
|---|---|
| 고려대 | 1.3배 높이 + 빨간 깃발 |
| 크래프톤 | 네온 시안 발광 라인 |
| 병원 | 지붕 위 빨간 십자가 |
| KSA 본관 | 흰색 입구 기둥 |
| KAIST | 1.15배 높이 |
| 꽃집 | 핑크 차양 |

## 건물 내부 확장 (20개)

평균 15+ 가구로 확장. 건물마다 고유 테마:
- 크래프톤: 스탠딩 데스크, 네온 사인, 빈백
- 고려대: 계단식 좌석, 대학 배너
- 집 3채: 전통 한옥 / 모던 테크 / 주방 중심

## 의자 앉기

벤치뿐 아니라 의자, 스툴, 안락의자, 빈백, 바닥 쿠션, 게이밍 의자에도 앉을 수 있습니다. 실내 가구 포함.

## i18n 완성

90키 → 185+ 키. 거의 모든 UI 문자열이 `t()` 함수를 통해 한/영 전환됩니다.

## 이번 세션 전체 숫자

- 커밋: 30+개
- 팀원 투입: 3개 팀, 총 10명
- 삭제: ~2,000줄
- 추가: ~3,000줄
- 새 파일: 2개 (i18n.js, structured-output-schema.md)

세상이 정체성을 찾고, 시스템이 그에 맞게 재설계된 세션이었습니다.
