import { clamp, dist, shade, randomPastelColor, normalizePlayerName, bubbleText, inferPersonalityFromName, nowMs, socialKey, npcRelationLabel } from './utils/helpers.js';
import { SAVE_KEY, UI_PREF_KEY, MOBILE_SHEET_KEY, PLAYER_NAME_KEY, PLAYER_FLAG_KEY, AUTO_WALK_KEY, COUNTRY_LIST, CHAT_NEARBY_DISTANCE, ZOOM_MIN, ZOOM_MAX, DEFAULT_ZOOM, CONVERSATION_MIN_ZOOM, npcPersonas, palette, places, buildings, hotspots, props, speciesPool, WEATHER_TYPES, discoveries, favorLevelNames, itemTypes, groundItems, ITEM_RESPAWN_MS, seasons, interiorDefs } from './core/constants.js';
import { GameRenderer } from './renderer/renderer.js';

(function () {
  const USE_3D = true;
  const canvas = document.getElementById("pg-world-canvas");
  if (!canvas) return;

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
    // Keep pointer events on the 2D canvas (it's on top and handles all input)
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
  const spriteCache = new Map();
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
    height: 65,
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
    name: "플레이어",
    flag: "",
    x: 20,
    y: 25,
    speed: 3.7,
    color: "#f2cc61",
    species: "human_a",
    moveTarget: null,
  };

  function randomSpecies() {
    return speciesPool[Math.floor(Math.random() * speciesPool.length)];
  }

  function makeNpc(id, name, color, home, work, hobby, personality = "", species = randomSpecies()) {
    return {
      id,
      name,
      color,
      species,
      x: home.x,
      y: home.y,
      speed: 2 + Math.random() * 0.9,
      home,
      work,
      hobby,
      state: "idle",
      pose: "standing",   // standing, sitting, lying, waving
      talkCooldown: 0,
      memory: { entries: [], lastConversation: 0, conversationCount: 0, giftsReceived: 0, questsShared: 0 },
      personality,
      roamTarget: null,
      roamWait: 0,
      roamRadius: 2.4 + Math.random() * 2.1,
      nextLongTripAt: 8 + Math.random() * 14,
      mood: "neutral",
      moodUntil: 0,
      favorLevel: 0,
      favorPoints: 0,
      activeRequest: null,
      lastRequestAt: 0,
      currentScene: "outdoor",
    };
  }

  function ensureMemoryFormat(npc) {
    if (!npc.memory || Array.isArray(npc.memory)) {
      npc.memory = { entries: [], lastConversation: 0, conversationCount: 0, giftsReceived: 0, questsShared: 0 };
    }
    if (!Array.isArray(npc.memory.entries)) npc.memory.entries = [];
    if (!npc.memory.conversationCount) npc.memory.conversationCount = 0;
    if (!npc.memory.giftsReceived) npc.memory.giftsReceived = 0;
    if (!npc.memory.questsShared) npc.memory.questsShared = 0;
    return npc.memory;
  }

  function addNpcMemory(npc, type, summary, metadata) {
    const mem = ensureMemoryFormat(npc);
    mem.entries.push({ type, summary, metadata: metadata || {}, time: world.totalMinutes });
    if (mem.entries.length > 20) mem.entries.shift();
  }

  function getNpcMemorySummary(npc) {
    const mem = ensureMemoryFormat(npc);
    if (mem.entries.length === 0) return "";
    const levelName = favorLevelNames[npc.favorLevel] || "낯선 사이";
    const recent = mem.entries.slice(-8);
    const lines = recent.map((e) => {
      if (e.type === "chat") return `[대화] ${e.summary}`;
      if (e.type === "gift") return `[선물] ${e.summary}`;
      if (e.type === "quest") return `[퀘스트] ${e.summary}`;
      if (e.type === "favor") return `[관계] ${e.summary}`;
      return `[기타] ${e.summary}`;
    });
    const stats = `대화 ${mem.conversationCount}회, 선물 ${mem.giftsReceived}회, 퀘스트 ${mem.questsShared}회`;
    return `관계: ${levelName} (호감도 ${npc.favorLevel}단계)\n통계: ${stats}\n최근 기억:\n${lines.join("\n")}`;
  }

  function getNpcSocialContext(npc) {
    const others = npcs.filter(n => n.id !== npc.id).slice(0, 6);
    if (others.length === 0) return "";
    const lines = others.map(o => {
      const rel = getNpcRelation(npc.id, o.id);
      return `${o.name}: ${npcRelationLabel(rel)}(${rel})`;
    });
    return "다른 NPC와의 관계:\n" + lines.join(", ");
  }

  function getMemoryBasedTone(npc) {
    const level = npc.favorLevel || 0;
    if (level <= 0) return "정중한 존댓말로 대화하세요. 아직 서먹한 사이입니다.";
    if (level === 1) return "정중하지만 약간 친근한 존댓말로 대화하세요.";
    if (level === 2) return "편한 존댓말이나 가벼운 반말을 섞어 대화하세요.";
    if (level === 3) return "친근한 반말로 대화하세요. 친한 친구처럼 대해주세요.";
    return "매우 친밀한 반말로 대화하세요. 오랜 절친처럼 대해주세요.";
  }

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
    addChat("System", `🏃 도망쳐! ${npc.name}에게서 60초간 도망치세요!`);
    addLog(`술래잡기: ${npc.name}에게서 도망쳐!`);
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
      addChat("System", `🎉 도망 성공! ${targetNpc.name}에게서 60초간 도망쳤습니다!`);
      addLog(`술래잡기 승리!`);
      return;
    }

    // NPC가 플레이어를 잡았는지 확인
    const d = Math.hypot(player.x - targetNpc.x, player.y - targetNpc.y);
    if (d < 1.5) {
      tagGame.active = false;
      tagGame.caught = true;
      addChat("System", `😱 잡혔다! ${targetNpc.name}에게 잡혔습니다...`);
      addLog("술래잡기 실패...");
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

  function drawTagGameHud() {
    if (!tagGame.active) return;
    const elapsed = nowMs() - tagGame.startedAt;
    const remaining = Math.max(0, tagGame.duration - elapsed);
    const secs = Math.ceil(remaining / 1000);

    const targetNpc = npcs.find(n => n.id === tagGame.targetNpcId);
    const npcName = targetNpc ? targetNpc.name : "???";
    const text = `🏃 도망쳐! ${npcName}에게서 도망! — ${secs}초`;

    ctx.save();
    ctx.font = "700 15px sans-serif";
    const tw = ctx.measureText(text).width + 28;
    const tx = canvas.width * 0.5 - tw * 0.5;
    const ty = 38;

    // 배경: 가까우면 빨간색, 멀면 초록색
    const tagDist = targetNpc ? Math.hypot(player.x - targetNpc.x, player.y - targetNpc.y) : 99;
    ctx.fillStyle = tagDist < 4 ? "rgba(220, 50, 50, 0.88)" : secs <= 10 ? "rgba(50, 180, 80, 0.88)" : "rgba(50, 120, 200, 0.88)";
    ctx.beginPath();
    ctx.roundRect(tx, ty, tw, 30, 8);
    ctx.fill();

    // 텍스트
    ctx.fillStyle = "#fff";
    ctx.fillText(text, tx + 14, ty + 21);

    // 거리 표시
    if (targetNpc) {
      const distText = `거리: ${tagDist.toFixed(1)}`;
      ctx.font = "600 12px sans-serif";
      const dw = ctx.measureText(distText).width + 16;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath();
      ctx.roundRect(canvas.width * 0.5 - dw * 0.5, ty + 34, dw, 20, 6);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillText(distText, canvas.width * 0.5 - dw * 0.5 + 8, ty + 49);
    }
    ctx.restore();
  }

  const worldEvents = {
    day: -1,
    once: {},
  };

  // ─── Weather System ───
  const weather = {
    current: "clear",
    next: "clear",
    intensity: 0,
    targetIntensity: 0,
    windX: 0,
    transitionProgress: 1,
    nextChangeAt: 0,
    lightningFlash: 0,
  };
  const weatherParticles = { rain: [], snow: [], fireflies: [], leaves: [], splashes: [] };
  let discoveryNotifyUntil = 0;
  let discoveryNotifyTitle = "";

  // ─── Weather Update ───
  // 서울 실시간 날씨 동기화
  let weatherApiNextFetch = 0;
  const WEATHER_API_URL = LLM_API_URL ? LLM_API_URL.replace(/\/api\/npc-chat$/, "/api/weather") : "";

  async function fetchSeoulWeather() {
    if (!WEATHER_API_URL) return;
    try {
      const res = await fetch(WEATHER_API_URL);
      if (!res.ok) return;
      const data = await res.json();
      if (data.weather && data.weather !== weather.current) {
        weather.next = data.weather;
        weather.targetIntensity = data.weather === "clear" ? 0 : 0.5;
        weather.transitionProgress = 0;
      }
    } catch { /* 실패 시 현재 날씨 유지 */ }
  }

  function updateWeather(dt) {
    const now = nowMs();
    // 10분마다 서울 날씨 API 호출
    if (now > weatherApiNextFetch) {
      weatherApiNextFetch = now + 600_000;
      fetchSeoulWeather();
    }
    if (weather.transitionProgress < 1) {
      weather.transitionProgress = Math.min(1, weather.transitionProgress + dt * 0.12);
      if (weather.transitionProgress >= 1) weather.current = weather.next;
    }
    weather.intensity += (weather.targetIntensity - weather.intensity) * dt * 2;
    const targetWind = weather.current === "storm" ? -3.5 : weather.current === "rain" ? -1.5 : weather.current === "snow" ? -0.6 : 0;
    weather.windX += (targetWind - weather.windX) * dt * 0.8;
    if (weather.current === "storm" && Math.random() < dt * 0.12) weather.lightningFlash = 1;
    weather.lightningFlash *= 0.82;
    updateWeatherParticles(dt);
  }

  function updateWeatherParticles(dt) {
    const w = canvas.width;
    const h = canvas.height;
    const inten = weather.intensity;
    // Rain
    if (weather.current === "rain" || weather.current === "storm") {
      const maxP = weather.current === "storm" ? 300 : 150;
      const target = Math.floor(maxP * inten);
      while (weatherParticles.rain.length < target) {
        weatherParticles.rain.push({ x: Math.random() * (w + 200) - 100, y: -Math.random() * h, speed: 400 + Math.random() * 300, len: 8 + Math.random() * 12 });
      }
      if (weatherParticles.rain.length > target) weatherParticles.rain.length = target;
      for (const p of weatherParticles.rain) {
        p.x += weather.windX * 60 * dt;
        p.y += p.speed * dt;
        if (p.y > h) { p.y = -10; p.x = Math.random() * (w + 200) - 100; weatherParticles.splashes.push({ x: p.x, y: h - Math.random() * 40, life: 0.3 }); }
      }
    } else {
      weatherParticles.rain.length = 0;
    }
    // Snow
    if (weather.current === "snow") {
      const target = Math.floor(120 * inten);
      while (weatherParticles.snow.length < target) {
        weatherParticles.snow.push({ x: Math.random() * w, y: -Math.random() * h, speed: 30 + Math.random() * 50, size: 2 + Math.random() * 4, wobble: Math.random() * Math.PI * 2 });
      }
      if (weatherParticles.snow.length > target) weatherParticles.snow.length = target;
      for (const p of weatherParticles.snow) {
        p.wobble += dt * 2;
        p.x += Math.sin(p.wobble) * 20 * dt + weather.windX * 15 * dt;
        p.y += p.speed * dt;
        if (p.y > h) { p.y = -10; p.x = Math.random() * w; }
      }
    } else {
      weatherParticles.snow.length = 0;
    }
    // Splashes
    for (let i = weatherParticles.splashes.length - 1; i >= 0; i--) {
      weatherParticles.splashes[i].life -= dt;
      if (weatherParticles.splashes[i].life <= 0) weatherParticles.splashes.splice(i, 1);
    }
    // Fireflies (night only)
    const hr = hourOfDay();
    const isNight = hr >= 20 || hr < 5;
    if (isNight) {
      while (weatherParticles.fireflies.length < 18) {
        const pp = places.park;
        weatherParticles.fireflies.push({ x: pp.x - 4 + Math.random() * 8, y: pp.y - 4 + Math.random() * 8, phase: Math.random() * Math.PI * 2, dx: (Math.random() - 0.5) * 0.3, dy: (Math.random() - 0.5) * 0.3 });
      }
      for (const f of weatherParticles.fireflies) {
        f.phase += dt * 1.8;
        f.x += f.dx * dt + Math.sin(f.phase * 0.7) * 0.3 * dt;
        f.y += f.dy * dt + Math.cos(f.phase * 0.5) * 0.3 * dt;
        if (f.x < 2 || f.x > 30 || f.y < 2 || f.y > 30) { f.dx = -f.dx; f.dy = -f.dy; }
      }
    } else {
      weatherParticles.fireflies.length = 0;
    }
    // Leaves (always, gentle)
    while (weatherParticles.leaves.length < 8) {
      weatherParticles.leaves.push({ x: Math.random() * w, y: -20 - Math.random() * h * 0.5, speed: 15 + Math.random() * 25, rot: Math.random() * Math.PI * 2, size: 3 + Math.random() * 4 });
    }
    for (let i = weatherParticles.leaves.length - 1; i >= 0; i--) {
      const l = weatherParticles.leaves[i];
      l.rot += dt * 1.5;
      l.x += (weather.windX * 10 + Math.sin(l.rot) * 15) * dt;
      l.y += l.speed * dt;
      if (l.y > h + 20 || l.x < -40 || l.x > w + 40) { weatherParticles.leaves.splice(i, 1); }
    }
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
      addLog(`🔍 발견! "${d.title}" — ${d.desc}`);
      addChat("System", `✨ 새로운 발견: ${d.title}!`);
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
      addChat(npc.name, `${itemTypes[req.itemNeeded].label}이(가) 필요해요.`);
      return true;
    }

    if (req.type === "deliver_to") {
      const target = npcById(req.targetNpcId);
      if (!target) {
        addChat("System", `대상 NPC가 더 이상 존재하지 않아 요청이 취소됩니다.`);
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

    addChat("System", `✅ '${req.title}' 완료! (호감도 +${req.reward.favorPoints})`);
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
        "봄": "🌸 봄이 왔습니다! 꽃이 더 자주 피어납니다.",
        "여름": "☀️ 여름입니다! NPC들이 활발하게 활동합니다.",
        "가을": "🍂 가을입니다! 시장에 특별 상품이 등장합니다.",
        "겨울": "❄️ 겨울입니다! NPC들이 실내에 머무르는 시간이 늘어납니다.",
      };
      addChat("System", effects[s] || `계절이 ${s}(으)로 바뀌었습니다.`);
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
    addChat("System", `${info.emoji} ${info.label}을(를) 주웠습니다!${amount > 1 ? ` (x${amount})` : ""} (보유: ${inventory[gi.type]})`);
    return true;
  }

  function giftItemToNpc(npc) {
    const giftable = Object.entries(inventory).filter(([, count]) => count > 0);
    if (giftable.length === 0) {
      addChat("System", "선물할 아이템이 없습니다. 바닥에서 아이템을 주워보세요.");
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
      `와, ${info.label}! 정말 고마워!`,
      `${info.label}을(를) 받다니 감동이야!`,
      `이거 내가 좋아하는 건데! 고마워!`,
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
    return parts.length > 0 ? parts.join(" ") : "없음";
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
      if (!modal || !nameInput || !confirmBtn) {
        resolve(defaultName || "플레이어");
        return;
      }
      nameInput.value = defaultName || "";
      modal.hidden = false;
      nameInput.focus();
      function finish() {
        confirmBtn.removeEventListener("click", finish);
        nameInput.removeEventListener("keydown", onKey);
        modal.hidden = true;
        resolve(normalizePlayerName(nameInput.value));
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

    // Auto-detect country via IP (non-blocking for returning users)
    if (!storedFlag) {
      const detected = await detectCountryFlag();
      if (detected) {
        storedFlag = detected;
        try { localStorage.setItem(PLAYER_FLAG_KEY, storedFlag); } catch { /* ignore */ }
      }
    }
    player.flag = normalizePlayerFlag(storedFlag);

    if (storedName && storedName !== "플레이어") {
      player.name = normalizePlayerName(storedName);
      return;
    }

    player.name = await showNameModal("");
    try { localStorage.setItem(PLAYER_NAME_KEY, player.name); } catch { /* ignore */ }
  }

  async function changePlayerName() {
    const next = await showNameModal(player.name);
    if (next === player.name) return;
    player.name = next;
    try { localStorage.setItem(PLAYER_NAME_KEY, player.name); } catch { /* ignore */ }
    addLog(`플레이어 이름이 '${player.flag ? player.flag + " " : ""}${player.name}'(으)로 변경되었습니다.`);
  }

  function toggleMobileChatMode() {
    const target = chatTargetNpc();
    const npcNear = target && target.near;
    if (!npcNear && mp.enabled) {
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
      addChat("System", "근처 NPC가 없습니다. 먼저 NPC 옆으로 이동해 주세요.");
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
    if (!name) return { ok: false, reason: "이름을 입력해 주세요." };
    if (npcs.some((n) => n.name === name)) return { ok: false, reason: "이미 있는 이름입니다." };
    if (npcs.length >= 48) return { ok: false, reason: "월드 내 NPC가 너무 많습니다." };

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
    if (!query) return { ok: false, reason: "제거할 NPC 이름을 입력해 주세요." };
    const idx = npcs.findIndex((n) => n.name === query || n.id === query);
    if (idx === -1) return { ok: false, reason: `'${query}' NPC를 찾을 수 없습니다.` };
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
      if (added > 0) addLog(`공유 NPC ${added}명이 월드에 반영되었습니다.`);
    } catch (err) {
      addLog("공유 NPC 동기화에 실패했습니다.");
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
      mobileSheetToggleBtn.textContent = mobileSheetOpen ? "패널 닫기" : "패널 열기";
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
      statusToggleBtn.textContent = mobileStatusCollapsed ? "펼치기" : "접기";
      statusToggleBtn.setAttribute("aria-expanded", mobileStatusCollapsed ? "false" : "true");
    }
    if (logToggleBtn) {
      logToggleBtn.hidden = !mobile;
      logToggleBtn.textContent = mobileLogCollapsed ? "펼치기" : "접기";
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

  function spriteCanvas(key, width, height, painter) {
    const cached = spriteCache.get(key);
    if (cached) return cached;
    const cv = document.createElement("canvas");
    cv.width = width;
    cv.height = height;
    const c = cv.getContext("2d");
    painter(c, width, height);
    spriteCache.set(key, cv);
    return cv;
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
    const mpChat = mp.enabled && !npcNear;

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
    // Central Boulevard (north-south)
    if (Math.abs(x - 25) <= 1.5 && y >= 5 && y <= 55) return true;
    // Main Cross Street (east-west)
    if (Math.abs(y - 25) <= 1.2 && x >= 8 && x <= 55) return true;
    // Northern Alley (commercial)
    if (Math.abs(y - 12) <= 0.8 && x >= 23 && x <= 45) return true;
    // Southern Alley (residential)
    if (Math.abs(y - 35) <= 0.8 && x >= 8 && x <= 50) return true;
    // Market alley
    if (Math.abs(y - 45) <= 0.8 && x >= 15 && x <= 40) return true;
    // KSA connector
    if (Math.abs(x - 42) <= 0.8 && y >= 12 && y <= 20) return true;
    return false;
  }

  function waterTile(x, y) {
    if (y < 4 || y > world.height - 3) return false;
    const riverCenter = 4.0 + Math.sin(y * 0.34) * 1.2 + Math.sin(y * 0.12 + 0.5) * 0.6;
    return x < riverCenter;
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
    addLog(`${bld?.label || buildingId}에 들어왔습니다.`);
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
    addLog("밖으로 나왔습니다.");
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

  function drawSceneFade() {
    if (!sceneFade.active || sceneFade.alpha <= 0) return;
    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${sceneFade.alpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
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
      autoWalkBtn.textContent = autoWalk.enabled ? "자동산책 끄기" : "자동산책 켜기";
      autoWalkBtn.setAttribute("aria-pressed", autoWalk.enabled ? "true" : "false");
    }
    if (mobileAutoWalkBtn) {
      mobileAutoWalkBtn.textContent = autoWalk.enabled ? "산책끄기" : "산책켜기";
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
    if (!silent) addLog(autoWalk.enabled ? "자동 산책 모드가 켜졌습니다." : "자동 산책 모드가 꺼졌습니다.");
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
        memLines.push(`${last.metadata.item ? "그때 받은 선물… 아직 간직하고 있어." : "선물 고마웠어."}`);
      }
      if (questEntries.length > 0) {
        memLines.push("같이 퀘스트 했던 거 기억나.");
      }
      if (npc.favorLevel >= 2) {
        memLines.push("요즘 자주 만나니까 좋다.");
      }
      if (mem.conversationCount >= 5) {
        memLines.push("우리 이제 꽤 많이 얘기했네.");
      }
      if (memLines.length > 0) return memLines[Math.floor(Math.random() * memLines.length)];
    }

    const bySpecies = {
      human_a: ["오늘 햇빛 좋다.", "산책 코스 괜찮네."],
      human_b: ["카페 들를까?", "기분 전환이 되네."],
      human_c: ["꽃이 많이 폈다.", "바람이 시원하다."],
      human_d: ["오늘은 천천히 걷자.", "생각 정리하기 좋네."],
      human_e: ["마켓 쪽이 붐비네.", "여기 분위기 좋다."],
      human_f: ["길이 꽤 예쁘네.", "잠깐 쉬었다 가자."],
      human_g: ["오늘도 힘내보자.", "이 동네 마음에 든다."],
      human_h: ["조용해서 좋네.", "조금 더 걸어볼까."],
      human_i: ["저녁되면 더 예쁘겠다.", "오늘은 여유롭네."],
    };
    const fallback = ["안녕!", "오늘 어때?", "산책 중이야.", "여기 분위기 좋다."];
    const pool = bySpecies[npc.species] || fallback;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function playerFallbackLine() {
    const lines = ["어디로 갈까?", "산책 좋다.", "다음엔 누구랑 얘기하지?"];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  async function llmReplyOrEmpty(npc, prompt) {
    if (!LLM_API_URL) return "";
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
        // 먼 NPC들에게 "..." 말풍선
        for (let i = 1; i < Math.min(visible.length, 4); i++) {
          if (Math.random() < 0.3) upsertSpeechBubble(visible[i].id, "...", 2500);
        }
        // 가장 가까운 NPC는 LLM으로 혼잣말
        if (!ambientLlmPending) {
          ambientLlmPending = true;
          upsertSpeechBubble(closest.id, "...", 6000);
          llmReplyOrEmpty(closest, "(혼잣말을 해주세요. 지금 시간, 날씨, 기분에 맞게 짧은 한마디. 10자 이내.)")
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
      const close = npcs.filter(n => dist(n, player) < 3.5 && n.favorLevel >= 1 && !chatSessionActiveFor(n.id) && n.talkCooldown <= 0);
      if (close.length && Math.random() < 0.15) {
        const npc = close[Math.floor(Math.random() * close.length)];
        npcProactiveGreetPending = true;
        npc.pose = "waving";
        llmReplyOrEmpty(npc, "(플레이어가 근처를 지나갑니다. 먼저 반갑게 말을 걸어주세요. 짧은 한마디.)")
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
        const exitHs = { id: "interiorExit", x: interior.exitPoint.x, y: interior.exitPoint.y, label: "나가기" };
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
    if (h < 8) return npc.home;
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
    npc.x = interior.spawnPoint.x;
    npc.y = interior.spawnPoint.y;
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

  function handleQuestNpcTalk(npc) {
    if (quest.done && quest.dynamic) return handleDynamicQuestProgress(npc);
    if (quest.done) return false;
    return false;
  }

  const questTemplates = [
    {
      type: "deliver",
      tier: 1,
      dialogueVariants: [
        ["전해줄래?", "고마워, 잘 받았어.", "잘 전해줬구나!"],
        ["부탁할게.", "감사해, 전달 받았어.", "수고했어!"],
        ["이 메시지 좀 전해줘.", "아, 그 이야기구나.", "역시 믿을 수 있어!"],
        ["급한 건데 전달 좀.", "오, 알려줘서 고마워.", "빨리 해줬네, 고마워!"],
      ],
      make(fromNpc, toNpc) {
        const v = this.dialogueVariants[Math.floor(Math.random() * this.dialogueVariants.length)];
        return {
          title: `${fromNpc.name}의 전달 임무`,
          stages: [
            { npcId: fromNpc.id, objective: `${fromNpc.name}에게 임무를 받으세요.`, dialogue: `${toNpc.name}에게 ${v[0]}` },
            { npcId: toNpc.id, objective: `${toNpc.name}에게 메시지를 전달하세요.`, dialogue: v[1] },
            { npcId: fromNpc.id, objective: `${fromNpc.name}에게 결과를 보고하세요.`, dialogue: v[2] },
          ],
        };
      },
    },
    {
      type: "explore",
      tier: 1,
      dialogueVariants: [
        ["한번 살펴봐줄래? 궁금한 게 있어.", "잘 다녀왔구나! 덕분에 도움이 됐어."],
        ["좀 둘러봐줘. 뭔가 달라진 것 같아.", "그래? 좋은 정보야, 고마워!"],
        ["요즘 분위기가 이상하대. 확인 좀.", "별일 없다니 다행이네."],
      ],
      make(npc, _unused, place, placeLabel) {
        const v = this.dialogueVariants[Math.floor(Math.random() * this.dialogueVariants.length)];
        return {
          title: `${placeLabel} 탐험`,
          stages: [
            { npcId: npc.id, objective: `${npc.name}에게 탐험 임무를 받으세요.`, dialogue: `${placeLabel} 근처를 ${v[0]}` },
            { visit: place, radius: 2.5, objective: `${placeLabel}을(를) 방문하세요.`, autoText: `${placeLabel}에 도착했습니다. 주변을 둘러봤습니다.` },
            { npcId: npc.id, objective: `${npc.name}에게 보고하세요.`, dialogue: v[1] },
          ],
        };
      },
    },
    {
      type: "social",
      tier: 1,
      dialogueVariants: [
        ["반가워, 같이 이야기 좀 하자.", "다시 왔구나! 우리 좀 더 가까워진 것 같아.", "정말 즐거웠어. 다음에 또 이야기하자!"],
        ["오, 잘 왔어! 할 얘기가 있었어.", "역시 통하는 게 있네.", "오늘 정말 좋았어!"],
        ["심심했는데 잘 왔다.", "이야기가 잘 통하네.", "덕분에 기분 좋아졌어!"],
      ],
      make(npc) {
        const v = this.dialogueVariants[Math.floor(Math.random() * this.dialogueVariants.length)];
        return {
          title: `${npc.name}과(와) 친해지기`,
          stages: [
            { npcId: npc.id, objective: `${npc.name}과(와) 대화하세요.`, dialogue: v[0] },
            { npcId: npc.id, objective: `${npc.name}과(와) 한 번 더 대화하세요.`, dialogue: v[1] },
            { npcId: npc.id, objective: `${npc.name}에게 마무리 인사를 하세요.`, dialogue: v[2] },
          ],
        };
      },
    },
    {
      type: "observe",
      tier: 1,
      dialogueVariants: [
        ["밤에 가보면 뭔가 있을 거야.", "역시 뭔가 있었구나! 좋은 발견이야."],
        ["어두울 때 분위기가 다르대.", "오, 대단한 걸 봤네!"],
        ["야간에만 보이는 게 있다더라.", "신기하다! 잘 관찰했어."],
      ],
      make(npc, _unused, place, placeLabel) {
        const v = this.dialogueVariants[Math.floor(Math.random() * this.dialogueVariants.length)];
        const targetHour = 20 + Math.floor(Math.random() * 4);
        const displayHour = targetHour >= 24 ? targetHour - 24 : targetHour;
        return {
          title: `${placeLabel} 야간 관찰`,
          stages: [
            { npcId: npc.id, objective: `${npc.name}에게 관찰 임무를 받으세요.`, dialogue: `${displayHour}시 이후에 ${placeLabel}에 ${v[0]}` },
            { visit: place, radius: 2.5, afterHour: displayHour, objective: `${displayHour}시 이후 ${placeLabel}을(를) 방문하세요.`, autoText: `밤의 ${placeLabel}에서 특별한 분위기를 느꼈습니다.` },
            { npcId: npc.id, objective: `${npc.name}에게 보고하세요.`, dialogue: v[1] },
          ],
        };
      },
    },
    {
      type: "fetch",
      tier: 1,
      make(npc) {
        const itemKeys = Object.keys(itemTypes);
        const itemKey = itemKeys[Math.floor(Math.random() * itemKeys.length)];
        const info = itemTypes[itemKey];
        return {
          title: `${npc.name}에게 ${info.label} 가져다주기`,
          stages: [
            { npcId: npc.id, objective: `${npc.name}에게 말을 걸어 무엇이 필요한지 알아보세요.`, dialogue: `${info.label}${itemKey === "gem" ? "이" : "을(를)"} 하나 구해다 줄 수 있어?` },
            { requireItem: itemKey, npcId: npc.id, objective: `${info.label}${itemKey === "gem" ? "을" : "을(를)"} 가지고 ${npc.name}에게 가세요.`, dialogue: `${info.emoji} 딱 이거야! 정말 고마워!` },
          ],
        };
      },
    },
    {
      type: "chain",
      tier: 2,
      make(fromNpc, _unused, _place, _label, extraNpcs) {
        const chain = extraNpcs.slice(0, 3);
        if (chain.length < 3) return null;
        return {
          title: `소식 전파: ${chain.map(n => n.name).join(" → ")}`,
          stages: [
            { npcId: fromNpc.id, objective: `${fromNpc.name}에게 소식을 받으세요.`, dialogue: `이 소식을 ${chain[0].name}, ${chain[1].name}, ${chain[2].name} 순서대로 전해줘.` },
            { npcId: chain[0].id, objective: `${chain[0].name}에게 소식을 전하세요.`, dialogue: `오, 그런 소식이? 다음 사람에게도 전해줘.` },
            { npcId: chain[1].id, objective: `${chain[1].name}에게 소식을 전하세요.`, dialogue: `알려줘서 고마워. 마지막으로 한 명 더!` },
            { npcId: chain[2].id, objective: `${chain[2].name}에게 소식을 전하세요.`, dialogue: `전부 알게 됐네! ${fromNpc.name}에게 완료했다고 알려줘.` },
            { npcId: fromNpc.id, objective: `${fromNpc.name}에게 보고하세요.`, dialogue: `모두에게 전달됐구나! 수고했어!` },
          ],
        };
      },
    },
    {
      type: "investigate",
      tier: 2,
      make(fromNpc, targetNpc) {
        const persona = npcPersonas[targetNpc.id] || {};
        const cluePlace = targetNpc.work || targetNpc.hobby || places.plaza;
        const placeNames = { plaza: "광장", cafe: "카페", office: "사무실", park: "공원", market: "시장", homeA: "주택가A", homeB: "주택가B", homeC: "주택가C", bakery: "빵집", florist: "꽃집", library: "도서관", ksa_main: "KSA 본관", ksa_dorm: "KSA 기숙사" };
        const clueLabel = Object.entries(places).find(([, v]) => v === cluePlace)?.[0] || "plaza";
        const cluePlaceName = placeNames[clueLabel] || clueLabel;
        const trait = persona.personality ? persona.personality.split("하")[0] : "독특";
        return {
          title: `미스터리 인물 찾기`,
          stages: [
            { npcId: fromNpc.id, objective: `${fromNpc.name}에게 의뢰를 받으세요.`, dialogue: `${trait}한 사람을 찾고 있어. 단서는 ${cluePlaceName} 근처야.` },
            { visit: cluePlace, radius: 3.0, objective: `${cluePlaceName} 근처에서 단서를 찾으세요.`, autoText: `${cluePlaceName}에서 단서를 발견했습니다. 이 근처에서 활동하는 사람이 있는 것 같습니다.` },
            { npcId: targetNpc.id, objective: `단서의 인물을 찾아 대화하세요.`, dialogue: `나를 찾고 있었어? 맞아, ${cluePlaceName} 근처에서 자주 있지.` },
            { npcId: fromNpc.id, objective: `${fromNpc.name}에게 보고하세요.`, dialogue: `찾았구나! 정말 대단해!` },
          ],
        };
      },
    },
    {
      type: "gift_quest",
      tier: 2,
      make(fromNpc, toNpc) {
        const itemKeys = Object.keys(itemTypes);
        const itemKey = itemKeys[Math.floor(Math.random() * itemKeys.length)];
        const info = itemTypes[itemKey];
        return {
          title: `${toNpc.name}에게 선물하기`,
          stages: [
            { npcId: fromNpc.id, objective: `${fromNpc.name}에게 부탁을 받으세요.`, dialogue: `${toNpc.name}에게 ${info.label}${itemKey === "gem" ? "을" : "을(를)"} 선물하고 싶은데, 구해다 줄 수 있어?` },
            { requireItem: itemKey, npcId: toNpc.id, objective: `${info.label}${itemKey === "gem" ? "을" : "을(를)"} 가지고 ${toNpc.name}에게 전달하세요.`, dialogue: `${info.emoji} 이걸 나한테? 정말 감동이야!` },
            { npcId: fromNpc.id, objective: `${fromNpc.name}에게 보고하세요.`, dialogue: `전해줬구나! 정말 고마워!` },
          ],
        };
      },
    },
    {
      type: "nightwatch",
      tier: 3,
      make(npc, _unused, _place, _label, _extraNpcs, twoPlaces) {
        if (!twoPlaces || twoPlaces.length < 2) return null;
        const [p1, p2] = twoPlaces;
        return {
          title: `야간 순찰`,
          stages: [
            { npcId: npc.id, objective: `${npc.name}에게 순찰 임무를 받으세요.`, dialogue: `밤에 ${p1.label}과(와) ${p2.label}을(를) 순찰해줘. 이상한 일이 있는지 확인해.` },
            { visit: p1.pos, radius: 2.5, afterHour: 20, objective: `20시 이후 ${p1.label}을(를) 순찰하세요.`, autoText: `${p1.label}을(를) 순찰했습니다. 이상 없음.` },
            { visit: p2.pos, radius: 2.5, afterHour: 20, objective: `20시 이후 ${p2.label}을(를) 순찰하세요.`, autoText: `${p2.label}을(를) 순찰했습니다. 이상 없음.` },
            { npcId: npc.id, objective: `${npc.name}에게 순찰 결과를 보고하세요.`, dialogue: `이상 없었구나. 수고했어! 든든하다.` },
          ],
        };
      },
    },
    {
      type: "urgent",
      tier: 3,
      make(fromNpc, toNpc) {
        return {
          title: `긴급 배달!`,
          stages: [
            { npcId: fromNpc.id, objective: `${fromNpc.name}에게 긴급 임무를 받으세요.`, dialogue: `큰일이야! 이걸 빨리 ${toNpc.name}에게 전해줘! 빠를수록 좋아!` },
            { npcId: toNpc.id, objective: `빨리 ${toNpc.name}에게 전달하세요! (빠를수록 보너스!)`, dialogue: `제때 와줬구나! 고마워!` },
            { npcId: fromNpc.id, objective: `${fromNpc.name}에게 보고하세요.`, dialogue: `무사히 전달됐구나! 정말 고마워!` },
          ],
        };
      },
    },
    {
      type: "mediate",
      tier: 2,
      make(fromNpc, toNpc) {
        const rel = getNpcRelation(fromNpc.id, toNpc.id);
        if (rel >= 60) return null;
        return {
          title: `${fromNpc.name}와(과) ${toNpc.name} 중재`,
          stages: [
            { npcId: fromNpc.id, objective: `${fromNpc.name}에게 사정을 들으세요.`, dialogue: `${toNpc.name}이랑 좀 서먹해졌어... 중간에서 좀 도와줄 수 있어?` },
            { npcId: toNpc.id, objective: `${toNpc.name}에게도 이야기를 들으세요.`, dialogue: `${fromNpc.name} 이야기야? 음... 나도 좀 미안하긴 해.` },
            { npcId: fromNpc.id, objective: `${fromNpc.name}에게 ${toNpc.name}의 마음을 전하세요.`, dialogue: `그랬구나... 내가 너무 성급했나봐.` },
            { npcId: toNpc.id, objective: `${toNpc.name}에게 화해 소식을 전하세요.`, dialogue: `고마워! 다시 잘 지낼 수 있을 것 같아.` },
          ],
          onComplete() {
            adjustNpcRelation(fromNpc.id, toNpc.id, 20);
          },
        };
      },
    },
  ];

  function relationKeyForNpc(npcId) {
    return Object.keys(relations).find((k) => k.toLowerCase().includes(npcId.slice(0, 3))) || null;
  }

  function advanceDynamicQuest() {
    quest.stage += 1;
    if (quest.stage >= quest.dynamicStages.length) {
      completeDynamicQuest();
    } else {
      quest.objective = quest.dynamicStages[quest.stage].objective;
    }
  }

  function completeDynamicQuest() {
    const title = quest.title;
    const questType = quest.questType || "deliver";
    const primaryNpcId = quest.primaryNpcId || null;
    const startedAt = quest.startedAt || 0;
    quest.objective = "완료";
    quest.done = true;
    quest.dynamic = false;
    quest.dynamicStages = null;

    const stageCount = quest._stageCount || 3;
    const relKey = primaryNpcId ? relationKeyForNpc(primaryNpcId) : null;
    const favorBoost = 5 + Math.max(0, stageCount - 3) * 2;
    if (relKey) adjustRelation(relKey, favorBoost);

    const primaryNpc = npcById(primaryNpcId);
    if (primaryNpc) {
      const boosted = Math.round(15 * 1 * 1);
      primaryNpc.favorPoints += boosted;
      if (primaryNpc.favorPoints >= 100) {
        primaryNpc.favorLevel = Math.min(primaryNpc.favorLevel + 1, 4);
        primaryNpc.favorPoints = 0;
        addNpcMemory(primaryNpc, "favor", `관계가 '${favorLevelNames[primaryNpc.favorLevel]}'(으)로 발전`);
        addNpcMemory(primaryNpc, "favor", `관계가 '${favorLevelNames[primaryNpc.favorLevel]}'(으)로 발전`);
      }
    }

    if (Math.random() < 0.5) {
      const itemKeys = Object.keys(itemTypes);
      const rewardItem = itemKeys[Math.floor(Math.random() * itemKeys.length)];
      inventory[rewardItem] = (inventory[rewardItem] || 0) + 1;
      const info = itemTypes[rewardItem];
      addChat("System", `🎁 보상: ${info.emoji} ${info.label} 획득!`);
    }

    if (questType === "urgent" && startedAt > 0) {
      const elapsed = (nowMs() - startedAt) / 1000;
      if (elapsed <= 60) {
        addChat("System", `⚡ 긴급 배달 보너스! 빠른 완료 (${Math.round(elapsed)}초)`);
        if (relKey) adjustRelation(relKey, 5);
        if (primaryNpc) {
          primaryNpc.favorPoints += Math.round(10 * 1 * 1);
          if (primaryNpc.favorPoints >= 100) {
            primaryNpc.favorLevel = Math.min(primaryNpc.favorLevel + 1, 4);
            primaryNpc.favorPoints = 0;
            addNpcMemory(primaryNpc, "favor", `관계가 '${favorLevelNames[primaryNpc.favorLevel]}'(으)로 발전`);
            addNpcMemory(primaryNpc, "favor", `관계가 '${favorLevelNames[primaryNpc.favorLevel]}'(으)로 발전`);
          }
        }
      }
    }

    questHistory.unshift({ type: questType, primaryNpcId, title, completedAt: nowMs() });
    if (questHistory.length > 50) questHistory.length = 50;
    questCount += 1;

    if (primaryNpc) {
      addNpcMemory(primaryNpc, "quest", `'${quest.title}' 퀘스트를 함께 완료`, { questType });
      ensureMemoryFormat(primaryNpc).questsShared += 1;
    }

    if (typeof quest._onComplete === "function") {
      try { quest._onComplete(); } catch {}
      quest._onComplete = null;
    }

    addChat("System", `퀘스트 '${title}' 완료!`);
    generateDynamicQuest();
  }

  async function enrichQuestDialogue(questType, primaryNpc, stages) {
    if (!LLM_API_URL || !primaryNpc) return;
    const persona = npcPersonas[primaryNpc.id] || {};
    const personality = persona.personality || "친절한 성격";
    const stageDescs = stages.map((s, i) => `${i}: ${s.objective}`).join("; ");
    const prompt = `퀘스트(${questType}): ${stageDescs}. ${primaryNpc.name}(${personality})의 성격에 맞게 각 스테이지 대사를 한국어 1문장씩 생성해줘. JSON 배열로 대사만 반환. 예: ["대사1","대사2","대사3"]. 20자 내외.`;
    try {
      const reply = await llmReplyOrEmpty(primaryNpc, prompt);
      if (!reply) return;
      const cleaned = reply.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
      const arr = JSON.parse(cleaned);
      if (!Array.isArray(arr) || arr.length < stages.length) return;
      for (let i = 0; i < stages.length; i++) {
        if (typeof arr[i] === "string" && arr[i].trim()) {
          stages[i].dialogue = arr[i].trim();
        }
      }
    } catch {
      // fallback: keep original dialogue
    }
  }

  function generateDynamicQuest() {
    const placeNames = { plaza: "광장", cafe: "카페", office: "사무실", park: "공원", market: "시장", homeA: "주택가A", homeB: "주택가B", homeC: "주택가C", bakery: "빵집", florist: "꽃집", library: "도서관", ksa_main: "KSA 본관", ksa_dorm: "KSA 기숙사" };
    const placeKeys = Object.keys(places);

    const maxTier = questCount < 6 ? 1 : questCount < 16 ? 2 : 3;
    const recentTypes = questHistory.slice(0, 3).map(h => h.type);
    const recentNpcs = questHistory.slice(0, 2).map(h => h.primaryNpcId);

    const eligible = questTemplates.filter(t => {
      if (t.tier > maxTier) return false;
      if (recentTypes.filter(rt => rt === t.type).length >= 1) return false;
      return true;
    });
    const pool = eligible.length > 0 ? eligible : questTemplates.filter(t => t.tier <= maxTier);
    if (!pool.length) return;
    const template = pool[Math.floor(Math.random() * pool.length)];

    const shuffled = npcs.slice().sort(() => Math.random() - 0.5);
    if (!shuffled.length) return;
    let fromNpc = shuffled[0];
    const nonRecent = shuffled.filter(n => !recentNpcs.includes(n.id));
    if (nonRecent.length > 0) fromNpc = nonRecent[0];
    const toNpc = shuffled.find(n => n.id !== fromNpc.id) || fromNpc;

    const placeKey = placeKeys[Math.floor(Math.random() * placeKeys.length)];
    const place = places[placeKey];
    const placeLabel = placeNames[placeKey] || placeKey;

    const extraNpcs = shuffled.filter(n => n.id !== fromNpc.id);
    const placeEntries = Object.entries(placeNames).sort(() => Math.random() - 0.5);
    const twoPlaces = placeEntries.slice(0, 2).map(([k, label]) => ({ pos: places[k], label }));

    const q = template.make(fromNpc, toNpc, place, placeLabel, extraNpcs, twoPlaces);
    if (!q) {
      const fallback = questTemplates.find(t => t.type === "deliver");
      const fb = fallback.make(fromNpc, toNpc, place, placeLabel, extraNpcs, twoPlaces);
      applyQuest(fb, "deliver", fromNpc);
      return;
    }
    applyQuest(q, template.type, fromNpc);

    function applyQuest(q, type, primaryNpc) {
      quest.title = q.title;
      quest.stage = 0;
      quest.objective = q.stages[0].objective;
      quest.done = false;
      quest.dynamic = true;
      quest.dynamicStages = q.stages;
      quest.questType = type;
      quest.primaryNpcId = primaryNpc.id;
      quest.startedAt = nowMs();
      quest._stageCount = q.stages.length;
      quest._onComplete = q.onComplete || null;
      addChat("System", `새 퀘스트: ${q.title}`);
      enrichQuestDialogue(type, primaryNpc, q.stages);
    }
  }

  function handleDynamicQuestProgress(npc) {
    if (!quest.dynamic || !quest.dynamicStages) return false;
    const stage = quest.dynamicStages[quest.stage];
    if (!stage) return false;

    // NPC가 제거되어 퀘스트 진행 불가능한 경우 자동 스킵
    if (stage.npcId && !npcById(stage.npcId)) {
      addChat("System", `대상 NPC가 떠나서 이 단계를 건너뜁니다.`);
      advanceDynamicQuest();
      return true;
    }

    if (stage.requireItem) {
      if (!stage.npcId || stage.npcId !== npc.id) return false;
      const itemKey = stage.requireItem;
      if (!inventory[itemKey] || inventory[itemKey] <= 0) {
        const info = itemTypes[itemKey];
        addChat(npc.name, `아직 ${info ? info.label : itemKey}이(가) 없네. 구해와줘!`);
        return true;
      }
      inventory[itemKey] -= 1;
      addChat(npc.name, stage.dialogue);
      advanceDynamicQuest();
      return true;
    }

    if (stage.visit) {
      const d = dist(player, stage.visit);
      if (d > (stage.radius || 2.5)) return false;
      if (stage.afterHour != null) {
        const h = hourOfDay();
        if (!(h >= stage.afterHour || h < 5)) return false;
      }
      addChat("System", stage.autoText || "목적지에 도착했습니다.");
      advanceDynamicQuest();
      return true;
    }

    if (stage.npcId && stage.npcId === npc.id) {
      addChat(npc.name, stage.dialogue);
      advanceDynamicQuest();
      return true;
    }

    return false;
  }

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
      // 가이드가 플레이어에게 접근 중 — 타겟을 계속 갱신
      if (!guideNpc.roamTarget || dist(guideNpc.roamTarget, player) > 2) {
        guideNpc.roamTarget = { x: player.x, y: player.y };
      }
      if (dist(guideNpc, player) < 2.5) {
        guideGreetingPhase = 2;
        addChat(guideNpc.name, "안녕하세요! 이 마을에 오신 걸 환영해요. 저는 안내원 유진이에요.");
        addChat(guideNpc.name, "궁금한 게 있으면 광장 근처 📋 안내소로 오세요!");
        addChat(guideNpc.name, "저기 보이는 📜 게시판에서 퀘스트와 업적도 확인할 수 있어요.");
        addLog("🎀 안내원 유진이 인사를 건넸습니다.");
        guideNpc.roamTarget = null;
        guideNpc.roamWait = 3;
      }
    }
  }

  // ─── 도슨트 안내소 시스템 ───
  function showDocentMenu() {
    const guideNpc = npcs.find(n => n.id === "guide");
    const guideName = guideNpc ? guideNpc.name : "안내원";
    addChat(guideName, "안녕하세요! 안내소에 오신 걸 환영합니다. 무엇이 궁금하세요?");
    addChat("System", "━━ 안내소 메뉴 ━━");
    addChat("System", "채팅창에 번호를 입력하세요:");
    addChat("System", "1. 이 마을은 뭐하는 곳이야?");
    addChat("System", "2. 여기서 뭘 할 수 있어?");
    addChat("System", "3. 주변 NPC를 소개해줘");
    addChat("System", "4. 장소를 알려줘");
    docentMenuActive = true;
  }

  let docentMenuActive = false;
  let questBoardMenuActive = false;

  function handleDocentChoice(choice) {
    const guideNpc = npcs.find(n => n.id === "guide");
    const name = guideNpc ? guideNpc.name : "안내원";
    docentMenuActive = false;

    if (choice === "1") {
      addChat(name, "여기는 Hyogon Ryu의 개인 홈페이지 속 Playground예요!");
      addChat(name, "AI NPC들이 살아가는 작은 오픈 월드입니다.");
      addChat(name, "NPC들과 대화하고, 퀘스트를 수행하고, 마을을 탐험해보세요.");
      return true;
    }
    if (choice === "2") {
      addChat(name, "할 수 있는 것들을 알려드릴게요!");
      addChat(name, "🚶 WASD로 이동, Shift로 달리기");
      addChat(name, "💬 E키로 NPC와 대화 (채팅창에서 직접 대화도 가능)");
      addChat(name, "📋 퀘스트를 수행하면 NPC 호감도를 얻어요");
      addChat(name, "🎁 NPC에게 선물하면 관계가 좋아져요");
      addChat(name, "🏃 놀이터에서 술래잡기! NPC에게서 도망치세요");
      addChat(name, "🗺️ 숨겨진 발견 장소들이 곳곳에 있어요");
      return true;
    }
    if (choice === "3") {
      addChat(name, "현재 마을에 있는 주민들을 소개할게요!");
      for (const npc of npcs) {
        if (npc.id === "guide") continue;
        const persona = npcPersonas[npc.id];
        const desc = persona ? persona.personality : "알 수 없음";
        const levelName = favorLevelNames[npc.favorLevel] || "낯선 사이";
        addChat(name, `• ${npc.name} — ${desc} (${levelName})`);
      }
      return true;
    }
    if (choice === "4") {
      addChat(name, "주요 장소들을 알려드릴게요!");
      addChat(name, "☕ 카페 — NPC들이 쉬러 오는 곳");
      addChat(name, "🏢 사무실 — 낮에 NPC들이 일하는 곳");
      addChat(name, "🏪 시장 — 아이템 거래소");
      addChat(name, "🌳 공원 — 기념비와 발견 장소가 있어요");
      addChat(name, "🏫 KSA 본관/기숙사 — 학생 NPC들의 생활 공간");
      addChat(name, "📚 도서관, 🍞 빵집, 🌸 꽃집 — 마을 시설들");
      addChat(name, "🏃 놀이터 — 술래잡기 미니게임!");
      addChat(name, "📋 안내소 — 바로 여기! 언제든 다시 오세요");
      return true;
    }
    return false;
  }

  // ─── 퀘스트 게시판 시스템 ───
  function showQuestBoardMenu() {
    addChat("System", "📜 ━━ 마을 게시판 ━━");
    addChat("System", "채팅창에 번호를 입력하세요:");
    addChat("System", "1. 현재 퀘스트 확인");
    addChat("System", "2. 완료한 퀘스트 목록");
    questBoardMenuActive = true;
  }

  function handleQuestBoardChoice(choice) {
    questBoardMenuActive = false;

    if (choice === "1") {
      addChat("System", "━━ 현재 퀘스트 ━━");
      if (quest.done && !quest.dynamic) {
        addChat("System", "진행 중인 퀘스트가 없습니다. NPC와 대화하면 새 퀘스트가 생길 수 있어요!");
      } else {
        const stageInfo = quest.dynamic && quest.dynamicStages
          ? ` (${quest.stage + 1}/${quest.dynamicStages.length}단계)`
          : ` (${quest.stage}단계)`;
        addChat("System", `📋 ${quest.title}${stageInfo}`);
        addChat("System", `   목표: ${quest.objective}`);
        if (quest.dynamic && quest.dynamicStages) {
          const pct = Math.round((quest.stage / quest.dynamicStages.length) * 100);
          addChat("System", `   진행도: ${"█".repeat(Math.floor(pct / 10))}${"░".repeat(10 - Math.floor(pct / 10))} ${pct}%`);
        }
      }
      return true;
    }
    if (choice === "2") {
      addChat("System", `━━ 완료한 퀘스트 (${questCount}개) ━━`);
      if (questHistory.length === 0) {
        addChat("System", "아직 완료한 퀘스트가 없습니다.");
      } else {
        const questTypeIcons = { deliver: "📦", explore: "🗺️", social: "💬", observe: "🔭", fetch: "🎒", chain: "🔗", investigate: "🔍", gift_quest: "🎁", nightwatch: "🌙", urgent: "⚡", mediate: "🕊️" };
        const show = questHistory.slice(0, 10);
        for (const h of show) {
          const icon = questTypeIcons[h.type] || "📋";
          const title = h.title || h.type;
          addChat("System", `  ${icon} ${title}`);
        }
        if (questHistory.length > 10) {
          addChat("System", `  ... 외 ${questHistory.length - 10}개`);
        }
      }
      return true;
    }
    return false;
  }

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
        addLog(`${bld?.label || buildingId}을(를) 확인했습니다.`);
      }
      return true;
    }

    if (hs.id === "exitGate") {
      addLog("플레이그라운드를 떠나는 중... 소개 페이지로 돌아갑니다.");
      setTimeout(() => {
        window.location.href = "/";
      }, 120);
      return true;
    }

    if (hs.id === "parkMonument") {
      addLog("기념비에 희미한 무늬가 새겨져 있습니다.");
      return true;
    }

    if (hs.id === "marketBoard") {
      addLog("게시판: '야시장은 20시에 광장 근처에서 시작됩니다.'");
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
        addLog("실내에서는 술래잡기를 할 수 없습니다.");
        return true;
      }
      if (tagGame.active) {
        addLog("이미 술래잡기 진행 중!");
        return true;
      }
      // 근처 NPC 중 랜덤 하나를 상대로 선택 (도슨트 제외)
      const candidates = npcs.filter(n => Math.hypot(n.x - player.x, n.y - player.y) < 25 && !(npcPersonas[n.id] && npcPersonas[n.id].isDocent));
      if (candidates.length === 0) {
        addLog("주변에 술래잡기할 NPC가 없습니다. NPC가 가까이 올 때 다시 시도하세요.");
        return true;
      }
      const target = candidates[Math.floor(Math.random() * candidates.length)];
      addChat("System", `🏃 놀이터에서 술래잡기! ${target.name}이(가) 술래! 60초간 도망치세요!`);
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
              addChat(greetNpc.name, reply || "나 말하는 법을 까먹은 거 같아...");
            } catch {
              addChat(greetNpc.name, "나 말하는 법을 까먹은 거 같아...");
            }
          })();
          if (greetNpc.id === "heo") adjustRelation("playerToHeo", 1);
          if (greetNpc.id === "kim") adjustRelation("playerToKim", 1);
        }
      } else {
        addChat("System", `${near.npc.name}은(는) 잠시 바쁩니다.`);
      }
      if (chatInputEl) chatInputEl.focus();
      return;
    }

    addChat("System", "근처에 대화 가능한 NPC가 없습니다.");
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

  function applyConversationEffect(npc, playerMsg, npcReplyText) {
    // LLM 응답 텍스트에서 감정 추론
    const { sentiment, intensity } = inferSentimentFromReply(npcReplyText);
    const relKey = relationKeyForNpc(npc.id);

    if (sentiment === "positive") {
      if (relKey) adjustRelation(relKey, intensity * 2);
      npc.favorPoints += Math.round(intensity * 2 * 1 * 1);
      if (intensity >= 2) {
        npc.mood = "happy";
        npc.moodUntil = nowMs() + 20_000;
      }
    } else if (sentiment === "negative") {
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
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const headers = await buildApiHeaders("npc_chat");
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
      return { reply, model };
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
      return { reply, model };
    } finally {
      clearTimeout(timeout);
    }
  }

  async function sendChatMessage(msg) {
    // 도슨트 안내소 메뉴 처리
    if (docentMenuActive && /^[1-4]$/.test(msg.trim())) {
      addChat("You", msg.trim());
      if (!handleDocentChoice(msg.trim())) {
        addChat("System", "1~4 중에서 선택해주세요.");
      }
      return;
    }
    // 퀘스트 게시판 메뉴 처리
    if (questBoardMenuActive && /^[1-3]$/.test(msg.trim())) {
      addChat("You", msg.trim());
      if (!handleQuestBoardChoice(msg.trim())) {
        addChat("System", "1~3 중에서 선택해주세요.");
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
        addChat("System", "선물할 대상이 근처에 없습니다.");
      }
      return;
    }
    if (/^(술래잡기|tag)$/i.test(msg.trim())) {
      const zoneHs = hotspots.find(h => h.id === "minigameZone");
      const nearZone = zoneHs && Math.hypot(player.x - zoneHs.x, player.y - zoneHs.y) < 5;
      if (!nearZone) {
        addChat("System", "놀이터 근처에서만 술래잡기를 할 수 있습니다! 🏃");
        return;
      }
      if (tagGame.active) {
        addChat("System", "이미 술래잡기 진행 중입니다!");
      } else {
        const candidates = npcs.filter(n => Math.hypot(n.x - player.x, n.y - player.y) < 25);
        if (!candidates.length) {
          addChat("System", "주변에 술래잡기할 NPC가 없습니다.");
        } else {
          const target = candidates[Math.floor(Math.random() * candidates.length)];
          addChat("You", "좋아, 술래잡기 하자!");
          addChat(target.name, "잡으러 간다~! 👹");
          conversationFocusNpcId = null;
          if (isMobileViewport()) mobileChatOpen = false;
          startTagGame(target);
        }
      }
      return;
    }
    if (/^(인벤|인벤토리|inventory|가방)$/i.test(msg.trim())) {
      addChat("System", `인벤토리: ${inventorySummary()}`);
      return;
    }
    const removeMatch = msg.trim().match(/^(제거|삭제|remove)\s+(.+)$/i);
    if (removeMatch) {
      const result = removeNpc(removeMatch[2].trim());
      if (result.ok) {
        addChat("System", `${result.name}이(가) 월드에서 제거되었습니다.`);
        addLog(`${result.name} NPC가 제거되었습니다.`);
      } else {
        addChat("System", result.reason);
      }
      return;
    }

    const target = chatTargetNpc();
    const npcNear = target && target.near;
    if (!npcNear && mp.enabled) {
      mpSendMessage(msg);
      const displayName = (player.flag ? player.flag + " " : "") + player.name;
      addChat(displayName, msg, "local-player");
      return;
    }
    if (!target) {
      addChat("You", msg);
      addChat("System", "근처에 대화 가능한 NPC가 없습니다.");
      return;
    }

    const npc = target.npc;
    conversationFocusNpcId = npc.id;
    addNpcChat(npc.id, "You", msg);
    upsertSpeechBubble("player", msg, 3000);
    if (!target.near) {
      moveNearNpcTarget(target.npc);
      addSystemToast(`${target.npc.name}에게 이동 중입니다. 가까이 가면 대화할 수 있습니다.`);
      return;
    }

    setChatSession(npc.id, 90000);
    if (chatSendEl) chatSendEl.disabled = true;
    if (chatInputEl) chatInputEl.disabled = true;
    let reply = "";
    let streamingDraft = null;
    let streamedRendered = false;
    try {
      if (LLM_STREAM_API_URL) {
        streamedRendered = true;
        streamingDraft = startStreamingChat(npc.id, npc.name);
        const llm = await requestLlmNpcReplyStream(npc, msg, (chunk) => {
          if (streamingDraft) streamingDraft.append(chunk);
        });
        reply = (streamingDraft && streamingDraft.text()) || llm.reply;
        if (streamingDraft) streamingDraft.done();
        lastLlmModel = llm.model || "gemini";
        if (!llmAvailable) addLog("LLM 연결이 복구되었습니다.");
        llmAvailable = true;
        lastLlmError = "";
      } else {
        const llm = await requestLlmNpcReply(npc, msg);
        reply = llm.reply;
        lastLlmModel = llm.model || "gemini";
        if (!llmAvailable) addLog("LLM 연결이 복구되었습니다.");
        llmAvailable = true;
        lastLlmError = "";
      }
    } catch (err) {
      const hadStreamText = streamingDraft && !streamingDraft.empty();
      if (streamingDraft) {
        if (hadStreamText) streamingDraft.done();
        else {
          streamingDraft.remove();
          streamedRendered = false;
        }
      }
      if (hadStreamText) {
        llmAvailable = false;
        lastLlmModel = "local";
        lastLlmError = err && err.message ? String(err.message) : "unknown";
        addChat("System", "스트리밍이 중단되어 응답 일부만 도착했습니다.");
      } else {
        try {
          const llm = await requestLlmNpcReply(npc, msg);
          reply = llm.reply;
          lastLlmModel = llm.model || "gemini";
          if (!llmAvailable) addLog("LLM 연결이 복구되었습니다.");
          llmAvailable = true;
          lastLlmError = "";
        } catch (err2) {
          if (llmAvailable) addLog("LLM 연결이 불안정해 로컬 응답으로 전환했습니다.");
          llmAvailable = false;
          lastLlmModel = "local";
          lastLlmError = (err2 && err2.message ? String(err2.message) : "") || (err && err.message ? String(err.message) : "unknown");
          reply = "나 말하는 법을 까먹은 거 같아...";
        }
      }
    } finally {
      if (chatSendEl) chatSendEl.disabled = false;
      if (chatInputEl) chatInputEl.disabled = false;
      if (chatInputEl) chatInputEl.focus();
    }
    setChatSession(npc.id, 90000);

    // NPC 응답에서 [부탁:종류:대상] 태그 파싱
    let cleanReply = reply;
    const favorTagMatch = reply.match(/\[부탁:(\w+):(\w+)\]/);
    if (favorTagMatch) {
      cleanReply = reply.replace(/\s*\[부탁:\w+:\w+\]\s*/, "").trim();
      const reqType = favorTagMatch[1];
      const reqTarget = favorTagMatch[2];
      // 기존 activeRequest가 없을 때만 부탁 생성
      if (!npc.activeRequest) {
        if (reqType === "bring_item" && itemTypes[reqTarget]) {
          npc.activeRequest = {
            type: "bring_item",
            title: `${npc.name}의 부탁`,
            description: `${itemTypes[reqTarget].label}을(를) 가져다 주세요.`,
            itemNeeded: reqTarget,
            expiresAt: nowMs() + 300_000,
            reward: { favorPoints: 20, relationBoost: 8, items: [] },
          };
        } else if (reqType === "deliver") {
          const targetNpc = npcs.find(n => n.id === reqTarget);
          if (targetNpc) {
            npc.activeRequest = {
              type: "deliver_to",
              title: `${targetNpc.name}에게 전달`,
              description: `${targetNpc.name}에게 가서 말을 전해주세요.`,
              targetNpcId: targetNpc.id,
              expiresAt: nowMs() + 300_000,
              reward: { favorPoints: 25, relationBoost: 10, items: [] },
            };
          }
        }
      }
    }

    if (cleanReply && !streamedRendered) addNpcChat(npc.id, npc.name, cleanReply);
    if (cleanReply) upsertSpeechBubble(npc.id, cleanReply, 4000);

    if (cleanReply) {
      applyConversationEffect(npc, msg, cleanReply);
      const shortMsg = msg.length > 30 ? msg.slice(0, 30) + "…" : msg;
      const shortReply = cleanReply.length > 40 ? cleanReply.slice(0, 40) + "…" : cleanReply;
      addNpcMemory(npc, "chat", `플레이어: "${shortMsg}" → 나: "${shortReply}"`);
      const mem = ensureMemoryFormat(npc);
      mem.conversationCount += 1;
      mem.lastConversation = world.totalMinutes;

      // NPC가 대화를 마무리하면 자동으로 세션 종료
      const farewellPattern = /(안녕|잘\s?가|다음에|나중에|바이|bye|또\s?봐|가\s?볼게|이만|할\s?일|다시\s?보자|그럼\s?이만|갈게)/i;
      if (farewellPattern.test(cleanReply)) {
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
      addLog("시뮬레이션에서 새로운 하루가 시작됩니다.");
    }

    const h = hourOfDay();

    const cafeKey = dayFlag("cafe-open");
    if (h >= 9 && !worldEvents.once[cafeKey]) {
      worldEvents.once[cafeKey] = true;
      addLog("카페가 열리고 아침 루틴이 시작됩니다.");
    }

    const marketKey = dayFlag("night-market");
    if (h >= 20 && !worldEvents.once[marketKey]) {
      worldEvents.once[marketKey] = true;
      addLog("광장 근처에서 야시장이 열렸습니다.");
    }

    const parkKey = dayFlag("park-aura");
    if ((h >= 20 || h < 5) && !worldEvents.once[parkKey] && dist(player, places.park) < 2.5) {
      worldEvents.once[parkKey] = true;
      addLog("공원 기념비 근처에서 이상한 기운이 느껴집니다.");
    }

    if (quest.dynamic && quest.dynamicStages) {
      const stage = quest.dynamicStages[quest.stage];
      if (stage && stage.visit) {
        handleDynamicQuestProgress({ id: "__visit__" });
      }
      // 제거된 NPC 대상 스테이지 자동 스킵
      if (stage && stage.npcId && !stage.visit && !stage.requireItem && !npcById(stage.npcId)) {
        addChat("System", `대상 NPC가 떠나서 이 단계를 건너뜁니다.`);
        advanceDynamicQuest();
      }
    }

    processGossip();
    updateNpcSocialInteractions();
    checkSeasonChange();
  }

  let nextNpcSocialAt = 0;

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
        if (Math.random() < 0.15 && dist(player, a) < 8) {
          const label = npcRelationLabel(rel);
          const lines = rel >= 65
            ? [`${b.name}이랑은 잘 지내고 있어.`, `${b.name}, 요즘 좋은 친구야.`]
            : rel < 35
              ? [`${b.name}이랑은 좀 서먹해...`, `${b.name}이랑 사이가 좀 그래.`]
              : [`${b.name}이랑은 그냥 평범한 사이야.`];
          const line = lines[Math.floor(Math.random() * lines.length)];
          speechBubbles.push({ x: a.x, y: a.y, text: line, until: now + 3500, speaker: a.name });
          spreadGossip(a.id, b.id, "relationship", rel >= 60 ? "positive" : rel < 35 ? "negative" : "neutral");
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
    addLog("월드 상태를 저장했습니다.");
  }

  function loadState() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      addLog("저장된 상태가 없습니다.");
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
      addLog("월드 상태를 불러왔습니다.");
    } catch (err) {
      addLog("저장된 상태를 불러오지 못했습니다.");
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
    if (!mag) return;

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
          addChat("System", `${targetNpc.name} 근처에 도착했습니다. 이제 대화할 수 있습니다.`);
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
        const h = hourOfDay();
        const persona = npcPersonas[npc.id];
        const personality = persona ? persona.personality : "";
        const isSunny = weather.current === "clear";
        const isRainy = weather.current === "rain" || weather.current === "storm";
        const isMorning = h >= 7 && h < 11;
        const isEvening = h >= 18 && h < 21;
        // 성격에 따른 기분 경향
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
        } else {
          npc.roamTarget = null;
          npc.state = "idle";
        }
      } else {
        npc.roamWait = 0.6 + Math.random() * 2.2;
        npc.state = "idle";
        // 자세 결정: 벤치 근처면 벤치에 앉기, 밤이면 가끔 눕기
        const h = hourOfDay();
        const closestBench = props
          .filter(p => p.type === "bench" && dist(npc, p) < 1.5)
          .sort((a, b) => dist(npc, a) - dist(npc, b))[0];
        if (closestBench && Math.random() < 0.6) {
          // 벤치 위치로 이동하고 벤치를 등지고 앉기
          npc.x = closestBench.x;
          npc.y = closestBench.y;
          npc.pose = "sitting";
          // 벤치 방향: 대로(x=25) 쪽을 바라보도록
          npc.seatFacing = Math.atan2(25 - npc.y, 25 - npc.x);
          npc.roamWait = 3 + Math.random() * 5;
        } else if (h >= 23 || h < 5) {
          npc.pose = Math.random() < 0.3 ? "lying" : "standing";
        } else {
          npc.pose = "standing";
        }
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

    // 플레이어 근처면 LLM으로 대화, 멀면 "..." 말풍선
    const playerNearby = dist(player, a) < 12 || dist(player, b) < 12;
    if (playerNearby && !npcChatLlmPending) {
      npcChatLlmPending = true;
      upsertSpeechBubble(a.id, "...", 5000);
      upsertSpeechBubble(b.id, "...", 5000);
      llmReplyOrEmpty(a, `(${b.name}에게 짧게 말을 거세요. 10자 이내 한마디.)`)
        .then((lineA) => {
          if (lineA) upsertSpeechBubble(a.id, lineA, 4000);
          return llmReplyOrEmpty(b, `(${a.name}이(가) "${lineA || '...'}"라고 했습니다. 짧게 대답하세요. 10자 이내.)`);
        })
        .then((lineB) => {
          if (lineB) upsertSpeechBubble(b.id, lineB, 4000);
        })
        .finally(() => { npcChatLlmPending = false; });
      addLog(`${a.name}과 ${b.name}이 대화합니다.`);
    } else {
      upsertSpeechBubble(a.id, "...", 2800);
      upsertSpeechBubble(b.id, "...", 2800);
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
    addLog("시점을 초기화했습니다.");
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

  function drawDiamond(x, y, color) {
    const p1 = project(x, y, 0);
    const p2 = project(x + 1, y, 0);
    const p3 = project(x + 1, y + 1, 0);
    const p4 = project(x, y + 1, 0);

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.beginPath();
    ctx.ellipse((p1.x + p3.x) * 0.5, (p1.y + p3.y) * 0.5, 4, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function getGroundSprite(kind, variant = "a") {
    return spriteCanvas(`ground:${kind}:${variant}`, 32, 32, (c, w, h) => {
      const base = kind === "water"
        ? (variant === "b" ? palette.waterB : palette.waterA)
        : kind === "road"
          ? (variant === "b" ? palette.roadB : palette.roadA)
          : (variant === "c" ? palette.grassC : (variant === "b" ? palette.grassB : palette.grassA));
      c.fillStyle = base;
      c.fillRect(0, 0, w, h);
      if (kind === "water") {
        c.strokeStyle = "rgba(255,255,255,0.26)";
        c.lineWidth = 1.1;
        for (let y0 = 6; y0 <= 24; y0 += 8) {
          c.beginPath();
          c.moveTo(4, y0);
          c.quadraticCurveTo(10, y0 - 3, 16, y0);
          c.quadraticCurveTo(22, y0 + 3, 28, y0);
          c.stroke();
        }
      } else if (kind === "road") {
        c.fillStyle = "rgba(157, 120, 70, 0.1)";
        for (let i = 0; i < 12; i += 1) {
          const x = (i * 13) % w;
          const y = (i * 7 + 5) % h;
          c.beginPath();
          c.arc(x, y, 1.4, 0, Math.PI * 2);
          c.fill();
        }
      } else {
        c.fillStyle = "rgba(255,255,255,0.08)";
        for (let i = 0; i < 10; i += 1) {
          const x = (i * 9) % w;
          const y = (i * 11 + 3) % h;
          c.beginPath();
          c.arc(x, y, 1.1, 0, Math.PI * 2);
          c.fill();
        }
      }
    });
  }

  function drawDiamondWithTexture(x, y, kind, variant = "a") {
    const p1 = project(x, y, 0);
    const p2 = project(x + 1, y, 0);
    const p3 = project(x + 1, y + 1, 0);
    const p4 = project(x, y + 1, 0);
    const minX = Math.min(p1.x, p2.x, p3.x, p4.x);
    const maxX = Math.max(p1.x, p2.x, p3.x, p4.x);
    const minY = Math.min(p1.y, p2.y, p3.y, p4.y);
    const maxY = Math.max(p1.y, p2.y, p3.y, p4.y);
    const tex = getGroundSprite(kind, variant);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(tex, minX, minY, Math.max(1, maxX - minX), Math.max(1, maxY - minY));
    ctx.restore();
  }


  function drawBuilding(b) {
    const pA = project(b.x, b.y, b.z);
    const pB = project(b.x + b.w, b.y, b.z);
    const pC = project(b.x + b.w, b.y + b.h, b.z);
    const pD = project(b.x, b.y + b.h, b.z);
    const baseA = project(b.x, b.y, 0);
    const baseB = project(b.x + b.w, b.y, 0);
    const baseC = project(b.x + b.w, b.y + b.h, 0);
    const baseD = project(b.x, b.y + b.h, 0);
    const zz = world.zoom;
    const tH = world.baseTileH * zz;
    const isHouse = b.id === "houseA" || b.id === "houseB" || b.id === "houseC";
    const isKsa = b.id === "ksa_main" || b.id === "ksa_dorm";

    const roofColor = b.roof || shade(b.color, -16);
    const signText = b.label;

    // ── Right wall ──
    ctx.fillStyle = shade(b.color, -8);
    ctx.beginPath();
    ctx.moveTo(pB.x, pB.y); ctx.lineTo(baseB.x, baseB.y);
    ctx.lineTo(baseC.x, baseC.y); ctx.lineTo(pC.x, pC.y);
    ctx.closePath(); ctx.fill();
    // Brick/panel lines
    ctx.strokeStyle = "rgba(0,0,0,0.06)"; ctx.lineWidth = 0.5;
    for (let i = 1; i < Math.max(2, Math.round(b.h * 1.5)); i++) {
      const t = i / Math.max(2, Math.round(b.h * 1.5));
      ctx.beginPath();
      ctx.moveTo(baseB.x + (baseC.x - baseB.x) * t, baseB.y + (baseC.y - baseB.y) * t);
      ctx.lineTo(pB.x + (pC.x - pB.x) * t, pB.y + (pC.y - pB.y) * t);
      ctx.stroke();
    }
    // ── Left wall ──
    ctx.fillStyle = shade(b.color, -16);
    ctx.beginPath();
    ctx.moveTo(pD.x, pD.y); ctx.lineTo(baseD.x, baseD.y);
    ctx.lineTo(baseC.x, baseC.y); ctx.lineTo(pC.x, pC.y);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.05)"; ctx.lineWidth = 0.5;
    for (let i = 1; i < Math.max(2, Math.round(b.w * 1.5)); i++) {
      const t = i / Math.max(2, Math.round(b.w * 1.5));
      ctx.beginPath();
      ctx.moveTo(baseD.x + (baseC.x - baseD.x) * t, baseD.y + (baseC.y - baseD.y) * t);
      ctx.lineTo(pD.x + (pC.x - pD.x) * t, pD.y + (pC.y - pD.y) * t);
      ctx.stroke();
    }
    // ── Top face ──
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.moveTo(pA.x, pA.y); ctx.lineTo(pB.x, pB.y);
    ctx.lineTo(pC.x, pC.y); ctx.lineTo(pD.x, pD.y);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(78,62,42,0.3)"; ctx.lineWidth = 1; ctx.stroke();

    // ── Roof (varied by building type) ──
    const rh = tH * 0.7;
    if (isHouse) {
      // Gable roof (both sides visible)
      const ridgeA = { x: (pA.x + pD.x) * 0.5, y: (pA.y + pD.y) * 0.5 - rh };
      const ridgeB = { x: (pB.x + pC.x) * 0.5, y: (pB.y + pC.y) * 0.5 - rh };
      ctx.fillStyle = roofColor;
      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y); ctx.lineTo(ridgeA.x, ridgeA.y);
      ctx.lineTo(ridgeB.x, ridgeB.y); ctx.lineTo(pB.x, pB.y);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(60,40,20,0.3)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = shade(roofColor, -10);
      ctx.beginPath();
      ctx.moveTo(pD.x, pD.y); ctx.lineTo(ridgeA.x, ridgeA.y);
      ctx.lineTo(ridgeB.x, ridgeB.y); ctx.lineTo(pC.x, pC.y);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = shade(b.color, -4);
      ctx.beginPath();
      ctx.moveTo(pB.x, pB.y); ctx.lineTo(ridgeB.x, ridgeB.y); ctx.lineTo(pC.x, pC.y);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(90,60,30,0.5)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(ridgeA.x, ridgeA.y); ctx.lineTo(ridgeB.x, ridgeB.y); ctx.stroke();
      // Chimney
      const chX = ridgeB.x - 4 * zz; const chY = ridgeB.y;
      ctx.fillStyle = "#8a5a44";
      ctx.beginPath(); ctx.roundRect(chX - 2.5 * zz, chY - 2 * zz, 5 * zz, 10 * zz, 1); ctx.fill();
      ctx.fillStyle = "#7a4a38";
      ctx.beginPath(); ctx.roundRect(chX - 3 * zz, chY - 2.5 * zz, 6 * zz, 2 * zz, 1); ctx.fill();
      const hr = hourOfDay();
      if (hr >= 18 || hr < 8) {
        ctx.fillStyle = "rgba(200,200,200,0.2)";
        ctx.beginPath(); ctx.ellipse(chX, chY - 5 * zz, 3, 5, 0, 0, Math.PI * 2); ctx.fill();
      }
    } else if (isKsa) {
      // Flat institutional roof with parapet
      const ph = tH * 0.15;
      const ppA = { x: pA.x, y: pA.y - ph }; const ppB = { x: pB.x, y: pB.y - ph };
      const ppC = { x: pC.x, y: pC.y - ph }; const ppD = { x: pD.x, y: pD.y - ph };
      ctx.fillStyle = shade(roofColor, 5);
      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y); ctx.lineTo(ppA.x, ppA.y);
      ctx.lineTo(ppB.x, ppB.y); ctx.lineTo(pB.x, pB.y);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = shade(roofColor, -5);
      ctx.beginPath();
      ctx.moveTo(pB.x, pB.y); ctx.lineTo(ppB.x, ppB.y);
      ctx.lineTo(ppC.x, ppC.y); ctx.lineTo(pC.x, pC.y);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = shade(roofColor, 10);
      ctx.beginPath();
      ctx.moveTo(ppA.x, ppA.y); ctx.lineTo(ppB.x, ppB.y);
      ctx.lineTo(ppC.x, ppC.y); ctx.lineTo(ppD.x, ppD.y);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(60,40,20,0.25)"; ctx.lineWidth = 1; ctx.stroke();
    } else if (b.id === "market") {
      // Hip roof (red)
      const peakY = Math.min(pA.y, pB.y) - rh * 0.8;
      const midAB = { x: (pA.x + pB.x) * 0.5, y: peakY };
      const midDC = { x: (pD.x + pC.x) * 0.5, y: (pD.y + pC.y) * 0.5 - rh * 0.4 };
      ctx.fillStyle = "#c0392b";
      ctx.beginPath(); ctx.moveTo(pA.x, pA.y); ctx.lineTo(midAB.x, midAB.y); ctx.lineTo(pB.x, pB.y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#a93226";
      ctx.beginPath(); ctx.moveTo(pB.x, pB.y); ctx.lineTo(midAB.x, midAB.y); ctx.lineTo(midDC.x, midDC.y); ctx.lineTo(pC.x, pC.y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#922b21";
      ctx.beginPath(); ctx.moveTo(pD.x, pD.y); ctx.lineTo(midAB.x, midAB.y); ctx.lineTo(midDC.x, midDC.y); ctx.lineTo(pC.x, pC.y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1.2;
      for (let i = 0; i < 5; i++) {
        const t = i / 4;
        ctx.beginPath();
        ctx.moveTo(pA.x + (pB.x - pA.x) * t, pA.y + (pB.y - pA.y) * t);
        ctx.lineTo(midAB.x, midAB.y); ctx.stroke();
      }
    } else if (b.id === "library") {
      // Classical pediment
      const pedH = rh * 0.9;
      const peak = { x: (pA.x + pB.x) * 0.5, y: Math.min(pA.y, pB.y) - pedH };
      ctx.fillStyle = roofColor;
      ctx.beginPath(); ctx.moveTo(pA.x - 2, pA.y); ctx.lineTo(peak.x, peak.y); ctx.lineTo(pB.x + 2, pB.y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(60,40,20,0.35)"; ctx.lineWidth = 1; ctx.stroke();
      const backPk = { x: (pC.x + pD.x) * 0.5, y: (pC.y + pD.y) * 0.5 - pedH * 0.3 };
      ctx.fillStyle = shade(roofColor, -10);
      ctx.beginPath(); ctx.moveTo(pB.x + 2, pB.y); ctx.lineTo(peak.x, peak.y); ctx.lineTo(backPk.x, backPk.y); ctx.lineTo(pC.x, pC.y); ctx.closePath(); ctx.fill(); ctx.stroke();
      // Cornice
      ctx.fillStyle = shade(b.color, 10);
      const cH = 2 * zz;
      ctx.beginPath(); ctx.moveTo(pA.x - 3, pA.y); ctx.lineTo(pB.x + 3, pB.y); ctx.lineTo(pB.x + 3, pB.y + cH); ctx.lineTo(pA.x - 3, pA.y + cH); ctx.closePath(); ctx.fill();
    } else if (b.id === "cafe" || b.id === "bakery" || b.id === "florist") {
      // Gambrel/mansard roof
      const midH = rh * 0.55; const topH = rh * 0.3;
      const mA = { x: pA.x + (pD.x - pA.x) * 0.15, y: pA.y + (pD.y - pA.y) * 0.15 - midH };
      const mB = { x: pB.x + (pC.x - pB.x) * 0.15, y: pB.y + (pC.y - pB.y) * 0.15 - midH };
      ctx.fillStyle = roofColor;
      ctx.beginPath(); ctx.moveTo(pA.x, pA.y); ctx.lineTo(mA.x, mA.y); ctx.lineTo(mB.x, mB.y); ctx.lineTo(pB.x, pB.y); ctx.closePath(); ctx.fill();
      const ridge = { x: (mA.x + mB.x) * 0.5, y: (mA.y + mB.y) * 0.5 - topH };
      ctx.fillStyle = shade(roofColor, 8);
      ctx.beginPath(); ctx.moveTo(mA.x, mA.y); ctx.lineTo(ridge.x, ridge.y); ctx.lineTo(mB.x, mB.y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = shade(roofColor, -8);
      const sideBack = { x: pC.x + (pD.x - pC.x) * 0.1, y: pC.y + (pD.y - pC.y) * 0.1 - midH * 0.3 };
      ctx.beginPath(); ctx.moveTo(pB.x, pB.y); ctx.lineTo(mB.x, mB.y); ctx.lineTo(ridge.x, ridge.y); ctx.lineTo(sideBack.x, sideBack.y); ctx.lineTo(pC.x, pC.y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(60,40,20,0.25)"; ctx.lineWidth = 1; ctx.stroke();
      if (b.id === "florist") {
        const fc = ["#ff6b9d", "#ffd93d", "#6bcf7f", "#c77dff"];
        for (let i = 0; i < 4; i++) {
          const t = 0.15 + i * 0.22;
          const fx = pA.x + (pB.x - pA.x) * t; const fy = pA.y + (pB.y - pA.y) * t - 3;
          ctx.fillStyle = "#7a5a3a";
          ctx.beginPath(); ctx.roundRect(fx - 3, fy, 6, 3, 1); ctx.fill();
          ctx.fillStyle = fc[i];
          ctx.beginPath(); ctx.arc(fx, fy - 2, 2.5, 0, Math.PI * 2); ctx.fill();
        }
      }
    } else if (b.id === "office") {
      // Modern flat roof with accent stripe
      const rtH = tH * 0.12;
      ctx.fillStyle = shade(roofColor, 10);
      ctx.beginPath();
      ctx.moveTo(pA.x - 1, pA.y - rtH); ctx.lineTo(pB.x + 1, pB.y - rtH);
      ctx.lineTo(pC.x + 1, pC.y - rtH); ctx.lineTo(pD.x - 1, pD.y - rtH);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(60,40,20,0.2)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = shade(b.color, -20);
      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y); ctx.lineTo(pB.x, pB.y);
      ctx.lineTo(pB.x, pB.y + 2 * zz); ctx.lineTo(pA.x, pA.y + 2 * zz);
      ctx.closePath(); ctx.fill();
    }

    // ── Windows (varied) ──
    if (isKsa || b.id === "office") {
      // Grid windows
      const rows = b.id === "ksa_main" ? 3 : 2;
      const cols = Math.max(2, Math.round(b.w * 0.8));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const tCol = (c + 0.5) / cols; const tRow = 0.25 + r * 0.25;
          const rwx = baseB.x + (baseC.x - baseB.x) * tCol; const rwy = baseB.y + (baseC.y - baseB.y) * tCol;
          const rwTx = pB.x + (pC.x - pB.x) * tCol; const rwTy = pB.y + (pC.y - pB.y) * tCol;
          const wx = rwx + (rwTx - rwx) * tRow; const wy = rwy + (rwTy - rwy) * tRow;
          ctx.fillStyle = "rgba(200,230,255,0.75)";
          ctx.strokeStyle = "rgba(60,40,20,0.3)"; ctx.lineWidth = 0.6;
          ctx.beginPath(); ctx.roundRect(wx - 2.5 * zz, wy - 2 * zz, 5 * zz, 4 * zz, 1); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = "rgba(80,60,40,0.15)"; ctx.lineWidth = 0.4;
          ctx.beginPath(); ctx.moveTo(wx, wy - 2 * zz); ctx.lineTo(wx, wy + 2 * zz); ctx.stroke();
        }
      }
    } else if (b.id === "library") {
      // Tall arched windows
      for (let i = 0; i < 2; i++) {
        const t = 0.3 + i * 0.4;
        const rwx = baseB.x + (baseC.x - baseB.x) * t; const rwy = baseB.y + (baseC.y - baseB.y) * t;
        const rwTx = pB.x + (pC.x - pB.x) * t; const rwTy = pB.y + (pC.y - pB.y) * t;
        const wx = rwx + (rwTx - rwx) * 0.4; const wy = rwy + (rwTy - rwy) * 0.4;
        ctx.fillStyle = "rgba(210,235,255,0.8)";
        ctx.strokeStyle = "rgba(60,40,20,0.35)"; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.roundRect(wx - 2.5 * zz, wy - 4 * zz, 5 * zz, 8 * zz, [2.5 * zz, 2.5 * zz, 0, 0]); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "rgba(80,60,40,0.2)"; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(wx, wy - 4 * zz); ctx.lineTo(wx, wy + 4 * zz); ctx.stroke();
      }
    } else {
      // Standard windows with cross frames
      const leftMid = { x: (pD.x + pA.x) * 0.5, y: (pD.y + pA.y) * 0.5 };
      const rightMid = { x: (pC.x + pB.x) * 0.5, y: (pC.y + pB.y) * 0.5 };
      const winY = (pA.y + pD.y) * 0.5;
      const wW = isHouse ? 5 * zz : 6 * zz; const wH = isHouse ? 4 * zz : 5 * zz;
      ctx.fillStyle = isHouse ? "rgba(255,240,200,0.7)" : "rgba(220,240,255,0.8)";
      ctx.strokeStyle = "rgba(60,40,20,0.35)"; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.roundRect(leftMid.x - wW * 0.5, winY - wH * 0.5, wW, wH, 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(rightMid.x - wW * 0.5, winY - wH * 0.5, wW, wH, 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(80,60,40,0.2)"; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(leftMid.x, winY - wH * 0.5); ctx.lineTo(leftMid.x, winY + wH * 0.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(leftMid.x - wW * 0.5, winY); ctx.lineTo(leftMid.x + wW * 0.5, winY); ctx.stroke();
      if (isHouse) {
        ctx.fillStyle = shade(b.color, -25);
        ctx.fillRect(leftMid.x - wW * 0.5 - 2 * zz, winY - wH * 0.5, 1.5 * zz, wH);
        ctx.fillRect(leftMid.x + wW * 0.5 + 0.5 * zz, winY - wH * 0.5, 1.5 * zz, wH);
      }
    }

    // ── Door ──
    const doorX = (baseD.x + baseC.x) * 0.5;
    const doorY = (baseD.y + baseC.y) * 0.5;
    const doorW = isHouse ? 7 * zz : 8 * zz;
    const doorH = isHouse ? 11 * zz : 13 * zz;
    ctx.fillStyle = isHouse ? "#7a5a3a" : "#9f7650";
    ctx.strokeStyle = "rgba(60,40,20,0.4)"; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.roundRect(doorX - doorW * 0.5, doorY - doorH * 0.8, doorW, doorH, isHouse ? [3, 3, 0, 0] : 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(200,180,100,0.8)";
    ctx.beginPath(); ctx.arc(doorX + doorW * 0.2, doorY - doorH * 0.3, 1.2 * zz, 0, Math.PI * 2); ctx.fill();
    if (b.id === "cafe" || b.id === "market") {
      ctx.fillStyle = "rgba(200,230,255,0.4)";
      ctx.beginPath(); ctx.roundRect(doorX - doorW * 0.35, doorY - doorH * 0.7, doorW * 0.7, doorH * 0.5, 2); ctx.fill();
    }

    // ── Sign ──
    const signCx = (pA.x + pB.x + pC.x + pD.x) * 0.25;
    const signCy = (pA.y + pB.y + pC.y + pD.y) * 0.25 + zz * 1.5;
    const signW = Math.max(48, signText.length * zz * 6.2);
    const signH = 14 * zz;
    const signColors = {
      cafe: "#ffefc7", office: "#e4efff", market: "#fff0e0",
      bakery: "#fff5e0", florist: "#ffe8f0", library: "#e8f0ff",
      ksa_main: "#f0ebe0", ksa_dorm: "#ede8d8",
      houseA: "#f5ead8", houseB: "#eaeaea", houseC: "#f2e4d4",
    };
    ctx.fillStyle = signColors[b.id] || "#ffe6bd";
    ctx.shadowColor = "rgba(0,0,0,0.15)"; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2;
    ctx.beginPath(); ctx.roundRect(signCx - signW * 0.5, signCy - signH * 0.5, signW, signH, 6); ctx.fill();
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.strokeStyle = "rgba(80,61,41,0.5)"; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = "rgba(60,42,24,0.92)";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.max(13, Math.round(zz * 5))}px sans-serif`;
    ctx.fillText(signText, signCx, signCy);
    ctx.textAlign = "start"; ctx.textBaseline = "alphabetic";

    // ── Subtle top glow ──
    const hCx = (pA.x + pC.x) * 0.5;
    const hCy = (pA.y + pC.y) * 0.5 - 6;
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath(); ctx.ellipse(hCx, hCy, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
  }

  function drawEntitySprite(ctx2d, species, color, isPlayer) {
    const w = ctx2d.canvas.width;
    const h = ctx2d.canvas.height;
    const cx = w * 0.5;
    const feetY = h * 0.83;
    const headR = w * 0.145;
    const headY = h * 0.27;
    const neckY = headY + headR * 0.95;
    const torsoTop = neckY + 2;
    const torsoBottom = h * 0.61;
    const shoulderW = w * 0.25;
    const waistW = w * 0.19;
    const skin = isPlayer ? "#f6d5ba" : "#f2cfb1";
    const hairBase = {
      human_a: "#2d2a2a",
      human_b: "#4a2f1f",
      human_c: "#5b3f2e",
      human_d: "#1f1f26",
      human_e: "#6a4a2c",
      human_f: "#2a3248",
      human_g: "#3f2b1e",
      human_h: "#26282f",
      human_i: "#5a3c2b",
    };
    const hair = hairBase[species] || "#33271f";

    ctx2d.fillStyle = "rgba(0,0,0,0.15)";
    ctx2d.beginPath();
    ctx2d.ellipse(cx, feetY + 4, w * 0.13, h * 0.04, 0, 0, Math.PI * 2);
    ctx2d.fill();

    // legs
    ctx2d.fillStyle = shade(color, -26);
    ctx2d.beginPath();
    ctx2d.roundRect(cx - w * 0.085, torsoBottom - 2, w * 0.06, h * 0.2, 5);
    ctx2d.roundRect(cx + w * 0.025, torsoBottom - 2, w * 0.06, h * 0.2, 5);
    ctx2d.fill();
    ctx2d.fillStyle = "#3d2f2a";
    ctx2d.beginPath();
    ctx2d.roundRect(cx - w * 0.094, feetY - 4, w * 0.08, h * 0.04, 4);
    ctx2d.roundRect(cx + w * 0.015, feetY - 4, w * 0.08, h * 0.04, 4);
    ctx2d.fill();

    // torso
    const clothGrad = ctx2d.createLinearGradient(cx, torsoTop, cx, torsoBottom);
    clothGrad.addColorStop(0, shade(color, 18));
    clothGrad.addColorStop(1, shade(color, -9));
    ctx2d.fillStyle = clothGrad;
    ctx2d.beginPath();
    ctx2d.moveTo(cx - shoulderW * 0.5, torsoTop + 3);
    ctx2d.lineTo(cx + shoulderW * 0.5, torsoTop + 3);
    ctx2d.lineTo(cx + waistW * 0.5, torsoBottom);
    ctx2d.lineTo(cx - waistW * 0.5, torsoBottom);
    ctx2d.closePath();
    ctx2d.fill();

    // arms
    ctx2d.fillStyle = shade(color, -4);
    ctx2d.beginPath();
    ctx2d.roundRect(cx - shoulderW * 0.64, torsoTop + 7, w * 0.055, h * 0.16, 5);
    ctx2d.roundRect(cx + shoulderW * 0.585, torsoTop + 7, w * 0.055, h * 0.16, 5);
    ctx2d.fill();
    ctx2d.fillStyle = skin;
    ctx2d.beginPath();
    ctx2d.arc(cx - shoulderW * 0.61 + w * 0.03, torsoTop + h * 0.17, w * 0.03, 0, Math.PI * 2);
    ctx2d.arc(cx + shoulderW * 0.61 + w * 0.03, torsoTop + h * 0.17, w * 0.03, 0, Math.PI * 2);
    ctx2d.fill();

    // head
    ctx2d.fillStyle = skin;
    ctx2d.beginPath();
    ctx2d.arc(cx, headY, headR, 0, Math.PI * 2);
    ctx2d.fill();

    // hair styles
    ctx2d.fillStyle = hair;
    if (species === "human_b" || species === "human_h") {
      ctx2d.beginPath();
      ctx2d.arc(cx, headY - headR * 0.18, headR * 1.03, Math.PI, Math.PI * 2);
      ctx2d.lineTo(cx + headR * 0.86, headY + headR * 0.1);
      ctx2d.quadraticCurveTo(cx + headR * 0.45, headY - headR * 0.02, cx + headR * 0.15, headY + headR * 0.2);
      ctx2d.lineTo(cx - headR * 0.72, headY + headR * 0.22);
      ctx2d.closePath();
      ctx2d.fill();
    } else if (species === "human_c" || species === "human_f") {
      ctx2d.beginPath();
      ctx2d.arc(cx, headY - headR * 0.2, headR * 1.02, Math.PI, Math.PI * 2);
      ctx2d.lineTo(cx + headR * 0.72, headY + headR * 0.62);
      ctx2d.lineTo(cx - headR * 0.72, headY + headR * 0.62);
      ctx2d.closePath();
      ctx2d.fill();
    } else {
      ctx2d.beginPath();
      ctx2d.arc(cx, headY - headR * 0.18, headR * 1.02, Math.PI, Math.PI * 2);
      ctx2d.lineTo(cx + headR * 0.74, headY + headR * 0.18);
      ctx2d.quadraticCurveTo(cx, headY - headR * 0.06, cx - headR * 0.72, headY + headR * 0.22);
      ctx2d.closePath();
      ctx2d.fill();
    }

    // face
    ctx2d.fillStyle = "#2d231a";
    ctx2d.beginPath();
    ctx2d.arc(cx - headR * 0.33, headY + headR * 0.06, headR * 0.08, 0, Math.PI * 2);
    ctx2d.arc(cx + headR * 0.33, headY + headR * 0.06, headR * 0.08, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.strokeStyle = "rgba(77,52,36,0.7)";
    ctx2d.lineWidth = 1.2;
    ctx2d.beginPath();
    ctx2d.arc(cx, headY + headR * 0.32, headR * 0.21, 0.2, Math.PI - 0.2);
    ctx2d.stroke();
    ctx2d.fillStyle = "rgba(240, 136, 146, 0.46)";
    ctx2d.beginPath();
    ctx2d.arc(cx - headR * 0.48, headY + headR * 0.28, headR * 0.14, 0, Math.PI * 2);
    ctx2d.arc(cx + headR * 0.48, headY + headR * 0.28, headR * 0.14, 0, Math.PI * 2);
    ctx2d.fill();
  }

  function getEntitySprite(e, radius) {
    const species = e.species || "cat";
    const isPlayerLike = e === player || !!e._isRemotePlayer;
    const key = `entity:${species}:${e.color}:${isPlayerLike ? "p" : "n"}`;
    return spriteCanvas(key, 140, 140, (c, w) => drawEntitySprite(c, species, e.color, isPlayerLike));
  }

  function drawEntity(e, radius, label) {
    const p = project(e.x, e.y, 0);
    const sh = project(e.x, e.y, -0.08);
    ctx.beginPath();
    ctx.ellipse(sh.x, sh.y, radius + 5, radius * 0.44, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
    ctx.fill();

    const sprite = getEntitySprite(e, radius);
    const w = radius * 2.9;
    const h = radius * 3.05;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(sprite, p.x - w * 0.5, p.y - h * 0.95, w, h);

    const fontSize = Math.max(14, Math.min(23, radius * 0.92));
    const tagW = Math.max(40, label.length * fontSize * 0.66 + 11);
    const tagH = Math.max(14, fontSize + 3);
    const tx = p.x - tagW * 0.5;
    const ty = p.y - (23 + radius * 1.42);
    ctx.fillStyle = "rgba(255, 253, 245, 0.74)";
    ctx.beginPath();
    ctx.roundRect(tx, ty, tagW, tagH, 10);
    ctx.fill();
    ctx.fillStyle = "rgba(62, 49, 34, 0.9)";
    ctx.font = `700 ${fontSize}px sans-serif`;
    ctx.fillText(label, tx + 6, ty + tagH - 3);
  }

  function getPropSprite(type, variant = "a") {
    return spriteCanvas(`prop:${type}:${variant}`, 110, 130, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      const cx = w * 0.5;
      const baseY = h * 0.78;

      if (type === "tree") {
        c.fillStyle = "#996d44";
        c.beginPath();
        c.roundRect(cx - 7, baseY - 28, 14, 28, 3);
        c.fill();
        const grad = c.createRadialGradient(cx - 4, baseY - 58, 2, cx, baseY - 54, 34);
        grad.addColorStop(0, "#8ce073");
        grad.addColorStop(1, "#57ad46");
        c.fillStyle = grad;
        c.beginPath();
        c.arc(cx - 18, baseY - 42, 18, 0, Math.PI * 2);
        c.arc(cx + 1, baseY - 54, 22, 0, Math.PI * 2);
        c.arc(cx + 23, baseY - 43, 18, 0, Math.PI * 2);
        c.fill();
        return;
      }
      if (type === "bush") {
        const grad = c.createRadialGradient(cx, baseY - 14, 2, cx, baseY - 12, 30);
        grad.addColorStop(0, "#7fd369");
        grad.addColorStop(1, "#59ac45");
        c.fillStyle = grad;
        c.beginPath();
        c.arc(cx - 14, baseY - 6, 14, 0, Math.PI * 2);
        c.arc(cx + 1, baseY - 12, 17, 0, Math.PI * 2);
        c.arc(cx + 17, baseY - 6, 14, 0, Math.PI * 2);
        c.fill();
        return;
      }
      if (type === "flower") {
        c.strokeStyle = "rgba(89,137,71,0.7)";
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(cx, baseY);
        c.lineTo(cx, baseY - 22);
        c.stroke();
        c.fillStyle = variant === "yellow" ? palette.flowerYellow : palette.flowerPink;
        c.beginPath();
        c.arc(cx - 6, baseY - 22, 5, 0, Math.PI * 2);
        c.arc(cx + 6, baseY - 22, 5, 0, Math.PI * 2);
        c.arc(cx, baseY - 28, 5, 0, Math.PI * 2);
        c.arc(cx, baseY - 16, 5, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#fff5b6";
        c.beginPath();
        c.arc(cx, baseY - 22, 3, 0, Math.PI * 2);
        c.fill();
        return;
      }
      if (type === "fence") {
        const grad = c.createLinearGradient(cx, baseY - 26, cx, baseY);
        grad.addColorStop(0, "#e4b678");
        grad.addColorStop(1, "#c99358");
        c.fillStyle = grad;
        c.beginPath();
        c.roundRect(cx - 14, baseY - 24, 28, 24, 3);
        c.fill();
        c.strokeStyle = "rgba(110,73,40,0.35)";
        c.lineWidth = 1.2;
        c.beginPath();
        c.moveTo(cx - 9, baseY - 16);
        c.lineTo(cx + 9, baseY - 16);
        c.moveTo(cx - 9, baseY - 8);
        c.lineTo(cx + 9, baseY - 8);
        c.stroke();
        return;
      }
      if (type === "lamp") {
        c.strokeStyle = "rgba(82, 92, 102, 0.7)";
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(cx, baseY);
        c.lineTo(cx, baseY - 44);
        c.stroke();
        c.fillStyle = "#ffe08f";
        c.beginPath();
        c.roundRect(cx - 8, baseY - 56, 16, 14, 3);
        c.fill();
        return;
      }
      if (type === "bench") {
        const grad = c.createLinearGradient(cx, baseY - 14, cx, baseY);
        grad.addColorStop(0, "#d4a574");
        grad.addColorStop(1, "#b8845a");
        c.fillStyle = grad;
        c.beginPath(); c.roundRect(cx - 16, baseY - 6, 32, 5, 2); c.fill();
        c.beginPath(); c.roundRect(cx - 16, baseY - 14, 32, 3, 2); c.fill();
        c.fillStyle = "#8a6840";
        c.fillRect(cx - 14, baseY - 14, 2, 14);
        c.fillRect(cx + 12, baseY - 14, 2, 14);
        return;
      }
      if (type === "rock") {
        const rg = c.createRadialGradient(cx - 2, baseY - 8, 2, cx, baseY - 6, 14);
        rg.addColorStop(0, "#b0b0b0");
        rg.addColorStop(1, "#787878");
        c.fillStyle = rg;
        c.beginPath();
        c.ellipse(cx - 3, baseY - 5, 11, 7, 0, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.ellipse(cx + 7, baseY - 4, 8, 5, 0.3, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "rgba(255,255,255,0.25)";
        c.beginPath();
        c.ellipse(cx - 3, baseY - 9, 4, 2, 0, 0, Math.PI * 2);
        c.fill();
        return;
      }
      if (type === "signpost") {
        c.fillStyle = "#9f7650";
        c.fillRect(cx - 1.5, baseY - 28, 3, 28);
        const bg = c.createLinearGradient(cx, baseY - 24, cx, baseY - 16);
        bg.addColorStop(0, "#e8c9a6");
        bg.addColorStop(1, "#c4a073");
        c.fillStyle = bg;
        c.beginPath(); c.roundRect(cx - 12, baseY - 26, 24, 10, 2); c.fill();
        c.strokeStyle = "rgba(80,61,41,0.6)";
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(cx + 2, baseY - 23);
        c.lineTo(cx + 8, baseY - 21);
        c.lineTo(cx + 2, baseY - 19);
        c.stroke();
        return;
      }
      if (type === "questboard") {
        // 기둥 2개
        c.fillStyle = "#8b6842";
        c.fillRect(cx - 14, baseY - 36, 3, 36);
        c.fillRect(cx + 11, baseY - 36, 3, 36);
        // 게시판 본체
        const bbg = c.createLinearGradient(cx, baseY - 38, cx, baseY - 14);
        bbg.addColorStop(0, "#d4a96a");
        bbg.addColorStop(1, "#b8904e");
        c.fillStyle = bbg;
        c.beginPath(); c.roundRect(cx - 16, baseY - 38, 32, 24, 3); c.fill();
        // 테두리
        c.strokeStyle = "#7a5530";
        c.lineWidth = 1.5;
        c.beginPath(); c.roundRect(cx - 16, baseY - 38, 32, 24, 3); c.stroke();
        // 종이 메모들
        c.fillStyle = "#fff8e7";
        c.fillRect(cx - 12, baseY - 35, 10, 8);
        c.fillStyle = "#f0e8d0";
        c.fillRect(cx + 1, baseY - 34, 10, 9);
        c.fillStyle = "#fff0d0";
        c.fillRect(cx - 10, baseY - 24, 8, 6);
        c.fillStyle = "#e8f0e0";
        c.fillRect(cx + 3, baseY - 22, 8, 6);
        // 핀
        c.fillStyle = "#e05050";
        c.beginPath(); c.arc(cx - 7, baseY - 35, 1.5, 0, Math.PI * 2); c.fill();
        c.fillStyle = "#4080e0";
        c.beginPath(); c.arc(cx + 6, baseY - 34, 1.5, 0, Math.PI * 2); c.fill();
        c.fillStyle = "#50c050";
        c.beginPath(); c.arc(cx - 6, baseY - 24, 1.5, 0, Math.PI * 2); c.fill();
        return;
      }
      if (type === "fountain") {
        c.fillStyle = "#a8d4f0";
        c.beginPath();
        c.ellipse(cx, baseY, 22, 9, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "rgba(255,255,255,0.35)";
        c.beginPath();
        c.ellipse(cx - 5, baseY - 1, 9, 3, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#d0d0d0";
        c.beginPath(); c.roundRect(cx - 3, baseY - 24, 6, 24, 2); c.fill();
        c.fillStyle = "#a8d4f0";
        c.beginPath();
        c.ellipse(cx, baseY - 20, 10, 4, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "rgba(130,190,240,0.5)";
        c.beginPath();
        c.ellipse(cx, baseY - 30, 3, 7, 0, 0, Math.PI * 2);
        c.fill();
        return;
      }
      // ─── Interior Furniture Sprites ───
      if (type === "table_round") {
        c.fillStyle = "rgba(120,80,40,0.2)";
        c.beginPath(); c.ellipse(cx, baseY + 2, 16, 6, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = "#a0724a";
        c.beginPath(); c.ellipse(cx, baseY - 6, 14, 8, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = "#b8855a";
        c.beginPath(); c.ellipse(cx, baseY - 8, 12, 6, 0, 0, Math.PI * 2); c.fill();
        return;
      }
      if (type === "table_rect") {
        c.fillStyle = "rgba(120,80,40,0.2)";
        c.beginPath(); c.roundRect(cx - 16, baseY - 1, 32, 8, 2); c.fill();
        c.fillStyle = "#a0724a";
        c.beginPath(); c.roundRect(cx - 14, baseY - 8, 28, 10, 2); c.fill();
        c.fillStyle = "#b8855a";
        c.beginPath(); c.roundRect(cx - 14, baseY - 10, 28, 6, 2); c.fill();
        return;
      }
      if (type === "chair") {
        c.fillStyle = "#8b6842";
        c.beginPath(); c.roundRect(cx - 6, baseY - 4, 12, 4, 1); c.fill();
        c.fillStyle = "#7a5a38";
        c.beginPath(); c.roundRect(cx - 6, baseY - 14, 12, 10, 2); c.fill();
        return;
      }
      if (type === "counter") {
        c.fillStyle = "#8b6842";
        c.beginPath(); c.roundRect(cx - 20, baseY - 10, 40, 12, 2); c.fill();
        c.fillStyle = "#a0784e";
        c.beginPath(); c.roundRect(cx - 20, baseY - 14, 40, 6, 2); c.fill();
        return;
      }
      if (type === "bookshelf") {
        c.fillStyle = "#5a3e28";
        c.beginPath(); c.roundRect(cx - 14, baseY - 36, 28, 36, 2); c.fill();
        c.strokeStyle = "#4a3020";
        c.lineWidth = 1;
        for (let sy = baseY - 30; sy < baseY - 4; sy += 8) {
          c.beginPath(); c.moveTo(cx - 12, sy); c.lineTo(cx + 12, sy); c.stroke();
        }
        const bookColors = ["#e05050", "#4080e0", "#50c050", "#e0a030", "#8050c0"];
        for (let sy = baseY - 28; sy < baseY - 4; sy += 8) {
          for (let bx = cx - 11; bx < cx + 10; bx += 5) {
            c.fillStyle = bookColors[Math.floor(Math.abs(bx + sy)) % bookColors.length];
            c.fillRect(bx, sy, 3, 6);
          }
        }
        return;
      }
      if (type === "oven") {
        c.fillStyle = "#888";
        c.beginPath(); c.roundRect(cx - 12, baseY - 16, 24, 16, 4); c.fill();
        c.fillStyle = "#666";
        c.beginPath(); c.roundRect(cx - 10, baseY - 14, 20, 10, 2); c.fill();
        c.fillStyle = "rgba(255, 140, 50, 0.5)";
        c.beginPath(); c.roundRect(cx - 8, baseY - 12, 16, 6, 2); c.fill();
        return;
      }
      if (type === "flower_display") {
        c.fillStyle = "#8b6842";
        c.beginPath(); c.roundRect(cx - 8, baseY - 8, 16, 8, 2); c.fill();
        const flowerColors = ["#ff6b8a", "#ffd54f", "#ff95b7", "#9be06f"];
        for (let i = 0; i < 4; i++) {
          c.fillStyle = flowerColors[i];
          c.beginPath(); c.arc(cx - 5 + i * 3.5, baseY - 14 - Math.random() * 4, 3, 0, Math.PI * 2); c.fill();
        }
        c.fillStyle = "#59ac45";
        c.fillRect(cx - 1, baseY - 16, 2, 8);
        return;
      }
      if (type === "bed") {
        c.fillStyle = "#d4a574";
        c.beginPath(); c.roundRect(cx - 16, baseY - 8, 32, 10, 2); c.fill();
        c.fillStyle = "#7aaae0";
        c.beginPath(); c.roundRect(cx - 14, baseY - 10, 28, 8, 2); c.fill();
        c.fillStyle = "#e8e8e8";
        c.beginPath(); c.roundRect(cx - 14, baseY - 12, 10, 6, 2); c.fill();
        return;
      }
      if (type === "desk") {
        c.fillStyle = "#a0724a";
        c.beginPath(); c.roundRect(cx - 14, baseY - 8, 28, 8, 2); c.fill();
        c.fillStyle = "#b8855a";
        c.beginPath(); c.roundRect(cx - 14, baseY - 10, 28, 4, 2); c.fill();
        c.fillStyle = "#333";
        c.beginPath(); c.roundRect(cx - 4, baseY - 16, 8, 6, 1); c.fill();
        return;
      }
      if (type === "sofa") {
        c.fillStyle = "#9070b0";
        c.beginPath(); c.roundRect(cx - 18, baseY - 10, 36, 12, 4); c.fill();
        c.fillStyle = "#a080c0";
        c.beginPath(); c.roundRect(cx - 16, baseY - 8, 32, 6, 3); c.fill();
        c.fillStyle = "#7a60a0";
        c.beginPath(); c.roundRect(cx - 18, baseY - 16, 4, 8, 2); c.fill();
        c.beginPath(); c.roundRect(cx + 14, baseY - 16, 4, 8, 2); c.fill();
        return;
      }
      if (type === "plant_pot") {
        c.fillStyle = "#c08050";
        c.beginPath(); c.roundRect(cx - 5, baseY - 6, 10, 6, 2); c.fill();
        c.fillStyle = "#59ac45";
        c.beginPath(); c.arc(cx, baseY - 12, 6, 0, Math.PI * 2); c.fill();
        c.fillStyle = "#7fd369";
        c.beginPath(); c.arc(cx - 3, baseY - 14, 4, 0, Math.PI * 2); c.fill();
        return;
      }
      if (type === "blackboard") {
        c.fillStyle = "#2d4a2d";
        c.beginPath(); c.roundRect(cx - 18, baseY - 24, 36, 20, 2); c.fill();
        c.strokeStyle = "#c9a358";
        c.lineWidth = 1.5;
        c.beginPath(); c.roundRect(cx - 18, baseY - 24, 36, 20, 2); c.stroke();
        c.strokeStyle = "rgba(255,255,255,0.3)";
        c.lineWidth = 0.8;
        c.beginPath(); c.moveTo(cx - 12, baseY - 18); c.lineTo(cx + 10, baseY - 18); c.stroke();
        c.beginPath(); c.moveTo(cx - 14, baseY - 12); c.lineTo(cx + 8, baseY - 12); c.stroke();
        return;
      }
      if (type === "display_case") {
        c.fillStyle = "rgba(180, 220, 240, 0.6)";
        c.beginPath(); c.roundRect(cx - 14, baseY - 20, 28, 20, 3); c.fill();
        c.strokeStyle = "rgba(100, 160, 200, 0.8)";
        c.lineWidth = 1.2;
        c.beginPath(); c.roundRect(cx - 14, baseY - 20, 28, 20, 3); c.stroke();
        c.strokeStyle = "rgba(100, 160, 200, 0.4)";
        c.beginPath(); c.moveTo(cx - 12, baseY - 10); c.lineTo(cx + 12, baseY - 10); c.stroke();
        return;
      }
      if (type === "fridge") {
        c.fillStyle = "#e8e8e8";
        c.beginPath(); c.roundRect(cx - 8, baseY - 28, 16, 28, 2); c.fill();
        c.strokeStyle = "#ccc";
        c.lineWidth = 1;
        c.beginPath(); c.moveTo(cx - 6, baseY - 12); c.lineTo(cx + 6, baseY - 12); c.stroke();
        c.fillStyle = "#aaa";
        c.fillRect(cx + 4, baseY - 24, 2, 6);
        c.fillRect(cx + 4, baseY - 10, 2, 4);
        return;
      }
      if (type === "fireplace") {
        c.fillStyle = "#8a8a8a";
        c.beginPath(); c.roundRect(cx - 14, baseY - 20, 28, 20, 3); c.fill();
        c.fillStyle = "#5a5a5a";
        c.beginPath(); c.roundRect(cx - 10, baseY - 16, 20, 12, 2); c.fill();
        c.fillStyle = "rgba(255, 120, 30, 0.6)";
        c.beginPath(); c.arc(cx - 3, baseY - 10, 4, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(cx + 3, baseY - 10, 4, 0, Math.PI * 2); c.fill();
        c.fillStyle = "rgba(255, 200, 50, 0.5)";
        c.beginPath(); c.arc(cx, baseY - 12, 3, 0, Math.PI * 2); c.fill();
        return;
      }
      if (type === "shelf") {
        c.fillStyle = "#6a4e32";
        c.beginPath(); c.roundRect(cx - 16, baseY - 28, 32, 28, 2); c.fill();
        c.strokeStyle = "#5a3e28"; c.lineWidth = 1;
        for (let sy = baseY - 22; sy < baseY - 2; sy += 7) {
          c.beginPath(); c.moveTo(cx - 14, sy); c.lineTo(cx + 14, sy); c.stroke();
        }
        const prodColors = ["#e8a040", "#e05050", "#50a0e0", "#e8d040"];
        for (let sy = baseY - 21; sy < baseY - 2; sy += 7) {
          for (let bx = cx - 12; bx < cx + 12; bx += 6) {
            c.fillStyle = prodColors[Math.floor(Math.abs(bx + sy)) % prodColors.length];
            c.fillRect(bx, sy, 4, 5);
          }
        }
        return;
      }
      if (type === "checkout_counter") {
        c.fillStyle = "#8b6842";
        c.beginPath(); c.roundRect(cx - 16, baseY - 10, 32, 12, 2); c.fill();
        c.fillStyle = "#a0784e";
        c.beginPath(); c.roundRect(cx - 16, baseY - 14, 32, 6, 2); c.fill();
        c.fillStyle = "#444";
        c.beginPath(); c.roundRect(cx + 4, baseY - 18, 8, 6, 1); c.fill();
        return;
      }
      if (type === "whiteboard") {
        c.fillStyle = "#f0f0f0";
        c.beginPath(); c.roundRect(cx - 14, baseY - 28, 28, 22, 2); c.fill();
        c.strokeStyle = "#bbb"; c.lineWidth = 1.5;
        c.beginPath(); c.roundRect(cx - 14, baseY - 28, 28, 22, 2); c.stroke();
        c.strokeStyle = "rgba(50,120,200,0.3)"; c.lineWidth = 0.8;
        c.beginPath(); c.moveTo(cx - 8, baseY - 22); c.lineTo(cx + 8, baseY - 22); c.stroke();
        c.beginPath(); c.moveTo(cx - 10, baseY - 16); c.lineTo(cx + 6, baseY - 16); c.stroke();
        return;
      }
      if (type === "water_cooler") {
        c.fillStyle = "#d0e8f0";
        c.beginPath(); c.roundRect(cx - 5, baseY - 22, 10, 22, 2); c.fill();
        c.fillStyle = "rgba(100,180,220,0.5)";
        c.beginPath(); c.roundRect(cx - 4, baseY - 20, 8, 8, 3); c.fill();
        c.fillStyle = "#ccc";
        c.beginPath(); c.roundRect(cx - 3, baseY - 6, 6, 4, 1); c.fill();
        return;
      }
      if (type === "bunk_bed") {
        c.fillStyle = "#8b6842";
        c.beginPath(); c.roundRect(cx - 14, baseY - 30, 28, 30, 2); c.fill();
        c.fillStyle = "#7aaae0";
        c.beginPath(); c.roundRect(cx - 12, baseY - 28, 24, 10, 1); c.fill();
        c.beginPath(); c.roundRect(cx - 12, baseY - 12, 24, 10, 1); c.fill();
        c.fillStyle = "#e8e8e8";
        c.beginPath(); c.roundRect(cx - 12, baseY - 28, 8, 6, 1); c.fill();
        c.beginPath(); c.roundRect(cx - 12, baseY - 12, 8, 6, 1); c.fill();
        return;
      }
      if (type === "vending_machine") {
        c.fillStyle = "#d04040";
        c.beginPath(); c.roundRect(cx - 8, baseY - 28, 16, 28, 2); c.fill();
        c.fillStyle = "rgba(200,220,240,0.5)";
        c.beginPath(); c.roundRect(cx - 6, baseY - 26, 12, 14, 1); c.fill();
        c.fillStyle = "#333";
        c.beginPath(); c.roundRect(cx - 4, baseY - 8, 8, 4, 1); c.fill();
        return;
      }
      if (type === "podium") {
        c.fillStyle = "#6a4e32";
        c.beginPath(); c.roundRect(cx - 10, baseY - 16, 20, 16, 2); c.fill();
        c.fillStyle = "#7a5e42";
        c.beginPath(); c.roundRect(cx - 12, baseY - 18, 24, 4, 2); c.fill();
        return;
      }
    });
  }

  function drawProp(prop) {
    const p = project(prop.x, prop.y, 0);
    const z = clamp(world.zoom, 1.2, ZOOM_MAX);
    const variant = prop.type === "flower" ? ((Math.round(prop.x + prop.y) % 2 === 0) ? "pink" : "yellow") : "a";
    const sprite = getPropSprite(prop.type, variant);
    const scaleMap = {
      tree: { w: 44, h: 60, y: 47 },
      bush: { w: 34, h: 28, y: 22 },
      flower: { w: 16, h: 24, y: 16 },
      fence: { w: 20, h: 22, y: 16 },
      lamp: { w: 18, h: 42, y: 34 },
      bench: { w: 32, h: 20, y: 12 },
      rock: { w: 24, h: 16, y: 10 },
      signpost: { w: 20, h: 30, y: 26 },
      questboard: { w: 32, h: 40, y: 34 },
      fountain: { w: 42, h: 40, y: 32 },
    };
    const cfg = scaleMap[prop.type];
    if (!cfg) return;
    const dw = cfg.w * z;
    const dh = cfg.h * z;
    ctx.drawImage(sprite, p.x - dw * 0.5, p.y - cfg.y * z, dw, dh);
  }

  function drawGround() {
    const h = hourOfDay();
    const dayFactor = Math.sin(((h - 6) / 24) * Math.PI * 2) * 0.5 + 0.5;
    // Weather affects sky color
    const weatherDarken = (weather.current === "storm") ? 0.5 : (weather.current === "rain") ? 0.7 : (weather.current === "cloudy") ? 0.85 : 1;
    const r = Math.floor((136 + dayFactor * 40) * weatherDarken);
    const g = Math.floor((206 + dayFactor * 24) * weatherDarken);
    const b = Math.floor((246 - dayFactor * 14) * weatherDarken);
    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGrad.addColorStop(0, `rgb(${r},${g},${b})`);
    skyGrad.addColorStop(1, `rgb(${Math.max(0, r - 8)},${Math.max(0, g + 3)},${Math.max(100, b - 44)})`);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const isNight = h >= 20 || h < 6;
    const sunX = canvas.width - 140;
    const sunY = 88;

    if (isNight) {
      // Moon
      const moonGlow = ctx.createRadialGradient(sunX, sunY, 6, sunX, sunY, 50);
      moonGlow.addColorStop(0, "rgba(200, 210, 240, 0.5)");
      moonGlow.addColorStop(1, "rgba(200, 210, 240, 0)");
      ctx.fillStyle = moonGlow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(220, 230, 250, 0.85)";
      ctx.beginPath();
      ctx.arc(sunX, sunY, 14, 0, Math.PI * 2);
      ctx.fill();
      // Moon crescent shadow
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.beginPath();
      ctx.arc(sunX + 5, sunY - 2, 12, 0, Math.PI * 2);
      ctx.fill();
      // Stars
      if (weather.current === "clear" || weather.current === "cloudy") {
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        for (let i = 0; i < 25; i++) {
          const sx = ((i * 137 + 50) % canvas.width);
          const sy = ((i * 89 + 20) % 140);
          const twinkle = Math.sin(nowMs() * 0.002 + i * 2.1) * 0.3 + 0.5;
          ctx.globalAlpha = twinkle;
          ctx.beginPath();
          ctx.arc(sx, sy, 1 + (i % 3) * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    } else if (weather.current !== "storm" && weather.current !== "fog") {
      // Sun
      const sunGlow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 62);
      sunGlow.addColorStop(0, "rgba(255, 244, 193, 0.76)");
      sunGlow.addColorStop(1, "rgba(255, 244, 193, 0)");
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 62, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 233, 156, 0.82)";
      ctx.beginPath();
      ctx.arc(sunX, sunY, 18, 0, Math.PI * 2);
      ctx.fill();
    }

    // Clouds (more/darker when cloudy/rainy)
    const cloudShift = (world.totalMinutes * 0.75) % (canvas.width + 260);
    const baseCloudCount = mobileMode ? 2 : 4;
    const cloudExtra = (weather.current === "cloudy" || weather.current === "rain" || weather.current === "storm") ? 4 : 0;
    const cloudCount = baseCloudCount + cloudExtra;
    const cloudAlpha = weather.current === "storm" ? 0.72 : weather.current === "rain" ? 0.62 : weather.current === "cloudy" ? 0.58 : 0.52;
    for (let i = 0; i < cloudCount; i += 1) {
      const cx = ((i * 200 + cloudShift) % (canvas.width + 260)) - 120;
      const cy = 70 + (i % 4) * 22;
      const cScale = 0.8 + (i % 3) * 0.2;
      ctx.fillStyle = `rgba(${weather.current === "storm" ? "140,150,160" : "255,255,255"},${cloudAlpha})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 20 * cScale, 0, Math.PI * 2);
      ctx.arc(cx + 18 * cScale, cy - 7 * cScale, 18 * cScale, 0, Math.PI * 2);
      ctx.arc(cx + 37 * cScale, cy, 16 * cScale, 0, Math.PI * 2);
      ctx.fill();
    }

    // Viewport culling: only render visible tiles
    const vpTileW = world.baseTileW * world.zoom;
    const vpTileH = world.baseTileH * world.zoom;
    const vpMargin = 4;
    const vpMinX = Math.max(0, Math.floor(player.x - canvas.width / vpTileW - vpMargin));
    const vpMaxX = Math.min(world.width, Math.ceil(player.x + canvas.width / vpTileW + vpMargin));
    const vpMinY = Math.max(0, Math.floor(player.y - canvas.height / vpTileH - vpMargin));
    const vpMaxY = Math.min(world.height, Math.ceil(player.y + canvas.height / vpTileH + vpMargin));

    for (let y = vpMinY; y < vpMaxY; y += 1) {
      for (let x = vpMinX; x < vpMaxX; x += 1) {
        const blend = (Math.sin(x * 0.47) + Math.cos(y * 0.39) + Math.sin((x + y) * 0.23)) * 0.33;
        const baseGrass = blend > 0.28 ? palette.grassC : (blend > -0.22 ? palette.grassA : palette.grassB);
        const road = blend > 0 ? palette.roadA : palette.roadB;
        const wx = x + 0.5;
        const wy = y + 0.5;
        if (waterTile(wx, wy)) {
          drawDiamondWithTexture(x, y, "water", (x + y) % 2 === 0 ? "a" : "b");
          const p = project(wx, wy, 0.02);
          // Animated water shimmer
          const waveT = nowMs() * 0.001;
          const shimmer = Math.sin(x * 0.8 + waveT * 1.5) * 0.15 + Math.sin(y * 0.6 + waveT * 1.1) * 0.1;
          ctx.fillStyle = `rgba(255, 255, 255, ${0.2 + shimmer})`;
          ctx.beginPath();
          const wOff = Math.sin(waveT + x * 0.5) * 2;
          ctx.arc(p.x - 2 + wOff, p.y - 3, 1.5, 0, Math.PI * 2);
          ctx.arc(p.x + 2 - wOff, p.y - 1.5, 1.2, 0, Math.PI * 2);
          ctx.fill();
          // Extra highlight streak
          if ((x + y) % 4 === 0) {
            const streakA = Math.sin(waveT * 2 + x + y) * 0.5 + 0.5;
            ctx.strokeStyle = `rgba(255, 255, 255, ${streakA * 0.25})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(p.x - 4, p.y);
            ctx.lineTo(p.x + 4, p.y - 1);
            ctx.stroke();
          }
        } else {
          if (roadTile(wx, wy)) {
            drawDiamondWithTexture(x, y, "road", blend > 0 ? "a" : "b");
            // Rain puddles on roads
            if ((weather.current === "rain" || weather.current === "storm") && (x * 7 + y * 11) % 13 === 0) {
              const pp = project(wx, wy, 0.005);
              const wt = nowMs() * 0.001;
              ctx.fillStyle = `rgba(140, 190, 240, ${weather.intensity * 0.25})`;
              ctx.beginPath();
              ctx.ellipse(pp.x, pp.y, 5 * world.zoom, 2.5 * world.zoom, 0, 0, Math.PI * 2);
              ctx.fill();
              // Ripple
              const ripR = ((wt + x) % 1.5) / 1.5 * 6 * world.zoom;
              ctx.strokeStyle = `rgba(200, 230, 255, ${(1 - ripR / (6 * world.zoom)) * weather.intensity * 0.3})`;
              ctx.lineWidth = 0.6;
              ctx.beginPath();
              ctx.ellipse(pp.x, pp.y, ripR, ripR * 0.5, 0, 0, Math.PI * 2);
              ctx.stroke();
            }
          } else {
            const grassVariant = baseGrass === palette.grassC ? "c" : (baseGrass === palette.grassB ? "b" : "a");
            drawDiamondWithTexture(x, y, "grass", grassVariant);
            // Snow accumulation on grass
            if (weather.current === "snow" && weather.intensity > 0.3 && (x + y) % 3 === 0) {
              const sp = project(wx, wy, 0.01);
              ctx.fillStyle = `rgba(255, 255, 255, ${weather.intensity * 0.3})`;
              ctx.beginPath();
              ctx.ellipse(sp.x, sp.y, 4 * world.zoom, 2 * world.zoom, 0, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          if (!roadTile(wx, wy) && (x * 13 + y * 7) % 19 === 0) {
            const fp = project(wx, wy, 0.01);
            ctx.fillStyle = "rgba(187, 230, 129, 0.52)";
            ctx.beginPath();
            ctx.arc(fp.x, fp.y - 2, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        if (!waterTile(wx, wy) && !roadTile(wx, wy) && (x * 17 + y * 9) % 37 === 0) {
          const q = project(wx, wy, 0.015);
          ctx.fillStyle = (x + y) % 2 === 0 ? "rgba(255, 147, 183, 0.8)" : "rgba(255, 221, 117, 0.8)";
          ctx.beginPath();
          ctx.arc(q.x, q.y - 3, 1.35, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    for (let i = 0; i < 24; i += 1) {
      const tx = 2 + ((i * 7.37) % (world.width - 4));
      const ty = 2 + ((i * 11.13) % (world.height - 4));
      if (roadTile(tx, ty) || waterTile(tx, ty)) continue;
      const p = project(tx, ty, 0.02);
      ctx.fillStyle = "rgba(126, 194, 93, 0.16)";
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - 2, 11, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let y = 5; y < world.height - 3; y += 1) {
      const cx = 4.0 + Math.sin(y * 0.34) * 1.2 + Math.sin(y * 0.12 + 0.5) * 0.6;
      const edge = project(cx, y + 0.5, 0.01);
      ctx.fillStyle = "rgba(197, 239, 255, 0.45)";
      ctx.beginPath();
      ctx.arc(edge.x, edge.y - 2, 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ─── Weather & Lighting Rendering ───
  function drawWeatherEffects() {
    const w = canvas.width;
    const h = canvas.height;
    // Fog overlay
    if (weather.current === "fog" && weather.intensity > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(210, 220, 230, ${weather.intensity * 0.4})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
    // Rain
    if (weatherParticles.rain.length > 0) {
      ctx.save();
      ctx.strokeStyle = weather.current === "storm" ? "rgba(160, 195, 240, 0.6)" : "rgba(180, 210, 255, 0.45)";
      ctx.lineWidth = weather.current === "storm" ? 1.5 : 1;
      for (const p of weatherParticles.rain) {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + weather.windX * 4, p.y + p.len);
        ctx.stroke();
      }
      ctx.restore();
    }
    // Splashes
    if (weatherParticles.splashes.length > 0) {
      ctx.save();
      for (const s of weatherParticles.splashes) {
        const a = s.life / 0.3;
        ctx.strokeStyle = `rgba(200, 220, 250, ${a * 0.5})`;
        ctx.lineWidth = 0.8;
        const r = (1 - a) * 6;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    // Snow
    if (weatherParticles.snow.length > 0) {
      ctx.save();
      for (const p of weatherParticles.snow) {
        ctx.fillStyle = `rgba(255, 255, 255, ${0.6 + Math.sin(p.wobble) * 0.2})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    // Leaves
    if (weatherParticles.leaves.length > 0) {
      ctx.save();
      for (const l of weatherParticles.leaves) {
        ctx.fillStyle = `rgba(140, 180, 80, ${0.5 + Math.sin(l.rot) * 0.2})`;
        ctx.beginPath();
        const sx = Math.cos(l.rot) * l.size;
        const sy = Math.sin(l.rot) * l.size * 0.5;
        ctx.ellipse(l.x, l.y, Math.abs(sx) + 1.5, Math.abs(sy) + 1, l.rot, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    // Lightning flash
    if (weather.lightningFlash > 0.05) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${weather.lightningFlash * 0.6})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
    // Rain darkening
    if ((weather.current === "rain" || weather.current === "storm") && weather.intensity > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(20, 30, 50, ${weather.intensity * 0.15})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }

  function drawLampGlow() {
    const hr = hourOfDay();
    if (hr >= 6 && hr < 18) return;
    const nightFactor = hr >= 18 ? Math.min(1, (hr - 18) / 3) : hr < 6 ? 1 : Math.max(0, (7 - hr) / 2);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const prop of props) {
      if (prop.type !== "lamp") continue;
      const lp = project(prop.x, prop.y, 0);
      const glowR = 65 * clamp(world.zoom, 1, 4);
      const glow = ctx.createRadialGradient(lp.x, lp.y - 20 * world.zoom, 3, lp.x, lp.y, glowR);
      glow.addColorStop(0, `rgba(255, 220, 130, ${0.3 * nightFactor})`);
      glow.addColorStop(0.5, `rgba(255, 200, 100, ${0.12 * nightFactor})`);
      glow.addColorStop(1, "rgba(255, 200, 100, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(lp.x, lp.y - 10, glowR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }

  function drawFireflies() {
    if (weatherParticles.fireflies.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const f of weatherParticles.fireflies) {
      const p = project(f.x, f.y, 0.3);
      const brightness = 0.3 + Math.sin(f.phase) * 0.3;
      if (brightness < 0.1) continue;
      const r = (2 + Math.sin(f.phase * 1.3)) * clamp(world.zoom, 1, 3);
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4);
      glow.addColorStop(0, `rgba(200, 255, 100, ${brightness})`);
      glow.addColorStop(1, "rgba(200, 255, 100, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(230, 255, 150, ${brightness * 1.5})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }

  function drawDiscoverySparkles() {
    const now = nowMs();
    for (const d of discoveries) {
      if (d.found) continue;
      if (!discoveryConditionMet(d)) continue;
      const pDist = dist(player, d);
      if (pDist > 6) continue;
      const p = project(d.x, d.y, 0);
      const sparkleCount = pDist < 3 ? 4 : 2;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < sparkleCount; i++) {
        const angle = (now * 0.001 + i * Math.PI * 2 / sparkleCount) % (Math.PI * 2);
        const r = 8 + Math.sin(now * 0.003 + i) * 4;
        const sx = p.x + Math.cos(angle) * r * world.zoom;
        const sy = p.y + Math.sin(angle) * r * world.zoom * 0.5 - 10;
        const a = 0.3 + Math.sin(now * 0.005 + i * 1.5) * 0.2;
        ctx.fillStyle = `rgba(255, 240, 150, ${a})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 2 * clamp(world.zoom, 1, 3), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.restore();
    }
    // Discovery notification
    if (discoveryNotifyUntil > now) {
      const text = `🔍 발견: ${discoveryNotifyTitle}`;
      ctx.save();
      ctx.font = "700 16px sans-serif";
      const tw = ctx.measureText(text).width + 24;
      const cx = canvas.width * 0.5 - tw * 0.5;
      const cy = 105;
      ctx.fillStyle = "rgba(90, 60, 20, 0.85)";
      ctx.beginPath();
      ctx.roundRect(cx, cy, tw, 30, 8);
      ctx.fill();
      ctx.fillStyle = "#ffe58f";
      ctx.fillText(text, cx + 12, cy + 21);
      ctx.restore();
    }
  }

  function drawWeatherIndicator() {
    if (weather.current === "clear") return;
    const names = { cloudy: "☁️ 흐림", rain: "🌧️ 비", storm: "⛈️ 폭풍", snow: "❄️ 눈", fog: "🌫️ 안개" };
    const text = names[weather.current] || "";
    if (!text) return;
    ctx.save();
    ctx.font = "600 13px sans-serif";
    const tw = ctx.measureText(text).width + 16;
    const x = canvas.width - tw - 10;
    ctx.fillStyle = "rgba(40, 50, 70, 0.55)";
    ctx.beginPath();
    ctx.roundRect(x, 10, tw, 24, 6);
    ctx.fill();
    ctx.fillStyle = "#e8eef5";
    ctx.fillText(text, x + 8, 27);
    ctx.restore();
  }

  // ─── Interior Rendering Functions ───
  function drawInteriorGround() {
    const interior = interiorDefs && interiorDefs[sceneState.current];
    if (!interior) return;
    const iw = interior.width;
    const ih = interior.height;
    const baseColor = interior.floorColor || "#d4b89a";

    // Warm background fill
    ctx.fillStyle = shade(baseColor, -20);
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Checkerboard floor tiles
    for (let y = 0; y < ih; y++) {
      for (let x = 0; x < iw; x++) {
        const isLight = (x + y) % 2 === 0;
        const color = isLight ? baseColor : shade(baseColor, -12);
        drawDiamond(x, y, color);
      }
    }
  }

  function drawInteriorWalls() {
    const interior = interiorDefs && interiorDefs[sceneState.current];
    if (!interior) return;
    const iw = interior.width;
    const ih = interior.height;
    const wallColor = interior.wallColor || "#c9b896";
    const wallHeight = 2.5;

    // North wall (y=0, from x=0 to x=iw)
    for (let x = 0; x < iw; x++) {
      const p0 = project(x, 0, 0);
      const p1 = project(x + 1, 0, 0);
      const p0t = project(x, 0, wallHeight);
      const p1t = project(x + 1, 0, wallHeight);
      ctx.fillStyle = wallColor;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p1t.x, p1t.y);
      ctx.lineTo(p0t.x, p0t.y);
      ctx.closePath();
      ctx.fill();
      // Subtle panel line
      ctx.strokeStyle = "rgba(0,0,0,0.06)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // West wall (x=0, from y=0 to y=ih)
    const darkWall = shade(wallColor, -18);
    for (let y = 0; y < ih; y++) {
      const p0 = project(0, y, 0);
      const p1 = project(0, y + 1, 0);
      const p0t = project(0, y, wallHeight);
      const p1t = project(0, y + 1, wallHeight);
      ctx.fillStyle = darkWall;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p1t.x, p1t.y);
      ctx.lineTo(p0t.x, p0t.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.06)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }

  function drawInteriorFurniture() {
    const interior = interiorDefs && interiorDefs[sceneState.current];
    if (!interior || !interior.furniture) return;

    // Sort by y for correct depth ordering
    const sorted = [...interior.furniture].sort((a, b) => a.y - b.y);

    for (const item of sorted) {
      const p = project(item.x, item.y, 0);
      const z = clamp(world.zoom, 1.2, ZOOM_MAX);
      const sprite = getPropSprite(item.type, "a");
      const scaleMap = {
        table_round: { w: 30, h: 18, y: 12 },
        table_rect: { w: 32, h: 16, y: 10 },
        chair: { w: 16, h: 18, y: 12 },
        counter: { w: 40, h: 16, y: 10 },
        bookshelf: { w: 30, h: 40, y: 32 },
        oven: { w: 26, h: 20, y: 14 },
        flower_display: { w: 20, h: 22, y: 16 },
        bed: { w: 34, h: 16, y: 10 },
        desk: { w: 30, h: 20, y: 14 },
        sofa: { w: 38, h: 18, y: 12 },
        plant_pot: { w: 14, h: 18, y: 12 },
        blackboard: { w: 38, h: 28, y: 22 },
        display_case: { w: 30, h: 24, y: 18 },
        fridge: { w: 18, h: 32, y: 26 },
        fireplace: { w: 30, h: 24, y: 18 },
        shelf: { w: 34, h: 32, y: 26 },
        checkout_counter: { w: 34, h: 18, y: 12 },
        whiteboard: { w: 30, h: 30, y: 26 },
        water_cooler: { w: 14, h: 26, y: 20 },
        bunk_bed: { w: 30, h: 34, y: 28 },
        vending_machine: { w: 18, h: 32, y: 26 },
        podium: { w: 26, h: 22, y: 16 },
      };
      const s = scaleMap[item.type] || { w: 20, h: 20, y: 14 };
      const sw = s.w * z;
      const sh = s.h * z;
      ctx.drawImage(sprite, p.x - sw * 0.5, p.y - s.y * z, sw, sh);
    }
  }

  function drawInteriorExitHotspot() {
    const interior = interiorDefs && interiorDefs[sceneState.current];
    if (!interior || !interior.exitPoint) return;
    const ep = interior.exitPoint;
    const p = project(ep.x, ep.y, 0);
    const z = clamp(world.zoom, 1.2, ZOOM_MAX);

    // Door mat
    const matW = 24 * z;
    const matH = 10 * z;
    ctx.fillStyle = "rgba(160, 100, 50, 0.6)";
    ctx.beginPath();
    ctx.roundRect(p.x - matW * 0.5, p.y - matH * 0.5, matW, matH, 3 * z);
    ctx.fill();

    // Door icon / label
    const fontSize = Math.max(12, Math.round(10 * z));
    ctx.font = `700 ${fontSize}px sans-serif`;
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText("🚪 나가기", p.x, p.y - matH * 0.5 - 4 * z);
    ctx.textAlign = "start";

    // Proximity glow
    const d = dist(player, ep);
    if (d < 1.5) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 200, 80, 0.6)";
      ctx.lineWidth = 2 * z;
      ctx.beginPath();
      ctx.roundRect(p.x - matW * 0.5 - 2, p.y - matH * 0.5 - 2, matW + 4, matH + 4, 4 * z);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawWorld() {
    // ─── Indoor Scene ───
    if (sceneState.current !== "outdoor") {
      drawInteriorGround();
      drawInteriorWalls();
      drawInteriorFurniture();
      drawInteriorExitHotspot();

      // Draw entities in current scene
      const remotes = mp.enabled ? mpRemotePlayerList() : [];
      const indoorNpcs = npcs.filter(n => (n.currentScene || "outdoor") === sceneState.current);
      const sceneItems = [...indoorNpcs, player, ...remotes].sort((a, b) => a.x + a.y - (b.x + b.y));
      const zoomScale = clamp(world.zoom, 0.9, ZOOM_MAX);
      for (const item of sceneItems) {
        const isMe = item === player;
        const isRemote = item._isRemotePlayer;
        const label = (item.flag ? item.flag + " " : "") + item.name;
        drawEntity(item, (isMe || isRemote ? 12 : 11) * zoomScale, label);
      }

      drawSpeechBubbles();

      // Indoor ambient light (slightly warm)
      ctx.save();
      ctx.fillStyle = "rgba(255, 240, 200, 0.06)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      drawSceneFade();
      return;
    }

    // ─── Outdoor Scene ───
    drawGround();
    for (const b of buildings) drawBuilding(b);

    // ─── 놀이터 바닥 렌더링 ───
    {
      const pgCenter = { x: 30, y: 20 };
      const pgRadius = 3;
      const pA = project(pgCenter.x - pgRadius, pgCenter.y - pgRadius, 0);
      const pB = project(pgCenter.x + pgRadius, pgCenter.y - pgRadius, 0);
      const pC = project(pgCenter.x + pgRadius, pgCenter.y + pgRadius, 0);
      const pD = project(pgCenter.x - pgRadius, pgCenter.y + pgRadius, 0);
      // 녹색 바닥 (운동장)
      ctx.fillStyle = "rgba(120, 200, 120, 0.35)";
      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y); ctx.lineTo(pB.x, pB.y);
      ctx.lineTo(pC.x, pC.y); ctx.lineTo(pD.x, pD.y);
      ctx.closePath();
      ctx.fill();
      // 테두리 점선
      ctx.strokeStyle = "rgba(80, 160, 80, 0.5)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      // 라벨
      const labelP = project(pgCenter.x, pgCenter.y - pgRadius - 0.5, 0);
      const pgScale = clamp(world.zoom, 1.2, ZOOM_MAX);
      const labelW = 70 * pgScale;
      const labelH = 22 * pgScale;
      const lx = labelP.x - labelW * 0.5;
      const ly = labelP.y - labelH;
      ctx.fillStyle = "rgba(80, 170, 80, 0.82)";
      ctx.beginPath();
      ctx.roundRect(lx, ly, labelW, labelH, 8 * pgScale);
      ctx.fill();
      ctx.fillStyle = "#fff";
      const pgFont = Math.max(14, Math.round(12 * pgScale));
      ctx.font = `700 ${pgFont}px sans-serif`;
      ctx.fillText("🏃 놀이터", lx + 8 * pgScale, ly + labelH - 6 * pgScale);
    }

    for (const hs of hotspots) {
      const p = project(hs.x, hs.y, 0);
      const isExit = hs.id === "exitGate";
      ctx.beginPath();
      ctx.arc(p.x, p.y - 7, isExit ? 6.2 : 4.3, 0, Math.PI * 2);
      ctx.fillStyle = isExit ? "#ffd783" : "#edcf8a";
      ctx.fill();
      ctx.strokeStyle = "rgba(99, 74, 47, 0.46)";
      ctx.lineWidth = isExit ? 1.05 : 0.9;
      ctx.stroke();

      if (isExit) {
        const exitScale = clamp(world.zoom, 1.2, ZOOM_MAX);
        const labelW = 56 * exitScale;
        const labelH = 22 * exitScale;
        const tx = p.x - labelW * 0.5;
        const ty = p.y - 44 * exitScale;
        ctx.fillStyle = "rgba(255, 252, 242, 0.74)";
        ctx.strokeStyle = "rgba(92, 71, 49, 0.52)";
        ctx.lineWidth = Math.max(0.8, 1 * exitScale);
        ctx.beginPath();
        ctx.roundRect(tx, ty, labelW, labelH, 8 * exitScale);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#4f3a25";
        const exitFont = Math.max(18, Math.round(16 * exitScale));
        ctx.font = `800 ${exitFont}px sans-serif`;
        ctx.fillText("출구", tx + 10 * exitScale, ty + labelH - 6 * exitScale);
      }

      // 퀘스트 게시판 떠다니는 라벨
      if (hs.id === "questBoard") {
        const qbScale = clamp(world.zoom, 1.2, ZOOM_MAX);
        const bobY = Math.sin(nowMs() * 0.003) * 3;
        const qx = p.x;
        const qy = p.y - 42 * qbScale + bobY;
        const labelW = 68 * qbScale;
        const labelH = 20 * qbScale;
        ctx.fillStyle = "rgba(255, 248, 230, 0.82)";
        ctx.strokeStyle = "rgba(140, 100, 50, 0.5)";
        ctx.lineWidth = Math.max(0.8, 1 * qbScale);
        ctx.beginPath();
        ctx.roundRect(qx - labelW * 0.5, qy - labelH * 0.5, labelW, labelH, 6 * qbScale);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#5a3e20";
        const qbFont = Math.max(14, Math.round(13 * qbScale));
        ctx.font = `700 ${qbFont}px sans-serif`;
        ctx.fillText("📜 게시판", qx - labelW * 0.38, qy + labelH * 0.2);
      }
    }

    const now = nowMs();
    for (const gi of groundItems) {
      if (gi.pickedAt > 0 && now - gi.pickedAt < itemRespawnMs(gi)) continue;
      const gp = project(gi.x, gi.y, 0);
      const info = itemTypes[gi.type];
      const bobY = Math.sin(now * 0.003 + gi.x * 2) * 3;
      const sz = Math.max(12, world.zoom * 5);
      ctx.save();
      ctx.shadowColor = info.color;
      ctx.shadowBlur = 8;
      ctx.font = `${sz}px sans-serif`;
      ctx.fillText(info.emoji, gp.x - sz * 0.4, gp.y - 6 + bobY);
      ctx.restore();
    }

    const remotes = mp.enabled ? mpRemotePlayerList() : [];
    const outdoorNpcs = npcs.filter(n => (n.currentScene || "outdoor") === "outdoor");
    const sceneItems = [...props, ...outdoorNpcs, player, ...remotes].sort((a, b) => a.x + a.y - (b.x + b.y));
    const zoomScale = clamp(world.zoom, 0.9, ZOOM_MAX);
    for (const item of sceneItems) {
      if ("type" in item) drawProp(item);
      else {
        const isMe = item === player;
        const isRemote = item._isRemotePlayer;
        const label = (item.flag ? item.flag + " " : "") + item.name;
        drawEntity(item, (isMe || isRemote ? 12 : 11) * zoomScale, label);
      }
    }

    for (const npc of outdoorNpcs) {
      const mp = project(npc.x, npc.y, 0);
      const msz = Math.max(14, world.zoom * 4.5);
      if (tagGame.active && npc.id === tagGame.targetNpcId) {
        const bob = Math.sin(now * 0.008) * 4;
        ctx.font = `${msz * 1.4}px sans-serif`;
        ctx.fillText("👹", mp.x - msz * 0.6, mp.y - world.zoom * 34 + bob);
      } else if (npc.activeRequest) {
        const bob = Math.sin(now * 0.005) * 3;
        ctx.font = `${msz * 1.3}px sans-serif`;
        ctx.fillText("❗", mp.x - msz * 0.4, mp.y - world.zoom * 32 + bob);
      } else if (npc.moodUntil > 0 && now < npc.moodUntil && npc.mood !== "neutral") {
        const moodEmoji = npc.mood === "happy" ? "😊" : npc.mood === "sad" ? "😢" : "😐";
        ctx.font = `${msz}px sans-serif`;
        ctx.fillText(moodEmoji, mp.x + 12, mp.y - world.zoom * 28);
      }
    }


    drawDiscoverySparkles();
    drawSpeechBubbles();

    // Night overlay
    const nh = hourOfDay();
    let nightAlpha = 0;
    if (nh >= 20) nightAlpha = (nh - 20) * 0.06;
    else if (nh < 5) nightAlpha = 0.24 + (5 - nh) * 0.02;
    else if (nh < 7) nightAlpha = (7 - nh) * 0.05;
    if (nightAlpha > 0) {
      nightAlpha = Math.max(0, nightAlpha - (1 - 1) * 0.15);
      ctx.save();
      ctx.fillStyle = `rgba(10, 10, 40, ${clamp(nightAlpha, 0, 0.35)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
    drawLampGlow();
    drawFireflies();
    drawWeatherEffects();
    drawWeatherIndicator();
    drawSceneFade();
  }

  function drawSpeechBubbles() {
    const now = nowMs();
    for (let i = speechBubbles.length - 1; i >= 0; i -= 1) {
      const bubble = speechBubbles[i];
      if (bubble.until <= now) {
        speechBubbles.splice(i, 1);
        continue;
      }
      const speaker = resolveSpeakerById(bubble.id);
      if (!speaker) continue;
      const p = project(speaker.x, speaker.y, 0);
      const remain = (bubble.until - now) / 1000;
      const alpha = remain > 0.45 ? 1 : clamp(remain / 0.45, 0, 1);
      const fontSize = Math.max(16, Math.min(20, world.zoom * 3.6));
      ctx.font = `700 ${fontSize}px sans-serif`;
      const text = bubbleText(bubble.text);
      const maxLineChars = 14;
      const lines = [];
      for (let ci = 0; ci < text.length; ci += maxLineChars) {
        lines.push(text.slice(ci, ci + maxLineChars));
      }
      const lineH = fontSize + 4;
      let maxW = 0;
      for (const ln of lines) {
        const w = ctx.measureText(ln).width;
        if (w > maxW) maxW = w;
      }
      const width = Math.max(44, maxW + 16);
      const height = lineH * lines.length + 8;
      const x = p.x - width * 0.5;
      const y = p.y - world.zoom * 34 - height;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(255, 254, 246, 0.65)";
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, 10);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 254, 246, 0.65)";
      ctx.beginPath();
      ctx.moveTo(p.x - 5, y + height - 1);
      ctx.lineTo(p.x + 5, y + height - 1);
      ctx.lineTo(p.x, y + height + 7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(66, 52, 35, 0.88)";
      for (let li = 0; li < lines.length; li++) {
        ctx.fillText(lines[li], x + 8, y + lineH * (li + 1));
      }
      ctx.restore();
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
      mctx.fillText("실내", w * 0.5, h * 0.65);
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

    if (mp.enabled) {
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
    uiTime.textContent = `${formatTime()} ${weatherIcon}${world.paused ? " (일시정지)" : ""}`;
    uiPlayer.textContent = player.name;

    const near = nearestNpc(CHAT_NEARBY_DISTANCE);
    const stateKo = { idle: "대기", moving: "이동 중", chatting: "대화 중" };
    uiNearby.textContent = near ? `근처: ${near.npc.name} (${stateKo[near.npc.state] || near.npc.state})` : "근처: 없음";

    if (quest.done && !quest.dynamic) uiQuest.textContent = `퀘스트: ${quest.title} - 완료`;
    else uiQuest.textContent = `퀘스트: ${quest.title} - ${quest.objective}`;

    if (mobileInteractBtn) {
      const hs = nearestHotspot(1.6);
      const nearNpc = nearestNpc(CHAT_NEARBY_DISTANCE);
      if (hs) {
        const hsLabels = {
          exitGate: "나가기",
          cafeDoor: "문 열기",
          bakeryDoor: "문 열기",
          floristDoor: "문 열기",
          libraryDoor: "문 열기",
          officeDoor: "문 열기",
          marketDoor: "문 열기",
          ksaMainDoor: "문 열기",
          ksaDormDoor: "문 열기",
          houseADoor: "문 열기",
          houseBDoor: "문 열기",
          houseCDoor: "문 열기",
          interiorExit: "나가기",
          marketBoard: "게시판 보기",
          parkMonument: "조사하기",
          minigameZone: "🏃 술래잡기!",
          infoCenter: "📋 안내소",
          questBoard: "📜 게시판",
        };
        mobileInteractBtn.textContent = hsLabels[hs.id] || "상호작용";
      } else if (nearestGroundItem(1.5)) {
        const gi = nearestGroundItem(1.5);
        mobileInteractBtn.textContent = `줍기 ${itemTypes[gi.type].emoji}`;
      } else if (nearNpc) {
        mobileInteractBtn.textContent = "대화";
      } else {
        mobileInteractBtn.textContent = "대화";
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
    const mpChat = mp.enabled && !npcNear;
    const newChatTargetId = npcNear ? target.npc.id : (mpChat ? "__mp__" : null);
    if (chatTargetEl) {
      const prevLabel = chatTargetEl.textContent;
      const newLabel = npcNear ? `대상: ${target.npc.name}` : (mpChat ? "대상: 전체 채팅" : "대상: 없음");
      if (prevLabel !== newLabel) { chatTargetEl.textContent = newLabel; renderCurrentChat(); }
    }
    if (chatSendEl) chatSendEl.disabled = mpChat ? false : !npcNear;
    if (chatInputEl) {
      chatInputEl.disabled = mpChat ? false : !npcNear;
      chatInputEl.placeholder = mpChat ? "플레이어에게 말하기..." : "NPC에게 말 걸기...";
    }
    if (chatActiveTargetEl) chatActiveTargetEl.textContent = npcNear ? `대상: ${target.npc.name}` : (mpChat ? "대상: 전체 채팅" : "대상: 없음");
    if (chatActiveStateEl) {
      if (mpChat) chatActiveStateEl.textContent = "상태: 전체 채팅";
      else if (!target) chatActiveStateEl.textContent = "상태: 대화 불가";
      else if (!target.near) chatActiveStateEl.textContent = "상태: 대상에게 이동 중";
      else if (conversationFocusNpcId && target.npc.id === conversationFocusNpcId) chatActiveStateEl.textContent = "상태: 대화 고정";
      else if (chatSessionActiveFor(target.npc.id)) chatActiveStateEl.textContent = "상태: 대화 중";
      else if (target.focused) chatActiveStateEl.textContent = "상태: 클릭 선택됨";
      else chatActiveStateEl.textContent = "상태: 근거리 대화 가능";
    }
    if (chatModelEl) {
      if (!LLM_API_URL) chatModelEl.textContent = "모델: 로컬 응답";
      else if (llmAvailable) chatModelEl.textContent = `모델: ${lastLlmModel}`;
      else chatModelEl.textContent = `모델: 로컬 응답 (LLM 오류)`;
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
  addLog("월드가 초기화되었습니다. NPC와 상호작용해 보세요.");
  if (LLM_API_URL) addChat("System", "근처 NPC와 한국어 LLM 채팅이 활성화되었습니다.");
  else addChat("System", "LLM 엔드포인트가 없어 로컬 대화 모드로 동작합니다.");

  function ensureAutoWalkControl() {
    if (!controlActionsEl || autoWalkBtn) return;
    const btn = document.createElement("button");
    btn.id = "pg-auto-walk";
    btn.type = "button";
    btn.textContent = "자동산책 켜기";
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
    btn.textContent = "산책켜기";
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
      if (mp.enabled) {
        mpBroadcast();
        mpInterpolate(dt);
        if (frameCount % 300 === 0) { mpCleanStale(); mpCleanMessages(); }
      }
    }

    if (mp.enabled && uiOnlineEl) {
      uiOnlineEl.textContent = `접속자: ${mpOnlineCount()}명`;
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
    } else {
      drawWorld();
      drawTagGameHud();
      if (!mobileMode || frameCount % 3 === 0) drawMinimap();
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener("keydown", (ev) => {
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
      addLog(world.paused ? "시뮬레이션 일시정지" : "시뮬레이션 재개");
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
      const names = { clear: "맑음", cloudy: "흐림", rain: "비", storm: "폭풍우", snow: "눈", fog: "안개" };
      addLog("날씨 변경: " + (names[weather.current] || weather.current));
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
          addChat("System", `${clickedNpc.name}에게 이동합니다. 도착하면 대화할 수 있습니다.`);
        } else {
          addChat("System", `${clickedNpc.name} 주변으로 이동할 수 없습니다.`);
        }
      } else {
        focusedNpcId = null;
        conversationFocusNpcId = null;
        player.moveTarget = null;
        chatSession.npcId = null;
        chatSession.expiresAt = 0;
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

  canvas.addEventListener(
    "wheel",
    (ev) => {
      ev.preventDefault();
      const delta = ev.deltaY > 0 ? -0.1 : 0.1;
      world.zoom = clamp(world.zoom + delta, ZOOM_MIN, ZOOM_MAX);
    },
    { passive: false }
  );

  canvas.addEventListener(
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

  canvas.addEventListener(
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

  canvas.addEventListener("touchend", () => {
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
      addLog(world.paused ? "시뮬레이션 일시정지" : "시뮬레이션 재개");
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
      if (createStatusEl) createStatusEl.textContent = "생성 중...";
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
        addLog(`공유 NPC 생성 실패: ${err.message || err}`);
      } finally {
        if (createBtnEl) createBtnEl.disabled = false;
      }
      if (createNameEl) createNameEl.value = "";
      if (createPersonalityEl) createPersonalityEl.value = "";
      if (createStatusEl) createStatusEl.textContent = `생성됨: ${result.npc.name}`;
      addLog(`새 캐릭터가 합류했습니다: ${result.npc.name}`);
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
    removeSelectEl.innerHTML = '<option value="">NPC 선택</option>';
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
        addChat("System", `${result.name}이(가) 월드에서 제거되었습니다.`);
        addLog(`${result.name} NPC가 제거되었습니다.`);
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
      uiToggleBtn.textContent = collapsed ? "UI 보기" : "UI 숨기기";
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

  // ===== MULTIPLAYER (Firebase Realtime DB) =====
  const mp = {
    enabled: false,
    db: null,
    sessionId: null,
    playersRef: null,
    messagesRef: null,
    remotePlayers: {},
    lastBroadcastAt: 0,
    lastMessageSendAt: 0,
    MESSAGE_COOLDOWN: 1500,
    BROADCAST_INTERVAL: 100,
    STALE_TIMEOUT: 12_000,
  };

  function mpRemotePlayerList() {
    return Object.values(mp.remotePlayers);
  }

  function initMultiplayer() {
    const cfg = window.PG_FIREBASE_CONFIG;
    if (!cfg || !cfg.databaseURL || typeof firebase === "undefined") return;
    try {
      firebase.initializeApp(cfg);
      mp.db = firebase.database();
      mp.enabled = true;
      mp.sessionId = "p_" + Math.random().toString(36).slice(2, 10) + "_" + Date.now().toString(36);
      mp.playersRef = mp.db.ref("playground/players");

      const myRef = mp.playersRef.child(mp.sessionId);
      myRef.onDisconnect().remove();

      myRef.set({
        name: player.name,
        flag: player.flag || "",
        x: Math.round(player.x * 100) / 100,
        y: Math.round(player.y * 100) / 100,
        color: player.color,
        species: player.species || "human_a",
        ts: firebase.database.ServerValue.TIMESTAMP,
      });

      function sanitizeRemote(d) {
        const clampX = typeof d.x === "number" && isFinite(d.x) ? Math.max(0, Math.min(world.width, d.x)) : 0;
        const clampY = typeof d.y === "number" && isFinite(d.y) ? Math.max(0, Math.min(world.height, d.y)) : 0;
        const safeName = String(d.name || "???").replace(/[<>]/g, "").slice(0, 20);
        const safeFlag = normalizePlayerFlag(d.flag);
        return { x: clampX, y: clampY, name: safeName, flag: safeFlag, color: String(d.color || "#aaa").slice(0, 20), species: String(d.species || "human_a").slice(0, 20), ts: d.ts || 0 };
      }

      mp.playersRef.on("child_added", (snap) => {
        if (snap.key === mp.sessionId) return;
        const d = snap.val();
        if (!d) return;
        const s = sanitizeRemote(d);
        mp.remotePlayers[snap.key] = {
          id: snap.key,
          name: s.name,
          flag: s.flag,
          x: s.x,
          y: s.y,
          _targetX: s.x,
          _targetY: s.y,
          color: s.color,
          species: s.species,
          ts: s.ts,
          _isRemotePlayer: true,
        };
      });

      mp.playersRef.on("child_changed", (snap) => {
        if (snap.key === mp.sessionId) return;
        const d = snap.val();
        if (!d) return;
        const s = sanitizeRemote(d);
        const rp = mp.remotePlayers[snap.key];
        if (rp) {
          rp.name = s.name;
          rp.flag = s.flag;
          rp._targetX = s.x;
          rp._targetY = s.y;
          rp.color = s.color;
          rp.species = s.species;
          rp.ts = s.ts;
        } else {
          mp.remotePlayers[snap.key] = {
            id: snap.key,
            name: s.name,
            flag: s.flag,
            x: s.x,
            y: s.y,
            _targetX: s.x,
            _targetY: s.y,
            color: s.color,
            species: s.species,
            ts: s.ts,
            _isRemotePlayer: true,
          };
        }
      });

      mp.playersRef.on("child_removed", (snap) => {
        delete mp.remotePlayers[snap.key];
      });

      // Messages listener
      mp.messagesRef = mp.db.ref("playground/messages");
      mp.messagesRef.orderByChild("ts").startAt(Date.now()).on("child_added", (snap) => {
        const d = snap.val();
        if (!d || d.sessionId === mp.sessionId) return;
        const name = String(d.name || "???").replace(/[<>]/g, "").slice(0, 20);
        const text = String(d.text || "").slice(0, 200);
        const flag = normalizePlayerFlag(d.flag);
        const displayName = (flag ? flag + " " : "") + name;
        if (!text) return;
        addChat(displayName, text, "remote");
        if (d.sessionId && mp.remotePlayers[d.sessionId]) {
          upsertSpeechBubble("remote_" + d.sessionId, text, 4000);
        }
      });

      if (uiOnlineEl) uiOnlineEl.hidden = false;
      addLog("멀티플레이어 연결됨!");
      addChat("System", "멀티플레이어 모드가 활성화되었습니다. 다른 플레이어가 같은 월드에 접속할 수 있습니다.");
    } catch (err) {
      addLog("멀티플레이어 초기화 실패: " + (err.message || err));
    }
  }

  function mpBroadcast() {
    if (!mp.enabled) return;
    const now = nowMs();
    if (now - mp.lastBroadcastAt < mp.BROADCAST_INTERVAL) return;
    mp.lastBroadcastAt = now;
    mp.playersRef.child(mp.sessionId).update({
      name: player.name,
      flag: player.flag || "",
      x: Math.round(player.x * 100) / 100,
      y: Math.round(player.y * 100) / 100,
      color: player.color,
      species: player.species || "human_a",
      ts: firebase.database.ServerValue.TIMESTAMP,
    });
  }

  function mpInterpolate(dt) {
    for (const rp of Object.values(mp.remotePlayers)) {
      if (!isFinite(rp._targetX) || !isFinite(rp._targetY)) continue;
      const dx = rp._targetX - rp.x;
      const dy = rp._targetY - rp.y;
      const lerp = Math.min(1, dt * 8);
      rp.x += dx * lerp;
      rp.y += dy * lerp;
    }
  }

  function mpCleanStale() {
    const now = Date.now();
    for (const [key, rp] of Object.entries(mp.remotePlayers)) {
      if (now - rp.ts > mp.STALE_TIMEOUT) {
        delete mp.remotePlayers[key];
        mp.playersRef.child(key).remove().catch(() => {});
      }
    }
  }

  function mpSendMessage(text) {
    if (!mp.enabled || !mp.messagesRef) return;
    const now = Date.now();
    if (now - mp.lastMessageSendAt < mp.MESSAGE_COOLDOWN) return;
    mp.lastMessageSendAt = now;
    const safeText = String(text || "").slice(0, 200);
    if (!safeText) return;
    mp.messagesRef.push({
      name: player.name,
      flag: player.flag || "",
      text: safeText,
      sessionId: mp.sessionId,
      ts: firebase.database.ServerValue.TIMESTAMP,
    });
    upsertSpeechBubble("player", safeText, 4000);
  }

  function mpCleanMessages() {
    if (!mp.enabled || !mp.messagesRef) return;
    const cutoff = Date.now() - 60_000;
    mp.messagesRef.orderByChild("ts").endAt(cutoff).once("value", (snap) => {
      const updates = {};
      snap.forEach((child) => { updates[child.key] = null; });
      if (Object.keys(updates).length > 0) mp.messagesRef.update(updates);
    });
  }

  function mpOnlineCount() {
    return Object.keys(mp.remotePlayers).length + 1;
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
    } catch (e) {
      console.warn("[Playground] Three.js init failed, falling back to 2D:", e);
      gameRenderer3D = null;
    }
  }

  requestAnimationFrame(frame);
})();
