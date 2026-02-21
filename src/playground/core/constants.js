// ─── Storage Keys ───
export const SAVE_KEY = "playground_world_state_v2";
export const UI_PREF_KEY = "playground_ui_pref_v1";
export const MOBILE_SHEET_KEY = "playground_mobile_sheet_v1";
export const PLAYER_NAME_KEY = "playground_player_name_v1";
export const PLAYER_FLAG_KEY = "playground_player_flag_v1";
export const AUTO_WALK_KEY = "playground_auto_walk_v1";

// ─── Country List ───
export const COUNTRY_LIST = [
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

// ─── Zoom & Distance Constants ───
export const CHAT_NEARBY_DISTANCE = 4.6;
export const ZOOM_MIN = 1.4;
export const ZOOM_MAX = 6.0;
export const DEFAULT_ZOOM = 3.2;
export const CONVERSATION_MIN_ZOOM = 3.6;

// ─── NPC Personas ───
export const npcPersonas = {
  heo: { age: "20대", gender: "남성", personality: "차분하고 책임감이 강한 리더형" },
  kim: { age: "20대", gender: "남성", personality: "친절하고 현실적인 문제 해결형" },
  choi: { age: "20대", gender: "남성", personality: "관찰력이 높고 디테일에 강함" },
  jung: { age: "20대", gender: "남성", personality: "에너지 넘치고 사교적인 성격" },
  seo: { age: "20대", gender: "남성", personality: "분석적이고 직설적인 성격" },
  lee: { age: "20대", gender: "남성", personality: "온화하고 협업을 잘하는 성격" },
  park: { age: "20대", gender: "남성", personality: "경쟁심 있고 자신감 있는 성격" },
  jang: { age: "20대", gender: "남성", personality: "신중하고 인내심이 강한 성격" },
  yoo: { age: "20대", gender: "남성", personality: "침착하고 집요한 탐구형 성격" },
  guide: { age: "20대", gender: "여성", personality: "밝고 친절한 마을 안내원", isDocent: true },
};

// ─── Color Palette ───
export const palette = {
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

// ─── Places (NPC Routing Table) ───
export const places = {
  plaza: { x: 25, y: 25 },
  cafe: { x: 21.5, y: 11.5 },       // 건물 남쪽 문 앞
  office: { x: 30, y: 11.5 },       // 건물 남쪽 문 앞
  park: { x: 15, y: 10 },
  market: { x: 30, y: 18.5 },       // 건물 남쪽 문 앞
  homeA: { x: 13, y: 35.5 },        // 건물 남쪽 문 앞
  homeB: { x: 31, y: 35.5 },        // 건물 남쪽 문 앞
  homeC: { x: 45, y: 35.5 },        // 건물 남쪽 문 앞
  bakery: { x: 21, y: 16.5 },       // 건물 남쪽 문 앞
  florist: { x: 21, y: 20.5 },      // 건물 남쪽 문 앞
  library: { x: 20.5, y: 29.5 },    // 건물 남쪽 문 앞
  ksa_main: { x: 40.5, y: 11.5 },   // 건물 남쪽 문 앞
  ksa_dorm: { x: 40.5, y: 16.5 },   // 건물 남쪽 문 앞
  infoCenter: { x: 24, y: 23 },     // 안내소 (광장 근처)
  questBoard: { x: 26, y: 23 },     // 퀘스트 게시판 (광장 동쪽)
};

// ─── Buildings ───
export const buildings = [
  { id: "cafe", x: 20, y: 9, w: 3, h: 2, z: 2.3, color: "#f7b6b5", roof: "#e68a84", label: "카페" },
  { id: "bakery", x: 20, y: 14, w: 2, h: 2, z: 2.2, color: "#f4d6a3", roof: "#dab977", label: "빵집" },
  { id: "florist", x: 20, y: 18, w: 2, h: 2, z: 2.1, color: "#ffc9e0", roof: "#e8a1c1", label: "꽃집" },
  { id: "library", x: 19, y: 27, w: 3, h: 2, z: 2.6, color: "#b0c9d4", roof: "#8aa3b8", label: "도서관" },
  { id: "office", x: 28, y: 9, w: 4, h: 2, z: 2.9, color: "#f8d28d", roof: "#d79956", label: "사무실" },
  { id: "market", x: 28, y: 15, w: 4, h: 3, z: 2.5, color: "#9ecbf0", roof: "#6ea2d4", label: "시장" },
  { id: "ksa_main", x: 38, y: 8, w: 5, h: 3, z: 3.2, color: "#d4c4a8", roof: "#b8a88c", label: "KSA 본관" },
  { id: "ksa_dorm", x: 39, y: 14, w: 3, h: 2, z: 2.4, color: "#c9b896", roof: "#a89878", label: "KSA 기숙사" },
  { id: "houseA", x: 12, y: 33, w: 2, h: 2, z: 2.0, color: "#e8c9a6", roof: "#c4a073", label: "주택" },
  { id: "houseB", x: 30, y: 33, w: 2, h: 2, z: 2.0, color: "#d4b89a", roof: "#b09572", label: "주택" },
  { id: "houseC", x: 44, y: 33, w: 2, h: 2, z: 2.0, color: "#ceb798", roof: "#a89370", label: "주택" },
];

// ─── Hotspots ───
export const hotspots = [
  { id: "exitGate", x: 25, y: 57, label: "출구" },
  { id: "cafeDoor", x: 21.5, y: 11, label: "카페 입구" },
  { id: "bakeryDoor", x: 21, y: 16, label: "빵집 입구" },
  { id: "floristDoor", x: 21, y: 20, label: "꽃집 입구" },
  { id: "libraryDoor", x: 20.5, y: 29, label: "도서관 입구" },
  { id: "officeDoor", x: 30, y: 11, label: "사무실 입구" },
  { id: "marketDoor", x: 30, y: 18, label: "시장 입구" },
  { id: "ksaMainDoor", x: 40.5, y: 11, label: "KSA 본관" },
  { id: "ksaDormDoor", x: 40.5, y: 16, label: "KSA 기숙사" },
  { id: "houseADoor", x: 13, y: 35, label: "주택" },
  { id: "houseBDoor", x: 31, y: 35, label: "주택" },
  { id: "houseCDoor", x: 45, y: 35, label: "주택" },
  { id: "parkMonument", x: 15, y: 10, label: "공원 기념비" },
  { id: "minigameZone", x: 25, y: 20, label: "놀이터" },
  { id: "infoCenter", x: 24, y: 23, label: "안내소" },
  { id: "questBoard", x: 26, y: 23, label: "게시판" },
];

// ─── Props (Decorations) ───
export const props = [
  // 공원 (15, 10)
  { type: "fountain", x: 15, y: 10 },
  { type: "bench", x: 13, y: 9 }, { type: "bench", x: 17, y: 9 },
  { type: "bench", x: 13, y: 11.5 }, { type: "bench", x: 17, y: 11.5 },
  { type: "tree", x: 12, y: 7.5 }, { type: "tree", x: 18, y: 7.8 },
  { type: "tree", x: 12, y: 13 }, { type: "tree", x: 18, y: 13 },
  { type: "flower", x: 13.5, y: 8 }, { type: "flower", x: 16.5, y: 8.2 },
  { type: "flower", x: 14, y: 12 }, { type: "flower", x: 16, y: 12.2 },
  { type: "bush", x: 11.5, y: 10 }, { type: "bush", x: 18.5, y: 10.5 },

  // 대로 (x=25) 가로등 — 5타일 간격
  { type: "lamp", x: 24, y: 5 }, { type: "lamp", x: 26, y: 5 },
  { type: "lamp", x: 24, y: 10 }, { type: "lamp", x: 26, y: 10 },
  { type: "lamp", x: 24, y: 15 }, { type: "lamp", x: 26, y: 15 },
  { type: "lamp", x: 24, y: 20 }, { type: "lamp", x: 26, y: 20 },
  { type: "lamp", x: 24, y: 30 }, { type: "lamp", x: 26, y: 30 },
  { type: "lamp", x: 24, y: 35 }, { type: "lamp", x: 26, y: 35 },
  { type: "lamp", x: 24, y: 40 }, { type: "lamp", x: 26, y: 40 },
  { type: "lamp", x: 24, y: 45 }, { type: "lamp", x: 26, y: 45 },

  // 대로 벤치
  { type: "bench", x: 24, y: 12 }, { type: "bench", x: 26, y: 12 },
  { type: "bench", x: 24, y: 18 }, { type: "bench", x: 26, y: 18 },
  { type: "bench", x: 24, y: 32 }, { type: "bench", x: 26, y: 32 },

  // 서쪽 상가 (카페 20,9 / 빵집 20,14 / 꽃집 20,18) 주변
  { type: "tree", x: 19, y: 8 }, { type: "tree", x: 19, y: 13 },
  { type: "bush", x: 22.5, y: 10 }, { type: "bush", x: 22.5, y: 15 },
  { type: "flower", x: 19.5, y: 16.5 }, { type: "flower", x: 22, y: 17 },
  { type: "flower", x: 19.5, y: 20.5 }, { type: "flower", x: 22, y: 19 },
  { type: "flower", x: 19, y: 18.5 }, { type: "flower", x: 22.5, y: 18.5 },

  // 동쪽 상가 (사무실 28,9 / 시장 28,15) 주변
  { type: "tree", x: 33, y: 9 }, { type: "tree", x: 33, y: 15 },
  { type: "bush", x: 27, y: 10 }, { type: "bush", x: 27, y: 16 },
  { type: "flower", x: 32.5, y: 11 }, { type: "flower", x: 32.5, y: 17 },

  // KSA 캠퍼스 (38-43, 8-16)
  { type: "tree", x: 37, y: 7 }, { type: "tree", x: 44, y: 7.5 },
  { type: "tree", x: 37, y: 17 }, { type: "tree", x: 43, y: 17 },
  { type: "bush", x: 38, y: 12 }, { type: "bush", x: 43, y: 12.5 },
  { type: "bench", x: 38, y: 10 }, { type: "bench", x: 42, y: 10 },
  { type: "lamp", x: 40.5, y: 11.5 }, { type: "lamp", x: 40.5, y: 16.5 },
  { type: "fence", x: 37, y: 7 }, { type: "fence", x: 38, y: 7 },
  { type: "fence", x: 43, y: 7 }, { type: "fence", x: 44, y: 7 },
  { type: "flower", x: 39, y: 7.5 }, { type: "flower", x: 41, y: 7.5 },
  { type: "signpost", x: 38, y: 18 },

  // 도서관 (19, 27) 주변
  { type: "tree", x: 18, y: 26 }, { type: "tree", x: 23, y: 28 },
  { type: "bench", x: 18, y: 29.5 }, { type: "bush", x: 22.5, y: 27 },

  // 광장 (25, 25)
  { type: "lamp", x: 22, y: 23 }, { type: "lamp", x: 28, y: 23 },
  { type: "lamp", x: 22, y: 27 }, { type: "lamp", x: 28, y: 27 },
  { type: "bench", x: 23, y: 24 }, { type: "bench", x: 27, y: 24 },
  { type: "bench", x: 23, y: 26 }, { type: "bench", x: 27, y: 26 },
  { type: "signpost", x: 25, y: 23.5 },
  { type: "questboard", x: 26, y: 23 }, { type: "bush", x: 28.5, y: 25 },

  // 놀이터 (25, 20)
  { type: "fence", x: 23, y: 19 }, { type: "fence", x: 24, y: 19 },
  { type: "fence", x: 26, y: 19 }, { type: "fence", x: 27, y: 19 },
  { type: "bench", x: 23, y: 21 }, { type: "bench", x: 27, y: 21 },

  // 주택A (12, 33) 주변
  { type: "fence", x: 11, y: 35.5 }, { type: "fence", x: 12, y: 35.5 },
  { type: "fence", x: 13, y: 35.5 }, { type: "fence", x: 14, y: 35.5 },
  { type: "flower", x: 11.5, y: 32.5 }, { type: "flower", x: 14.5, y: 32.5 },
  { type: "tree", x: 10, y: 31 }, { type: "bush", x: 15, y: 34 },

  // 주택B (30, 33) 주변
  { type: "fence", x: 29, y: 35.5 }, { type: "fence", x: 30, y: 35.5 },
  { type: "fence", x: 31, y: 35.5 }, { type: "fence", x: 32, y: 35.5 },
  { type: "flower", x: 29.5, y: 32.5 }, { type: "flower", x: 32.5, y: 32.5 },
  { type: "tree", x: 28, y: 31 }, { type: "bush", x: 33, y: 34 },

  // 주택C (44, 33) 주변
  { type: "fence", x: 43, y: 35.5 }, { type: "fence", x: 44, y: 35.5 },
  { type: "fence", x: 45, y: 35.5 }, { type: "fence", x: 46, y: 35.5 },
  { type: "flower", x: 43.5, y: 32.5 }, { type: "flower", x: 46.5, y: 32.5 },
  { type: "tree", x: 42, y: 31 }, { type: "bush", x: 47, y: 34 },

  // 도로 교차점 가로등
  { type: "lamp", x: 15, y: 25 }, { type: "lamp", x: 35, y: 25 },
  { type: "lamp", x: 15, y: 35 }, { type: "lamp", x: 35, y: 35 },
  { type: "lamp", x: 40, y: 25 }, { type: "lamp", x: 45, y: 35 },
  { type: "signpost", x: 25, y: 50 },

  // 자연 소품 — 외곽 및 빈 공간
  { type: "tree", x: 8, y: 5 }, { type: "tree", x: 10, y: 4.5 },
  { type: "tree", x: 35, y: 6 }, { type: "tree", x: 8, y: 20 },
  { type: "tree", x: 8, y: 28 }, { type: "tree", x: 35, y: 28 },
  { type: "bush", x: 9, y: 15 }, { type: "bush", x: 35, y: 22 },
  { type: "rock", x: 10, y: 7 }, { type: "rock", x: 8, y: 18 },
  { type: "rock", x: 8, y: 24 }, { type: "rock", x: 9, y: 32 },

  // 확장 영역 (남쪽/동쪽 외곽)
  { type: "tree", x: 12, y: 45 }, { type: "tree", x: 25, y: 48 },
  { type: "tree", x: 40, y: 45 }, { type: "tree", x: 50, y: 42 },
  { type: "tree", x: 18, y: 52 }, { type: "tree", x: 35, y: 55 },
  { type: "tree", x: 48, y: 50 }, { type: "tree", x: 55, y: 20 },
  { type: "tree", x: 55, y: 35 }, { type: "tree", x: 55, y: 50 },
  { type: "rock", x: 30, y: 50 }, { type: "rock", x: 45, y: 48 },
  { type: "rock", x: 55, y: 42 },
  { type: "bush", x: 20, y: 50 }, { type: "bush", x: 50, y: 38 },
  { type: "bush", x: 55, y: 25 },

  // ─── Bridge over river (east-west road y=25 crosses river x≈4) ───
  { type: "bridge", x: 4, y: 25 },

  // ─── Tree-lined boulevard (x=25, left side x=23.5, right side x=26.5) ───
  { type: "tree", x: 23.5, y: 6 },  { type: "tree", x: 26.5, y: 6 },
  { type: "tree", x: 23.5, y: 12 }, { type: "tree", x: 26.5, y: 12 },
  { type: "tree", x: 23.5, y: 21 }, { type: "tree", x: 26.5, y: 21 },
  { type: "tree", x: 23.5, y: 30 }, { type: "tree", x: 26.5, y: 30 },
  { type: "tree", x: 23.5, y: 36 }, { type: "tree", x: 26.5, y: 36 },
  { type: "tree", x: 23.5, y: 39 }, { type: "tree", x: 26.5, y: 39 },
  { type: "tree", x: 23.5, y: 42 }, { type: "tree", x: 26.5, y: 42 },
  { type: "tree", x: 23.5, y: 45 }, { type: "tree", x: 26.5, y: 45 },

  // ─── Park improvements (statue near park) ───
  { type: "statue", x: 15, y: 8 },
  { type: "bench", x: 14, y: 12 }, { type: "bench", x: 16, y: 12 },

  // ─── Plaza centerpiece (clock tower) ───
  { type: "clock_tower", x: 25, y: 25 },

  // ─── Road-side lamp posts at key intersections ───
  { type: "lamp", x: 25, y: 12 }, { type: "lamp", x: 25, y: 35 },
  { type: "lamp", x: 42, y: 12 }, { type: "lamp", x: 42, y: 16 },

  // ─── Additional signposts at road ends ───
  { type: "signpost", x: 8, y: 25 }, { type: "signpost", x: 15, y: 35 },
  { type: "signpost", x: 40, y: 25 },

  // ─── Flower patches near residential area ───
  { type: "flower", x: 12, y: 36 }, { type: "flower", x: 31.5, y: 36 },

  // ─── Grass tufts (scattered small decorative props) ───
  // 대로 양쪽 (boulevard x≈23-27)
  { type: "grass_tuft", x: 23, y: 7 }, { type: "grass_tuft", x: 27, y: 8 },
  { type: "grass_tuft", x: 23, y: 14 }, { type: "grass_tuft", x: 27, y: 16 },
  { type: "grass_tuft", x: 23, y: 22 }, { type: "grass_tuft", x: 27, y: 24 },
  { type: "grass_tuft", x: 23, y: 33 }, { type: "grass_tuft", x: 27, y: 34 },
  { type: "grass_tuft", x: 23, y: 41 }, { type: "grass_tuft", x: 27, y: 43 },
  // 건물 근처
  { type: "grass_tuft", x: 19, y: 10 }, { type: "grass_tuft", x: 22, y: 13 },
  { type: "grass_tuft", x: 33, y: 10 }, { type: "grass_tuft", x: 33, y: 16 },
  { type: "grass_tuft", x: 37, y: 8 }, { type: "grass_tuft", x: 44, y: 9 },
  // 공원 주변
  { type: "grass_tuft", x: 11, y: 8 }, { type: "grass_tuft", x: 17, y: 12 },
  { type: "grass_tuft", x: 14, y: 13 }, { type: "grass_tuft", x: 16, y: 7 },
  // 주택가 주변
  { type: "grass_tuft", x: 11, y: 34 }, { type: "grass_tuft", x: 15, y: 33 },
  { type: "grass_tuft", x: 29, y: 34 }, { type: "grass_tuft", x: 33, y: 33 },
  { type: "grass_tuft", x: 43, y: 34 }, { type: "grass_tuft", x: 47, y: 33 },
  // 빈 공간 / 외곽
  { type: "grass_tuft", x: 9, y: 16 }, { type: "grass_tuft", x: 9, y: 22 },
  { type: "grass_tuft", x: 36, y: 29 }, { type: "grass_tuft", x: 50, y: 40 },
];

// ─── Species Pool ───
export const speciesPool = ["human_a", "human_b", "human_c", "human_d", "human_e", "human_f", "human_g", "human_h", "human_i"];

// ─── Weather Types ───
export const WEATHER_TYPES = ["clear", "clear", "clear", "cloudy", "rain", "rain", "storm", "snow", "fog"];

// ─── Discoveries (Initial Data) ───
export const discoveries = [
  { id: "secret_garden", x: 35, y: 8, radius: 1.8, found: false, title: "비밀 정원", desc: "건물 뒤에 숨겨진 작은 정원을 발견했다.", condition: "always", reward: "gem" },
  { id: "river_message", x: 8, y: 16, radius: 1.5, found: false, title: "강변의 편지", desc: "강가에서 유리병 속 편지를 발견했다.", condition: "always", reward: "letter" },
  { id: "midnight_glow", x: 15, y: 10, radius: 1.5, found: false, title: "자정의 빛", desc: "공원 분수가 자정에 은은하게 빛나고 있다!", condition: "night", reward: "gem" },
  { id: "rain_mushrooms", x: 18, y: 15, radius: 2.0, found: false, title: "비 오는 날의 버섯", desc: "비가 오자 길가에 형형색색 버섯이 자라났다.", condition: "rain", reward: "snack" },
  { id: "hidden_well", x: 35, y: 30, radius: 1.5, found: false, title: "숨겨진 우물", desc: "덤불 사이에서 오래된 우물을 발견했다.", condition: "always", reward: "gem" },
  { id: "sunset_view", x: 50, y: 6, radius: 2.0, found: false, title: "노을 전망대", desc: "언덕 위에서 아름다운 노을을 볼 수 있다.", condition: "evening", reward: "flower_red" },
  { id: "fog_figure", x: 10, y: 38, radius: 2.0, found: false, title: "안개 속 그림자", desc: "안개 속에서 희미한 형체를 발견했다...", condition: "fog", reward: "gem" },
  { id: "market_stash", x: 33, y: 18, radius: 1.5, found: false, title: "시장 뒷골목 비밀", desc: "시장 뒤에서 숨겨진 상자를 발견했다.", condition: "always", reward: "snack" },
  { id: "night_cats", x: 35, y: 35, radius: 2.0, found: false, title: "밤의 고양이들", desc: "밤에만 나타나는 고양이 무리를 발견했다!", condition: "night", reward: "snack" },
  { id: "flower_field", x: 10, y: 22, radius: 2.0, found: false, title: "비밀 꽃밭", desc: "수풀 사이에 숨겨진 꽃밭이 있었다.", condition: "always", reward: "flower_red" },
  { id: "storm_crystal", x: 20, y: 5, radius: 2.0, found: false, title: "폭풍의 수정", desc: "폭풍우 속에서 빛나는 수정을 발견했다!", condition: "storm", reward: "gem" },
  { id: "snow_angel", x: 25, y: 15, radius: 2.0, found: false, title: "눈 위의 천사", desc: "눈이 온 뒤 땅에 신비한 무늬가 생겼다.", condition: "snow", reward: "gem" },
  { id: "dawn_song", x: 25, y: 42, radius: 2.0, found: false, title: "새벽의 노래", desc: "이른 새벽, 어디선가 아름다운 노래가 들린다.", condition: "dawn", reward: "letter" },
  { id: "plaza_dance", x: 25, y: 25, radius: 1.5, found: false, title: "광장의 흔적", desc: "광장 바닥에서 오래된 모자이크 무늬를 발견했다.", condition: "always", reward: "coffee" },
  { id: "lamp_wish", x: 24, y: 23, radius: 1.2, found: false, title: "소원의 가로등", desc: "이 가로등에는 작은 소원 종이가 매달려 있다.", condition: "night", reward: "letter" },
  // 확장 영역 발견 장소
  { id: "ksa_rooftop", x: 42, y: 8, radius: 1.5, found: false, title: "KSA 옥상의 비밀", desc: "본관 옥상에서 밤하늘에 빛나는 무언가를 발견했다.", condition: "night", reward: "gem" },
  { id: "south_lake", x: 40, y: 55, radius: 2.5, found: false, title: "남쪽 호수", desc: "숲 사이에 숨겨진 고요한 호수를 발견했다.", condition: "always", reward: "gem" },
  { id: "east_cabin", x: 55, y: 25, radius: 2.0, found: false, title: "동쪽 숲속 오두막", desc: "안개 속에서 오래된 오두막이 보인다...", condition: "fog", reward: "letter" },
  { id: "cat_village", x: 15, y: 50, radius: 2.0, found: false, title: "고양이 마을", desc: "밤이 되자 고양이들이 모여드는 비밀 장소!", condition: "night", reward: "snack" },
  { id: "rainbow_spot", x: 50, y: 48, radius: 2.5, found: false, title: "폭풍 후 무지개", desc: "폭풍이 지나간 뒤, 하늘에 거대한 무지개가 떴다.", condition: "storm", reward: "gem" },
];

// ─── Favor Level Names ───
export const favorLevelNames = ["낯선 사이", "아는 사이", "친구", "절친", "소울메이트"];

// ─── Item Types ───
export const itemTypes = {
  flower_red: { label: "빨간 꽃", emoji: "🌹", color: "#ff6b7a" },
  flower_yellow: { label: "노란 꽃", emoji: "🌼", color: "#ffd54f" },
  coffee: { label: "커피 원두", emoji: "☕", color: "#8d6e63" },
  snack: { label: "간식", emoji: "🍪", color: "#e6a34f" },
  letter: { label: "편지", emoji: "💌", color: "#ef9a9a" },
  gem: { label: "보석", emoji: "💎", color: "#4fc3f7" },
};

// ─── Ground Items (Initial Data) ───
export const groundItems = [
  { id: "gi1", type: "flower_red", x: 14, y: 11, pickedAt: 0 },       // 공원 근처
  { id: "gi2", type: "flower_yellow", x: 16, y: 9, pickedAt: 0 },     // 공원 근처
  { id: "gi3", type: "coffee", x: 22, y: 10, pickedAt: 0 },           // 카페 근처
  { id: "gi4", type: "snack", x: 30, y: 17, pickedAt: 0 },            // 시장 근처
  { id: "gi5", type: "letter", x: 25, y: 26, pickedAt: 0 },           // 광장
  { id: "gi6", type: "flower_red", x: 35, y: 30, pickedAt: 0 },       // 숨겨진 우물 근처
  { id: "gi7", type: "coffee", x: 21, y: 12, pickedAt: 0 },           // 카페 문 앞
  { id: "gi8", type: "snack", x: 13, y: 34, pickedAt: 0 },            // 주택A 근처
  { id: "gi9", type: "gem", x: 15, y: 10.5, pickedAt: 0 },            // 공원 분수 근처
  { id: "gi10", type: "letter", x: 30, y: 10, pickedAt: 0 },          // 사무실 근처
  { id: "gi11", type: "flower_yellow", x: 21, y: 19, pickedAt: 0 },   // 꽃집 근처
  { id: "gi12", type: "gem", x: 25, y: 24, pickedAt: 0 },             // 광장
  // 확장 영역
  { id: "gi13", type: "coffee", x: 40, y: 10, pickedAt: 0 },          // KSA 본관 근처
  { id: "gi14", type: "snack", x: 41, y: 15, pickedAt: 0 },           // KSA 기숙사 근처
  { id: "gi15", type: "flower_red", x: 31, y: 34, pickedAt: 0 },      // 주택B 근처
  { id: "gi16", type: "gem", x: 45, y: 34, pickedAt: 0 },             // 주택C 근처
  { id: "gi17", type: "letter", x: 25, y: 48, pickedAt: 0 },          // 남쪽 외곽
  { id: "gi18", type: "snack", x: 15, y: 42, pickedAt: 0 },           // 남쪽 외곽
  { id: "gi19", type: "flower_yellow", x: 50, y: 20, pickedAt: 0 },   // 동쪽 외곽
  { id: "gi20", type: "gem", x: 55, y: 35, pickedAt: 0 },             // 동쪽 외곽
];

// ─── Item Respawn ───
export const ITEM_RESPAWN_MS = 180_000;


// ─── Seasons ───
export const seasons = ["봄", "여름", "가을", "겨울"];


// ─── Interior Definitions ───
export const interiorDefs = {
  cafe: {
    width: 10, height: 8,
    floorColor: "#e8d5b7", wallColor: "#f7e6d0",
    spawnPoint: { x: 5, y: 7 },
    exitPoint: { x: 5, y: 7.5 },
    furniture: [
      { type: "counter", x: 3, y: 1, w: 4, h: 1 },
      { type: "table_round", x: 2, y: 3 },
      { type: "table_round", x: 5, y: 3 },
      { type: "table_round", x: 8, y: 3 },
      { type: "table_round", x: 3.5, y: 5.5 },
      { type: "chair", x: 1.5, y: 3 }, { type: "chair", x: 2.5, y: 3 },
      { type: "chair", x: 4.5, y: 3 }, { type: "chair", x: 5.5, y: 3 },
      { type: "chair", x: 7.5, y: 3 }, { type: "chair", x: 8.5, y: 3 },
      { type: "chair", x: 3, y: 5.5 }, { type: "chair", x: 4, y: 5.5 },
      { type: "plant_pot", x: 1, y: 1 },
      { type: "plant_pot", x: 9, y: 1 },
    ],
    collision: [
      { x: 3, y: 1, w: 4, h: 1 },
      { x: 1.5, y: 2.5, w: 2, h: 1 },
      { x: 4.5, y: 2.5, w: 2, h: 1 },
      { x: 7.5, y: 2.5, w: 2, h: 1 },
      { x: 3, y: 5, w: 2, h: 1 },
    ],
    npcSpots: [
      { x: 5, y: 1.5, id: "barista" },
      { x: 2, y: 4, id: "customer_1" },
      { x: 8, y: 4, id: "customer_2" },
    ],
  },

  office: {
    width: 12, height: 8,
    floorColor: "#d4d4d4", wallColor: "#e8e8e8",
    spawnPoint: { x: 6, y: 7 },
    exitPoint: { x: 6, y: 7.5 },
    furniture: [
      { type: "desk", x: 2, y: 2, w: 2, h: 1 },
      { type: "desk", x: 5, y: 2, w: 2, h: 1 },
      { type: "desk", x: 8, y: 2, w: 2, h: 1 },
      { type: "desk", x: 5, y: 5, w: 2, h: 1 },
      { type: "whiteboard", x: 1, y: 1, w: 1, h: 2 },
      { type: "water_cooler", x: 11, y: 1 },
      { type: "chair", x: 3, y: 3 }, { type: "chair", x: 6, y: 3 },
      { type: "chair", x: 9, y: 3 }, { type: "chair", x: 6, y: 6 },
    ],
    collision: [
      { x: 2, y: 2, w: 2, h: 1 },
      { x: 5, y: 2, w: 2, h: 1 },
      { x: 8, y: 2, w: 2, h: 1 },
      { x: 5, y: 5, w: 2, h: 1 },
      { x: 1, y: 1, w: 1, h: 2 },
      { x: 11, y: 1, w: 1, h: 1 },
    ],
    npcSpots: [
      { x: 3, y: 3, id: "worker_1" },
      { x: 9, y: 3, id: "worker_2" },
      { x: 6, y: 6, id: "worker_3" },
    ],
  },

  market: {
    width: 12, height: 10,
    floorColor: "#d4c8b0", wallColor: "#e8dcc8",
    spawnPoint: { x: 6, y: 9 },
    exitPoint: { x: 6, y: 9.5 },
    furniture: [
      { type: "shelf", x: 2, y: 2, w: 3, h: 1 },
      { type: "shelf", x: 2, y: 4, w: 3, h: 1 },
      { type: "shelf", x: 2, y: 6, w: 3, h: 1 },
      { type: "shelf", x: 7, y: 2, w: 3, h: 1 },
      { type: "shelf", x: 7, y: 4, w: 3, h: 1 },
      { type: "shelf", x: 7, y: 6, w: 3, h: 1 },
      { type: "checkout_counter", x: 5, y: 8, w: 2, h: 1 },
    ],
    collision: [
      { x: 2, y: 2, w: 3, h: 1 },
      { x: 2, y: 4, w: 3, h: 1 },
      { x: 2, y: 6, w: 3, h: 1 },
      { x: 7, y: 2, w: 3, h: 1 },
      { x: 7, y: 4, w: 3, h: 1 },
      { x: 7, y: 6, w: 3, h: 1 },
      { x: 5, y: 8, w: 2, h: 1 },
    ],
    npcSpots: [
      { x: 6, y: 8.5, id: "cashier" },
      { x: 3, y: 3, id: "shopper_1" },
      { x: 8, y: 5, id: "shopper_2" },
    ],
  },

  ksa_main: {
    width: 14, height: 10,
    floorColor: "#d4c4a0", wallColor: "#e8d8c0",
    spawnPoint: { x: 7, y: 9 },
    exitPoint: { x: 7, y: 9.5 },
    furniture: [
      { type: "podium", x: 7, y: 1 },
      { type: "blackboard", x: 4, y: 0.5, w: 6, h: 1 },
      // 학생 책상 3x4 배치
      { type: "student_desk", x: 3, y: 3 }, { type: "student_desk", x: 5, y: 3 },
      { type: "student_desk", x: 7, y: 3 }, { type: "student_desk", x: 9, y: 3 },
      { type: "student_desk", x: 3, y: 5 }, { type: "student_desk", x: 5, y: 5 },
      { type: "student_desk", x: 7, y: 5 }, { type: "student_desk", x: 9, y: 5 },
      { type: "student_desk", x: 3, y: 7 }, { type: "student_desk", x: 5, y: 7 },
      { type: "student_desk", x: 7, y: 7 }, { type: "student_desk", x: 9, y: 7 },
    ],
    collision: [
      { x: 4, y: 0.5, w: 6, h: 1 },
      { x: 6.5, y: 1, w: 1, h: 1 },
      { x: 3, y: 3, w: 1, h: 1 }, { x: 5, y: 3, w: 1, h: 1 },
      { x: 7, y: 3, w: 1, h: 1 }, { x: 9, y: 3, w: 1, h: 1 },
      { x: 3, y: 5, w: 1, h: 1 }, { x: 5, y: 5, w: 1, h: 1 },
      { x: 7, y: 5, w: 1, h: 1 }, { x: 9, y: 5, w: 1, h: 1 },
      { x: 3, y: 7, w: 1, h: 1 }, { x: 5, y: 7, w: 1, h: 1 },
      { x: 7, y: 7, w: 1, h: 1 }, { x: 9, y: 7, w: 1, h: 1 },
    ],
    npcSpots: [
      { x: 7, y: 1.5, id: "teacher" },
      { x: 4, y: 4, id: "student_1" },
      { x: 10, y: 6, id: "student_2" },
    ],
  },

  ksa_dorm: {
    width: 10, height: 8,
    floorColor: "#c8c8c8", wallColor: "#e0e0e0",
    spawnPoint: { x: 5, y: 7 },
    exitPoint: { x: 5, y: 7.5 },
    furniture: [
      { type: "bunk_bed", x: 1, y: 1, w: 2, h: 3 },
      { type: "bunk_bed", x: 1, y: 5, w: 2, h: 3 },
      { type: "shared_table", x: 5, y: 3, w: 2, h: 2 },
      { type: "vending_machine", x: 9, y: 1, w: 1, h: 1 },
      { type: "chair", x: 4.5, y: 4 }, { type: "chair", x: 7, y: 4 },
    ],
    collision: [
      { x: 1, y: 1, w: 2, h: 3 },
      { x: 1, y: 5, w: 2, h: 3 },
      { x: 5, y: 3, w: 2, h: 2 },
      { x: 9, y: 1, w: 1, h: 1 },
    ],
    npcSpots: [
      { x: 5, y: 5, id: "dorm_resident_1" },
      { x: 8, y: 3, id: "dorm_resident_2" },
    ],
  },

  bakery: {
    width: 8, height: 8,
    floorColor: "#e0c8a0", wallColor: "#f0e0c8",
    spawnPoint: { x: 4, y: 7 },
    exitPoint: { x: 4, y: 7.5 },
    furniture: [
      { type: "display_case", x: 2, y: 1, w: 4, h: 1 },
      { type: "oven", x: 7, y: 1, w: 1, h: 2 },
      { type: "flour_sack", x: 7, y: 4 },
      { type: "flour_sack", x: 7, y: 5 },
      { type: "work_table", x: 2, y: 4, w: 3, h: 1 },
      { type: "stool", x: 2, y: 5 }, { type: "stool", x: 4, y: 5 },
    ],
    collision: [
      { x: 2, y: 1, w: 4, h: 1 },
      { x: 7, y: 1, w: 1, h: 2 },
      { x: 7, y: 4, w: 1, h: 2 },
      { x: 2, y: 4, w: 3, h: 1 },
    ],
    npcSpots: [
      { x: 4, y: 2, id: "baker" },
      { x: 3, y: 6, id: "bakery_customer" },
    ],
  },

  florist: {
    width: 8, height: 8,
    floorColor: "#e0d8c8", wallColor: "#f0e8e0",
    spawnPoint: { x: 4, y: 7 },
    exitPoint: { x: 4, y: 7.5 },
    furniture: [
      { type: "flower_display", x: 1, y: 1, w: 2, h: 1 },
      { type: "flower_display", x: 4, y: 1, w: 2, h: 1 },
      { type: "flower_display", x: 1, y: 3, w: 2, h: 1 },
      { type: "workbench", x: 5, y: 4, w: 2, h: 1 },
      { type: "fridge", x: 7, y: 1, w: 1, h: 2 },
      { type: "plant_pot", x: 1, y: 6 },
      { type: "plant_pot", x: 7, y: 6 },
    ],
    collision: [
      { x: 1, y: 1, w: 2, h: 1 },
      { x: 4, y: 1, w: 2, h: 1 },
      { x: 1, y: 3, w: 2, h: 1 },
      { x: 5, y: 4, w: 2, h: 1 },
      { x: 7, y: 1, w: 1, h: 2 },
    ],
    npcSpots: [
      { x: 6, y: 5, id: "florist_owner" },
      { x: 3, y: 5, id: "florist_customer" },
    ],
  },

  library: {
    width: 10, height: 8,
    floorColor: "#b09878", wallColor: "#d4c4b0",
    spawnPoint: { x: 5, y: 7 },
    exitPoint: { x: 5, y: 7.5 },
    furniture: [
      { type: "bookshelf", x: 1, y: 1, w: 1, h: 3 },
      { type: "bookshelf", x: 3, y: 1, w: 1, h: 3 },
      { type: "bookshelf", x: 6, y: 1, w: 1, h: 3 },
      { type: "bookshelf", x: 8, y: 1, w: 1, h: 3 },
      { type: "reading_table", x: 2, y: 5, w: 2, h: 1 },
      { type: "reading_table", x: 6, y: 5, w: 2, h: 1 },
      { type: "armchair", x: 9, y: 6 },
      { type: "chair", x: 2, y: 6 }, { type: "chair", x: 3, y: 6 },
      { type: "chair", x: 6, y: 6 }, { type: "chair", x: 7, y: 6 },
    ],
    collision: [
      { x: 1, y: 1, w: 1, h: 3 },
      { x: 3, y: 1, w: 1, h: 3 },
      { x: 6, y: 1, w: 1, h: 3 },
      { x: 8, y: 1, w: 1, h: 3 },
      { x: 2, y: 5, w: 2, h: 1 },
      { x: 6, y: 5, w: 2, h: 1 },
      { x: 9, y: 6, w: 1, h: 1 },
    ],
    npcSpots: [
      { x: 5, y: 3, id: "librarian" },
      { x: 3, y: 6, id: "reader_1" },
      { x: 7, y: 6, id: "reader_2" },
    ],
  },

  houseA: {
    width: 8, height: 6,
    floorColor: "#d4c0a0", wallColor: "#e8d8c0",
    spawnPoint: { x: 4, y: 5 },
    exitPoint: { x: 4, y: 5.5 },
    furniture: [
      { type: "bed", x: 1, y: 1, w: 2, h: 2 },
      { type: "dining_table", x: 5, y: 1, w: 2, h: 1 },
      { type: "fireplace", x: 1, y: 4, w: 2, h: 1 },
      { type: "chair", x: 5, y: 2 }, { type: "chair", x: 6, y: 2 },
      { type: "rug", x: 4, y: 3, w: 2, h: 1 },
    ],
    collision: [
      { x: 1, y: 1, w: 2, h: 2 },
      { x: 5, y: 1, w: 2, h: 1 },
      { x: 1, y: 4, w: 2, h: 1 },
    ],
    npcSpots: [
      { x: 4, y: 3, id: "resident_a1" },
      { x: 6, y: 3, id: "resident_a2" },
    ],
  },

  houseB: {
    width: 8, height: 6,
    floorColor: "#d8d8d8", wallColor: "#e8e8e8",
    spawnPoint: { x: 4, y: 5 },
    exitPoint: { x: 4, y: 5.5 },
    furniture: [
      { type: "desk_with_monitor", x: 1, y: 1, w: 2, h: 1 },
      { type: "sofa", x: 5, y: 1, w: 2, h: 1 },
      { type: "bookshelf", x: 7, y: 1, w: 1, h: 2 },
      { type: "chair", x: 1, y: 2 },
      { type: "coffee_table", x: 5, y: 3, w: 1, h: 1 },
      { type: "rug", x: 3, y: 3, w: 3, h: 1 },
    ],
    collision: [
      { x: 1, y: 1, w: 2, h: 1 },
      { x: 5, y: 1, w: 2, h: 1 },
      { x: 7, y: 1, w: 1, h: 2 },
      { x: 5, y: 3, w: 1, h: 1 },
    ],
    npcSpots: [
      { x: 2, y: 3, id: "resident_b1" },
      { x: 6, y: 3, id: "resident_b2" },
    ],
  },

  houseC: {
    width: 8, height: 6,
    floorColor: "#d4b898", wallColor: "#e8d0c0",
    spawnPoint: { x: 4, y: 5 },
    exitPoint: { x: 4, y: 5.5 },
    furniture: [
      { type: "kitchen_counter", x: 1, y: 1, w: 3, h: 1 },
      { type: "dining_table", x: 5, y: 1, w: 2, h: 1 },
      { type: "hanging_pots", x: 2, y: 0.5 },
      { type: "chair", x: 5, y: 2 }, { type: "chair", x: 6, y: 2 },
      { type: "stove", x: 1, y: 3, w: 1, h: 1 },
      { type: "fridge", x: 7, y: 1, w: 1, h: 1 },
    ],
    collision: [
      { x: 1, y: 1, w: 3, h: 1 },
      { x: 5, y: 1, w: 2, h: 1 },
      { x: 1, y: 3, w: 1, h: 1 },
      { x: 7, y: 1, w: 1, h: 1 },
    ],
    npcSpots: [
      { x: 3, y: 3, id: "resident_c1" },
      { x: 6, y: 4, id: "resident_c2" },
    ],
  },
};
