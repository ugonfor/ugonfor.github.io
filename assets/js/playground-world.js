(function () {
  const canvas = document.getElementById("pg-world-canvas");
  if (!canvas) return;

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
  const chatActiveTargetEl = document.getElementById("pg-chat-active-target");
  const chatActiveStateEl = document.getElementById("pg-chat-active-state");
  const chatModelEl = document.getElementById("pg-chat-model");
  const createNameEl = document.getElementById("pg-create-name");
  const createPersonalityEl = document.getElementById("pg-create-personality");
  const createBtnEl = document.getElementById("pg-create-btn");
  const createStatusEl = document.getElementById("pg-create-status");

  const saveBtn = document.getElementById("pg-save");
  const loadBtn = document.getElementById("pg-load");
  const renameBtn = document.getElementById("pg-rename");
  const uiToggleBtn = document.getElementById("pg-ui-toggle");
  const leftToggleBtn = document.getElementById("pg-toggle-left");
  const rightToggleBtn = document.getElementById("pg-toggle-right");
  const chatToggleBtn = document.getElementById("pg-toggle-chat");
  const stageEl = document.querySelector(".pg-world-stage");
  const mobileInteractBtn = document.getElementById("pg-mobile-interact");
  const mobileRunBtn = document.getElementById("pg-mobile-run");
  const mobileChatBtn = document.getElementById("pg-mobile-chat");
  const mobilePauseBtn = document.getElementById("pg-mobile-pause");
  const mobileResetBtn = document.getElementById("pg-mobile-reset");
  const joystickBase = document.getElementById("pg-joystick-base");
  const joystickKnob = document.getElementById("pg-joystick-knob");

  const SAVE_KEY = "playground_world_state_v2";
  const UI_PREF_KEY = "playground_ui_pref_v1";
  const PLAYER_NAME_KEY = "playground_player_name_v1";
  const LLM_API_URL = String(window.PG_LLM_API_URL || "").trim();
  const LLM_STREAM_API_URL = LLM_API_URL ? LLM_API_URL.replace(/\/api\/npc-chat$/, "/api/npc-chat-stream") : "";
  const WORLD_NPC_API_URL = LLM_API_URL ? LLM_API_URL.replace(/\/api\/npc-chat$/, "/api/world-npcs") : "";
  const TURNSTILE_SITE_KEY = String(window.PG_TURNSTILE_SITE_KEY || "").trim();
  const CHAT_NEARBY_DISTANCE = 4.6;
  const ZOOM_MIN = 1.4;
  const ZOOM_MAX = 6.0;
  const DEFAULT_ZOOM = 3.2;
  const CONVERSATION_MIN_ZOOM = 3.6;
  let turnstileWidgetId = null;

  const keys = new Set();
  const logs = [];
  const chats = [];
  let llmAvailable = true;
  let focusedNpcId = null;
  let conversationFocusNpcId = null;
  let lastLlmModel = "local";
  let lastLlmError = "";
  let nextSocialAt = 0;
  const chatSession = {
    npcId: null,
    expiresAt: 0,
  };

  const npcPersonas = {
    heo: { age: "20대", gender: "남성", personality: "차분하고 책임감이 강한 리더형" },
    kim: { age: "20대", gender: "남성", personality: "친절하고 현실적인 문제 해결형" },
    choi: { age: "20대", gender: "남성", personality: "관찰력이 높고 디테일에 강함" },
    jung: { age: "20대", gender: "남성", personality: "에너지 넘치고 사교적인 성격" },
    seo: { age: "20대", gender: "남성", personality: "분석적이고 직설적인 성격" },
    lee: { age: "20대", gender: "남성", personality: "온화하고 협업을 잘하는 성격" },
    park: { age: "20대", gender: "남성", personality: "경쟁심 있고 자신감 있는 성격" },
    jang: { age: "20대", gender: "남성", personality: "신중하고 인내심이 강한 성격" },
    yoo: { age: "20대", gender: "남성", personality: "침착하고 집요한 탐구형 성격" },
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
    width: 34,
    height: 34,
    totalMinutes: 8 * 60,
    paused: false,
    baseTileW: 40,
    baseTileH: 20,
    zoom: DEFAULT_ZOOM,
    cameraX: canvas.width / 2,
    cameraY: 130,
  };

  const panelState = {
    left: true,
    right: true,
    chat: true,
  };

  const palette = {
    outline: "#3a3a3a",
    grassA: "#8fcb84",
    grassB: "#84c07a",
    roadA: "#b9bec7",
    roadB: "#afb4be",
    skyTop: "#a8dbf6",
    skyBottom: "#d6effb",
  };

  const player = {
    name: "플레이어",
    x: 12,
    y: 18,
    speed: 3.7,
    color: "#f2cc61",
    moveTarget: null,
  };

  const places = {
    plaza: { x: 13, y: 17 },
    cafe: { x: 22, y: 8 },
    office: { x: 26, y: 10 },
    park: { x: 8, y: 8 },
    market: { x: 20, y: 24 },
    homeA: { x: 6, y: 24 },
    homeB: { x: 28, y: 24 },
    homeC: { x: 16, y: 6 },
  };

  const buildings = [
    { id: "cafe", x: 22, y: 7, w: 3, h: 2, z: 2.2, color: "#efc1c8", label: "Cafe" },
    { id: "office", x: 25, y: 9, w: 4, h: 2, z: 2.8, color: "#bfd1ee", label: "Office" },
    { id: "market", x: 19, y: 23, w: 4, h: 3, z: 2.4, color: "#edcfab", label: "Market" },
  ];

  const hotspots = [
    { id: "exitGate", x: 1.2, y: 17.2, label: "Exit" },
    { id: "cafeDoor", x: 23, y: 9, label: "Cafe Door" },
    { id: "marketBoard", x: 20.5, y: 26, label: "Market Board" },
    { id: "parkMonument", x: 8.6, y: 8.2, label: "Park Monument" },
  ];

  const props = [
    { type: "tree", x: 5.5, y: 10.2 },
    { type: "tree", x: 8.2, y: 11.3 },
    { type: "tree", x: 11.1, y: 8.9 },
    { type: "tree", x: 18.8, y: 6.4 },
    { type: "tree", x: 26.2, y: 6.8 },
    { type: "tree", x: 30.2, y: 12.4 },
    { type: "tree", x: 7.4, y: 27.2 },
    { type: "tree", x: 14.2, y: 28.3 },
    { type: "tree", x: 29.1, y: 28.1 },
    { type: "lamp", x: 13.2, y: 13.8 },
    { type: "lamp", x: 13.3, y: 20.2 },
    { type: "lamp", x: 20.2, y: 17.1 },
    { type: "lamp", x: 23.6, y: 17.1 },
  ];

  function makeNpc(id, name, color, home, work, hobby, personality = "") {
    return {
      id,
      name,
      color,
      x: home.x,
      y: home.y,
      speed: 2 + Math.random() * 0.9,
      home,
      work,
      hobby,
      state: "idle",
      talkCooldown: 0,
      memory: [],
      personality,
      roamTarget: null,
      roamWait: 0,
      roamRadius: 2.4 + Math.random() * 2.1,
      nextLongTripAt: 8 + Math.random() * 14,
    };
  }

  const npcs = [
    makeNpc("heo", "허승준", "#e56f6f", places.homeA, places.office, places.park),
    makeNpc("kim", "김민수", "#6fa1e5", places.homeB, places.market, places.plaza),
    makeNpc("choi", "최민영", "#79c88b", places.homeC, places.cafe, places.park),
    makeNpc("jung", "정욱진", "#b88be6", places.homeA, places.cafe, places.market),
    makeNpc("seo", "서창근", "#e6a76f", places.homeB, places.office, places.plaza),
    makeNpc("lee", "이진원", "#6fc7ba", places.homeC, places.market, places.plaza),
    makeNpc("park", "박지호", "#d88972", places.homeA, places.office, places.park),
    makeNpc("jang", "장동우", "#8e9be3", places.homeB, places.cafe, places.market),
    makeNpc("yoo", "유효곤", "#5e88dd", places.homeC, places.office, places.plaza),
  ];

  const relations = {
    playerToHeo: 52,
    playerToKim: 47,
    heoToKim: 38,
    playerToChoi: 50,
  };

  const quest = {
    title: "Neighborhood Threads",
    stage: 0,
    objective: "Talk to 허승준 in the plaza.",
    done: false,
  };

  const worldEvents = {
    day: -1,
    once: {},
  };

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function randomPastelColor() {
    const h = Math.floor(Math.random() * 360);
    return `hsl(${h} 62% 68%)`;
  }

  function pickRandomPlace() {
    const values = Object.values(places);
    return values[Math.floor(Math.random() * values.length)];
  }

  function inferPersonalityFromName(name) {
    const tones = [
      "침착하고 배려심이 많은 성격",
      "유쾌하고 추진력 있는 성격",
      "논리적이고 집중력이 높은 성격",
      "친화적이고 대화가 부드러운 성격",
      "도전적이고 호기심이 많은 성격",
    ];
    let sum = 0;
    for (const ch of name) sum += ch.charCodeAt(0);
    return tones[sum % tones.length];
  }

  function normalizePlayerName(value) {
    const cleaned = String(value || "")
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/[<>]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 18);
    return cleaned || "플레이어";
  }

  function initPlayerName() {
    let stored = "";
    try {
      stored = normalizePlayerName(localStorage.getItem(PLAYER_NAME_KEY) || "");
    } catch {
      stored = "";
    }

    if (!stored) {
      const answer = window.prompt("당신의 이름은 무엇입니까?", player.name);
      stored = normalizePlayerName(answer);
      try {
        localStorage.setItem(PLAYER_NAME_KEY, stored);
      } catch {
        // ignore localStorage errors
      }
    }

    player.name = stored;
  }

  function changePlayerName() {
    const answer = window.prompt("당신의 이름은 무엇입니까?", player.name);
    if (answer === null) return;
    const next = normalizePlayerName(answer);
    if (next === player.name) return;
    player.name = next;
    try {
      localStorage.setItem(PLAYER_NAME_KEY, player.name);
    } catch {
      // ignore localStorage errors
    }
    addLog(`플레이어 이름이 '${player.name}'(으)로 변경되었습니다.`);
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
      record.personality || inferPersonalityFromName(record.name)
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
    const npc = makeNpc(id, name, randomPastelColor(), home, pickRandomPlace(), pickRandomPlace(), personality);
    npc.x = home.x;
    npc.y = home.y;
    npcs.push(npc);
    npcPersonas[id] = { age: "20대", gender: "남성", personality };
    return { ok: true, npc };
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
  }

  function setPanelToggle(btn, active) {
    if (!btn) return;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  }

  function applyPanelState() {
    if (!stageEl) return;
    stageEl.classList.toggle("pg-hide-left", !panelState.left);
    stageEl.classList.toggle("pg-hide-right", !panelState.right);
    stageEl.classList.toggle("pg-hide-chat", !panelState.chat);
    setPanelToggle(leftToggleBtn, panelState.left);
    setPanelToggle(rightToggleBtn, panelState.right);
    setPanelToggle(chatToggleBtn, panelState.chat);
  }

  function savePanelState() {
    try {
      localStorage.setItem(UI_PREF_KEY, JSON.stringify(panelState));
    } catch (_) {}
  }

  function defaultPanelStateByViewport() {
    const w = window.innerWidth || 1280;
    if (w < 1120) return { left: true, right: false, chat: true };
    if (w < 1360) return { left: true, right: false, chat: true };
    return { left: true, right: true, chat: true };
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
    applyPanelState();
  }

  function dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
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

  function addChat(speaker, text) {
    chats.unshift({ speaker, text, stamp: formatTime() });
    if (chats.length > 24) chats.length = 24;
    renderChats();
  }

  function renderChats() {
    if (!chatLogEl) return;
    const frag = document.createDocumentFragment();
    for (const c of chats) {
      const row = document.createElement("div");
      const speaker = document.createElement("strong");
      speaker.textContent = c.speaker;
      row.appendChild(speaker);
      row.appendChild(document.createTextNode(`: ${c.text}`));
      frag.appendChild(row);
    }
    chatLogEl.replaceChildren(frag);
  }

  function startStreamingChat(speaker) {
    const entry = { speaker, text: "", stamp: formatTime(), streaming: true };
    chats.unshift(entry);
    if (chats.length > 24) chats.length = 24;
    renderChats();
    return {
      append(chunk) {
        entry.text += chunk;
        renderChats();
      },
      done() {
        entry.streaming = false;
        renderChats();
      },
      empty() {
        return !entry.text.trim();
      },
      remove() {
        const idx = chats.indexOf(entry);
        if (idx >= 0) chats.splice(idx, 1);
        renderChats();
      },
      text() {
        return entry.text;
      },
    };
  }

  function nowMs() {
    return performance.now();
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
    relations[key] = clamp(Math.round((relations[key] || 50) + delta), 0, 100);
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
    if (Math.abs(x - 13) <= 1.2) return true;
    if (Math.abs(y - 17) <= 1.2) return true;
    return false;
  }

  function inBuilding(x, y) {
    return buildings.some((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
  }

  function canStand(x, y) {
    if (x < 1 || y < 1 || x > world.width - 1 || y > world.height - 1) return false;
    if (inBuilding(x, y)) return false;
    return true;
  }

  function nearestNpc(maxDist) {
    const items = npcs
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
    const placesList = [places.plaza, places.cafe, places.office, places.park, places.market];
    const nowHour = hourOfDay() + minuteOfDay() / 60;
    const anchor = targetFor(npc);

    let base = anchor;
    if (nowHour >= npc.nextLongTripAt) {
      base = placesList[Math.floor(Math.random() * placesList.length)];
      npc.nextLongTripAt = nowHour + 4 + Math.random() * 8;
    }

    npc.roamTarget = randomPointNear(base, npc.roamRadius);
  }

  function setQuestStage(stage, objective) {
    quest.stage = stage;
    quest.objective = objective;
    if (stage >= 5) quest.done = true;
  }

  function handleQuestNpcTalk(npc) {
    if (quest.done) return false;

    if (quest.stage === 0 && npc.id === "heo") {
      setQuestStage(1, "Deliver 허승준's message to 김민수 at the market.");
      adjustRelation("playerToHeo", 6);
      addLog("Quest updated: deliver 허승준's message to 김민수.");
      addChat("허승준", "김민수에게 이 메시지를 전해줄 수 있을까?");
      return true;
    }

    if (quest.stage === 1 && npc.id === "kim") {
      setQuestStage(2, "Meet 최민영 at the cafe for context.");
      adjustRelation("playerToKim", 8);
      adjustRelation("heoToKim", 10);
      addLog("Quest updated: meet 최민영 at the cafe.");
      addChat("김민수", "고마워. 최민영이 더 자세히 알고 있어.");
      return true;
    }

    if (quest.stage === 2 && npc.id === "choi") {
      setQuestStage(3, "Inspect the Park Monument after 20:00.");
      adjustRelation("playerToChoi", 6);
      addLog("Quest updated: inspect the Park Monument tonight.");
      addChat("최민영", "밤에 공원 기념비를 확인해봐.");
      return true;
    }

    if (quest.stage === 4 && npc.id === "heo") {
      setQuestStage(5, "Completed");
      adjustRelation("playerToHeo", 10);
      addLog("Quest complete: Neighborhood Threads.");
      addChat("허승준", "잘했어. 이제 이 동네가 더 연결된 느낌이야.");
      return true;
    }

    return false;
  }

  function handleHotspotInteraction() {
    const hs = nearestHotspot(1.3);
    if (!hs) return false;

    if (hs.id === "exitGate") {
      addLog("Leaving playground... returning to About Me.");
      setTimeout(() => {
        window.location.href = "/";
      }, 120);
      return true;
    }

    if (hs.id === "parkMonument") {
      if (quest.stage === 3) {
        if (hourOfDay() >= 20 || hourOfDay() < 5) {
          setQuestStage(4, "Report what you found back to 허승준.");
          addLog("Quest updated: return to 허승준 with the monument clue.");
          addLog("You found a coded message hidden in the monument.");
        } else {
          addLog("The clue appears only at night (after 20:00).");
        }
      } else {
        addLog("The monument has faint engraved patterns.");
      }
      return true;
    }

    if (hs.id === "cafeDoor") {
      addLog("You check the cafe. NPC routines seem to synchronize here.");
      adjustRelation("playerToChoi", 1);
      return true;
    }

    if (hs.id === "marketBoard") {
      addLog("Town board: 'Night market starts at 20:00 near the plaza.'");
      return true;
    }

    return false;
  }

  function npcSmallTalk(npc) {
    const lines = [
      `${npc.name}: ${formatTime()}의 분위기는 조금 다르게 느껴져.`,
      `${npc.name}: 오늘은 루틴을 최대한 지키려고 해.`,
      `${npc.name}: 나중에 광장에서 다시 보자.`,
      `${npc.name}: 작은 이벤트가 계획을 계속 바꾸네.`,
    ];
    return lines[(hourOfDay() + npc.name.length) % lines.length];
  }

  function interact() {
    const near = nearestNpc(1.6);
    if (near && near.npc.talkCooldown <= 0) {
      near.npc.talkCooldown = 3.5;
      if (!handleQuestNpcTalk(near.npc)) {
        addLog(npcSmallTalk(near.npc));
        if (near.npc.id === "heo") adjustRelation("playerToHeo", 1);
        if (near.npc.id === "kim") adjustRelation("playerToKim", 1);
      }
      return;
    }

    if (handleHotspotInteraction()) return;

    if (near && near.npc.talkCooldown > 0) {
      addLog(`${near.npc.name} is busy right now.`);
      return;
    }

    addLog("Nothing to interact with nearby.");
  }

  function detectTopic(text) {
    const t = text.toLowerCase();
    if (/(quest|help|task|mission|퀘스트|도움|임무|미션)/.test(t)) return "quest";
    if (/(허승준|김민수|최민영|정욱진|서창근|이진원|박지호|장동우)/.test(t)) return "people";
    if (/(world|town|city|simulation|ai|월드|도시|시뮬|시뮬레이션)/.test(t)) return "world";
    if (/(thanks|thank you|great|good|고마워|감사|좋아)/.test(t)) return "positive";
    return "general";
  }

  function npcReply(npc, text) {
    const topic = detectTopic(text);
    npc.memory.unshift(topic);
    if (npc.memory.length > 5) npc.memory.length = 5;

    if (topic === "positive") {
      if (npc.id === "heo") adjustRelation("playerToHeo", 2);
      if (npc.id === "kim") adjustRelation("playerToKim", 2);
      return "고마워요. 당신의 행동이 이 동네 분위기를 조금씩 바꾸고 있어요.";
    }

    if (topic === "quest") {
      if (quest.done) return "이미 모두를 연결해줬어요. 훌륭했어요.";
      return `현재 목표는 '${quest.objective}' 입니다.`;
    }

    if (topic === "world") {
      return "이 세계는 루틴, 관계, 작은 이벤트로 움직여요. 계속 관찰해 보세요.";
    }

    if (topic === "people") {
      return "여기 사람들은 시간에 따라 달라져요. 시간대를 바꿔서 다시 말 걸어보세요.";
    }

    return npcSmallTalk(npc).replace(`${npc.name}: `, "");
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
      recentMessages: chats.slice(0, 6).reverse(),
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
      recentMessages: chats.slice(0, 6).reverse(),
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
    addChat("You", msg);

    const target = chatTargetNpc();
    if (!target) {
      addChat("System", "근처에 대화 가능한 NPC가 없습니다.");
      return;
    }
    if (!target.near) {
      moveNearNpcTarget(target.npc);
      addChat("System", `${target.npc.name}에게 이동 중입니다. 가까이 가면 대화할 수 있습니다.`);
      return;
    }

    const npc = target.npc;
    conversationFocusNpcId = npc.id;
    setChatSession(npc.id, 90000);
    if (chatSendEl) chatSendEl.disabled = true;
    if (chatInputEl) chatInputEl.disabled = true;
    let reply = "";
    let streamingDraft = null;
    let streamedRendered = false;
    try {
      if (LLM_STREAM_API_URL) {
        streamedRendered = true;
        streamingDraft = startStreamingChat(npc.name);
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
          reply = npcReply(npc, msg);
        }
      }
    } finally {
      if (chatSendEl) chatSendEl.disabled = false;
      if (chatInputEl) chatInputEl.disabled = false;
      if (chatInputEl) chatInputEl.focus();
    }
    setChatSession(npc.id, 90000);
    if (reply && !streamedRendered) addChat(npc.name, reply);
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
      addLog("A new day begins in the simulation.");
    }

    const h = hourOfDay();

    const cafeKey = dayFlag("cafe-open");
    if (h >= 9 && !worldEvents.once[cafeKey]) {
      worldEvents.once[cafeKey] = true;
      addLog("Cafe opens and morning routines start.");
    }

    const marketKey = dayFlag("night-market");
    if (h >= 20 && !worldEvents.once[marketKey]) {
      worldEvents.once[marketKey] = true;
      addLog("Night market is now active near the plaza.");
    }

    const parkKey = dayFlag("park-aura");
    if ((h >= 20 || h < 5) && !worldEvents.once[parkKey] && dist(player, places.park) < 2.5) {
      worldEvents.once[parkKey] = true;
      addLog("You feel a strange signal near the park monument.");
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
      relations,
      quest,
      npcs: npcs
        .filter((n) => !n.id.startsWith("shared_") && !n.id.startsWith("custom_"))
        .map((n) => ({ id: n.id, x: n.x, y: n.y, talkCooldown: n.talkCooldown })),
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
      }
      if (state.relations) {
        Object.assign(relations, state.relations);
      }
      if (state.quest) {
        quest.stage = state.quest.stage ?? quest.stage;
        quest.objective = state.quest.objective || quest.objective;
        quest.title = state.quest.title || quest.title;
        quest.done = !!state.quest.done;
      }
      if (Array.isArray(state.npcs)) {
        for (const savedNpc of state.npcs) {
          const npc = npcs.find((n) => n.id === savedNpc.id);
          if (!npc) continue;
          npc.x = clamp(savedNpc.x ?? npc.x, 1, world.width - 1);
          npc.y = clamp(savedNpc.y ?? npc.y, 1, world.height - 1);
          npc.talkCooldown = Math.max(0, savedNpc.talkCooldown || 0);
        }
      }
      addLog("월드 상태를 불러왔습니다.");
    } catch (err) {
      addLog("저장된 상태를 불러오지 못했습니다.");
    }
  }

  function updatePlayer(dt) {
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
    const spd = player.speed * runMul;
    const tx = player.x + (dx / mag) * spd * dt;
    const ty = player.y + (dy / mag) * spd * dt;

    if (canStand(tx, player.y)) player.x = tx;
    if (canStand(player.x, ty)) player.y = ty;

    player.x = clamp(player.x, 1, world.width - 1);
    player.y = clamp(player.y, 1, world.height - 1);

    if (player.moveTarget) {
      const td = Math.hypot(player.moveTarget.x - player.x, player.moveTarget.y - player.y);
      if (td <= 0.12) {
        const targetNpc = npcById(player.moveTarget.npcId);
        if (targetNpc) {
          addChat("System", `${targetNpc.name} 근처에 도착했습니다. 이제 대화할 수 있습니다.`);
          if (chatInputEl) chatInputEl.focus();
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
      const dx = t.x - npc.x;
      const dy = t.y - npc.y;
      const d = Math.hypot(dx, dy);

      if (d > 0.12) {
        const nx = npc.x + (dx / d) * npc.speed * dt;
        const ny = npc.y + (dy / d) * npc.speed * dt;
        if (canStand(nx, ny)) {
          npc.x = nx;
          npc.y = ny;
          npc.state = "moving";
        } else {
          npc.roamTarget = null;
          npc.state = "idle";
        }
      } else {
        npc.roamWait = 0.6 + Math.random() * 2.2;
        npc.state = "idle";
      }
    }
  }

  function updateNpcSocialEvents() {
    if (world.totalMinutes < nextSocialAt) return;
    nextSocialAt = world.totalMinutes + 22 + Math.random() * 34;

    const moving = npcs.filter((n) => !chatSessionActiveFor(n.id));
    if (moving.length < 2) return;

    const a = moving[Math.floor(Math.random() * moving.length)];
    let b = null;
    let best = Infinity;
    for (const cand of moving) {
      if (cand.id === a.id) continue;
      const d = dist(a, cand);
      if (d < best) {
        best = d;
        b = cand;
      }
    }
    if (!b || best > 2.3) return;

    a.roamWait = Math.max(a.roamWait, 1.4 + Math.random() * 1.2);
    b.roamWait = Math.max(b.roamWait, 1.4 + Math.random() * 1.2);
    a.state = "chatting";
    b.state = "chatting";
    addLog(`${a.name}과 ${b.name}이 잠시 대화합니다.`);
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
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = "rgba(58,58,58,0.26)";
    ctx.stroke();

    // Cartoony top highlight
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo((p1.x + p2.x) * 0.5, (p1.y + p2.y) * 0.5);
    ctx.lineTo((p1.x + p4.x) * 0.5, (p1.y + p4.y) * 0.5);
    ctx.closePath();
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fill();
  }

  function shade(hex, delta) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return hex;
    const r = clamp(parseInt(m[1], 16) + delta, 0, 255);
    const g = clamp(parseInt(m[2], 16) + delta, 0, 255);
    const b = clamp(parseInt(m[3], 16) + delta, 0, 255);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function drawBuilding(b) {
    const pA = project(b.x, b.y, b.z);
    const pB = project(b.x + b.w, b.y, b.z);
    const pC = project(b.x + b.w, b.y + b.h, b.z);
    const pD = project(b.x, b.y + b.h, b.z);

    const baseB = project(b.x + b.w, b.y, 0);
    const baseC = project(b.x + b.w, b.y + b.h, 0);
    const baseD = project(b.x, b.y + b.h, 0);

    ctx.fillStyle = shade(b.color, -12);
    ctx.beginPath();
    ctx.moveTo(pB.x, pB.y);
    ctx.lineTo(baseB.x, baseB.y);
    ctx.lineTo(baseC.x, baseC.y);
    ctx.lineTo(pC.x, pC.y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = shade(b.color, -28);
    ctx.beginPath();
    ctx.moveTo(pD.x, pD.y);
    ctx.lineTo(baseD.x, baseD.y);
    ctx.lineTo(baseC.x, baseC.y);
    ctx.lineTo(pC.x, pC.y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.moveTo(pA.x, pA.y);
    ctx.lineTo(pB.x, pB.y);
    ctx.lineTo(pC.x, pC.y);
    ctx.lineTo(pD.x, pD.y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    const cx = (pA.x + pC.x) * 0.5;
    const cy = (pA.y + pC.y) * 0.5 - 4;
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.beginPath();
    ctx.ellipse(cx, cy, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawEntity(e, radius, label) {
    const p = project(e.x, e.y, 0);
    const sh = project(e.x, e.y, -0.08);

    ctx.beginPath();
    ctx.ellipse(sh.x, sh.y, radius + 4, radius * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(sh.x, sh.y, radius + 2, radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fill();

    // Cartoony body
    const bw = radius * 1.5;
    const bh = radius * 1.85;
    const bx = p.x - bw * 0.5;
    const by = p.y - 13;
    ctx.beginPath();
    ctx.ellipse(bx + bw * 0.5, by, bw * 0.5, 4, 0, Math.PI, 0);
    ctx.lineTo(bx + bw, by + bh - 4);
    ctx.ellipse(bx + bw * 0.5, by + bh - 4, bw * 0.5, 4, 0, 0, Math.PI);
    ctx.closePath();
    ctx.fillStyle = e.color;
    ctx.fill();
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.arc(p.x, by - 3, Math.max(4.5, radius * 0.48), 0, Math.PI * 2);
    ctx.fillStyle = "#ffe2c8";
    ctx.fill();
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Name tag
    const fontSize = Math.max(16, Math.min(28, radius * 1.1));
    const charW = fontSize * 0.68;
    const tagW = Math.max(34, label.length * charW + 10);
    const tagH = Math.max(13, fontSize + 3);
    const tx = p.x - tagW * 0.5;
    const ty = p.y - (18 + radius * 1.2);
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(tx, ty, tagW, tagH, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#1f1c1c";
    ctx.font = `700 ${fontSize}px sans-serif`;
    ctx.fillText(label, tx + 5, ty + tagH - 3);
  }

  function drawProp(prop) {
    const p = project(prop.x, prop.y, 0);
    const z = clamp(world.zoom, 1.2, ZOOM_MAX);

    if (prop.type === "tree") {
      const trunkW = 6 * z;
      const trunkH = 12 * z;
      ctx.fillStyle = "#8f6a46";
      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(p.x - trunkW * 0.5, p.y - trunkH - 6 * z, trunkW, trunkH, 2);
      ctx.fill();
      ctx.stroke();

      const crownR = 9 * z;
      ctx.fillStyle = "#73be64";
      ctx.beginPath();
      ctx.arc(p.x - 7 * z, p.y - trunkH - 9 * z, crownR, 0, Math.PI * 2);
      ctx.arc(p.x + 2 * z, p.y - trunkH - 13 * z, crownR * 1.05, 0, Math.PI * 2);
      ctx.arc(p.x + 10 * z, p.y - trunkH - 9 * z, crownR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(58,58,58,0.55)";
      ctx.lineWidth = 1;
      ctx.stroke();
      return;
    }

    if (prop.type === "lamp") {
      const h = 20 * z;
      ctx.strokeStyle = "#4f5962";
      ctx.lineWidth = Math.max(1.4, 1.1 * z);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 6 * z);
      ctx.lineTo(p.x, p.y - h);
      ctx.stroke();

      ctx.fillStyle = "#ffe08f";
      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(p.x - 4 * z, p.y - h - 7 * z, 8 * z, 7 * z, 2);
      ctx.fill();
      ctx.stroke();

      const glow = ctx.createRadialGradient(p.x, p.y - h - 3 * z, 1, p.x, p.y - h - 3 * z, 16 * z);
      glow.addColorStop(0, "rgba(255,225,130,0.35)");
      glow.addColorStop(1, "rgba(255,225,130,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y - h - 3 * z, 16 * z, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawGround() {
    const h = hourOfDay();
    const dayFactor = Math.sin(((h - 6) / 24) * Math.PI * 2) * 0.5 + 0.5;
    const r = Math.floor(142 + dayFactor * 34);
    const g = Math.floor(198 + dayFactor * 22);
    const b = Math.floor(238 - dayFactor * 16);
    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGrad.addColorStop(0, `rgb(${r},${g},${b})`);
    skyGrad.addColorStop(1, `rgb(${r - 4},${g + 6},${Math.max(136, b - 64)})`);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clouds
    const cloudShift = (world.totalMinutes * 0.9) % (canvas.width + 220);
    const cloudCount = mobileMode ? 2 : 4;
    for (let i = 0; i < cloudCount; i += 1) {
      const cx = ((i * 230 + cloudShift) % (canvas.width + 220)) - 100;
      const cy = 74 + i * 18;
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      ctx.arc(cx + 18, cy - 7, 18, 0, Math.PI * 2);
      ctx.arc(cx + 37, cy, 16, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let y = 0; y < world.height; y += 1) {
      for (let x = 0; x < world.width; x += 1) {
        const grass = (x + y) % 2 === 0 ? palette.grassA : palette.grassB;
        const road = (x + y) % 2 === 0 ? palette.roadA : palette.roadB;
        drawDiamond(x, y, roadTile(x + 0.5, y + 0.5) ? road : grass);
      }
    }
  }

  function drawWorld() {
    drawGround();
    for (const b of buildings) drawBuilding(b);

    for (const hs of hotspots) {
      const p = project(hs.x, hs.y, 0);
      const isExit = hs.id === "exitGate";
      ctx.beginPath();
      ctx.arc(p.x, p.y - 7, isExit ? 6.5 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = isExit ? "#ffd872" : "#f0ca6a";
      ctx.fill();
      ctx.strokeStyle = palette.outline;
      ctx.lineWidth = isExit ? 1.8 : 1.2;
      ctx.stroke();

      if (isExit) {
        const exitScale = clamp(world.zoom, 1.2, ZOOM_MAX);
        const labelW = 56 * exitScale;
        const labelH = 22 * exitScale;
        const tx = p.x - labelW * 0.5;
        const ty = p.y - 44 * exitScale;
        ctx.fillStyle = "rgba(255,255,255,0.78)";
        ctx.strokeStyle = palette.outline;
        ctx.lineWidth = Math.max(1, 1.2 * exitScale);
        ctx.beginPath();
        ctx.roundRect(tx, ty, labelW, labelH, 8 * exitScale);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#1f1c1c";
        const exitFont = Math.max(18, Math.round(16 * exitScale));
        ctx.font = `800 ${exitFont}px sans-serif`;
        ctx.fillText("EXIT", tx + 10 * exitScale, ty + labelH - 6 * exitScale);
      }
    }

    const sceneItems = [...props, ...npcs, player].sort((a, b) => a.x + a.y - (b.x + b.y));
    const zoomScale = clamp(world.zoom, 0.9, ZOOM_MAX);
    for (const item of sceneItems) {
      if ("type" in item) drawProp(item);
      else drawEntity(item, (item === player ? 12 : 11) * zoomScale, item.name);
    }
  }

  function drawMinimap() {
    if (!mctx || !minimap) return;

    const w = minimap.width;
    const h = minimap.height;
    const pad = 10;
    const sx = (w - pad * 2) / world.width;
    const sy = (h - pad * 2) / world.height;

    mctx.clearRect(0, 0, w, h);
    mctx.fillStyle = "#daf2c2";
    mctx.fillRect(0, 0, w, h);

    mctx.fillStyle = "#b7bcc8";
    for (let y = 0; y < world.height; y += 1) {
      for (let x = 0; x < world.width; x += 1) {
        if (roadTile(x + 0.5, y + 0.5)) {
          mctx.fillRect(pad + x * sx, pad + y * sy, sx + 0.4, sy + 0.4);
        }
      }
    }

    mctx.fillStyle = "#8897a5";
    for (const b of buildings) {
      mctx.fillRect(pad + b.x * sx, pad + b.y * sy, b.w * sx, b.h * sy);
    }

    mctx.fillStyle = "#d8ae47";
    for (const hs of hotspots) {
      mctx.fillRect(pad + hs.x * sx - 1.5, pad + hs.y * sy - 1.5, 3, 3);
    }

    for (const npc of npcs) {
      mctx.fillStyle = npc.color;
      mctx.beginPath();
      mctx.arc(pad + npc.x * sx, pad + npc.y * sy, 2.6, 0, Math.PI * 2);
      mctx.fill();
    }

    mctx.fillStyle = player.color;
    mctx.beginPath();
    mctx.arc(pad + player.x * sx, pad + player.y * sy, 3.2, 0, Math.PI * 2);
    mctx.fill();
    mctx.strokeStyle = palette.outline;
    mctx.stroke();

    mctx.strokeStyle = "rgba(30,40,50,0.58)";
    mctx.strokeRect(pad + (player.x - 6) * sx, pad + (player.y - 5) * sy, 12 * sx, 10 * sy);
  }

  function updateCamera() {
    const p = project(player.x, player.y, 0);
    const tx = canvas.width * 0.5 - (p.x - world.cameraX) + cameraPan.x + convoPan.x;
    const ty = canvas.height * 0.58 - (p.y - world.cameraY) + cameraPan.y + convoPan.y;
    world.cameraX += (tx - world.cameraX) * 0.08;
    world.cameraY += (ty - world.cameraY) * 0.08;
  }

  function updateUI() {
    uiTime.textContent = `시간: ${formatTime()} ${world.paused ? "(일시정지)" : ""}`;
    uiPlayer.textContent = `플레이어: ${player.name} (${player.x.toFixed(1)}, ${player.y.toFixed(1)})`;

    const near = nearestNpc(CHAT_NEARBY_DISTANCE);
    uiNearby.textContent = near ? `근처: ${near.npc.name} (${near.npc.state})` : "근처: 없음";

    if (quest.done) uiQuest.textContent = `퀘스트: ${quest.title} - 완료`;
    else uiQuest.textContent = `퀘스트: ${quest.title} - ${quest.objective}`;

    uiRel.textContent = `관계도: 허승준 ${relations.playerToHeo} / 김민수 ${relations.playerToKim} / 최민영 ${relations.playerToChoi} / 허승준↔김민수 ${relations.heoToKim}`;

    const target = chatTargetNpc();
    if (chatTargetEl) chatTargetEl.textContent = target ? `대상: ${target.npc.name}` : "대상: 없음";
    if (chatSendEl) chatSendEl.disabled = !target || !target.near;
    if (chatInputEl) chatInputEl.disabled = !target || !target.near;
    if (chatActiveTargetEl) chatActiveTargetEl.textContent = target ? `대상: ${target.npc.name}` : "대상: 없음";
    if (chatActiveStateEl) {
      if (!target) chatActiveStateEl.textContent = "상태: 대화 불가";
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
  initPlayerName();
  addLog("월드가 초기화되었습니다. NPC와 상호작용해 보세요.");
  if (LLM_API_URL) addChat("System", "근처 NPC와 한국어 LLM 채팅이 활성화되었습니다.");
  else addChat("System", "LLM 엔드포인트가 없어 로컬 대화 모드로 동작합니다.");

  function frame(now) {
    resizeCanvasToDisplaySize();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    frameCount += 1;

    if (!world.paused) {
      world.totalMinutes += dt * 14;
      updatePlayer(dt);
      updateNpcs(dt);
      updateNpcSocialEvents();
      updateAmbientEvents();
      updateConversationCamera();
      updateCamera();
    }

    updateUI();
    drawWorld();
    if (!mobileMode || frameCount % 3 === 0) drawMinimap();
    requestAnimationFrame(frame);
  }

  window.addEventListener("keydown", (ev) => {
    const code = ev.code;
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
    keys.add(code);
  });

  window.addEventListener("keyup", (ev) => {
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
      ev.preventDefault();
      inputState.joystickPointerId = ev.pointerId;
      joystickBase.setPointerCapture(ev.pointerId);
      const rect = joystickBase.getBoundingClientRect();
      const x = (ev.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      const y = (ev.clientY - rect.top - rect.height / 2) / (rect.height / 2);
      setJoystick(x, y);
    });

    joystickBase.addEventListener("pointermove", (ev) => {
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
    mobileInteractBtn.addEventListener("click", () => interact());
  }
  if (mobileChatBtn && stageEl) {
    mobileChatBtn.addEventListener("click", () => {
      const open = stageEl.classList.toggle("pg-mobile-chat-open");
      mobileChatBtn.textContent = open ? "채팅닫기" : "채팅";
      if (open && chatInputEl) chatInputEl.focus();
    });
  }
  if (mobileResetBtn) {
    mobileResetBtn.addEventListener("click", () => resetView());
  }
  if (mobileRunBtn) {
    const runDown = (ev) => {
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
      world.paused = !world.paused;
      addLog(world.paused ? "시뮬레이션 일시정지" : "시뮬레이션 재개");
    });
  }

  if (chatSendEl) chatSendEl.addEventListener("click", sendCardChat);
  if (chatInputEl) {
    chatInputEl.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        sendCardChat();
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
        panelState.left = !panelState.left;
        applyPanelState();
        savePanelState();
      });
    }
    if (rightToggleBtn) {
      rightToggleBtn.addEventListener("click", () => {
        panelState.right = !panelState.right;
        applyPanelState();
        savePanelState();
      });
    }
    if (chatToggleBtn) {
      chatToggleBtn.addEventListener("click", () => {
        panelState.chat = !panelState.chat;
        applyPanelState();
        savePanelState();
      });
    }
  }

  if (mobileMode) resetJoystick();
  syncSharedNpcs();
  if (WORLD_NPC_API_URL) {
    window.setInterval(syncSharedNpcs, 18000);
  }
  resizeCanvasToDisplaySize();
  window.addEventListener("resize", resizeCanvasToDisplaySize);

  requestAnimationFrame(frame);
})();
