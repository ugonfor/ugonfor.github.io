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
  const createNameEl = document.getElementById("pg-create-name");
  const createBtnEl = document.getElementById("pg-create-btn");
  const createStatusEl = document.getElementById("pg-create-status");

  const saveBtn = document.getElementById("pg-save");
  const loadBtn = document.getElementById("pg-load");
  const uiToggleBtn = document.getElementById("pg-ui-toggle");
  const stageEl = document.querySelector(".pg-world-stage");
  const mobileInteractBtn = document.getElementById("pg-mobile-interact");
  const mobileRunBtn = document.getElementById("pg-mobile-run");
  const mobileResetBtn = document.getElementById("pg-mobile-reset");
  const mobileZoomInBtn = document.getElementById("pg-mobile-zoom-in");
  const mobileZoomOutBtn = document.getElementById("pg-mobile-zoom-out");
  const joystickBase = document.getElementById("pg-joystick-base");
  const joystickKnob = document.getElementById("pg-joystick-knob");

  const SAVE_KEY = "playground_world_state_v2";
  const LLM_API_URL = String(window.PG_LLM_API_URL || "").trim();

  const keys = new Set();
  const logs = [];
  const chats = [];
  let llmAvailable = true;

  const npcPersonas = {
    heo: { age: "20s", gender: "male", personality: "calm, responsible, protective leader" },
    kim: { age: "20s", gender: "male", personality: "friendly, curious, practical thinker" },
    choi: { age: "20s", gender: "male", personality: "observant, detail-focused, quiet" },
    jung: { age: "20s", gender: "male", personality: "energetic, spontaneous, social" },
    seo: { age: "20s", gender: "male", personality: "analytical, dry humor, direct" },
    lee: { age: "20s", gender: "male", personality: "warm, diplomatic, cooperative" },
    park: { age: "20s", gender: "male", personality: "competitive, confident, playful" },
    jang: { age: "20s", gender: "male", personality: "steady, patient, supportive" },
  };

  const cameraPan = { x: 0, y: 0 };
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
    zoom: 2.25,
    cameraX: canvas.width / 2,
    cameraY: 130,
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
    name: "You",
    x: 12,
    y: 18,
    speed: 3.7,
    color: "#f2cc61",
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

  function makeNpc(id, name, color, home, work, hobby) {
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

  function createCustomNpc(nameRaw) {
    const name = String(nameRaw || "").trim();
    if (!name) return { ok: false, reason: "Please enter a name." };
    if (npcs.some((n) => n.name === name)) return { ok: false, reason: "Name already exists." };
    if (npcs.length >= 48) return { ok: false, reason: "Too many NPCs in world." };

    const id = `custom_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e5).toString(36)}`;
    const home = { x: clamp(player.x + (Math.random() * 2 - 1) * 1.5, 2, world.width - 2), y: clamp(player.y + (Math.random() * 2 - 1) * 1.5, 2, world.height - 2) };
    const npc = makeNpc(id, name, randomPastelColor(), home, pickRandomPlace(), pickRandomPlace());
    npc.x = home.x;
    npc.y = home.y;
    npcs.push(npc);
    return { ok: true, npc };
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
    uiLog.innerHTML = logs
      .map((entry) => `<div><strong>${entry.stamp}</strong> ${entry.text}</div>`)
      .join("");
  }

  function addChat(speaker, text) {
    chats.unshift({ speaker, text, stamp: formatTime() });
    if (chats.length > 24) chats.length = 24;
    if (!chatLogEl) return;
    chatLogEl.innerHTML = chats
      .map((c) => `<div><strong>${c.speaker}</strong>: ${c.text}</div>`)
      .join("");
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
      `${npc.name}: The town feels different at ${formatTime()}.`,
      `${npc.name}: I need to keep my routine stable today.`,
      `${npc.name}: Meet me in the plaza later.`,
      `${npc.name}: Social events keep shifting my plans.`,
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
    if (/(quest|help|task|mission)/.test(t)) return "quest";
    if (/(허승준|김민수|최민영|정욱진|서창근|이진원|박지호|장동우)/.test(t)) return "people";
    if (/(world|town|city|simulation|ai)/.test(t)) return "world";
    if (/(thanks|thank you|great|good)/.test(t)) return "positive";
    return "general";
  }

  function npcReply(npc, text) {
    const topic = detectTopic(text);
    npc.memory.unshift(topic);
    if (npc.memory.length > 5) npc.memory.length = 5;

    if (topic === "positive") {
      if (npc.id === "heo") adjustRelation("playerToHeo", 2);
      if (npc.id === "kim") adjustRelation("playerToKim", 2);
      return "Thanks. Your actions are shifting the town's mood positively.";
    }

    if (topic === "quest") {
      if (quest.done) return "You already helped connect everyone. Nice job.";
      return `Current objective: ${quest.objective}`;
    }

    if (topic === "world") {
      return "This world runs on routines, relationships, and small events. Keep observing.";
    }

    if (topic === "people") {
      return "People here adapt over time. Talk to us at different hours.";
    }

    return npcSmallTalk(npc).replace(`${npc.name}: `, "");
  }

  async function requestLlmNpcReply(npc, userMessage) {
    if (!LLM_API_URL) throw new Error("LLM API URL is empty");

    const persona = npcPersonas[npc.id] || { age: "20s", gender: "male", personality: "natural and balanced" };
    const near = nearestNpc(2.2);
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
      const res = await fetch(LLM_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`LLM HTTP ${res.status}`);
      }
      const data = await res.json();
      const reply = (data && typeof data.reply === "string" && data.reply.trim()) || "";
      if (!reply) throw new Error("Empty LLM reply");
      llmAvailable = true;
      return reply;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function sendChat() {
    if (!chatInputEl) return;
    const msg = chatInputEl.value.trim();
    if (!msg) return;

    addChat("You", msg);
    chatInputEl.value = "";

    const near = nearestNpc(1.8);
    if (!near) {
      addChat("System", "No nearby NPC to chat with.");
      return;
    }

    const npc = near.npc;
    if (chatSendEl) chatSendEl.disabled = true;
    if (chatInputEl) chatInputEl.disabled = true;
    let reply = "";
    try {
      reply = await requestLlmNpcReply(npc, msg);
    } catch (err) {
      if (llmAvailable) addLog("LLM unavailable. Switched to local NPC response.");
      llmAvailable = false;
      reply = npcReply(npc, msg);
    } finally {
      if (chatSendEl) chatSendEl.disabled = false;
      if (chatInputEl) chatInputEl.disabled = false;
      if (chatInputEl) chatInputEl.focus();
    }
    addChat(npc.name, reply);
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
        x: player.x,
        y: player.y,
      },
      relations,
      quest,
      npcs: npcs.map((n) => ({ id: n.id, x: n.x, y: n.y, talkCooldown: n.talkCooldown })),
    };

    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    addLog("World state saved.");
  }

  function loadState() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      addLog("No saved state found.");
      return;
    }

    try {
      const state = JSON.parse(raw);
      if (state.world) {
        world.totalMinutes = state.world.totalMinutes ?? world.totalMinutes;
        world.paused = !!state.world.paused;
        world.zoom = clamp(Math.max(state.world.zoom ?? 2.25, 2.0), 1.4, 3.2);
        cameraPan.x = clamp((state.world.cameraPan && state.world.cameraPan.x) || 0, -320, 320);
        cameraPan.y = clamp((state.world.cameraPan && state.world.cameraPan.y) || 0, -220, 220);
      }
      if (state.player) {
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
      addLog("World state loaded.");
    } catch (err) {
      addLog("Failed to load saved state.");
    }
  }

  function updatePlayer(dt) {
    let keyDx = 0;
    let keyDy = 0;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) keyDx -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) keyDx += 1;
    if (keys.has("KeyW") || keys.has("ArrowUp")) keyDy -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) keyDy += 1;

    const dx = keyDx + inputState.joyX;
    const dy = keyDy + inputState.joyY;

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
  }

  function updateNpcs(dt) {
    for (const npc of npcs) {
      if (npc.talkCooldown > 0) npc.talkCooldown -= dt;

      const t = targetFor(npc);
      const dx = t.x - npc.x;
      const dy = t.y - npc.y;
      const d = Math.hypot(dx, dy);

      if (d > 0.15) {
        const nx = npc.x + (dx / d) * npc.speed * dt;
        const ny = npc.y + (dy / d) * npc.speed * dt;
        if (canStand(nx, ny)) {
          npc.x = nx;
          npc.y = ny;
        }
        npc.state = "moving";
      } else {
        npc.state = "idle";
      }
    }
  }

  function resetView() {
    cameraPan.x = 0;
    cameraPan.y = 0;
    world.zoom = 2.25;
    addLog("View reset.");
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
        const tx = p.x - 19;
        const ty = p.y - 28;
        ctx.fillStyle = "rgba(255,255,255,0.78)";
        ctx.strokeStyle = palette.outline;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(tx, ty, 38, 14, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#1f1c1c";
        ctx.font = "700 10px sans-serif";
        ctx.fillText("EXIT", tx + 8, ty + 10);
      }
    }

    const actors = [...npcs, player].sort((a, b) => a.x + a.y - (b.x + b.y));
    const zoomScale = clamp(world.zoom, 0.9, 3.2);
    for (const actor of actors) drawEntity(actor, (actor === player ? 12 : 11) * zoomScale, actor.name);
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
    const tx = canvas.width * 0.5 - (p.x - world.cameraX) + cameraPan.x;
    const ty = canvas.height * 0.58 - (p.y - world.cameraY) + cameraPan.y;
    world.cameraX += (tx - world.cameraX) * 0.08;
    world.cameraY += (ty - world.cameraY) * 0.08;
  }

  function updateUI() {
    uiTime.textContent = `Time: ${formatTime()} ${world.paused ? "(Paused)" : ""}`;
    uiPlayer.textContent = `Player: (${player.x.toFixed(1)}, ${player.y.toFixed(1)})`;

    const near = nearestNpc(2.2);
    uiNearby.textContent = near ? `Nearby: ${near.npc.name} (${near.npc.state})` : "Nearby: none";

    if (quest.done) uiQuest.textContent = `Quest: ${quest.title} - Completed`;
    else uiQuest.textContent = `Quest: ${quest.title} - ${quest.objective}`;

    uiRel.textContent =
      `Relation: 허승준 ${relations.playerToHeo} / 김민수 ${relations.playerToKim} / 최민영 ${relations.playerToChoi} / 허승준↔김민수 ${relations.heoToKim}`;

    if (chatTargetEl) {
      const n = nearestNpc(1.8);
      chatTargetEl.textContent = n ? `Target: ${n.npc.name}` : "Target: none";
    }
  }

  let last = performance.now();
  addLog("World initialized. Explore and interact with NPCs.");
  if (LLM_API_URL) addChat("System", "LLM chat is enabled for nearby NPCs.");
  else addChat("System", "LLM endpoint is not configured. Using local NPC chat.");

  function frame(now) {
    resizeCanvasToDisplaySize();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    frameCount += 1;

    if (!world.paused) {
      world.totalMinutes += dt * 14;
      updatePlayer(dt);
      updateNpcs(dt);
      updateAmbientEvents();
      updateCamera();
    }

    updateUI();
    drawWorld();
    if (!mobileMode || frameCount % 3 === 0) drawMinimap();
    requestAnimationFrame(frame);
  }

  window.addEventListener("keydown", (ev) => {
    const code = ev.code;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(code)) {
      ev.preventDefault();
    }
    if (code === "KeyE") interact();
    if (code === "Space") resetView();
    if (code === "KeyP") {
      world.paused = !world.paused;
      addLog(world.paused ? "Simulation paused." : "Simulation resumed.");
    }
    keys.add(code);
  });

  window.addEventListener("keyup", (ev) => {
    keys.delete(ev.code);
  });

  canvas.addEventListener("mousedown", (ev) => {
    if (ev.button !== 0) return;
    dragging = true;
    dragX = ev.clientX;
    dragY = ev.clientY;
    canvas.classList.add("dragging");
  });

  window.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    canvas.classList.remove("dragging");
  });

  window.addEventListener("mousemove", (ev) => {
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
      world.zoom = clamp(world.zoom + delta, 1.4, 3.2);
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
          world.zoom = clamp(world.zoom + delta, 1.4, 3.2);
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
  if (mobileResetBtn) {
    mobileResetBtn.addEventListener("click", () => resetView());
  }
  if (mobileZoomInBtn) {
    mobileZoomInBtn.addEventListener("click", () => {
      world.zoom = clamp(world.zoom + 0.12, 1.4, 3.2);
    });
  }
  if (mobileZoomOutBtn) {
    mobileZoomOutBtn.addEventListener("click", () => {
      world.zoom = clamp(world.zoom - 0.12, 1.4, 3.2);
    });
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

  if (chatSendEl) chatSendEl.addEventListener("click", sendChat);
  if (chatInputEl) {
    chatInputEl.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        sendChat();
      }
    });
  }

  if (saveBtn) saveBtn.addEventListener("click", saveState);
  if (loadBtn) loadBtn.addEventListener("click", loadState);
  if (createBtnEl) {
    createBtnEl.addEventListener("click", () => {
      const result = createCustomNpc(createNameEl ? createNameEl.value : "");
      if (!result.ok) {
        if (createStatusEl) createStatusEl.textContent = result.reason;
        return;
      }
      if (createNameEl) createNameEl.value = "";
      if (createStatusEl) createStatusEl.textContent = `Created: ${result.npc.name}`;
      addLog(`New character joined: ${result.npc.name}`);
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
      uiToggleBtn.textContent = collapsed ? "Show UI" : "Hide UI";
      uiToggleBtn.setAttribute("aria-expanded", collapsed ? "false" : "true");
    });
  }

  if (mobileMode) resetJoystick();
  resizeCanvasToDisplaySize();
  window.addEventListener("resize", resizeCanvasToDisplaySize);

  requestAnimationFrame(frame);
})();
