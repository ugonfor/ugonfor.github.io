// ─── Storage Keys ───
export const SAVE_KEY = "playground_world_state_v2";
export const UI_PREF_KEY = "playground_ui_pref_v1";
export const MOBILE_SHEET_KEY = "playground_mobile_sheet_v1";
export const PLAYER_NAME_KEY = "playground_player_name_v1";
export const PLAYER_FLAG_KEY = "playground_player_flag_v1";
export const PLAYER_ID_KEY = "playground_player_id";
export const AUTO_WALK_KEY = "playground_auto_walk_v1";

// ─── Country List ───
export const COUNTRY_LIST = [
  { flag: "", label: "country_none" },
  { flag: "🇰🇷", label: "country_kr" },
  { flag: "🇺🇸", label: "country_us" },
  { flag: "🇯🇵", label: "country_jp" },
  { flag: "🇨🇳", label: "country_cn" },
  { flag: "🇬🇧", label: "country_gb" },
  { flag: "🇫🇷", label: "country_fr" },
  { flag: "🇩🇪", label: "country_de" },
  { flag: "🇮🇹", label: "country_it" },
  { flag: "🇪🇸", label: "country_es" },
  { flag: "🇧🇷", label: "country_br" },
  { flag: "🇨🇦", label: "country_ca" },
  { flag: "🇦🇺", label: "country_au" },
  { flag: "🇮🇳", label: "country_in" },
  { flag: "🇷🇺", label: "country_ru" },
  { flag: "🇲🇽", label: "country_mx" },
  { flag: "🇹🇭", label: "country_th" },
];

// ─── Zoom & Distance Constants ───
export const CHAT_NEARBY_DISTANCE = 4.6;
export const ZOOM_MIN = 1.4;
export const ZOOM_MAX = 6.0;
export const DEFAULT_ZOOM = 3.2;
export const CONVERSATION_MIN_ZOOM = 3.6;

// ─── NPC Personas ───
export const npcPersonas = {
  heo: { age: "npc_age_20s", gender: "npc_gender_male", personality: "npc_personality_heo", quirk: "npc_quirk_heo", backstory: "npc_backstory_heo" },
  kim: { age: "npc_age_20s", gender: "npc_gender_male", personality: "npc_personality_kim", quirk: "npc_quirk_kim", backstory: "npc_backstory_kim" },
  choi: { age: "npc_age_20s", gender: "npc_gender_female", personality: "npc_personality_choi", quirk: "npc_quirk_choi", backstory: "npc_backstory_choi" },
  jung: { age: "npc_age_20s", gender: "npc_gender_male", personality: "npc_personality_jung", quirk: "npc_quirk_jung", backstory: "npc_backstory_jung" },
  seo: { age: "npc_age_20s", gender: "npc_gender_male", personality: "npc_personality_seo", quirk: "npc_quirk_seo", backstory: "npc_backstory_seo" },
  lee: { age: "npc_age_20s", gender: "npc_gender_female", personality: "npc_personality_lee", quirk: "npc_quirk_lee", backstory: "npc_backstory_lee" },
  park: { age: "npc_age_20s", gender: "npc_gender_male", personality: "npc_personality_park", quirk: "npc_quirk_park", backstory: "npc_backstory_park" },
  jang: { age: "npc_age_20s", gender: "npc_gender_male", personality: "npc_personality_jang", quirk: "npc_quirk_jang", backstory: "npc_backstory_jang" },
  yoo: { age: "npc_age_20s", gender: "npc_gender_male", personality: "npc_personality_yoo", quirk: "npc_quirk_yoo", backstory: "npc_backstory_yoo" },
  guide: { age: "npc_age_20s", gender: "npc_gender_female", personality: "npc_personality_guide", isDocent: true, quirk: "npc_quirk_guide", backstory: "npc_backstory_guide" },
  baker: { age: "npc_age_30s", gender: "npc_gender_female", personality: "npc_personality_baker", quirk: "npc_quirk_baker", backstory: "npc_backstory_baker" },
  floristNpc: { age: "npc_age_20s", gender: "npc_gender_female", personality: "npc_personality_florist", quirk: "npc_quirk_floristNpc", backstory: "npc_backstory_floristNpc" },
  librarian: { age: "npc_age_30s", gender: "npc_gender_male", personality: "npc_personality_librarian", quirk: "npc_quirk_librarian", backstory: "npc_backstory_librarian" },
  residentA: { age: "npc_age_30s", gender: "npc_gender_male", personality: "npc_personality_residentA", quirk: "npc_quirk_residentA", backstory: "npc_backstory_residentA" },
  residentB: { age: "npc_age_20s", gender: "npc_gender_female", personality: "npc_personality_residentB", quirk: "npc_quirk_residentB", backstory: "npc_backstory_residentB" },
  residentC: { age: "npc_age_30s", gender: "npc_gender_male", personality: "npc_personality_residentC", quirk: "npc_quirk_residentC", backstory: "npc_backstory_residentC" },
  barista: { age: "npc_age_20s", gender: "npc_gender_female", personality: "npc_personality_barista", quirk: "npc_quirk_barista", backstory: "npc_backstory_barista" },
  florist_owner: { age: "npc_age_20s", gender: "npc_gender_female", personality: "npc_personality_florist_owner", quirk: "npc_quirk_florist", backstory: "npc_backstory_florist_owner" },
  chef: { age: "npc_age_30s", gender: "npc_gender_male", personality: "npc_personality_chef", quirk: "npc_quirk_chef", backstory: "npc_backstory_chef" },
  officer: { age: "npc_age_30s", gender: "npc_gender_male", personality: "npc_personality_officer", quirk: "npc_quirk_officer", backstory: "npc_backstory_officer" },
  athlete: { age: "npc_age_20s", gender: "npc_gender_male", personality: "npc_personality_athlete", quirk: "npc_quirk_athlete", backstory: "npc_backstory_athlete" },
  doctor: { age: "npc_age_40s", gender: "npc_gender_female", personality: "npc_personality_doctor", quirk: "npc_quirk_doctor", backstory: "npc_backstory_doctor" },
  student_a: { age: "npc_age_teens", gender: "npc_gender_male", personality: "npc_personality_student_a", quirk: "npc_quirk_student_a", backstory: "npc_backstory_student_a" },
  student_b: { age: "npc_age_teens", gender: "npc_gender_female", personality: "npc_personality_student_b", quirk: "npc_quirk_student_b", backstory: "npc_backstory_student_b" },
  grandpa: { age: "npc_age_60s", gender: "npc_gender_male", personality: "npc_personality_grandpa", quirk: "npc_quirk_grandpa", backstory: "npc_backstory_grandpa" },
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
  // Park & Plaza
  park: { x: 30, y: 10 },             // Park center
  plaza: { x: 30, y: 25 },            // Plaza center
  infoCenter: { x: 28, y: 25 },       // Info center (west of plaza)
  questBoard: { x: 32, y: 25 },       // Quest board (east of plaza)
  // Shop row 1 (y=16)
  cafe: { x: 15.5, y: 18.5 },         // (14, 16, h=2)
  bakery: { x: 23, y: 18.5 },         // (22, 16, h=2)
  office: { x: 38, y: 18.5 },         // (36, 16, h=2)
  market: { x: 46, y: 19.5 },         // (44, 16, h=3)
  // Shop row 2 (y=30)
  florist: { x: 15, y: 32.5 },        // (14, 30, h=2)
  library: { x: 23.5, y: 32.5 },      // (22, 30, h=2)
  convenience: { x: 37, y: 32.5 },    // (36, 30, h=2)
  restaurant: { x: 45.5, y: 32.5 },   // (44, 30, h=2)
  // Residential (y=38)
  homeA: { x: 15, y: 40.5 },          // (14, 38, h=2)
  homeB: { x: 31, y: 40.5 },          // (30, 38, h=2)
  homeC: { x: 47, y: 40.5 },          // (46, 38, h=2)
  // Campus / Institutions (y=48~56)
  korea_univ: { x: 13, y: 52.5 },     // (10, 48, h=4)
  krafton_ai: { x: 26.5, y: 51.5 },   // (24, 48, h=3)
  kaist_ai: { x: 40.5, y: 51.5 },     // (38, 48, h=3)
  ksa_main: { x: 20.5, y: 58.5 },     // (18, 55, h=3)
  ksa_dorm: { x: 35.5, y: 57.5 },     // (34, 55, h=2)
  hospital: { x: 45.5, y: 57.5 },     // (44, 55, h=2)
  police: { x: 11.5, y: 57.5 },       // (10, 55, h=2)
  gym: { x: 50, y: 51.5 },            // (48, 48, h=3)
};

