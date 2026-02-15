---
layout: post
title: "Playground Devlog #2 - Isometric View, Mouse Move, Quest & Relations"
date: 2026-02-15 21:00:00 +0900
---

Second update for the local world simulation.

## Added in this update

- Switched from pure top-down to a slanted isometric-style rendering.
- Added left-click movement (`Mouse`) in addition to keyboard control.
- Added basic collision constraints for blocked building areas.
- Added a simple quest flow:
  - Talk to Mina to start
  - Deliver message to Joon to complete
- Added lightweight relationship values shown in UI:
  - Player-Mina
  - Player-Joon
  - Mina-Joon

## Notes

The goal is still local-first and lightweight.  
No heavy assets or infrastructure are required.
