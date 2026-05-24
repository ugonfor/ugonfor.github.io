---
layout: post
title: "Use Claude Remote-Control with Codex"
date: 2026-05-24 12:00:00 +0900
categories: [research]
author: hyogon
tags: [coding-agents, remote-control, codex, claude]
thumbnail: /assets/images/research/use-claude-remote-control-with-codex.jpg
---

Claude를 대화와 조율의 인터페이스로 두고, Codex를 실제 저장소 조작과 검증의 실행기로 두는 방식에 대한 메모.

## 개요

- Claude는 긴 맥락, 의도 정리, 방향성 유지에 강하다.
- Codex는 파일 읽기, 코드 수정, 테스트 실행, 커밋/푸시 같은 구체적 작업에 강하다.
- 둘을 함께 쓰면 사용자는 "대화하는 모델"이 아니라 "조종 가능한 작업 공간"을 다루게 된다.

## 핵심 질문

- Claude는 무엇을 기억하고, Codex는 무엇을 실행해야 하는가?
- remote-control 방식은 언제 생산성을 높이고, 언제 오히려 과한 orchestration이 되는가?
- 사용자가 개입할 수 있는 지점은 어떻게 시각화되어야 하는가?

## 주장

좋은 구조는 Claude가 의도를 보존하고, Codex가 현실을 만지게 하는 것이다. Claude는 "왜"와 "무엇을"을 붙잡고, Codex는 "어디를"과 "어떻게"를 처리한다.

## 확장할 내용

- 실제 워크플로 예시: 요구사항 정리, repo 탐색, patch, build/test, commit
- 실패 사례: 과한 delegation, 느린 multi-agent loop, 책임 소재가 흐려지는 상황
- agent UI에서 remote-control이 가져야 하는 최소 상태 표시
