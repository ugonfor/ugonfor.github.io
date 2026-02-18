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
  plaza: { x: 20, y: 25 },
  cafe: { x: 31.5, y: 12.5 },       // 건물 남쪽 문 앞
  office: { x: 36, y: 14.5 },       // 건물 남쪽 문 앞
  park: { x: 10, y: 10 },
  market: { x: 27, y: 33.5 },       // 건물 남쪽 문 앞
  homeA: { x: 9, y: 37.5 },         // 건물 남쪽 문 앞
  homeB: { x: 51, y: 32.5 },        // 건물 남쪽 문 앞
  homeC: { x: 39, y: 42.5 },        // 건물 남쪽 문 앞
  bakery: { x: 25, y: 29.5 },       // 건물 남쪽 문 앞
  florist: { x: 13, y: 16.5 },      // 건물 남쪽 문 앞
  library: { x: 11.5, y: 30.5 },    // 건물 남쪽 문 앞
  ksa_main: { x: 44.5, y: 11.5 },   // 건물 남쪽 문 앞
  ksa_dorm: { x: 44.5, y: 16.5 },   // 건물 남쪽 문 앞
};

// ─── Buildings ───
export const buildings = [
  { id: "cafe", x: 30, y: 10, w: 3, h: 2, z: 2.3, color: "#f7b6b5", roof: "#e68a84", label: "카페" },
  { id: "office", x: 34, y: 12, w: 4, h: 2, z: 2.9, color: "#f8d28d", roof: "#d79956", label: "사무실" },
  { id: "market", x: 25, y: 30, w: 4, h: 3, z: 2.5, color: "#9ecbf0", roof: "#6ea2d4", label: "시장" },
  { id: "ksa_main", x: 42, y: 8, w: 5, h: 3, z: 3.2, color: "#d4c4a8", roof: "#b8a88c", label: "KSA 본관" },
  { id: "ksa_dorm", x: 43, y: 14, w: 3, h: 2, z: 2.4, color: "#c9b896", roof: "#a89878", label: "KSA 기숙사" },
  { id: "bakery", x: 24, y: 27, w: 2, h: 2, z: 2.2, color: "#f4d6a3", roof: "#dab977", label: "빵집" },
  { id: "florist", x: 12, y: 14, w: 2, h: 2, z: 2.1, color: "#ffc9e0", roof: "#e8a1c1", label: "꽃집" },
  { id: "library", x: 10, y: 28, w: 3, h: 2, z: 2.6, color: "#b0c9d4", roof: "#8aa3b8", label: "도서관" },
  { id: "houseA", x: 8, y: 35, w: 2, h: 2, z: 2.0, color: "#e8c9a6", roof: "#c4a073", label: "주택" },
  { id: "houseB", x: 50, y: 30, w: 2, h: 2, z: 2.0, color: "#d4b89a", roof: "#b09572", label: "주택" },
  { id: "houseC", x: 38, y: 40, w: 2, h: 2, z: 2.0, color: "#ceb798", roof: "#a89370", label: "주택" },
];

// ─── Hotspots ───
export const hotspots = [
  { id: "exitGate", x: 50, y: 97, label: "출구" },
  { id: "cafeDoor", x: 31, y: 12, label: "카페 입구" },
  { id: "marketBoard", x: 27, y: 33, label: "시장 게시판" },
  { id: "parkMonument", x: 10, y: 10, label: "공원 기념비" },
  { id: "ksaMainDoor", x: 44.5, y: 11, label: "KSA 본관" },
  { id: "ksaDormDoor", x: 44.5, y: 16, label: "KSA 기숙사" },
  { id: "bakeryDoor", x: 25, y: 29, label: "빵집 입구" },
  { id: "floristDoor", x: 13, y: 16, label: "꽃집 입구" },
  { id: "libraryDoor", x: 11.5, y: 30, label: "도서관 입구" },
  { id: "minigameZone", x: 30, y: 20, label: "🏃 놀이터" },
];

