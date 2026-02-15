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

  const saveBtn = document.getElementById("pg-save");
  const loadBtn = document.getElementById("pg-load");

  const SAVE_KEY = "playground_world_state_v2";

  const keys = new Set();
  const logs = [];
  const chats = [];

  const cameraPan = { x: 0, y: 0 };
  let dragging = false;
  let dragX = 0;
  let dragY = 0;

  const world = {
    width: 34,
    height: 34,
    totalMinutes: 8 * 60,
    paused: false,
    baseTileW: 40,
    baseTileH: 20,
    zoom: 1,
    cameraX: canvas.width / 2,
    cameraY: 130,
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
    { id: "cafe", x: 22, y: 7, w: 3, h: 2, z: 2.2, color: "#8ea8bc", label: "Cafe" },
    { id: "office", x: 25, y: 9, w: 4, h: 2, z: 2.8, color: "#889990", label: "Office" },
    { id: "market", x: 19, y: 23, w: 4, h: 3, z: 2.4, color: "#b4967e", label: "Market" },
  ];

  const hotspots = [
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

  function sendChat() {
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
    const reply = npcReply(npc, msg);
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
        world.zoom = clamp(state.world.zoom ?? 1, 0.65, 1.6);
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
    let dx = 0;
    let dy = 0;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) dx -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) dx += 1;
    if (keys.has("KeyW") || keys.has("ArrowUp")) dy -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) dy += 1;

    const mag = Math.hypot(dx, dy);
    if (!mag) return;

    const runMul = keys.has("ShiftLeft") || keys.has("ShiftRight") ? 1.75 : 1;
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
    world.zoom = 1;
    addLog("View reset.");
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
    ctx.strokeStyle = "rgba(22,30,40,0.08)";
    ctx.stroke();
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

    ctx.fillStyle = shade(b.color, -14);
    ctx.beginPath();
    ctx.moveTo(pB.x, pB.y);
    ctx.lineTo(baseB.x, baseB.y);
    ctx.lineTo(baseC.x, baseC.y);
    ctx.lineTo(pC.x, pC.y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = shade(b.color, -30);
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

    ctx.strokeStyle = "rgba(0,0,0,0.24)";
    ctx.stroke();
  }

  function drawEntity(e, radius, label) {
    const p = project(e.x, e.y, 0);
    const sh = project(e.x, e.y, -0.08);

    ctx.beginPath();
    ctx.ellipse(sh.x, sh.y, radius + 4, radius * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(p.x, p.y - 10, radius, 0, Math.PI * 2);
    ctx.fillStyle = e.color;
    ctx.fill();
    ctx.strokeStyle = "#1b1b1b";
    ctx.stroke();

    ctx.fillStyle = "#101010";
    ctx.font = "11px sans-serif";
    ctx.fillText(label, p.x - 16, p.y - 24);
  }

  function drawGround() {
    const h = hourOfDay();
    const dayFactor = Math.sin(((h - 6) / 24) * Math.PI * 2) * 0.5 + 0.5;
    const r = Math.floor(174 + dayFactor * 26);
    const g = Math.floor(196 + dayFactor * 32);
    const b = Math.floor(178 + dayFactor * 16);
    ctx.fillStyle = `rgb(${r - 35}, ${g - 40}, ${b - 22})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < world.height; y += 1) {
      for (let x = 0; x < world.width; x += 1) {
        const grass = (x + y) % 2 === 0 ? "#9ecf8e" : "#96c786";
        drawDiamond(x, y, roadTile(x + 0.5, y + 0.5) ? "#a7b8c3" : grass);
      }
    }
  }

  function drawWorld() {
    drawGround();
    for (const b of buildings) drawBuilding(b);

    const actors = [...npcs, player].sort((a, b) => a.x + a.y - (b.x + b.y));
    for (const actor of actors) drawEntity(actor, actor === player ? 9 : 8, actor.name);
  }

  function drawMinimap() {
    if (!mctx || !minimap) return;

    const w = minimap.width;
    const h = minimap.height;
    const pad = 10;
    const sx = (w - pad * 2) / world.width;
    const sy = (h - pad * 2) / world.height;

    mctx.clearRect(0, 0, w, h);
    mctx.fillStyle = "#e8f1e1";
    mctx.fillRect(0, 0, w, h);

    mctx.fillStyle = "#b8c7d1";
    for (let y = 0; y < world.height; y += 1) {
      for (let x = 0; x < world.width; x += 1) {
        if (roadTile(x + 0.5, y + 0.5)) {
          mctx.fillRect(pad + x * sx, pad + y * sy, sx + 0.4, sy + 0.4);
        }
      }
    }

    mctx.fillStyle = "#6f7f88";
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
    mctx.strokeStyle = "#111";
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
  addChat("System", "Chat with nearby NPCs to influence relationships and quests.");

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    if (!world.paused) {
      world.totalMinutes += dt * 14;
      updatePlayer(dt);
      updateNpcs(dt);
      updateAmbientEvents();
      updateCamera();
    }

    updateUI();
    drawWorld();
    drawMinimap();
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
      const delta = ev.deltaY > 0 ? -0.06 : 0.06;
      world.zoom = clamp(world.zoom + delta, 0.65, 1.6);
    },
    { passive: false }
  );

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

  requestAnimationFrame(frame);
})();
