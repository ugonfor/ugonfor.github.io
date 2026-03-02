---
layout: post
title: "Playground Devlog #37 - English Localization & NPC Movement Fix"
date: 2026-03-02 15:00:00 +0900
categories: [playground, devlog]
tags: [i18n, english, localization, multiplayer, bug-fix, npc]
---

Two important changes today: fixing a critical NPC movement bug and standardizing all game content to English.

## Bug Fix: NPCs Frozen in Multiplayer

NPCs stopped moving when Firebase multiplayer was enabled. Root cause was a **race condition** in the host election system:

1. After `initMultiplayer()`, `mp.enabled` is `true` immediately but `mp.isHost` stays `false` until the async Firebase host election callback fires
2. During this window, the condition `if (!mp || !mp.enabled || mp.isHost)` evaluates to `false` -- `updateNpcs()` is skipped
3. Additionally, **stale host entries** from crashed sessions could make the current player permanently "non-host" while no actual host is broadcasting NPC data

**Fix**: Added `shouldRunNpcSim` getter to the multiplayer module that tracks:
- `hostResolved`: whether host election has completed
- `lastNpcSyncAt`: timestamp of last NPC data received from host
- Falls back to local NPC simulation if no host sync received within 5 seconds

## English-Only Standardization

Since multiplayer brings together players from different regions, mixed Korean/English content created a confusing experience. All game content is now English-only.

### Changes Across 11 Files

| Area | What Changed |
|------|-------------|
| **Default language** | `'ko'` → `'en'` in main.js |
| **NPC names** | Korean → romanized English (Dokkaebi, Haru, Byeoli, etc.) |
| **25 regex patterns** | Korean topic/sentiment/action detection → English equivalents |
| **LLM prompts** | Removed Korean prompt variant; English-only prompts to Gemini |
| **Tag parsing** | `[부탁:]` → `[request:]`, `[동행]` → `[follow]`, `[안내:]` → `[guide:]` |
| **HTML template** | All Korean button/label defaults → English |
| **Language selector** | Removed from name modal (English-only) |
| **Place aliases** | Korean → English (공원→park, 광장→plaza, etc.) |
| **200+ code comments** | Korean → English across all source files |
| **Farewell detection** | Korean patterns → English patterns |
| **Personality matching** | Korean traits → English (밝→bright, 조용→quiet, etc.) |

### NPC Name Mapping

The village characters keep their Korean-origin names, romanized for readability:

| ID | Name | Role |
|----|------|------|
| guide | Yujin | Village guide (docent) |
| yoo | Hyogon | Village developer |
| heo | Dokkaebi | Ghost story lover |
| kim | Haru | Optimistic daydreamer |
| baker | Milsuni | Bakery owner |
| barista | Mocha | Cafe barista |
| grandpa | Neuti | Village elder |
| ... | 18 more | Various roles |

### Files Modified

- `src/playground/main.js` -- NPC names, default lang, regex patterns, all comments
- `server/llm-proxy.mjs` -- Removed Korean prompts, unified to English
- `src/playground/systems/conversation.js` -- Korean regex → English
- `src/playground/core/constants.js` -- Place aliases, all comments
- `playground/index.md` -- HTML template defaults to English
- `src/playground/systems/tag-game.js` -- Comments
- `src/playground/systems/weather.js` -- Comments
- `src/playground/systems/guide-greeting.js` -- Comments
- `src/playground/systems/npc-data.js` -- Comments
- `src/playground/renderer/renderer.js` -- Comments
- `src/playground/renderer/entities.js` -- Comments

### What's Preserved

- The i18n system infrastructure remains (for potential future localization)
- Korean translations kept in `i18n.js` as reference
- Village lore and cultural identity maintained through romanized names

Build passes all 7 verification checks. Net result: -227 lines (removed redundant Korean prompt variant).