// ─── Props (Decorations) ───
export const props = [
  // 공원 (10,10)
  { type: "fountain", x: 10, y: 10 },
  { type: "bench", x: 8, y: 9 }, { type: "bench", x: 12, y: 9 },
  { type: "bench", x: 8, y: 11.5 }, { type: "bench", x: 12, y: 11.5 },
  { type: "tree", x: 7.2, y: 7.5 }, { type: "tree", x: 13.5, y: 7.8 },
  { type: "tree", x: 7, y: 12.8 }, { type: "tree", x: 14, y: 13 },
  { type: "flower", x: 8.5, y: 8 }, { type: "flower", x: 11.5, y: 8.2 },
  { type: "flower", x: 9, y: 12 }, { type: "flower", x: 11, y: 12.2 },
  { type: "bush", x: 6.5, y: 10 }, { type: "bush", x: 14.5, y: 10.5 },
  // 꽃집 (12,14) 주변
  { type: "flower", x: 11, y: 13.5 }, { type: "flower", x: 11.5, y: 15.5 },
  { type: "flower", x: 14.5, y: 14.2 }, { type: "flower", x: 14, y: 15.8 },
  { type: "flower", x: 13.5, y: 13.2 }, { type: "bush", x: 11.2, y: 16.5 },
  // 카페/사무실
  { type: "tree", x: 28, y: 9 }, { type: "tree", x: 39, y: 11 },
  { type: "bush", x: 33, y: 9.5 }, { type: "bush", x: 37, y: 14.5 },
  { type: "flower", x: 29, y: 12.5 }, { type: "lamp", x: 31, y: 14 },
  // KSA 캠퍼스
  { type: "tree", x: 40, y: 7 }, { type: "tree", x: 48, y: 7.5 },
  { type: "tree", x: 40, y: 17 }, { type: "tree", x: 48, y: 16.5 },
  { type: "bush", x: 41, y: 12 }, { type: "bush", x: 47, y: 12.5 },
  { type: "bench", x: 41, y: 10 }, { type: "bench", x: 46, y: 10 },
  { type: "lamp", x: 44, y: 11.5 }, { type: "lamp", x: 44, y: 16.5 },
  { type: "fence", x: 41, y: 7 }, { type: "fence", x: 42, y: 7 },
  { type: "fence", x: 47, y: 7 }, { type: "fence", x: 48, y: 7 },
  { type: "flower", x: 43, y: 7.5 }, { type: "flower", x: 45, y: 7.5 },
  { type: "signpost", x: 42, y: 18 },
  // 놀이터 (30,20)
  { type: "fence", x: 28, y: 18 }, { type: "fence", x: 29, y: 18 },
  { type: "fence", x: 31, y: 18 }, { type: "fence", x: 32, y: 18 },
  { type: "bench", x: 28, y: 22 }, { type: "bench", x: 32, y: 22 },
  { type: "lamp", x: 28, y: 20 }, { type: "lamp", x: 32, y: 20 },
  // 광장 (20,25)
  { type: "lamp", x: 18, y: 23.5 }, { type: "lamp", x: 22, y: 23.5 },
  { type: "lamp", x: 18, y: 26.5 }, { type: "lamp", x: 22, y: 26.5 },
  { type: "bench", x: 17, y: 24 }, { type: "bench", x: 23, y: 24 },
  { type: "signpost", x: 21, y: 23.5 },
  { type: "bush", x: 17, y: 26 }, { type: "bush", x: 23.5, y: 26 },
  // 빵집/도서관/시장 주변
  { type: "bush", x: 23, y: 26.5 }, { type: "flower", x: 26.5, y: 27.5 },
  { type: "tree", x: 8, y: 27 }, { type: "tree", x: 14, y: 29 },
  { type: "bench", x: 9, y: 30.5 }, { type: "bush", x: 13.5, y: 28 },
  { type: "tree", x: 23, y: 33.5 }, { type: "tree", x: 30, y: 30.5 },
  { type: "lamp", x: 27, y: 34 }, { type: "bush", x: 24, y: 33 },
  // 주택A (8,35)
  { type: "fence", x: 7, y: 37.5 }, { type: "fence", x: 8, y: 37.5 },
  { type: "fence", x: 9, y: 37.5 }, { type: "fence", x: 10, y: 37.5 },
  { type: "flower", x: 7.5, y: 34.5 }, { type: "flower", x: 10.5, y: 34.5 },
  { type: "tree", x: 6, y: 33 }, { type: "bush", x: 11, y: 36 },
  // 주택B (50,30)
  { type: "fence", x: 49, y: 32.5 }, { type: "fence", x: 50, y: 32.5 },
  { type: "fence", x: 51, y: 32.5 }, { type: "fence", x: 52, y: 32.5 },
  { type: "flower", x: 49.5, y: 29.5 }, { type: "flower", x: 52.5, y: 29.5 },
  { type: "tree", x: 53, y: 28 }, { type: "bush", x: 48, y: 31 },
  // 주택C (38,40)
  { type: "fence", x: 37, y: 42.5 }, { type: "fence", x: 38, y: 42.5 },
  { type: "fence", x: 39, y: 42.5 }, { type: "fence", x: 40, y: 42.5 },
  { type: "flower", x: 37.5, y: 39.5 }, { type: "flower", x: 40.5, y: 39.5 },
  { type: "tree", x: 36, y: 38 }, { type: "bush", x: 41, y: 41 },
  // 도로 주변
  { type: "lamp", x: 15, y: 43.5 }, { type: "lamp", x: 30, y: 43.5 },
  { type: "lamp", x: 50, y: 43.5 }, { type: "lamp", x: 45, y: 20 },
  { type: "lamp", x: 45, y: 35 }, { type: "signpost", x: 20, y: 43.5 },
  // 자연 소품
  { type: "tree", x: 18, y: 5 }, { type: "tree", x: 25, y: 4.5 },
  { type: "tree", x: 35, y: 6 }, { type: "tree", x: 32, y: 20 },
  { type: "tree", x: 38, y: 22 }, { type: "tree", x: 15, y: 20 },
  { type: "bush", x: 35, y: 18 }, { type: "bush", x: 28, y: 22 },
  { type: "rock", x: 16, y: 7 }, { type: "rock", x: 7, y: 18 },
  { type: "rock", x: 7.5, y: 22 }, { type: "rock", x: 6.5, y: 30 },
  { type: "tree", x: 7, y: 20 },
  // 확장 영역
  { type: "tree", x: 12, y: 50 }, { type: "tree", x: 25, y: 52 },
  { type: "tree", x: 40, y: 48 }, { type: "tree", x: 55, y: 50 },
  { type: "tree", x: 18, y: 58 }, { type: "tree", x: 35, y: 60 },
  { type: "tree", x: 50, y: 55 }, { type: "tree", x: 60, y: 20 },
  { type: "tree", x: 65, y: 35 }, { type: "tree", x: 70, y: 50 },
  { type: "rock", x: 30, y: 55 }, { type: "rock", x: 45, y: 52 },
  { type: "rock", x: 60, y: 45 },
  { type: "bush", x: 20, y: 55 }, { type: "bush", x: 55, y: 40 },
  { type: "bush", x: 65, y: 25 },
];

