---
layout: post
title: "LLM은 인간의 지식 구조를 Interpolate한다"
date: 2026-05-24 12:10:00 +0900
categories: [research]
author: hyogon
tags: [llm, reasoning, interpolation, extrapolation, creativity]
thumbnail: /assets/images/research/llm-interpolates-human-knowledge.jpg
---

LLM 자체는 본질적으로 **interpolation machine**에 가깝다. 거대한 텍스트 공간에서 이미 존재하는 패턴들 사이를 매우 부드럽고 정교하게 연결하는 시스템이라는 뜻이다.

하지만 사용자는 다르다. 인간은 불완전한 경험을 갖고 있고, 특정 분야만 깊게 알고 있고, 기억이 단절되어 있으며, 서로 연결되지 않은 직관들을 들고 있다.

그래서 LLM은 스스로 extrapolate한다기보다, 오히려 **사용자의 지식 구조를 interpolation해서 사용자가 extrapolation하도록 만든다**에 가깝다.

## 핵심 주장

LLM의 “창의성”은 모델 내부에서 독립적으로 발생한다기보다, **human + LLM interaction loop**에서 발생한다.

역할을 나누면 이렇게 볼 수 있다.

- **LLM**: dense interpolation
- **Human**: semantic extrapolation

LLM은 이미 존재하는 개념들을 압축하고, 재배열하고, 가까운 개념들 사이의 경로를 매끄럽게 만든다. 인간은 그 경로를 따라가다가 아직 명명되지 않은 가설이나 프레이밍을 만든다.

즉 LLM이 새로운 세계 바깥으로 혼자 점프한다기보다, 사용자의 끊어진 지식 조각들 사이에 임시 다리를 놓고, 그 다리를 건너는 과정에서 인간이 바깥으로 점프한다.

## 예시: attention, retrieval, reasoning

예를 들어 내가 vaguely “attention이 retrieval 같다” 정도만 알고 있었다고 하자.

LLM은 여기에 induction head, in-context learning, memory retrieval, transformer circuit 같은 근처 개념들을 가져와 연결해준다. 그 연결 자체는 대체로 기존 연구와 설명 가능한 패턴의 재배열이다.

그런데 그 경로를 따라가다 보면 내 머릿속에서 이런 식의 새로운 가설이 튀어나올 수 있다.

> “그러면 reasoning은 symbolic planning이라기보다 retrieval composition일 수도 있겠네?”

여기서 extrapolation은 사실 내가 한 것이다.

LLM은 기존 개념들을 압축해서 재배열했고, 나는 그 재배열을 기반으로 새로운 hypothesis를 만들었다.

## LLM이 잘하는 것

LLM은 아주 넓은 범위의 “근처 개념”을 잘 가져온다.

- 설명되지 않은 연결 가능성을 제시한다.
- latent space 상 가까운 것들을 이어붙인다.
- 내가 잊고 있던 관련 개념을 다시 표면으로 올린다.
- 모호한 직관을 더 선명한 언어로 바꿔준다.

이건 단순 요약보다 훨씬 강력하다. 사용자의 지식 manifold를 locally smooth하게 만들어주기 때문이다.

## LLM이 아직 어려워하는 것

반대로 진짜 어려운 것은 high-level extrapolation이다.

- framing 자체를 바꾸는 것
- objective를 재정의하는 것
- “질문 자체가 틀렸다”는 걸 발견하는 것
- 연구 방향을 뒤집는 것
- 어떤 연결이 중요한 연결인지 선택하는 것

이런 일은 단순히 근처 개념을 더 많이 가져온다고 해결되지 않는다. 무엇을 중요하게 볼지, 어떤 목적을 버릴지, 어떤 질문이 더 좋은 질문인지 판단해야 하기 때문이다.

## 그래서 중요한 것은 coupling이다

이 관점의 장점은 “LLM이 진짜 사고하는가?” 같은 소모적인 논쟁을 피하게 해준다는 점이다.

핵심은 intelligence가 모델 안에만 들어 있는지 묻는 것이 아니라, **인간의 불확실성과 모델의 interpolation이 어떻게 coupling되는지**를 보는 것이다.

LLM은 extrapolate하지 않는다.

대신 인간의 knowledge manifold를 locally smooth하게 interpolation한다.

그리고 인간은 그 interpolation path를 따라가며 extrapolation을 수행한다.

그래서 실제 창의성은 모델 단독의 능력이라기보다, 인간의 단절된 직관과 모델의 조밀한 연결 능력이 맞물릴 때 생기는 현상에 가깝다.

> Intelligence is not inside the model alone. It emerges from the coupling between human uncertainty and model interpolation.