// ─── Place Aliases (name → place key) ───
export const PLACE_ALIASES = {
  "park": "park", "plaza": "plaza", "cafe": "cafe", "bakery": "bakery",
  "office": "office", "market": "market", "florist": "florist", "library": "library",
  "convenience store": "convenience", "convenience": "convenience",
  "restaurant": "restaurant", "house": "homeA", "home": "homeA", "residential": "homeA",
  "gym": "gym", "hospital": "hospital", "police station": "police", "police": "police",
  "korea univ": "korea_univ", "korea university": "korea_univ", "university": "korea_univ",
  "krafton": "krafton_ai", "KAIST": "kaist_ai", "kaist": "kaist_ai",
  "KSA": "ksa_main", "main building": "ksa_main", "campus": "ksa_main",
  "dorm": "ksa_dorm", "dormitory": "ksa_dorm",
  "info center": "infoCenter", "board": "questBoard",
};

// ─── Buildings ───
export const buildings = [
  // Shop row 1 (y=16)
  { id: "cafe", x: 14, y: 16, w: 3, h: 2, z: 2.3, color: "#f7b6b5", roof: "#e68a84", label: "bld_cafe" },
  { id: "bakery", x: 22, y: 16, w: 2, h: 2, z: 2.2, color: "#f4d6a3", roof: "#dab977", label: "bld_bakery" },
  { id: "office", x: 36, y: 16, w: 4, h: 2, z: 2.9, color: "#f8d28d", roof: "#d79956", label: "bld_office" },
  { id: "market", x: 44, y: 16, w: 4, h: 3, z: 2.5, color: "#9ecbf0", roof: "#6ea2d4", label: "bld_market" },
  // Shop row 2 (y=30)
  { id: "florist", x: 14, y: 30, w: 2, h: 2, z: 2.1, color: "#ffc9e0", roof: "#e8a1c1", label: "bld_florist" },
  { id: "library", x: 22, y: 30, w: 3, h: 2, z: 2.6, color: "#b0c9d4", roof: "#8aa3b8", label: "bld_library" },
  { id: "convenience", x: 36, y: 30, w: 2, h: 2, z: 2.0, color: "#00a651", roof: "#008040", label: "bld_convenience" },
  { id: "restaurant", x: 44, y: 30, w: 3, h: 2, z: 2.2, color: "#e8a060", roof: "#c88040", label: "bld_restaurant" },
  // Residential (y=38)
  { id: "houseA", x: 14, y: 38, w: 2, h: 2, z: 2.0, color: "#e8c9a6", roof: "#c4a073", label: "bld_house" },
  { id: "houseB", x: 30, y: 38, w: 2, h: 2, z: 2.0, color: "#d4b89a", roof: "#b09572", label: "bld_house" },
  { id: "houseC", x: 46, y: 38, w: 2, h: 2, z: 2.0, color: "#ceb798", roof: "#a89370", label: "bld_house" },
  // Campus / Institutions (y=48~56)
  { id: "korea_univ", x: 10, y: 48, w: 6, h: 4, z: 3.0, color: "#8B0029", roof: "#6a0020", label: "bld_korea_univ" },
  { id: "krafton_ai", x: 24, y: 48, w: 5, h: 3, z: 2.6, color: "#1a1a2e", roof: "#0f0f1e", label: "bld_krafton_ai" },
  { id: "kaist_ai", x: 38, y: 48, w: 5, h: 3, z: 2.8, color: "#003478", roof: "#002458", label: "bld_kaist_ai" },
  { id: "gym", x: 48, y: 48, w: 4, h: 3, z: 2.8, color: "#d4d4d4", roof: "#b0b0b0", label: "bld_gym" },
  { id: "ksa_main", x: 18, y: 55, w: 5, h: 3, z: 3.2, color: "#d4c4a8", roof: "#b8a88c", label: "bld_ksa_main" },
  { id: "ksa_dorm", x: 34, y: 55, w: 3, h: 2, z: 2.4, color: "#c9b896", roof: "#a89878", label: "bld_ksa_dorm" },
  { id: "hospital", x: 44, y: 55, w: 3, h: 2, z: 2.4, color: "#ffffff", roof: "#d0d0d0", label: "bld_hospital" },
  { id: "police", x: 10, y: 55, w: 3, h: 2, z: 2.3, color: "#4a6fa5", roof: "#3a5f95", label: "bld_police" },
];