// ─── Species Pool ───
export const speciesPool = ["human_a", "human_b", "human_c", "human_d", "human_e", "human_f", "human_g", "human_h", "human_i"];

// ─── Weather Types ───
export const WEATHER_TYPES = ["clear", "clear", "clear", "cloudy", "rain", "rain", "storm", "snow", "fog"];

// ─── Discoveries (Initial Data) ───
export const discoveries = [
  { id: "secret_garden", x: 38, y: 8, radius: 1.8, found: false, title: "비밀 정원", desc: "건물 뒤에 숨겨진 작은 정원을 발견했다.", condition: "always", reward: "gem" },
  { id: "river_message", x: 7, y: 16, radius: 1.5, found: false, title: "강변의 편지", desc: "강가에서 유리병 속 편지를 발견했다.", condition: "always", reward: "letter" },
  { id: "midnight_glow", x: 10, y: 10, radius: 1.5, found: false, title: "자정의 빛", desc: "공원 분수가 자정에 은은하게 빛나고 있다!", condition: "night", reward: "gem" },
  { id: "rain_mushrooms", x: 18, y: 15, radius: 2.0, found: false, title: "비 오는 날의 버섯", desc: "비가 오자 길가에 형형색색 버섯이 자라났다.", condition: "rain", reward: "snack" },
  { id: "hidden_well", x: 35, y: 28, radius: 1.5, found: false, title: "숨겨진 우물", desc: "덤불 사이에서 오래된 우물을 발견했다.", condition: "always", reward: "gem" },
  { id: "sunset_view", x: 55, y: 6, radius: 2.0, found: false, title: "노을 전망대", desc: "언덕 위에서 아름다운 노을을 볼 수 있다.", condition: "evening", reward: "flower_red" },
  { id: "fog_figure", x: 12, y: 38, radius: 2.0, found: false, title: "안개 속 그림자", desc: "안개 속에서 희미한 형체를 발견했다...", condition: "fog", reward: "gem" },
  { id: "market_stash", x: 24, y: 34, radius: 1.5, found: false, title: "시장 뒷골목 비밀", desc: "시장 뒤에서 숨겨진 상자를 발견했다.", condition: "always", reward: "snack" },
  { id: "night_cats", x: 30, y: 38, radius: 2.0, found: false, title: "밤의 고양이들", desc: "밤에만 나타나는 고양이 무리를 발견했다!", condition: "night", reward: "snack" },
  { id: "flower_field", x: 8, y: 22, radius: 2.0, found: false, title: "비밀 꽃밭", desc: "수풀 사이에 숨겨진 꽃밭이 있었다.", condition: "always", reward: "flower_red" },
  { id: "storm_crystal", x: 20, y: 8, radius: 2.0, found: false, title: "폭풍의 수정", desc: "폭풍우 속에서 빛나는 수정을 발견했다!", condition: "storm", reward: "gem" },
  { id: "snow_angel", x: 28, y: 15, radius: 2.0, found: false, title: "눈 위의 천사", desc: "눈이 온 뒤 땅에 신비한 무늬가 생겼다.", condition: "snow", reward: "gem" },
  { id: "dawn_song", x: 22, y: 42, radius: 2.0, found: false, title: "새벽의 노래", desc: "이른 새벽, 어디선가 아름다운 노래가 들린다.", condition: "dawn", reward: "letter" },
  { id: "plaza_dance", x: 20, y: 25, radius: 1.5, found: false, title: "광장의 흔적", desc: "광장 바닥에서 오래된 모자이크 무늬를 발견했다.", condition: "always", reward: "coffee" },
  { id: "lamp_wish", x: 18, y: 23.5, radius: 1.2, found: false, title: "소원의 가로등", desc: "이 가로등에는 작은 소원 종이가 매달려 있다.", condition: "night", reward: "letter" },
  // 확장 영역 발견 장소
  { id: "ksa_rooftop", x: 46, y: 8, radius: 1.5, found: false, title: "KSA 옥상의 비밀", desc: "본관 옥상에서 밤하늘에 빛나는 무언가를 발견했다.", condition: "night", reward: "gem" },
  { id: "south_lake", x: 40, y: 60, radius: 2.5, found: false, title: "남쪽 호수", desc: "숲 사이에 숨겨진 고요한 호수를 발견했다.", condition: "always", reward: "gem" },
  { id: "east_cabin", x: 70, y: 25, radius: 2.0, found: false, title: "동쪽 숲속 오두막", desc: "안개 속에서 오래된 오두막이 보인다...", condition: "fog", reward: "letter" },
  { id: "cat_village", x: 15, y: 55, radius: 2.0, found: false, title: "고양이 마을", desc: "밤이 되자 고양이들이 모여드는 비밀 장소!", condition: "night", reward: "snack" },
  { id: "rainbow_spot", x: 55, y: 50, radius: 2.5, found: false, title: "폭풍 후 무지개", desc: "폭풍이 지나간 뒤, 하늘에 거대한 무지개가 떴다.", condition: "storm", reward: "gem" },
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
  { id: "gi1", type: "flower_red", x: 9, y: 11, pickedAt: 0 },
  { id: "gi2", type: "flower_yellow", x: 11, y: 9, pickedAt: 0 },
  { id: "gi3", type: "coffee", x: 32, y: 11, pickedAt: 0 },
  { id: "gi4", type: "snack", x: 26, y: 32, pickedAt: 0 },
  { id: "gi5", type: "letter", x: 20, y: 26, pickedAt: 0 },
  { id: "gi6", type: "flower_red", x: 35, y: 28, pickedAt: 0 },
  { id: "gi7", type: "coffee", x: 31, y: 13, pickedAt: 0 },
  { id: "gi8", type: "snack", x: 9, y: 35, pickedAt: 0 },
  { id: "gi9", type: "gem", x: 10, y: 10.5, pickedAt: 0 },
  { id: "gi10", type: "letter", x: 36, y: 13, pickedAt: 0 },
  { id: "gi11", type: "flower_yellow", x: 14, y: 15, pickedAt: 0 },
  { id: "gi12", type: "gem", x: 21, y: 25, pickedAt: 0 },
  // 확장 영역
  { id: "gi13", type: "coffee", x: 44, y: 10, pickedAt: 0 },
  { id: "gi14", type: "snack", x: 45, y: 15, pickedAt: 0 },
  { id: "gi15", type: "flower_red", x: 50, y: 31, pickedAt: 0 },
  { id: "gi16", type: "gem", x: 40, y: 42, pickedAt: 0 },
  { id: "gi17", type: "letter", x: 25, y: 50, pickedAt: 0 },
  { id: "gi18", type: "snack", x: 15, y: 45, pickedAt: 0 },
  { id: "gi19", type: "flower_yellow", x: 55, y: 20, pickedAt: 0 },
  { id: "gi20", type: "gem", x: 60, y: 35, pickedAt: 0 },
];

