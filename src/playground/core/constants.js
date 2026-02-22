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
  barista: { age: "20대", gender: "여성", personality: "쾌활하고 커피를 사랑하는 성격" },
  florist_owner: { age: "20대", gender: "여성", personality: "꽃을 사랑하고 낭만적인 성격" },
  chef: { age: "30대", gender: "남성", personality: "열정적이고 음식에 진심인 성격" },
  officer: { age: "30대", gender: "남성", personality: "정의감 있고 책임감 강한 성격" },
  athlete: { age: "20대", gender: "남성", personality: "활발하고 운동을 좋아하는 성격" },
  doctor: { age: "40대", gender: "여성", personality: "따뜻하고 차분한 의사" },
  student_a: { age: "10대", gender: "남성", personality: "호기심 많고 장난기 있는 학생" },
  student_b: { age: "10대", gender: "여성", personality: "성실하고 꿈이 큰 학생" },
  grandpa: { age: "60대", gender: "남성", personality: "느긋하고 마을의 오래된 이야기를 많이 아는 성격" },
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
  // 공원 & 광장
  park: { x: 30, y: 10 },             // 공원 중앙
  plaza: { x: 30, y: 25 },            // 광장 중앙
  infoCenter: { x: 28, y: 25 },       // 안내소 (광장 서쪽)
  questBoard: { x: 32, y: 25 },       // 게시판 (광장 동쪽)
  // 상가 1열 (y=16)
  cafe: { x: 15.5, y: 18.5 },         // (14, 16, h=2)
  bakery: { x: 23, y: 18.5 },         // (22, 16, h=2)
  office: { x: 38, y: 18.5 },         // (36, 16, h=2)
  market: { x: 46, y: 19.5 },         // (44, 16, h=3)
  // 상가 2열 (y=30)
  florist: { x: 15, y: 32.5 },        // (14, 30, h=2)
  library: { x: 23.5, y: 32.5 },      // (22, 30, h=2)
  convenience: { x: 37, y: 32.5 },    // (36, 30, h=2)
  restaurant: { x: 45.5, y: 32.5 },   // (44, 30, h=2)
  // 주택 (y=38)
  homeA: { x: 15, y: 40.5 },          // (14, 38, h=2)
  homeB: { x: 31, y: 40.5 },          // (30, 38, h=2)
  homeC: { x: 47, y: 40.5 },          // (46, 38, h=2)
  // 캠퍼스/기관 (y=48~56)
  korea_univ: { x: 13, y: 52.5 },     // (10, 48, h=4)
  krafton_ai: { x: 26.5, y: 51.5 },   // (24, 48, h=3)
  kaist_ai: { x: 40.5, y: 51.5 },     // (38, 48, h=3)
  ksa_main: { x: 20.5, y: 58.5 },     // (18, 55, h=3)
  ksa_dorm: { x: 35.5, y: 57.5 },     // (34, 55, h=2)
  hospital: { x: 45.5, y: 57.5 },     // (44, 55, h=2)
  police: { x: 11.5, y: 57.5 },       // (10, 55, h=2)
  gym: { x: 50, y: 51.5 },            // (48, 48, h=3)
};

// ─── Buildings ───
export const buildings = [
  // 상가 1열 (y=16)
  { id: "cafe", x: 14, y: 16, w: 3, h: 2, z: 2.3, color: "#f7b6b5", roof: "#e68a84", label: "카페" },
  { id: "bakery", x: 22, y: 16, w: 2, h: 2, z: 2.2, color: "#f4d6a3", roof: "#dab977", label: "빵집" },
  { id: "office", x: 36, y: 16, w: 4, h: 2, z: 2.9, color: "#f8d28d", roof: "#d79956", label: "사무실" },
  { id: "market", x: 44, y: 16, w: 4, h: 3, z: 2.5, color: "#9ecbf0", roof: "#6ea2d4", label: "시장" },
  // 상가 2열 (y=30)
  { id: "florist", x: 14, y: 30, w: 2, h: 2, z: 2.1, color: "#ffc9e0", roof: "#e8a1c1", label: "꽃집" },
  { id: "library", x: 22, y: 30, w: 3, h: 2, z: 2.6, color: "#b0c9d4", roof: "#8aa3b8", label: "도서관" },
  { id: "convenience", x: 36, y: 30, w: 2, h: 2, z: 2.0, color: "#00a651", roof: "#008040", label: "편의점" },
  { id: "restaurant", x: 44, y: 30, w: 3, h: 2, z: 2.2, color: "#e8a060", roof: "#c88040", label: "음식점" },
  // 주택 (y=38)
  { id: "houseA", x: 14, y: 38, w: 2, h: 2, z: 2.0, color: "#e8c9a6", roof: "#c4a073", label: "주택" },
  { id: "houseB", x: 30, y: 38, w: 2, h: 2, z: 2.0, color: "#d4b89a", roof: "#b09572", label: "주택" },
  { id: "houseC", x: 46, y: 38, w: 2, h: 2, z: 2.0, color: "#ceb798", roof: "#a89370", label: "주택" },
  // 캠퍼스/기관 (y=48~56)
  { id: "korea_univ", x: 10, y: 48, w: 6, h: 4, z: 3.0, color: "#8B0029", roof: "#6a0020", label: "고려대학교" },
  { id: "krafton_ai", x: 24, y: 48, w: 5, h: 3, z: 2.6, color: "#1a1a2e", roof: "#0f0f1e", label: "크래프톤 AI" },
  { id: "kaist_ai", x: 38, y: 48, w: 5, h: 3, z: 2.8, color: "#003478", roof: "#002458", label: "KAIST AI대학원" },
  { id: "gym", x: 48, y: 48, w: 4, h: 3, z: 2.8, color: "#d4d4d4", roof: "#b0b0b0", label: "체육관" },
  { id: "ksa_main", x: 18, y: 55, w: 5, h: 3, z: 3.2, color: "#d4c4a8", roof: "#b8a88c", label: "KSA 본관" },
  { id: "ksa_dorm", x: 34, y: 55, w: 3, h: 2, z: 2.4, color: "#c9b896", roof: "#a89878", label: "KSA 기숙사" },
  { id: "hospital", x: 44, y: 55, w: 3, h: 2, z: 2.4, color: "#ffffff", roof: "#d0d0d0", label: "병원" },
  { id: "police", x: 10, y: 55, w: 3, h: 2, z: 2.3, color: "#4a6fa5", roof: "#3a5f95", label: "경찰서" },
];

// ─── Hotspots ───
export const hotspots = [
  { id: "exitGate", x: 30, y: 77, label: "출구" },
  // 상가 1열
  { id: "cafeDoor", x: 15.5, y: 18, label: "카페 입구" },
  { id: "bakeryDoor", x: 23, y: 18, label: "빵집 입구" },
  { id: "officeDoor", x: 38, y: 18, label: "사무실 입구" },
  { id: "marketDoor", x: 46, y: 19, label: "시장 입구" },
  // 상가 2열
  { id: "floristDoor", x: 15, y: 32, label: "꽃집 입구" },
  { id: "libraryDoor", x: 23.5, y: 32, label: "도서관 입구" },
  { id: "convenienceDoor", x: 37, y: 32, label: "편의점" },
  { id: "restaurantDoor", x: 45.5, y: 32, label: "음식점" },
  // 주택
  { id: "houseADoor", x: 15, y: 40, label: "주택" },
  { id: "houseBDoor", x: 31, y: 40, label: "주택" },
  { id: "houseCDoor", x: 47, y: 40, label: "주택" },
  // 캠퍼스/기관
  { id: "koreaUnivDoor", x: 13, y: 52, label: "고려대학교" },
  { id: "kraftonAiDoor", x: 26.5, y: 51, label: "크래프톤 AI" },
  { id: "kaistAiDoor", x: 40.5, y: 51, label: "KAIST AI대학원" },
  { id: "gymDoor", x: 50, y: 51, label: "체육관" },
  { id: "ksaMainDoor", x: 20.5, y: 58, label: "KSA 본관" },
  { id: "ksaDormDoor", x: 35.5, y: 57, label: "KSA 기숙사" },
  { id: "hospitalDoor", x: 45.5, y: 57, label: "병원" },
  { id: "policeDoor", x: 11.5, y: 57, label: "경찰서" },
  // 공원 & 광장
  { id: "parkMonument", x: 30, y: 10, label: "공원 기념비" },
  { id: "minigameZone", x: 30, y: 25, label: "놀이터" },
  { id: "infoCenter", x: 28, y: 25, label: "안내소" },
  { id: "questBoard", x: 32, y: 25, label: "게시판" },
];

