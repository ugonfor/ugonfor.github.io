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

  const SAVE_KEY = "playground_world_state_v2";
  const UI_PREF_KEY = "playground_ui_pref_v1";
  const MOBILE_SHEET_KEY = "playground_mobile_sheet_v1";
  const PLAYER_NAME_KEY = "playground_player_name_v1";
  const PLAYER_FLAG_KEY = "playground_player_flag_v1";
  const AUTO_WALK_KEY = "playground_auto_walk_v1";
  const COUNTRY_LIST = [
    { flag: "", label: "선택 안 함" },
    { flag: "🇰🇷", label: "한국" },
    { flag: "🇺🇸", label: "미국" },
    { flag: "🇯🇵", label: "일본" },
    { flag: "🇨🇳", label: "중국" },
    { flag: "🇬🇧", label: "영국" },
    { flag: "🇫🇷", label: "프랑스" },
    { flag: "🇩🇪", label: "독일" },
    { flag: "🇮🇹", label: "이탈리아" },
    { flag: "🇪🇸", label: "스페인" },
    { flag: "🇧🇷", label: "브라질" },
    { flag: "🇨🇦", label: "캐나다" },
    { flag: "🇦🇺", label: "호주" },
    { flag: "🇮🇳", label: "인도" },
    { flag: "🇷🇺", label: "러시아" },
    { flag: "🇲🇽", label: "멕시코" },
    { flag: "🇹🇭", label: "태국" },
  ];
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
    outline: "#5c4731",
    grassA: "#92d66b",
    grassB: "#83ca63",
    grassC: "#a5df81",
    roadA: "#d8c39a",
    roadB: "#cdb386",
    skyTop: "#8fd8ff",
    skyBottom: "#d3f2ff",
    waterA: "#8fd7ff",
    waterB: "#71bfef",
    waterEdge: "#c5efff",
    flowerPink: "#ff95b7",
    flowerYellow: "#ffd96f",
    fence: "#d8a569",
  };

  const player = {
    name: "플레이어",
    flag: "",
    x: 12,
    y: 18,
    speed: 3.7,
    color: "#f2cc61",
    species: "human_a",
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
    { id: "cafe", x: 22, y: 7, w: 3, h: 2, z: 2.3, color: "#f7b6b5", roof: "#e68a84", label: "카페" },
    { id: "office", x: 25, y: 9, w: 4, h: 2, z: 2.9, color: "#f8d28d", roof: "#d79956", label: "사무실" },
    { id: "market", x: 19, y: 23, w: 4, h: 3, z: 2.5, color: "#9ecbf0", roof: "#6ea2d4", label: "시장" },
  ];

  const hotspots = [
    { id: "exitGate", x: 13, y: 32.5, label: "출구" },
    { id: "cafeDoor", x: 23, y: 9, label: "카페 입구" },
    { id: "marketBoard", x: 20.5, y: 26, label: "시장 게시판" },
    { id: "parkMonument", x: 8.6, y: 8.2, label: "공원 기념비" },
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
    { type: "bush", x: 10.3, y: 14.5 },
    { type: "bush", x: 11.4, y: 15.2 },
    { type: "bush", x: 24.3, y: 14.4 },
    { type: "bush", x: 25.5, y: 13.6 },
    { type: "flower", x: 7.2, y: 16.2 },
    { type: "flower", x: 8.1, y: 16.8 },
    { type: "flower", x: 9.1, y: 16.0 },
    { type: "flower", x: 27.6, y: 20.8 },
    { type: "flower", x: 28.4, y: 21.2 },
    { type: "fence", x: 6.8, y: 22.4 },
    { type: "fence", x: 7.8, y: 22.4 },
    { type: "fence", x: 8.8, y: 22.4 },
    { type: "fence", x: 26.5, y: 22.8 },
    { type: "fence", x: 27.5, y: 22.8 },
    { type: "fence", x: 28.5, y: 22.8 },
  ];

  const speciesPool = ["human_a", "human_b", "human_c", "human_d", "human_e", "human_f", "human_g", "human_h", "human_i"];

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
      talkCooldown: 0,
      memory: [],
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
    };
  }

  const npcs = [
    makeNpc("heo", "허승준", "#e56f6f", places.homeA, places.office, places.park, "", "human_a"),
    makeNpc("kim", "김민수", "#6fa1e5", places.homeB, places.market, places.plaza, "", "human_b"),
    makeNpc("choi", "최민영", "#79c88b", places.homeC, places.cafe, places.park, "", "human_c"),
    makeNpc("jung", "정욱진", "#b88be6", places.homeA, places.cafe, places.market, "", "human_d"),
    makeNpc("seo", "서창근", "#e6a76f", places.homeB, places.office, places.plaza, "", "human_e"),
    makeNpc("lee", "이진원", "#6fc7ba", places.homeC, places.market, places.plaza, "", "human_f"),
    makeNpc("park", "박지호", "#d88972", places.homeA, places.office, places.park, "", "human_g"),
    makeNpc("jang", "장동우", "#8e9be3", places.homeB, places.cafe, places.market, "", "human_h"),
    makeNpc("yoo", "유효곤", "#5e88dd", places.homeC, places.office, places.plaza, "", "human_i"),
  ];

  const relations = {
    playerToHeo: 52,
    playerToKim: 47,
    heoToKim: 38,
    playerToChoi: 50,
  };

  const quest = {
    title: "이웃의 실타래",
    stage: 0,
    objective: "광장에서 허승준에게 말을 걸어보세요.",
    done: false,
  };

  const questHistory = [];
  let questCount = 0;

  const worldEvents = {
    day: -1,
    once: {},
  };

  const timedEvent = {
    active: false,
    type: "",
    title: "",
    description: "",
    endsAt: 0,
    npcId: null,
    targetPlace: null,
    reward: null,
    nextCheckAt: 0,
  };

  const timedEventTemplates = [
    {
      type: "flash_sale",
      make() {
        const npc = npcs[Math.floor(Math.random() * npcs.length)];
        const itemKey = Object.keys(itemTypes)[Math.floor(Math.random() * Object.keys(itemTypes).length)];
        const info = itemTypes[itemKey];
        return {
          title: `${npc.name}의 긴급 요청`,
          description: `${npc.name}이(가) ${info.label}을(를) 급히 찾고 있습니다!`,
          duration: 120_000,
          npcId: npc.id,
          reward: { type: "relation", npcId: npc.id, amount: 15, itemNeeded: itemKey },
        };
      },
    },
    {
      type: "gathering",
      make() {
        const placeNames = { plaza: "광장", cafe: "카페", park: "공원", market: "시장" };
        const placeKeys = Object.keys(placeNames);
        const pk = placeKeys[Math.floor(Math.random() * placeKeys.length)];
        return {
          title: `${placeNames[pk]} 모임`,
          description: `${placeNames[pk]}에서 주민 모임이 열립니다! 가보세요.`,
          duration: 90_000,
          targetPlace: places[pk],
          reward: { type: "items", items: ["gem", "snack"] },
        };
      },
    },
    {
      type: "npc_emergency",
      make() {
        const npc = npcs[Math.floor(Math.random() * npcs.length)];
        return {
          title: `${npc.name} 긴급 상황`,
          description: `${npc.name}이(가) 도움을 요청하고 있습니다! 빨리 찾아가세요.`,
          duration: 100_000,
          npcId: npc.id,
          reward: { type: "relation", npcId: npc.id, amount: 20 },
        };
      },
    },
  ];

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
  const WEATHER_TYPES = ["clear", "clear", "clear", "cloudy", "rain", "rain", "storm", "snow", "fog"];

  // ─── Discovery System ───
  const discoveries = [
    { id: "secret_garden", x: 30.5, y: 6.5, radius: 1.8, found: false, title: "비밀 정원", desc: "건물 뒤에 숨겨진 작은 정원을 발견했다.", condition: "always", reward: "gem" },
    { id: "river_message", x: 5.5, y: 14, radius: 1.5, found: false, title: "강변의 편지", desc: "강가에서 유리병 속 편지를 발견했다.", condition: "always", reward: "letter" },
    { id: "midnight_glow", x: 8.6, y: 8.2, radius: 1.5, found: false, title: "자정의 빛", desc: "공원 기념비가 자정에 은은하게 빛나고 있다!", condition: "night", reward: "gem" },
    { id: "rain_mushrooms", x: 15, y: 12, radius: 2.0, found: false, title: "비 오는 날의 버섯", desc: "비가 오자 길가에 형형색색 버섯이 자라났다.", condition: "rain", reward: "snack" },
    { id: "hidden_well", x: 28, y: 20, radius: 1.5, found: false, title: "숨겨진 우물", desc: "덤불 사이에서 오래된 우물을 발견했다.", condition: "always", reward: "gem" },
    { id: "sunset_view", x: 32, y: 4, radius: 2.0, found: false, title: "노을 전망대", desc: "언덕 위에서 아름다운 노을을 볼 수 있다.", condition: "evening", reward: "flower_red" },
    { id: "fog_figure", x: 10, y: 26, radius: 2.0, found: false, title: "안개 속 그림자", desc: "안개 속에서 희미한 형체를 발견했다...", condition: "fog", reward: "gem" },
    { id: "market_stash", x: 18, y: 26.5, radius: 1.5, found: false, title: "시장 뒷골목 비밀", desc: "시장 뒤에서 숨겨진 상자를 발견했다.", condition: "always", reward: "snack" },
    { id: "night_cats", x: 24, y: 28, radius: 2.0, found: false, title: "밤의 고양이들", desc: "밤에만 나타나는 고양이 무리를 발견했다!", condition: "night", reward: "snack" },
    { id: "flower_field", x: 7, y: 17.5, radius: 2.0, found: false, title: "비밀 꽃밭", desc: "수풀 사이에 숨겨진 꽃밭이 있었다.", condition: "always", reward: "flower_red" },
    { id: "storm_crystal", x: 13, y: 5, radius: 2.0, found: false, title: "폭풍의 수정", desc: "폭풍우 속에서 빛나는 수정을 발견했다!", condition: "storm", reward: "gem" },
    { id: "snow_angel", x: 20, y: 10, radius: 2.0, found: false, title: "눈 위의 천사", desc: "눈이 온 뒤 땅에 신비한 무늬가 생겼다.", condition: "snow", reward: "gem" },
    { id: "dawn_song", x: 16, y: 30, radius: 2.0, found: false, title: "새벽의 노래", desc: "이른 새벽, 어디선가 아름다운 노래가 들린다.", condition: "dawn", reward: "letter" },
    { id: "plaza_dance", x: 13, y: 17, radius: 1.5, found: false, title: "광장의 흔적", desc: "광장 바닥에서 오래된 모자이크 무늬를 발견했다.", condition: "always", reward: "coffee" },
    { id: "lamp_wish", x: 13.2, y: 13.8, radius: 1.2, found: false, title: "소원의 가로등", desc: "이 가로등에는 작은 소원 종이가 매달려 있다.", condition: "night", reward: "letter" },
  ];
  let discoveryNotifyUntil = 0;
  let discoveryNotifyTitle = "";

  const favorLevelNames = ["낯선 사이", "아는 사이", "친구", "절친", "소울메이트"];
  const favorRequestTemplates = [
    {
      minLevel: 0,
      make(npc) {
        const itemKeys = Object.keys(itemTypes);
        const itemKey = itemKeys[Math.floor(Math.random() * itemKeys.length)];
        const info = itemTypes[itemKey];
        return {
          type: "bring_item",
          title: `${npc.name}의 부탁`,
          description: `${info.label}을(를) 가져다 주세요.`,
          itemNeeded: itemKey,
          expiresAt: nowMs() + 180_000,
          reward: { favorPoints: 20, relationBoost: 8, items: [] },
        };
      },
    },
    {
      minLevel: 1,
      make(npc) {
        const others = npcs.filter((n) => n.id !== npc.id);
        const target = others[Math.floor(Math.random() * others.length)];
        return {
          type: "deliver_to",
          title: `${target.name}에게 전달`,
          description: `${target.name}에게 가서 말을 전해주세요.`,
          targetNpcId: target.id,
          expiresAt: nowMs() + 150_000,
          reward: { favorPoints: 25, relationBoost: 10, items: ["snack"] },
        };
      },
    },
    {
      minLevel: 2,
      make(npc) {
        const placeNames = { plaza: "광장", cafe: "카페", park: "공원", market: "시장" };
        const pk = Object.keys(placeNames)[Math.floor(Math.random() * 4)];
        return {
          type: "visit_place",
          title: `${placeNames[pk]} 탐사`,
          description: `${placeNames[pk]}에 가서 상황을 확인해주세요.`,
          targetPlace: places[pk],
          expiresAt: nowMs() + 120_000,
          reward: { favorPoints: 30, relationBoost: 12, items: ["gem"] },
        };
      },
    },
  ];

  // ─── Weather Update ───
  function updateWeather(dt) {
    const now = nowMs();
    if (now > weather.nextChangeAt) {
      weather.next = WEATHER_TYPES[Math.floor(Math.random() * WEATHER_TYPES.length)];
      weather.targetIntensity = weather.next === "clear" ? 0 : 0.3 + Math.random() * 0.7;
      weather.nextChangeAt = now + 180000 + Math.random() * 300000;
      weather.transitionProgress = 0;
      if (weather.next !== "clear" && weather.next !== "cloudy") {
        const weatherNames = { rain: "비", storm: "폭풍우", snow: "눈", fog: "안개" };
        addLog(`날씨 변화: ${weatherNames[weather.next] || weather.next}이(가) 다가옵니다...`);
      }
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
      tryCardDrop("quest_complete", null);
    }
  }

  function updateFavorRequests() {
    const now = nowMs();
    for (const npc of npcs) {
      if (npc.activeRequest) {
        if (now > npc.activeRequest.expiresAt) {
          addChat("System", `⏰ '${npc.activeRequest.title}' 시간 초과!`);
          npc.activeRequest = null;
        }
        continue;
      }
      if (now < npc.lastRequestAt + 120_000) continue;
      if (dist(player, npc) > 20) continue;
      if (Math.random() > 0.008) continue;

      const eligible = favorRequestTemplates.filter((t) => npc.favorLevel >= t.minLevel);
      if (!eligible.length) continue;
      const template = eligible[Math.floor(Math.random() * eligible.length)];
      npc.activeRequest = template.make(npc);
      npc.lastRequestAt = now;
      npc.mood = "neutral";
      addChat("System", `❗ ${npc.name}이(가) 도움을 요청합니다: ${npc.activeRequest.description}`);
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
    npc.favorPoints += Math.round(req.reward.favorPoints * cardEffectMultiplier("favor") * cardEffectMultiplier("allDouble"));
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
      addChat("System", `🎉 ${npc.name}과(와)의 관계: ${favorLevelNames[npc.favorLevel]}!`);
    }

    addChat("System", `✅ '${req.title}' 완료! (호감도 +${req.reward.favorPoints})`);
    tryCardDrop("quest_complete", npc);
  }

  const cardDefs = {
    card_sunrise: { name: "첫 일출", rarity: "rare", emoji: "🌅", effect: "이동속도 +5%", effectKey: "speed", effectVal: 0.05 },
    card_night: { name: "별이 빛나는 밤", rarity: "rare", emoji: "🌙", effect: "야간 시야 확대", effectKey: "nightVision", effectVal: 1 },
    card_friendship: { name: "우정의 증표", rarity: "epic", emoji: "🤝", effect: "관계도 +10%", effectKey: "relation", effectVal: 0.10 },
    card_explorer: { name: "탐험가의 발자국", rarity: "common", emoji: "👣", effect: "아이템 발견률 증가", effectKey: "itemFind", effectVal: 0.15 },
    card_chef: { name: "요리사의 비밀", rarity: "common", emoji: "🍳", effect: "간식 2배 획득", effectKey: "snackDouble", effectVal: 1 },
    card_gem_hunter: { name: "보석 사냥꾼", rarity: "epic", emoji: "💎", effect: "보석 발견 확률 증가", effectKey: "gemFind", effectVal: 0.20 },
    card_social: { name: "사교계의 달인", rarity: "rare", emoji: "🎭", effect: "호감도 +15%", effectKey: "favor", effectVal: 0.15 },
    card_legend: { name: "전설의 주민", rarity: "legendary", emoji: "⭐", effect: "모든 보상 2배", effectKey: "allDouble", effectVal: 1 },
  };

  const ownedCards = {};
  const cardAlbum = {};
  let cardNotifyUntil = 0;
  let cardNotifyName = "";
  let cardNotifyRarity = "";

  function tryCardDrop(trigger, context) {
    let chance = 0;
    if (trigger === "quest_complete") chance = 0.25;
    else if (trigger === "npc_interaction") chance = 0.06;
    else if (trigger === "item_pickup") chance = 0.04;
    else if (trigger === "timed_event") chance = 0.30;
    else chance = 0.03;

    if (Math.random() > chance) return;

    const eligible = Object.entries(cardDefs).filter(([id, card]) => {
      const rChance = card.rarity === "legendary" ? 0.02 : card.rarity === "epic" ? 0.12 : card.rarity === "rare" ? 0.25 : 0.5;
      return Math.random() < rChance;
    });
    if (!eligible.length) return;

    const [cardId, card] = eligible[Math.floor(Math.random() * eligible.length)];
    ownedCards[cardId] = (ownedCards[cardId] || 0) + 1;

    if (!cardAlbum[cardId]) {
      cardAlbum[cardId] = nowMs();
      addChat("System", `✨ 새 카드! [${card.emoji} ${card.name}] (${card.rarity}) — ${card.effect}`);
      cardNotifyUntil = nowMs() + 3500;
      cardNotifyName = card.name;
      cardNotifyRarity = card.rarity;
    } else {
      addChat("System", `카드 획득: ${card.emoji} ${card.name} (x${ownedCards[cardId]})`);
    }
  }

  function cardEffectMultiplier(key) {
    let mult = 1.0;
    for (const [cardId, count] of Object.entries(ownedCards)) {
      if (count <= 0) continue;
      const def = cardDefs[cardId];
      if (!def) continue;
      if (def.effectKey === key) mult += def.effectVal;
    }
    return mult;
  }

  function cardCollectionSummary() {
    const total = Object.keys(cardDefs).length;
    const owned = Object.keys(cardAlbum).length;
    return `${owned}/${total}`;
  }

  function startTimedEvent() {
    const template = timedEventTemplates[Math.floor(Math.random() * timedEventTemplates.length)];
    const ev = template.make();
    timedEvent.active = true;
    timedEvent.type = template.type;
    timedEvent.title = ev.title;
    timedEvent.description = ev.description;
    timedEvent.endsAt = nowMs() + ev.duration;
    timedEvent.npcId = ev.npcId || null;
    timedEvent.targetPlace = ev.targetPlace || null;
    timedEvent.reward = ev.reward || null;
    addChat("System", `⚡ 이벤트: ${ev.title} — ${ev.description}`);
  }

  function checkTimedEventCompletion() {
    if (!timedEvent.active) return;
    const now = nowMs();
    if (now >= timedEvent.endsAt) {
      addChat("System", `⏰ 이벤트 '${timedEvent.title}' 시간 초과!`);
      timedEvent.active = false;
      return;
    }

    // Cancel events whose target NPC was removed
    if (timedEvent.npcId && !npcById(timedEvent.npcId)) {
      addChat("System", `이벤트 '${timedEvent.title}' 대상 NPC가 없어 취소됩니다.`);
      timedEvent.active = false;
      return;
    }

    if (timedEvent.type === "flash_sale" && timedEvent.reward && timedEvent.reward.itemNeeded) {
      const npc = npcById(timedEvent.npcId);
      if (npc && dist(player, npc) < 2.0 && inventory[timedEvent.reward.itemNeeded] > 0) {
        inventory[timedEvent.reward.itemNeeded] -= 1;
        const relKey = Object.keys(relations).find((k) => k.toLowerCase().includes(npc.id.slice(0, 3)));
        if (relKey) adjustRelation(relKey, timedEvent.reward.amount);
        npc.mood = "happy";
        npc.moodUntil = nowMs() + 40_000;
        addChat(npc.name, "딱 필요했던 거야! 정말 고마워!");
        addChat("System", `✅ 이벤트 '${timedEvent.title}' 완료! 관계도가 올랐습니다.`);
        timedEvent.active = false;
        tryCardDrop("timed_event");
      }
    }

    if (timedEvent.type === "gathering" && timedEvent.targetPlace) {
      if (dist(player, timedEvent.targetPlace) < 2.5) {
        if (timedEvent.reward && timedEvent.reward.items) {
          for (const it of timedEvent.reward.items) {
            inventory[it] = (inventory[it] || 0) + 1;
          }
          const labels = timedEvent.reward.items.map((t) => itemTypes[t].emoji).join(" ");
          addChat("System", `✅ 이벤트 '${timedEvent.title}' 완료! ${labels} 획득!`);
        }
        timedEvent.active = false;
        tryCardDrop("timed_event");
      }
    }

    if (timedEvent.type === "npc_emergency") {
      const npc = npcById(timedEvent.npcId);
      if (npc && dist(player, npc) < 2.0) {
        const relKey = Object.keys(relations).find((k) => k.toLowerCase().includes(npc.id.slice(0, 3)));
        if (relKey) adjustRelation(relKey, timedEvent.reward.amount);
        npc.mood = "happy";
        npc.moodUntil = nowMs() + 40_000;
        addChat(npc.name, "와줘서 정말 고마워! 큰 도움이 됐어.");
        addChat("System", `✅ 이벤트 '${timedEvent.title}' 완료!`);
        timedEvent.active = false;
        tryCardDrop("timed_event");
      }
    }
  }

  const itemTypes = {
    flower_red: { label: "빨간 꽃", emoji: "🌹", color: "#ff6b7a" },
    flower_yellow: { label: "노란 꽃", emoji: "🌼", color: "#ffd54f" },
    coffee: { label: "커피 원두", emoji: "☕", color: "#8d6e63" },
    snack: { label: "간식", emoji: "🍪", color: "#e6a34f" },
    letter: { label: "편지", emoji: "💌", color: "#ef9a9a" },
    gem: { label: "보석", emoji: "💎", color: "#4fc3f7" },
  };

  const groundItems = [
    { id: "gi1", type: "flower_red", x: 7.5, y: 16.5, pickedAt: 0 },
    { id: "gi2", type: "flower_yellow", x: 9.2, y: 16.3, pickedAt: 0 },
    { id: "gi3", type: "coffee", x: 22.5, y: 8.2, pickedAt: 0 },
    { id: "gi4", type: "snack", x: 20.3, y: 24.5, pickedAt: 0 },
    { id: "gi5", type: "letter", x: 13.2, y: 17.5, pickedAt: 0 },
    { id: "gi6", type: "flower_red", x: 28.0, y: 21.0, pickedAt: 0 },
    { id: "gi7", type: "coffee", x: 23.5, y: 9.5, pickedAt: 0 },
    { id: "gi8", type: "snack", x: 6.5, y: 24.2, pickedAt: 0 },
    { id: "gi9", type: "gem", x: 8.8, y: 8.5, pickedAt: 0 },
    { id: "gi10", type: "letter", x: 26.0, y: 10.5, pickedAt: 0 },
    { id: "gi11", type: "flower_yellow", x: 16.5, y: 6.5, pickedAt: 0 },
    { id: "gi12", type: "gem", x: 20.0, y: 17.0, pickedAt: 0 },
  ];

  const ITEM_RESPAWN_MS = 180_000;

  function itemRespawnMs(gi) {
    if (gi.type === "gem") return Math.round(ITEM_RESPAWN_MS / cardEffectMultiplier("gemFind"));
    return ITEM_RESPAWN_MS;
  }

  const inventory = {};
  for (const k of Object.keys(itemTypes)) inventory[k] = 0;

  function nearestGroundItem(maxDist) {
    const now = nowMs();
    const boostedDist = maxDist * cardEffectMultiplier("itemFind");
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
    if (gi.type === "snack") amount = Math.round(amount * cardEffectMultiplier("snackDouble"));
    amount = Math.round(amount * cardEffectMultiplier("allDouble"));
    inventory[gi.type] = (inventory[gi.type] || 0) + amount;
    const info = itemTypes[gi.type];
    addChat("System", `${info.emoji} ${info.label}을(를) 주웠습니다!${amount > 1 ? ` (x${amount})` : ""} (보유: ${inventory[gi.type]})`);
    tryCardDrop("item_pickup");
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
    // Cancel timed event referencing this NPC
    if (timedEvent.active && timedEvent.npcId === npc.id) {
      timedEvent.active = false;
    }
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
    return (window.innerWidth || 1280) <= 900;
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

  function bubbleText(text) {
    return String(text || "").trim();
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

  function addChat(speaker, text, source) {
    chats.unshift({ speaker, text, source: source || "", stamp: formatTime() });
    if (chats.length > 24) chats.length = 24;
    renderChats();
  }

  function renderChats() {
    if (!chatLogEl) return;
    const frag = document.createDocumentFragment();
    for (const c of chats) {
      const row = document.createElement("div");
      if (c.source === "remote") row.classList.add("pg-chat-remote");
      else if (c.source === "local-player") row.classList.add("pg-chat-local-player");
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
    const boosted = delta * cardEffectMultiplier("relation") * cardEffectMultiplier("allDouble");
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
    if (Math.abs(x - 13) <= 1.2) return true;
    if (Math.abs(y - 17) <= 1.2) return true;
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

  function canStand(x, y) {
    if (x < 1 || y < 1 || x > world.width - 1 || y > world.height - 1) return false;
    if (inBuilding(x, y)) return false;
    if (waterTile(x, y)) return false;
    return true;
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
      nextAmbientBubbleAt = now + 6800 + Math.random() * 11000;
      const near = npcs.filter((n) => dist(n, player) < 10 && !chatSessionActiveFor(n.id));
      const pool = near.length ? near : npcs;
      if (pool.length) {
        const npc = pool[Math.floor(Math.random() * pool.length)];
        const line = npcAmbientLine(npc);
        upsertSpeechBubble(npc.id, line, 3400 + Math.random() * 2000);
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

    maybeRunAutoConversation(now);
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

  function setQuestStage(stage, objective) {
    quest.stage = stage;
    quest.objective = objective;
    if (stage >= 5) quest.done = true;
  }

  function handleQuestNpcTalk(npc) {
    if (quest.done && quest.dynamic) return handleDynamicQuestProgress(npc);
    if (quest.done) return false;

    if (quest.stage === 0 && npc.id === "heo") {
      setQuestStage(1, "시장에서 김민수에게 허승준의 메시지를 전달하세요.");
      adjustRelation("playerToHeo", 6);
      addChat("허승준", "김민수에게 이 메시지를 전해줄 수 있을까?");
      return true;
    }

    if (quest.stage === 1 && npc.id === "kim") {
      setQuestStage(2, "카페에서 최민영을 만나 자세한 이야기를 들으세요.");
      adjustRelation("playerToKim", 8);
      adjustRelation("heoToKim", 10);
      addChat("김민수", "고마워. 최민영이 더 자세히 알고 있어.");
      return true;
    }

    if (quest.stage === 2 && npc.id === "choi") {
      setQuestStage(3, "20시 이후에 공원 기념비를 조사하세요.");
      adjustRelation("playerToChoi", 6);
      addChat("최민영", "밤에 공원 기념비를 확인해봐.");
      return true;
    }

    if (quest.stage === 4 && npc.id === "heo") {
      setQuestStage(5, "완료");
      adjustRelation("playerToHeo", 10);
      addChat("허승준", "잘했어. 이제 이 동네가 더 연결된 느낌이야.");
      generateDynamicQuest();
      return true;
    }

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
        const placeNames = { plaza: "광장", cafe: "카페", office: "사무실", park: "공원", market: "시장", homeA: "주택가A", homeB: "주택가B", homeC: "주택가C" };
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
      const boosted = Math.round(15 * cardEffectMultiplier("favor") * cardEffectMultiplier("allDouble"));
      primaryNpc.favorPoints += boosted;
      if (primaryNpc.favorPoints >= 100) {
        primaryNpc.favorLevel = Math.min(primaryNpc.favorLevel + 1, 4);
        primaryNpc.favorPoints = 0;
        addChat("System", `🎉 ${primaryNpc.name}과(와)의 관계: ${favorLevelNames[primaryNpc.favorLevel]}!`);
      }
    }

    tryCardDrop("quest_complete", primaryNpc || null);

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
          primaryNpc.favorPoints += Math.round(10 * cardEffectMultiplier("favor") * cardEffectMultiplier("allDouble"));
          if (primaryNpc.favorPoints >= 100) {
            primaryNpc.favorLevel = Math.min(primaryNpc.favorLevel + 1, 4);
            primaryNpc.favorPoints = 0;
            addChat("System", `🎉 ${primaryNpc.name}과(와)의 관계: ${favorLevelNames[primaryNpc.favorLevel]}!`);
          }
        }
        tryCardDrop("quest_complete", primaryNpc);
      }
    }

    questHistory.unshift({ type: questType, primaryNpcId });
    if (questHistory.length > 5) questHistory.length = 5;
    questCount += 1;

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
    const placeNames = { plaza: "광장", cafe: "카페", office: "사무실", park: "공원", market: "시장", homeA: "주택가A", homeB: "주택가B", homeC: "주택가C" };
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

  function handleHotspotInteraction() {
    const hs = nearestHotspot(1.3);
    if (!hs) return false;

    if (hs.id === "exitGate") {
      addLog("플레이그라운드를 떠나는 중... 소개 페이지로 돌아갑니다.");
      setTimeout(() => {
        window.location.href = "/";
      }, 120);
      return true;
    }

    if (hs.id === "parkMonument") {
      if (quest.stage === 3) {
        if (hourOfDay() >= 20 || hourOfDay() < 5) {
          setQuestStage(4, "발견한 단서를 허승준에게 보고하세요.");
          addLog("퀘스트 갱신: 기념비 단서를 허승준에게 전달하세요.");
          addLog("기념비에 숨겨진 암호 메시지를 발견했습니다.");
        } else {
          addLog("단서는 밤(20시 이후)에만 나타납니다.");
        }
      } else {
        addLog("기념비에 희미한 무늬가 새겨져 있습니다.");
      }
      return true;
    }

    if (hs.id === "cafeDoor") {
      addLog("카페를 확인했습니다. NPC들의 루틴이 여기서 동기화되는 것 같습니다.");
      adjustRelation("playerToChoi", 1);
      return true;
    }

    if (hs.id === "marketBoard") {
      addLog("게시판: '야시장은 20시에 광장 근처에서 시작됩니다.'");
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
        if (near.npc.activeRequest && checkFavorCompletion(near.npc)) {
          // favor quest handled
        } else if (!handleQuestNpcTalk(near.npc)) {
          const greeting = npcSmallTalk(near.npc).replace(`${near.npc.name}: `, "");
          addChat(near.npc.name, greeting);
          if (near.npc.id === "heo") adjustRelation("playerToHeo", 1);
          if (near.npc.id === "kim") adjustRelation("playerToKim", 1);
          tryCardDrop("npc_interaction", near.npc);
        }
      } else {
        addChat("System", `${near.npc.name}은(는) 잠시 바쁩니다.`);
      }
      if (chatInputEl) chatInputEl.focus();
      return;
    }

    addChat("System", "근처에 대화 가능한 NPC가 없습니다.");
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

    addChat("You", msg);
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

    const evNow = nowMs();
    checkTimedEventCompletion();
    if (!timedEvent.active && evNow > timedEvent.nextCheckAt) {
      timedEvent.nextCheckAt = evNow + 60_000 + Math.random() * 120_000;
      if (Math.random() < 0.4) startTimedEvent();
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
        .map((n) => ({
          id: n.id, x: n.x, y: n.y, talkCooldown: n.talkCooldown,
          favorLevel: n.favorLevel, favorPoints: n.favorPoints,
        })),
      inventory: { ...inventory },
      ownedCards: { ...ownedCards },
      cardAlbum: { ...cardAlbum },
      removedNpcIds: [...removedNpcIds],
      discoveredIds: discoveries.filter(d => d.found).map(d => d.id),
      questHistory: questHistory.slice(),
      questCount,
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
          npc.x = clamp(savedNpc.x ?? npc.x, 1, world.width - 1);
          npc.y = clamp(savedNpc.y ?? npc.y, 1, world.height - 1);
          npc.talkCooldown = Math.max(0, savedNpc.talkCooldown || 0);
          if (savedNpc.favorLevel != null) npc.favorLevel = savedNpc.favorLevel;
          if (savedNpc.favorPoints != null) npc.favorPoints = savedNpc.favorPoints;
        }
      }
      if (state.inventory) {
        for (const [k, v] of Object.entries(state.inventory)) {
          if (k in inventory) inventory[k] = Math.max(0, v || 0);
        }
      }
      if (state.ownedCards) {
        for (const [k, v] of Object.entries(state.ownedCards)) {
          if (k in cardDefs) ownedCards[k] = Math.max(0, v || 0);
        }
      }
      if (state.cardAlbum) {
        for (const [k, v] of Object.entries(state.cardAlbum)) {
          if (k in cardDefs) cardAlbum[k] = v;
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
    const spd = player.speed * runMul * walkMul * cardEffectMultiplier("speed") * weatherSlow;
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
    upsertSpeechBubble(a.id, npcAmbientLine(a), 2800);
    upsertSpeechBubble(b.id, npcAmbientLine(b), 2800);
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

    const roofColor = b.roof || shade(b.color, -16);
    const signColor = b.id === "cafe" ? "#ffefc7" : (b.id === "office" ? "#e4efff" : "#ffe6bd");
    const signText = b.label;

    ctx.fillStyle = shade(b.color, -8);
    ctx.beginPath();
    ctx.moveTo(pB.x, pB.y);
    ctx.lineTo(baseB.x, baseB.y);
    ctx.lineTo(baseC.x, baseC.y);
    ctx.lineTo(pC.x, pC.y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = shade(b.color, -16);
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

    ctx.strokeStyle = "rgba(78, 62, 42, 0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const roofHeight = world.baseTileH * world.zoom * 0.62;
    const roofPeak = { x: (pA.x + pB.x) * 0.5, y: Math.min(pA.y, pB.y) - roofHeight };
    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(pA.x, pA.y);
    ctx.lineTo(roofPeak.x, roofPeak.y);
    ctx.lineTo(pB.x, pB.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(74, 57, 36, 0.42)";
    ctx.lineWidth = 1;
    ctx.stroke();

    if (b.id === "market") {
      ctx.fillStyle = "#ff6a6a";
      ctx.beginPath();
      ctx.moveTo(pA.x + 2, pA.y + 1);
      ctx.lineTo(pB.x - 2, pB.y + 1);
      ctx.lineTo((pB.x + pC.x) * 0.5, (pB.y + pC.y) * 0.5);
      ctx.lineTo((pA.x + pD.x) * 0.5, (pA.y + pD.y) * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      for (let i = 0; i < 5; i += 1) {
        const t = i / 4;
        const x1 = pA.x + (pB.x - pA.x) * t;
        const y1 = pA.y + (pB.y - pA.y) * t;
        const x2 = (pA.x + pD.x) * 0.5 + ((pB.x + pC.x) * 0.5 - (pA.x + pD.x) * 0.5) * t;
        const y2 = (pA.y + pD.y) * 0.5 + ((pB.y + pC.y) * 0.5 - (pA.y + pD.y) * 0.5) * t;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }

    const doorX = (baseD.x + baseC.x) * 0.5;
    const doorY = (baseD.y + baseC.y) * 0.5;
    const doorW = 8 * world.zoom;
    const doorH = 12 * world.zoom;
    ctx.fillStyle = "#9f7650";
    ctx.strokeStyle = "rgba(76, 57, 39, 0.45)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.roundRect(doorX - doorW * 0.5, doorY - doorH * 0.8, doorW, doorH, 3);
    ctx.fill();
    ctx.stroke();

    const winW = 7 * world.zoom;
    const winH = 5 * world.zoom;
    const leftWinX = (pD.x + pA.x) * 0.5;
    const rightWinX = (pC.x + pB.x) * 0.5;
    const winY = (pA.y + pD.y) * 0.5;
    ctx.fillStyle = "rgba(224, 248, 255, 0.86)";
    ctx.strokeStyle = "rgba(76, 60, 40, 0.4)";
    ctx.beginPath();
    ctx.roundRect(leftWinX - winW * 0.5, winY - winH * 0.5, winW, winH, 2);
    ctx.roundRect(rightWinX - winW * 0.5, winY - winH * 0.5, winW, winH, 2);
    ctx.fill();
    ctx.stroke();

    const signCx = (pA.x + pB.x + pC.x + pD.x) * 0.25;
    const signCy = (pA.y + pB.y + pC.y + pD.y) * 0.25 + world.zoom * 1.2;
    const signW = Math.max(48, signText.length * world.zoom * 6.2);
    const signH = 15 * world.zoom;
    ctx.fillStyle = signColor;
    ctx.strokeStyle = "rgba(80, 61, 41, 0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(signCx - signW * 0.5, signCy - signH * 0.5, signW, signH, 6);
    ctx.fill();
    ctx.stroke();

    if (b.id === "cafe") {
      const cupX = signCx - signW * 0.32;
      const cupY = signCy;
      ctx.strokeStyle = "rgba(95, 66, 35, 0.85)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(cupX - 4.8, cupY - 3.6, 8.2, 6.2, 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cupX + 4.8, cupY - 0.8, 2.2, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cupX - 2.3, cupY - 5.5);
      ctx.quadraticCurveTo(cupX - 0.7, cupY - 8.4, cupX + 0.9, cupY - 5.5);
      ctx.stroke();
    } else if (b.id === "office") {
      const bx = signCx - signW * 0.33;
      const by = signCy - 3.9;
      ctx.fillStyle = "rgba(82, 113, 169, 0.9)";
      ctx.fillRect(bx, by, 9.6, 7.6);
      ctx.fillStyle = "rgba(228, 240, 255, 0.95)";
      ctx.fillRect(bx + 2, by + 2, 1.4, 1.4);
      ctx.fillRect(bx + 5, by + 2, 1.4, 1.4);
      ctx.fillRect(bx + 2, by + 4.3, 1.4, 1.4);
      ctx.fillRect(bx + 5, by + 4.3, 1.4, 1.4);
    } else {
      const bx = signCx - signW * 0.33;
      const by = signCy - 1.8;
      ctx.fillStyle = "rgba(206, 132, 48, 0.92)";
      ctx.fillRect(bx, by, 10, 4.4);
      ctx.fillStyle = "rgba(116, 77, 30, 0.78)";
      ctx.fillRect(bx + 2.2, by - 1.6, 1.5, 6);
      ctx.fillRect(bx + 5.2, by - 1.6, 1.5, 6);
    }

    ctx.fillStyle = "rgba(70, 52, 34, 0.92)";
    ctx.font = `700 ${Math.max(14, Math.round(world.zoom * 5.2))}px sans-serif`;
    ctx.fillText(signText, signCx - signW * 0.16, signCy + world.zoom * 1.35);

    const cx = (pA.x + pC.x) * 0.5;
    const cy = (pA.y + pC.y) * 0.5 - 6;
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.beginPath();
    ctx.ellipse(cx, cy, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();
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

    for (let y = 0; y < world.height; y += 1) {
      for (let x = 0; x < world.width; x += 1) {
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

  function drawWorld() {
    drawGround();
    for (const b of buildings) drawBuilding(b);

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
    const sceneItems = [...props, ...npcs, player, ...remotes].sort((a, b) => a.x + a.y - (b.x + b.y));
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

    for (const npc of npcs) {
      const mp = project(npc.x, npc.y, 0);
      const msz = Math.max(14, world.zoom * 4.5);
      if (npc.activeRequest) {
        const bob = Math.sin(now * 0.005) * 3;
        ctx.font = `${msz * 1.3}px sans-serif`;
        ctx.fillText("❗", mp.x - msz * 0.4, mp.y - world.zoom * 32 + bob);
      } else if (npc.moodUntil > 0 && now < npc.moodUntil && npc.mood !== "neutral") {
        const moodEmoji = npc.mood === "happy" ? "😊" : npc.mood === "sad" ? "😢" : "😐";
        ctx.font = `${msz}px sans-serif`;
        ctx.fillText(moodEmoji, mp.x + 12, mp.y - world.zoom * 28);
      }
      if (npc.favorLevel > 0) {
        const hearts = "♥".repeat(Math.min(npc.favorLevel, 4));
        ctx.font = `${Math.max(10, world.zoom * 3)}px sans-serif`;
        ctx.fillStyle = "#ff6b8a";
        ctx.fillText(hearts, mp.x - npc.favorLevel * 4, mp.y - world.zoom * 22);
        ctx.fillStyle = "rgba(66, 52, 35, 0.92)";
      }
    }

    if (cardNotifyUntil > now) {
      const rarityColors = { common: "#90a4ae", rare: "#42a5f5", epic: "#ab47bc", legendary: "#ff9800" };
      const cText = `✨ ${cardNotifyName}`;
      ctx.save();
      ctx.font = "700 16px sans-serif";
      const cw = ctx.measureText(cText).width + 24;
      const cx = canvas.width * 0.5 - cw * 0.5;
      const cy = 70;
      ctx.fillStyle = rarityColors[cardNotifyRarity] || "#666";
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.roundRect(cx, cy, cw, 28, 8);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#fff";
      ctx.fillText(cText, cx + 12, cy + 20);
      ctx.restore();
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
      nightAlpha = Math.max(0, nightAlpha - (cardEffectMultiplier("nightVision") - 1) * 0.15);
      ctx.save();
      ctx.fillStyle = `rgba(10, 10, 40, ${clamp(nightAlpha, 0, 0.35)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
    drawLampGlow();
    drawFireflies();
    drawWeatherEffects();
    drawWeatherIndicator();
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
      ctx.fillStyle = "rgba(255, 254, 246, 0.93)";
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, 10);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 254, 246, 0.93)";
      ctx.beginPath();
      ctx.moveTo(p.x - 5, y + height - 1);
      ctx.lineTo(p.x + 5, y + height - 1);
      ctx.lineTo(p.x, y + height + 7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(66, 52, 35, 0.92)";
      for (let li = 0; li < lines.length; li++) {
        ctx.fillText(lines[li], x + 8, y + lineH * (li + 1));
      }
      ctx.restore();
    }
  }

  function drawTimedEventHud() {
    if (!timedEvent.active) return;
    const remaining = Math.max(0, timedEvent.endsAt - nowMs());
    const secs = Math.ceil(remaining / 1000);
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    const timeStr = `${mins}:${String(s).padStart(2, "0")}`;

    const text = `⚡ ${timedEvent.title} — ${timeStr}`;
    ctx.save();
    ctx.font = "700 14px sans-serif";
    const tw = ctx.measureText(text).width;
    const bw = tw + 20;
    const bh = 28;
    const bx = canvas.width * 0.5 - bw * 0.5;
    const by = 36;

    const urgency = remaining < 30_000 ? 0.9 : 0.75;
    ctx.fillStyle = `rgba(180, 40, 30, ${urgency})`;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 8);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(text, bx + 10, by + 19);
    ctx.restore();
  }

  function drawMinimap() {
    if (!mctx || !minimap) return;

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
    for (let y = 0; y < world.height; y += 1) {
      for (let x = 0; x < world.width; x += 1) {
        if (waterTile(x + 0.5, y + 0.5)) {
          mctx.fillRect(pad + x * sx, pad + y * sy, sx + 0.4, sy + 0.4);
        }
      }
    }

    mctx.globalAlpha = 0.25;
    mctx.fillStyle = "#cdb387";
    for (let y = 0; y < world.height; y += 1) {
      for (let x = 0; x < world.width; x += 1) {
        if (roadTile(x + 0.5, y + 0.5)) {
          mctx.fillRect(pad + x * sx, pad + y * sy, sx + 0.4, sy + 0.4);
        }
      }
    }

    mctx.globalAlpha = 0.26;
    mctx.fillStyle = "#9cb9d8";
    for (const b of buildings) {
      mctx.fillRect(pad + b.x * sx, pad + b.y * sy, b.w * sx, b.h * sy);
    }

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
    const weatherKo = { clear: "", cloudy: "☁️흐림", rain: "🌧️비", storm: "⛈️폭풍", snow: "❄️눈", fog: "🌫️안개" };
    const weatherStr = weatherKo[weather.current] || "";
    const discoveredCount = discoveries.filter(d => d.found).length;
    uiTime.textContent = `시간: ${formatTime()}${weatherStr ? " " + weatherStr : ""} ${world.paused ? "(일시정지)" : ""} | 발견: ${discoveredCount}/${discoveries.length}`;
    uiPlayer.textContent = `${player.name} | 가방: ${inventorySummary()} | 카드: ${cardCollectionSummary()}`;

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
          marketBoard: "게시판 보기",
          parkMonument: "조사하기",
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
      questBannerEl.hidden = false;
      if (questBannerTitleEl) questBannerTitleEl.textContent = quest.title;
      if (questBannerObjectiveEl) questBannerObjectiveEl.textContent = (quest.done && !quest.dynamic) ? "완료!" : quest.objective;
    }

    uiRel.textContent = `관계도: 허승준 ${relations.playerToHeo} / 김민수 ${relations.playerToKim} / 최민영 ${relations.playerToChoi} / 허승준↔김민수 ${relations.heoToKim}`;

    const target = chatTargetNpc();
    const npcNear = target && target.near;
    const mpChat = mp.enabled && !npcNear;
    if (chatTargetEl) chatTargetEl.textContent = npcNear ? `대상: ${target.npc.name}` : (mpChat ? "대상: 전체 채팅" : "대상: 없음");
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
      world.totalMinutes += dt * 14;
      updatePlayer(dt);
      updateNpcs(dt);
      updateNpcSocialEvents();
      updateAmbientEvents();
      updateFavorRequests();
      updateWeather(dt);
      updateDiscoveries();
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
    drawWorld();
    drawTimedEventHud();
    if (!mobileMode || frameCount % 3 === 0) drawMinimap();
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
        const clampX = typeof d.x === "number" && isFinite(d.x) ? Math.max(0, Math.min(34, d.x)) : 0;
        const clampY = typeof d.y === "number" && isFinite(d.y) ? Math.max(0, Math.min(34, d.y)) : 0;
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

  requestAnimationFrame(frame);
})();