// ─── Hotspots ───
export const hotspots = [
  { id: "exitGate", x: 30, y: 77, label: "hs_exit_gate" },
  // Shop row 1
  { id: "cafeDoor", x: 15.5, y: 18, label: "hs_cafe_door" },
  { id: "bakeryDoor", x: 23, y: 18, label: "hs_bakery_door" },
  { id: "officeDoor", x: 38, y: 18, label: "hs_office_door" },
  { id: "marketDoor", x: 46, y: 19, label: "hs_market_door" },
  // Shop row 2
  { id: "floristDoor", x: 15, y: 32, label: "hs_florist_door" },
  { id: "libraryDoor", x: 23.5, y: 32, label: "hs_library_door" },
  { id: "convenienceDoor", x: 37, y: 32, label: "hs_convenience_door" },
  { id: "restaurantDoor", x: 45.5, y: 32, label: "hs_restaurant_door" },
  // Residential
  { id: "houseADoor", x: 15, y: 40, label: "bld_house" },
  { id: "houseBDoor", x: 31, y: 40, label: "bld_house" },
  { id: "houseCDoor", x: 47, y: 40, label: "bld_house" },
  // Campus / Institutions
  { id: "koreaUnivDoor", x: 13, y: 52, label: "bld_korea_univ" },
  { id: "kraftonAiDoor", x: 26.5, y: 51, label: "bld_krafton_ai" },
  { id: "kaistAiDoor", x: 40.5, y: 51, label: "bld_kaist_ai" },
  { id: "gymDoor", x: 50, y: 51, label: "bld_gym" },
  { id: "ksaMainDoor", x: 20.5, y: 58, label: "bld_ksa_main" },
  { id: "ksaDormDoor", x: 35.5, y: 57, label: "bld_ksa_dorm" },
  { id: "hospitalDoor", x: 45.5, y: 57, label: "bld_hospital" },
  { id: "policeDoor", x: 11.5, y: 57, label: "bld_police" },
  // Park & Plaza
  { id: "parkMonument", x: 30, y: 10, label: "hs_park_monument" },
  { id: "minigameZone", x: 30, y: 25, label: "hs_minigame_zone" },
  { id: "infoCenter", x: 28, y: 25, label: "hs_info_center" },
  { id: "questBoard", x: 32, y: 25, label: "hs_quest_board" },
];

