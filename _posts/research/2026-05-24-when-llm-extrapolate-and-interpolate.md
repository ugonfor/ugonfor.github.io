---
layout: post
title: "When LLM Extrapolate and Interpolate"
date: 2026-05-24 12:10:00 +0900
categories: [research]
author: hyogon
tags: [llm, reasoning, interpolation, extrapolation]
thumbnail: /assets/images/research/when-llm-extrapolate-and-interpolate.jpg
---

LLM이 언제 interpolation처럼 동작하고, 언제 extrapolation을 요구받는지에 대한 생각.

## 개요

- 많은 LLM 작업은 학습 분포 안에서 가장 그럴듯한 연속을 찾는 interpolation에 가깝다.
- 새로운 문제 설정, 낯선 조합, 숨은 invariant 발견은 extrapolation에 가깝다.
- 두 모드를 구분하지 않으면 fluency를 correctness로 착각하기 쉽다.

## 핵심 질문

- 어떤 작업은 왜 모델에게 쉬워 보이고, 어떤 작업은 갑자기 불안정해지는가?
- extrapolation이 필요한 순간에는 어떤 검증 장치가 필요한가?
- 도구 사용, 테스트, 브라우징, 시뮬레이션은 모델의 extrapolation 범위를 얼마나 넓히는가?

## 주장

모델의 성능을 볼 때 "지능이 있는가"보다 "이 작업이 모델에게 얼마나 먼 거리인가"를 묻는 편이 실용적이다. 가까운 작업은 빠르게 맡기고, 먼 작업은 실험과 검증을 붙여야 한다.

## 확장할 내용

- interpolation task와 extrapolation task의 예시 분류
- coding agent에서 두 모드를 감지하는 signal
- agent가 uncertainty를 표현하고 verification plan을 세우는 방식
