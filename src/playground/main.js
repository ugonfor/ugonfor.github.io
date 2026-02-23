import { clamp, dist, shade, randomPastelColor, normalizePlayerName, bubbleText, inferPersonalityFromName, nowMs, socialKey, npcRelationLabel } from './utils/helpers.js';
import { SAVE_KEY, UI_PREF_KEY, MOBILE_SHEET_KEY, PLAYER_NAME_KEY, PLAYER_FLAG_KEY, PLAYER_ID_KEY, AUTO_WALK_KEY, COUNTRY_LIST, CHAT_NEARBY_DISTANCE, ZOOM_MIN, ZOOM_MAX, DEFAULT_ZOOM, CONVERSATION_MIN_ZOOM, npcPersonas, palette, places, buildings, hotspots, props, speciesPool, WEATHER_TYPES, discoveries, favorLevelNames, itemTypes, groundItems, ITEM_RESPAWN_MS, seasons, interiorDefs } from './core/constants.js';
import { translations } from './core/i18n.js';
import { GameRenderer } from './renderer/renderer.js';
import { createWeatherState, createWeatherParticles, updateWeather as _updateWeather, updateWeatherParticles as _updateWeatherParticles } from './systems/weather.js';
import { createMultiplayer } from './systems/multiplayer.js';
import { makeNpc, ensureMemoryFormat, addNpcMemory as _addNpcMemory, getNpcMemorySummary as _getNpcMemorySummary, getNpcSocialContext as _getNpcSocialContext, getMemoryBasedTone } from './systems/npc-data.js';
import { generateDynamicQuest as _generateDynamicQuest, handleQuestNpcTalk as _handleQuestNpcTalk, handleDynamicQuestProgress as _handleDynamicQuestProgress, advanceDynamicQuest as _advanceDynamicQuest, completeDynamicQuest as _completeDynamicQuest, showQuestBoardMenu as _showQuestBoardMenu, handleQuestBoardChoice as _handleQuestBoardChoice } from './systems/quest.js';
import { createMemorySync, applyServerMemory } from './systems/memory-sync.js';