// ─── Props (Decorations) ───
export const props = [
  // ═══════════════════════════════════════════════
  // Central Park (y=3~13, x=10~50)
  // ═══════════════════════════════════════════════
  // Central fountain
  { type: "fountain", x: 30, y: 8 },
  // Park benches (around fountain)
  { type: "bench", x: 25, y: 6 }, { type: "bench", x: 35, y: 6 },
  { type: "bench", x: 25, y: 10 }, { type: "bench", x: 35, y: 10 },
  { type: "bench", x: 20, y: 8 }, { type: "bench", x: 40, y: 8 },
  // Park trees — edges only
  { type: "tree", x: 10, y: 3 }, { type: "tree", x: 12, y: 4 },
  { type: "tree", x: 48, y: 3 }, { type: "tree", x: 50, y: 4 },
  { type: "tree", x: 10, y: 12 }, { type: "tree", x: 50, y: 12 },
  { type: "tree", x: 11, y: 7 }, { type: "tree", x: 49, y: 7 },
  // Park flower beds
  { type: "flower", x: 28, y: 6 }, { type: "flower", x: 32, y: 6 },
  { type: "flower", x: 27, y: 9 }, { type: "flower", x: 33, y: 9 },
  { type: "flower", x: 26, y: 11 }, { type: "flower", x: 34, y: 11 },
  // Park lamps (corners)
  { type: "lamp", x: 12, y: 5 }, { type: "lamp", x: 48, y: 5 },
  { type: "lamp", x: 12, y: 11 }, { type: "lamp", x: 48, y: 11 },

  // ═══════════════════════════════════════════════
  // Main road lamps (x=28, x=32) — 5-tile intervals, y=14~75
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
  // Trees behind shops (off-road areas)
  // ═══════════════════════════════════════════════
  { type: "tree", x: 12, y: 16 }, { type: "tree", x: 12, y: 30 },
  { type: "tree", x: 50, y: 16 }, { type: "tree", x: 50, y: 30 },

  // ═══════════════════════════════════════════════
  // Plaza (x=30, y=22~28) — info center + quest board + playground
  // ═══════════════════════════════════════════════
  { type: "clock_tower", x: 30, y: 23 },
  { type: "signpost", x: 28, y: 25 },
  { type: "questboard", x: 32, y: 25 },
  { type: "bench", x: 26, y: 24 }, { type: "bench", x: 34, y: 24 },
  { type: "bench", x: 26, y: 26 }, { type: "bench", x: 34, y: 26 },

  // ═══════════════════════════════════════════════
  // Shop row 1 surroundings (cafe 14,16 / bakery 22,16 / office 36,16 / market 44,16)
  // ═══════════════════════════════════════════════
  { type: "lamp", x: 15.5, y: 19 }, { type: "lamp", x: 23, y: 19 },
  { type: "lamp", x: 38, y: 19 }, { type: "lamp", x: 46, y: 20 },
  { type: "flower", x: 13, y: 16 }, { type: "flower", x: 18, y: 16 },
  { type: "flower", x: 21, y: 19 }, { type: "flower", x: 25, y: 17 },
  { type: "flower", x: 35, y: 16 }, { type: "flower", x: 43, y: 17 },
  { type: "bush", x: 20, y: 17 }, { type: "bush", x: 34, y: 17 },

  // ═══════════════════════════════════════════════
  // Shop row 2 surroundings (florist 14,30 / library 22,30 / convenience 36,30 / restaurant 44,30)
  // ═══════════════════════════════════════════════
  { type: "lamp", x: 15, y: 33 }, { type: "lamp", x: 23.5, y: 33 },
  { type: "lamp", x: 37, y: 33 }, { type: "lamp", x: 45.5, y: 33 },
  { type: "flower", x: 13, y: 30 }, { type: "flower", x: 17, y: 31 },
  { type: "flower", x: 21, y: 30 }, { type: "flower", x: 26, y: 31 },
  { type: "flower", x: 35, y: 30 }, { type: "flower", x: 39, y: 31 },
  { type: "flower", x: 43, y: 30 }, { type: "flower", x: 48, y: 31 },
  { type: "bush", x: 19, y: 32 }, { type: "bush", x: 33, y: 32 },

  // ═══════════════════════════════════════════════
  // House A (14,38) surroundings
  // ═══════════════════════════════════════════════
  { type: "fence", x: 13, y: 40.5 }, { type: "fence", x: 14, y: 40.5 },
  { type: "fence", x: 15, y: 40.5 }, { type: "fence", x: 16, y: 40.5 },
  { type: "flower", x: 13.5, y: 37.5 }, { type: "flower", x: 16.5, y: 37.5 },
  { type: "bush", x: 17, y: 39 },

  // ═══════════════════════════════════════════════
  // House B (30,38) surroundings
  // ═══════════════════════════════════════════════
  { type: "fence", x: 29, y: 40.5 }, { type: "fence", x: 30, y: 40.5 },
  { type: "fence", x: 31, y: 40.5 }, { type: "fence", x: 32, y: 40.5 },
  { type: "flower", x: 29.5, y: 37.5 }, { type: "flower", x: 32.5, y: 37.5 },
  { type: "bush", x: 33, y: 39 },

  // ═══════════════════════════════════════════════
  // House C (46,38) surroundings
  // ═══════════════════════════════════════════════
  { type: "fence", x: 45, y: 40.5 }, { type: "fence", x: 46, y: 40.5 },
  { type: "fence", x: 47, y: 40.5 }, { type: "fence", x: 48, y: 40.5 },
  { type: "flower", x: 45.5, y: 37.5 }, { type: "flower", x: 48.5, y: 37.5 },
  { type: "bush", x: 49, y: 39 },

  // ═══════════════════════════════════════════════
  // Korea University (10,48) surroundings
  // ═══════════════════════════════════════════════
  { type: "tree", x: 8, y: 47 }, { type: "tree", x: 17, y: 47 },
  { type: "tree", x: 8, y: 53 }, { type: "tree", x: 17, y: 53 },
  { type: "bench", x: 9, y: 53 }, { type: "bench", x: 16, y: 50 },
  { type: "lamp", x: 13, y: 53 },
  { type: "flower", x: 9, y: 48 }, { type: "flower", x: 16, y: 48 },

  // ═══════════════════════════════════════════════
  // Krafton AI (24,48) surroundings
  // ═══════════════════════════════════════════════
  { type: "lamp", x: 26.5, y: 52 },
  { type: "bush", x: 23, y: 48 }, { type: "bush", x: 30, y: 48 },

  // ═══════════════════════════════════════════════
  // KAIST AI (38,48) surroundings
  // ═══════════════════════════════════════════════
  { type: "tree", x: 37, y: 47 }, { type: "tree", x: 44, y: 47 },
  { type: "bench", x: 38, y: 52 }, { type: "bench", x: 42, y: 52 },
  { type: "lamp", x: 40.5, y: 52 },

  // ═══════════════════════════════════════════════
  // Gym (48,48) surroundings
  // ═══════════════════════════════════════════════
  { type: "bench", x: 49, y: 52 }, { type: "bench", x: 51, y: 52 },
  { type: "lamp", x: 50, y: 52 },

  // ═══════════════════════════════════════════════
  // KSA Main Building (18,55) & Dorm (34,55) surroundings
  // ═══════════════════════════════════════════════
  { type: "bench", x: 19, y: 59 }, { type: "bench", x: 22, y: 59 },
  { type: "lamp", x: 20.5, y: 59 }, { type: "lamp", x: 35.5, y: 58 },
  { type: "flower", x: 17, y: 55 }, { type: "flower", x: 23, y: 55 },
  { type: "signpost", x: 18, y: 59 },

  // ═══════════════════════════════════════════════
  // Hospital (44,55) surroundings
  // ═══════════════════════════════════════════════
  { type: "lamp", x: 45.5, y: 58 },
  { type: "signpost", x: 43, y: 56 },
  { type: "bench", x: 48, y: 56 },

  // ═══════════════════════════════════════════════
  // Police Station (10,55) surroundings
  // ═══════════════════════════════════════════════
  { type: "lamp", x: 11.5, y: 58 },
  { type: "signpost", x: 9, y: 56 },
  { type: "bench", x: 14, y: 56 },

  // ═══════════════════════════════════════════════
  // Road intersection lamps & signposts
  // ═══════════════════════════════════════════════
  { type: "lamp", x: 15, y: 18 }, { type: "lamp", x: 45, y: 18 },
  { type: "lamp", x: 15, y: 32 }, { type: "lamp", x: 45, y: 32 },
  { type: "lamp", x: 15, y: 40 }, { type: "lamp", x: 45, y: 40 },
  { type: "signpost", x: 30, y: 75 },
  { type: "signpost", x: 8, y: 18 }, { type: "signpost", x: 8, y: 40 },

  // ═══════════════════════════════════════════════
  // Outskirts nature props
  // ═══════════════════════════════════════════════
  { type: "tree", x: 5, y: 4 }, { type: "tree", x: 7, y: 10 },
  { type: "tree", x: 5, y: 20 }, { type: "tree", x: 5, y: 35 },
  { type: "tree", x: 57, y: 4 }, { type: "tree", x: 57, y: 20 },
  { type: "tree", x: 57, y: 35 },
  { type: "rock", x: 6, y: 25 }, { type: "rock", x: 6, y: 42 },
  { type: "rock", x: 56, y: 28 }, { type: "rock", x: 56, y: 42 },
  { type: "bush", x: 7, y: 28 }, { type: "bush", x: 55, y: 22 },

  // ═══════════════════════════════════════════════
  // South forest (y=60~75) — exploration zone
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
  // Grass tufts (small decorations)
  // ═══════════════════════════════════════════════
  // Inside park
  { type: "grass_tuft", x: 16, y: 7 }, { type: "grass_tuft", x: 44, y: 9 },
  { type: "grass_tuft", x: 22, y: 9 }, { type: "grass_tuft", x: 38, y: 7 },
  { type: "grass_tuft", x: 28, y: 5 }, { type: "grass_tuft", x: 32, y: 10 },
  // Both sides of main road
  { type: "grass_tuft", x: 27, y: 27 }, { type: "grass_tuft", x: 33, y: 28 },
  { type: "grass_tuft", x: 27, y: 37 }, { type: "grass_tuft", x: 33, y: 37 },
  { type: "grass_tuft", x: 27, y: 47 }, { type: "grass_tuft", x: 33, y: 47 },
  // Near buildings
  { type: "grass_tuft", x: 13, y: 17 }, { type: "grass_tuft", x: 25, y: 17 },
  { type: "grass_tuft", x: 35, y: 17 }, { type: "grass_tuft", x: 49, y: 17 },
  // Residential area
  { type: "grass_tuft", x: 13, y: 39 }, { type: "grass_tuft", x: 17, y: 38 },
  { type: "grass_tuft", x: 29, y: 39 }, { type: "grass_tuft", x: 33, y: 38 },
  { type: "grass_tuft", x: 45, y: 39 }, { type: "grass_tuft", x: 49, y: 38 },
  // Outskirts
  { type: "grass_tuft", x: 8, y: 15 }, { type: "grass_tuft", x: 54, y: 15 },
  { type: "grass_tuft", x: 8, y: 36 }, { type: "grass_tuft", x: 54, y: 36 },
  // South forest
  { type: "grass_tuft", x: 13, y: 68 }, { type: "grass_tuft", x: 28, y: 70 },
  { type: "grass_tuft", x: 43, y: 67 }, { type: "grass_tuft", x: 55, y: 73 },
];

// ─── Species Pool ───
export const speciesPool = ["human_a", "human_b", "human_c", "human_d", "human_e", "human_f", "human_g", "human_h", "human_i"];

// ─── Weather Types ───
export const WEATHER_TYPES = ["clear", "clear", "clear", "cloudy", "rain", "rain", "storm", "snow", "fog"];