// ─── Item Respawn ───
export const ITEM_RESPAWN_MS = 180_000;

// ─── Shop Inventory (Initial Data) ───
export const shopInventory = {
  flower_red: { price: 3, stock: 5 },
  flower_yellow: { price: 3, stock: 5 },
  coffee: { price: 5, stock: 3 },
  snack: { price: 4, stock: 4 },
  letter: { price: 6, stock: 2 },
  gem: { price: 15, stock: 1 },
};

// ─── Seasons ───
export const seasons = ["봄", "여름", "가을", "겨울"];

// ─── Card Definitions ───
export const cardDefs = {
  card_sunrise: { name: "첫 일출", rarity: "rare", emoji: "🌅", effect: "이동속도 +5%", effectKey: "speed", effectVal: 0.05 },
  card_night: { name: "별이 빛나는 밤", rarity: "rare", emoji: "🌙", effect: "야간 시야 확대", effectKey: "nightVision", effectVal: 1 },
  card_friendship: { name: "우정의 증표", rarity: "epic", emoji: "🤝", effect: "관계도 +10%", effectKey: "relation", effectVal: 0.10 },
  card_explorer: { name: "탐험가의 발자국", rarity: "common", emoji: "👣", effect: "아이템 발견률 증가", effectKey: "itemFind", effectVal: 0.15 },
  card_chef: { name: "요리사의 비밀", rarity: "common", emoji: "🍳", effect: "간식 2배 획득", effectKey: "snackDouble", effectVal: 1 },
  card_gem_hunter: { name: "보석 사냥꾼", rarity: "epic", emoji: "💎", effect: "보석 발견 확률 증가", effectKey: "gemFind", effectVal: 0.20 },
  card_social: { name: "사교계의 달인", rarity: "rare", emoji: "🎭", effect: "호감도 +15%", effectKey: "favor", effectVal: 0.15 },
  card_legend: { name: "전설의 주민", rarity: "legendary", emoji: "⭐", effect: "모든 보상 2배", effectKey: "allDouble", effectVal: 1 },
};
