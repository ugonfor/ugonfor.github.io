---
layout: post
title: "Playground Devlog #1 - Local World Prototype"
date: 2026-02-15 20:00:00 +0900
---

This is the first development log for my Playground world simulation.

## What I implemented

- Added a playable local world directly in the Playground page.
- Implemented player movement with `WASD` / arrow keys.
- Added in-world time progression and a simple day-night visual shift.
- Added lightweight NPC simulation with schedule-based movement.
- Added interaction (`E`) and an event log panel.
- Added pause/resume (`Space`) for quick debugging.

## Why this version

The goal is to keep everything local and lightweight while still feeling game-like.
I am prioritizing simple, robust simulation loops over heavy model-based systems.

## Next

- Add obstacle/collision logic for better movement constraints.
- Add a tiny quest/event chain tied to NPC relationships.
- Add save/load snapshot for simulation state.