// ─── Discoveries (Initial Data) ───
export const discoveries = [
  // Park zone (y=3~13)
  { id: "secret_garden", x: 12, y: 6, radius: 1.8, found: false, title: "disc_secret_garden", desc: "disc_secret_garden_desc", condition: "always", reward: "gem" },
  { id: "midnight_glow", x: 30, y: 8, radius: 1.5, found: false, title: "disc_midnight_glow", desc: "disc_midnight_glow_desc", condition: "night", reward: "gem" },
  { id: "rain_mushrooms", x: 22, y: 11, radius: 2.0, found: false, title: "disc_rain_mushrooms", desc: "disc_rain_mushrooms_desc", condition: "rain", reward: "snack" },
  { id: "storm_crystal", x: 18, y: 5, radius: 2.0, found: false, title: "disc_storm_crystal", desc: "disc_storm_crystal_desc", condition: "storm", reward: "gem" },
  { id: "snow_angel", x: 30, y: 11, radius: 2.0, found: false, title: "disc_snow_angel", desc: "disc_snow_angel_desc", condition: "snow", reward: "gem" },
  { id: "sunset_view", x: 48, y: 5, radius: 2.0, found: false, title: "disc_sunset_view", desc: "disc_sunset_view_desc", condition: "evening", reward: "flower_red" },
  // Shop / Plaza zone (y=14~35)
  { id: "market_stash", x: 49, y: 17, radius: 1.5, found: false, title: "disc_market_stash", desc: "disc_market_stash_desc", condition: "always", reward: "snack" },
  { id: "plaza_dance", x: 30, y: 25, radius: 1.5, found: false, title: "disc_plaza_dance", desc: "disc_plaza_dance_desc", condition: "always", reward: "coffee" },
  { id: "lamp_wish", x: 28, y: 25, radius: 1.2, found: false, title: "disc_lamp_wish", desc: "disc_lamp_wish_desc", condition: "night", reward: "letter" },
  { id: "flower_field", x: 8, y: 31, radius: 2.0, found: false, title: "disc_flower_field", desc: "disc_flower_field_desc", condition: "always", reward: "flower_red" },
  // Residential zone (y=38~42)
  { id: "night_cats", x: 40, y: 39, radius: 2.0, found: false, title: "disc_night_cats", desc: "disc_night_cats_desc", condition: "night", reward: "snack" },
  // River zone (y=44~46)
  { id: "river_message", x: 10, y: 45, radius: 1.5, found: false, title: "disc_river_message", desc: "disc_river_message_desc", condition: "always", reward: "letter" },
  { id: "hidden_well", x: 50, y: 45, radius: 1.5, found: false, title: "disc_hidden_well", desc: "disc_hidden_well_desc", condition: "always", reward: "gem" },
  // Campus zone (y=48~58)
  { id: "ksa_rooftop", x: 20, y: 56, radius: 1.5, found: false, title: "disc_ksa_rooftop", desc: "disc_ksa_rooftop_desc", condition: "night", reward: "gem" },
  { id: "cat_village", x: 8, y: 53, radius: 2.0, found: false, title: "disc_cat_village", desc: "disc_cat_village_desc", condition: "night", reward: "snack" },
  // South forest zone (y=60~75)
  { id: "south_lake", x: 35, y: 68, radius: 2.5, found: false, title: "disc_south_lake", desc: "disc_south_lake_desc", condition: "always", reward: "gem" },
  { id: "fog_figure", x: 10, y: 67, radius: 2.0, found: false, title: "disc_fog_figure", desc: "disc_fog_figure_desc", condition: "fog", reward: "gem" },
  { id: "east_cabin", x: 52, y: 65, radius: 2.0, found: false, title: "disc_east_cabin", desc: "disc_east_cabin_desc", condition: "fog", reward: "letter" },
  { id: "dawn_song", x: 30, y: 70, radius: 2.0, found: false, title: "disc_dawn_song", desc: "disc_dawn_song_desc", condition: "dawn", reward: "letter" },
  { id: "rainbow_spot", x: 45, y: 73, radius: 2.5, found: false, title: "disc_rainbow_spot", desc: "disc_rainbow_spot_desc", condition: "storm", reward: "gem" },
];

// ─── Favor Level Names ───
export const favorLevelNames = ["favor_stranger", "favor_acquaintance", "favor_friend", "favor_close_friend", "favor_soulmate"];

// ─── Item Types ───
export const itemTypes = {
  flower_red: { label: "item_flower_red", emoji: "🌹", color: "#ff6b7a" },
  flower_yellow: { label: "item_flower_yellow", emoji: "🌼", color: "#ffd54f" },
  coffee: { label: "item_coffee", emoji: "☕", color: "#8d6e63" },
  snack: { label: "item_snack", emoji: "🍪", color: "#e6a34f" },
  letter: { label: "item_letter", emoji: "💌", color: "#ef9a9a" },
  gem: { label: "item_gem", emoji: "💎", color: "#4fc3f7" },
};

// ─── Ground Items (Initial Data) ───
export const groundItems = [
  // Park (y=3~13)
  { id: "gi1", type: "flower_red", x: 25, y: 7, pickedAt: 0 },        // Park west
  { id: "gi2", type: "flower_yellow", x: 35, y: 9, pickedAt: 0 },     // Park east
  { id: "gi9", type: "gem", x: 30, y: 8.5, pickedAt: 0 },             // Near park fountain
  // Shop row 1 (y=16~19)
  { id: "gi3", type: "coffee", x: 16, y: 19, pickedAt: 0 },           // Near cafe
  { id: "gi7", type: "coffee", x: 15, y: 17, pickedAt: 0 },           // Cafe entrance
  { id: "gi10", type: "letter", x: 38, y: 19, pickedAt: 0 },          // Near office
  { id: "gi4", type: "snack", x: 46, y: 20, pickedAt: 0 },            // Near market
  // Plaza (y=22~28)
  { id: "gi5", type: "letter", x: 30, y: 26, pickedAt: 0 },           // Plaza
  { id: "gi12", type: "gem", x: 30, y: 24, pickedAt: 0 },             // Plaza
  // Shop row 2 (y=30~33)
  { id: "gi11", type: "flower_yellow", x: 15, y: 33, pickedAt: 0 },   // Near florist
  { id: "gi19", type: "flower_yellow", x: 46, y: 33, pickedAt: 0 },   // Near restaurant
  // Residential (y=38~42)
  { id: "gi8", type: "snack", x: 15, y: 41, pickedAt: 0 },            // Near house A
  { id: "gi15", type: "flower_red", x: 31, y: 41, pickedAt: 0 },      // Near house B
  { id: "gi16", type: "gem", x: 47, y: 41, pickedAt: 0 },             // Near house C
  // Near river (y=44~46)
  { id: "gi6", type: "flower_red", x: 10, y: 43, pickedAt: 0 },       // River west
  // Campus (y=48~58)
  { id: "gi18", type: "snack", x: 13, y: 53, pickedAt: 0 },           // Near Korea Univ
  { id: "gi13", type: "coffee", x: 20, y: 59, pickedAt: 0 },          // Near KSA main building
  { id: "gi14", type: "snack", x: 36, y: 58, pickedAt: 0 },           // Near KSA dorm
  // South forest (y=60~75)
  { id: "gi17", type: "letter", x: 30, y: 65, pickedAt: 0 },          // Forest center
  { id: "gi20", type: "gem", x: 15, y: 70, pickedAt: 0 },             // Forest west
];