// ─── Props (Decorations) ───
export const props = [
  // ═══════════════════════════════════════════════
  // 센트럴 파크 (y=3~13, x=10~50)
  // ═══════════════════════════════════════════════
  // 중앙 분수
  { type: "fountain", x: 30, y: 8 },
  // 공원 벤치 (분수 주변)
  { type: "bench", x: 25, y: 6 }, { type: "bench", x: 35, y: 6 },
  { type: "bench", x: 25, y: 10 }, { type: "bench", x: 35, y: 10 },
  { type: "bench", x: 20, y: 8 }, { type: "bench", x: 40, y: 8 },
  // 공원 나무 — 가장자리에만
  { type: "tree", x: 10, y: 3 }, { type: "tree", x: 12, y: 4 },
  { type: "tree", x: 48, y: 3 }, { type: "tree", x: 50, y: 4 },
  { type: "tree", x: 10, y: 12 }, { type: "tree", x: 50, y: 12 },
  { type: "tree", x: 11, y: 7 }, { type: "tree", x: 49, y: 7 },
  // 공원 꽃밭
  { type: "flower", x: 28, y: 6 }, { type: "flower", x: 32, y: 6 },
  { type: "flower", x: 27, y: 9 }, { type: "flower", x: 33, y: 9 },
  { type: "flower", x: 26, y: 11 }, { type: "flower", x: 34, y: 11 },
  // 공원 가로등 (모서리)
  { type: "lamp", x: 12, y: 5 }, { type: "lamp", x: 48, y: 5 },
  { type: "lamp", x: 12, y: 11 }, { type: "lamp", x: 48, y: 11 },

  // ═══════════════════════════════════════════════
  // 대로 가로등 (x=28, x=32) — 5타일 간격, y=14~75
  // ═══════════════════════════════════════════════
  { type: "lamp", x: 28, y: 14 }, { type: "lamp", x: 32, y: 14 },
  { type: "lamp", x: 28, y: 19 }, { type: "lamp", x: 32, y: 19 },
  { type: "lamp", x: 28, y: 24 }, { type: "lamp", x: 32, y: 24 },
  { type: "lamp", x: 28, y: 29 }, { type: "lamp", x: 32, y: 29 },
  { type: "lamp", x: 28, y: 34 }, { type: "lamp", x: 32, y: 34 },
  { type: "lamp", x: 28, y: 39 }, { type: "lamp", x: 32, y: 39 },
  { type: "lamp", x: 28, y: 49 }, { type: "lamp", x: 32, y: 49 },
  { type: "lamp", x: 28, y: 54 }, { type: "lamp", x: 32, y: 54 },
  { type: "lamp", x: 28, y: 59 }, { type: "lamp", x: 32, y: 59 },
  { type: "lamp", x: 28, y: 64 }, { type: "lamp", x: 32, y: 64 },
  { type: "lamp", x: 28, y: 69 }, { type: "lamp", x: 32, y: 69 },
  { type: "lamp", x: 28, y: 74 }, { type: "lamp", x: 32, y: 74 },

  // ═══════════════════════════════════════════════
  // 상가 뒤 나무 (도로 아닌 곳)
  // ═══════════════════════════════════════════════
  { type: "tree", x: 12, y: 16 }, { type: "tree", x: 12, y: 30 },
  { type: "tree", x: 50, y: 16 }, { type: "tree", x: 50, y: 30 },

  // ═══════════════════════════════════════════════
  // 광장 (x=30, y=22~28) — 안내소 + 게시판 + 놀이터
  // ═══════════════════════════════════════════════
  { type: "clock_tower", x: 30, y: 23 },
  { type: "signpost", x: 28, y: 25 },
  { type: "questboard", x: 32, y: 25 },
  { type: "bench", x: 26, y: 24 }, { type: "bench", x: 34, y: 24 },
  { type: "bench", x: 26, y: 26 }, { type: "bench", x: 34, y: 26 },

  // ═══════════════════════════════════════════════
  // 상가 1열 주변 (카페14,16 / 빵집22,16 / 사무실36,16 / 시장44,16)
  // ═══════════════════════════════════════════════
  { type: "lamp", x: 15.5, y: 19 }, { type: "lamp", x: 23, y: 19 },
  { type: "lamp", x: 38, y: 19 }, { type: "lamp", x: 46, y: 20 },
  { type: "flower", x: 13, y: 16 }, { type: "flower", x: 18, y: 16 },
  { type: "flower", x: 21, y: 19 }, { type: "flower", x: 25, y: 17 },
  { type: "flower", x: 35, y: 16 }, { type: "flower", x: 43, y: 17 },
  { type: "bush", x: 20, y: 17 }, { type: "bush", x: 34, y: 17 },

  // ═══════════════════════════════════════════════
  // 상가 2열 주변 (꽃집14,30 / 도서관22,30 / 편의점36,30 / 음식점44,30)
  // ═══════════════════════════════════════════════
  { type: "lamp", x: 15, y: 33 }, { type: "lamp", x: 23.5, y: 33 },
  { type: "lamp", x: 37, y: 33 }, { type: "lamp", x: 45.5, y: 33 },
  { type: "flower", x: 13, y: 30 }, { type: "flower", x: 17, y: 31 },
  { type: "flower", x: 21, y: 30 }, { type: "flower", x: 26, y: 31 },
  { type: "flower", x: 35, y: 30 }, { type: "flower", x: 39, y: 31 },
  { type: "flower", x: 43, y: 30 }, { type: "flower", x: 48, y: 31 },
  { type: "bush", x: 19, y: 32 }, { type: "bush", x: 33, y: 32 },

  // ═══════════════════════════════════════════════
  // 주택A (14,38) 주변
  // ═══════════════════════════════════════════════
  { type: "fence", x: 13, y: 40.5 }, { type: "fence", x: 14, y: 40.5 },
  { type: "fence", x: 15, y: 40.5 }, { type: "fence", x: 16, y: 40.5 },
  { type: "flower", x: 13.5, y: 37.5 }, { type: "flower", x: 16.5, y: 37.5 },
  { type: "bush", x: 17, y: 39 },

  // ═══════════════════════════════════════════════
  // 주택B (30,38) 주변
  // ═══════════════════════════════════════════════
  { type: "fence", x: 29, y: 40.5 }, { type: "fence", x: 30, y: 40.5 },
  { type: "fence", x: 31, y: 40.5 }, { type: "fence", x: 32, y: 40.5 },
  { type: "flower", x: 29.5, y: 37.5 }, { type: "flower", x: 32.5, y: 37.5 },
  { type: "bush", x: 33, y: 39 },

  // ═══════════════════════════════════════════════
  // 주택C (46,38) 주변
  // ═══════════════════════════════════════════════
  { type: "fence", x: 45, y: 40.5 }, { type: "fence", x: 46, y: 40.5 },
  { type: "fence", x: 47, y: 40.5 }, { type: "fence", x: 48, y: 40.5 },
  { type: "flower", x: 45.5, y: 37.5 }, { type: "flower", x: 48.5, y: 37.5 },
  { type: "bush", x: 49, y: 39 },

  // ═══════════════════════════════════════════════
  // 고려대학교 (10,48) 주변
  // ═══════════════════════════════════════════════
  { type: "tree", x: 8, y: 47 }, { type: "tree", x: 17, y: 47 },
  { type: "tree", x: 8, y: 53 }, { type: "tree", x: 17, y: 53 },
  { type: "bench", x: 9, y: 53 }, { type: "bench", x: 16, y: 50 },
  { type: "lamp", x: 13, y: 53 },
  { type: "flower", x: 9, y: 48 }, { type: "flower", x: 16, y: 48 },

  // ═══════════════════════════════════════════════
  // 크래프톤 AI (24,48) 주변
  // ═══════════════════════════════════════════════
  { type: "lamp", x: 26.5, y: 52 },
  { type: "bush", x: 23, y: 48 }, { type: "bush", x: 30, y: 48 },

  // ═══════════════════════════════════════════════
  // KAIST AI (38,48) 주변
  // ═══════════════════════════════════════════════
  { type: "tree", x: 37, y: 47 }, { type: "tree", x: 44, y: 47 },
  { type: "bench", x: 38, y: 52 }, { type: "bench", x: 42, y: 52 },
  { type: "lamp", x: 40.5, y: 52 },

  // ═══════════════════════════════════════════════
  // 체육관 (48,48) 주변
  // ═══════════════════════════════════════════════
  { type: "bench", x: 49, y: 52 }, { type: "bench", x: 51, y: 52 },
  { type: "lamp", x: 50, y: 52 },

  // ═══════════════════════════════════════════════
  // KSA 본관 (18,55) & 기숙사 (34,55) 주변
  // ═══════════════════════════════════════════════
  { type: "bench", x: 19, y: 59 }, { type: "bench", x: 22, y: 59 },
  { type: "lamp", x: 20.5, y: 59 }, { type: "lamp", x: 35.5, y: 58 },
  { type: "flower", x: 17, y: 55 }, { type: "flower", x: 23, y: 55 },
  { type: "signpost", x: 18, y: 59 },

  // ═══════════════════════════════════════════════
  // 병원 (44,55) 주변
  // ═══════════════════════════════════════════════
  { type: "lamp", x: 45.5, y: 58 },
  { type: "signpost", x: 43, y: 56 },
  { type: "bench", x: 48, y: 56 },

  // ═══════════════════════════════════════════════
  // 경찰서 (10,55) 주변
  // ═══════════════════════════════════════════════
  { type: "lamp", x: 11.5, y: 58 },
  { type: "signpost", x: 9, y: 56 },
  { type: "bench", x: 14, y: 56 },

  // ═══════════════════════════════════════════════
  // 도로 교차점 가로등 & 이정표
  // ═══════════════════════════════════════════════
  { type: "lamp", x: 15, y: 18 }, { type: "lamp", x: 45, y: 18 },
  { type: "lamp", x: 15, y: 32 }, { type: "lamp", x: 45, y: 32 },
  { type: "lamp", x: 15, y: 40 }, { type: "lamp", x: 45, y: 40 },
  { type: "signpost", x: 30, y: 75 },
  { type: "signpost", x: 8, y: 18 }, { type: "signpost", x: 8, y: 40 },

  // ═══════════════════════════════════════════════
  // 외곽 자연 소품
  // ═══════════════════════════════════════════════
  { type: "tree", x: 5, y: 4 }, { type: "tree", x: 7, y: 10 },
  { type: "tree", x: 5, y: 20 }, { type: "tree", x: 5, y: 35 },
  { type: "tree", x: 57, y: 4 }, { type: "tree", x: 57, y: 20 },
  { type: "tree", x: 57, y: 35 },
  { type: "rock", x: 6, y: 25 }, { type: "rock", x: 6, y: 42 },
  { type: "rock", x: 56, y: 28 }, { type: "rock", x: 56, y: 42 },
  { type: "bush", x: 7, y: 28 }, { type: "bush", x: 55, y: 22 },

  // ═══════════════════════════════════════════════
  // 남쪽 숲 (y=60~75) — 탐험 구간
  // ═══════════════════════════════════════════════
  { type: "tree", x: 8, y: 62 }, { type: "tree", x: 14, y: 63 },
  { type: "tree", x: 20, y: 61 }, { type: "tree", x: 38, y: 62 },
  { type: "tree", x: 44, y: 63 }, { type: "tree", x: 52, y: 61 },
  { type: "tree", x: 10, y: 66 }, { type: "tree", x: 18, y: 67 },
  { type: "tree", x: 24, y: 65 }, { type: "tree", x: 36, y: 66 },
  { type: "tree", x: 42, y: 68 }, { type: "tree", x: 50, y: 66 },
  { type: "tree", x: 7, y: 70 }, { type: "tree", x: 15, y: 72 },
  { type: "tree", x: 22, y: 71 }, { type: "tree", x: 38, y: 72 },
  { type: "tree", x: 46, y: 70 }, { type: "tree", x: 53, y: 71 },
  { type: "rock", x: 12, y: 64 }, { type: "rock", x: 48, y: 65 },
  { type: "rock", x: 25, y: 69 }, { type: "rock", x: 40, y: 74 },
  { type: "bush", x: 16, y: 65 }, { type: "bush", x: 34, y: 64 },
  { type: "bush", x: 50, y: 69 }, { type: "bush", x: 8, y: 73 },
  { type: "flower", x: 19, y: 64 }, { type: "flower", x: 33, y: 67 },
  { type: "flower", x: 45, y: 71 }, { type: "flower", x: 11, y: 69 },

  // ═══════════════════════════════════════════════
  // Grass tufts (작은 장식)
  // ═══════════════════════════════════════════════
  // 공원 내부
  { type: "grass_tuft", x: 16, y: 7 }, { type: "grass_tuft", x: 44, y: 9 },
  { type: "grass_tuft", x: 22, y: 9 }, { type: "grass_tuft", x: 38, y: 7 },
  { type: "grass_tuft", x: 28, y: 5 }, { type: "grass_tuft", x: 32, y: 10 },
  // 대로 양쪽
  { type: "grass_tuft", x: 27, y: 27 }, { type: "grass_tuft", x: 33, y: 28 },
  { type: "grass_tuft", x: 27, y: 37 }, { type: "grass_tuft", x: 33, y: 37 },
  { type: "grass_tuft", x: 27, y: 47 }, { type: "grass_tuft", x: 33, y: 47 },
  // 건물 근처
  { type: "grass_tuft", x: 13, y: 17 }, { type: "grass_tuft", x: 25, y: 17 },
  { type: "grass_tuft", x: 35, y: 17 }, { type: "grass_tuft", x: 49, y: 17 },
  // 주택가
  { type: "grass_tuft", x: 13, y: 39 }, { type: "grass_tuft", x: 17, y: 38 },
  { type: "grass_tuft", x: 29, y: 39 }, { type: "grass_tuft", x: 33, y: 38 },
  { type: "grass_tuft", x: 45, y: 39 }, { type: "grass_tuft", x: 49, y: 38 },
  // 외곽
  { type: "grass_tuft", x: 8, y: 15 }, { type: "grass_tuft", x: 54, y: 15 },
  { type: "grass_tuft", x: 8, y: 36 }, { type: "grass_tuft", x: 54, y: 36 },
  // 남쪽 숲
  { type: "grass_tuft", x: 13, y: 68 }, { type: "grass_tuft", x: 28, y: 70 },
  { type: "grass_tuft", x: 43, y: 67 }, { type: "grass_tuft", x: 55, y: 73 },
];

