---
layout: post
title: "Must Read Articles: AI Training, Scaling, and Reasoning"
date: 2026-06-26 16:02:16 +0900
categories: [research, reading-list]
author: hyogon
tags: [must-read, llm, training, scaling, moe, reasoning, agents, open-science, synthetic-data, small-models, hardware, roofline]
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

- [All About Rooflines — How To Scale Your Model](https://jax-ml.github.io/scaling-book/roofline/)
  - 키워드: roofline model, OPs/sec, memory bandwidth, network bandwidth, arithmetic intensity, TPU/GPU performance bounds.
  - 읽을 이유: 대규모 학습 병렬화를 이해하기 전에 “연산이 느린가, 메모리 이동이 느린가, 네트워크가 느린가”를 구분하는 기본 좌표계다. matmul과 network communication roofline을 함께 다뤄서, 이후 TPUs·sharded matmul·transformer training을 읽기 위한 입구로 좋다.

- [Scalable Training of Mixture-of-Experts Models with Megatron Core](https://arxiv.org/html/2603.07685v2)
  - 키워드: MoE training, Megatron Core, memory/communication/computation co-design, Parallel Folding, FP8/NVFP4, long-context training.
  - 읽을 이유: MoE를 수천 GPU 규모로 학습할 때 생기는 병목과 최적화를 NVIDIA/Megatron Core 관점에서 정리한 기술 보고서. memory·communication·computation을 따로 최적화하는 문제가 아니라, 한쪽을 줄이면 다른 쪽에 압력이 생기는 coupled system으로 봐야 한다.

- [Open Athena Blog — Cluster Scheduling with Iris](https://openathena.ai/blog/cluster-scheduling-with-iris/)
  - 키워드: global scheduler, heterogeneous accelerators, TPU utilization, frontier-scale training operations.
  - 읽을 이유: frontier급 학습은 모델 코드만이 아니라 자원 스케줄링 문제라는 점을 보여준다. “클러스터 운영이 곧 모델 성능의 전제”라는 관점에서 1번 묶음과 함께 읽기 좋다.

## 2. MoE 모델 아키텍처와 비용 효율적 스케일링

MoE는 총 파라미터 수를 키우면서도 토큰당 활성 연산량을 제한하는 방식이다. 이 묶음은 “성능을 키우되 학습·추론 비용을 어떻게 억제할 것인가”에 대한 레퍼런스다.

- [DeepSeek-V3 Technical Report](https://arxiv.org/abs/2412.19437)
  - 키워드: DeepSeekMoE, MLA, auxiliary-loss-free load balancing, multi-token prediction, 671B total / 37B activated parameters.
  - 읽을 이유: 최근 오픈 모델 계열에서 비용 효율적 MoE 스케일링을 대표하는 사례. 학습 안정성, 토큰 수, GPU hour, 활성 파라미터 수를 함께 봐야 한다.

- [Scalable Training of Mixture-of-Experts Models with Megatron Core](https://arxiv.org/html/2603.07685v2)
  - 키워드: production MoE training, optimized dispatcher, Grouped GEMM, recomputation, offloading, CUDA Graphs, DeepSeek-V3/Qwen3 throughput.
  - 읽을 이유: DeepSeek-V3 같은 MoE 모델을 “논문 구조”가 아니라 “돌아가는 학습 시스템”으로 볼 때 함께 읽어야 한다. GB300/GB200에서 DeepSeek-V3-685B와 Qwen3-235B throughput을 제시하기 때문에, MoE architecture가 실제 hardware efficiency로 번역되는 지점을 확인할 수 있다.

- [Open Athena Blog — Improving our LLM Pretraining Efficiency](https://openathena.ai/blog/pretraining-speedup/)
  - 키워드: Marin, MoE, expert sparsity, MuonH, PKO, routed expert normalization, pretraining efficiency.
  - 읽을 이유: MoE와 optimizer/normalization/packing 같은 학습 recipe가 실제 pretraining 효율을 어떻게 밀어 올리는지 보는 운영형 사례다.

- [Open Athena Blog — Mixture of Experts Quantile Balancing](https://openathena.ai/blog/quantile-balancing/)
  - 키워드: quantile balancing, load balancing, hyperparameter-free MoE, 32B-A5B, 1e22 FLOPs.
  - 읽을 이유: MoE의 load balancing을 auxiliary loss나 capacity factor 없이 안정화하려는 접근. “MoE의 병목은 routing 품질과 안정성”이라는 글감에 바로 연결된다.

## 3. 스케일링 법칙과 compute-optimal frontier

스케일링 법칙은 “더 크게 만들면 좋아진다”가 아니라, 제한된 compute를 모델 크기와 데이터 크기 사이에 어떻게 배분할지에 대한 경험 법칙이다. 이 묶음은 Kaplan → Chinchilla → 현실 fit의 함정을 연결해서 읽기 위한 레퍼런스다.

- [Scaling Laws, Carefully — Lilian Weng](https://lilianweng.github.io/posts/2026-06-24-scaling-laws/)
  - 키워드: scaling laws, Kaplan, Chinchilla, compute-optimal allocation, data-limited region, power law fitting.
  - 읽을 이유: 스케일링 법칙을 단순 공식이 아니라 “어떤 영역에서 어떤 가정으로 맞춘 경험식인가”로 읽게 해준다. 특히 data-infinite/data-limited 구분과 현실 fit의 tricky함이 중요하다.

- [Open Athena Blog — Scaling Laws That Extrapolate 300× Past the Fit](https://openathena.ai/blog/delphi/)
  - 키워드: Delphi, open scaling suite, pre-registered forecast, 3e18–1e23 FLOPs, 300× extrapolation.
  - 읽을 이유: 실제 공개 스케일링 suite에서 큰 run의 loss를 사전 예측했다는 점이 핵심. Lilian Weng 글의 개념적 정리와 함께 읽으면 “스케일링 법칙이 어디까지 실전 예측 도구가 되는가”를 볼 수 있다.

- [Open Athena Blog — Problems with Chinchilla Approach 2](https://openathena.ai/blog/problems-with-chinchilla-approach-2/)
  - 키워드: Chinchilla Approach 2, IsoFLOP curves, compute-optimal allocation bias, parametric fitting.
  - 읽을 이유: Chinchilla류 compute-optimal 분석도 fit 방법에 따라 편향이 생긴다는 경고. scaling law를 인용할 때 “공식”보다 “fit 설계”를 봐야 한다는 근거가 된다.

## 4. 추론 모델, test-time compute, reasoning frontier

학습 시점의 스케일링만큼이나, 추론 시점에 더 오래 생각하게 만드는 방식이 중요해지고 있다. 이 묶음은 “모델이 어떻게 생각하게 만들고, 그 생각을 어떻게 평가할 것인가”에 대한 레퍼런스다.

- [MAI Thinking 1 PDF](https://microsoft.ai/pdf/mai-thinking-1.pdf?utm_source=pytorchkr&ref=pytorchkr#page=7.37)
  - 키워드: reasoning model, thinking, evaluation, Microsoft AI.
  - 읽을 이유: reasoning 모델의 방향성과 평가 프레이밍을 보기 위한 자료. 특히 링크가 가리키는 page 7 근처의 논점을 따로 확인할 것.

- [Synthetic pretraining for very small reasoning models — Tufa Labs](https://tufalabs.ai/research/enhancing-reasoning-small-language-models/)
  - 키워드: synthetic pretraining, small language models, sub-1B reasoning, GSM8K, MATH500, few-shot gains, token efficiency.
  - 읽을 이유: reasoning 성능을 키우는 방법을 frontier-scale 모델이 아니라 very small model 관점에서 묻는 글이다. 같은 크기의 generator가 만든 synthetic data로도 few-shot 성능과 token efficiency를 올릴 수 있다는 결과라, “reasoning은 모델 크기만의 함수인가, 데이터 생성 절차의 함수인가”라는 질문에 연결된다.

## 5. AI 연구 방향, 공개 개발, “후반전”의 문제

스케일링, 병렬화, reasoning은 기술 세부이지만, 결국 더 큰 질문은 “AI 연구와 제품의 다음 국면이 무엇인가”다. 이 묶음은 기술의 방향성을 해석하고, frontier AI를 더 공개적이고 재현 가능한 방식으로 개발하려는 흐름을 함께 본다.

- [The Second Half — Shunyu Yao](https://ysymyth.github.io/The-Second-Half/)
  - 키워드: AI halftime, agents, scaling, interaction, post-pretraining frontier.
  - 읽을 이유: 지금까지의 AI 발전을 전반전으로 보고, 후반전에 무엇이 중요해질지 정리하는 관점 글. 개별 기술 논문을 큰 서사 안에 배치하는 데 좋다.

- [Open Athena Blog](https://openathena.ai/blog/)
  - 키워드: Open Athena, Marin, open frontier AI, open development, pretraining, scaling laws, MoE, ethics.
  - 읽을 이유: 단일 글보다 “공개 frontier AI 연구소가 어떤 문제를 글로 남기는가”를 보는 인덱스다. scaling law, MoE, scheduler, ethics가 한 흐름으로 묶여 있어 연구 주제 지도를 만들기 좋다.

- [Open Athena Blog — Open Development of Frontier AI](https://openathena.ai/blog/open-development-of-frontier-ai/)
  - 키워드: open development, frontier AI, reproducibility, public research artifacts, Marin.
  - 읽을 이유: frontier AI를 폐쇄적 product race가 아니라 공개 지식 축적으로 만들려는 선언에 가깝다. “AI 후반전의 경쟁력은 공개성과 재현성에서 올 수 있는가”라는 글감으로 연결된다.

## 현재 읽기 지도

- **시스템 관점**: JAX Scaling Book Rooflines → Ultra-Scale Playbook → Smol Training Playbook → Megatron Core MoE → Open Athena Iris
- **모델 사례 관점**: DeepSeek-V3 → Megatron Core MoE → Open Athena Pretraining Efficiency → Quantile Balancing
- **scaling law 관점**: Lilian Weng Scaling Laws → Open Athena Delphi → Problems with Chinchilla Approach 2
- **reasoning 관점**: Tufa Labs synthetic pretraining → MAI Thinking 1 → The Second Half
- **공개 연구 관점**: The Second Half → Open Athena Blog → Open Development of Frontier AI
- **글감 관점**: “MoE는 모델 아키텍처가 아니라 클러스터 운영 철학에 가깝다”, “성능 병목은 FLOPs가 아니라 memory/network roofline에서 먼저 드러날 수 있다”, “스케일링 법칙은 숫자 공식보다 fit 설계와 compute allocation 철학이다”, “reasoning 향상은 모델 크기뿐 아니라 synthetic data curriculum의 문제일 수 있다”, “후반전의 병목은 pretraining보다 inference-time search와 interaction일 수 있다”

## 업데이트 규칙

새 must-read article을 받으면 다음 기준으로 추가한다.

1. 먼저 기존 주제에 들어가는지 본다.
2. 기존 주제에 안 들어가면 새 `##` 섹션을 만든다.
3. 각 링크에는 `키워드`와 `읽을 이유`를 한 줄씩 붙인다.
4. 같은 글이 여러 주제에 걸치면 중복을 허용하되, 각 섹션에서 읽는 관점을 다르게 적는다.