(function () {
  const USE_3D = true;
  const canvas = document.getElementById("pg-world-canvas");
  if (!canvas) return;

  // ─── i18n ───
  let currentLang = localStorage.getItem('playground_lang') || 'ko';
  function t(key, params = {}) {
    let text = (translations[currentLang] && translations[currentLang][key]) || (translations.ko && translations.ko[key]) || key;
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, v);
    }
    return text;
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
  const logs = [];
  const npcChatHistories = {};
  const globalChats = [];
  const systemToasts = [];
  let llmAvailable = true;
  let debugMode = localStorage.getItem('playground_debug') === 'true';
  let focusedNpcId = null;
  let conversationFocusNpcId = null;
  let lastLlmModel = "local";
  let lastLlmError = "";
  let nextSocialAt = 0;
  let mobileSheetOpen = false;
  let mobileSheetTab = "controls";
  let mobileChatOpen = false;
  let mobileUtilityOpen = false;
  let mobileStatusCollapsed = false;
  let mobileLogCollapsed = false;
  const speechBubbles = [];
  let nextAmbientBubbleAt = 0;
  let nextPlayerBubbleAt = 0;
  let nextAutoConversationAt = 0;
  let autoConversationBusy = false;
  let playerBubblePending = false;
  let ambientLlmPending = false;
  let npcChatLlmPending = false;
  let npcProactiveGreetPending = false;
  let nextNpcProactiveAt = 0;
  const autoWalk = {
    enabled: false,
    nextPickAt: 0,
    target: null,
  };
  let autoWalkBtn = null;
  let mobileAutoWalkBtn = null;
  const chatSession = {
    npcId: null,
    expiresAt: 0,
  };

  const cameraPan = { x: 0, y: 0 };
  const convoPan = { x: 0, y: 0 };
  let preConversationZoom = null;
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

  const sceneFade = {
    active: false,
    alpha: 0,
    direction: "in", // "in" = fade to black, "out" = fade from black
    callback: null,
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
  function addNpcMemory(npc, type, summary, metadata) { _addNpcMemory(npc, type, summary, metadata, world.totalMinutes); }
  function getNpcMemorySummary(npc) { return _getNpcMemorySummary(npc, t); }
  function getNpcSocialContext(npc) { return _getNpcSocialContext(npc, npcs, getNpcRelation); }

  const npcs = [
    // KSA 학생들 (기숙사→본관→각자 취미)
    makeNpc("heo", "허승준", "#e56f6f", places.ksa_dorm, places.ksa_main, places.park, "", "human_a"),
    makeNpc("kim", "김민수", "#6fa1e5", places.ksa_dorm, places.ksa_main, places.cafe, "", "human_b"),
    makeNpc("choi", "최민영", "#79c88b", places.ksa_dorm, places.ksa_main, places.plaza, "", "human_c"),
    makeNpc("jung", "정욱진", "#b88be6", places.ksa_dorm, places.ksa_main, places.market, "", "human_d"),
    makeNpc("seo", "서창근", "#e6a76f", places.ksa_dorm, places.ksa_main, places.park, "", "human_e"),
    makeNpc("lee", "이진원", "#6fc7ba", places.ksa_dorm, places.ksa_main, places.cafe, "", "human_f"),
    makeNpc("park", "박지호", "#d88972", places.ksa_dorm, places.ksa_main, places.plaza, "", "human_g"),
    makeNpc("jang", "장동우", "#8e9be3", places.ksa_dorm, places.ksa_main, places.market, "", "human_h"),
    makeNpc("guide", "유진", "#f0a0c0", places.infoCenter, places.infoCenter, places.infoCenter, "", "human_a"),
    makeNpc("yoo", "유효곤", "#5e88dd", places.ksa_dorm, places.ksa_main, places.park, "", "human_i"),
    // 마을 주민들
    makeNpc("baker", "한소영", "#e6a76f", places.bakery, places.bakery, places.market, "빵집 사장. 밝고 다정하며, 매일 새벽에 빵을 굽는다.", "human_d"),
    makeNpc("floristNpc", "윤채린", "#ff8fa3", places.florist, places.florist, places.park, "꽃집 주인. 조용하고 섬세하며, 꽃 이름을 다 알고 있다.", "human_c"),
    makeNpc("librarian", "송재현", "#7a9ec7", places.library, places.library, places.cafe, "도서관 사서. 책벌레이고, 모든 주제에 박식하다.", "human_b"),
    makeNpc("residentA", "강민호", "#8bc77a", places.homeA, places.market, places.plaza, "은퇴한 어부. 옛날 얘기를 좋아한다.", "human_g"),
    makeNpc("residentB", "오지은", "#c9a0d4", places.homeB, places.office, places.library, "프리랜서 작가. 카페에서 글을 쓴다.", "human_f"),
    makeNpc("residentC", "임태준", "#d4a070", places.homeC, places.bakery, places.park, "시장에서 장사하며, 요리를 잘한다.", "human_h"),
    // 추가 주민들
    makeNpc("barista", "김하늘", "#e8a0a0", places.cafe, places.cafe, places.park, "", "human_b"),
    makeNpc("florist_owner", "박민지", "#f0c0d0", places.florist, places.florist, places.plaza, "", "human_d"),
    makeNpc("chef", "정태현", "#d0a060", places.restaurant, places.restaurant, places.market, "", "human_e"),
    makeNpc("officer", "이준혁", "#6080b0", places.police, places.police, places.plaza, "", "human_f"),
    makeNpc("athlete", "윤동혁", "#80c080", places.gym, places.gym, places.park, "", "human_g"),
    makeNpc("doctor", "송지은", "#f0f0f0", places.hospital, places.hospital, places.cafe, "", "human_h"),
    makeNpc("student_a", "오준서", "#e0c080", places.ksa_dorm, places.ksa_main, places.park, "", "human_a"),
    makeNpc("student_b", "한수빈", "#c0a0e0", places.ksa_dorm, places.ksa_main, places.library, "", "human_i"),
    makeNpc("grandpa", "김복동", "#c0b090", places.homeA, places.plaza, places.park, "", "human_h"),
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


  const gossipQueue = [];

  function spreadGossip(sourceNpcId, aboutNpcId, topic, sentiment) {
    gossipQueue.push({ sourceNpcId, aboutNpcId, topic, sentiment, time: world.totalMinutes });
    if (gossipQueue.length > 30) gossipQueue.shift();
  }

  function processGossip() {
    if (gossipQueue.length === 0) return;
    const g = gossipQueue[0];
    const source = npcById(g.sourceNpcId);
    if (!source) { gossipQueue.shift(); return; }

    const nearby = npcs.filter(n => n.id !== g.sourceNpcId && n.id !== g.aboutNpcId && dist(source, n) < 6);
    for (const listener of nearby) {
      const change = g.sentiment === "positive" ? 2 : g.sentiment === "negative" ? -2 : 0;
      if (change !== 0) adjustNpcRelation(listener.id, g.aboutNpcId, change);
    }
    gossipQueue.shift();
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

  // ─── 도슨트 환영 시스템 ───
  let guideGreetingPhase = 0;    // 0: 대기, 1: 접근중, 2: 완료
  let guideGreetingTimer = 0;

  // ─── 술래잡기 미니게임 (역전: NPC가 술래, 플레이어가 도망) ───
  const tagGame = {
    active: false,
    targetNpcId: null,
    startedAt: 0,
    duration: 60_000, // 60초
    caught: false,
    cooldownUntil: 0,
    _sprintUntil: 0,
    _nextSprintAt: 0,
  };

  function startTagGame(npc) {
    tagGame.active = true;
    tagGame.targetNpcId = npc.id;
    tagGame.startedAt = nowMs();
    tagGame.caught = false;
    tagGame._sprintUntil = 0;
    tagGame._nextSprintAt = nowMs() + 4000 + Math.random() * 3000;
    npc.roamTarget = null;
    addChat("System", t("sys_tag_start", { name: npc.name }));
    addLog(t("sys_tag_start", { name: npc.name }));
  }

  function updateTagGame(dt) {
    if (!tagGame.active) return;
    const elapsed = nowMs() - tagGame.startedAt;
    const remaining = tagGame.duration - elapsed;

    const targetNpc = npcs.find(n => n.id === tagGame.targetNpcId);
    if (!targetNpc) { tagGame.active = false; return; }

    // 시간 초과 → 승리! (60초 생존)
    if (remaining <= 0) {
      tagGame.active = false;
      targetNpc.favorPoints += 8;
      addChat("System", t("sys_tag_win", { name: targetNpc.name }));
      addLog(t("log_tag_win"));
      return;
    }

    // NPC가 플레이어를 잡았는지 확인
    const d = Math.hypot(player.x - targetNpc.x, player.y - targetNpc.y);
    if (d < 1.5) {
      tagGame.active = false;
      tagGame.caught = true;
      addChat("System", t("sys_tag_lose", { name: targetNpc.name }));
      addLog(t("log_tag_lose"));
      return;
    }

    // NPC 추적 AI: 플레이어를 향해 이동
    const dx = player.x - targetNpc.x;
    const dy = player.y - targetNpc.y;
    if (d > 0.3) {
      // 스프린트 버스트: 3-7초마다 1.5초간 스프린트
      const now = nowMs();
      if (now > tagGame._nextSprintAt && now > tagGame._sprintUntil) {
        tagGame._sprintUntil = now + 1500;
        tagGame._nextSprintAt = now + 4000 + Math.random() * 3000;
        upsertSpeechBubble(targetNpc.id, "💨", 1500);
      }

      const isSprinting = now < tagGame._sprintUntil;
      // 기본 속도: 플레이어 걷기의 95% → 달리면 도망 가능
      const chaseSpeed = player.speed * 0.95 * (isSprinting ? 1.3 : 1.0) * dt;

      // 약간의 예측: 플레이어 이동 방향으로 보정
      const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.3;
      const nx = targetNpc.x + Math.cos(angle) * chaseSpeed;
      const ny = targetNpc.y + Math.sin(angle) * chaseSpeed;
      if (canStand(nx, ny)) {
        targetNpc.x = nx;
        targetNpc.y = ny;
        targetNpc.state = "moving";
      } else {
        // 벽 우회
        const altAngle = angle + Math.PI * 0.4 * (Math.random() > 0.5 ? 1 : -1);
        const ax = targetNpc.x + Math.cos(altAngle) * chaseSpeed;
        const ay = targetNpc.y + Math.sin(altAngle) * chaseSpeed;
        if (canStand(ax, ay)) {
          targetNpc.x = ax;
          targetNpc.y = ay;
          targetNpc.state = "moving";
        }
      }
    }
  }

  const worldEvents = {
    day: -1,
    once: {},
  };

  // ─── Weather System ───
  const weather = createWeatherState();
  const weatherParticles = createWeatherParticles();
  let discoveryNotifyUntil = 0;
  let discoveryNotifyTitle = "";

  // ─── Weather Update (모듈: systems/weather.js) ───
  const WEATHER_API_URL = LLM_API_URL ? LLM_API_URL.replace(/\/api\/npc-chat$/, "/api/weather") : "";

  function updateWeather(dt) {
    _updateWeather(weather, dt, WEATHER_API_URL);
    _updateWeatherParticles(weather, weatherParticles, dt, canvas.width, canvas.height, hourOfDay());
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
      discoveryNotifyTitle = d.title;
      addLog(t("log_discovery", { title: d.title, desc: d.desc }));
      addChat("System", t("sys_discovery", { title: d.title }));
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
      addChat(npc.name, t("favor_need_item", { label: itemTypes[req.itemNeeded].label }));
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
      addChat(npc.name, `${target.name}에게 가주세요!`);
      return true;
    }

    if (req.type === "visit_place") {
      if (req.targetPlace && dist(player, req.targetPlace) < 3.0) {
        completeFavor(npc, req);
        return true;
      }
      addChat(npc.name, `목적지에 가서 확인해주세요!`);
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
      addNpcMemory(npc, "favor", `관계가 '${favorLevelNames[npc.favorLevel]}'(으)로 발전`);
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
        "봄": t("season_spring"),
        "여름": t("season_summer"),
        "가을": t("season_fall"),
        "겨울": t("season_winter"),
      };
      addChat("System", effects[s] || t("season_change", { season: s }));
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
    addChat("System", t("sys_item_pickup", { emoji: info.emoji, label: info.label, extra: amount > 1 ? ` (x${amount})` : "", count: inventory[gi.type] }));
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
      t("gift_react_1", { label: info.label }),
      t("gift_react_2", { label: info.label }),
      t("gift_react_3"),
    ];
    addChat(npc.name, reactions[Math.floor(Math.random() * reactions.length)]);
    addNpcMemory(npc, "gift", `${info.label}을(를) 선물 받음`, { item: type });
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
        langKoBtn.onclick = () => { selectedLang = "ko"; langKoBtn.classList.add("active"); langEnBtn.classList.remove("active"); };
        langEnBtn.onclick = () => { selectedLang = "en"; langEnBtn.classList.add("active"); langKoBtn.classList.remove("active"); };
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

  async function initPlayerName() {
    let storedName = "";
    let storedFlag = "";
    try {
      storedName = localStorage.getItem(PLAYER_NAME_KEY) || "";
      storedFlag = localStorage.getItem(PLAYER_FLAG_KEY) || "";
    } catch { /* ignore */ }

    if (!storedFlag) {
      const detected = await detectCountryFlag();
      if (detected) {
        storedFlag = detected;
        try { localStorage.setItem(PLAYER_FLAG_KEY, storedFlag); } catch { /* ignore */ }
      }
    }
    player.flag = normalizePlayerFlag(storedFlag);

    // 매번 시작 시 이름/언어 설정 모달 표시
    const result = await showNameModal(storedName || "");
    player.name = result.name;
    currentLang = result.lang;
    try {
      localStorage.setItem(PLAYER_NAME_KEY, player.name);
      localStorage.setItem("playground_lang", currentLang);
    } catch { /* ignore */ }
  }

  async function changePlayerName() {
    const next = await showNameModal(player.name);
    if (next === player.name) return;
    player.name = next;
    try { localStorage.setItem(PLAYER_NAME_KEY, player.name); } catch { /* ignore */ }
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

    conversationFocusNpcId = target.npc.id;
    setChatSession(target.npc.id, 18_000);
    if (isMobileViewport()) {
      mobileChatOpen = true;
      mobileUtilityOpen = false;
    }
    else if (!panelState.chat) panelState.chat = true;
    if (chatInputEl) chatInputEl.focus();
    applyPanelState();
  }

  function closeMobileChat() {
    if (!isMobileViewport()) return;
    mobileChatOpen = false;
    inputState.runHold = false;
    keys.clear();
    resetJoystick();
    player.moveTarget = null;
    conversationFocusNpcId = null;
    chatSession.npcId = null;
    chatSession.expiresAt = 0;
    if (chatInputEl) chatInputEl.blur();
    applyPanelState();
  }

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
      record.personality || inferPersonalityFromName(record.name),
      randomSpecies()
    );
    npc.x = home.x;
    npc.y = home.y;
    npcs.push(npc);
    return npc;
  }

  function createCustomNpc(nameRaw, personalityRaw) {
    const name = String(nameRaw || "").trim();
    const personality = String(personalityRaw || "").trim() || inferPersonalityFromName(name);
    if (!name) return { ok: false, reason: t("npc_err_no_name") };
    if (npcs.some((n) => n.name === name)) return { ok: false, reason: t("npc_err_dup_name") };
    if (npcs.length >= 48) return { ok: false, reason: t("npc_err_too_many") };

    const id = `custom_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e5).toString(36)}`;
    const home = { x: clamp(player.x + (Math.random() * 2 - 1) * 1.5, 2, world.width - 2), y: clamp(player.y + (Math.random() * 2 - 1) * 1.5, 2, world.height - 2) };
    const npc = makeNpc(id, name, randomPastelColor(), home, pickRandomPlace(), pickRandomPlace(), personality, randomSpecies());
    npc.x = home.x;
    npc.y = home.y;
    npcs.push(npc);
    npcPersonas[id] = { age: "20대", gender: "남성", personality };
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
    if (conversationFocusNpcId === npc.id) conversationFocusNpcId = null;
    if (focusedNpcId === npc.id) focusedNpcId = null;
    if (chatSession.npcId === npc.id) { chatSession.npcId = null; chatSession.expiresAt = 0; }
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
          npcPersonas[item.id] = { age: "20대", gender: "남성", personality: item.personality || inferPersonalityFromName(item.name) };
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
      chatCloseBtn.hidden = !(mobile && mobileChatOpen);
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



  function upsertSpeechBubble(id, text, ttlMs = 3600) {
    const now = nowMs();
    const value = bubbleText(text);
    for (let i = 0; i < speechBubbles.length; i += 1) {
      if (speechBubbles[i].id === id) {
        speechBubbles[i].text = value;
        speechBubbles[i].until = now + ttlMs;
        return;
      }
    }
    speechBubbles.push({ id, text: value, until: now + ttlMs });
    if (speechBubbles.length > 14) speechBubbles.splice(0, speechBubbles.length - 14);
  }

  function resolveSpeakerById(id) {
    if (id === "player") return player;
    if (typeof id === "string" && id.startsWith("remote_")) {
      const key = id.slice(7);
      return mp.remotePlayers[key] || null;
    }
    return npcs.find((n) => n.id === id) || null;
  }

  function addLog(text) {
    logs.unshift({ text, stamp: formatTime() });
    if (logs.length > 16) logs.length = 16;
    if (!uiLog) return;
    const frag = document.createDocumentFragment();
    for (const entry of logs) {
      const row = document.createElement("div");
      const stamp = document.createElement("strong");
      stamp.textContent = entry.stamp;
      row.appendChild(stamp);
      row.appendChild(document.createTextNode(` ${entry.text}`));
      frag.appendChild(row);
    }
    uiLog.replaceChildren(frag);
  }

  function getNpcChats(npcId) {
    if (!npcChatHistories[npcId]) npcChatHistories[npcId] = [];
    return npcChatHistories[npcId];
  }

  function addNpcChat(npcId, speaker, text) {
    const history = getNpcChats(npcId);
    history.unshift({ speaker, text, source: "", stamp: formatTime() });
    if (history.length > 30) history.length = 30;
    renderCurrentChat();
  }

  function addGlobalChat(speaker, text, source) {
    globalChats.unshift({ speaker, text, source: source || "", stamp: formatTime() });
    if (globalChats.length > 24) globalChats.length = 24;
    renderCurrentChat();
  }

  const TOAST_DURATION_MS = 4000;
  function addSystemToast(text) {
    systemToasts.push({ text, stamp: formatTime(), until: performance.now() + TOAST_DURATION_MS });
    if (systemToasts.length > 5) systemToasts.shift();
    renderToasts();
  }

  function addChat(speaker, text, source) {
    if (speaker === "System") { addSystemToast(text); return; }
    if (source === "remote" || source === "local-player") { addGlobalChat(speaker, text, source); return; }
    const targetNpcId = conversationFocusNpcId
      || (chatSession.npcId && performance.now() < chatSession.expiresAt ? chatSession.npcId : null);
    if (targetNpcId) { addNpcChat(targetNpcId, speaker, text); }
    else { addGlobalChat(speaker, text, source); }
  }

  function renderCurrentChat() {
    if (!chatLogEl) return;
    const target = chatTargetNpc();
    const npcNear = target && target.near;
    const mpChat = mp && mp.enabled && !npcNear;

    let messages;
    if (mpChat) {
      messages = globalChats;
    } else if (target && target.npc) {
      messages = getNpcChats(target.npc.id);
    } else if (conversationFocusNpcId) {
      messages = getNpcChats(conversationFocusNpcId);
    } else {
      messages = [];
    }

    const frag = document.createDocumentFragment();
    for (const c of messages) {
      const row = document.createElement("div");
      if (c.source === "remote") row.classList.add("pg-chat-remote");
      else if (c.source === "local-player") row.classList.add("pg-chat-local-player");
      const sp = document.createElement("strong");
      sp.textContent = c.speaker;
      row.appendChild(sp);
      row.appendChild(document.createTextNode(`: ${c.text}`));
      frag.appendChild(row);
    }
    chatLogEl.replaceChildren(frag);
  }

  const toastContainer = document.getElementById("pg-toast-container");
  function renderToasts() {
    if (!toastContainer) return;
    const now = performance.now();
    while (systemToasts.length && systemToasts[0].until <= now) systemToasts.shift();
    const frag = document.createDocumentFragment();
    for (const n of systemToasts) {
      const el = document.createElement("div");
      el.className = "pg-toast";
      el.textContent = n.text;
      frag.appendChild(el);
    }
    toastContainer.replaceChildren(frag);
  }

  function startStreamingChat(npcId, speaker) {
    const history = getNpcChats(npcId);
    const entry = { speaker, text: "", stamp: formatTime(), streaming: true };
    history.unshift(entry);
    if (history.length > 30) history.length = 30;
    renderCurrentChat();
    return {
      append(chunk) {
        entry.text += chunk;
        renderCurrentChat();
      },
      done() {
        entry.streaming = false;
        renderCurrentChat();
      },
      empty() {
        return !entry.text.trim();
      },
      remove() {
        const idx = history.indexOf(entry);
        if (idx >= 0) history.splice(idx, 1);
        renderCurrentChat();
      },
      text() {
        return entry.text;
      },
    };
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

  function setChatSession(npcId, holdMs = 12000) {
    chatSession.npcId = npcId;
    chatSession.expiresAt = nowMs() + holdMs;
  }

  function chatSessionActiveFor(npcId) {
    return chatSession.npcId === npcId && nowMs() < chatSession.expiresAt;
  }

  function activeConversationNpc() {
    const pinned = npcById(conversationFocusNpcId);
    if (pinned && dist(player, pinned) <= CHAT_NEARBY_DISTANCE * 2.0) return pinned;

    const target = chatTargetNpc();
    if (!target) return null;
    if (target.near && isChatTyping()) return target.npc;
    if (target.near && chatSessionActiveFor(target.npc.id)) return target.npc;
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

  function enterBuilding(buildingId) {
    const interior = interiorDefs && interiorDefs[buildingId];
    if (!interior) return;
    sceneState.savedOutdoorPos = { x: player.x, y: player.y };
    sceneState.savedCameraPan = { x: cameraPan.x, y: cameraPan.y };
    sceneState.current = buildingId;
    player.x = interior.spawnPoint.x;
    player.y = interior.spawnPoint.y;
    cameraPan.x = 0;
    cameraPan.y = 0;
    const bld = buildings.find(b => b.id === buildingId);
    addLog(t("log_entered_building", { label: bld?.label || buildingId }));
  }

  function exitBuilding() {
    if (sceneState.current === "outdoor") return;
    sceneState.current = "outdoor";
    if (sceneState.savedOutdoorPos) {
      player.x = sceneState.savedOutdoorPos.x;
      player.y = sceneState.savedOutdoorPos.y;
    }
    if (sceneState.savedCameraPan) {
      cameraPan.x = sceneState.savedCameraPan.x;
      cameraPan.y = sceneState.savedCameraPan.y;
    }
    addLog(t("log_exited_building"));
  }

  function startSceneFade(callback) {
    sceneFade.active = true;
    sceneFade.alpha = 0;
    sceneFade.direction = "in";
    sceneFade.callback = callback;
  }

  function updateSceneFade(dt) {
    if (!sceneFade.active) return;
    const speed = 4.0; // alpha per second
    if (sceneFade.direction === "in") {
      sceneFade.alpha = Math.min(1, sceneFade.alpha + speed * dt);
      if (sceneFade.alpha >= 1) {
        if (sceneFade.callback) sceneFade.callback();
        sceneFade.callback = null;
        sceneFade.direction = "out";
      }
    } else {
      sceneFade.alpha = Math.max(0, sceneFade.alpha - speed * dt);
      if (sceneFade.alpha <= 0) {
        sceneFade.active = false;
      }
    }
  }

  function randomStandPoint() {
    for (let i = 0; i < 60; i += 1) {
      const x = 1.5 + Math.random() * (world.width - 3);
      const y = 1.5 + Math.random() * (world.height - 3);
      if (canStand(x, y)) return { x, y };
    }
    return { x: player.x, y: player.y };
  }

  function pickAutoWalkTarget() {
    const r = Math.random();
    if (r < 0.42 && npcs.length) {
      const npc = npcs[Math.floor(Math.random() * npcs.length)];
      const a = Math.random() * Math.PI * 2;
      const d = 1.1 + Math.random() * 1.1;
      const x = npc.x + Math.cos(a) * d;
      const y = npc.y + Math.sin(a) * d;
      if (canStand(x, y)) return { x, y, reason: "npc", npcId: npc.id };
    }
    if (r < 0.74) {
      const placeArr = Object.values(places);
      const base = placeArr[Math.floor(Math.random() * placeArr.length)];
      const x = base.x + (Math.random() * 2 - 1) * 1.8;
      const y = base.y + (Math.random() * 2 - 1) * 1.8;
      if (canStand(x, y)) return { x, y, reason: "place" };
    }
    const p = randomStandPoint();
    return { x: p.x, y: p.y, reason: "wander" };
  }

  function refreshAutoWalkButton() {
    if (autoWalkBtn) {
      autoWalkBtn.textContent = autoWalk.enabled ? t("autowalk_off") : t("autowalk_on");
      autoWalkBtn.setAttribute("aria-pressed", autoWalk.enabled ? "true" : "false");
    }
    if (mobileAutoWalkBtn) {
      mobileAutoWalkBtn.textContent = autoWalk.enabled ? t("autowalk_off_short") : t("autowalk_on_short");
      mobileAutoWalkBtn.setAttribute("aria-pressed", autoWalk.enabled ? "true" : "false");
      mobileAutoWalkBtn.classList.toggle("pg-pressed", autoWalk.enabled);
    }
  }

  function setAutoWalkEnabled(next, silent = false) {
    autoWalk.enabled = !!next;
    autoWalk.target = null;
    autoWalk.nextPickAt = 0;
    nextAutoConversationAt = 0;
    autoConversationBusy = false;
    playerBubblePending = false;
    if (!autoWalk.enabled) player.moveTarget = null;
    refreshAutoWalkButton();
    try {
      localStorage.setItem(AUTO_WALK_KEY, autoWalk.enabled ? "1" : "0");
    } catch {
      // ignore localStorage errors
    }
    if (!silent) addLog(autoWalk.enabled ? t("log_autowalk_on") : t("log_autowalk_off"));
  }

  function updateAutoWalk(now) {
    if (!autoWalk.enabled) return;
    if (sceneState.current !== "outdoor") return;
    if (player.moveTarget && !player.moveTarget.autoWalk) return;
    if (now < autoWalk.nextPickAt && player.moveTarget && player.moveTarget.autoWalk) return;

    if (!autoWalk.target || now >= autoWalk.nextPickAt) {
      autoWalk.target = pickAutoWalkTarget();
      autoWalk.nextPickAt = now + 1200 + Math.random() * 2200;
      player.moveTarget = {
        x: autoWalk.target.x,
        y: autoWalk.target.y,
        autoWalk: true,
        npcId: autoWalk.target.npcId || null,
      };
    }
  }

  function npcAmbientLine(npc) {
    const mem = ensureMemoryFormat(npc);
    if (mem.entries.length > 0 && Math.random() < 0.3) {
      const memLines = [];
      const giftEntries = mem.entries.filter((e) => e.type === "gift");
      const questEntries = mem.entries.filter((e) => e.type === "quest");
      if (giftEntries.length > 0) {
        const last = giftEntries[giftEntries.length - 1];
        memLines.push(last.metadata.item ? t("ambient_gift_remember") : t("ambient_gift_thanks"));
      }
      if (questEntries.length > 0) {
        memLines.push(t("ambient_quest_memory"));
      }
      if (npc.favorLevel >= 2) {
        memLines.push(t("ambient_meet_often"));
      }
      if (mem.conversationCount >= 5) {
        memLines.push(t("ambient_talked_alot"));
      }
      if (memLines.length > 0) return memLines[Math.floor(Math.random() * memLines.length)];
    }

    const bySpecies = {
      human_a: [t("ambient_a1"), t("ambient_a2")],
      human_b: [t("ambient_b1"), t("ambient_b2")],
      human_c: [t("ambient_c1"), t("ambient_c2")],
      human_d: [t("ambient_d1"), t("ambient_d2")],
      human_e: [t("ambient_e1"), t("ambient_e2")],
      human_f: [t("ambient_f1"), t("ambient_f2")],
      human_g: [t("ambient_g1"), t("ambient_g2")],
      human_h: [t("ambient_h1"), t("ambient_h2")],
      human_i: [t("ambient_i1"), t("ambient_i2")],
    };
    const fallback = [t("ambient_fallback_1"), t("ambient_fallback_2"), t("ambient_fallback_3"), t("ambient_fallback_4")];
    const pool = bySpecies[npc.species] || fallback;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function playerFallbackLine() {
    const lines = [t("player_line_1"), t("player_line_2"), t("player_line_3")];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  async function llmReplyOrEmpty(npc, prompt) {
    if (!LLM_API_URL) return "";
    if (debugMode) {
      console.log(`%c[LLM DEBUG] llmReplyOrEmpty → ${npc.name}: ${prompt.slice(0, 80)}...`, 'color:#ff9800');
    }
    try {
      const llm = await requestLlmNpcReply(npc, prompt);
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

  async function requestLlmPlayerLine(nearNpc = null) {
    const proxy = {
      id: "player_inner_voice",
      name: player.name,
      personality: "따뜻하고 호기심 많으며 짧게 말하는 성격",
      species: player.species || "cat",
      color: player.color,
    };
    const contextNpc = nearNpc ? `${nearNpc.name} 근처` : "혼자 산책";
    const prompt = `현재 시각 ${formatTime()}, ${contextNpc}. 플레이어가 말풍선으로 짧게 말할 한 문장만 한국어로 답해줘. 16자 내외, 따뜻한 톤.`;
    const reply = await llmReplyOrEmpty(proxy, prompt);
    return bubbleText(reply || playerFallbackLine());
  }

  async function requestLlmNpcAutoReply(npc, playerLine) {
    const prompt = `플레이어(${player.name})가 "${playerLine}" 라고 말했다. ${npc.name}이(가) 친근하게 짧게 답하는 한 문장만 한국어로 답해줘. 18자 내외.`;
    const reply = await llmReplyOrEmpty(npc, prompt);
    return bubbleText(reply || npcAmbientLine(npc));
  }

  function maybeRunAutoConversation(now) {
    if (!autoWalk.enabled || autoConversationBusy || now < nextAutoConversationAt) return;
    if (isTypingInInput() || (chatInputEl && document.activeElement === chatInputEl)) return;
    const near = nearestNpc(1.75);
    if (!near || !near.npc || near.npc.talkCooldown > 0) return;
    const npc = near.npc;

    autoConversationBusy = true;
    npc.talkCooldown = Math.max(npc.talkCooldown, 4.2);
    setChatSession(npc.id, 9000);
    nextAutoConversationAt = now + 13000 + Math.random() * 12000;

    (async () => {
      const playerLine = await requestLlmPlayerLine(npc);
      upsertSpeechBubble("player", playerLine, 3000);
      addChat(player.name, playerLine);
      const npcLine = await requestLlmNpcAutoReply(npc, playerLine);
      upsertSpeechBubble(npc.id, npcLine, 3200);
      addChat(npc.name, npcLine);
    })()
      .finally(() => {
        autoConversationBusy = false;
      });
  }

  // 분위기 표현 (LLM 없이)
  const ambientSolo = t("ambient_solo");
  const ambientChat = t("ambient_chat");
  const ambientMood = { happy: t("ambient_mood_happy"), sad: t("ambient_mood_sad"), neutral: t("ambient_mood_neutral") };
  function ambientEmoji(npc, nearOther) {
    if (nearOther) return ambientChat[Math.floor(Math.random() * ambientChat.length)];
    const mood = (npc.moodUntil > nowMs() && npc.mood !== "neutral") ? npc.mood : "neutral";
    const pool = ambientMood[mood] || ambientSolo;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function updateAmbientSpeech(now) {
    for (let i = speechBubbles.length - 1; i >= 0; i -= 1) {
      if (speechBubbles[i].until <= now) speechBubbles.splice(i, 1);
    }

    if (now >= nextAmbientBubbleAt) {
      nextAmbientBubbleAt = now + 8000 + Math.random() * 12000;
      const visible = npcs.filter((n) => dist(n, player) < 15 && !chatSessionActiveFor(n.id));
      if (visible.length) {
        // 가장 가까운 NPC → LLM 혼잣말, 나머지 → "..."
        visible.sort((a, b) => dist(a, player) - dist(b, player));
        const closest = visible[0];
        // 먼 NPC들에게 분위기 말풍선
        for (let i = 1; i < Math.min(visible.length, 4); i++) {
          const nearOther = npcs.some(o => o.id !== visible[i].id && dist(visible[i], o) < 3);
          if (Math.random() < 0.3) upsertSpeechBubble(visible[i].id, ambientEmoji(visible[i], nearOther), 2500);
        }
        // 가장 가까운 NPC는 LLM으로 혼잣말
        if (!ambientLlmPending) {
          ambientLlmPending = true;
          upsertSpeechBubble(closest.id, ambientEmoji(closest, false), 6000);
          const n = closest.needs || {};
          const needHint = n.hunger > 60 ? "배가 고픈 상태." : n.energy < 30 ? "피곤한 상태." : n.social < 30 ? "외로운 상태." : n.fun < 20 ? "심심한 상태." : n.duty > 70 ? "일해야 하는 상태." : "";
          const _wKo = { clear: "맑음", cloudy: "흐림", rain: "비", storm: "폭풍", snow: "눈", fog: "안개" };
          const _tw = `현재 ${formatTime()}, 날씨: ${_wKo[weather.current] || "맑음"}.`;
          llmReplyOrEmpty(closest, `(${_tw} ${needHint} 지금 느끼는 것을 자연스럽게 중얼거려주세요. "~하다", "~네" 식의 독백. 10자 이내.)`)
            .then((line) => {
              if (line) upsertSpeechBubble(closest.id, line, 4000);
            })
            .finally(() => { ambientLlmPending = false; });
        }
      }
    }

    if (autoWalk.enabled && now >= nextPlayerBubbleAt && !playerBubblePending) {
      nextPlayerBubbleAt = now + 12000 + Math.random() * 14000;
      playerBubblePending = true;
      const near = nearestNpc(2.4);
      requestLlmPlayerLine(near ? near.npc : null)
        .then((line) => {
          upsertSpeechBubble("player", line, 2800);
        })
        .finally(() => {
          playerBubblePending = false;
        });
    }

    // NPC 선제적 말 걸기: 가까이 + 호감도 있으면 가끔 먼저 인사
    if (!npcProactiveGreetPending && now > nextNpcProactiveAt && !conversationFocusNpcId) {
      nextNpcProactiveAt = now + 20000 + Math.random() * 30000;
      const close = npcs.filter(n => dist(n, player) < 3.5 && !chatSessionActiveFor(n.id) && n.talkCooldown <= 0 && !(npcPersonas[n.id] && npcPersonas[n.id].isDocent));
      if (close.length && Math.random() < 0.15) {
        const npc = close[Math.floor(Math.random() * close.length)];
        npcProactiveGreetPending = true;
        npc.pose = "waving";
        // 기억 기반 선제 인사 프롬프트
        const mem = ensureMemoryFormat(npc);
        const lastChat = mem.entries.filter(e => e.type === "chat").slice(-1)[0];
        const memHint = lastChat
          ? `지난 대화: "${lastChat.summary.slice(0, 30)}".`
          : "처음 보는 사람입니다.";
        const greetPrompt = npc.favorLevel >= 1
          ? `(${memHint} 친한 플레이어가 근처에 있습니다. 과거를 자연스럽게 언급하며 반갑게 말 걸어주세요. 15자 이내.)`
          : `(${memHint} 플레이어가 근처에 있습니다. 가볍게 인사해주세요. 15자 이내.)`;
        llmReplyOrEmpty(npc, greetPrompt)
          .then((line) => {
            if (line) {
              addChat(npc.name, line);
              upsertSpeechBubble(npc.id, line, 4000);
              conversationFocusNpcId = npc.id;
              setChatSession(npc.id, 15_000);
            }
          })
          .finally(() => {
            npcProactiveGreetPending = false;
            setTimeout(() => { npc.pose = "standing"; }, 3000);
          });
      }
    }

    maybeRunAutoConversation(now);
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
    const pinned = npcById(conversationFocusNpcId);
    if (pinned) {
      const pd = dist(player, pinned);
      if (pd <= CHAT_NEARBY_DISTANCE) return { npc: pinned, focused: true, near: true };
      if (pd <= CHAT_NEARBY_DISTANCE * 2.0) return { npc: pinned, focused: true, near: false };
      conversationFocusNpcId = null;
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
      if (guideGreetingPhase === 1) {
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
  function showQuestBoardMenu() { _showQuestBoardMenu(questCtx()); questBoardMenuActive = true; }
  function handleQuestBoardChoice(choice) { questBoardMenuActive = false; return _handleQuestBoardChoice(choice, questCtx()); }

  // ─── 도슨트 환영 업데이트 ───
  function updateGuideGreeting(dt) {
    if (guideGreetingPhase === 2) return;
    const guideNpc = npcs.find(n => n.id === "guide");
    if (!guideNpc) { guideGreetingPhase = 2; return; }

    if (guideGreetingPhase === 0) {
      guideGreetingTimer += dt;
      if (guideGreetingTimer >= 3) {
        guideGreetingPhase = 1;
        guideNpc.roamTarget = { x: player.x, y: player.y };
        guideNpc.roamWait = 0;
      }
      return;
    }

    if (guideGreetingPhase === 1) {
      if (!guideNpc.roamTarget || dist(guideNpc.roamTarget, player) > 2) {
        guideNpc.roamTarget = { x: player.x, y: player.y };
      }
      if (dist(guideNpc, player) < 2.5) {
        guideGreetingPhase = 2;
        guideNpc.pose = "waving";
        const hi = t("docent_hi");
        addChat(guideNpc.name, hi);
        upsertSpeechBubble(guideNpc.id, hi, 5000);
        setTimeout(() => {
          const hi2 = t("docent_hi2");
          addChat(guideNpc.name, hi2);
          upsertSpeechBubble(guideNpc.id, hi2, 4000);
          guideNpc.pose = "standing";
        }, 4000);
        guideNpc.roamTarget = null;
        guideNpc.roamWait = 6;
      }
    }
  }

  // ─── 도슨트 안내소 시스템 ───
  let docentMenuActive = false;
  let questBoardMenuActive = false;

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
        const levelName = favorLevelNames[npc.favorLevel] || t("relation_stranger");
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
      startSceneFade(() => exitBuilding());
      return true;
    }

    // Door hotspots → enter building
    const buildingId = doorToBuildingMap[hs.id];
    if (buildingId) {
      if (interiorDefs && interiorDefs[buildingId]) {
        startSceneFade(() => enterBuilding(buildingId));
      } else {
        const bld = buildings.find(b => b.id === buildingId);
        addLog(t("log_checked_building", { label: bld?.label || buildingId }));
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
      showDocentMenu();
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
      const candidates = npcs.filter(n => Math.hypot(n.x - player.x, n.y - player.y) < 25 && !(npcPersonas[n.id] && npcPersonas[n.id].isDocent));
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
      conversationFocusNpcId = near.npc.id;
      setChatSession(near.npc.id, 18_000);
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
        near.npc.talkCooldown = 3.5;
        // 도슨트 NPC는 항상 안내소 메뉴 표시
        if (npcPersonas[near.npc.id] && npcPersonas[near.npc.id].isDocent) {
          showDocentMenu();
        } else if (near.npc.activeRequest && checkFavorCompletion(near.npc)) {
          // favor quest handled
        } else if (!handleQuestNpcTalk(near.npc)) {
          // AI NPC: LLM으로 인사 생성
          const greetNpc = near.npc;
          (async () => {
            try {
              const reply = await llmReplyOrEmpty(greetNpc, "(플레이어가 E키로 말을 걸었습니다. 짧게 인사해주세요.)");
              addChat(greetNpc.name, reply || t("sys_llm_lost"));
            } catch {
              addChat(greetNpc.name, t("sys_llm_lost"));
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

  // NPC의 LLM 응답에서 감정 추론 (AI가 맥락을 이해하고 답했으므로 응답 분석이 더 정확)
  function inferSentimentFromReply(replyText) {
    const t = replyText.toLowerCase();
    if (/(고마워|반가|좋은|기뻐|재밌|행복|최고|사랑|감동|응원|좋아해|함께|친구|헤헤|ㅎㅎ|감사|축하|대단|멋져)/.test(t))
      return { sentiment: "positive", intensity: 2 };
    if (/(응|맞아|그래|좋아|괜찮|그럴게|알겠|오|와)/.test(t))
      return { sentiment: "positive", intensity: 1 };
    if (/(싫|짜증|그만|화나|실망|별로|최악|됐어|하지\s?마|무례)/.test(t))
      return { sentiment: "negative", intensity: 2 };
    if (/(\?|뭐|어떻게|왜|정말|진짜|궁금)/.test(t))
      return { sentiment: "curious", intensity: 1 };
    return { sentiment: "neutral", intensity: 0 };
  }

  function applyConversationEffect(npc, playerMsg, npcReplyText, emotion) {
    // structured output의 emotion 사용, 없으면 텍스트에서 추론
    let sentiment, intensity;
    if (emotion && emotion !== "neutral") {
      sentiment = emotion;
      intensity = (sentiment === "happy" || sentiment === "angry") ? 2 : 1;
    } else {
      ({ sentiment, intensity } = inferSentimentFromReply(npcReplyText));
    }
    const relKey = relationKeyForNpc(npc.id);

    if (sentiment === "positive" || sentiment === "happy") {
      if (relKey) adjustRelation(relKey, intensity * 2);
      npc.favorPoints += Math.round(intensity * 2 * 1 * 1);
      if (intensity >= 2) {
        npc.mood = "happy";
        npc.moodUntil = nowMs() + 20_000;
      }
    } else if (sentiment === "negative" || sentiment === "sad" || sentiment === "angry") {
      if (relKey) adjustRelation(relKey, -intensity * 2);
      npc.favorPoints = Math.max(0, npc.favorPoints - intensity);
      npc.mood = "sad";
      npc.moodUntil = nowMs() + 15_000;
    } else if (sentiment === "curious") {
      if (relKey) adjustRelation(relKey, 1);
    }

    if (npc.favorPoints >= 100) {
      npc.favorLevel = Math.min(npc.favorLevel + 1, 4);
      npc.favorPoints = 0;
      addNpcMemory(npc, "favor", `관계가 '${favorLevelNames[npc.favorLevel]}'(으)로 발전`);
    }
  }

  async function requestLlmNpcReply(npc, userMessage) {
    if (!LLM_API_URL) throw new Error("LLM API URL is empty");

    const persona = npcPersonas[npc.id] || {
      age: "20대",
      gender: "남성",
      personality: npc.personality || inferPersonalityFromName(npc.name),
    };
    const near = nearestNpc(CHAT_NEARBY_DISTANCE);
    const payload = {
      npcId: npc.id,
      npcName: npc.name,
      persona,
      userMessage,
      lang: currentLang,
      worldContext: {
        time: formatTime(),
        objective: quest.objective,
        questDone: quest.done,
        nearby: near ? near.npc.name : "none",
        relationSummary: {
          playerToHeo: relations.playerToHeo,
          playerToKim: relations.playerToKim,
          playerToChoi: relations.playerToChoi,
          heoToKim: relations.heoToKim,
        },
      },
      recentMessages: getNpcChats(npc.id).slice(0, 8).reverse(),
      memory: getNpcMemorySummary(npc),
      tone: getMemoryBasedTone(npc),
      socialContext: getNpcSocialContext(npc),
      favorLevel: npc.favorLevel || 0,
      npcNeeds: npc.needs ? { hunger: Math.round(npc.needs.hunger), energy: Math.round(npc.needs.energy), social: Math.round(npc.needs.social), fun: Math.round(npc.needs.fun), duty: Math.round(npc.needs.duty) } : null,
    };

    if (debugMode) {
      console.group(`%c[LLM DEBUG] Request → ${npc.name} (${npc.id})`, 'color:#00bcd4;font-weight:bold');
      console.log('Payload:', JSON.parse(JSON.stringify(payload)));
      console.groupEnd();
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort("LLM request timeout (15s)"), 15000);
    try {
      const headers = await buildApiHeaders("npc_chat");
      if (debugMode) headers["x-debug"] = "1";
      const res = await fetch(LLM_API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`LLM HTTP ${res.status}`);
      }
      const data = await res.json();
      const reply = (data && typeof data.reply === "string" && data.reply.trim()) || "";
      if (!reply) throw new Error("Empty LLM reply");
      const model = (data && typeof data.model === "string" && data.model.trim()) || "gemini";
      const suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
      const result = {
        reply, model, suggestions,
        emotion: data.emotion || "neutral",
        farewell: !!data.farewell,
        action: data.action || { type: "none", target: "" },
        mention: data.mention || { npc: null, place: null },
      };
      if (debugMode) {
        console.group(`%c[LLM DEBUG] Response ← ${npc.name} (${model})`, 'color:#4caf50;font-weight:bold');
        if (data._debug?.prompt) {
          console.log('%c── Full Prompt (서버 조립) ──', 'color:#e91e63;font-weight:bold');
          console.log(data._debug.prompt);
        }
        console.log('Reply:', reply);
        console.log('Emotion:', result.emotion, '| Farewell:', result.farewell);
        console.log('Action:', result.action);
        console.log('Suggestions:', suggestions);
        console.log('Mention:', result.mention);
        console.groupEnd();
      }
      return result;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function requestLlmNpcReplyStream(npc, userMessage, onChunk) {
    if (!LLM_STREAM_API_URL) throw new Error("LLM stream API URL is empty");

    const persona = npcPersonas[npc.id] || {
      age: "20대",
      gender: "남성",
      personality: npc.personality || inferPersonalityFromName(npc.name),
    };
    const near = nearestNpc(CHAT_NEARBY_DISTANCE);
    const payload = {
      npcId: npc.id,
      npcName: npc.name,
      persona,
      userMessage,
      lang: currentLang,
      worldContext: {
        time: formatTime(),
        objective: quest.objective,
        questDone: quest.done,
        nearby: near ? near.npc.name : "none",
        relationSummary: {
          playerToHeo: relations.playerToHeo,
          playerToKim: relations.playerToKim,
          playerToChoi: relations.playerToChoi,
          heoToKim: relations.heoToKim,
        },
      },
      recentMessages: getNpcChats(npc.id).slice(0, 8).reverse(),
      memory: getNpcMemorySummary(npc),
      tone: getMemoryBasedTone(npc),
      socialContext: getNpcSocialContext(npc),
      favorLevel: npc.favorLevel || 0,
      npcNeeds: npc.needs ? { hunger: Math.round(npc.needs.hunger), energy: Math.round(npc.needs.energy), social: Math.round(npc.needs.social), fun: Math.round(npc.needs.fun), duty: Math.round(npc.needs.duty) } : null,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const headers = await buildApiHeaders("npc_chat_stream");
      const res = await fetch(LLM_STREAM_API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error(`LLM stream HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let model = "gemini";
      let reply = "";
      let done = false;
      let streamMeta = {};
      const findBoundary = (text) => {
        const a = text.indexOf("\n\n");
        const b = text.indexOf("\r\n\r\n");
        if (a === -1) return b;
        if (b === -1) return a;
        return Math.min(a, b);
      };

      const parseSseBlock = (block) => {
        const lines = String(block || "").split("\n");
        let event = "message";
        const dataLines = [];
        for (const raw of lines) {
          const line = raw.trimEnd();
          if (!line || line.startsWith(":")) continue;
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
        }
        const dataText = dataLines.join("\n").trim();
        if (!dataText) return;
        let data = {};
        try {
          data = JSON.parse(dataText);
        } catch {
          data = { message: dataText };
        }

        if (event === "model") {
          model = data.model || model;
        } else if (event === "chunk") {
          const text = data.text || "";
          if (!text) return;
          reply += text;
          if (onChunk) onChunk(text);
        } else if (event === "error") {
          throw new Error(data.message || "stream error");
        } else if (event === "done") {
          done = true;
          streamMeta = data || {};
        }
      };

      while (true) {
        const { value, done: readerDone } = await reader.read();
        if (readerDone) break;
        buffer += decoder.decode(value, { stream: true });
        let idx = findBoundary(buffer);
        while (idx !== -1) {
          const block = buffer.slice(0, idx);
          const sepLen = buffer.startsWith("\r\n\r\n", idx) ? 4 : 2;
          buffer = buffer.slice(idx + sepLen);
          parseSseBlock(block);
          idx = findBoundary(buffer);
        }
      }
      if (buffer.trim()) parseSseBlock(buffer);
      if (!done && !reply.trim()) throw new Error("empty stream reply");
      return {
        reply, model,
        suggestions: Array.isArray(streamMeta.suggestions) ? streamMeta.suggestions : [],
        emotion: streamMeta.emotion || "neutral",
        farewell: !!streamMeta.farewell,
        action: streamMeta.action || { type: "none", target: "" },
        mention: streamMeta.mention || { npc: null, place: null },
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  // 키워드 기반 액션 감지 (스트리밍 폴백)
  // NPC 응답 텍스트에서 follow/guide 의도를 감지하여 action 객체를 반환
  function detectActionFromReply(npc, replyText) {
    const text = replyText.toLowerCase();

    // 동행해제 감지 (follow 해제보다 먼저 체크)
    if (/(그만\s*따라|동행.*끝|헤어지|각자|따로\s*가|이만\s*가|그럼\s*여기서|돌아가|다시\s*내\s*할\s*일|stop\s*follow|unfollow)/i.test(replyText)) {
      return { type: "unfollow", target: "" };
    }

    // 동행 감지
    if (/(따라갈|같이\s*가|함께\s*가|동행|따라올|따라가|같이\s*다니|같이\s*걸|데려다|나를\s*따|내가\s*따|follow|let'?s\s*go\s*together|come\s*with|i'?ll\s*follow)/i.test(replyText)) {
      return { type: "follow", target: "" };
    }

    // NPC 안내 감지 — "~에게 가자" / "~를 만나러" / "~한테 데려다줄게"
    const npcGuidePatterns = [
      /(?:에게|한테|만나러|찾아|소개해|데려다|안내해)\s*(?:가자|갈게|줄게|주|가|보자)/,
      /(?:take\s*you\s*to|show\s*you\s*where|let\s*me\s*introduce|bring\s*you\s*to)/i,
    ];
    if (npcGuidePatterns.some(p => p.test(replyText))) {
      // NPC 이름으로 대상 감지
      for (const otherNpc of npcs) {
        if (otherNpc.id === npc.id) continue;
        if (replyText.includes(otherNpc.name) || replyText.includes(otherNpc.id)) {
          return { type: "guide_npc", target: otherNpc.id };
        }
      }
    }

    // 장소 안내 감지 — "~로 가자" / "~에 데려다줄게" / "보여줄게"
    const placeGuidePatterns = [
      /(안내|가자|데려다|보여줄|가\s*볼래|가\s*볼까|같이.*가|따라.*와|따라.*오|알려\s*줄)/,
      /(take\s*you|show\s*you|let'?s\s*go\s*to|guide\s*you|head\s*to)/i,
    ];
    if (placeGuidePatterns.some(p => p.test(replyText))) {
      // 장소 이름 매칭 (한국어 label → place key)
      const placeAliases = {
        "공원": "park", "광장": "plaza", "안내소": "infoCenter", "게시판": "questBoard",
        "카페": "cafe", "빵집": "bakery", "사무실": "office", "시장": "market",
        "꽃집": "florist", "도서관": "library", "편의점": "convenience", "음식점": "restaurant",
        "주택": "homeA", "체육관": "gym", "병원": "hospital", "경찰서": "police",
        "고려대": "korea_univ", "고려대학교": "korea_univ",
        "크래프톤": "krafton_ai", "KAIST": "kaist_ai", "카이스트": "kaist_ai",
        "KSA": "ksa_main", "본관": "ksa_main", "기숙사": "ksa_dorm",
      };
      for (const [alias, key] of Object.entries(placeAliases)) {
        if (replyText.includes(alias) && places[key]) {
          return { type: "guide_place", target: key };
        }
      }
    }

    return { type: "none", target: "" };
  }

  async function sendChatMessage(msg) {
    // 도슨트 안내소 메뉴 처리
    if (docentMenuActive && /^[1-4]$/.test(msg.trim())) {
      addChat("You", msg.trim());
      if (!handleDocentChoice(msg.trim())) {
        addChat("System", t("sys_select_1_to_4"));
      }
      return;
    }
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
        const candidates = npcs.filter(n => Math.hypot(n.x - player.x, n.y - player.y) < 25);
        if (!candidates.length) {
          addChat("System", t("sys_tag_no_npc"));
        } else {
          const target = candidates[Math.floor(Math.random() * candidates.length)];
          addChat("You", t("sys_tag_chat_you"));
          addChat(target.name, t("sys_tag_chat_npc"));
          conversationFocusNpcId = null;
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
    conversationFocusNpcId = npc.id;
    addNpcChat(npc.id, "You", msg);
    upsertSpeechBubble("player", msg, 3000);
    if (!target.near) {
      moveNearNpcTarget(target.npc);
      addSystemToast(t("toast_moving_to_npc", { name: target.npc.name }));
      return;
    }

    setChatSession(npc.id, 90000);
    if (chatSendEl) chatSendEl.disabled = true;
    if (chatInputEl) chatInputEl.disabled = true;
    let reply = "";
    let serverSuggestions = [];
    let serverEmotion = "neutral";
    let serverFarewell = false;
    let serverAction = { type: "none", target: "" };
    let serverMention = { npc: null, place: null };

    // 응답 대기 중 . . . 표시
    upsertSpeechBubble(npc.id, ". . .", 15000);
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
      reply = t("sys_llm_lost");
    } finally {
      if (chatSendEl) chatSendEl.disabled = false;
      if (chatInputEl) chatInputEl.disabled = false;
      if (chatInputEl) chatInputEl.focus();
    }
    setChatSession(npc.id, 90000);

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
            description: t("favor_request_bring", { label: itemTypes[reqTarget].label }),
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
            description: t("favor_request_bring", { label: info.label }),
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
          addChat("System", t("sys_received_item", { npc: npc.name, label: itemTypes[act.target].label }));
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
      addNpcMemory(npc, "chat", `플레이어: "${shortMsg}" → 나: "${shortReply}"`);
      const mem = ensureMemoryFormat(npc);
      mem.conversationCount += 1;
      mem.lastConversation = world.totalMinutes;

      // 대화 종료 감지: structured farewell 또는 텍스트 패턴
      const farewellPattern = /(안녕|잘\s?가|다음에|나중에|바이|bye|또\s?봐|가\s?볼게|이만|할\s?일|다시\s?보자|그럼\s?이만|갈게)/i;
      if (serverFarewell || farewellPattern.test(cleanReply)) {
        if (npc.following) npc.following = false;
        syncMemoryToServer(); // 대화 종료 시 기억 서버 동기화
        setTimeout(() => {
          if (conversationFocusNpcId === npc.id) {
            conversationFocusNpcId = null;
            chatSession.npcId = null;
            chatSession.expiresAt = 0;
          }
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

    processGossip();
    updateNpcSocialInteractions();
    checkSeasonChange();
  }

  let nextNpcSocialAt = 0;
  let socialGossipLlmPending = false;

  function updateNpcSocialInteractions() {
    const now = nowMs();
    if (now < nextNpcSocialAt) return;
    nextNpcSocialAt = now + 8_000 + Math.random() * 12_000;

    for (const a of npcs) {
      for (const b of npcs) {
        if (a.id >= b.id) continue;
        if (dist(a, b) > 3.0) continue;
        const rel = getNpcRelation(a.id, b.id);
        if (rel >= 60 && Math.random() < 0.3) {
          adjustNpcRelation(a.id, b.id, 1);
        } else if (rel < 40 && Math.random() < 0.2) {
          adjustNpcRelation(a.id, b.id, -1);
        }
        if (Math.random() < 0.15 && dist(player, a) < 8 && !socialGossipLlmPending) {
          const relLabel = npcRelationLabel(rel);
          const sentiment = rel >= 60 ? "positive" : rel < 35 ? "negative" : "neutral";
          socialGossipLlmPending = true;
          const gossipPrompt = `(${b.name}과의 관계: ${relLabel}. ${b.name}을 떠올리며 중얼거려주세요. "${b.name} ~하다" 식의 독백. 10자 이내.)`;
          llmReplyOrEmpty(a, gossipPrompt).then((line) => {
            if (line) {
              upsertSpeechBubble(a.id, line, 3500);
            }
          }).finally(() => { socialGossipLlmPending = false; });
          spreadGossip(a.id, b.id, "relationship", sentiment);
        }
      }
    }
  }

  function saveState() {
    const state = {
      world: {
        totalMinutes: world.totalMinutes,
        paused: world.paused,
        zoom: world.zoom,
        cameraPan,
      },
      player: {
        name: player.name,
        x: player.x,
        y: player.y,
      },
      sceneState: {
        current: sceneState.current,
        savedOutdoorPos: sceneState.savedOutdoorPos,
        savedCameraPan: sceneState.savedCameraPan,
      },
      relations,
      quest,
      npcs: npcs
        .filter((n) => !n.id.startsWith("shared_") && !n.id.startsWith("custom_"))
        .map((n) => ({
          id: n.id, x: n.x, y: n.y, talkCooldown: n.talkCooldown,
          favorLevel: n.favorLevel, favorPoints: n.favorPoints,
          memory: n.memory,
          currentScene: n.currentScene || "outdoor",
        })),
      inventory: { ...inventory },
      removedNpcIds: [...removedNpcIds],
      discoveredIds: discoveries.filter(d => d.found).map(d => d.id),
      questHistory: questHistory.slice(),
      questCount,
      npcSocialGraph: { ...npcSocialGraph },
    };

    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    addLog(t("sys_save_ok"));
  }

  function loadState() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      addLog(t("sys_no_save"));
      return;
    }

    try {
      const state = JSON.parse(raw);
      if (state.world) {
        world.totalMinutes = state.world.totalMinutes ?? world.totalMinutes;
        world.paused = !!state.world.paused;
        world.zoom = clamp(Math.max(state.world.zoom ?? DEFAULT_ZOOM, 2.0), ZOOM_MIN, ZOOM_MAX);
        cameraPan.x = clamp((state.world.cameraPan && state.world.cameraPan.x) || 0, -320, 320);
        cameraPan.y = clamp((state.world.cameraPan && state.world.cameraPan.y) || 0, -220, 220);
      }
      if (state.player) {
        player.name = normalizePlayerName(state.player.name ?? player.name);
        try {
          localStorage.setItem(PLAYER_NAME_KEY, player.name);
        } catch {
          // ignore localStorage errors
        }
        player.x = clamp(state.player.x ?? player.x, 1, world.width - 1);
        player.y = clamp(state.player.y ?? player.y, 1, world.height - 1);
        if (!canStand(player.x, player.y)) {
          player.x = places.plaza.x;
          player.y = places.plaza.y;
        }
      }
      if (state.sceneState) {
        sceneState.current = state.sceneState.current || "outdoor";
        sceneState.savedOutdoorPos = state.sceneState.savedOutdoorPos || null;
        sceneState.savedCameraPan = state.sceneState.savedCameraPan || null;
      }
      if (state.relations) {
        Object.assign(relations, state.relations);
      }
      if (state.quest) {
        quest.stage = state.quest.stage ?? quest.stage;
        quest.objective = state.quest.objective || quest.objective;
        quest.title = state.quest.title || quest.title;
        quest.done = !!state.quest.done;
        quest.dynamic = !!state.quest.dynamic;
        quest.dynamicStages = state.quest.dynamicStages || null;
        quest.questType = state.quest.questType || null;
        quest.primaryNpcId = state.quest.primaryNpcId || null;
        quest.startedAt = state.quest.startedAt || 0;
        quest._stageCount = state.quest._stageCount || (quest.dynamicStages ? quest.dynamicStages.length : 3);
      }
      if (Array.isArray(state.questHistory)) {
        questHistory.length = 0;
        for (const h of state.questHistory) questHistory.push(h);
      }
      if (state.questCount != null) questCount = state.questCount;
      if (Array.isArray(state.npcs)) {
        for (const savedNpc of state.npcs) {
          const npc = npcs.find((n) => n.id === savedNpc.id);
          if (!npc) continue;
          if (savedNpc.currentScene) npc.currentScene = savedNpc.currentScene;
          const npcLoadScene = npc.currentScene || "outdoor";
          if (npcLoadScene === "outdoor") {
            npc.x = clamp(savedNpc.x ?? npc.x, 1, world.width - 1);
            npc.y = clamp(savedNpc.y ?? npc.y, 1, world.height - 1);
            if (!canStandInScene(npc.x, npc.y, "outdoor")) {
              npc.x = npc.home.x;
              npc.y = npc.home.y;
            }
          } else {
            npc.x = savedNpc.x ?? npc.x;
            npc.y = savedNpc.y ?? npc.y;
          }
          npc.talkCooldown = Math.max(0, savedNpc.talkCooldown || 0);
          if (savedNpc.favorLevel != null) npc.favorLevel = savedNpc.favorLevel;
          if (savedNpc.favorPoints != null) npc.favorPoints = savedNpc.favorPoints;
          if (savedNpc.memory) {
            npc.memory = savedNpc.memory;
            ensureMemoryFormat(npc);
          }
        }
      }
      if (state.inventory) {
        for (const [k, v] of Object.entries(state.inventory)) {
          if (k in inventory) inventory[k] = Math.max(0, v || 0);
        }
      }
      if (Array.isArray(state.removedNpcIds)) {
        for (const id of state.removedNpcIds) {
          if (!removedNpcIds.has(id)) {
            const idx = npcs.findIndex((n) => n.id === id);
            if (idx !== -1) {
              npcs.splice(idx, 1);
              delete npcPersonas[id];
            }
            removedNpcIds.add(id);
          }
        }
      }
      if (Array.isArray(state.discoveredIds)) {
        for (const id of state.discoveredIds) {
          const d = discoveries.find(dd => dd.id === id);
          if (d) d.found = true;
        }
      }
      if (state.npcSocialGraph) {
        for (const [k, v] of Object.entries(state.npcSocialGraph)) {
          npcSocialGraph[k] = clamp(v, 0, 100);
        }
      }
      refreshRemoveSelect();
      addLog(t("sys_load_ok"));
    } catch (err) {
      addLog(t("log_load_fail"));
    }
  }

  function updatePlayer(dt) {
    if (isMobileViewport() && mobileChatOpen) {
      keys.clear();
      player.moveTarget = null;
      inputState.runHold = false;
      resetJoystick();
      return;
    }

    if (isTypingInInput()) {
      keys.clear();
      player.moveTarget = null;
      return;
    }

    let keyDx = 0;
    let keyDy = 0;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) keyDx -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) keyDx += 1;
    if (keys.has("KeyW") || keys.has("ArrowUp")) keyDy -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) keyDy += 1;

    const manualDx = keyDx + inputState.joyX;
    const manualDy = keyDy + inputState.joyY;
    let dx = manualDx;
    let dy = manualDy;

    if ((manualDx || manualDy) && autoWalk.enabled) {
      setAutoWalkEnabled(false);
    }

    if (!manualDx && !manualDy) {
      updateAutoWalk(nowMs());
    }

    if (manualDx || manualDy) {
      player.moveTarget = null;
    } else if (player.moveTarget) {
      const tx = player.moveTarget.x - player.x;
      const ty = player.moveTarget.y - player.y;
      const td = Math.hypot(tx, ty);
      if (td <= 0.08) {
        player.moveTarget = null;
      } else {
        dx = tx / td;
        dy = ty / td;
      }
    }

    const mag = Math.hypot(dx, dy);
    if (!mag) {
      // 가만히 있으면 idle 시간 누적 → 자동 앉기
      player.idleTime += dt;
      if (player.idleTime > 5 && player.pose === "standing") {
        const sittable = ["bench", "chair", "stool", "armchair", "bean_bag", "floor_cushion", "gaming_chair"];
        // 실외: props에서 찾기, 실내: furniture에서 찾기
        let seat = props.find(p => sittable.includes(p.type) && dist(player, p) < 1.0);
        if (!seat && sceneState.current !== "outdoor") {
          const interior = interiorDefs && interiorDefs[sceneState.current];
          if (interior && interior.furniture) {
            seat = interior.furniture.find(f => sittable.includes(f.type) && Math.hypot(f.x - player.x, f.y - player.y) < 1.0);
          }
        }
        if (seat) {
          player.x = seat.x;
          player.y = seat.y;
          player.pose = "sitting";
        }
      }
      return;
    }
    // 이동하면 서기로 복귀
    player.idleTime = 0;
    if (player.pose !== "standing") player.pose = "standing";

    const runMul = keys.has("ShiftLeft") || keys.has("ShiftRight") || inputState.runHold ? 1.75 : 1;
    const walkMul = (player.moveTarget && player.moveTarget.autoWalk) ? 0.5 : 1;
    const weatherSlow = weather.current === "storm" ? 0.8 : weather.current === "snow" ? 0.88 : 1;
    const spd = player.speed * runMul * walkMul * 1 * weatherSlow;
    const tx = player.x + (dx / mag) * spd * dt;
    const ty = player.y + (dy / mag) * spd * dt;

    if (canStand(tx, player.y)) player.x = tx;
    if (canStand(player.x, ty)) player.y = ty;

    if (sceneState.current !== "outdoor") {
      const interior = interiorDefs && interiorDefs[sceneState.current];
      if (interior) {
        player.x = clamp(player.x, 0.3, interior.width - 0.3);
        player.y = clamp(player.y, 0.3, interior.height - 0.3);
      }
    } else {
      player.x = clamp(player.x, 1, world.width - 1);
      player.y = clamp(player.y, 1, world.height - 1);
    }

    if (player.moveTarget) {
      const td = Math.hypot(player.moveTarget.x - player.x, player.moveTarget.y - player.y);
      if (td <= 0.12) {
        const targetNpc = npcById(player.moveTarget.npcId);
        if (targetNpc) {
          addChat("System", t("sys_npc_arrived", { name: targetNpc.name }));
          if (chatInputEl) chatInputEl.focus();
        }
        if (player.moveTarget.autoWalk) {
          autoWalk.target = null;
          autoWalk.nextPickAt = nowMs() + 700 + Math.random() * 1500;
        }
        player.moveTarget = null;
      }
    }
  }

  function updateNpcs(dt) {
    const typingTarget = isChatTyping() ? chatTargetNpc() : null;
    const typingNpcId = typingTarget ? typingTarget.npc.id : null;
    const pinnedNpcId = conversationFocusNpcId;

    for (const npc of npcs) {
      if (npc.talkCooldown > 0) npc.talkCooldown -= dt;

      // 자율 기분 변화 (시간/날씨/성격 기반)
      if (nowMs() > npc.moodUntil && Math.random() < 0.001) {
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
        n.hunger += dt * 0.08;    // 배고픔 증가
        n.energy -= dt * 0.05;    // 에너지 감소
        n.social -= dt * 0.03;    // 사교 감소
        n.fun -= dt * 0.04;       // 즐거움 감소
        n.duty += dt * 0.06;      // 할 일 쌓임

        // 장소에 따른 욕구 해소
        const atCafe = dist(npc, places.cafe) < 2;
        const atBakery = dist(npc, places.bakery) < 2;
        const atHome = dist(npc, npc.home) < 2;
        const atWork = dist(npc, npc.work) < 2;
        const atPark = dist(npc, places.park) < 2;
        const atFlorist = places.florist && dist(npc, places.florist) < 2;
        const nearOtherNpc = npcs.some(o => o.id !== npc.id && dist(npc, o) < 3);

        if ((atCafe || atBakery) && n.hunger > 30) n.hunger = Math.max(0, n.hunger - dt * 2);
        if (atHome) n.energy = Math.min(100, n.energy + dt * 0.5);
        if (nearOtherNpc) n.social = Math.min(100, n.social + dt * 0.3);
        if (atPark || atFlorist) n.fun = Math.min(100, n.fun + dt * 0.4);
        if (atWork) n.duty = Math.max(0, n.duty - dt * 0.8);

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
        if (!targetNpc || dist(npc, targetNpc) < 2) {
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

      // 술래잡기 중인 NPC는 updateTagGame에서 이동 처리
      if (tagGame.active && npc.id === tagGame.targetNpcId) continue;

      if (pinnedNpcId && npc.id === pinnedNpcId) {
        npc.state = "chatting";
        npc.roamWait = Math.max(npc.roamWait, 0.35);
        continue;
      }

      if (typingNpcId && npc.id === typingNpcId) {
        npc.state = "chatting";
        npc.roamWait = Math.max(npc.roamWait, 0.35);
        continue;
      }

      if (chatSessionActiveFor(npc.id)) {
        npc.state = "chatting";
        npc.roamWait = Math.max(npc.roamWait, 0.35);
        continue;
      }

      if (npc.roamWait > 0) {
        npc.roamWait -= dt;
        npc.state = "idle";
        if (npc.roamWait <= 0) pickNpcRoamTarget(npc);
        continue;
      }

      if (!npc.roamTarget || Math.random() < 0.003) {
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
            const escAngle = Math.random() * Math.PI * 2;
            const ex = npc.x + Math.cos(escAngle) * 1.5;
            const ey = npc.y + Math.sin(escAngle) * 1.5;
            if (canStandInScene(ex, ey, npcScene)) { npc.x = ex; npc.y = ey; }
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
          .filter(p => ["bench", "chair", "stool", "armchair", "bean_bag", "floor_cushion"].includes(p.type) && dist(npc, p) < 1.0)
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

  function updateNpcSocialEvents() {
    if (world.totalMinutes < nextSocialAt) return;
    nextSocialAt = world.totalMinutes + 22 + Math.random() * 34;

    const moving = npcs.filter((n) => !chatSessionActiveFor(n.id));
    if (moving.length < 2) return;

    const a = moving[Math.floor(Math.random() * moving.length)];
    const aScene = a.currentScene || "outdoor";
    let b = null;
    let best = Infinity;
    for (const cand of moving) {
      if (cand.id === a.id) continue;
      if ((cand.currentScene || "outdoor") !== aScene) continue;
      const d = dist(a, cand);
      if (d < best) {
        best = d;
        b = cand;
      }
    }
    if (!b || best > 2.3) return;

    a.roamWait = Math.max(a.roamWait, 3 + Math.random() * 2);
    b.roamWait = Math.max(b.roamWait, 3 + Math.random() * 2);
    a.state = "chatting";
    b.state = "chatting";

    // 플레이어 근처면 LLM으로 멀티턴 대화, 멀면 "..." 말풍선
    const playerNearby = dist(player, a) < 12 || dist(player, b) < 12;
    if (playerNearby && !npcChatLlmPending) {
      npcChatLlmPending = true;
      const rel = npcRelationLabel(getNpcRelation(a.id, b.id));
      upsertSpeechBubble(a.id, ambientEmoji(a, true), 8000);
      upsertSpeechBubble(b.id, ambientEmoji(b, true), 8000);
      const delay = (ms) => new Promise(r => setTimeout(r, ms));
      llmReplyOrEmpty(a, `(${b.name}에게 말을 걸어주세요. 관계: ${rel}. ${formatTime()}. 10자 이내.)`)
        .then((lineA) => {
          if (lineA) upsertSpeechBubble(a.id, lineA, 4500);
          return delay(2500).then(() =>
            llmReplyOrEmpty(b, `(${a.name}: "${lineA || '...'}". 대답해주세요. 10자 이내.)`)
          );
        })
        .then((lineB) => {
          if (lineB) upsertSpeechBubble(b.id, lineB, 4500);
          // 50% 확률로 A가 한 번 더 반응 (3턴)
          if (Math.random() < 0.5 && lineB) {
            return delay(2500).then(() =>
              llmReplyOrEmpty(a, `(${b.name}: "${lineB}". 짧게 반응. 8자 이내.)`)
            );
          }
        })
        .then((lineA2) => {
          if (lineA2) upsertSpeechBubble(a.id, lineA2, 3000);
        })
        .finally(() => { npcChatLlmPending = false; });
      addLog(t("log_npc_chat", { a: a.name, b: b.name }));
    } else {
      upsertSpeechBubble(a.id, ambientEmoji(a, true), 2800);
      upsertSpeechBubble(b.id, ambientEmoji(b, true), 2800);
    }
  }

  function updateConversationCamera() {
    const npc = activeConversationNpc();
    if (npc) {
      if (preConversationZoom === null) preConversationZoom = world.zoom;
      const desiredZoom = Math.max(preConversationZoom, CONVERSATION_MIN_ZOOM);
      world.zoom += (desiredZoom - world.zoom) * 0.1;

      const dx = npc.x - player.x;
      const dy = npc.y - player.y;
      const d = Math.hypot(dx, dy) || 1;
      const nx = dx / d;
      const ny = dy / d;
      const px = -ny;
      const py = nx;

      const desiredPanX = clamp(-nx * 130 + px * 72, -220, 220);
      const desiredPanY = clamp(-ny * 94 + py * 40 - 44, -180, 180);
      convoPan.x += (desiredPanX - convoPan.x) * 0.16;
      convoPan.y += (desiredPanY - convoPan.y) * 0.16;
      return;
    }

    if (preConversationZoom !== null) {
      world.zoom += (preConversationZoom - world.zoom) * 0.08;
      if (Math.abs(preConversationZoom - world.zoom) < 0.02) {
        world.zoom = preConversationZoom;
        preConversationZoom = null;
      }
    }
    convoPan.x *= 0.84;
    convoPan.y *= 0.84;
    if (Math.abs(convoPan.x) < 0.2) convoPan.x = 0;
    if (Math.abs(convoPan.y) < 0.2) convoPan.y = 0;
  }

  function resetView() {
    cameraPan.x = 0;
    cameraPan.y = 0;
    world.zoom = DEFAULT_ZOOM;
    addLog(t("log_view_reset"));
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
      const label = bld ? bld.label : sceneState.current;
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

  function updateCamera() {
    const p = project(player.x, player.y, 0);
    const tx = canvas.width * 0.5 - (p.x - world.cameraX) + cameraPan.x + convoPan.x;
    const ty = canvas.height * 0.58 - (p.y - world.cameraY) + cameraPan.y + convoPan.y;
    world.cameraX += (tx - world.cameraX) * 0.08;
    world.cameraY += (ty - world.cameraY) * 0.08;
  }

  function updateUI() {
    if (systemToasts.length && systemToasts[0].until <= performance.now()) renderToasts();
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
      else if (conversationFocusNpcId && target.npc.id === conversationFocusNpcId) chatActiveStateEl.textContent = t("chat_state_locked");
      else if (chatSessionActiveFor(target.npc.id)) chatActiveStateEl.textContent = t("chat_state_chatting");
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
  initPlayerName().then(() => { initMultiplayer(); });
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
      setAutoWalkEnabled(!autoWalk.enabled);
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
      setAutoWalkEnabled(!autoWalk.enabled);
    });
  }

  ensureAutoWalkControl();
  ensureMobileAutoWalkControl();
  try {
    setAutoWalkEnabled(localStorage.getItem(AUTO_WALK_KEY) === "1", true);
  } catch {
    setAutoWalkEnabled(false, true);
  }

  function frame(now) {
    resizeCanvasToDisplaySize();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    frameCount += 1;

    if (!world.paused) {
      // 실제 시간과 1:1 동기화 (dt는 초 단위, 1분 = 60초)
      world.totalMinutes += dt / 60;
      updatePlayer(dt);
      updateNpcs(dt);
      updateNpcSocialEvents();
      updateAmbientEvents();
      updateFavorRequests();
      updateGuideGreeting(dt);
      updateTagGame(dt);
      updateSceneFade(dt);
      if (sceneState.current === "outdoor") {
        updateWeather(dt);
        updateDiscoveries();
      }
      updateAmbientSpeech(nowMs());
      updateConversationCamera();
      updateCamera();
      if (mp && mp.enabled) {
        mpBroadcast();
        mpInterpolate(dt);
        if (frameCount % 300 === 0) { mpCleanStale(); mpCleanMessages(); }
        // 5분마다 기억 서버 동기화
        const _now = nowMs();
        if (memorySync && _now > nextMemorySyncAt) {
          nextMemorySyncAt = _now + 300_000;
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
      // Clear 2D HUD overlay canvas (transparent)
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      gameRenderer3D.render(
        { player, npcs, world, weather, sceneState, speechBubbles, weatherParticles },
        dt,
        elapsedTime
      );
      // Draw minimap and HUD on 2D overlay
      if (!mobileMode || frameCount % 3 === 0) drawMinimap();
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener("keydown", (ev) => {
    // Ctrl+Shift+D: toggle debug mode (works even when typing)
    if (ev.ctrlKey && ev.shiftKey && ev.code === "KeyD") {
      ev.preventDefault();
      debugMode = !debugMode;
      localStorage.setItem('playground_debug', debugMode);
      const msg = debugMode ? "[DEBUG ON] LLM 로그가 콘솔에 출력됩니다. (F12)" : "[DEBUG OFF]";
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
    if (code === "KeyE") interact();
    if (code === "Space") resetView();
    if (code === "KeyP") {
      world.paused = !world.paused;
      addLog(world.paused ? t("sys_sim_pause") : t("sys_sim_resume"));
    }
    if (code === "KeyT") {
      setAutoWalkEnabled(!autoWalk.enabled);
    }
    // W키: 날씨 순환 (디버그용)
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
        conversationFocusNpcId = clickedNpc.id;
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
        conversationFocusNpcId = null;
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
    cameraPan.x = clamp(cameraPan.x + dx, -320, 320);
    cameraPan.y = clamp(cameraPan.y + dy, -220, 220);
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
        cameraPan.x = clamp(cameraPan.x + dx, -320, 320);
        cameraPan.y = clamp(cameraPan.y + dy, -220, 220);
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
      resetView();
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
    chatCloseBtn.addEventListener("click", () => closeMobileChat());
  }
  if (chatInputEl) {
    chatInputEl.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        sendCardChat();
      } else if (ev.key === "Escape") {
        ev.preventDefault();
        closeMobileChat();
      }
    });
  }

  if (saveBtn) saveBtn.addEventListener("click", saveState);
  if (loadBtn) loadBtn.addEventListener("click", loadState);
  if (renameBtn) renameBtn.addEventListener("click", changePlayerName);
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
              age: "20대",
              gender: "남성",
              personality: sharedNpc.personality || result.npc.personality || inferPersonalityFromName(result.npc.name),
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
    mp = createMultiplayer({ player, world, addChat, addLog, t, upsertSpeechBubble, normalizePlayerFlag, uiOnlineEl });
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
        memorySync.load().then((serverData) => {
          if (serverData && applyServerMemory(npcs, serverData, null)) {
            addLog("[Memory] 서버에서 기억을 복원했습니다.");
          }
        });
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
      });
      console.log("[Playground] Three.js 3D renderer initialized");

      // 3D 캔버스 클릭 → 이동
      canvas3D.addEventListener("click", (ev) => {
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

  requestAnimationFrame(frame);
})();
