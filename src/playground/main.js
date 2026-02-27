import { clamp, dist, shade, randomPastelColor, normalizePlayerName, bubbleText, inferPersonalityFromName, nowMs, socialKey, npcRelationLabel } from './utils/helpers.js';
import { SAVE_KEY, UI_PREF_KEY, MOBILE_SHEET_KEY, PLAYER_NAME_KEY, PLAYER_FLAG_KEY, PLAYER_ID_KEY, AUTO_WALK_KEY, COUNTRY_LIST, CHAT_NEARBY_DISTANCE, ZOOM_MIN, ZOOM_MAX, DEFAULT_ZOOM, CONVERSATION_MIN_ZOOM, npcPersonas, palette, places, buildings, hotspots, props, speciesPool, WEATHER_TYPES, discoveries, favorLevelNames, itemTypes, groundItems, ITEM_RESPAWN_MS, seasons, interiorDefs, PLACE_ALIASES, GAME } from './core/constants.js';
import { translations } from './core/i18n.js';
import { GameRenderer } from './renderer/renderer.js';
import { createWeatherState, createWeatherParticles, updateWeather as _updateWeather, updateWeatherParticles as _updateWeatherParticles } from './systems/weather.js';
import { createMultiplayer } from './systems/multiplayer.js';
import { makeNpc, randomSpecies, ensureMemoryFormat, addNpcMemory as _addNpcMemory, getNpcMemorySummary as _getNpcMemorySummary, getNpcSocialContext as _getNpcSocialContext, getMemoryBasedTone } from './systems/npc-data.js';
import { generateDynamicQuest as _generateDynamicQuest, handleQuestNpcTalk as _handleQuestNpcTalk, handleDynamicQuestProgress as _handleDynamicQuestProgress, advanceDynamicQuest as _advanceDynamicQuest, completeDynamicQuest as _completeDynamicQuest, showQuestBoardMenu as _showQuestBoardMenu, handleQuestBoardChoice as _handleQuestBoardChoice } from './systems/quest.js';
import { createMemorySync, applyServerMemory } from './systems/memory-sync.js';
import { createTagGame } from './systems/tag-game.js';
import { inferSentimentFromReply, applyConversationEffect as _applyConversationEffect, requestLlmNpcReply as _requestLlmNpcReply, requestLlmNpcReplyStream as _requestLlmNpcReplyStream, detectActionFromReply as _detectActionFromReply } from './systems/conversation.js';
import { createAudioManager } from './systems/audio.js';
import { createConversationManager } from './systems/conversation-manager.js';
import { createChatManager } from './systems/chat-manager.js';
import { createGameState } from './core/game-state.js';
import { createAmbientSpeechSystem } from './systems/ambient-speech.js';
import { createNpcSocialSystem } from './systems/npc-social-events.js';
import { createGuideGreetingSystem } from './systems/guide-greeting.js';
import { createIntroSequence } from './systems/intro-sequence.js';
import { createSceneManager } from './systems/scene-manager.js';
import { createSaveLoadSystem } from './systems/save-load.js';
import { createCameraSystem } from './systems/camera.js';
import { createPlayerController } from './systems/player-controller.js';
import { createAsyncGuard } from './systems/async-guard.js';

