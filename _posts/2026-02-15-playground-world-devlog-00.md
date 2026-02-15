---
layout: post
title: "Playground Devlog #0 - Requirements"
date: 2026-02-15 19:30:00 +0900
---

This is the baseline requirements document for the Playground world simulation.

## Product Direction

- The Playground should be a personal, local-first open-world simulation.
- The page should prioritize the world itself, not long document-style text.
- The view should be slanted (near-isometric), not pure top-down.
- It must run smoothly in a local browser environment without heavy infrastructure.

## Core Controls

- Move: `WASD` / Arrow Keys
- Run: `Shift` (hold)
- Interact: `E`
- Pause: `P`
- Reset View: `Space`
- Mouse Drag: camera pan
- Mouse Wheel: zoom in/out

## Core Systems

- NPC schedule-based movement and behavior updates
- Relationship system with value changes from interaction
- Multi-step quest flow with completion state
- Time/place-based hotspot events
- Minimap (world, buildings, NPCs, player, camera frame)
- Save/Load world state using `localStorage`

## NPC Chat Requirement

- Provide nearby-NPC chat UI:
  - target indicator
  - chat log
  - input + send button
- If no nearby NPC exists, show system message.
- Use lightweight local response logic with simple memory tags.

## NPC Roster (Fixed)

- 허승준
- 김민수
- 최민영
- 정욱진
- 서창근
- 이진원
- 박지호
- 장동우

## Development Policy

- Track all Playground progress continuously through Posts as devlogs.
