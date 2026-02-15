---
layout: post
title: "Playground Devlog #6 - Cloud Run 연동, 보안 전략 정리"
date: 2026-02-15 23:59:00 +0900
categories: [playground, devlog]
tags: [cloud-run, deployment, security, rate-limit, turnstile]
---

이번 정리는 "프론트는 GitHub Pages, 백엔드는 Cloud Run" 구조를 확정하고, 실제 배포/보안 적용 순서를 정리한 기록입니다.

## 오늘 확정한 구조

- GitHub Pages는 계속 사용한다.
- Cloud Run은 LLM 프록시 서버(`server/llm-proxy.mjs`)만 담당한다.
- 둘은 대체 관계가 아니라 역할 분리 관계다.
  - Pages: 정적 사이트 호스팅
  - Cloud Run: API 실행

## 구현한 내용

### 1) 서버 보안 훅 추가 (옵션형)

- `X-Turnstile-Token` 헤더를 서버가 검증할 수 있도록 추가.
- `TURNSTILE_SECRET_KEY`가 설정된 경우에만 POST API에서 사람 검증을 강제.
- hostname 제한 옵션(`TURNSTILE_EXPECTED_HOSTNAMES`) 추가.
- CORS 허용 헤더에 `X-Turnstile-Token` 반영.

즉, 지금은 키를 넣지 않으면 기존처럼 동작하고, 나중에 키만 넣어 켤 수 있는 상태로 만들었다.

### 2) 프론트 연동 코드 추가 (옵션형)

- `playground_turnstile_site_key` 설정값을 읽어 브라우저에 주입.
- 사이트키가 있을 때만 Turnstile 스크립트를 로드.
- API 호출 시 토큰을 받아 `X-Turnstile-Token` 헤더로 자동 첨부.

### 3) 문서/설정 업데이트

- `_config.yml`에 `playground_turnstile_site_key` 항목 추가.
- `server/.env.example`에 Turnstile 관련 env 예시 추가.
- `server/README.md`에 보안 env 및 Turnstile 적용 절차 반영.

## 지금 당장 쓰는 운영 전략

Turnstile은 TODO로 남기고, 우선은 rate limit 중심으로 운영:

- `RATE_LIMIT_WINDOW_MS=60000`
- `RATE_LIMIT_MAX=30`
- `MAX_BODY_BYTES=300000`

Cloud Run env 업데이트 예시:

```bash
gcloud run services update playground-llm-proxy \
  --region asia-northeast3 \
  --update-env-vars RATE_LIMIT_WINDOW_MS=60000,RATE_LIMIT_MAX=30,MAX_BODY_BYTES=300000
```

## 배포하면서 확인한 포인트

### 1) `services update` 전에 `deploy`가 먼저다

- `Service could not be found`는 아직 서비스가 없는 상태.
- `gcloud run deploy ...`로 최초 생성 후 `update`를 사용해야 한다.

### 2) `--set-env-vars` 쉼표 파싱 이슈

`ALLOWED_ORIGINS` 값에 쉼표가 들어가면 일반 문법이 깨질 수 있어 커스텀 구분자를 써야 한다.

```bash
gcloud run deploy playground-llm-proxy \
  --source . \
  --platform managed \
  --region asia-northeast3 \
  --allow-unauthenticated \
  --set-env-vars "^##^GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY##ALLOWED_ORIGINS=https://ugonfor.kr,https://www.ugonfor.kr##RATE_LIMIT_WINDOW_MS=60000##RATE_LIMIT_MAX=30##MAX_BODY_BYTES=300000"
```

### 3) 리전 선택

- 한국 사용자 기준 `asia-northeast3`(서울) 권장.
- 이미 다른 리전에 배포했으면 새 리전에 다시 배포하고, 프론트 API URL을 새 주소로 교체하면 된다.

## 남은 TODO

- Turnstile 실제 발급/연결:
  - `_config.yml`에 `playground_turnstile_site_key`
  - Cloud Run에 `TURNSTILE_SECRET_KEY`
- Cloud Armor rate limiting 추가
- Secret Manager로 API 키/시크릿 관리
- Cloud Run URL을 `_config.yml`의 `playground_llm_api`에 반영 후 Pages 재배포

## 메모

Cloud Run 배포가 끝난 뒤에는 로컬 컴퓨터를 꺼도 서비스는 계속 동작한다.
로컬은 배포/설정 변경 시에만 필요하다.
