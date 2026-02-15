---
layout: post
title: "Playground Devlog #3 - Controls, Minimap, Chat, and Quest Expansion"
date: 2026-02-15 22:00:00 +0900
---

This update focuses on making the world more playable and trackable.

## What changed

- Updated controls:
  - `WASD / Arrow Keys` for movement
  - `Shift` for run
  - `Left Drag` for camera pan
  - `Mouse Wheel` for zoom
  - `Space` for view reset
  - `P` for pause
- Added minimap in the world state panel.
- Added Save/Load buttons using `localStorage`.
- Expanded quest flow into multi-step progression.
- Added world interactions via hotspots (cafe door, market board, park monument).
- Added nearby NPC chat panel with lightweight response logic and memory tags.

## NPC roster update

Current NPC names are:

- 허승준
- 김민수
- 최민영
- 정욱진
- 서창근
- 이진원
- 박지호
- 장동우

## Next

- Refine NPC dialogue diversity (more context-aware responses).
- Add branching quest outcomes based on relationship values.
- Add visual indicators for interactable hotspots.
