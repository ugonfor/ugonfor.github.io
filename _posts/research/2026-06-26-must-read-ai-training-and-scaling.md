---
layout: post
title: "Must Read Articles: AI Training, Scaling, and Reasoning"
date: 2026-06-26 16:02:16 +0900
categories: [research, reading-list]
author: hyogon
tags: [must-read, llm, training, scaling, moe, reasoning, agents]
---

앞으로 전달받는 must-read article을 한 페이지에 계속 모아두기 위한 목록이다. 단순 북마크가 아니라, 나중에 글을 쓸 때 바로 꺼내 쓸 수 있도록 **주제별로 분류**하고, 각 글이 어떤 질문에 닿아 있는지 짧게 남긴다.

## 1. 대규모 학습 시스템과 병렬화

LLM을 실제로 크게 학습시키려면 모델 구조보다 먼저 병렬화, 통신, 메모리, 클러스터 토폴로지의 제약을 이해해야 한다. 이 묶음은 “모델을 어떻게 쪼개고, GPU 위에서 어떻게 흘려보낼 것인가”에 대한 레퍼런스다.

- [The Ultra-Scale Playbook — Expert Parallelism](https://huggingface.co/spaces/nanotron/ultrascale-playbook?section=expert_parallelism)
  - 키워드: expert parallelism, data/tensor/pipeline/context parallelism, communication cost, GPU cluster training.
  - 읽을 이유: MoE와 expert parallelism을 시스템 관점에서 이해하기 좋은 실전형 playbook.

- [The Smol Training Playbook — Finding the Optimal Parallelism Configuration](https://huggingface.co/spaces/HuggingFaceTB/smol-training-playbook#finding-the-optimal-parallelism-configuration)
  - 키워드: small but strong models, optimal parallelism, training recipe, compute efficiency.
  - 읽을 이유: “큰 모델을 무조건 크게”가 아니라, 주어진 자원에서 어떤 병렬화 구성이 효율적인지 찾는 감각을 준다.

- [Scalable Training of Mixture-of-Experts Models with Megatron Core](https://arxiv.org/html/2603.07685v2)
  - 키워드: MoE training, Megatron Core, memory/communication/computation co-design, FP8/NVFP4, long-context training.
  - 읽을 이유: MoE를 수천 GPU 규모로 학습할 때 생기는 병목과 최적화를 NVIDIA/Megatron Core 관점에서 정리한 기술 보고서.

## 2. MoE 모델 아키텍처와 비용 효율적 스케일링

MoE는 총 파라미터 수를 키우면서도 토큰당 활성 연산량을 제한하는 방식이다. 이 묶음은 “성능을 키우되 학습·추론 비용을 어떻게 억제할 것인가”에 대한 레퍼런스다.

- [DeepSeek-V3 Technical Report](https://arxiv.org/abs/2412.19437)
  - 키워드: DeepSeekMoE, MLA, auxiliary-loss-free load balancing, multi-token prediction, 671B total / 37B activated parameters.
  - 읽을 이유: 최근 오픈 모델 계열에서 비용 효율적 MoE 스케일링을 대표하는 사례. 학습 안정성, 토큰 수, GPU hour, 활성 파라미터 수를 함께 봐야 한다.

- [Scalable Training of Mixture-of-Experts Models with Megatron Core](https://arxiv.org/html/2603.07685v2)
  - 키워드: production MoE training, dispatcher, grouped GEMM, recomputation, offloading.
  - 읽을 이유: DeepSeek-V3 같은 MoE 모델을 “논문 구조”가 아니라 “돌아가는 학습 시스템”으로 볼 때 함께 읽어야 한다.

## 3. 추론 모델, test-time compute, reasoning frontier

학습 시점의 스케일링만큼이나, 추론 시점에 더 오래 생각하게 만드는 방식이 중요해지고 있다. 이 묶음은 “모델이 어떻게 생각하게 만들고, 그 생각을 어떻게 평가할 것인가”에 대한 레퍼런스다.

- [MAI Thinking 1 PDF](https://microsoft.ai/pdf/mai-thinking-1.pdf?utm_source=pytorchkr&ref=pytorchkr#page=7.37)
  - 키워드: reasoning model, thinking, evaluation, Microsoft AI.
  - 읽을 이유: reasoning 모델의 방향성과 평가 프레이밍을 보기 위한 자료. 특히 링크가 가리키는 page 7 근처의 논점을 따로 확인할 것.

## 4. AI 연구 방향과 “후반전”의 문제

스케일링, 병렬화, reasoning은 기술 세부이지만, 결국 더 큰 질문은 “AI 연구와 제품의 다음 국면이 무엇인가”다. 이 묶음은 기술의 방향성을 해석하는 글이다.

- [The Second Half — Shunyu Yao](https://ysymyth.github.io/The-Second-Half/)
  - 키워드: AI halftime, agents, scaling, interaction, post-pretraining frontier.
  - 읽을 이유: 지금까지의 AI 발전을 전반전으로 보고, 후반전에 무엇이 중요해질지 정리하는 관점 글. 개별 기술 논문을 큰 서사 안에 배치하는 데 좋다.

## 현재 읽기 지도

- **시스템 관점**: Ultra-Scale Playbook → Smol Training Playbook → Megatron Core MoE
- **모델 사례 관점**: DeepSeek-V3 → Megatron Core MoE
- **reasoning 관점**: MAI Thinking 1 → The Second Half
- **글감 관점**: “MoE는 모델 아키텍처가 아니라 클러스터 운영 철학에 가깝다”, “후반전의 병목은 pretraining보다 inference-time search와 interaction일 수 있다”

## 업데이트 규칙

새 must-read article을 받으면 다음 기준으로 추가한다.

1. 먼저 기존 주제에 들어가는지 본다.
2. 기존 주제에 안 들어가면 새 `##` 섹션을 만든다.
3. 각 링크에는 `키워드`와 `읽을 이유`를 한 줄씩 붙인다.
4. 같은 글이 여러 주제에 걸치면 중복을 허용하되, 각 섹션에서 읽는 관점을 다르게 적는다.