(function () {
  const USE_3D = true;
  const canvas = document.getElementById("pg-world-canvas");
  if (!canvas) return;

  // ─── i18n ───
  let currentLang = localStorage.getItem('playground_lang') || 'ko';
  function t(key, params = {}) {
    let text = (translations[currentLang] && translations[currentLang][key]) || (translations.ko && translations.ko[key]) || key;
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, v);
    }
    return text;
  }

  function translateStaticDOM() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (key) el.textContent = t(key);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (key) el.placeholder = t(key);
    });
  }

  // When 3D mode, create a WebGL canvas behind the 2D HUD canvas
  let canvas3D = null;
  if (USE_3D) {
    canvas3D = document.createElement("canvas");
    canvas3D.id = "pg-3d-canvas";
    canvas3D.width = canvas.width || 960;
    canvas3D.height = canvas.height || 540;
    // Both canvases stack inside the stage (position: relative)
    canvas3D.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;min-height:100dvh;z-index:0;display:block;";
    canvas.parentElement.insertBefore(canvas3D, canvas);
    // Make 2D canvas overlay on top (transparent bg for HUD only)
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.zIndex = "1";
    canvas.style.backgroundColor = "transparent";
    canvas.style.pointerEvents = "none";  // 3D 캔버스와 UI 요소가 클릭 받도록
    // Mouse/touch events still use game coord system, not Three.js raycasting yet
  }

  let gameRenderer3D = null;
  let elapsedTime = 0;

  const ctx = canvas.getContext("2d");
  const uiTime = document.getElementById("pg-time");
  const uiPlayer = document.getElementById("pg-player");
  const uiNearby = document.getElementById("pg-nearby");
  const uiQuest = document.getElementById("pg-quest");
  const uiRel = document.getElementById("pg-rel");
  const uiLog = document.getElementById("pg-log");

  const minimap = document.getElementById("pg-minimap");
  const mctx = minimap ? minimap.getContext("2d") : null;

  const chatTargetEl = document.getElementById("pg-chat-target");
  const chatLogEl = document.getElementById("pg-chat-log");
  const chatInputEl = document.getElementById("pg-chat-input");
  const chatSendEl = document.getElementById("pg-chat-send");
  const chatSuggestionsEl = document.getElementById("pg-chat-suggestions");
  const chatCloseBtn = document.getElementById("pg-chat-close");
  const statusToggleBtn = document.getElementById("pg-status-toggle");
  const logToggleBtn = document.getElementById("pg-log-toggle");
  const chatActiveTargetEl = document.getElementById("pg-chat-active-target");
  const chatActiveStateEl = document.getElementById("pg-chat-active-state");
  const chatModelEl = document.getElementById("pg-chat-model");
  const createNameEl = document.getElementById("pg-create-name");
  const createPersonalityEl = document.getElementById("pg-create-personality");
  const createBtnEl = document.getElementById("pg-create-btn");
  const createStatusEl = document.getElementById("pg-create-status");

  const removeSelectEl = document.getElementById("pg-remove-select");
  const removeBtnEl = document.getElementById("pg-remove-btn");
  const uiOnlineEl = document.getElementById("pg-online");

  const questBannerEl = document.getElementById("pg-quest-banner");
  const questBannerTitleEl = document.getElementById("pg-quest-banner-title");
  const questBannerObjectiveEl = document.getElementById("pg-quest-banner-objective");

  const saveBtn = document.getElementById("pg-save");
  const loadBtn = document.getElementById("pg-load");
  const renameBtn = document.getElementById("pg-rename");
  const controlActionsEl = document.querySelector("#pg-card-controls .pg-actions");
  const uiToggleBtn = document.getElementById("pg-ui-toggle");
  const leftToggleBtn = document.getElementById("pg-toggle-left");
  const rightToggleBtn = document.getElementById("pg-toggle-right");
  const chatToggleBtn = document.getElementById("pg-toggle-chat");
  const stageEl = document.querySelector(".pg-world-stage");
  if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
    stageEl.classList.add("pg-touch");
  }
  const mobileInteractBtn = document.getElementById("pg-mobile-interact");
  const mobileRunBtn = document.getElementById("pg-mobile-run");
  // pg-mobile-chat removed: interaction and chat merged into single "대화" button
  const mobilePauseBtn = document.getElementById("pg-mobile-pause");
  const mobileResetBtn = document.getElementById("pg-mobile-reset");
  const mobileUtilityBtn = document.getElementById("pg-mobile-utility");
  const mobileSheetToggleBtn = document.getElementById("pg-mobile-sheet-toggle");
  const mobileTabControlsBtn = document.getElementById("pg-mobile-tab-controls");
  const mobileTabInfoBtn = document.getElementById("pg-mobile-tab-info");
  const mobileTabLogBtn = document.getElementById("pg-mobile-tab-log");
  const mobileTabChatBtn = document.getElementById("pg-mobile-tab-chat");
  const joystickBase = document.getElementById("pg-joystick-base");
  const joystickKnob = document.getElementById("pg-joystick-knob");

  const LLM_API_URL = String(window.PG_LLM_API_URL || "").trim();
  const LLM_STREAM_API_URL = LLM_API_URL ? LLM_API_URL.replace(/\/api\/npc-chat$/, "/api/npc-chat-stream") : "";
  const WORLD_NPC_API_URL = LLM_API_URL ? LLM_API_URL.replace(/\/api\/npc-chat$/, "/api/world-npcs") : "";
  const TURNSTILE_SITE_KEY = String(window.PG_TURNSTILE_SITE_KEY || "").trim();
  let turnstileWidgetId = null;

  const keys = new Set();
  let llmAvailable = true;
  let debugMode = localStorage.getItem('playground_debug') === 'true';
  let focusedNpcId = null;
  const convoMgr = createConversationManager({
    onFocusChange: () => { if (typeof applyPanelState === 'function') applyPanelState(); },
  });
  const chatMgr = createChatManager({
    convoMgr,
    t,
    formatTime,
    chatTargetNpc,
    getMp: () => mp,
    domRefs: {
      chatLogEl,
      uiLog,
      toastContainer: document.getElementById("pg-toast-container"),
    },
  });
  let lastLlmModel = "local";
  let lastLlmError = "";
  let mobileSheetOpen = false;
  let mobileSheetTab = "controls";
  let mobileChatOpen = false;
  let mobileUtilityOpen = false;
  let mobileStatusCollapsed = false;
  let mobileLogCollapsed = false;
  let autoWalkBtn = null;
  let mobileAutoWalkBtn = null;

  let dragging = false;
  let dragX = 0;
  let dragY = 0;
  let frameCount = 0;
  const isCoarsePointer = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  const mobileMode = isCoarsePointer || window.innerWidth <= 900;
  const inputState = {
    joyX: 0,
    joyY: 0,
    runHold: false,
    touchPanActive: false,
    touchPanX: 0,
    touchPanY: 0,
    pinchDist: 0,
    joystickPointerId: null,
  };

  const world = {
    width: 60,
    height: 80,
    totalMinutes: (() => { const s = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" })); return s.getHours() * 60 + s.getMinutes(); })(),
    paused: false,
    baseTileW: 40,
    baseTileH: 20,
    zoom: DEFAULT_ZOOM,
    cameraX: canvas.width / 2,
    cameraY: 130,
  };

  const sceneState = {
    current: "outdoor",
    savedOutdoorPos: null,
    savedCameraPan: null,
  };

  const panelState = {
    left: true,
    right: true,
    chat: true,
  };

  const player = {
    name: t("default_player_name"),
    flag: "",
    x: 20,
    y: 25,
    speed: 3.7,
    color: "#f2cc61",
    species: "human_a",
    moveTarget: null,
    pose: "standing",
    idleTime: 0,
  };

  // NPC factory & memory functions: systems/npc-data.js
  function addNpcMemory(npc, type, summary, metadata) { _addNpcMemory(npc, type, summary, metadata, world.totalMinutes, player.name); }
  function getNpcMemorySummary(npc) { return _getNpcMemorySummary(npc, t, player.name); }
  function getNpcSocialContext(npc) { return _getNpcSocialContext(npc, npcs, getNpcRelation, t); }

  const npcs = [
    // KSA 학생들 (기숙사→본관→각자 취미)
    makeNpc("heo", "도깨비", "#e56f6f", places.ksa_dorm, places.ksa_main, places.park, "", "human_a"),
    makeNpc("kim", "하루", "#6fa1e5", places.ksa_dorm, places.ksa_main, places.cafe, "", "human_b"),
    makeNpc("choi", "별이", "#79c88b", places.ksa_dorm, places.ksa_main, places.plaza, "", "human_c"),
    makeNpc("jung", "구름", "#b88be6", places.ksa_dorm, places.ksa_main, places.market, "", "human_d"),
    makeNpc("seo", "바람", "#e6a76f", places.ksa_dorm, places.ksa_main, places.park, "", "human_e"),
    makeNpc("lee", "솔이", "#6fc7ba", places.ksa_dorm, places.ksa_main, places.cafe, "", "human_f"),
    makeNpc("park", "다온", "#d88972", places.ksa_dorm, places.ksa_main, places.plaza, "", "human_g"),
    makeNpc("jang", "새벽", "#8e9be3", places.ksa_dorm, places.ksa_main, places.market, "", "human_h"),
    makeNpc("guide", "유진", "#f0a0c0", places.infoCenter, places.infoCenter, places.infoCenter, "", "human_a"),
    makeNpc("yoo", "유효곤", "#5e88dd", places.ksa_dorm, places.ksa_main, places.park, "", "human_i"),
    // 마을 주민들
    makeNpc("baker", "밀순이", "#e6a76f", places.bakery, places.bakery, places.market, "npc_personality_baker", "human_d"),
    makeNpc("floristNpc", "꽃잎", "#ff8fa3", places.florist, places.florist, places.park, "npc_personality_florist", "human_c"),
    makeNpc("librarian", "글타래", "#7a9ec7", places.library, places.library, places.cafe, "npc_personality_librarian", "human_b"),
    makeNpc("residentA", "마루", "#8bc77a", places.homeA, places.market, places.plaza, "npc_personality_residentA", "human_g"),
    makeNpc("residentB", "나비", "#c9a0d4", places.homeB, places.office, places.library, "npc_personality_residentB", "human_f"),
    makeNpc("residentC", "돌담", "#d4a070", places.homeC, places.bakery, places.park, "npc_personality_residentC", "human_h"),
    // 추가 주민들
    makeNpc("barista", "모카", "#e8a0a0", places.cafe, places.cafe, places.park, "", "human_b"),
    makeNpc("florist_owner", "봄이", "#f0c0d0", places.florist, places.florist, places.plaza, "", "human_d"),
    makeNpc("chef", "불꽃", "#d0a060", places.restaurant, places.restaurant, places.market, "", "human_e"),
    makeNpc("officer", "철벽", "#6080b0", places.police, places.police, places.plaza, "", "human_f"),
    makeNpc("athlete", "번개", "#80c080", places.gym, places.gym, places.park, "", "human_g"),
    makeNpc("doctor", "온기", "#f0f0f0", places.hospital, places.hospital, places.cafe, "", "human_h"),
    makeNpc("student_a", "호기심", "#e0c080", places.ksa_dorm, places.ksa_main, places.park, "", "human_a"),
    makeNpc("student_b", "고요", "#c0a0e0", places.ksa_dorm, places.ksa_main, places.library, "", "human_i"),
    makeNpc("grandpa", "느티", "#c0b090", places.homeA, places.plaza, places.park, "", "human_h"),
  ];

  const relations = {
    playerToHeo: 52,
    playerToKim: 47,
    heoToKim: 38,
    playerToChoi: 50,
  };

  // ─── NPC Social Graph ───
  const npcSocialGraph = {};


  function getNpcRelation(aId, bId) {
    return npcSocialGraph[socialKey(aId, bId)] || 50;
  }

  function adjustNpcRelation(aId, bId, delta) {
    const key = socialKey(aId, bId);
    npcSocialGraph[key] = clamp(Math.round((npcSocialGraph[key] || 50) + delta), 0, 100);
  }


  const quest = {
    title: "",
    stage: 0,
    objective: "",
    done: true,
    dynamic: false,
  };

  const questHistory = [];
  let questCount = 0;

  // ─── 술래잡기 미니게임 (모듈: systems/tag-game.js) ───
  let tagGameModule = null;
  function tagCtx() {
    return { player, npcs, addChat, addLog, t, upsertSpeechBubble, canStand };
  }
  function ensureTagGame() {
    if (!tagGameModule) tagGameModule = createTagGame(tagCtx());
    return tagGameModule;
  }
  function startTagGame(npc) { ensureTagGame().start(npc); }
  function updateTagGame(dt) { ensureTagGame().update(dt); }
  const tagGame = {
    get active() { return tagGameModule ? tagGameModule.isActive() : false; },
    get targetNpcId() { return tagGameModule ? tagGameModule.getTargetNpcId() : null; },
  };

  // ─── Ambient Speech System (module: systems/ambient-speech.js) ───
  let ambientSpeechModule = null;
  function ensureAmbientSpeech() {
    if (!ambientSpeechModule) {
      ambientSpeechModule = createAmbientSpeechSystem({
        convoMgr, chatMgr, npcs, player, weather, t,
        autoWalk: playerCtrl.autoWalkRef,
        addChat, upsertSpeechBubble, llmReplyOrEmpty,
        nearestNpc, isTypingInInput, formatTime,
      });
    }
    return ambientSpeechModule;
  }

  // ─── NPC Social System (module: systems/npc-social-events.js) ───
  let npcSocialSys = null;
  function ensureNpcSocial() {
    if (!npcSocialSys) {
      npcSocialSys = createNpcSocialSystem({
        npcs, player, world, convoMgr, t,
        llmReplyOrEmpty, upsertSpeechBubble, addChat, addLog,
        ambientEmoji: (npc, nearOther) => ensureAmbientSpeech().ambientEmoji(npc, nearOther),
        formatTime, npcById, getNpcRelation, adjustNpcRelation,
      });
    }
    return npcSocialSys;
  }

  // ─── Guide Greeting System (module: systems/guide-greeting.js) ───
  let guideGreetingSys = null;
  function ensureGuideGreeting() {
    if (!guideGreetingSys) {
      guideGreetingSys = createGuideGreetingSystem({
        npcs, player, convoMgr, t,
        llmReplyOrEmpty, upsertSpeechBubble, addChat,
        canStandInScene, isIntroDone: () => introSeq.isDone,
      });
    }
    return guideGreetingSys;
  }

  const worldEvents = {
    day: -1,
    once: {},
  };

  // ─── Weather System ───
  const weather = createWeatherState();
  const weatherParticles = createWeatherParticles();
  const audioManager = createAudioManager();
  let discoveryNotifyUntil = 0;
  let discoveryNotifyTitle = "";

  // ─── Weather Update (모듈: systems/weather.js) ───
  const WEATHER_API_URL = LLM_API_URL ? LLM_API_URL.replace(/\/api\/npc-chat$/, "/api/weather") : "";

  function updateWeather(dt) {
    _updateWeather(weather, dt, WEATHER_API_URL);
    _updateWeatherParticles(weather, weatherParticles, dt, canvas.width, canvas.height, hourOfDay());
    audioManager.updateForScene(weather.current, hourOfDay());
  }

  // ─── Discovery Update ───
  function discoveryConditionMet(d) {
    const hr = hourOfDay();
    if (d.condition === "always") return true;
    if (d.condition === "night") return hr >= 22 || hr < 4;
    if (d.condition === "dawn") return hr >= 4 && hr < 7;
    if (d.condition === "evening") return hr >= 17 && hr < 20;
    if (d.condition === "rain") return weather.current === "rain" || weather.current === "storm";
    if (d.condition === "storm") return weather.current === "storm";
    if (d.condition === "snow") return weather.current === "snow";
    if (d.condition === "fog") return weather.current === "fog";
    return true;
  }

  function updateDiscoveries() {
    if (discoveries.every(d => d.found)) return;
    const now = nowMs();
    for (const d of discoveries) {
      if (d.found) continue;
      if (!discoveryConditionMet(d)) continue;
      if (dist(player, d) > d.radius) continue;
      d.found = true;
      const itemKey = d.reward;
      if (itemKey && inventory.hasOwnProperty(itemKey)) {
        inventory[itemKey] = (inventory[itemKey] || 0) + 1;
      }
      discoveryNotifyUntil = now + 4000;
      discoveryNotifyTitle = t(d.title);
      addLog(t("log_discovery", { title: t(d.title), desc: t(d.desc) }));
      addChat("System", t("sys_discovery", { title: t(d.title) }));
    }
  }

  // 부탁은 LLM 대화에서만 자연스럽게 발생 — 여기서는 만료 처리만
  function updateFavorRequests() {
    const now = nowMs();
    for (const npc of npcs) {
      if (npc.activeRequest && now > npc.activeRequest.expiresAt) {
        npc.activeRequest = null;
      }
    }
  }

  function checkFavorCompletion(npc) {
    const req = npc.activeRequest;
    if (!req) return false;

    if (req.type === "bring_item") {
      if (inventory[req.itemNeeded] > 0) {
        inventory[req.itemNeeded] -= 1;
        completeFavor(npc, req);
        return true;
      }
      addChat(npc.name, t("favor_need_item", { label: t(itemTypes[req.itemNeeded].label) }));
      return true;
    }

    if (req.type === "deliver_to") {
      const target = npcById(req.targetNpcId);
      if (!target) {
        addChat("System", t("sys_favor_cancel"));
        npc.activeRequest = null;
        return true;
      }
      if (dist(player, target) < 2.5) {
        completeFavor(npc, req);
        return true;
      }
      addChat(npc.name, t("favor_go_to_target", { name: target.name }));
      return true;
    }

    if (req.type === "visit_place") {
      if (req.targetPlace && dist(player, req.targetPlace) < 3.0) {
        completeFavor(npc, req);
        return true;
      }
      addChat(npc.name, t("favor_go_check"));
      return true;
    }

    return false;
  }

  function completeFavor(npc, req) {
    npc.favorPoints += Math.round(req.reward.favorPoints * 1 * 1);
    const relKey = Object.keys(relations).find((k) => k.toLowerCase().includes(npc.id.slice(0, 3)));
    if (relKey) adjustRelation(relKey, req.reward.relationBoost);
    for (const it of req.reward.items || []) {
      inventory[it] = (inventory[it] || 0) + 1;
    }
    npc.mood = "happy";
    npc.moodUntil = nowMs() + 45_000;
    npc.activeRequest = null;

    if (npc.favorPoints >= 100) {
      npc.favorLevel = Math.min(npc.favorLevel + 1, 4);
      npc.favorPoints = 0;
      addNpcMemory(npc, "favor", t("mem_favor_advance", { level: t(favorLevelNames[npc.favorLevel]) }));
    }

    addChat("System", t("favor_complete", { title: req.title, points: req.reward.favorPoints }));
  }

  function itemRespawnMs(gi) {
    if (gi.type === "gem") return Math.round(ITEM_RESPAWN_MS / 1);
    return ITEM_RESPAWN_MS;
  }

  const inventory = {};
  for (const k of Object.keys(itemTypes)) inventory[k] = 0;

  // ─── Seasons ───
  function currentSeason() {
    const day = currentDay();
    return seasons[Math.floor(day / 7) % 4];
  }

  let lastSeasonAnnounced = "";

  function checkSeasonChange() {
    const s = currentSeason();
    if (s !== lastSeasonAnnounced) {
      lastSeasonAnnounced = s;
      const effects = {
        season_spring_name: t("season_spring"),
        season_summer_name: t("season_summer"),
        season_autumn_name: t("season_fall"),
        season_winter_name: t("season_winter"),
      };
      addChat("System", effects[s] || t("season_change", { season: t(s) }));
    }
  }

  function nearestGroundItem(maxDist) {
    const now = nowMs();
    const boostedDist = maxDist * 1;
    let best = null;
    let bestD = Infinity;
    for (const gi of groundItems) {
      if (gi.pickedAt > 0 && now - gi.pickedAt < itemRespawnMs(gi)) continue;
      const d = dist(player, gi);
      if (d <= boostedDist && d < bestD) {
        best = gi;
        bestD = d;
      }
    }
    return best;
  }

  function pickupItem() {
    const gi = nearestGroundItem(1.5);
    if (!gi) return false;
    gi.pickedAt = nowMs();
    let amount = 1;
    if (gi.type === "snack") amount = Math.round(amount * 1);
    amount = Math.round(amount * 1);
    inventory[gi.type] = (inventory[gi.type] || 0) + amount;
    const info = itemTypes[gi.type];
    addChat("System", t("sys_item_pickup", { emoji: info.emoji, label: t(info.label), extra: amount > 1 ? ` (x${amount})` : "", count: inventory[gi.type] }));
    audioManager.playSfx('/assets/audio/sfx-pickup.mp3');
    return true;
  }

  function giftItemToNpc(npc) {
    const giftable = Object.entries(inventory).filter(([, count]) => count > 0);
    if (giftable.length === 0) {
      addChat("System", t("sys_no_gift_item"));
      return false;
    }
    const [type] = giftable[Math.floor(Math.random() * giftable.length)];
    inventory[type] -= 1;
    const info = itemTypes[type];
    const bonus = type === "gem" ? 12 : type === "letter" ? 8 : 5;
    const relKey = Object.keys(relations).find((k) => k.toLowerCase().includes(npc.id.slice(0, 3)));
    if (relKey) adjustRelation(relKey, bonus);
    npc.mood = "happy";
    npc.moodUntil = nowMs() + 30_000;
    const reactions = [
      t("gift_react_1", { label: t(info.label) }),
      t("gift_react_2", { label: t(info.label) }),
      t("gift_react_3"),
    ];
    addChat(npc.name, reactions[Math.floor(Math.random() * reactions.length)]);
    addNpcMemory(npc, "gift", t("mem_gift_received", { label: t(info.label) }), { item: type });
    ensureMemoryFormat(npc).giftsReceived += 1;
    return true;
  }

  function inventorySummary() {
    const parts = [];
    for (const [type, count] of Object.entries(inventory)) {
      if (count > 0) {
        const info = itemTypes[type];
        parts.push(`${info.emoji}${count}`);
      }
    }
    return parts.length > 0 ? parts.join(" ") : t("inv_empty");
  }


  function pickRandomPlace() {
    const values = Object.values(places);
    return values[Math.floor(Math.random() * values.length)];
  }


  function normalizePlayerFlag(value) {
    const v = String(value || "").trim();
    if (!v) return "";
    return COUNTRY_LIST.some((c) => c.flag === v) ? v : "";
  }

  function countryCodeToFlag(code) {
    const cc = String(code || "").toUpperCase().trim();
    if (cc.length !== 2) return "";
    const flag = String.fromCodePoint(
      cc.charCodeAt(0) - 65 + 0x1F1E6,
      cc.charCodeAt(1) - 65 + 0x1F1E6,
    );
    return normalizePlayerFlag(flag);
  }

  async function detectCountryFlag() {
    try {
      const res = await fetch("https://ipapi.co/country_code/", { signal: AbortSignal.timeout(3000) });
      if (!res.ok) return "";
      const code = (await res.text()).trim();
      return countryCodeToFlag(code);
    } catch {
      return "";
    }
  }

  function showNameModal(defaultName) {
    return new Promise((resolve) => {
      const modal = document.getElementById("pg-name-modal");
      const nameInput = document.getElementById("pg-name-input");
      const confirmBtn = document.getElementById("pg-name-confirm");
      const langKoBtn = document.getElementById("pg-name-lang-ko");
      const langEnBtn = document.getElementById("pg-name-lang-en");
      if (!modal || !nameInput || !confirmBtn) {
        resolve({ name: defaultName || t("default_player_name"), lang: currentLang });
        return;
      }
      nameInput.value = defaultName || "";
      // 언어 버튼 초기 상태
      let selectedLang = currentLang;
      if (langKoBtn && langEnBtn) {
        langKoBtn.classList.toggle("active", selectedLang === "ko");
        langEnBtn.classList.toggle("active", selectedLang === "en");
        const switchLang = (lang) => { selectedLang = lang; currentLang = lang; langKoBtn.classList.toggle("active", lang === "ko"); langEnBtn.classList.toggle("active", lang === "en"); translateStaticDOM(); };
        langKoBtn.onclick = () => switchLang("ko");
        langEnBtn.onclick = () => switchLang("en");
      }
      modal.hidden = false;
      // 모바일에서는 프로그래밍적 focus로 키보드가 안 뜸 — 데스크톱만 auto-focus
      const isMobile = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
      if (!isMobile) {
        nameInput.focus();
        nameInput.select();
      }
      function finish() {
        confirmBtn.removeEventListener("click", finish);
        nameInput.removeEventListener("keydown", onKey);
        modal.hidden = true;
        resolve({ name: normalizePlayerName(nameInput.value), lang: selectedLang });
      }
      function onKey(e) { if (e.key === "Enter") finish(); }
      confirmBtn.addEventListener("click", finish);
      nameInput.addEventListener("keydown", onKey);
    });
  }

  let isReturningVisitor = false;

  async function initPlayerName() {
    let storedName = "";
    let storedFlag = "";
    let hasSaveData = false;
    try {
      storedName = localStorage.getItem(PLAYER_NAME_KEY) || "";
      storedFlag = localStorage.getItem(PLAYER_FLAG_KEY) || "";
      hasSaveData = !!localStorage.getItem(SAVE_KEY);
    } catch { /* ignore */ }

    if (!storedFlag) {
      const detected = await detectCountryFlag();
      if (detected) {
        storedFlag = detected;
        try { localStorage.setItem(PLAYER_FLAG_KEY, storedFlag); } catch { /* ignore */ }
      }
    }
    player.flag = normalizePlayerFlag(storedFlag);

    // 재방문자: 이름이 있고 세이브가 있으면 모달 건너뛰기
    if (storedName && hasSaveData) {
      isReturningVisitor = true;
      player.name = storedName;
      currentLang = localStorage.getItem("playground_lang") || currentLang;
    } else {
      // 첫 방문자: 이름/언어 설정 모달 표시
      const result = await showNameModal(storedName || "");
      player.name = result.name;
      currentLang = result.lang;
      try {
        localStorage.setItem(PLAYER_NAME_KEY, player.name);
        localStorage.setItem("playground_lang", currentLang);
      } catch { /* ignore */ }
    }
  }

  async function changePlayerName() {
    const result = await showNameModal(player.name);
    player.name = result.name;
    currentLang = result.lang;
    try {
      localStorage.setItem(PLAYER_NAME_KEY, player.name);
      localStorage.setItem("playground_lang", currentLang);
    } catch { /* ignore */ }
    translateStaticDOM();
    addLog(t("log_name_changed", { name: (player.flag ? player.flag + " " : "") + player.name }));
  }

  function toggleMobileChatMode() {
    const target = chatTargetNpc();
    const npcNear = target && target.near;
    if (!npcNear && mp && mp.enabled) {
      // Open chat panel for multiplayer global chat
      if (isMobileViewport()) {
        mobileChatOpen = true;
        mobileUtilityOpen = false;
      } else if (!panelState.chat) panelState.chat = true;
      if (chatInputEl) chatInputEl.focus();
      applyPanelState();
      return;
    }
    if (!npcNear) {
      addChat("System", t("sys_no_npc_near_chat"));
      return;
    }

    convoMgr.startConversation(target.npc.id, 18_000, "user");
    if (isMobileViewport()) {
      mobileChatOpen = true;
      mobileUtilityOpen = false;
    }
    else if (!panelState.chat) panelState.chat = true;
    if (chatInputEl) chatInputEl.focus();
    applyPanelState();
  }

  function endConversation() {
    const npc = convoMgr.focusNpcId ? npcById(convoMgr.focusNpcId) : null;
    if (npc && npc.following) npc.following = false;
    convoMgr.endConversation();
    syncMemoryToServer();
    if (chatSuggestionsEl) chatSuggestionsEl.innerHTML = "";
    if (isMobileViewport()) {
      mobileChatOpen = false;
      inputState.runHold = false;
      keys.clear();
      resetJoystick();
      player.moveTarget = null;
    }
    if (chatInputEl) chatInputEl.blur();
    applyPanelState();
  }

  // Keep legacy name for mobile-specific callers
  function closeMobileChat() { endConversation(); }

  function ensureTurnstileWidget() {
    if (!TURNSTILE_SITE_KEY) return null;
    if (!window.turnstile || typeof window.turnstile.render !== "function") {
      throw new Error("Turnstile script is not loaded");
    }
    if (turnstileWidgetId !== null) return turnstileWidgetId;
    const el = document.createElement("div");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    el.style.top = "-9999px";
    document.body.appendChild(el);
    turnstileWidgetId = window.turnstile.render(el, {
      sitekey: TURNSTILE_SITE_KEY,
      size: "invisible",
    });
    return turnstileWidgetId;
  }

  async function getHumanVerificationToken(action = "npc_chat") {
    if (typeof window.PG_HUMAN_TOKEN_PROVIDER === "function") {
      const token = await window.PG_HUMAN_TOKEN_PROVIDER(action);
      return String(token || "").trim();
    }
    if (!TURNSTILE_SITE_KEY) return "";
    if (!window.turnstile || typeof window.turnstile.execute !== "function") {
      throw new Error("Turnstile is not available");
    }
    const widgetId = ensureTurnstileWidget();
    const token = await window.turnstile.execute(widgetId, { action });
    return String(token || "").trim();
  }

  async function buildApiHeaders(action = "npc_chat") {
    const headers = { "Content-Type": "application/json" };
    const token = await getHumanVerificationToken(action);
    if (token) headers["X-Turnstile-Token"] = token;
    return headers;
  }

  function spawnNpcFromSharedRecord(record) {
    if (!record || !record.id || !record.name) return null;
    if (npcs.some((n) => n.id === record.id)) return null;
    if (removedNpcIds.has(record.id)) return null;
    const home = pickRandomPlace();
    const work = pickRandomPlace();
    const hobby = pickRandomPlace();
    const npc = makeNpc(
      record.id,
      record.name,
      randomPastelColor(),
      { x: home.x, y: home.y },
      work,
      hobby,
      record.personality || inferPersonalityFromName(record.name, t),
      randomSpecies()
    );
    npc.x = home.x;
    npc.y = home.y;
    npcs.push(npc);
    return npc;
  }

  function createCustomNpc(nameRaw, personalityRaw) {
    const name = String(nameRaw || "").trim();
    const personality = String(personalityRaw || "").trim() || inferPersonalityFromName(name, t);
    if (!name) return { ok: false, reason: t("npc_err_no_name") };
    if (npcs.some((n) => n.name === name)) return { ok: false, reason: t("npc_err_dup_name") };
    if (npcs.length >= 48) return { ok: false, reason: t("npc_err_too_many") };

    const id = `custom_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e5).toString(36)}`;
    const home = { x: clamp(player.x + (Math.random() * 2 - 1) * 1.5, 2, world.width - 2), y: clamp(player.y + (Math.random() * 2 - 1) * 1.5, 2, world.height - 2) };
    const npc = makeNpc(id, name, randomPastelColor(), home, pickRandomPlace(), pickRandomPlace(), personality, randomSpecies());
    npc.x = home.x;
    npc.y = home.y;
    npcs.push(npc);
    npcPersonas[id] = { age: "npc_age_20s", gender: "npc_gender_male", personality };
    return { ok: true, npc };
  }

  const removedNpcIds = new Set();

  function removeNpc(nameOrId) {
    const query = String(nameOrId || "").trim();
    if (!query) return { ok: false, reason: t("npc_err_no_query") };
    const idx = npcs.findIndex((n) => n.name === query || n.id === query);
    if (idx === -1) return { ok: false, reason: t("npc_err_not_found", { query }) };
    const npc = npcs[idx];
    npcs.splice(idx, 1);
    removedNpcIds.add(npc.id);
    convoMgr.clearFocusIf(npc.id);
    if (focusedNpcId === npc.id) focusedNpcId = null;
    delete npcPersonas[npc.id];
    // Cancel favor requests targeting this NPC
    for (const other of npcs) {
      if (other.activeRequest && other.activeRequest.targetNpcId === npc.id) {
        other.activeRequest = null;
      }
    }
    refreshRemoveSelect();
    return { ok: true, name: npc.name };
  }

  async function fetchSharedNpcs() {
    if (!WORLD_NPC_API_URL) return [];
    const res = await fetch(WORLD_NPC_API_URL, { method: "GET" });
    if (!res.ok) throw new Error(`Shared NPC API ${res.status}`);
    const data = await res.json();
    return Array.isArray(data.customNpcs) ? data.customNpcs : [];
  }

  async function createSharedNpc(name, personality) {
    if (!WORLD_NPC_API_URL) throw new Error("Shared NPC endpoint is empty");
    const headers = await buildApiHeaders("world_npc_create");
    const res = await fetch(WORLD_NPC_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ name, personality }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Shared NPC API ${res.status}`);
    }
    const data = await res.json();
    return data.npc;
  }

  async function syncSharedNpcs() {
    if (!WORLD_NPC_API_URL) return;
    try {
      const items = await fetchSharedNpcs();
      let added = 0;
      for (const item of items) {
        if (spawnNpcFromSharedRecord(item)) {
          npcPersonas[item.id] = { age: "npc_age_20s", gender: "npc_gender_male", personality: item.personality || inferPersonalityFromName(item.name, t) };
          added += 1;
        }
      }
      if (added > 0) addLog(t("log_shared_npc_sync", { count: added }));
    } catch (err) {
      addLog(t("log_shared_npc_fail"));
    }
  }

  function resizeCanvasToDisplaySize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const displayWidth = Math.max(320, Math.floor(canvas.clientWidth));
    const displayHeight = Math.max(320, Math.floor(canvas.clientHeight));
    const nextWidth = Math.floor(displayWidth * dpr);
    const nextHeight = Math.floor(displayHeight * dpr);
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
      if (world.cameraX === 0 || !Number.isFinite(world.cameraX)) world.cameraX = canvas.width * 0.5;
      if (world.cameraY === 0 || !Number.isFinite(world.cameraY)) world.cameraY = canvas.height * 0.24;
    }
    if (gameRenderer3D) {
      gameRenderer3D.resize();
    }
  }

  function setPanelToggle(btn, active) {
    if (!btn) return;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  }

  function applyPanelState() {
    if (!stageEl) return;
    const mobile = isMobileViewport();
    if (mobile) {
      panelState.left = true;
      panelState.right = true;
    }
    stageEl.classList.toggle("pg-hide-left", mobile ? false : !panelState.left);
    stageEl.classList.toggle("pg-hide-right", mobile ? false : !panelState.right);
    stageEl.classList.toggle("pg-hide-chat", mobile ? !mobileChatOpen : !panelState.chat);
    stageEl.classList.toggle("pg-mobile-sheet-open", mobileSheetOpen);
    stageEl.classList.toggle("pg-mobile-tab-controls", mobileSheetTab === "controls");
    stageEl.classList.toggle("pg-mobile-tab-info", mobileSheetTab === "info");
    stageEl.classList.toggle("pg-mobile-tab-log", mobileSheetTab === "log");
    stageEl.classList.toggle("pg-mobile-tab-chat", mobileSheetTab === "chat");
    stageEl.classList.toggle("pg-mobile-chat-active", mobile && mobileChatOpen);
    stageEl.classList.toggle("pg-mobile-utility-open", mobile && mobileUtilityOpen);
    stageEl.classList.toggle("pg-mobile-status-collapsed", mobile && mobileStatusCollapsed);
    stageEl.classList.toggle("pg-mobile-log-collapsed", mobile && mobileLogCollapsed);
    if (mobileSheetToggleBtn) {
      mobileSheetToggleBtn.textContent = mobileSheetOpen ? t("mobile_panel_close") : t("mobile_panel_open");
      mobileSheetToggleBtn.setAttribute("aria-expanded", mobileSheetOpen ? "true" : "false");
    }
    if (chatCloseBtn) {
      chatCloseBtn.hidden = !convoMgr.focusNpcId;
    }
    if (mobileUtilityBtn) {
      mobileUtilityBtn.classList.toggle("pg-pressed", mobile && mobileUtilityOpen);
      mobileUtilityBtn.setAttribute("aria-pressed", mobile && mobileUtilityOpen ? "true" : "false");
    }
    if (statusToggleBtn) {
      statusToggleBtn.hidden = !mobile;
      statusToggleBtn.textContent = mobileStatusCollapsed ? t("mobile_expand") : t("mobile_collapse");
      statusToggleBtn.setAttribute("aria-expanded", mobileStatusCollapsed ? "false" : "true");
    }
    if (logToggleBtn) {
      logToggleBtn.hidden = !mobile;
      logToggleBtn.textContent = mobileLogCollapsed ? t("mobile_expand") : t("mobile_collapse");
      logToggleBtn.setAttribute("aria-expanded", mobileLogCollapsed ? "false" : "true");
    }
    const tabs = [
      [mobileTabControlsBtn, "controls"],
      [mobileTabInfoBtn, "info"],
      [mobileTabLogBtn, "log"],
      [mobileTabChatBtn, "chat"],
    ];
    for (const [btn, key] of tabs) {
      if (!btn) continue;
      const active = mobileSheetTab === key;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    }
    setPanelToggle(leftToggleBtn, panelState.left);
    setPanelToggle(rightToggleBtn, panelState.right);
    setPanelToggle(chatToggleBtn, mobile ? true : panelState.chat);
  }

  function savePanelState() {
    try {
      localStorage.setItem(UI_PREF_KEY, JSON.stringify(panelState));
    } catch (_) {}
  }

  function defaultPanelStateByViewport() {
    const w = window.innerWidth || 1280;
    if (w < 900) return { left: true, right: true, chat: true };
    if (w < 1120) return { left: true, right: false, chat: true };
    if (w < 1360) return { left: true, right: false, chat: true };
    return { left: true, right: true, chat: true };
  }

  function isMobileViewport() {
    const w = window.innerWidth || 1280;
    const h = window.innerHeight || 800;
    return w <= 900 || (h <= 500 && w > h);
  }

  function togglePanel(key) {
    if (!(key in panelState)) return;
    panelState[key] = !panelState[key];
    applyPanelState();
    savePanelState();
  }

  function saveMobileSheetState() {
    try {
      localStorage.setItem(
        MOBILE_SHEET_KEY,
        JSON.stringify({ open: mobileSheetOpen, tab: mobileSheetTab })
      );
    } catch (_) {}
  }

  function loadMobileSheetState() {
    let loaded = null;
    try {
      const raw = localStorage.getItem(MOBILE_SHEET_KEY);
      if (raw) loaded = JSON.parse(raw);
    } catch (_) {}
    mobileSheetOpen = !!loaded?.open;
    mobileSheetTab =
      loaded?.tab === "controls" || loaded?.tab === "info" || loaded?.tab === "log" || loaded?.tab === "chat"
        ? loaded.tab
        : "controls";
  }

  function setMobileSheetTab(tab, open = true) {
    mobileSheetTab = tab;
    if (open) mobileSheetOpen = true;
    applyPanelState();
    saveMobileSheetState();
  }

  function toggleMobileSheet() {
    if (!isMobileViewport()) return;
    mobileSheetOpen = !mobileSheetOpen;
    applyPanelState();
    saveMobileSheetState();
  }

  function loadPanelState() {
    let loaded = null;
    try {
      const raw = localStorage.getItem(UI_PREF_KEY);
      if (raw) loaded = JSON.parse(raw);
    } catch (_) {}
    const next = loaded && typeof loaded === "object" ? loaded : defaultPanelStateByViewport();
    panelState.left = typeof next.left === "boolean" ? next.left : true;
    panelState.right = typeof next.right === "boolean" ? next.right : false;
    panelState.chat = typeof next.chat === "boolean" ? next.chat : true;
    loadMobileSheetState();
    applyPanelState();
  }


  function currentDay() {
    return Math.floor(world.totalMinutes / (24 * 60));
  }

  function minuteOfDay() {
    return ((world.totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  }

  function hourOfDay() {
    return Math.floor(minuteOfDay() / 60);
  }

  function formatTime() {
    const t = minuteOfDay();
    const h = Math.floor(t / 60);
    const m = Math.floor(t % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  function dayFlag(name) {
    return `${currentDay()}:${name}`;
  }



  // ─── Delegated chat functions (shorthand for chatMgr.*) ───
  const addChat = chatMgr.addChat;
  const addLog = chatMgr.addLog;
  const addSystemToast = chatMgr.addSystemToast;
  const addNpcChat = chatMgr.addNpcChat;
  const addGlobalChat = chatMgr.addGlobalChat;
  const getNpcChats = chatMgr.getNpcChats;
  const upsertSpeechBubble = chatMgr.upsertSpeechBubble;
  const renderCurrentChat = chatMgr.renderCurrentChat;
  const renderToasts = chatMgr.renderToasts;
  const startStreamingChat = chatMgr.startStreamingChat;

  function resolveSpeakerById(id) {
    if (id === "player") return player;
    if (typeof id === "string" && id.startsWith("remote_")) {
      const key = id.slice(7);
      return mp.remotePlayers[key] || null;
    }
    return npcs.find((n) => n.id === id) || null;
  }


  function isTypingInInput() {
    const el = document.activeElement;
    if (!el) return false;
    if (el === chatInputEl) return true;
    const tag = String(el.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea") return true;
    if (el.isContentEditable) return true;
    return false;
  }

  function isChatTyping() {
    return !!chatInputEl && document.activeElement === chatInputEl && !chatInputEl.disabled;
  }


  function activeConversationNpc() {
    const pinned = npcById(convoMgr.focusNpcId);
    if (pinned && dist(player, pinned) <= CHAT_NEARBY_DISTANCE * GAME.PIN_NPC_RANGE_MULT) return pinned;

    const target = chatTargetNpc();
    if (!target) return null;
    if (target.near && isChatTyping()) return target.npc;
    if (target.near && convoMgr.isSessionActive(target.npc.id)) return target.npc;
    return null;
  }

  function adjustRelation(key, delta) {
    const boosted = delta * 1 * 1;
    relations[key] = clamp(Math.round((relations[key] || 50) + boosted), 0, 100);
  }

  function project(wx, wy, wz) {
    const tileW = world.baseTileW * world.zoom;
    const tileH = world.baseTileH * world.zoom;
    return {
      x: (wx - wy) * (tileW * 0.5) + world.cameraX,
      y: (wx + wy) * (tileH * 0.5) + world.cameraY - wz * tileH,
    };
  }

  function roadTile(x, y) {
    // Boulevard (north-south, 3 tiles wide)
    if (x >= 29 && x <= 31 && y >= 3 && y <= 77) return true;
    // Park south path
    if (y >= 13.5 && y <= 14.5 && x >= 8 && x <= 52) return true;
    // Commercial row 1 connector
    if (y >= 17.5 && y <= 18.5 && x >= 8 && x <= 52) return true;
    // Plaza paths
    if (y >= 24.5 && y <= 25.5 && x >= 12 && x <= 48) return true;
    // Commercial row 2 connector
    if (y >= 34.5 && y <= 35.5 && x >= 8 && x <= 52) return true;
    // Bridge over river
    if (x >= 28 && x <= 32 && y >= 44 && y <= 46) return true;
    return false;
  }

  function waterTile(x, y) {
    // East-west river with slight curve
    const riverCenter = 45 + Math.sin(x * 0.15) * 0.8;
    if (Math.abs(y - riverCenter) < 1.2) {
      // Bridge gap
      if (x >= 28 && x <= 32) return false;
      return x >= 2 && x <= 58;
    }
    return false;
  }

  function inBuilding(x, y) {
    return buildings.some((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
  }

  function canStandInScene(x, y, scene) {
    if (scene !== "outdoor") {
      const interior = interiorDefs && interiorDefs[scene];
      if (!interior) return false;
      if (x < 0.3 || y < 0.3 || x > interior.width - 0.3 || y > interior.height - 0.3) return false;
      if (interior.collision) {
        for (const c of interior.collision) {
          if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) return false;
        }
      }
      return true;
    }
    if (x < 1 || y < 1 || x > world.width - 1 || y > world.height - 1) return false;
    if (inBuilding(x, y)) return false;
    if (waterTile(x, y)) return false;
    return true;
  }

  function canStand(x, y) {
    return canStandInScene(x, y, sceneState.current);
  }

  // ─── Door-to-Building ID Mapping ───
  const doorToBuildingMap = {
    cafeDoor: "cafe",
    bakeryDoor: "bakery",
    floristDoor: "florist",
    libraryDoor: "library",
    officeDoor: "office",
    marketDoor: "market",
    ksaMainDoor: "ksa_main",
    ksaDormDoor: "ksa_dorm",
    houseADoor: "houseA",
    houseBDoor: "houseB",
    houseCDoor: "houseC",
    koreaUnivDoor: "korea_univ",
    kaistAiDoor: "kaist_ai",
    kraftonAiDoor: "krafton_ai",
    restaurantDoor: "restaurant",
    hospitalDoor: "hospital",
    convenienceDoor: "convenience",
    policeDoor: "police",
    gymDoor: "gym",
  };

  // ─── NPC Home/Work Building Mapping ───
  const npcBuildingMap = {
    heo: { home: "ksa_dorm", work: "ksa_main" },
    kim: { home: "ksa_dorm", work: "ksa_main" },
    choi: { home: "ksa_dorm", work: "ksa_main" },
    jung: { home: "ksa_dorm", work: "ksa_main" },
    seo: { home: "ksa_dorm", work: "ksa_main" },
    lee: { home: "ksa_dorm", work: "ksa_main" },
    park: { home: "ksa_dorm", work: "ksa_main" },
    jang: { home: "ksa_dorm", work: "ksa_main" },
    yoo: { home: "ksa_dorm", work: "ksa_main" },
    guide: { home: null, work: null },
    baker: { home: "bakery", work: "bakery" },
    floristNpc: { home: "florist", work: "florist" },
    librarian: { home: "library", work: "library" },
    residentA: { home: "houseA", work: "market" },
    residentB: { home: "houseB", work: "office" },
    residentC: { home: "houseC", work: "bakery" },
    barista: { home: "houseA", work: "cafe" },
    florist_owner: { home: "houseC", work: "florist" },
    chef: { home: "houseB", work: "restaurant" },
    officer: { home: "houseA", work: "police" },
    athlete: { home: "houseC", work: "gym" },
    doctor: { home: "houseB", work: "hospital" },
    student_a: { home: "ksa_dorm", work: "ksa_main" },
    student_b: { home: "ksa_dorm", work: "ksa_main" },
    grandpa: { home: "houseA", work: null },
  };

  // ─── Scene Manager (모듈: systems/scene-manager.js) ───
  // ─── Camera System (모듈: systems/camera.js) ───
  const cameraSys = createCameraSystem({
    world, player, npcs, canvas,
    activeConversationNpc: () => activeConversationNpc(),
    project: (wx, wy, wz) => project(wx, wy, wz),
    addLog, t,
  });
  const cameraPan = cameraSys.cameraPan;

  const sceneMgr = createSceneManager({ sceneState, player, cameraPan, buildings, interiorDefs, addLog, t });

  // ─── Player Controller (모듈: systems/player-controller.js) ───
  // Created after sceneMgr/cameraSys but before llmReplyOrEmpty.
  // Lazy references (introSeq, ensureAmbientSpeech) resolved at call time.
  const playerCtrl = createPlayerController({
    player, world, keys, inputState, sceneState, weather,
    npcs: () => npcs,
    convoMgr, canStand, canStandInScene,
    isIntroDone: () => introSeq.isDone,
    isMobileViewport: () => isMobileViewport(),
    mobileChatOpen: () => mobileChatOpen,
    isTypingInInput: () => isTypingInInput(),
    resetJoystick: () => resetJoystick(),
    npcById, addChat, addLog, t,
    ensureAmbientSpeech: () => ensureAmbientSpeech(),
    chatInputEl: () => chatInputEl,
    autoWalkBtn: () => autoWalkBtn,
    mobileAutoWalkBtn: () => mobileAutoWalkBtn,
  });

  async function llmReplyOrEmpty(npc, prompt, overrides = {}) {
    if (!LLM_API_URL) return "";
    if (debugMode) {
      console.log(`%c[LLM DEBUG] llmReplyOrEmpty → ${npc.name}: ${prompt.slice(0, 80)}...`, 'color:#ff9800');
    }
    try {
      const llm = await requestLlmNpcReply(npc, prompt, overrides);
      lastLlmModel = llm.model || "gemini";
      llmAvailable = true;
      lastLlmError = "";
      return String(llm.reply || "").trim();
    } catch (err) {
      llmAvailable = false;
      lastLlmModel = "local";
      lastLlmError = err && err.message ? String(err.message) : "unknown";
      if (debugMode) console.warn(`[LLM DEBUG] llmReplyOrEmpty failed:`, err.message);
      return "";
    }
  }

  function nearestNpc(maxDist) {
    const items = npcs
      .filter((npc) => (npc.currentScene || "outdoor") === sceneState.current)
      .map((npc) => ({ npc, d: dist(player, npc) }))
      .filter((item) => item.d <= maxDist)
      .sort((a, b) => a.d - b.d);
    return items.length ? items[0] : null;
  }

  function npcById(id) {
    if (!id) return null;
    return npcs.find((n) => n.id === id) || null;
  }

  function chatTargetNpc() {
    const pinned = npcById(convoMgr.focusNpcId);
    if (pinned) {
      const pd = dist(player, pinned);
      if (pd <= CHAT_NEARBY_DISTANCE) return { npc: pinned, focused: true, near: true };
      if (pd <= CHAT_NEARBY_DISTANCE * GAME.PIN_NPC_RANGE_MULT) return { npc: pinned, focused: true, near: false };
      convoMgr.clearFocusIf(pinned.id);
    }

    const focused = npcById(focusedNpcId);
    if (focused) {
      const d = dist(player, focused);
      if (d <= CHAT_NEARBY_DISTANCE) return { npc: focused, focused: true, near: true };
      return { npc: focused, focused: true, near: false };
    }
    const near = nearestNpc(CHAT_NEARBY_DISTANCE);
    if (near) return { npc: near.npc, focused: false, near: true };
    return null;
  }

  function moveNearNpcTarget(npc) {
    const dx = player.x - npc.x;
    const dy = player.y - npc.y;
    const d = Math.hypot(dx, dy) || 1;
    const gap = 1.2;
    let tx = npc.x + (dx / d) * gap;
    let ty = npc.y + (dy / d) * gap;

    if (!canStand(tx, ty)) {
      const tries = [
        [npc.x + gap, npc.y],
        [npc.x - gap, npc.y],
        [npc.x, npc.y + gap],
        [npc.x, npc.y - gap],
        [npc.x + gap * 0.7, npc.y + gap * 0.7],
        [npc.x - gap * 0.7, npc.y - gap * 0.7],
      ];
      let found = false;
      for (const [x, y] of tries) {
        if (canStand(x, y)) {
          tx = x;
          ty = y;
          found = true;
          break;
        }
      }
      if (!found) return false;
    }

    player.moveTarget = {
      x: clamp(tx, 1, world.width - 1),
      y: clamp(ty, 1, world.height - 1),
      npcId: npc.id,
    };
    return true;
  }

  function nearestHotspot(maxDist) {
    if (sceneState.current !== "outdoor") {
      const interior = interiorDefs && interiorDefs[sceneState.current];
      if (interior && interior.exitPoint) {
        const exitHs = { id: "interiorExit", x: interior.exitPoint.x, y: interior.exitPoint.y, label: t("hs_exit") };
        const d = dist(player, exitHs);
        return d <= maxDist ? exitHs : null;
      }
      return null;
    }
    const items = hotspots
      .map((h) => ({ h, d: dist(player, h) }))
      .filter((item) => item.d <= maxDist)
      .sort((a, b) => a.d - b.d);
    return items.length ? items[0].h : null;
  }

  function targetFor(npc) {
    const h = hourOfDay();
    const n = npc.needs;
    // 욕구 우선순위: 가장 급한 것부터
    if (n.energy < 20) return npc.home;              // 피곤 → 집에서 쉬기
    if (n.hunger > 70) {                              // 배고픔 → 음식점
      const eatPlaces = [places.cafe, places.bakery];
      return eatPlaces[npc.id.charCodeAt(0) % eatPlaces.length];
    }
    if (n.duty > 70) return npc.work;                 // 할 일 쌓임 → 출근
    if (n.fun < 20) {                                 // 심심함 → 놀이/산책
      const funPlaces = [places.park, npc.hobby, places.florist];
      return funPlaces[npc.id.charCodeAt(0) % funPlaces.length];
    }
    if (n.social < 30) return places.plaza;           // 외로움 → 광장에서 사교
    // 기본 시간 기반 스케줄 (욕구가 다 적당할 때)
    if (h < 7) return npc.home;
    if (h < 17) return npc.work;
    if (h < 21) return npc.hobby;
    return npc.home;
  }

  // Returns building ID if NPC should be inside a building right now, null otherwise
  function npcDesiredBuilding(npc) {
    if (!interiorDefs) return null;
    const mapping = npcBuildingMap[npc.id];
    if (!mapping) return null;
    const h = hourOfDay();
    // Sleep at home (22:00 - 07:00)
    if ((h >= 22 || h < 7) && mapping.home && interiorDefs[mapping.home]) {
      return mapping.home;
    }
    // Work (08:00 - 16:00)
    if (h >= 8 && h < 16 && mapping.work && interiorDefs[mapping.work]) {
      return mapping.work;
    }
    return null;
  }

  function npcEnterBuilding(npc, buildingId) {
    const interior = interiorDefs && interiorDefs[buildingId];
    if (!interior) return;
    npc.currentScene = buildingId;
    // npcSpots 중 비어있는 자리에 배치 (겹침 방지)
    if (interior.npcSpots && interior.npcSpots.length) {
      const occupiedPositions = npcs
        .filter(n => n.id !== npc.id && n.currentScene === buildingId)
        .map(n => `${Math.round(n.x)},${Math.round(n.y)}`);
      const freeSpot = interior.npcSpots.find(s =>
        !occupiedPositions.includes(`${Math.round(s.x)},${Math.round(s.y)}`)
      );
      const spot = freeSpot || interior.npcSpots[Math.floor(Math.random() * interior.npcSpots.length)];
      npc.x = spot.x;
      npc.y = spot.y;
    } else {
      npc.x = interior.spawnPoint.x;
      npc.y = interior.spawnPoint.y;
    }
    npc.roamTarget = null;
    npc.roamWait = 1 + Math.random() * 2;
  }

  function npcExitBuilding(npc) {
    if ((npc.currentScene || "outdoor") === "outdoor") return;
    const buildingId = npc.currentScene;
    npc.currentScene = "outdoor";
    // Place NPC at the building's door (outdoor coordinates)
    const doorHs = hotspots.find(hs => doorToBuildingMap[hs.id] === buildingId);
    if (doorHs) {
      npc.x = doorHs.x;
      npc.y = doorHs.y;
    } else {
      npc.x = npc.home.x;
      npc.y = npc.home.y;
    }
    npc.roamTarget = null;
    npc.roamWait = 0.5 + Math.random();
  }

  function randomPointNear(base, radius) {
    for (let i = 0; i < 14; i += 1) {
      const ang = Math.random() * Math.PI * 2;
      const rr = radius * (0.25 + Math.random() * 0.75);
      const x = clamp(base.x + Math.cos(ang) * rr, 1, world.width - 1);
      const y = clamp(base.y + Math.sin(ang) * rr, 1, world.height - 1);
      if (canStand(x, y)) return { x, y };
    }
    return { x: clamp(base.x, 1, world.width - 1), y: clamp(base.y, 1, world.height - 1) };
  }

  function pickNpcRoamTarget(npc) {
    // ─── Indoor NPC roaming ───
    const npcScene = npc.currentScene || "outdoor";
    if (npcScene !== "outdoor") {
      const interior = interiorDefs && interiorDefs[npcScene];
      if (interior) {
        // Check if NPC should leave the building
        const desired = npcDesiredBuilding(npc);
        if (desired !== npcScene) {
          // Time to leave - head to exit point
          if (interior.exitPoint) {
            const d = dist(npc, interior.exitPoint);
            if (d < 0.5) {
              npcExitBuilding(npc);
              return;
            }
            npc.roamTarget = { x: interior.exitPoint.x, y: interior.exitPoint.y };
          } else {
            npcExitBuilding(npc);
          }
          return;
        }
        // Roam to npcSpots or random indoor point
        if (interior.npcSpots && interior.npcSpots.length > 0) {
          const spot = interior.npcSpots[Math.floor(Math.random() * interior.npcSpots.length)];
          npc.roamTarget = { x: spot.x, y: spot.y };
        } else {
          const rx = 1 + Math.random() * (interior.width - 2);
          const ry = 1 + Math.random() * (interior.height - 2);
          npc.roamTarget = { x: rx, y: ry };
        }
        return;
      }
    }

    // ─── Outdoor: check if NPC should enter a building ───
    if (npcScene === "outdoor" && interiorDefs) {
      const desired = npcDesiredBuilding(npc);
      if (desired && interiorDefs[desired]) {
        // Find the door hotspot for this building
        const doorId = Object.entries(doorToBuildingMap).find(([, bid]) => bid === desired);
        if (doorId) {
          const doorHs = hotspots.find(hs => hs.id === doorId[0]);
          if (doorHs) {
            const d = dist(npc, doorHs);
            if (d < 0.8) {
              npcEnterBuilding(npc, desired);
              return;
            }
            npc.roamTarget = { x: doorHs.x, y: doorHs.y };
            return;
          }
        }
      }
    }

    // 도슨트 NPC: 환영 접근 중이면 플레이어에게, 아니면 안내소 고정
    const persona = npcPersonas[npc.id];
    if (persona && persona.isDocent) {
      if (ensureGuideGreeting().phase === 1) {
        npc.roamTarget = { x: player.x, y: player.y };
      } else {
        npc.roamTarget = randomPointNear(places.infoCenter, 1.5);
      }
      return;
    }

    const placesList = [places.plaza, places.cafe, places.office, places.park, places.market, places.bakery, places.florist, places.library, places.ksa_main];
    const nowHour = hourOfDay() + minuteOfDay() / 60;
    const anchor = targetFor(npc);

    // NPCs seek shelter during storms and heavy rain
    if (weather.current === "storm" || (weather.current === "rain" && weather.intensity > 0.6)) {
      const shelters = [places.cafe, places.office, places.market];
      const shelter = shelters[Math.floor(Math.random() * shelters.length)];
      npc.roamTarget = randomPointNear(shelter, 2);
      return;
    }

    let base = anchor;
    if (nowHour >= npc.nextLongTripAt) {
      base = placesList[Math.floor(Math.random() * placesList.length)];
      npc.nextLongTripAt = nowHour + 4 + Math.random() * 8;
    }

    npc.roamTarget = randomPointNear(base, npc.roamRadius);
  }

  // ─── Quest System (모듈: systems/quest.js) ───
  function questCtx() {
    return {
      quest, questHistory, get questCount() { return questCount; }, set questCount(v) { questCount = v; },
      npcs, inventory, relations, player,
      addChat, addLog, t, addNpcMemory, npcById, getNpcRelation,
      adjustNpcRelation, adjustRelation, llmReplyOrEmpty,
      LLM_API_URL, hourOfDay,
    };
  }
  function handleQuestNpcTalk(npc) { return _handleQuestNpcTalk(npc, questCtx()); }
  function handleDynamicQuestProgress(npc) { return _handleDynamicQuestProgress(npc, questCtx()); }
  function advanceDynamicQuest() { _advanceDynamicQuest(questCtx()); }
  function generateDynamicQuest() { _generateDynamicQuest(questCtx()); }
  let questBoardMenuActive = false;
  function showQuestBoardMenu() { _showQuestBoardMenu(questCtx()); questBoardMenuActive = true; }
  function handleQuestBoardChoice(choice) { questBoardMenuActive = false; return _handleQuestBoardChoice(choice, questCtx()); }

  // ─── 도슨트 안내소 시스템 ───
  let docentMenuActive = false;

  function showDocentMenu() {
    const guideNpc = npcs.find(n => n.id === "guide");
    const guideName = guideNpc ? guideNpc.name : t("docent_fallback_name");
    addChat(guideName, t("docent_welcome"));
    addChat("System", t("docent_menu_title"));
    addChat("System", t("docent_menu_prompt"));
    addChat("System", t("docent_menu_1"));
    addChat("System", t("docent_menu_2"));
    addChat("System", t("docent_menu_3"));
    addChat("System", t("docent_menu_4"));
    docentMenuActive = true;
  }

  function handleDocentChoice(choice) {
    const guideNpc = npcs.find(n => n.id === "guide");
    const name = guideNpc ? guideNpc.name : t("docent_fallback_name");
    docentMenuActive = false;

    if (choice === "1") {
      addChat(name, t("docent_intro_1"));
      addChat(name, t("docent_intro_2"));
      addChat(name, t("docent_intro_3"));
      return true;
    }
    if (choice === "2") {
      addChat(name, t("docent_activities_title"));
      addChat(name, t("docent_act_move"));
      addChat(name, t("docent_act_chat"));
      addChat(name, t("docent_act_quest"));
      addChat(name, t("docent_act_gift"));
      addChat(name, t("docent_act_tag"));
      addChat(name, t("docent_act_discover"));
      return true;
    }
    if (choice === "3") {
      addChat(name, t("docent_npc_title"));
      for (const npc of npcs) {
        if (npc.id === "guide") continue;
        const persona = npcPersonas[npc.id];
        const desc = persona ? persona.personality : t("docent_npc_unknown");
        const levelName = t(favorLevelNames[npc.favorLevel]) || t("relation_stranger");
        addChat(name, `• ${npc.name} — ${desc} (${levelName})`);
      }
      return true;
    }
    if (choice === "4") {
      addChat(name, t("docent_places_title"));
      addChat(name, t("docent_place_cafe"));
      addChat(name, t("docent_place_office"));
      addChat(name, t("docent_place_market"));
      addChat(name, t("docent_place_park"));
      addChat(name, t("docent_place_ksa"));
      addChat(name, t("docent_place_facilities"));
      addChat(name, t("docent_place_playground"));
      addChat(name, t("docent_place_info"));
      return true;
    }
    return false;
  }
  //    All moved to systems/quest.js (~580 lines)

  function handleHotspotInteraction() {
    const hs = nearestHotspot(1.3);
    if (!hs) return false;

    // Interior exit
    if (hs.id === "interiorExit") {
      sceneMgr.startFade(() => sceneMgr.exit());
      return true;
    }

    // Door hotspots → enter building
    const buildingId = doorToBuildingMap[hs.id];
    if (buildingId) {
      if (interiorDefs && interiorDefs[buildingId]) {
        sceneMgr.startFade(() => sceneMgr.enter(buildingId));
      } else {
        const bld = buildings.find(b => b.id === buildingId);
        addLog(t("log_checked_building", { label: t(bld?.label || buildingId) }));
      }
      return true;
    }

    if (hs.id === "exitGate") {
      addLog(t("log_leaving_playground"));
      setTimeout(() => {
        window.location.href = "/";
      }, 120);
      return true;
    }

    if (hs.id === "parkMonument") {
      addLog(t("log_monument"));
      return true;
    }

    if (hs.id === "marketBoard") {
      addLog(t("log_market_board"));
      return true;
    }

    if (hs.id === "infoCenter") {
      // 도슨트가 근처에 있으면 대화 시작, 없으면 로그만
      const guideNpc = npcs.find(n => n.id === "guide");
      if (guideNpc && dist(guideNpc, player) < CHAT_NEARBY_DISTANCE * 2) {
        convoMgr.startConversation(guideNpc.id, 18_000, "user");
        if (isMobileViewport()) { mobileChatOpen = true; mobileUtilityOpen = false; }
        else if (!panelState.chat) { panelState.chat = true; }
        applyPanelState();
      } else {
        addLog(t("log_checked_building", { label: t("bld_info_center") }));
      }
      return true;
    }

    if (hs.id === "questBoard") {
      showQuestBoardMenu();
      return true;
    }

    if (hs.id === "minigameZone") {
      if (sceneState.current !== "outdoor") {
        addLog(t("log_tag_indoor"));
        return true;
      }
      if (tagGame.active) {
        addLog(t("sys_tag_active"));
        return true;
      }
      // 근처 NPC 중 랜덤 하나를 상대로 선택 (도슨트 제외)
      const candidates = npcs.filter(n => Math.hypot(n.x - player.x, n.y - player.y) < GAME.TAG_CANDIDATE_RANGE && !(npcPersonas[n.id] && npcPersonas[n.id].isDocent));
      if (candidates.length === 0) {
        addLog(t("sys_tag_no_npc"));
        return true;
      }
      const target = candidates[Math.floor(Math.random() * candidates.length)];
      addChat("System", t("sys_tag_playground", { name: target.name }));
      startTagGame(target);
      return true;
    }

    return false;
  }

  function interact() {
    if (handleHotspotInteraction()) return;
    if (pickupItem()) return;

    const near = nearestNpc(CHAT_NEARBY_DISTANCE);
    if (near) {
      convoMgr.startConversation(near.npc.id, 18_000, "user");
      if (isMobileViewport()) {
        mobileChatOpen = true;
        mobileUtilityOpen = false;
      } else if (!panelState.chat) {
        panelState.chat = true;
      }
      applyPanelState();

      // 자고 있는 NPC 깨우기
      if (near.npc.pose === "lying") {
        near.npc.pose = "standing";
        near.npc.roamWait = 0;
        addChat("System", t("sys_wake_npc", { name: near.npc.name }));
        upsertSpeechBubble(near.npc.id, t("sys_wake_bubble"), 3000);
        near.npc.mood = "sad";
        near.npc.moodUntil = nowMs() + 15_000;
        return;
      }

      if (near.npc.talkCooldown <= 0) {
        near.npc.talkCooldown = GAME.TALK_COOLDOWN_SEC;
        // 도슨트도 일반 NPC와 동일하게 LLM 대화 (메뉴 대신 자연스러운 안내)
        if (near.npc.activeRequest && checkFavorCompletion(near.npc)) {
          // favor quest handled
        } else if (!handleQuestNpcTalk(near.npc)) {
          // AI NPC: LLM으로 인사 생성
          const greetNpc = near.npc;
          (async () => {
            try {
              const reply = await llmReplyOrEmpty(greetNpc, t("llm_e_greet"));
              if (reply) {
                addChat(greetNpc.name, reply);
              } else {
                const pool = [t("fallback_shy"), t("fallback_thinking"), t("fallback_distracted")];
                addChat(greetNpc.name, pool[Math.floor(Math.random() * pool.length)]);
              }
            } catch {
              const pool = [t("fallback_shy"), t("fallback_thinking"), t("fallback_distracted")];
              addChat(greetNpc.name, pool[Math.floor(Math.random() * pool.length)]);
            }
          })();
          if (greetNpc.id === "heo") adjustRelation("playerToHeo", 1);
          if (greetNpc.id === "kim") adjustRelation("playerToKim", 1);
        }
      } else {
        addChat("System", t("sys_npc_busy", { name: near.npc.name }));
      }
      if (chatInputEl) chatInputEl.focus();
      return;
    }

    addChat("System", t("sys_no_npc_nearby"));
  }

  // inferSentimentFromReply — imported from ./systems/conversation.js

  function relationKeyForNpc(npcId) {
    // Direct lookup first (new format)
    const directKey = `playerTo_${npcId}`;
    if (relations[directKey] !== undefined) return directKey;
    // Legacy format lookup (playerToHeo, playerToKim, etc.)
    const legacyKey = Object.keys(relations).find(k => k.toLowerCase() === `playerto${npcId.toLowerCase()}`);
    if (legacyKey) return legacyKey;
    // Auto-create for new/shared/custom NPCs
    relations[directKey] = 50;
    return directKey;
  }

  function convoCtx() {
    return {
      adjustRelation, relationKeyForNpc, addNpcMemory, t,
      LLM_API_URL, LLM_STREAM_API_URL, debugMode, currentLang, resolvePersona,
      nearestNpc, CHAT_NEARBY_DISTANCE, getNpcChats, formatTime,
      quest, relations, getNpcMemorySummary, getMemoryBasedTone,
      getNpcSocialContext, buildApiHeaders, npcs, player,
    };
  }

  function applyConversationEffect(npc, playerMsg, npcReplyText, emotion) {
    return _applyConversationEffect(npc, playerMsg, npcReplyText, emotion, convoCtx());
  }

  function resolvePersona(npc) {
    const raw = npcPersonas[npc.id] || {
      age: "npc_age_20s", gender: "npc_gender_male",
      personality: npc.personality || inferPersonalityFromName(npc.name, t),
    };
    return { ...raw,
      age: t(raw.age) !== raw.age ? t(raw.age) : raw.age,
      gender: t(raw.gender) !== raw.gender ? t(raw.gender) : raw.gender,
      personality: t(raw.personality) !== raw.personality ? t(raw.personality) : raw.personality,
      quirk: raw.quirk ? t(raw.quirk) : "",
      backstory: raw.backstory ? t(raw.backstory) : "",
    };
  }

  async function requestLlmNpcReply(npc, userMessage, overrides = {}) {
    return _requestLlmNpcReply(npc, userMessage, convoCtx(), overrides);
  }

  async function requestLlmNpcReplyStream(npc, userMessage, onChunk, overrides = {}) {
    return _requestLlmNpcReplyStream(npc, userMessage, onChunk, convoCtx(), overrides);
  }

  // 키워드 기반 액션 감지 (스트리밍 폴백)
  function detectActionFromReply(npc, replyText) {
    return _detectActionFromReply(npc, replyText, convoCtx());
  }

  async function sendChatMessage(msg) {
    audioManager.playSfx('/assets/audio/sfx-chat.mp3');
    // 퀘스트 게시판 메뉴 처리
    if (questBoardMenuActive && /^[1-3]$/.test(msg.trim())) {
      addChat("You", msg.trim());
      if (!handleQuestBoardChoice(msg.trim())) {
        addChat("System", t("sys_select_1_to_3"));
      }
      return;
    }
    if (/^(선물|gift|줘|give)$/i.test(msg.trim())) {
      const target = chatTargetNpc();
      if (target && target.near) {
        addChat("You", msg);
        giftItemToNpc(target.npc);
      } else {
        addChat("You", msg);
        addChat("System", t("sys_no_gift_target"));
      }
      return;
    }
    if (/^(술래잡기|tag)$/i.test(msg.trim())) {
      const zoneHs = hotspots.find(h => h.id === "minigameZone");
      const nearZone = zoneHs && Math.hypot(player.x - zoneHs.x, player.y - zoneHs.y) < 5;
      if (!nearZone) {
        addChat("System", t("sys_tag_zone_only"));
        return;
      }
      if (tagGame.active) {
        addChat("System", t("sys_tag_active"));
      } else {
        const candidates = npcs.filter(n => Math.hypot(n.x - player.x, n.y - player.y) < GAME.TAG_CANDIDATE_RANGE);
        if (!candidates.length) {
          addChat("System", t("sys_tag_no_npc"));
        } else {
          const target = candidates[Math.floor(Math.random() * candidates.length)];
          addChat("You", t("sys_tag_chat_you"));
          addChat(target.name, t("sys_tag_chat_npc"));
          convoMgr.endConversation();
          if (isMobileViewport()) mobileChatOpen = false;
          startTagGame(target);
        }
      }
      return;
    }
    if (/^(인벤|인벤토리|inventory|가방)$/i.test(msg.trim())) {
      addChat("System", t("sys_inventory", { summary: inventorySummary() }));
      return;
    }
    const removeMatch = msg.trim().match(/^(제거|삭제|remove)\s+(.+)$/i);
    if (removeMatch) {
      const result = removeNpc(removeMatch[2].trim());
      if (result.ok) {
        addChat("System", t("sys_npc_removed", { name: result.name }));
        addLog(t("log_npc_removed", { name: result.name }));
      } else {
        addChat("System", result.reason);
      }
      return;
    }

    const target = chatTargetNpc();
    const npcNear = target && target.near;
    if (!npcNear && mp && mp.enabled) {
      mpSendMessage(msg);
      const displayName = (player.flag ? player.flag + " " : "") + player.name;
      addChat(displayName, msg, "local-player");
      return;
    }
    if (!target) {
      addChat("You", msg);
      addChat("System", t("sys_no_npc_nearby"));
      return;
    }

    const npc = target.npc;
    convoMgr.startConversation(npc.id, 90_000, "chat");
    addNpcChat(npc.id, "You", msg);
    upsertSpeechBubble("player", msg, 3000);
    if (!target.near) {
      moveNearNpcTarget(target.npc);
      addSystemToast(t("toast_moving_to_npc", { name: target.npc.name }));
      return;
    }

    convoMgr.refreshSession(npc.id, 90000);
    if (chatSendEl) chatSendEl.disabled = true;
    if (chatInputEl) chatInputEl.disabled = true;
    let reply = "";
    let serverSuggestions = [];
    let serverEmotion = "neutral";
    let serverFarewell = false;
    let serverAction = { type: "none", target: "" };
    let serverMention = { npc: null, place: null };

    // 응답 대기 중 . . . 표시
    upsertSpeechBubble(npc.id, ". . .", GAME.LLM_TIMEOUT_MS);
    addNpcChat(npc.id, npc.name, ". . .");
    const waitingChatIdx = getNpcChats(npc.id).findIndex(c => c.text === ". . .");

    try {
      const llm = await requestLlmNpcReply(npc, msg);
      reply = llm.reply;
      if (llm.suggestions && llm.suggestions.length) serverSuggestions = llm.suggestions;
      serverEmotion = llm.emotion || "neutral";
      serverFarewell = !!llm.farewell;
      serverAction = llm.action || { type: "none", target: "" };
      serverMention = llm.mention || { npc: null, place: null };
      lastLlmModel = llm.model || "gemini";
      if (!llmAvailable) addLog(t("log_llm_restored"));
      llmAvailable = true;
      lastLlmError = "";
    } catch (err) {
      if (llmAvailable) addLog(t("log_llm_fallback"));
      llmAvailable = false;
      lastLlmModel = "local";
      lastLlmError = err && err.message ? String(err.message) : "unknown";
      // 성격 기반 폴백: 단순한 에러 메시지 대신 NPC다운 반응
      const persona = npcPersonas[npc.id];
      const isDocent = persona && persona.isDocent;
      if (isDocent) {
        reply = t("fallback_docent");
      } else {
        const pool = [t("fallback_shy"), t("fallback_thinking"), t("fallback_distracted")];
        reply = pool[Math.floor(Math.random() * pool.length)];
      }
    } finally {
      if (chatSendEl) chatSendEl.disabled = false;
      if (chatInputEl) chatInputEl.disabled = false;
      if (chatInputEl) chatInputEl.focus();
    }
    convoMgr.refreshSession(npc.id, 90000);

    let cleanReply = reply;

    // ── 태그 파싱 (reply 텍스트에서 태그 제거 + serverAction 보강) ──
    // 스트리밍/비스트리밍 모두 태그가 있을 수 있으므로 항상 파싱
    const favorTagMatch = cleanReply.match(/\[부탁:(\w+):(\w+)\]/);
    if (favorTagMatch) {
      cleanReply = cleanReply.replace(/\s*\[부탁:\w+:\w+\]\s*/, "").trim();
      const reqType = favorTagMatch[1];
      const reqTarget = favorTagMatch[2];
      if (!npc.activeRequest) {
        if (reqType === "bring_item" && itemTypes[reqTarget]) {
          npc.activeRequest = {
            type: "bring_item",
            title: t("favor_request_title", { name: npc.name }),
            description: t("favor_request_bring", { label: t(itemTypes[reqTarget].label) }),
            itemNeeded: reqTarget,
            expiresAt: nowMs() + 300_000,
            reward: { favorPoints: 20, relationBoost: 8, items: [] },
          };
        } else if (reqType === "deliver") {
          const targetNpc = npcs.find(n => n.id === reqTarget);
          if (targetNpc) {
            npc.activeRequest = {
              type: "deliver_to",
              title: t("favor_deliver_title", { name: targetNpc.name }),
              description: t("favor_deliver_desc", { name: targetNpc.name }),
              targetNpcId: targetNpc.id,
              expiresAt: nowMs() + 300_000,
              reward: { favorPoints: 25, relationBoost: 10, items: [] },
            };
          }
        }
      }
    }
    // [동행] / [동행해제] 태그 → serverAction 보강
    if (/\[동행\]/.test(cleanReply)) {
      cleanReply = cleanReply.replace(/\s*\[동행\]\s*/, "").trim();
      if (serverAction.type === "none") serverAction = { type: "follow", target: "" };
    }
    if (/\[동행해제\]/.test(cleanReply)) {
      cleanReply = cleanReply.replace(/\s*\[동행해제\]\s*/, "").trim();
      if (serverAction.type === "none") serverAction = { type: "unfollow", target: "" };
    }
    // [안내:npc:id] / [안내:장소] 태그 → serverAction 보강
    const guideNpcMatch = cleanReply.match(/\[안내:npc:(\w+)\]/);
    const guidePlaceMatch = cleanReply.match(/\[안내:(\w+)\]/);
    if (guideNpcMatch) {
      cleanReply = cleanReply.replace(/\s*\[안내:npc:\w+\]\s*/, "").trim();
      if (serverAction.type === "none") serverAction = { type: "guide_npc", target: guideNpcMatch[1] };
    } else if (guidePlaceMatch && !guideNpcMatch) {
      cleanReply = cleanReply.replace(/\s*\[안내:\w+\]\s*/, "").trim();
      if (serverAction.type === "none") serverAction = { type: "guide_place", target: guidePlaceMatch[1] };
    }

    // ── 키워드 기반 폴백: 서버 액션도 태그도 없으면 reply 텍스트에서 감지 ──
    if (serverAction.type === "none") {
      serverAction = detectActionFromReply(npc, cleanReply);
    }

    // ── 통합 액션 실행 (스트리밍/비스트리밍 모두 동일 경로) ──
    {
      const act = serverAction;
      if (act.type === "follow") {
        npc.following = true;
        npc.roamTarget = null;
        addLog(t("sys_companion_start", { name: npc.name }));
      } else if (act.type === "unfollow") {
        npc.following = false;
        addLog(t("sys_companion_end", { name: npc.name }));
      } else if (act.type === "guide_place") {
        npc.following = false;
        npc.guideTargetNpcId = null;
        const dest = places[act.target];
        if (dest) {
          npc.roamTarget = { x: dest.x, y: dest.y };
          npc.roamWait = 0;
          player.moveTarget = { x: dest.x, y: dest.y + 1 };
          addLog(t("log_guide_to_place", { npc: npc.name, place: act.target }));
        }
      } else if (act.type === "guide_npc") {
        npc.following = false;
        const targetNpc = npcs.find(n => n.id === act.target);
        if (targetNpc) {
          npc.guideTargetNpcId = targetNpc.id;
          npc.roamWait = 0;
          addLog(t("log_guide_to_npc", { npc: npc.name, target: targetNpc.name }));
        }
      } else if (act.type === "go_place") {
        const dest = places[act.target];
        if (dest) {
          npc.roamTarget = { x: dest.x, y: dest.y };
          npc.roamWait = 0;
        }
      } else if (act.type === "request_item" && !npc.activeRequest) {
        const info = itemTypes[act.target];
        if (info) {
          npc.activeRequest = {
            type: "bring_item",
            title: t("favor_request_title", { name: npc.name }),
            description: t("favor_request_bring", { label: t(info.label) }),
            itemNeeded: act.target,
            expiresAt: nowMs() + 300_000,
            reward: { favorPoints: 20, relationBoost: 8, items: [] },
          };
        }
      } else if (act.type === "request_deliver" && !npc.activeRequest) {
        const targetNpc = npcs.find(n => n.id === act.target);
        if (targetNpc) {
          npc.activeRequest = {
            type: "deliver_to",
            title: t("favor_deliver_title", { name: targetNpc.name }),
            description: t("favor_deliver_desc", { name: targetNpc.name }),
            targetNpcId: targetNpc.id,
            expiresAt: nowMs() + 300_000,
            reward: { favorPoints: 25, relationBoost: 10, items: [] },
          };
        }
      } else if (act.type === "give_item") {
        if (act.target && itemTypes[act.target]) {
          inventory[act.target] = (inventory[act.target] || 0) + 1;
          addChat("System", t("sys_received_item", { npc: npc.name, label: t(itemTypes[act.target].label) }));
        }
      }
    }

    // 선택지: structured output > 태그 파싱 > 키워드 폴백
    let llmSuggestions = serverSuggestions.length ? serverSuggestions : null;

    // ". . ." 대기 채팅을 실제 응답으로 교체
    if (cleanReply) {
      const history = getNpcChats(npc.id);
      const waitIdx = history.findIndex(c => c.text === ". . .");
      if (waitIdx >= 0) {
        history[waitIdx].text = cleanReply;
        history[waitIdx].speaker = npc.name;
        renderCurrentChat();
      } else {
        addNpcChat(npc.id, npc.name, cleanReply);
      }
      upsertSpeechBubble(npc.id, cleanReply, 4000);
    }
    // 대화 후 추천 선택지 갱신 (structured output > 태그 > 키워드 폴백)
    if (cleanReply) renderSuggestions(npc, cleanReply, llmSuggestions);

    if (cleanReply) {
      applyConversationEffect(npc, msg, cleanReply, serverEmotion);
      const shortMsg = msg.length > 30 ? msg.slice(0, 30) + "…" : msg;
      const shortReply = cleanReply.length > 40 ? cleanReply.slice(0, 40) + "…" : cleanReply;
      addNpcMemory(npc, "chat", t("mem_chat_summary", { playerMsg: shortMsg, npcReply: shortReply }));
      const mem = ensureMemoryFormat(npc);
      mem.conversationCount += 1;
      mem.lastConversation = world.totalMinutes;

      // 대화 종료 감지: structured farewell 또는 텍스트 패턴
      const farewellPattern = /(안녕|잘\s?가|다음에|나중에|바이|bye|또\s?봐|가\s?볼게|이만|할\s?일|다시\s?보자|그럼\s?이만|갈게)/i;
      if (serverFarewell || farewellPattern.test(cleanReply)) {
        if (npc.following) npc.following = false;
        syncMemoryToServer(); // 대화 종료 시 기억 서버 동기화
        setTimeout(() => {
          convoMgr.clearFocusIf(npc.id);
        }, 2500);
      }
    }
  }

  // 대화 추천 선택지 (맥락에 따라 동적 변경)
  function renderSuggestions(npc, lastReply, llmSuggestions) {
    if (!chatSuggestionsEl) return;
    chatSuggestionsEl.dataset.npcId = npc.id;
    const persona = npcPersonas[npc.id];
    const isDocent = persona && persona.isDocent;
    const friendly = npc.favorLevel >= 2;
    let suggestions;

    if (llmSuggestions && llmSuggestions.length >= 2) {
      // LLM이 생성한 선택지 우선 사용
      suggestions = llmSuggestions.slice(0, 3);
    } else if (lastReply) {
      // 폴백: NPC 응답에서 주제 감지 → 맞춤 선택지
      const r = lastReply;
      // NPC 이름 언급 감지
      const mentionedNpc = npcs.find(n => n.id !== npc.id && r.includes(n.name));
      // 장소 언급 감지
      const mentionedPlace = /(카페|빵집|시장|공원|광장|도서관|꽃집|사무실|학교|기숙사|cafe|park|market|library|office)/.test(r);

      if (mentionedNpc) {
        suggestions = [t("suggest_where_npc", { name: mentionedNpc.name }), t("suggest_take_me", { name: mentionedNpc.name }), t("suggest_bye")];
      } else if (mentionedPlace) {
        suggestions = [t("suggest_place_1"), t("suggest_place_2"), t("suggest_bye")];
      } else if (/(먹|음식|빵|커피|카페|배고|맛|요리|크로아상|food|eat|cafe|hungry|cook|bread)/.test(r)) {
        suggestions = [t("suggest_food_1"), t("suggest_food_2"), t("suggest_bye")];
      } else if (/(힘들|슬프|걱정|미안|괜찮|외로|피곤|아프|worried|tired|sorry|sad|lonely)/.test(r)) {
        suggestions = [t("suggest_care_1"), t("suggest_care_2"), t("suggest_bye")];
      } else if (/(재미|놀|게임|술래|fun|play|game)/.test(r)) {
        suggestions = [t("suggest_more"), t("suggest_play"), t("suggest_bye")];
      } else if (/(비밀|전설|옛날|역사|이야기|secret|legend|story|history)/.test(r)) {
        suggestions = [t("suggest_more"), t("suggest_really"), t("suggest_bye")];
      } else if (/(날씨|비|눈|해|바람|weather|rain|snow|sun)/.test(r)) {
        suggestions = [t("suggest_walk"), t("suggest_more"), t("suggest_bye")];
      } else if (r.endsWith("?") || /(뭐|어떻|왜|what|how|why)/.test(r)) {
        // NPC asked a question
        suggestions = [t("suggest_yes"), t("suggest_no"), t("suggest_more")];
      } else {
        suggestions = [t("suggest_more"), t("suggest_thanks"), t("suggest_bye")];
      }
    } else {
      // 첫 대화 — 관계/역할 기반
      if (isDocent) {
        suggestions = [t("suggest_docent_1"), t("suggest_docent_2"), t("suggest_docent_3")];
      } else if (friendly) {
        suggestions = [t("suggest_friend_1"), t("suggest_friend_2"), t("suggest_friend_3")];
      } else {
        suggestions = [t("suggest_stranger_1"), t("suggest_stranger_2"), t("suggest_stranger_3")];
      }
    }

    chatSuggestionsEl.innerHTML = suggestions.map(s =>
      `<button type="button">${s}</button>`
    ).join("");
    chatSuggestionsEl.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => {
        if (chatInputEl) chatInputEl.value = btn.textContent;
        sendCardChat();
        chatSuggestionsEl.innerHTML = "";
      });
    });
  }

  async function sendCardChat() {
    if (!chatInputEl) return;
    const msg = chatInputEl.value.trim();
    if (!msg) return;
    chatInputEl.value = "";
    await sendChatMessage(msg);
  }

  function updateAmbientEvents() {
    const day = currentDay();
    if (worldEvents.day !== day) {
      worldEvents.day = day;
      worldEvents.once = {};
      addLog(t("log_new_day"));
    }

    const h = hourOfDay();

    const cafeKey = dayFlag("cafe-open");
    if (h >= 9 && !worldEvents.once[cafeKey]) {
      worldEvents.once[cafeKey] = true;
      addLog(t("log_cafe_open"));
    }

    const marketKey = dayFlag("night-market");
    if (h >= 20 && !worldEvents.once[marketKey]) {
      worldEvents.once[marketKey] = true;
      addLog(t("log_night_market"));
    }

    const parkKey = dayFlag("park-aura");
    if ((h >= 20 || h < 5) && !worldEvents.once[parkKey] && dist(player, places.park) < 2.5) {
      worldEvents.once[parkKey] = true;
      addLog(t("log_park_aura"));
    }

    if (quest.dynamic && quest.dynamicStages) {
      const stage = quest.dynamicStages[quest.stage];
      if (stage && stage.visit) {
        handleDynamicQuestProgress({ id: "__visit__" });
      }
      // 제거된 NPC 대상 스테이지 자동 스킵
      if (stage && stage.npcId && !stage.visit && !stage.requireItem && !npcById(stage.npcId)) {
        addChat("System", t("sys_npc_left_skip"));
        advanceDynamicQuest();
      }
    }

    ensureNpcSocial().processGossip();
    ensureNpcSocial().updateSocialInteractions();
    checkSeasonChange();
  }

  // ─── Save/Load System (모듈: systems/save-load.js) ───
  const saveLoadSys = createSaveLoadSystem({
    world, player, npcs, relations, npcSocialGraph, quest, inventory,
    sceneState, discoveries, removedNpcIds, questHistory,
    get questCount() { return questCount; }, set questCount(v) { questCount = v; },
    getQuestCount: () => questCount,
    setQuestCount: (v) => { questCount = v; },
    npcPersonas, places, cameraPan,
    canStand, canStandInScene, refreshRemoveSelect, addLog, t,
  });
  function saveState() { saveLoadSys.save(); }
  function loadState() { saveLoadSys.load(); }

  function updateNpcs(dt) {
    const typingTarget = isChatTyping() ? chatTargetNpc() : null;
    const typingNpcId = typingTarget ? typingTarget.npc.id : null;
    const pinnedNpcId = convoMgr.focusNpcId;

    for (const npc of npcs) {
      if (npc.talkCooldown > 0) npc.talkCooldown -= dt;

      // 자율 기분 변화 (시간/날씨/성격 기반)
      if (nowMs() > npc.moodUntil && Math.random() < GAME.MOOD_CHANGE_CHANCE) {
        const persona = npcPersonas[npc.id];
        // 도슨트는 항상 밝게
        if (persona && persona.isDocent) {
          npc.mood = "happy";
          npc.moodUntil = nowMs() + 60_000;
        } else {
          const h = hourOfDay();
          const personality = persona ? persona.personality : "";
          const isSunny = weather.current === "clear";
          const isRainy = weather.current === "rain" || weather.current === "storm";
          const isMorning = h >= 7 && h < 11;
          const isEvening = h >= 18 && h < 21;
          const cheerful = /(밝|에너지|사교|친절|활발)/.test(personality);
          const melancholy = /(신중|침착|조용)/.test(personality);
          if ((isSunny && isMorning) || cheerful) {
            npc.mood = Math.random() < 0.6 ? "happy" : "neutral";
          } else if (isRainy || (isEvening && melancholy)) {
            npc.mood = Math.random() < 0.4 ? "sad" : "neutral";
          } else {
            npc.mood = "neutral";
          }
          npc.moodUntil = nowMs() + 30_000 + Math.random() * 60_000;
        }
      }

      // 욕구 변화 (dt는 초 단위, 실시간 1:1)
      if (npc.needs) {
        const n = npc.needs;
        // 시간에 따른 자연 변화
        n.hunger += dt * GAME.NEED_HUNGER_RATE;    // 배고픔 증가
        n.energy -= dt * GAME.NEED_ENERGY_RATE;    // 에너지 감소
        n.social -= dt * GAME.NEED_SOCIAL_RATE;    // 사교 감소
        n.fun -= dt * GAME.NEED_FUN_RATE;       // 즐거움 감소
        n.duty += dt * GAME.NEED_DUTY_RATE;      // 할 일 쌓임

        // 장소에 따른 욕구 해소
        const atCafe = dist(npc, places.cafe) < 2;
        const atBakery = dist(npc, places.bakery) < 2;
        const atHome = dist(npc, npc.home) < 2;
        const atWork = dist(npc, npc.work) < 2;
        const atPark = dist(npc, places.park) < 2;
        const atFlorist = places.florist && dist(npc, places.florist) < 2;
        const nearOtherNpc = npcs.some(o => o.id !== npc.id && dist(npc, o) < 3);

        if ((atCafe || atBakery) && n.hunger > 30) n.hunger = Math.max(0, n.hunger - dt * GAME.NEED_HUNGER_RECOVERY);
        if (atHome) n.energy = Math.min(100, n.energy + dt * GAME.NEED_ENERGY_RECOVERY);
        if (nearOtherNpc) n.social = Math.min(100, n.social + dt * GAME.NEED_SOCIAL_RECOVERY);
        if (atPark || atFlorist) n.fun = Math.min(100, n.fun + dt * GAME.NEED_FUN_RECOVERY);
        if (atWork) n.duty = Math.max(0, n.duty - dt * GAME.NEED_DUTY_RECOVERY);

        // 범위 제한
        n.hunger = Math.min(100, Math.max(0, n.hunger));
        n.energy = Math.min(100, Math.max(0, n.energy));
        n.social = Math.min(100, Math.max(0, n.social));
        n.fun = Math.min(100, Math.max(0, n.fun));
        n.duty = Math.min(100, Math.max(0, n.duty));
      }

      // 동행 모드: 플레이어를 따라감
      if (npc.following) {
        const fd = dist(npc, player);
        if (fd > 1.8) {
          const fdx = player.x - npc.x;
          const fdy = player.y - npc.y;
          const fdd = Math.hypot(fdx, fdy);
          const fnx = npc.x + (fdx / fdd) * npc.speed * dt;
          const fny = npc.y + (fdy / fdd) * npc.speed * dt;
          if (canStand(fnx, fny)) { npc.x = fnx; npc.y = fny; npc.state = "moving"; npc.pose = "standing"; }
        } else {
          npc.state = "idle";
        }
        continue;
      }

      // NPC 안내 모드: 대상 NPC를 추적하며 앞서 걸어감
      if (npc.guideTargetNpcId) {
        const targetNpc = npcs.find(n => n.id === npc.guideTargetNpcId);
        if (!targetNpc || dist(npc, targetNpc) < GAME.GUIDE_ARRIVE_DIST) {
          // 도착 또는 대상 없음 → 안내 종료
          npc.guideTargetNpcId = null;
          if (targetNpc) {
            upsertSpeechBubble(npc.id, t("sys_guide_arrive", { name: targetNpc.name }), 3000);
            addChat(npc.name, t("sys_guide_arrive", { name: targetNpc.name }));
          }
          npc.state = "idle";
        } else {
          // 대상 NPC를 향해 이동
          npc.roamTarget = { x: targetNpc.x, y: targetNpc.y };
          // 플레이어도 따라오게
          if (dist(player, npc) > 4) {
            player.moveTarget = { x: npc.x, y: npc.y };
          }
          const gd = dist(npc, targetNpc);
          const gdx = targetNpc.x - npc.x;
          const gdy = targetNpc.y - npc.y;
          const gdd = Math.hypot(gdx, gdy);
          const gnx = npc.x + (gdx / gdd) * npc.speed * dt;
          const gny = npc.y + (gdy / gdd) * npc.speed * dt;
          if (canStand(gnx, gny)) { npc.x = gnx; npc.y = gny; npc.state = "moving"; npc.pose = "standing"; }
        }
        continue;
      }

      // 도슨트 접근 중이면 guideGreetingSys에서 직접 이동하므로 스킵
      if (npc.id === "guide" && ensureGuideGreeting().phase === 1) continue;

      // 술래잡기 중인 NPC는 updateTagGame에서 이동 처리
      if (tagGame.active && npc.id === tagGame.targetNpcId) continue;

      if ((pinnedNpcId && npc.id === pinnedNpcId) || (typingNpcId && npc.id === typingNpcId)) {
        npc.state = "chatting";
        // 대화 중 플레이어가 멀어지면 따라감 (멀수록 빠르게)
        const chatDist = dist(npc, player);
        if (chatDist > 1.5) {
          const dx = player.x - npc.x;
          const dy = player.y - npc.y;
          const d = Math.hypot(dx, dy) || 1;
          const speedMult = chatDist > 5 ? 2.0 : chatDist > 3 ? 1.2 : 0.7;
          const spd = npc.speed * speedMult * dt;
          const nx = npc.x + (dx / d) * Math.min(spd, d);
          const ny = npc.y + (dy / d) * Math.min(spd, d);
          if (canStandInScene(nx, ny, npc.currentScene || "outdoor")) { npc.x = nx; npc.y = ny; }
        }
        npc.roamWait = Math.max(npc.roamWait, 0.35);
        continue;
      }

      if (convoMgr.isSessionActive(npc.id)) {
        npc.state = "chatting";
        // 대화 중 플레이어가 멀어지면 따라감 (멀수록 빠르게)
        const chatDist = dist(npc, player);
        if (chatDist > 1.5) {
          const dx = player.x - npc.x;
          const dy = player.y - npc.y;
          const d = Math.hypot(dx, dy) || 1;
          const speedMult = chatDist > 5 ? 2.0 : chatDist > 3 ? 1.2 : 0.7;
          const spd = npc.speed * speedMult * dt;
          const nx = npc.x + (dx / d) * Math.min(spd, d);
          const ny = npc.y + (dy / d) * Math.min(spd, d);
          if (canStandInScene(nx, ny, npc.currentScene || "outdoor")) { npc.x = nx; npc.y = ny; }
        }
        npc.roamWait = Math.max(npc.roamWait, 0.35);
        continue;
      }

      if (npc.roamWait > 0) {
        npc.roamWait -= dt;
        npc.state = "idle";
        if (npc.roamWait <= 0) pickNpcRoamTarget(npc);
        continue;
      }

      if (!npc.roamTarget || Math.random() < GAME.ROAM_REPICK_CHANCE) {
        pickNpcRoamTarget(npc);
      }

      const t = npc.roamTarget || targetFor(npc);
      const tdx = t.x - npc.x;
      const tdy = t.y - npc.y;
      const td = Math.hypot(tdx, tdy);

      if (td > 0.12) {
        const nx = npc.x + (tdx / td) * npc.speed * dt;
        const ny = npc.y + (tdy / td) * npc.speed * dt;
        const npcScene = npc.currentScene || "outdoor";
        if (canStandInScene(nx, ny, npcScene)) {
          npc.x = nx;
          npc.y = ny;
          npc.state = "moving";
          npc.pose = "standing";
          npc._stuckCount = 0;
        } else {
          npc._stuckCount = (npc._stuckCount || 0) + 1;
          if (npc._stuckCount > 30) {
            let escaped = false;
            for (let attempt = 0; attempt < 8; attempt++) {
              const escAngle = (attempt / 8) * Math.PI * 2 + Math.random() * 0.5;
              const ex = npc.x + Math.cos(escAngle) * 1.5;
              const ey = npc.y + Math.sin(escAngle) * 1.5;
              if (canStandInScene(ex, ey, npcScene)) { npc.x = ex; npc.y = ey; escaped = true; break; }
            }
            if (!escaped && npc.home) {
              npc.x = npc.home.x;
              npc.y = npc.home.y;
              npc.currentScene = "outdoor";
            }
            npc._stuckCount = 0;
          }
          npc.roamTarget = null;
          npc.state = "idle";
        }
      } else {
        npc.roamWait = 0.6 + Math.random() * 2.2;
        npc.state = "idle";
        // 자세 결정 (도슨트는 항상 서 있음)
        const isDocent = npcPersonas[npc.id] && npcPersonas[npc.id].isDocent;
        if (isDocent) { npc.pose = "standing"; }
        else {
        const h = hourOfDay();
        const atHome = dist(npc, npc.home) < 2;
        const closestBench = props
          .filter(p => ["bench", "chair", "stool", "armchair", "bean_bag", "floor_cushion"].includes(p.type) && dist(npc, p) < GAME.SEAT_CHECK_DIST)
          .sort((a, b) => dist(npc, a) - dist(npc, b))[0];
        if (closestBench && Math.random() < 0.4) {
          // 벤치에 정확히 앉기
          npc.x = closestBench.x;
          npc.y = closestBench.y;
          npc.pose = "sitting";
          npc.seatFacing = Math.atan2(25 - npc.y, 25 - npc.x);
          npc.roamWait = 8 + Math.random() * 15;  // 오래 앉아 있기
        } else if (atHome && (h >= 23 || h < 6)) {
          // 집 근처 + 늦은 밤에만 눕기
          npc.pose = "lying";
          npc.roamWait = 30 + Math.random() * 30;  // 잠자기
        } else {
          npc.pose = "standing";
        }
        } // end !isDocent
      }
    }
  }

  function touchDistance(t1, t2) {
    return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
  }

  function setJoystick(x, y) {
    const mag = Math.hypot(x, y);
    const nx = mag > 1 ? x / mag : x;
    const ny = mag > 1 ? y / mag : y;
    inputState.joyX = nx;
    inputState.joyY = ny;
    if (joystickKnob) {
      const base = joystickBase ? joystickBase.getBoundingClientRect() : null;
      const knob = joystickKnob.getBoundingClientRect();
      const center = base ? base.width * 0.5 - knob.width * 0.5 : 27;
      const radius = base ? base.width * 0.28 : 27;
      joystickKnob.style.left = `${center + nx * radius}px`;
      joystickKnob.style.top = `${center + ny * radius}px`;
    }
  }

  function resetJoystick() {
    inputState.joyX = 0;
    inputState.joyY = 0;
    inputState.joystickPointerId = null;
    if (joystickKnob) {
      const base = joystickBase ? joystickBase.getBoundingClientRect() : null;
      const knob = joystickKnob.getBoundingClientRect();
      const center = base ? base.width * 0.5 - knob.width * 0.5 : 27;
      joystickKnob.style.left = `${center}px`;
      joystickKnob.style.top = `${center}px`;
    }
  }


  function drawMinimap() {
    if (!mctx || !minimap) return;

    // Indoor: show building name badge instead of full minimap
    if (sceneState.current !== "outdoor") {
      const w = minimap.width;
      const h = minimap.height;
      mctx.clearRect(0, 0, w, h);
      mctx.save();
      mctx.fillStyle = "rgba(60, 50, 40, 0.7)";
      mctx.fillRect(0, 0, w, h);
      const bld = buildings.find(b => b.id === sceneState.current);
      const label = bld ? t(bld.label) : sceneState.current;
      mctx.fillStyle = "#fff";
      mctx.font = "700 14px sans-serif";
      mctx.textAlign = "center";
      mctx.fillText("🏠 " + label, w * 0.5, h * 0.45);
      mctx.font = "600 11px sans-serif";
      mctx.fillStyle = "rgba(255,255,255,0.6)";
      mctx.fillText(t("canvas_indoor"), w * 0.5, h * 0.65);
      mctx.textAlign = "start";
      mctx.restore();
      return;
    }

    const w = minimap.width;
    const h = minimap.height;
    const pad = 10;
    const sx = (w - pad * 2) / world.width;
    const sy = (h - pad * 2) / world.height;

    mctx.clearRect(0, 0, w, h);
    mctx.save();
    mctx.globalAlpha = 0.32;
    mctx.fillStyle = "#e4f7c5";
    mctx.fillRect(0, 0, w, h);

    mctx.globalAlpha = 0.5;
    mctx.fillStyle = "#7ac7f4";
    const mmStep = world.width > 50 ? 2 : 1;
    for (let y = 0; y < world.height; y += mmStep) {
      for (let x = 0; x < world.width; x += mmStep) {
        if (waterTile(x + 0.5, y + 0.5)) {
          mctx.fillRect(pad + x * sx, pad + y * sy, sx * mmStep + 0.4, sy * mmStep + 0.4);
        }
      }
    }

    mctx.globalAlpha = 0.25;
    mctx.fillStyle = "#cdb387";
    for (let y = 0; y < world.height; y += mmStep) {
      for (let x = 0; x < world.width; x += mmStep) {
        if (roadTile(x + 0.5, y + 0.5)) {
          mctx.fillRect(pad + x * sx, pad + y * sy, sx * mmStep + 0.4, sy * mmStep + 0.4);
        }
      }
    }

    mctx.globalAlpha = 0.26;
    mctx.fillStyle = "#9cb9d8";
    for (const b of buildings) {
      mctx.fillRect(pad + b.x * sx, pad + b.y * sy, b.w * sx, b.h * sy);
    }
    // 놀이터 표시
    mctx.globalAlpha = 0.35;
    mctx.fillStyle = "#6bc76b";
    mctx.fillRect(pad + 27 * sx, pad + 17 * sy, 6 * sx, 6 * sy);

    mctx.globalAlpha = 0.33;
    mctx.fillStyle = "#e9b25e";
    for (const hs of hotspots) {
      mctx.fillRect(pad + hs.x * sx - 1.5, pad + hs.y * sy - 1.5, 3, 3);
    }

    mctx.globalAlpha = 0.6;
    const mnow = nowMs();
    for (const gi of groundItems) {
      if (gi.pickedAt > 0 && mnow - gi.pickedAt < itemRespawnMs(gi)) continue;
      mctx.fillStyle = itemTypes[gi.type].color;
      mctx.beginPath();
      mctx.arc(pad + gi.x * sx, pad + gi.y * sy, 2, 0, Math.PI * 2);
      mctx.fill();
    }

    mctx.globalAlpha = 0.44;
    for (const npc of npcs) {
      if ((npc.currentScene || "outdoor") !== "outdoor") continue;
      mctx.fillStyle = npc.color;
      mctx.beginPath();
      mctx.arc(pad + npc.x * sx, pad + npc.y * sy, 2.6, 0, Math.PI * 2);
      mctx.fill();
    }

    if (mp && mp.enabled) {
      mctx.globalAlpha = 0.5;
      for (const rp of mpRemotePlayerList()) {
        mctx.fillStyle = rp.color;
        mctx.beginPath();
        mctx.arc(pad + rp.x * sx, pad + rp.y * sy, 2.8, 0, Math.PI * 2);
        mctx.fill();
      }
    }

    mctx.globalAlpha = 0.56;
    mctx.fillStyle = player.color;
    mctx.beginPath();
    mctx.arc(pad + player.x * sx, pad + player.y * sy, 3.2, 0, Math.PI * 2);
    mctx.fill();
    mctx.strokeStyle = palette.outline;
    mctx.stroke();

    mctx.globalAlpha = 0.34;
    mctx.strokeStyle = "rgba(30,40,50,0.58)";
    mctx.strokeRect(pad + (player.x - 6) * sx, pad + (player.y - 5) * sy, 12 * sx, 10 * sy);
    mctx.restore();
  }

  // ─── Intro Sequence (모듈: systems/intro-sequence.js) ───
  const introSeq = createIntroSequence({
    npcs, player, world, weather,
    get gameRenderer3D() { return gameRenderer3D; },
    DEFAULT_ZOOM, t, formatTime, getNpcRelation, npcRelationLabel,
    llmReplyOrEmpty, upsertSpeechBubble, canStandInScene, clamp,
  });

  function updateUI() {
    if (chatMgr.systemToasts.length && chatMgr.systemToasts[0].until <= performance.now()) renderToasts();
    const weatherKo = { clear: "☀️", cloudy: "☁️", rain: "🌧️", storm: "⛈️", snow: "❄️", fog: "🌫️" };
    const weatherIcon = weatherKo[weather.current] || "☀️";
    uiTime.textContent = `${formatTime()} ${weatherIcon}${world.paused ? " " + t("hud_paused") : ""}`;
    uiPlayer.textContent = player.name;

    const near = nearestNpc(CHAT_NEARBY_DISTANCE);
    const stateLabels = { idle: t("npc_state_idle"), moving: t("npc_state_moving"), chatting: t("npc_state_chatting") };
    uiNearby.textContent = near ? t("ui_nearby", { name: near.npc.name, state: stateLabels[near.npc.state] || near.npc.state }) : t("ui_nearby_none");

    if (quest.done && !quest.dynamic) uiQuest.textContent = t("ui_quest_done", { title: quest.title });
    else uiQuest.textContent = t("ui_quest_active", { title: quest.title, objective: quest.objective });

    if (mobileInteractBtn) {
      const hs = nearestHotspot(1.6);
      const nearNpc = nearestNpc(CHAT_NEARBY_DISTANCE);
      mobileInteractBtn.disabled = false;
      if (hs) {
        const hsLabels = {
          exitGate: t("hs_exit"),
          interiorExit: t("hs_exit"),
          minigameZone: t("hs_playground"),
          infoCenter: t("hs_info"),
          questBoard: t("hs_board"),
        };
        const isDoor = hs.id.endsWith("Door") && !hsLabels[hs.id];
        mobileInteractBtn.textContent = hsLabels[hs.id] || (isDoor ? t("mobile_interact") : t("mobile_interact"));
      } else if (nearestGroundItem(1.5)) {
        const gi = nearestGroundItem(1.5);
        mobileInteractBtn.textContent = t("mobile_pickup", { emoji: itemTypes[gi.type].emoji });
      } else if (nearNpc) {
        mobileInteractBtn.textContent = t("mobile_talk");
      } else {
        mobileInteractBtn.textContent = t("mobile_talk");
        mobileInteractBtn.disabled = true;
      }
    }

    if (questBannerEl) {
      if (quest.title && !quest.done) {
        questBannerEl.hidden = false;
        if (questBannerTitleEl) questBannerTitleEl.textContent = quest.title;
        if (questBannerObjectiveEl) questBannerObjectiveEl.textContent = quest.objective;
      } else {
        questBannerEl.hidden = true;
      }
    }

    uiRel.textContent = "";

    const target = chatTargetNpc();
    const npcNear = target && target.near;
    const mpChat = mp && mp.enabled && !npcNear;
    const newChatTargetId = npcNear ? target.npc.id : (mpChat ? "__mp__" : null);
    if (chatTargetEl) {
      const prevLabel = chatTargetEl.textContent;
      const newLabel = npcNear ? t("chat_target_npc", { name: target.npc.name }) : (mpChat ? t("chat_target_mp") : t("chat_target_none"));
      if (prevLabel !== newLabel) { chatTargetEl.textContent = newLabel; renderCurrentChat(); }
    }
    if (chatSendEl) chatSendEl.disabled = mpChat ? false : !npcNear;
    if (chatInputEl) {
      chatInputEl.disabled = mpChat ? false : !npcNear;
      chatInputEl.placeholder = mpChat ? t("chat_placeholder_mp") : t("chat_placeholder_npc");
    }
    // 추천 응답 표시
    if (chatSuggestionsEl) {
      if (npcNear && chatSuggestionsEl.dataset.npcId !== target.npc.id) {
        renderSuggestions(target.npc);
      } else if (!npcNear) {
        chatSuggestionsEl.innerHTML = "";
        chatSuggestionsEl.dataset.npcId = "";
      }
    }
    if (chatActiveTargetEl) chatActiveTargetEl.textContent = npcNear ? t("chat_target_npc", { name: target.npc.name }) : (mpChat ? t("chat_target_mp") : t("chat_target_none"));
    if (chatActiveStateEl) {
      if (mpChat) chatActiveStateEl.textContent = t("chat_state_global");
      else if (!target) chatActiveStateEl.textContent = t("chat_state_unavailable");
      else if (!target.near) chatActiveStateEl.textContent = t("chat_state_moving");
      else if (convoMgr.focusNpcId && target.npc.id === convoMgr.focusNpcId) chatActiveStateEl.textContent = t("chat_state_locked");
      else if (convoMgr.isSessionActive(target.npc.id)) chatActiveStateEl.textContent = t("chat_state_chatting");
      else if (target.focused) chatActiveStateEl.textContent = t("chat_state_selected");
      else chatActiveStateEl.textContent = t("chat_state_nearby");
    }
    if (chatModelEl) {
      if (!LLM_API_URL) chatModelEl.textContent = t("chat_model_local");
      else if (llmAvailable) chatModelEl.textContent = t("chat_model_active", { model: lastLlmModel });
      else chatModelEl.textContent = t("chat_model_error");
      if (!llmAvailable && lastLlmError) chatModelEl.title = lastLlmError;
      else chatModelEl.removeAttribute("title");
    }
  }

  function canvasPointFromEvent(ev) {
    const rect = canvas.getBoundingClientRect();
    const sx = (ev.clientX - rect.left) * (canvas.width / rect.width);
    const sy = (ev.clientY - rect.top) * (canvas.height / rect.height);
    return { x: sx, y: sy };
  }

  function npcAtCanvasPoint(px, py) {
    let best = null;
    let bestD = Infinity;
    const z = clamp(world.zoom, 0.9, ZOOM_MAX);
    const r = 17 * z;
    for (const npc of npcs) {
      const p = project(npc.x, npc.y, 0);
      const cx = p.x;
      const cy = p.y - 10;
      const d = Math.hypot(px - cx, py - cy);
      if (d <= r && d < bestD) {
        best = npc;
        bestD = d;
      }
    }
    return best;
  }

  let last = performance.now();
  let mouseDown = false;
  let mouseDragged = false;
  let mouseDownX = 0;
  let mouseDownY = 0;
  initPlayerName().then(() => {
    translateStaticDOM();
    // 재방문자: 저장된 상태 자동 복원 + 인트로 건너뛰기
    if (isReturningVisitor) {
      loadState();
      // 시간은 현실과 1:1 — 저장된 시간이 아닌 현재 서울 시간 사용
      const seoulNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
      world.totalMinutes = seoulNow.getHours() * 60 + seoulNow.getMinutes();
      introSeq.skip();
      addChat("System", t("sys_welcome_back", { name: player.name }));
    }
    initMultiplayer();
    // Init audio after user interaction (name modal confirm) to satisfy autoplay policy
    audioManager.init();
    audioManager.updateForScene(weather.current, hourOfDay());
  }).catch(e => console.warn("[initPlayerName]", e.message));
  addLog(t("log_world_init"));
  if (LLM_API_URL) addChat("System", t("sys_llm_chat_on"));
  else addChat("System", t("sys_llm_chat_off"));

  function ensureAutoWalkControl() {
    if (!controlActionsEl || autoWalkBtn) return;
    const btn = document.createElement("button");
    btn.id = "pg-auto-walk";
    btn.type = "button";
    btn.textContent = t("autowalk_on");
    btn.setAttribute("aria-pressed", "false");
    controlActionsEl.appendChild(btn);
    autoWalkBtn = btn;
    autoWalkBtn.addEventListener("click", () => {
      playerCtrl.setAutoWalkEnabled(!playerCtrl.autoWalkEnabled);
    });
  }

  function ensureMobileAutoWalkControl() {
    if (!mobileUtilityBtn || mobileAutoWalkBtn) return;
    const btn = document.createElement("button");
    btn.id = "pg-mobile-autowalk";
    btn.type = "button";
    btn.textContent = t("autowalk_on_short");
    btn.setAttribute("aria-pressed", "false");
    mobileUtilityBtn.insertAdjacentElement("afterend", btn);
    mobileAutoWalkBtn = btn;
    mobileAutoWalkBtn.addEventListener("click", () => {
      if (isMobileViewport() && mobileChatOpen) return;
      playerCtrl.setAutoWalkEnabled(!playerCtrl.autoWalkEnabled);
    });
  }

  ensureAutoWalkControl();
  ensureMobileAutoWalkControl();
  try {
    playerCtrl.setAutoWalkEnabled(localStorage.getItem(AUTO_WALK_KEY) === "1", true);
  } catch {
    playerCtrl.setAutoWalkEnabled(false, true);
  }

  // ─── Onboarding Hints (first-time visitors only) ───
  const onboardingHints = { moveShown: false, talkShown: false, npcNearShown: false, elapsed: 0 };
  function updateOnboardingHints(dt) {
    if (isReturningVisitor) return;
    if (!introSeq.isDone) return;
    onboardingHints.elapsed += dt;
    // 인트로 끝난 후 2초: 이동 힌트
    if (!onboardingHints.moveShown && onboardingHints.elapsed > 2) {
      onboardingHints.moveShown = true;
      const hint = mobileMode ? t("hint_move_mobile") : t("hint_move_desktop");
      addChat("System", hint);
    }
    // NPC가 가까이 있을 때: 대화 힌트
    if (!onboardingHints.npcNearShown && onboardingHints.elapsed > 5) {
      const near = nearestNpc(CHAT_NEARBY_DISTANCE + 1);
      if (near) {
        onboardingHints.npcNearShown = true;
        const hint = mobileMode ? t("hint_talk_mobile", { name: near.npc.name }) : t("hint_talk_desktop", { name: near.npc.name });
        addChat("System", hint);
      }
    }
  }

  function frame(now) {
    resizeCanvasToDisplaySize();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    frameCount += 1;

    if (!world.paused) {
      // ── Phase A: Time ──
      world.totalMinutes += dt / 60;

      // ── Phase B: Player (before NPCs) ──
      playerCtrl.update(dt);

      // ── Phase C: NPC Movement (guide before general) ──
      ensureGuideGreeting().update(dt);
      // Host or single-player: run NPC simulation. Non-host: skip (Firebase sync).
      if (!mp || !mp.enabled || mp.isHost) {
        updateNpcs(dt);
      }

      // ── Phase D: NPC Social ──
      ensureNpcSocial().updateSocialEvents();
      updateAmbientEvents();
      updateFavorRequests();
      updateTagGame(dt);
      sceneMgr.updateFade(dt);

      // ── Phase E: Environment ──
      if (sceneState.current === "outdoor") {
        updateWeather(dt);
        updateDiscoveries();
      }
      ensureAmbientSpeech().update(nowMs());
      introSeq.update(dt);
      updateOnboardingHints(dt);

      // ── Phase F: Camera ──
      cameraSys.updateConversation();
      cameraSys.updateContemplation(nowMs());
      cameraSys.updateCamera();

      // ── Phase G: Network ──
      if (mp && mp.enabled) {
        mpBroadcast();
        mpInterpolate(dt);
        if (mp.isHost) mp.broadcastNpcs(npcs);
        if (frameCount % 300 === 0) { mpCleanStale(); mpCleanMessages(); }
        const _now = nowMs();
        if (memorySync && _now > nextMemorySyncAt) {
          nextMemorySyncAt = _now + GAME.MEMORY_SYNC_MS;
          syncMemoryToServer();
        }
      }
    }

    if (mp && mp.enabled && uiOnlineEl) {
      uiOnlineEl.textContent = t("ui_online", { count: mpOnlineCount() });
    }

    updateUI();
    if (gameRenderer3D) {
      elapsedTime += dt;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      gameRenderer3D.render(
        { player, npcs, world, weather, sceneState, speechBubbles: chatMgr.speechBubbles, weatherParticles, remotePlayers: mpRemotePlayerList() },
        dt,
        elapsedTime
      );
      if (!mobileMode || frameCount % 3 === 0) drawMinimap();
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener("keydown", (ev) => {
    // 인트로 중 아무 키 → 건너뛰기
    if (!introSeq.isDone && !isTypingInInput()) {
      introSeq.skip();
    }
    // Ctrl+Shift+D: toggle debug mode (works even when typing)
    if (ev.ctrlKey && ev.shiftKey && ev.code === "KeyD") {
      ev.preventDefault();
      debugMode = !debugMode;
      localStorage.setItem('playground_debug', debugMode);
      const msg = debugMode ? t("debug_on") : t("debug_off");
      addLog(msg);
      console.log(`%c${msg}`, 'color:#ff5722;font-size:14px;font-weight:bold');
      return;
    }
    const code = ev.code;
    if (isMobileViewport() && mobileChatOpen) {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight", "KeyE", "KeyP"].includes(code)) {
        ev.preventDefault();
      }
      return;
    }
    if (isTypingInInput()) {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight", "KeyE", "KeyP"].includes(code)) {
        ev.preventDefault();
      }
      return;
    }
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(code)) {
      ev.preventDefault();
    }
    if (code === "Escape" && convoMgr.focusNpcId) { endConversation(); return; }
    if (code === "KeyE") interact();
    if (code === "Space") cameraSys.resetView();
    if (code === "KeyP") {
      world.paused = !world.paused;
      addLog(world.paused ? t("sys_sim_pause") : t("sys_sim_resume"));
    }
    if (code === "KeyT") {
      playerCtrl.setAutoWalkEnabled(!playerCtrl.autoWalkEnabled);
    }
    // V키: 관조 모드 (카메라가 NPC를 자동으로 따라감)
    if (code === "KeyV") {
      cameraSys.toggleContemplation();
      addLog(cameraSys.contemplationMode ? t("sys_contemplation_on") : t("sys_contemplation_off"));
    }
    // G키: 날씨 순환 (디버그용)
    if (code === "KeyG") {
      const cycle = ["clear", "cloudy", "rain", "storm", "snow", "fog"];
      const idx = cycle.indexOf(weather.current);
      weather.current = cycle[(idx + 1) % cycle.length];
      weather.next = weather.current;
      weather.intensity = weather.current === "clear" ? 0 : 0.7;
      weather.transitionProgress = 1;
      const names = { clear: t("weather_clear_name"), cloudy: t("weather_cloudy_name"), rain: t("weather_rain_name"), storm: t("weather_storm_name"), snow: t("weather_snow_name"), fog: t("weather_fog_name") };
      addLog(t("log_weather_change", { name: names[weather.current] || weather.current }));
    }
    keys.add(code);
  });

  window.addEventListener("keyup", (ev) => {
    if (isMobileViewport() && mobileChatOpen) return;
    if (isTypingInInput()) return;
    keys.delete(ev.code);
  });

  canvas.addEventListener("mousedown", (ev) => {
    if (ev.button !== 0) return;
    mouseDown = true;
    mouseDragged = false;
    mouseDownX = ev.clientX;
    mouseDownY = ev.clientY;
    dragging = false;
    dragX = ev.clientX;
    dragY = ev.clientY;
  });

  window.addEventListener("mouseup", (ev) => {
    if (!mouseDown) return;
    if (!mouseDragged) {
      const pt = canvasPointFromEvent(ev);
      const clickedNpc = npcAtCanvasPoint(pt.x, pt.y);
      if (clickedNpc) {
        focusedNpcId = clickedNpc.id;
        convoMgr.startConversation(clickedNpc.id, 18_000, "click");
        const moved = moveNearNpcTarget(clickedNpc);
        if (moved) {
          addChat("System", t("sys_moving_to_npc", { name: clickedNpc.name }));
        } else {
          addChat("System", t("sys_cannot_move_to_npc", { name: clickedNpc.name }));
        }
      } else {
        // 3D 모드: 클릭 위치로 이동
        if (gameRenderer3D) {
          const pos = gameRenderer3D.screenToWorld(ev.clientX, ev.clientY);
          if (pos && canStand(pos.x, pos.z)) {
            player.moveTarget = { x: pos.x, y: pos.z };
          }
        }
        focusedNpcId = null;
        convoMgr.endConversation();
      }
    }
    mouseDown = false;
    if (dragging) {
      dragging = false;
      canvas.classList.remove("dragging");
    }
  });

  window.addEventListener("mousemove", (ev) => {
    if (!mouseDown) return;
    if (!mouseDragged) {
      const moved = Math.hypot(ev.clientX - mouseDownX, ev.clientY - mouseDownY);
      if (moved > 4) {
        mouseDragged = true;
        dragging = true;
        canvas.classList.add("dragging");
      }
    }
    if (!dragging) return;
    const dx = ev.clientX - dragX;
    const dy = ev.clientY - dragY;
    dragX = ev.clientX;
    dragY = ev.clientY;
    cameraSys.addPan(dx, dy);
  });

  // 줌/터치 이벤트: 3D 캔버스에 걸기 (2D HUD는 pointer-events:none)
  const zoomTarget = canvas3D || canvas;

  zoomTarget.addEventListener(
    "wheel",
    (ev) => {
      ev.preventDefault();
      const delta = ev.deltaY > 0 ? -0.1 : 0.1;
      world.zoom = clamp(world.zoom + delta, ZOOM_MIN, ZOOM_MAX);
    },
    { passive: false }
  );

  zoomTarget.addEventListener(
    "touchstart",
    (ev) => {
      if (!mobileMode) return;
      if (isMobileViewport() && mobileChatOpen) return;
      if (ev.touches.length === 1) {
        const t = ev.touches[0];
        inputState.touchPanActive = true;
        inputState.touchPanX = t.clientX;
        inputState.touchPanY = t.clientY;
        inputState.pinchDist = 0;
      } else if (ev.touches.length >= 2) {
        inputState.touchPanActive = false;
        inputState.pinchDist = touchDistance(ev.touches[0], ev.touches[1]);
      }
    },
    { passive: true }
  );

  zoomTarget.addEventListener(
    "touchmove",
    (ev) => {
      if (!mobileMode) return;
      if (isMobileViewport() && mobileChatOpen) {
        ev.preventDefault();
        return;
      }
      ev.preventDefault();

      if (ev.touches.length === 1 && inputState.touchPanActive) {
        const t = ev.touches[0];
        const dx = t.clientX - inputState.touchPanX;
        const dy = t.clientY - inputState.touchPanY;
        inputState.touchPanX = t.clientX;
        inputState.touchPanY = t.clientY;
        cameraSys.addPan(dx, dy);
      } else if (ev.touches.length >= 2) {
        const distNow = touchDistance(ev.touches[0], ev.touches[1]);
        if (inputState.pinchDist > 0) {
          const delta = (distNow - inputState.pinchDist) * 0.0025;
          world.zoom = clamp(world.zoom + delta, ZOOM_MIN, ZOOM_MAX);
        }
        inputState.pinchDist = distNow;
      }
    },
    { passive: false }
  );

  zoomTarget.addEventListener("touchend", () => {
    inputState.touchPanActive = false;
    inputState.pinchDist = 0;
  });

  if (joystickBase) {
    joystickBase.addEventListener("pointerdown", (ev) => {
      if (isMobileViewport() && mobileChatOpen) return;
      ev.preventDefault();
      inputState.joystickPointerId = ev.pointerId;
      joystickBase.setPointerCapture(ev.pointerId);
      const rect = joystickBase.getBoundingClientRect();
      const x = (ev.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      const y = (ev.clientY - rect.top - rect.height / 2) / (rect.height / 2);
      setJoystick(x, y);
    });

    joystickBase.addEventListener("pointermove", (ev) => {
      if (isMobileViewport() && mobileChatOpen) return;
      if (inputState.joystickPointerId !== ev.pointerId) return;
      const rect = joystickBase.getBoundingClientRect();
      const x = (ev.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      const y = (ev.clientY - rect.top - rect.height / 2) / (rect.height / 2);
      setJoystick(x, y);
    });

    const endJoystick = (ev) => {
      if (inputState.joystickPointerId !== ev.pointerId) return;
      resetJoystick();
    };
    joystickBase.addEventListener("pointerup", endJoystick);
    joystickBase.addEventListener("pointercancel", endJoystick);
  }

  if (mobileInteractBtn) {
    mobileInteractBtn.addEventListener("click", () => {
      if (isMobileViewport() && mobileChatOpen) return;
      interact();
    });
  }
  if (mobileResetBtn) {
    mobileResetBtn.addEventListener("click", () => {
      if (isMobileViewport() && mobileChatOpen) return;
      cameraSys.resetView();
    });
  }
  if (mobileUtilityBtn) {
    mobileUtilityBtn.addEventListener("click", () => {
      if (!isMobileViewport()) return;
      if (mobileChatOpen) return;
      mobileUtilityOpen = !mobileUtilityOpen;
      applyPanelState();
    });
  }
  if (statusToggleBtn) {
    statusToggleBtn.addEventListener("click", () => {
      if (!isMobileViewport()) return;
      mobileStatusCollapsed = !mobileStatusCollapsed;
      applyPanelState();
    });
  }
  if (logToggleBtn) {
    logToggleBtn.addEventListener("click", () => {
      if (!isMobileViewport()) return;
      mobileLogCollapsed = !mobileLogCollapsed;
      applyPanelState();
    });
  }
  if (mobileRunBtn) {
    const runDown = (ev) => {
      if (isMobileViewport() && mobileChatOpen) return;
      ev.preventDefault();
      inputState.runHold = true;
      mobileRunBtn.classList.add("pg-pressed");
    };
    const runUp = () => {
      inputState.runHold = false;
      mobileRunBtn.classList.remove("pg-pressed");
    };
    mobileRunBtn.addEventListener("pointerdown", runDown);
    mobileRunBtn.addEventListener("pointerup", runUp);
    mobileRunBtn.addEventListener("pointercancel", runUp);
    mobileRunBtn.addEventListener("pointerleave", runUp);
  }
  if (mobilePauseBtn) {
    mobilePauseBtn.addEventListener("click", () => {
      if (isMobileViewport() && mobileChatOpen) return;
      world.paused = !world.paused;
      addLog(world.paused ? t("sys_sim_pause") : t("sys_sim_resume"));
    });
  }
  if (mobileSheetToggleBtn) {
    mobileSheetToggleBtn.addEventListener("click", () => toggleMobileSheet());
  }
  if (mobileTabControlsBtn) {
    mobileTabControlsBtn.addEventListener("click", () => setMobileSheetTab("controls", true));
  }
  if (mobileTabInfoBtn) {
    mobileTabInfoBtn.addEventListener("click", () => setMobileSheetTab("info", true));
  }
  if (mobileTabLogBtn) {
    mobileTabLogBtn.addEventListener("click", () => setMobileSheetTab("log", true));
  }
  if (mobileTabChatBtn) {
    mobileTabChatBtn.addEventListener("click", () => setMobileSheetTab("chat", true));
  }

  if (chatSendEl) chatSendEl.addEventListener("click", sendCardChat);
  if (chatCloseBtn) {
    chatCloseBtn.addEventListener("click", () => endConversation());
  }
  if (chatInputEl) {
    chatInputEl.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        sendCardChat();
      } else if (ev.key === "Escape") {
        ev.preventDefault();
        endConversation();
      }
    });
  }

  if (saveBtn) saveBtn.addEventListener("click", saveState);
  if (loadBtn) loadBtn.addEventListener("click", loadState);
  if (renameBtn) renameBtn.addEventListener("click", changePlayerName);

  // Audio toggle button
  const audioToggleEl = document.getElementById('pg-audio-toggle');
  if (audioToggleEl) {
    audioToggleEl.textContent = audioManager.isMuted() ? '\uD83D\uDD07' : '\uD83D\uDD0A';
    audioToggleEl.addEventListener('click', () => {
      const muted = audioManager.toggleMute();
      audioToggleEl.textContent = muted ? '\uD83D\uDD07' : '\uD83D\uDD0A';
    });
  }

  if (createBtnEl) {
    createBtnEl.addEventListener("click", async () => {
      const name = createNameEl ? createNameEl.value : "";
      const personality = createPersonalityEl ? createPersonalityEl.value : "";
      const result = createCustomNpc(name, personality);
      if (!result.ok) {
        if (createStatusEl) createStatusEl.textContent = result.reason;
        return;
      }
      if (createBtnEl) createBtnEl.disabled = true;
      if (createStatusEl) createStatusEl.textContent = t("npc_creating");
      try {
        if (WORLD_NPC_API_URL) {
          const sharedNpc = await createSharedNpc(result.npc.name, result.npc.personality || "");
          if (sharedNpc && sharedNpc.id) {
            result.npc.id = sharedNpc.id;
            npcPersonas[sharedNpc.id] = {
              age: "npc_age_20s",
              gender: "npc_gender_male",
              personality: sharedNpc.personality || result.npc.personality || inferPersonalityFromName(result.npc.name, t),
            };
          }
        }
      } catch (err) {
        addLog(t("log_shared_npc_create_fail", { err: err.message || err }));
      } finally {
        if (createBtnEl) createBtnEl.disabled = false;
      }
      if (createNameEl) createNameEl.value = "";
      if (createPersonalityEl) createPersonalityEl.value = "";
      if (createStatusEl) createStatusEl.textContent = t("npc_created", { name: result.npc.name });
      addLog(t("log_npc_joined", { name: result.npc.name }));
    });
  }
  if (createNameEl) {
    createNameEl.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        if (createBtnEl) createBtnEl.click();
      }
    });
  }
  function refreshRemoveSelect() {
    if (!removeSelectEl) return;
    removeSelectEl.innerHTML = `<option value="">${t("npc_select")}</option>`;
    for (const n of npcs) {
      const opt = document.createElement("option");
      opt.value = n.id;
      opt.textContent = n.name;
      removeSelectEl.appendChild(opt);
    }
  }
  if (removeBtnEl) {
    removeBtnEl.addEventListener("click", () => {
      if (!removeSelectEl || !removeSelectEl.value) return;
      const result = removeNpc(removeSelectEl.value);
      if (result.ok) {
        addChat("System", t("sys_npc_removed", { name: result.name }));
        addLog(t("log_npc_removed", { name: result.name }));
        refreshRemoveSelect();
      }
    });
  }
  if (removeSelectEl) {
    removeSelectEl.addEventListener("focus", refreshRemoveSelect);
  }

  if (uiToggleBtn && stageEl) {
    uiToggleBtn.addEventListener("click", () => {
      const collapsed = stageEl.classList.toggle("pg-ui-collapsed");
      uiToggleBtn.textContent = collapsed ? t("ui_show") : t("ui_hide");
      uiToggleBtn.setAttribute("aria-expanded", collapsed ? "false" : "true");
    });
  }
  if (stageEl) {
    loadPanelState();

    if (leftToggleBtn) {
      leftToggleBtn.addEventListener("click", () => {
        togglePanel("left");
      });
    }
    if (rightToggleBtn) {
      rightToggleBtn.addEventListener("click", () => {
        togglePanel("right");
      });
    }
    if (chatToggleBtn) {
      chatToggleBtn.addEventListener("click", () => {
        togglePanel("chat");
      });
    }
  }

  if (mobileMode) resetJoystick();
  syncSharedNpcs();
  if (WORLD_NPC_API_URL) {
    window.setInterval(syncSharedNpcs, 18000);
  }
  resizeCanvasToDisplaySize();
  window.addEventListener("resize", () => {
    if (!isMobileViewport()) {
      mobileChatOpen = false;
      mobileUtilityOpen = false;
    }
    resizeCanvasToDisplaySize();
    applyPanelState();
  });

  // ===== MULTIPLAYER (모듈: systems/multiplayer.js) =====
  let mp;  // initialized after player setup in initPlayerName().then()
  function mpRemotePlayerList() { return mp ? mp.remotePlayerList() : []; }
  function mpBroadcast() { if (mp) mp.broadcast(); }
  function mpInterpolate(dt) { if (mp) mp.interpolate(dt); }
  function mpCleanStale() { if (mp) mp.cleanStale(); }
  function mpSendMessage(text) { if (mp) mp.sendMessage(text); }
  function mpCleanMessages() { if (mp) mp.cleanMessages(); }
  function mpOnlineCount() { return mp ? mp.onlineCount() : 1; }
  let memorySync = null;
  let nextMemorySyncAt = 0;

  function initMultiplayer() {
    mp = createMultiplayer({ player, world, npcs, addChat, addLog, t, upsertSpeechBubble, normalizePlayerFlag, uiOnlineEl });
    mp.init();
    // Firebase 기억 동기화 초기화
    const cfg = window.PG_FIREBASE_CONFIG;
    if (cfg && cfg.databaseURL && typeof firebase !== "undefined" && mp && mp.enabled) {
      let playerId = localStorage.getItem(PLAYER_ID_KEY);
      if (!playerId) {
        playerId = "p_" + crypto.randomUUID();
        localStorage.setItem(PLAYER_ID_KEY, playerId);
      }
      try {
        memorySync = createMemorySync(firebase.database(), playerId);
        // 서버에서 기억 로드 (비동기)
        memorySync.load(player.name).then((result) => {
          if (result && applyServerMemory(npcs, result, null)) {
            addLog(t("mem_restored"));
          }
        }).catch(e => console.warn("[memorySync load]", e.message));
      } catch (e) {
        console.warn("[MemorySync] init failed:", e.message);
      }
    }
  }

  function syncMemoryToServer() {
    if (!memorySync) return;
    memorySync.save(npcs, player.name);
  }

  // ── Three.js 3D Renderer Init ──
  if (USE_3D && canvas3D) {
    try {
      gameRenderer3D = new GameRenderer(canvas3D);
      gameRenderer3D.init({
        player,
        npcs,
        world,
        roadTileFn: roadTile,
        waterTileFn: waterTile,
        translateFn: t,
        npcPersonas,
      });
      console.log("[Playground] Three.js 3D renderer initialized");

      // 3D 캔버스 클릭 → 인트로 건너뛰기 또는 이동
      canvas3D.addEventListener("click", (ev) => {
        if (!introSeq.isDone) { introSeq.skip(); return; }
        if (dragging || isMobileViewport()) return;
        const pos = gameRenderer3D.screenToWorld(ev.clientX, ev.clientY);
        if (pos && canStand(pos.x, pos.z)) {
          player.moveTarget = { x: pos.x, y: pos.z };
        }
      });
    } catch (e) {
      console.warn("[Playground] Three.js init failed, falling back to 2D:", e);
      gameRenderer3D = null;
    }
  }

  // NPC를 미리 흩어놓기 (첫 프레임 전 60초 시뮬레이션)
  introSeq.presimulate(60);

  // ─── Auto-save: 페이지 닫힐 때 + 주기적 저장 ───
  window.addEventListener("beforeunload", () => {
    try { saveLoadSys.save(); } catch { /* ignore */ }
    if (memorySync) {
      try { memorySync.save(npcs, player.name); } catch { /* ignore */ }
    }
  });
  // 3분마다 자동 저장
  setInterval(() => {
    try { saveLoadSys.save(); } catch { /* ignore */ }
  }, 180_000);

  requestAnimationFrame(frame);
})();