// ─── Species Pool ───
export const speciesPool = ["human_a", "human_b", "human_c", "human_d", "human_e", "human_f", "human_g", "human_h", "human_i"];

// ─── Weather Types ───
export const WEATHER_TYPES = ["clear", "clear", "clear", "cloudy", "rain", "rain", "storm", "snow", "fog"];

// ─── Discoveries (Initial Data) ───
export const discoveries = [
  // 공원 구역 (y=3~13)
  { id: "secret_garden", x: 12, y: 6, radius: 1.8, found: false, title: "비밀 정원", desc: "공원 구석에 숨겨진 작은 정원을 발견했다.", condition: "always", reward: "gem" },
  { id: "midnight_glow", x: 30, y: 8, radius: 1.5, found: false, title: "자정의 빛", desc: "공원 분수가 자정에 은은하게 빛나고 있다!", condition: "night", reward: "gem" },
  { id: "rain_mushrooms", x: 22, y: 11, radius: 2.0, found: false, title: "비 오는 날의 버섯", desc: "비가 오자 공원 남쪽에 형형색색 버섯이 자라났다.", condition: "rain", reward: "snack" },
  { id: "storm_crystal", x: 18, y: 5, radius: 2.0, found: false, title: "폭풍의 수정", desc: "폭풍우 속 공원에서 빛나는 수정을 발견했다!", condition: "storm", reward: "gem" },
  { id: "snow_angel", x: 30, y: 11, radius: 2.0, found: false, title: "눈 위의 천사", desc: "눈이 온 뒤 공원에 신비한 무늬가 생겼다.", condition: "snow", reward: "gem" },
  { id: "sunset_view", x: 48, y: 5, radius: 2.0, found: false, title: "노을 전망대", desc: "공원 동쪽에서 아름다운 노을을 볼 수 있다.", condition: "evening", reward: "flower_red" },
  // 상가/광장 구역 (y=14~35)
  { id: "market_stash", x: 49, y: 17, radius: 1.5, found: false, title: "시장 뒷골목 비밀", desc: "시장 뒤에서 숨겨진 상자를 발견했다.", condition: "always", reward: "snack" },
  { id: "plaza_dance", x: 30, y: 25, radius: 1.5, found: false, title: "광장의 흔적", desc: "광장 바닥에서 오래된 모자이크 무늬를 발견했다.", condition: "always", reward: "coffee" },
  { id: "lamp_wish", x: 28, y: 25, radius: 1.2, found: false, title: "소원의 가로등", desc: "이 가로등에는 작은 소원 종이가 매달려 있다.", condition: "night", reward: "letter" },
  { id: "flower_field", x: 8, y: 31, radius: 2.0, found: false, title: "비밀 꽃밭", desc: "수풀 사이에 숨겨진 꽃밭이 있었다.", condition: "always", reward: "flower_red" },
  // 주택/주거 구역 (y=38~42)
  { id: "night_cats", x: 40, y: 39, radius: 2.0, found: false, title: "밤의 고양이들", desc: "밤에만 나타나는 고양이 무리를 발견했다!", condition: "night", reward: "snack" },
  // 강 구역 (y=44~46)
  { id: "river_message", x: 10, y: 45, radius: 1.5, found: false, title: "강변의 편지", desc: "강 근처에서 유리병 속 편지를 발견했다.", condition: "always", reward: "letter" },
  { id: "hidden_well", x: 50, y: 45, radius: 1.5, found: false, title: "숨겨진 우물", desc: "강 동쪽에서 오래된 우물을 발견했다.", condition: "always", reward: "gem" },
  // 캠퍼스 구역 (y=48~58)
  { id: "ksa_rooftop", x: 20, y: 56, radius: 1.5, found: false, title: "KSA 옥상의 비밀", desc: "본관 옥상에서 밤하늘에 빛나는 무언가를 발견했다.", condition: "night", reward: "gem" },
  { id: "cat_village", x: 8, y: 53, radius: 2.0, found: false, title: "고양이 마을", desc: "밤이 되자 고양이들이 모여드는 비밀 장소!", condition: "night", reward: "snack" },
  // 남쪽 숲 구역 (y=60~75)
  { id: "south_lake", x: 35, y: 68, radius: 2.5, found: false, title: "남쪽 호수", desc: "남쪽 숲 사이에 숨겨진 고요한 호수를 발견했다.", condition: "always", reward: "gem" },
  { id: "fog_figure", x: 10, y: 67, radius: 2.0, found: false, title: "안개 속 그림자", desc: "안개 속에서 희미한 형체를 발견했다...", condition: "fog", reward: "gem" },
  { id: "east_cabin", x: 52, y: 65, radius: 2.0, found: false, title: "숲속 오두막", desc: "안개 속에서 오래된 오두막이 보인다...", condition: "fog", reward: "letter" },
  { id: "dawn_song", x: 30, y: 70, radius: 2.0, found: false, title: "새벽의 노래", desc: "이른 새벽, 숲 속에서 아름다운 노래가 들린다.", condition: "dawn", reward: "letter" },
  { id: "rainbow_spot", x: 45, y: 73, radius: 2.5, found: false, title: "폭풍 후 무지개", desc: "폭풍이 지나간 뒤, 하늘에 거대한 무지개가 떴다.", condition: "storm", reward: "gem" },
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
  // 공원 (y=3~13)
  { id: "gi1", type: "flower_red", x: 25, y: 7, pickedAt: 0 },        // 공원 서쪽
  { id: "gi2", type: "flower_yellow", x: 35, y: 9, pickedAt: 0 },     // 공원 동쪽
  { id: "gi9", type: "gem", x: 30, y: 8.5, pickedAt: 0 },             // 공원 분수 근처
  // 상가 1열 (y=16~19)
  { id: "gi3", type: "coffee", x: 16, y: 19, pickedAt: 0 },           // 카페 근처
  { id: "gi7", type: "coffee", x: 15, y: 17, pickedAt: 0 },           // 카페 문 앞
  { id: "gi10", type: "letter", x: 38, y: 19, pickedAt: 0 },          // 사무실 근처
  { id: "gi4", type: "snack", x: 46, y: 20, pickedAt: 0 },            // 시장 근처
  // 광장 (y=22~28)
  { id: "gi5", type: "letter", x: 30, y: 26, pickedAt: 0 },           // 광장
  { id: "gi12", type: "gem", x: 30, y: 24, pickedAt: 0 },             // 광장
  // 상가 2열 (y=30~33)
  { id: "gi11", type: "flower_yellow", x: 15, y: 33, pickedAt: 0 },   // 꽃집 근처
  { id: "gi19", type: "flower_yellow", x: 46, y: 33, pickedAt: 0 },   // 음식점 근처
  // 주택 (y=38~42)
  { id: "gi8", type: "snack", x: 15, y: 41, pickedAt: 0 },            // 주택A 근처
  { id: "gi15", type: "flower_red", x: 31, y: 41, pickedAt: 0 },      // 주택B 근처
  { id: "gi16", type: "gem", x: 47, y: 41, pickedAt: 0 },             // 주택C 근처
  // 강 근처 (y=44~46)
  { id: "gi6", type: "flower_red", x: 10, y: 43, pickedAt: 0 },       // 강 서쪽
  // 캠퍼스 (y=48~58)
  { id: "gi18", type: "snack", x: 13, y: 53, pickedAt: 0 },           // 고려대 근처
  { id: "gi13", type: "coffee", x: 20, y: 59, pickedAt: 0 },          // KSA 본관 근처
  { id: "gi14", type: "snack", x: 36, y: 58, pickedAt: 0 },           // KSA 기숙사 근처
  // 남쪽 숲 (y=60~75)
  { id: "gi17", type: "letter", x: 30, y: 65, pickedAt: 0 },          // 숲 중앙
  { id: "gi20", type: "gem", x: 15, y: 70, pickedAt: 0 },             // 숲 서쪽
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
      // 카운터 & 장비
      { type: "counter", x: 3, y: 1, w: 4, h: 1 },
      { type: "espresso_machine", x: 3.5, y: 0.5 },
      { type: "menu_board", x: 8, y: 0.5, w: 2, h: 1 },
      // 테이블 5개
      { type: "table_round", x: 2, y: 3 },
      { type: "table_round", x: 5, y: 3 },
      { type: "table_round", x: 8, y: 3 },
      { type: "table_round", x: 3, y: 5.5 },
      { type: "table_round", x: 7, y: 5.5 },
      // 의자
      { type: "chair", x: 1.5, y: 3 }, { type: "chair", x: 2.5, y: 3 },
      { type: "chair", x: 4.5, y: 3 }, { type: "chair", x: 5.5, y: 3 },
      { type: "chair", x: 7.5, y: 3 }, { type: "chair", x: 8.5, y: 3 },
      { type: "chair", x: 2.5, y: 5.5 }, { type: "chair", x: 3.5, y: 5.5 },
      { type: "chair", x: 6.5, y: 5.5 }, { type: "chair", x: 7.5, y: 5.5 },
      // 창가 좌석
      { type: "window_seat", x: 0.5, y: 4, w: 1, h: 2 },
      // 장식
      { type: "hanging_plant", x: 1, y: 1 },
      { type: "hanging_plant", x: 9, y: 1 },
      { type: "hanging_plant", x: 5, y: 0.5 },
      { type: "plant_pot", x: 9, y: 6 },
      { type: "painting", x: 0.5, y: 1.5 },
    ],
    collision: [
      { x: 3, y: 1, w: 4, h: 1 },
      { x: 8, y: 0.5, w: 2, h: 1 },
      { x: 1.5, y: 2.5, w: 2, h: 1 },
      { x: 4.5, y: 2.5, w: 2, h: 1 },
      { x: 7.5, y: 2.5, w: 2, h: 1 },
      { x: 2.5, y: 5, w: 2, h: 1 },
      { x: 6.5, y: 5, w: 2, h: 1 },
      { x: 0.5, y: 4, w: 1, h: 2 },
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
      // 책상 5개
      { type: "desk", x: 2, y: 2, w: 2, h: 1 },
      { type: "desk", x: 5, y: 2, w: 2, h: 1 },
      { type: "desk", x: 8, y: 2, w: 2, h: 1 },
      { type: "desk", x: 3, y: 5, w: 2, h: 1 },
      { type: "desk", x: 7, y: 5, w: 2, h: 1 },
      // 의자
      { type: "chair", x: 3, y: 3 }, { type: "chair", x: 6, y: 3 },
      { type: "chair", x: 9, y: 3 },
      { type: "chair", x: 4, y: 6 }, { type: "chair", x: 8, y: 6 },
      // 장비 & 가구
      { type: "whiteboard", x: 1, y: 1, w: 1, h: 2 },
      { type: "water_cooler", x: 11, y: 1 },
      { type: "filing_cabinet", x: 11, y: 3, w: 1, h: 2 },
      { type: "printer", x: 11, y: 6 },
      { type: "clock", x: 6, y: 0.5 },
      { type: "coat_rack", x: 1, y: 6 },
      // 장식
      { type: "plant_pot", x: 1, y: 4 },
      { type: "plant_pot", x: 10, y: 7 },
    ],
    collision: [
      { x: 2, y: 2, w: 2, h: 1 },
      { x: 5, y: 2, w: 2, h: 1 },
      { x: 8, y: 2, w: 2, h: 1 },
      { x: 3, y: 5, w: 2, h: 1 },
      { x: 7, y: 5, w: 2, h: 1 },
      { x: 1, y: 1, w: 1, h: 2 },
      { x: 11, y: 1, w: 1, h: 1 },
      { x: 11, y: 3, w: 1, h: 2 },
      { x: 11, y: 6, w: 1, h: 1 },
    ],
    npcSpots: [
      { x: 3, y: 3, id: "worker_1" },
      { x: 9, y: 3, id: "worker_2" },
      { x: 4, y: 6, id: "worker_3" },
    ],
  },

  market: {
    width: 12, height: 10,
    floorColor: "#d4c8b0", wallColor: "#e8dcc8",
    spawnPoint: { x: 6, y: 9 },
    exitPoint: { x: 6, y: 9.5 },
    furniture: [
      // 진열대
      { type: "shelf", x: 2, y: 2, w: 3, h: 1 },
      { type: "shelf", x: 2, y: 4, w: 3, h: 1 },
      { type: "shelf", x: 2, y: 6, w: 3, h: 1 },
      { type: "shelf", x: 7, y: 2, w: 3, h: 1 },
      { type: "shelf", x: 7, y: 4, w: 3, h: 1 },
      { type: "shelf", x: 7, y: 6, w: 3, h: 1 },
      // 계산대 & 간판
      { type: "checkout_counter", x: 5, y: 8, w: 2, h: 1 },
      { type: "sign_board", x: 5.5, y: 0.5, w: 2, h: 1 },
      // 바구니 진열대
      { type: "basket_display", x: 1, y: 1 },
      { type: "basket_display", x: 11, y: 1 },
      // 냉동 코너 & 저울
      { type: "freezer", x: 11, y: 4, w: 1, h: 2 },
      { type: "scale", x: 1, y: 8 },
    ],
    collision: [
      { x: 2, y: 2, w: 3, h: 1 },
      { x: 2, y: 4, w: 3, h: 1 },
      { x: 2, y: 6, w: 3, h: 1 },
      { x: 7, y: 2, w: 3, h: 1 },
      { x: 7, y: 4, w: 3, h: 1 },
      { x: 7, y: 6, w: 3, h: 1 },
      { x: 5, y: 8, w: 2, h: 1 },
      { x: 5.5, y: 0.5, w: 2, h: 1 },
      { x: 11, y: 4, w: 1, h: 2 },
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
      // 교단
      { type: "podium", x: 7, y: 1 },
      { type: "blackboard", x: 4, y: 0.5, w: 6, h: 1 },
      { type: "projector", x: 7, y: 0.3 },
      // 학생 책상 3x4 배치
      { type: "student_desk", x: 3, y: 3 }, { type: "student_desk", x: 5, y: 3 },
      { type: "student_desk", x: 7, y: 3 }, { type: "student_desk", x: 9, y: 3 },
      { type: "student_desk", x: 3, y: 5 }, { type: "student_desk", x: 5, y: 5 },
      { type: "student_desk", x: 7, y: 5 }, { type: "student_desk", x: 9, y: 5 },
      { type: "student_desk", x: 3, y: 7 }, { type: "student_desk", x: 5, y: 7 },
      { type: "student_desk", x: 7, y: 7 }, { type: "student_desk", x: 9, y: 7 },
      // 벽면 가구
      { type: "trophy_case", x: 1, y: 1, w: 1, h: 2 },
      { type: "notice_board", x: 13, y: 1, w: 1, h: 2 },
      { type: "lab_equipment", x: 12, y: 5 },
      { type: "lab_equipment", x: 12, y: 7 },
      { type: "clock", x: 7, y: 0.3 },
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
      { x: 1, y: 1, w: 1, h: 2 },
      { x: 13, y: 1, w: 1, h: 2 },
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
      // 침대
      { type: "bunk_bed", x: 1, y: 1, w: 2, h: 3 },
      { type: "bunk_bed", x: 1, y: 5, w: 2, h: 3 },
      // 공용 테이블
      { type: "shared_table", x: 5, y: 3, w: 2, h: 2 },
      { type: "chair", x: 4.5, y: 4 }, { type: "chair", x: 7, y: 4 },
      // 편의시설
      { type: "vending_machine", x: 9, y: 1, w: 1, h: 1 },
      { type: "mini_fridge", x: 9, y: 3 },
      { type: "shoe_rack", x: 4, y: 7, w: 2, h: 0.8 },
      // 학습 공간
      { type: "study_lamp", x: 4, y: 1 },
      { type: "study_lamp", x: 8, y: 1 },
      { type: "bookshelf", x: 8, y: 5, w: 1, h: 2 },
      // 장식
      { type: "poster", x: 3.5, y: 0.5 },
    ],
    collision: [
      { x: 1, y: 1, w: 2, h: 3 },
      { x: 1, y: 5, w: 2, h: 3 },
      { x: 5, y: 3, w: 2, h: 2 },
      { x: 9, y: 1, w: 1, h: 1 },
      { x: 9, y: 3, w: 1, h: 1 },
      { x: 8, y: 5, w: 1, h: 2 },
      { x: 4, y: 7, w: 2, h: 0.8 },
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
      // 진열 & 조리
      { type: "display_case", x: 2, y: 1, w: 4, h: 1 },
      { type: "cake_display", x: 1, y: 1, w: 1, h: 1 },
      { type: "oven", x: 7, y: 1, w: 1, h: 2 },
      { type: "mixer", x: 7, y: 3.5 },
      // 작업대
      { type: "work_table", x: 2, y: 4, w: 3, h: 1 },
      { type: "stool", x: 2, y: 5 }, { type: "stool", x: 4, y: 5 },
      // 빵 선반
      { type: "bread_rack", x: 0.5, y: 3, w: 1, h: 2 },
      { type: "bread_rack", x: 0.5, y: 5.5, w: 1, h: 2 },
      // 재료
      { type: "flour_sack", x: 7, y: 5 },
      { type: "flour_sack", x: 7, y: 6 },
      // 장식
      { type: "rolling_pin_rack", x: 6, y: 4 },
      { type: "apron_hook", x: 6, y: 0.5 },
    ],
    collision: [
      { x: 2, y: 1, w: 4, h: 1 },
      { x: 1, y: 1, w: 1, h: 1 },
      { x: 7, y: 1, w: 1, h: 2 },
      { x: 7, y: 5, w: 1, h: 2 },
      { x: 2, y: 4, w: 3, h: 1 },
      { x: 0.5, y: 3, w: 1, h: 2 },
      { x: 0.5, y: 5.5, w: 1, h: 2 },
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
      // 꽃 진열
      { type: "flower_display", x: 1, y: 1, w: 2, h: 1 },
      { type: "flower_display", x: 4, y: 1, w: 2, h: 1 },
      { type: "flower_display", x: 1, y: 3, w: 2, h: 1 },
      { type: "seed_display", x: 4, y: 3, w: 2, h: 1 },
      // 작업대 & 장비
      { type: "workbench", x: 5, y: 5, w: 2, h: 1 },
      { type: "fridge", x: 7, y: 1, w: 1, h: 2 },
      { type: "watering_can", x: 7, y: 4 },
      { type: "ribbon_rack", x: 7, y: 5 },
      // 장식
      { type: "hanging_basket", x: 2, y: 0.5 },
      { type: "hanging_basket", x: 5, y: 0.5 },
      { type: "plant_pot", x: 1, y: 6 },
      { type: "plant_pot", x: 7, y: 6 },
      { type: "plant_pot", x: 4, y: 6 },
    ],
    collision: [
      { x: 1, y: 1, w: 2, h: 1 },
      { x: 4, y: 1, w: 2, h: 1 },
      { x: 1, y: 3, w: 2, h: 1 },
      { x: 4, y: 3, w: 2, h: 1 },
      { x: 5, y: 5, w: 2, h: 1 },
      { x: 7, y: 1, w: 1, h: 2 },
    ],
    npcSpots: [
      { x: 6, y: 6, id: "florist_owner" },
      { x: 3, y: 5, id: "florist_customer" },
    ],
  },

  library: {
    width: 10, height: 8,
    floorColor: "#b09878", wallColor: "#d4c4b0",
    spawnPoint: { x: 5, y: 7 },
    exitPoint: { x: 5, y: 7.5 },
    furniture: [
      // 책장 6개
      { type: "bookshelf", x: 1, y: 1, w: 1, h: 3 },
      { type: "bookshelf", x: 2.5, y: 1, w: 1, h: 3 },
      { type: "bookshelf", x: 4, y: 1, w: 1, h: 3 },
      { type: "bookshelf", x: 6, y: 1, w: 1, h: 3 },
      { type: "bookshelf", x: 7.5, y: 1, w: 1, h: 3 },
      { type: "bookshelf", x: 9, y: 1, w: 1, h: 3 },
      // 열람실
      { type: "reading_table", x: 2, y: 5, w: 2, h: 1 },
      { type: "reading_table", x: 6, y: 5, w: 2, h: 1 },
      { type: "study_carrel", x: 1, y: 5 },
      { type: "study_carrel", x: 9, y: 5 },
      // 의자
      { type: "chair", x: 2, y: 6 }, { type: "chair", x: 3, y: 6 },
      { type: "chair", x: 6, y: 6 }, { type: "chair", x: 7, y: 6 },
      // 장식
      { type: "globe", x: 5, y: 4 },
      { type: "newspaper_rack", x: 1, y: 7, w: 1, h: 1 },
      { type: "ladder", x: 5, y: 2 },
    ],
    collision: [
      { x: 1, y: 1, w: 1, h: 3 },
      { x: 2.5, y: 1, w: 1, h: 3 },
      { x: 4, y: 1, w: 1, h: 3 },
      { x: 6, y: 1, w: 1, h: 3 },
      { x: 7.5, y: 1, w: 1, h: 3 },
      { x: 9, y: 1, w: 1, h: 3 },
      { x: 2, y: 5, w: 2, h: 1 },
      { x: 6, y: 5, w: 2, h: 1 },
      { x: 1, y: 7, w: 1, h: 1 },
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
      // 아늑한 전통 스타일
      { type: "bed", x: 1, y: 1, w: 2, h: 2 },
      { type: "fireplace", x: 6, y: 1, w: 2, h: 1 },
      { type: "dining_table", x: 4, y: 1, w: 2, h: 1 },
      { type: "floor_cushion", x: 4, y: 2 }, { type: "floor_cushion", x: 5, y: 2 },
      { type: "rug", x: 3, y: 3, w: 3, h: 1 },
      // 벽면
      { type: "bookshelf", x: 7, y: 3, w: 1, h: 2 },
      { type: "painting", x: 3, y: 0.5 },
      { type: "clock", x: 6, y: 0.5 },
      // 장식
      { type: "plant_pot", x: 1, y: 4 },
      { type: "hanging_pots", x: 2, y: 0.5 },
    ],
    collision: [
      { x: 1, y: 1, w: 2, h: 2 },
      { x: 6, y: 1, w: 2, h: 1 },
      { x: 4, y: 1, w: 2, h: 1 },
      { x: 7, y: 3, w: 1, h: 2 },
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
      // 모던 테크 스타일
      { type: "desk_with_monitor", x: 1, y: 1, w: 2, h: 1 },
      { type: "desk_with_monitor", x: 4, y: 1, w: 2, h: 1 },
      { type: "gaming_chair", x: 2, y: 2 },
      { type: "gaming_chair", x: 5, y: 2 },
      // 거실
      { type: "sofa", x: 1, y: 4, w: 2, h: 1 },
      { type: "coffee_table", x: 3, y: 4, w: 1, h: 1 },
      { type: "rug", x: 1, y: 3, w: 4, h: 1 },
      // 장비 & 장식
      { type: "bookshelf", x: 7, y: 1, w: 1, h: 2 },
      { type: "led_strip", x: 0.5, y: 0.5, w: 7, h: 0.2 },
      { type: "plant_pot", x: 7, y: 4 },
      { type: "poster", x: 6.5, y: 0.5 },
    ],
    collision: [
      { x: 1, y: 1, w: 2, h: 1 },
      { x: 4, y: 1, w: 2, h: 1 },
      { x: 7, y: 1, w: 1, h: 2 },
      { x: 1, y: 4, w: 2, h: 1 },
      { x: 3, y: 4, w: 1, h: 1 },
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
      // 따뜻한 주방 중심 스타일
      { type: "kitchen_island", x: 3, y: 2, w: 2, h: 1 },
      { type: "kitchen_counter", x: 1, y: 1, w: 3, h: 1 },
      { type: "stove", x: 1, y: 3, w: 1, h: 1 },
      { type: "fridge", x: 7, y: 1, w: 1, h: 1 },
      // 식탁
      { type: "dining_table", x: 5, y: 1, w: 2, h: 1 },
      { type: "chair", x: 5, y: 2 }, { type: "chair", x: 6, y: 2 },
      // 장식
      { type: "spice_rack", x: 4, y: 0.5, w: 1, h: 1 },
      { type: "herb_garden", x: 7, y: 3 },
      { type: "hanging_pots", x: 2, y: 0.5 },
      { type: "rug", x: 4, y: 4, w: 2, h: 1 },
      { type: "plant_pot", x: 1, y: 4 },
    ],
    collision: [
      { x: 1, y: 1, w: 3, h: 1 },
      { x: 3, y: 2, w: 2, h: 1 },
      { x: 5, y: 1, w: 2, h: 1 },
      { x: 1, y: 3, w: 1, h: 1 },
      { x: 7, y: 1, w: 1, h: 1 },
    ],
    npcSpots: [
      { x: 3, y: 3, id: "resident_c1" },
      { x: 6, y: 4, id: "resident_c2" },
    ],
  },

  korea_univ: {
    width: 14, height: 10,
    floorColor: "#d4c4a0", wallColor: "#f0e8d8",
    spawnPoint: { x: 7, y: 9 },
    exitPoint: { x: 7, y: 9.5 },
    furniture: [
      // 강의실 전면
      { type: "podium", x: 7, y: 1 },
      { type: "blackboard", x: 4, y: 0.5, w: 6, h: 1 },
      { type: "projector", x: 7, y: 0.3 },
      { type: "university_banner", x: 1, y: 0.5, w: 2, h: 1 },
      // 학생 책상 (계단식 5열x3행)
      { type: "student_desk", x: 3, y: 3 }, { type: "student_desk", x: 5, y: 3 },
      { type: "student_desk", x: 7, y: 3 }, { type: "student_desk", x: 9, y: 3 },
      { type: "student_desk", x: 11, y: 3 },
      { type: "student_desk", x: 3, y: 5 }, { type: "student_desk", x: 5, y: 5 },
      { type: "student_desk", x: 7, y: 5 }, { type: "student_desk", x: 9, y: 5 },
      { type: "student_desk", x: 11, y: 5 },
      { type: "student_desk", x: 3, y: 7 }, { type: "student_desk", x: 5, y: 7 },
      { type: "student_desk", x: 7, y: 7 }, { type: "student_desk", x: 9, y: 7 },
      { type: "student_desk", x: 11, y: 7 },
      // 벽면
      { type: "bookshelf", x: 13, y: 1, w: 1, h: 3 },
      { type: "clock", x: 12, y: 0.5 },
      { type: "notice_board", x: 1, y: 3, w: 1, h: 2 },
    ],
    collision: [
      { x: 4, y: 0.5, w: 6, h: 1 },
      { x: 6.5, y: 1, w: 1, h: 1 },
      { x: 1, y: 0.5, w: 2, h: 1 },
      { x: 3, y: 3, w: 1, h: 1 }, { x: 5, y: 3, w: 1, h: 1 },
      { x: 7, y: 3, w: 1, h: 1 }, { x: 9, y: 3, w: 1, h: 1 },
      { x: 11, y: 3, w: 1, h: 1 },
      { x: 3, y: 5, w: 1, h: 1 }, { x: 5, y: 5, w: 1, h: 1 },
      { x: 7, y: 5, w: 1, h: 1 }, { x: 9, y: 5, w: 1, h: 1 },
      { x: 11, y: 5, w: 1, h: 1 },
      { x: 3, y: 7, w: 1, h: 1 }, { x: 5, y: 7, w: 1, h: 1 },
      { x: 7, y: 7, w: 1, h: 1 }, { x: 9, y: 7, w: 1, h: 1 },
      { x: 11, y: 7, w: 1, h: 1 },
      { x: 13, y: 1, w: 1, h: 3 },
      { x: 1, y: 3, w: 1, h: 2 },
    ],
    npcSpots: [
      { x: 7, y: 1.5, id: "professor" },
      { x: 4, y: 4, id: "ku_student_1" },
      { x: 10, y: 6, id: "ku_student_2" },
    ],
  },

  kaist_ai: {
    width: 12, height: 10,
    floorColor: "#e0e0e8", wallColor: "#f0f0f8",
    spawnPoint: { x: 6, y: 9 },
    exitPoint: { x: 6, y: 9.5 },
    furniture: [
      // 연구 책상
      { type: "desk", x: 2, y: 2, w: 2, h: 1 },
      { type: "desk", x: 5, y: 2, w: 2, h: 1 },
      { type: "desk", x: 8, y: 2, w: 2, h: 1 },
      { type: "desk", x: 2, y: 5, w: 2, h: 1 },
      { type: "desk", x: 5, y: 5, w: 2, h: 1 },
      { type: "desk", x: 8, y: 5, w: 2, h: 1 },
      // 의자
      { type: "chair", x: 3, y: 3 }, { type: "chair", x: 6, y: 3 },
      { type: "chair", x: 9, y: 3 },
      { type: "chair", x: 3, y: 6 }, { type: "chair", x: 6, y: 6 },
      { type: "chair", x: 9, y: 6 },
      // 연구 장비
      { type: "whiteboard", x: 1, y: 1, w: 1, h: 2 },
      { type: "bookshelf", x: 11, y: 1, w: 1, h: 3 },
      { type: "lab_bench", x: 1, y: 4, w: 1, h: 2 },
      { type: "computer_cluster", x: 11, y: 5, w: 1, h: 2 },
      { type: "paper_wall", x: 1, y: 7, w: 2, h: 1 },
      // 편의
      { type: "coffee_machine", x: 11, y: 8 },
      { type: "plant_pot", x: 1, y: 8 },
    ],
    collision: [
      { x: 2, y: 2, w: 2, h: 1 },
      { x: 5, y: 2, w: 2, h: 1 },
      { x: 8, y: 2, w: 2, h: 1 },
      { x: 2, y: 5, w: 2, h: 1 },
      { x: 5, y: 5, w: 2, h: 1 },
      { x: 8, y: 5, w: 2, h: 1 },
      { x: 1, y: 1, w: 1, h: 2 },
      { x: 11, y: 1, w: 1, h: 3 },
      { x: 1, y: 4, w: 1, h: 2 },
      { x: 11, y: 5, w: 1, h: 2 },
      { x: 1, y: 7, w: 2, h: 1 },
    ],
    npcSpots: [
      { x: 3, y: 3, id: "ai_researcher_1" },
      { x: 9, y: 3, id: "ai_researcher_2" },
      { x: 6, y: 7, id: "ai_student" },
    ],
  },

  krafton_ai: {
    width: 12, height: 8,
    floorColor: "#2a2a3e", wallColor: "#1a1a2e",
    spawnPoint: { x: 6, y: 7 },
    exitPoint: { x: 6, y: 7.5 },
    furniture: [
      // 스탠딩 데스크
      { type: "standing_desk", x: 2, y: 2, w: 2, h: 1 },
      { type: "standing_desk", x: 5, y: 2, w: 2, h: 1 },
      { type: "standing_desk", x: 8, y: 2, w: 2, h: 1 },
      { type: "desk", x: 2, y: 4, w: 2, h: 1 },
      { type: "desk", x: 5, y: 4, w: 2, h: 1 },
      { type: "desk", x: 8, y: 4, w: 2, h: 1 },
      // 의자
      { type: "chair", x: 3, y: 3 }, { type: "chair", x: 6, y: 3 },
      { type: "chair", x: 9, y: 3 },
      { type: "chair", x: 3, y: 5 }, { type: "chair", x: 6, y: 5 },
      { type: "chair", x: 9, y: 5 },
      // 장비
      { type: "whiteboard", x: 1, y: 1, w: 1, h: 2 },
      { type: "neon_sign", x: 5, y: 0.5, w: 2, h: 0.5 },
      { type: "counter", x: 10, y: 1, w: 2, h: 1 },
      // 휴식 공간
      { type: "bean_bag", x: 1, y: 6 },
      { type: "bean_bag", x: 2.5, y: 6 },
      // 장식
      { type: "plant_pot", x: 1, y: 4 },
      { type: "plant_pot", x: 11, y: 6 },
    ],
    collision: [
      { x: 2, y: 2, w: 2, h: 1 },
      { x: 5, y: 2, w: 2, h: 1 },
      { x: 8, y: 2, w: 2, h: 1 },
      { x: 2, y: 4, w: 2, h: 1 },
      { x: 5, y: 4, w: 2, h: 1 },
      { x: 8, y: 4, w: 2, h: 1 },
      { x: 1, y: 1, w: 1, h: 2 },
      { x: 10, y: 1, w: 2, h: 1 },
    ],
    npcSpots: [
      { x: 3, y: 3, id: "krafton_dev_1" },
      { x: 9, y: 5, id: "krafton_dev_2" },
      { x: 6, y: 6, id: "krafton_pm" },
    ],
  },

  restaurant: {
    width: 10, height: 8,
    floorColor: "#d8c0a0", wallColor: "#e8d4b8",
    spawnPoint: { x: 5, y: 7 },
    exitPoint: { x: 5, y: 7.5 },
    furniture: [
      // 주방
      { type: "kitchen_counter", x: 3, y: 0.5, w: 4, h: 1 },
      { type: "stove", x: 8, y: 1, w: 1, h: 1 },
      { type: "fridge", x: 9, y: 1, w: 1, h: 1 },
      { type: "menu_board", x: 1, y: 0.5, w: 2, h: 1 },
      // 식탁 4개
      { type: "dining_table", x: 2, y: 3, w: 2, h: 1 },
      { type: "dining_table", x: 6, y: 3, w: 2, h: 1 },
      { type: "dining_table", x: 2, y: 5.5, w: 2, h: 1 },
      { type: "dining_table", x: 6, y: 5.5, w: 2, h: 1 },
      // 의자
      { type: "chair", x: 2, y: 4 }, { type: "chair", x: 3, y: 4 },
      { type: "chair", x: 6, y: 4 }, { type: "chair", x: 7, y: 4 },
      { type: "chair", x: 2, y: 6.5 }, { type: "chair", x: 3, y: 6.5 },
      { type: "chair", x: 6, y: 6.5 }, { type: "chair", x: 7, y: 6.5 },
      // 장식
      { type: "plant_pot", x: 1, y: 3 },
      { type: "plant_pot", x: 9, y: 6 },
    ],
    collision: [
      { x: 3, y: 0.5, w: 4, h: 1 },
      { x: 8, y: 1, w: 1, h: 1 },
      { x: 9, y: 1, w: 1, h: 1 },
      { x: 1, y: 0.5, w: 2, h: 1 },
      { x: 2, y: 3, w: 2, h: 1 },
      { x: 6, y: 3, w: 2, h: 1 },
      { x: 2, y: 5.5, w: 2, h: 1 },
      { x: 6, y: 5.5, w: 2, h: 1 },
    ],
    npcSpots: [
      { x: 5, y: 1.5, id: "chef" },
      { x: 3, y: 4.5, id: "diner_1" },
      { x: 7, y: 4.5, id: "diner_2" },
    ],
  },

  hospital: {
    width: 10, height: 8,
    floorColor: "#e8e8f0", wallColor: "#f0f0f8",
    spawnPoint: { x: 5, y: 7 },
    exitPoint: { x: 5, y: 7.5 },
    furniture: [
      // 접수대
      { type: "counter", x: 3, y: 1, w: 4, h: 1 },
      // 대기석
      { type: "chair", x: 2, y: 3 }, { type: "chair", x: 4, y: 3 },
      { type: "chair", x: 6, y: 3 },
      // 진료실
      { type: "exam_bed", x: 1, y: 5, w: 2, h: 2 },
      { type: "curtain_divider", x: 3.5, y: 5, w: 0.3, h: 2 },
      { type: "bed", x: 5, y: 5, w: 2, h: 2 },
      // 장비
      { type: "medicine_cabinet", x: 9, y: 1, w: 1, h: 2 },
      { type: "desk", x: 8, y: 4, w: 2, h: 1 },
      { type: "chair", x: 9, y: 5 },
      { type: "sink", x: 1, y: 1 },
      // 장식
      { type: "plant_pot", x: 9, y: 7 },
    ],
    collision: [
      { x: 3, y: 1, w: 4, h: 1 },
      { x: 9, y: 1, w: 1, h: 2 },
      { x: 1, y: 5, w: 2, h: 2 },
      { x: 5, y: 5, w: 2, h: 2 },
      { x: 8, y: 4, w: 2, h: 1 },
      { x: 1, y: 1, w: 1, h: 1 },
    ],
    npcSpots: [
      { x: 5, y: 1.5, id: "receptionist" },
      { x: 3, y: 6, id: "doctor" },
      { x: 8, y: 4, id: "patient" },
    ],
  },

  convenience: {
    width: 8, height: 8,
    floorColor: "#e0e8d8", wallColor: "#f0f8e8",
    spawnPoint: { x: 4, y: 7 },
    exitPoint: { x: 4, y: 7.5 },
    furniture: [
      // 선반 3줄
      { type: "shelf", x: 1, y: 1, w: 2, h: 1 },
      { type: "shelf", x: 1, y: 3, w: 2, h: 1 },
      { type: "shelf", x: 1, y: 5, w: 2, h: 1 },
      { type: "shelf", x: 5, y: 1, w: 2, h: 1 },
      { type: "shelf", x: 5, y: 3, w: 2, h: 1 },
      // 계산대
      { type: "checkout_counter", x: 3, y: 6, w: 2, h: 1 },
      // 냉장 코너
      { type: "fridge", x: 7, y: 1, w: 1, h: 2 },
      { type: "fridge", x: 7, y: 4, w: 1, h: 2 },
      // 잡지/진열
      { type: "magazine_rack", x: 5, y: 5, w: 2, h: 1 },
      { type: "display_case", x: 3, y: 1, w: 1, h: 1 },
    ],
    collision: [
      { x: 1, y: 1, w: 2, h: 1 },
      { x: 1, y: 3, w: 2, h: 1 },
      { x: 1, y: 5, w: 2, h: 1 },
      { x: 5, y: 1, w: 2, h: 1 },
      { x: 5, y: 3, w: 2, h: 1 },
      { x: 3, y: 6, w: 2, h: 1 },
      { x: 7, y: 1, w: 1, h: 2 },
      { x: 7, y: 4, w: 1, h: 2 },
      { x: 5, y: 5, w: 2, h: 1 },
      { x: 3, y: 1, w: 1, h: 1 },
    ],
    npcSpots: [
      { x: 4, y: 6.5, id: "cashier" },
      { x: 3, y: 2, id: "conv_customer" },
    ],
  },

  police: {
    width: 10, height: 8,
    floorColor: "#d0d4d8", wallColor: "#e0e4e8",
    spawnPoint: { x: 5, y: 7 },
    exitPoint: { x: 5, y: 7.5 },
    furniture: [
      // 사무 공간
      { type: "desk", x: 2, y: 2, w: 2, h: 1 },
      { type: "desk", x: 6, y: 2, w: 2, h: 1 },
      { type: "chair", x: 3, y: 3 }, { type: "chair", x: 7, y: 3 },
      // 증거판 & 장비
      { type: "evidence_board", x: 4, y: 0.5, w: 3, h: 1 },
      { type: "radio_equipment", x: 9, y: 1 },
      { type: "filing_cabinet", x: 9, y: 3, w: 1, h: 2 },
      // 유치장
      { type: "holding_area", x: 1, y: 5, w: 3, h: 2 },
      // 서류 선반
      { type: "shelf", x: 1, y: 1, w: 1, h: 2 },
      { type: "bookshelf", x: 9, y: 6, w: 1, h: 2 },
      // 장식
      { type: "clock", x: 5, y: 0.3 },
      { type: "plant_pot", x: 5, y: 6 },
    ],
    collision: [
      { x: 2, y: 2, w: 2, h: 1 },
      { x: 6, y: 2, w: 2, h: 1 },
      { x: 4, y: 0.5, w: 3, h: 1 },
      { x: 9, y: 1, w: 1, h: 1 },
      { x: 9, y: 3, w: 1, h: 2 },
      { x: 1, y: 5, w: 3, h: 2 },
      { x: 1, y: 1, w: 1, h: 2 },
      { x: 9, y: 6, w: 1, h: 2 },
    ],
    npcSpots: [
      { x: 3, y: 3, id: "officer_1" },
      { x: 7, y: 3, id: "officer_2" },
      { x: 5, y: 6, id: "visitor" },
    ],
  },

  gym: {
    width: 12, height: 10,
    floorColor: "#c8c0b0", wallColor: "#e0d8c8",
    spawnPoint: { x: 6, y: 9 },
    exitPoint: { x: 6, y: 9.5 },
    furniture: [
      // 운동 기구
      { type: "treadmill", x: 2, y: 2, w: 2, h: 1 },
      { type: "treadmill", x: 5, y: 2, w: 2, h: 1 },
      { type: "weight_rack", x: 9, y: 1, w: 2, h: 2 },
      { type: "bench_press", x: 2, y: 5, w: 2, h: 1 },
      { type: "bench_press", x: 5, y: 5, w: 2, h: 1 },
      // 벽면
      { type: "mirror_wall", x: 1, y: 1, w: 1, h: 3 },
      { type: "water_fountain", x: 11, y: 5 },
      { type: "shelf", x: 11, y: 7, w: 1, h: 2 },
      // 매트 구역
      { type: "rug", x: 2, y: 7, w: 4, h: 2 },
      { type: "rug", x: 7, y: 7, w: 3, h: 2 },
      // 벤치 & 장식
      { type: "bench", x: 8, y: 4 },
      { type: "clock", x: 6, y: 0.5 },
    ],
    collision: [
      { x: 2, y: 2, w: 2, h: 1 },
      { x: 5, y: 2, w: 2, h: 1 },
      { x: 9, y: 1, w: 2, h: 2 },
      { x: 2, y: 5, w: 2, h: 1 },
      { x: 5, y: 5, w: 2, h: 1 },
      { x: 1, y: 1, w: 1, h: 3 },
      { x: 11, y: 7, w: 1, h: 2 },
    ],
    npcSpots: [
      { x: 3, y: 3, id: "trainer" },
      { x: 9, y: 3, id: "gym_member_1" },
      { x: 5, y: 8, id: "gym_member_2" },
    ],
  },
};