// ─── Item Respawn ───
export const ITEM_RESPAWN_MS = 180_000;


// ─── Seasons ───
export const seasons = ["season_spring_name", "season_summer_name", "season_autumn_name", "season_winter_name"];


// ─── Interior Definitions ───
export const interiorDefs = {
  cafe: {
    width: 10, height: 8,
    floorColor: "#e8d5b7", wallColor: "#f7e6d0",
    spawnPoint: { x: 5, y: 7 },
    exitPoint: { x: 5, y: 7.5 },
    furniture: [
      // Counter & equipment
      { type: "counter", x: 3, y: 1, w: 4, h: 1 },
      { type: "espresso_machine", x: 3.5, y: 0.5 },
      { type: "menu_board", x: 8, y: 0.5, w: 2, h: 1 },
      // 5 tables
      { type: "table_round", x: 2, y: 3 },
      { type: "table_round", x: 5, y: 3 },
      { type: "table_round", x: 8, y: 3 },
      { type: "table_round", x: 3, y: 5.5 },
      { type: "table_round", x: 7, y: 5.5 },
      // Chairs
      { type: "chair", x: 1.5, y: 3 }, { type: "chair", x: 2.5, y: 3 },
      { type: "chair", x: 4.5, y: 3 }, { type: "chair", x: 5.5, y: 3 },
      { type: "chair", x: 7.5, y: 3 }, { type: "chair", x: 8.5, y: 3 },
      { type: "chair", x: 2.5, y: 5.5 }, { type: "chair", x: 3.5, y: 5.5 },
      { type: "chair", x: 6.5, y: 5.5 }, { type: "chair", x: 7.5, y: 5.5 },
      // Window seat
      { type: "window_seat", x: 0.5, y: 4, w: 1, h: 2 },
      // Decorations
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
      // 5 desks
      { type: "desk", x: 2, y: 2, w: 2, h: 1 },
      { type: "desk", x: 5, y: 2, w: 2, h: 1 },
      { type: "desk", x: 8, y: 2, w: 2, h: 1 },
      { type: "desk", x: 3, y: 5, w: 2, h: 1 },
      { type: "desk", x: 7, y: 5, w: 2, h: 1 },
      // Chairs
      { type: "chair", x: 3, y: 3 }, { type: "chair", x: 6, y: 3 },
      { type: "chair", x: 9, y: 3 },
      { type: "chair", x: 4, y: 6 }, { type: "chair", x: 8, y: 6 },
      // Equipment & furniture
      { type: "whiteboard", x: 1, y: 1, w: 1, h: 2 },
      { type: "water_cooler", x: 11, y: 1 },
      { type: "filing_cabinet", x: 11, y: 3, w: 1, h: 2 },
      { type: "printer", x: 11, y: 6 },
      { type: "clock", x: 6, y: 0.5 },
      { type: "coat_rack", x: 1, y: 6 },
      // Decorations
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
      // Display shelves
      { type: "shelf", x: 2, y: 2, w: 3, h: 1 },
      { type: "shelf", x: 2, y: 4, w: 3, h: 1 },
      { type: "shelf", x: 2, y: 6, w: 3, h: 1 },
      { type: "shelf", x: 7, y: 2, w: 3, h: 1 },
      { type: "shelf", x: 7, y: 4, w: 3, h: 1 },
      { type: "shelf", x: 7, y: 6, w: 3, h: 1 },
      // Checkout counter & sign
      { type: "checkout_counter", x: 5, y: 8, w: 2, h: 1 },
      { type: "sign_board", x: 5.5, y: 0.5, w: 2, h: 1 },
      // Basket displays
      { type: "basket_display", x: 1, y: 1 },
      { type: "basket_display", x: 11, y: 1 },
      // Freezer corner & scale
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
      // Podium
      { type: "podium", x: 7, y: 1 },
      { type: "blackboard", x: 4, y: 0.5, w: 6, h: 1 },
      { type: "projector", x: 7, y: 0.3 },
      // Student desks 3x4 layout
      { type: "student_desk", x: 3, y: 3 }, { type: "student_desk", x: 5, y: 3 },
      { type: "student_desk", x: 7, y: 3 }, { type: "student_desk", x: 9, y: 3 },
      { type: "student_desk", x: 3, y: 5 }, { type: "student_desk", x: 5, y: 5 },
      { type: "student_desk", x: 7, y: 5 }, { type: "student_desk", x: 9, y: 5 },
      { type: "student_desk", x: 3, y: 7 }, { type: "student_desk", x: 5, y: 7 },
      { type: "student_desk", x: 7, y: 7 }, { type: "student_desk", x: 9, y: 7 },
      // Wall furniture
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
      // Beds
      { type: "bunk_bed", x: 1, y: 1, w: 2, h: 3 },
      { type: "bunk_bed", x: 1, y: 5, w: 2, h: 3 },
      // Shared table
      { type: "shared_table", x: 5, y: 3, w: 2, h: 2 },
      { type: "chair", x: 4.5, y: 4 }, { type: "chair", x: 7, y: 4 },
      // Amenities
      { type: "vending_machine", x: 9, y: 1, w: 1, h: 1 },
      { type: "mini_fridge", x: 9, y: 3 },
      { type: "shoe_rack", x: 4, y: 7, w: 2, h: 0.8 },
      // Study area
      { type: "study_lamp", x: 4, y: 1 },
      { type: "study_lamp", x: 8, y: 1 },
      { type: "bookshelf", x: 8, y: 5, w: 1, h: 2 },
      // Decorations
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
      // Display & cooking
      { type: "display_case", x: 2, y: 1, w: 4, h: 1 },
      { type: "cake_display", x: 1, y: 1, w: 1, h: 1 },
      { type: "oven", x: 7, y: 1, w: 1, h: 2 },
      { type: "mixer", x: 7, y: 3.5 },
      // Work table
      { type: "work_table", x: 2, y: 4, w: 3, h: 1 },
      { type: "stool", x: 2, y: 5 }, { type: "stool", x: 4, y: 5 },
      // Bread racks
      { type: "bread_rack", x: 0.5, y: 3, w: 1, h: 2 },
      { type: "bread_rack", x: 0.5, y: 5.5, w: 1, h: 2 },
      // Ingredients
      { type: "flour_sack", x: 7, y: 5 },
      { type: "flour_sack", x: 7, y: 6 },
      // Decorations
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
      // Flower displays
      { type: "flower_display", x: 1, y: 1, w: 2, h: 1 },
      { type: "flower_display", x: 4, y: 1, w: 2, h: 1 },
      { type: "flower_display", x: 1, y: 3, w: 2, h: 1 },
      { type: "seed_display", x: 4, y: 3, w: 2, h: 1 },
      // Workbench & equipment
      { type: "workbench", x: 5, y: 5, w: 2, h: 1 },
      { type: "fridge", x: 7, y: 1, w: 1, h: 2 },
      { type: "watering_can", x: 7, y: 4 },
      { type: "ribbon_rack", x: 7, y: 5 },
      // Decorations
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
      // 6 bookshelves
      { type: "bookshelf", x: 1, y: 1, w: 1, h: 3 },
      { type: "bookshelf", x: 2.5, y: 1, w: 1, h: 3 },
      { type: "bookshelf", x: 4, y: 1, w: 1, h: 3 },
      { type: "bookshelf", x: 6, y: 1, w: 1, h: 3 },
      { type: "bookshelf", x: 7.5, y: 1, w: 1, h: 3 },
      { type: "bookshelf", x: 9, y: 1, w: 1, h: 3 },
      // Reading area
      { type: "reading_table", x: 2, y: 5, w: 2, h: 1 },
      { type: "reading_table", x: 6, y: 5, w: 2, h: 1 },
      { type: "study_carrel", x: 1, y: 5 },
      { type: "study_carrel", x: 9, y: 5 },
      // Chairs
      { type: "chair", x: 2, y: 6 }, { type: "chair", x: 3, y: 6 },
      { type: "chair", x: 6, y: 6 }, { type: "chair", x: 7, y: 6 },
      // Decorations
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
      // Cozy traditional style
      { type: "bed", x: 1, y: 1, w: 2, h: 2 },
      { type: "fireplace", x: 6, y: 1, w: 2, h: 1 },
      { type: "dining_table", x: 4, y: 1, w: 2, h: 1 },
      { type: "floor_cushion", x: 4, y: 2 }, { type: "floor_cushion", x: 5, y: 2 },
      { type: "rug", x: 3, y: 3, w: 3, h: 1 },
      // Wall
      { type: "bookshelf", x: 7, y: 3, w: 1, h: 2 },
      { type: "painting", x: 3, y: 0.5 },
      { type: "clock", x: 6, y: 0.5 },
      // Decorations
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
      // Modern tech style
      { type: "desk_with_monitor", x: 1, y: 1, w: 2, h: 1 },
      { type: "desk_with_monitor", x: 4, y: 1, w: 2, h: 1 },
      { type: "gaming_chair", x: 2, y: 2 },
      { type: "gaming_chair", x: 5, y: 2 },
      // Living room
      { type: "sofa", x: 1, y: 4, w: 2, h: 1 },
      { type: "coffee_table", x: 3, y: 4, w: 1, h: 1 },
      { type: "rug", x: 1, y: 3, w: 4, h: 1 },
      // Equipment & decorations
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
      // Warm kitchen-centered style
      { type: "kitchen_island", x: 3, y: 2, w: 2, h: 1 },
      { type: "kitchen_counter", x: 1, y: 1, w: 3, h: 1 },
      { type: "stove", x: 1, y: 3, w: 1, h: 1 },
      { type: "fridge", x: 7, y: 1, w: 1, h: 1 },
      // Dining table
      { type: "dining_table", x: 5, y: 1, w: 2, h: 1 },
      { type: "chair", x: 5, y: 2 }, { type: "chair", x: 6, y: 2 },
      // Decorations
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
      // Lecture hall front
      { type: "podium", x: 7, y: 1 },
      { type: "blackboard", x: 4, y: 0.5, w: 6, h: 1 },
      { type: "projector", x: 7, y: 0.3 },
      { type: "university_banner", x: 1, y: 0.5, w: 2, h: 1 },
      // Student desks (tiered 5col x 3row)
      { type: "student_desk", x: 3, y: 3 }, { type: "student_desk", x: 5, y: 3 },
      { type: "student_desk", x: 7, y: 3 }, { type: "student_desk", x: 9, y: 3 },
      { type: "student_desk", x: 11, y: 3 },
      { type: "student_desk", x: 3, y: 5 }, { type: "student_desk", x: 5, y: 5 },
      { type: "student_desk", x: 7, y: 5 }, { type: "student_desk", x: 9, y: 5 },
      { type: "student_desk", x: 11, y: 5 },
      { type: "student_desk", x: 3, y: 7 }, { type: "student_desk", x: 5, y: 7 },
      { type: "student_desk", x: 7, y: 7 }, { type: "student_desk", x: 9, y: 7 },
      { type: "student_desk", x: 11, y: 7 },
      // Wall
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
      // Research desks
      { type: "desk", x: 2, y: 2, w: 2, h: 1 },
      { type: "desk", x: 5, y: 2, w: 2, h: 1 },
      { type: "desk", x: 8, y: 2, w: 2, h: 1 },
      { type: "desk", x: 2, y: 5, w: 2, h: 1 },
      { type: "desk", x: 5, y: 5, w: 2, h: 1 },
      { type: "desk", x: 8, y: 5, w: 2, h: 1 },
      // Chairs
      { type: "chair", x: 3, y: 3 }, { type: "chair", x: 6, y: 3 },
      { type: "chair", x: 9, y: 3 },
      { type: "chair", x: 3, y: 6 }, { type: "chair", x: 6, y: 6 },
      { type: "chair", x: 9, y: 6 },
      // Research equipment
      { type: "whiteboard", x: 1, y: 1, w: 1, h: 2 },
      { type: "bookshelf", x: 11, y: 1, w: 1, h: 3 },
      { type: "lab_bench", x: 1, y: 4, w: 1, h: 2 },
      { type: "computer_cluster", x: 11, y: 5, w: 1, h: 2 },
      { type: "paper_wall", x: 1, y: 7, w: 2, h: 1 },
      // Amenities
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
      // Standing desks
      { type: "standing_desk", x: 2, y: 2, w: 2, h: 1 },
      { type: "standing_desk", x: 5, y: 2, w: 2, h: 1 },
      { type: "standing_desk", x: 8, y: 2, w: 2, h: 1 },
      { type: "desk", x: 2, y: 4, w: 2, h: 1 },
      { type: "desk", x: 5, y: 4, w: 2, h: 1 },
      { type: "desk", x: 8, y: 4, w: 2, h: 1 },
      // Chairs
      { type: "chair", x: 3, y: 3 }, { type: "chair", x: 6, y: 3 },
      { type: "chair", x: 9, y: 3 },
      { type: "chair", x: 3, y: 5 }, { type: "chair", x: 6, y: 5 },
      { type: "chair", x: 9, y: 5 },
      // Equipment
      { type: "whiteboard", x: 1, y: 1, w: 1, h: 2 },
      { type: "neon_sign", x: 5, y: 0.5, w: 2, h: 0.5 },
      { type: "counter", x: 10, y: 1, w: 2, h: 1 },
      // Lounge area
      { type: "bean_bag", x: 1, y: 6 },
      { type: "bean_bag", x: 2.5, y: 6 },
      // Decorations
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
      // Kitchen
      { type: "kitchen_counter", x: 3, y: 0.5, w: 4, h: 1 },
      { type: "stove", x: 8, y: 1, w: 1, h: 1 },
      { type: "fridge", x: 9, y: 1, w: 1, h: 1 },
      { type: "menu_board", x: 1, y: 0.5, w: 2, h: 1 },
      // 4 dining tables
      { type: "dining_table", x: 2, y: 3, w: 2, h: 1 },
      { type: "dining_table", x: 6, y: 3, w: 2, h: 1 },
      { type: "dining_table", x: 2, y: 5.5, w: 2, h: 1 },
      { type: "dining_table", x: 6, y: 5.5, w: 2, h: 1 },
      // Chairs
      { type: "chair", x: 2, y: 4 }, { type: "chair", x: 3, y: 4 },
      { type: "chair", x: 6, y: 4 }, { type: "chair", x: 7, y: 4 },
      { type: "chair", x: 2, y: 6.5 }, { type: "chair", x: 3, y: 6.5 },
      { type: "chair", x: 6, y: 6.5 }, { type: "chair", x: 7, y: 6.5 },
      // Decorations
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
      // Reception desk
      { type: "counter", x: 3, y: 1, w: 4, h: 1 },
      // Waiting seats
      { type: "chair", x: 2, y: 3 }, { type: "chair", x: 4, y: 3 },
      { type: "chair", x: 6, y: 3 },
      // Examination room
      { type: "exam_bed", x: 1, y: 5, w: 2, h: 2 },
      { type: "curtain_divider", x: 3.5, y: 5, w: 0.3, h: 2 },
      { type: "bed", x: 5, y: 5, w: 2, h: 2 },
      // Equipment
      { type: "medicine_cabinet", x: 9, y: 1, w: 1, h: 2 },
      { type: "desk", x: 8, y: 4, w: 2, h: 1 },
      { type: "chair", x: 9, y: 5 },
      { type: "sink", x: 1, y: 1 },
      // Decorations
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
      // 3 rows of shelves
      { type: "shelf", x: 1, y: 1, w: 2, h: 1 },
      { type: "shelf", x: 1, y: 3, w: 2, h: 1 },
      { type: "shelf", x: 1, y: 5, w: 2, h: 1 },
      { type: "shelf", x: 5, y: 1, w: 2, h: 1 },
      { type: "shelf", x: 5, y: 3, w: 2, h: 1 },
      // Checkout counter
      { type: "checkout_counter", x: 3, y: 6, w: 2, h: 1 },
      // Refrigerated section
      { type: "fridge", x: 7, y: 1, w: 1, h: 2 },
      { type: "fridge", x: 7, y: 4, w: 1, h: 2 },
      // Magazine/display
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
      // Office area
      { type: "desk", x: 2, y: 2, w: 2, h: 1 },
      { type: "desk", x: 6, y: 2, w: 2, h: 1 },
      { type: "chair", x: 3, y: 3 }, { type: "chair", x: 7, y: 3 },
      // Evidence board & equipment
      { type: "evidence_board", x: 4, y: 0.5, w: 3, h: 1 },
      { type: "radio_equipment", x: 9, y: 1 },
      { type: "filing_cabinet", x: 9, y: 3, w: 1, h: 2 },
      // Holding cell
      { type: "holding_area", x: 1, y: 5, w: 3, h: 2 },
      // Filing shelves
      { type: "shelf", x: 1, y: 1, w: 1, h: 2 },
      { type: "bookshelf", x: 9, y: 6, w: 1, h: 2 },
      // Decorations
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
      // Exercise equipment
      { type: "treadmill", x: 2, y: 2, w: 2, h: 1 },
      { type: "treadmill", x: 5, y: 2, w: 2, h: 1 },
      { type: "weight_rack", x: 9, y: 1, w: 2, h: 2 },
      { type: "bench_press", x: 2, y: 5, w: 2, h: 1 },
      { type: "bench_press", x: 5, y: 5, w: 2, h: 1 },
      // Wall fixtures
      { type: "mirror_wall", x: 1, y: 1, w: 1, h: 3 },
      { type: "water_fountain", x: 11, y: 5 },
      { type: "shelf", x: 11, y: 7, w: 1, h: 2 },
      // Mat area
      { type: "rug", x: 2, y: 7, w: 4, h: 2 },
      { type: "rug", x: 7, y: 7, w: 3, h: 2 },
      // Bench & decorations
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

// ─── Game Balance Constants ───
export const GAME = {
  // Distances (tiles)
  GOSSIP_RANGE: 6,
  PROACTIVE_GREET_DIST: 3.5,
  TAG_CANDIDATE_RANGE: 25,
  AMBIENT_SPEECH_RANGE: 15,
  AUTO_CONVO_DIST: 1.75,
  TAG_CATCH_DIST: 1.5,
  GUIDE_ARRIVE_DIST: 2.0,
  SEAT_CHECK_DIST: 1.0,
  PIN_NPC_RANGE_MULT: 2.0,

  // Timings (seconds unless noted)
  SPEECH_BUBBLE_SEC: 4,
  LLM_TIMEOUT_MS: 15000,
  LLM_STREAM_TIMEOUT_MS: 20000,
  TAG_DURATION_MS: 60000,
  TALK_COOLDOWN_SEC: 3.5,
  AUTO_WALK_COOLDOWN_SEC: 4.2,
  TAG_SPRINT_MS: 1500,
  MEMORY_SYNC_MS: 300000,
  CONTEMPLATION_MIN_MS: 6000,
  CONTEMPLATION_RANGE_MS: 4000,

  // Probabilities (0-1)
  PROACTIVE_GREET_CHANCE: 0.15,
  MOOD_CHANGE_CHANCE: 0.001,
  ROAM_REPICK_CHANCE: 0.003,
  MULTI_TURN_CHANCE: 0.5,

  // NPC Need rates (per second)
  NEED_HUNGER_RATE: 0.08,
  NEED_ENERGY_RATE: 0.05,
  NEED_SOCIAL_RATE: 0.03,
  NEED_FUN_RATE: 0.04,
  NEED_DUTY_RATE: 0.06,

  // NPC Need recovery rates (per second)
  NEED_HUNGER_RECOVERY: 2.0,
  NEED_ENERGY_RECOVERY: 0.5,
  NEED_SOCIAL_RECOVERY: 0.3,
  NEED_FUN_RECOVERY: 0.4,
  NEED_DUTY_RECOVERY: 0.8,

  // Tag game
  TAG_CHASE_SPEED_RATIO: 0.95,
  TAG_SPRINT_MULTIPLIER: 1.3,
};
