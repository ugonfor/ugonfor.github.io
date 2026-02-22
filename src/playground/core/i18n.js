// ─── Internationalization (i18n) Translation Table ───
export const translations = {
  ko: {
    // System messages
    sys_save_ok: "저장 완료",
    sys_load_ok: "불러오기 완료",
    sys_no_save: "저장 데이터 없음",
    sys_npc_busy: "{name}은(는) 잠시 바쁩니다.",
    sys_no_npc_nearby: "근처에 대화 가능한 NPC가 없습니다.",
    sys_wake_npc: "{name}을(를) 깨웠습니다.",
    sys_wake_bubble: "음... 뭐야...",
    sys_tag_start: "🏃 도망쳐! {name}에게서 60초간 도망치세요!",
    sys_tag_win: "🎉 도망 성공! {name}에게서 60초간 도망쳤습니다!",
    sys_tag_lose: "😱 잡혔다! {name}에게 잡혔습니다...",
    sys_tag_active: "이미 술래잡기 진행 중!",
    sys_tag_no_npc: "주변에 술래잡기할 NPC가 없습니다.",
    sys_mp_connected: "멀티플레이어 모드가 활성화되었습니다.",
    sys_companion_start: "{name}이(가) 동행합니다.",
    sys_companion_end: "{name}이(가) 동행을 멈춥니다.",
    sys_guide_arrive: "여기 {name}이(가) 있어요!",
    sys_llm_lost: "나 말하는 법을 까먹은 거 같아...",
    sys_sim_pause: "시뮬레이션 일시정지",
    sys_sim_resume: "시뮬레이션 재개",
    sys_no_gift_item: "선물할 아이템이 없습니다. 바닥에서 아이템을 주워보세요.",
    sys_no_npc_near_chat: "근처 NPC가 없습니다. 먼저 NPC 옆으로 이동해 주세요.",
    sys_no_gift_target: "선물할 대상이 근처에 없습니다.",
    sys_tag_zone_only: "놀이터 근처에서만 술래잡기를 할 수 있습니다! 🏃",
    sys_stream_partial: "스트리밍이 중단되어 응답 일부만 도착했습니다.",
    sys_llm_chat_on: "근처 NPC와 한국어 LLM 채팅이 활성화되었습니다.",
    sys_llm_chat_off: "LLM 엔드포인트가 없어 로컬 대화 모드로 동작합니다.",
    sys_discovery: "✨ 새로운 발견: {title}!",
    sys_favor_cancel: "대상 NPC가 더 이상 존재하지 않아 요청이 취소됩니다.",
    sys_item_pickup: "{emoji} {label}을(를) 주웠습니다!{extra} (보유: {count})",
    sys_quest_reward: "🎁 보상: {emoji} {label} 획득!",
    sys_urgent_bonus: "⚡ 긴급 배달 보너스! 빠른 완료 ({sec}초)",
    sys_quest_complete: "퀘스트 '{title}' 완료!",
    sys_new_quest: "새 퀘스트: {title}",
    sys_npc_left_skip: "대상 NPC가 떠나서 이 단계를 건너뜁니다.",
    sys_arrived_default: "목적지에 도착했습니다.",
    sys_tag_playground: "🏃 놀이터에서 술래잡기! {name}이(가) 술래! 60초간 도망치세요!",
    sys_inventory: "인벤토리: {summary}",
    sys_npc_removed: "{name}이(가) 월드에서 제거되었습니다.",
    sys_received_item: "{npc}에게서 {label}을(를) 받았습니다!",
    sys_moving_to_npc: "{name}에게 이동합니다. 도착하면 대화할 수 있습니다.",
    sys_cannot_move_to_npc: "{name} 주변으로 이동할 수 없습니다.",
    sys_npc_arrived: "{name} 근처에 도착했습니다. 이제 대화할 수 있습니다.",
    sys_select_1_to_4: "1~4 중에서 선택해주세요.",
    sys_select_1_to_3: "1~3 중에서 선택해주세요.",
    sys_tag_chat_you: "좋아, 술래잡기 하자!",
    sys_tag_chat_npc: "잡으러 간다~! 👹",
    sys_board_stage: "📋 {title} ({stage}/{total}단계)",
    sys_board_stage_simple: "📋 {title} ({stage}단계)",
    sys_board_objective: "   목표: {objective}",
    sys_board_progress: "   진행도: {bar} {pct}%",
    sys_board_more: "  ... 외 {count}개",

    // Seasons
    season_spring: "🌸 봄이 왔습니다! 꽃이 더 자주 피어납니다.",
    season_summer: "☀️ 여름입니다! NPC들이 활발하게 활동합니다.",
    season_fall: "🍂 가을입니다! 시장에 특별 상품이 등장합니다.",
    season_winter: "❄️ 겨울입니다! NPC들이 실내에 머무르는 시간이 늘어납니다.",
    season_change: "계절이 {season}(으)로 바뀌었습니다.",

    // Inventory
    inv_empty: "없음",

    // NPC gift reactions
    gift_react_1: "와, {label}! 정말 고마워!",
    gift_react_2: "{label}을(를) 받다니 감동이야!",
    gift_react_3: "이거 내가 좋아하는 건데! 고마워!",

    // Player default name
    default_player_name: "플레이어",

    // Player name change
    log_name_changed: "플레이어 이름이 '{name}'(으)로 변경되었습니다.",

    // NPC creation/removal
    npc_err_no_name: "이름을 입력해 주세요.",
    npc_err_dup_name: "이미 있는 이름입니다.",
    npc_err_too_many: "월드 내 NPC가 너무 많습니다.",
    npc_err_no_query: "제거할 NPC 이름을 입력해 주세요.",
    npc_err_not_found: "'{query}' NPC를 찾을 수 없습니다.",
    log_shared_npc_sync: "공유 NPC {count}명이 월드에 반영되었습니다.",
    log_shared_npc_fail: "공유 NPC 동기화에 실패했습니다.",
    log_npc_removed: "{name} NPC가 제거되었습니다.",
    log_shared_npc_create_fail: "공유 NPC 생성 실패: {err}",
    log_npc_joined: "새 캐릭터가 합류했습니다: {name}",
    npc_creating: "생성 중...",
    npc_created: "생성됨: {name}",
    npc_select: "NPC 선택",

    // Mobile panel buttons
    mobile_panel_close: "패널 닫기",
    mobile_panel_open: "패널 열기",
    mobile_expand: "펼치기",
    mobile_collapse: "접기",
    mobile_pickup: "줍기 {emoji}",

    // Auto walk
    autowalk_on: "자동산책 켜기",
    autowalk_off: "자동산책 끄기",
    autowalk_on_short: "산책켜기",
    autowalk_off_short: "산책끄기",
    log_autowalk_on: "자동 산책 모드가 켜졌습니다.",
    log_autowalk_off: "자동 산책 모드가 꺼졌습니다.",

    // Tag game logs
    log_tag_win: "술래잡기 승리!",
    log_tag_lose: "술래잡기 실패...",

    // Building / hotspot logs
    log_entered_building: "{label}에 들어왔습니다.",
    log_exited_building: "밖으로 나왔습니다.",
    log_checked_building: "{label}을(를) 확인했습니다.",
    log_leaving_playground: "플레이그라운드를 떠나는 중... 소개 페이지로 돌아갑니다.",
    log_monument: "기념비에 희미한 무늬가 새겨져 있습니다.",
    log_market_board: "게시판: '야시장은 20시에 광장 근처에서 시작됩니다.'",
    log_tag_indoor: "실내에서는 술래잡기를 할 수 없습니다.",

    // Discovery
    log_discovery: "🔍 발견! \"{title}\" — {desc}",

    // LLM connection logs
    log_llm_restored: "LLM 연결이 복구되었습니다.",
    log_llm_fallback: "LLM 연결이 불안정해 로컬 응답으로 전환했습니다.",

    // World events
    log_new_day: "시뮬레이션에서 새로운 하루가 시작됩니다.",
    log_cafe_open: "카페가 열리고 아침 루틴이 시작됩니다.",
    log_night_market: "광장 근처에서 야시장이 열렸습니다.",
    log_park_aura: "공원 기념비 근처에서 이상한 기운이 느껴집니다.",
    log_load_fail: "저장된 상태를 불러오지 못했습니다.",
    log_view_reset: "시점을 초기화했습니다.",
    log_world_init: "월드가 초기화되었습니다. NPC와 상호작용해 보세요.",
    log_mp_connected: "멀티플레이어 연결됨!",
    log_mp_fail: "멀티플레이어 초기화 실패: {err}",
    log_npc_chat: "{a}과 {b}이 대화합니다.",

    // NPC guide logs
    log_guide_to_npc: "{npc}이(가) {target}에게 안내합니다.",
    log_guide_to_place: "{npc}이(가) {place}(으)로 안내합니다.",

    // Weather (canvas HUD)
    weather_cloudy: "☁️ 흐림",
    weather_rain: "🌧️ 비",
    weather_storm: "⛈️ 폭풍",
    weather_snow: "❄️ 눈",
    weather_fog: "🌫️ 안개",

    // Weather (debug log)
    weather_clear_name: "맑음",
    weather_cloudy_name: "흐림",
    weather_rain_name: "비",
    weather_storm_name: "폭풍우",
    weather_snow_name: "눈",
    weather_fog_name: "안개",
    log_weather_change: "날씨 변경: {name}",

    // Canvas labels
    canvas_playground: "🏃 놀이터",
    canvas_exit: "출구",
    canvas_indoor: "실내",

    // UI nearby
    npc_state_idle: "대기",
    npc_state_moving: "이동 중",
    npc_state_chatting: "대화 중",
    ui_nearby: "근처: {name} ({state})",
    ui_nearby_none: "근처: 없음",
    ui_quest_done: "퀘스트: {title} - 완료",
    ui_quest_active: "퀘스트: {title} - {objective}",
    ui_online: "접속자: {count}명",

    // Chat state
    chat_state_global: "상태: 전체 채팅",
    chat_state_unavailable: "상태: 대화 불가",
    chat_state_moving: "상태: 대상에게 이동 중",
    chat_state_locked: "상태: 대화 고정",
    chat_state_chatting: "상태: 대화 중",
    chat_state_selected: "상태: 클릭 선택됨",
    chat_state_nearby: "상태: 근거리 대화 가능",

    // Chat model
    chat_model_local: "모델: 로컬 응답",
    chat_model_active: "모델: {model}",
    chat_model_error: "모델: 로컬 응답 (LLM 오류)",

    // UI toggle
    ui_show: "UI 보기",
    ui_hide: "UI 숨기기",

    // Suggestions (contextual)
    suggest_play: "같이 놀자!",
    suggest_really: "진짜야?",
    suggest_walk: "산책 갈래?",
    suggest_yes: "응!",
    suggest_no: "아니",
    suggest_where_npc: "{name} 어디 있어?",
    suggest_take_me: "{name}한테 데려다줘",

    // Favor quest labels
    favor_request_title: "{name}의 부탁",
    favor_request_bring: "{label}을(를) 가져다 주세요.",
    favor_deliver_title: "{name}에게 전달",
    favor_deliver_desc: "{name}에게 가서 말을 전해주세요.",
    favor_need_item: "{label}이(가) 필요해요.",
    favor_complete: "✅ '{title}' 완료! (호감도 +{points})",
    favor_still_need: "아직 {label}이(가) 없네. 구해와줘!",

    // Ambient speech (NPC memory lines)
    ambient_gift_remember: "그때 받은 선물… 아직 간직하고 있어.",
    ambient_gift_thanks: "선물 고마웠어.",
    ambient_quest_memory: "같이 퀘스트 했던 거 기억나.",
    ambient_meet_often: "요즘 자주 만나니까 좋다.",
    ambient_talked_alot: "우리 이제 꽤 많이 얘기했네.",

    // Ambient NPC species lines
    ambient_a1: "오늘 햇빛 좋다.",
    ambient_a2: "산책 코스 괜찮네.",
    ambient_b1: "카페 들를까?",
    ambient_b2: "기분 전환이 되네.",
    ambient_c1: "꽃이 많이 폈다.",
    ambient_c2: "바람이 시원하다.",
    ambient_d1: "오늘은 천천히 걷자.",
    ambient_d2: "생각 정리하기 좋네.",
    ambient_e1: "마켓 쪽이 붐비네.",
    ambient_e2: "여기 분위기 좋다.",
    ambient_f1: "길이 꽤 예쁘네.",
    ambient_f2: "잠깐 쉬었다 가자.",
    ambient_g1: "오늘도 힘내보자.",
    ambient_g2: "이 동네 마음에 든다.",
    ambient_h1: "조용해서 좋네.",
    ambient_h2: "조금 더 걸어볼까.",
    ambient_i1: "저녁되면 더 예쁘겠다.",
    ambient_i2: "오늘은 여유롭네.",
    ambient_fallback_1: "안녕!",
    ambient_fallback_2: "오늘 어때?",
    ambient_fallback_3: "산책 중이야.",
    ambient_fallback_4: "여기 분위기 좋다.",

    // Player fallback lines
    player_line_1: "어디로 갈까?",
    player_line_2: "산책 좋다.",
    player_line_3: "다음엔 누구랑 얘기하지?",

    // Ambient emoji / sounds
    ambient_solo: ["🎵", "🎶", "~♪", "흠흠", "후~", "라라~", "음~"],
    ambient_chat: ["ㅎㅎ", "와~", "그래?", "맞아", "음음", "오~", "헤헤"],
    ambient_mood_happy: ["😊", "~♪", "흐흐"],
    ambient_mood_sad: ["😔", "후...", "하아"],
    ambient_mood_neutral: ["🤔", "음", "..."],

    // Docent info center
    docent_welcome: "안녕하세요! 안내소에 오신 걸 환영합니다. 무엇이 궁금하세요?",
    docent_menu_title: "━━ 안내소 메뉴 ━━",
    docent_menu_prompt: "채팅창에 번호를 입력하세요:",
    docent_menu_1: "1. 이 마을은 뭐하는 곳이야?",
    docent_menu_2: "2. 여기서 뭘 할 수 있어?",
    docent_menu_3: "3. 주변 NPC를 소개해줘",
    docent_menu_4: "4. 장소를 알려줘",
    docent_fallback_name: "안내원",
    docent_intro_1: "여기는 Hyogon Ryu의 개인 홈페이지 속 Playground예요!",
    docent_intro_2: "AI NPC들이 살아가는 작은 오픈 월드입니다.",
    docent_intro_3: "NPC들과 대화하고, 퀘스트를 수행하고, 마을을 탐험해보세요.",
    docent_activities_title: "할 수 있는 것들을 알려드릴게요!",
    docent_act_move: "🚶 WASD로 이동, Shift로 달리기",
    docent_act_chat: "💬 E키로 NPC와 대화 (채팅창에서 직접 대화도 가능)",
    docent_act_quest: "📋 퀘스트를 수행하면 NPC 호감도를 얻어요",
    docent_act_gift: "🎁 NPC에게 선물하면 관계가 좋아져요",
    docent_act_tag: "🏃 놀이터에서 술래잡기! NPC에게서 도망치세요",
    docent_act_discover: "🗺️ 숨겨진 발견 장소들이 곳곳에 있어요",
    docent_npc_title: "현재 마을에 있는 주민들을 소개할게요!",
    docent_npc_unknown: "알 수 없음",
    docent_places_title: "주요 장소들을 알려드릴게요!",
    docent_place_cafe: "☕ 카페 — NPC들이 쉬러 오는 곳",
    docent_place_office: "🏢 사무실 — 낮에 NPC들이 일하는 곳",
    docent_place_market: "🏪 시장 — 아이템 거래소",
    docent_place_park: "🌳 공원 — 기념비와 발견 장소가 있어요",
    docent_place_ksa: "🏫 KSA 본관/기숙사 — 학생 NPC들의 생활 공간",
    docent_place_facilities: "📚 도서관, 🍞 빵집, 🌸 꽃집 — 마을 시설들",
    docent_place_playground: "🏃 놀이터 — 술래잡기 미니게임!",
    docent_place_info: "📋 안내소 — 바로 여기! 언제든 다시 오세요",

    // NPC relation labels (used in memory)
    relation_stranger: "낯선 사이",

    // Quest objective
    quest_complete: "완료",

    // Toast: moving to NPC
    toast_moving_to_npc: "{name}에게 이동 중입니다. 가까이 가면 대화할 수 있습니다.",

    // HUD
    hud_paused: "(일시정지)",

    // Chat
    chat_placeholder_npc: "NPC에게 말 걸기...",
    chat_placeholder_mp: "플레이어에게 말하기...",
    chat_send: "전송",
    chat_target_none: "대상: 없음",
    chat_target_npc: "대상: {name}",
    chat_target_mp: "대상: 전체 채팅",

    // Suggestions (docent)
    suggest_docent_1: "이 마을에 대해 알려줘",
    suggest_docent_2: "여기서 뭘 할 수 있어?",
    suggest_docent_3: "주민들을 소개해줘",

    // Suggestions (friendly)
    suggest_friend_1: "요즘 어때?",
    suggest_friend_2: "뭐 하고 있었어?",
    suggest_friend_3: "나한테 할 말 있어?",

    // Suggestions (stranger)
    suggest_stranger_1: "안녕하세요",
    suggest_stranger_2: "여기는 어떤 곳이에요?",
    suggest_stranger_3: "이름이 뭐예요?",

    // Follow-up suggestions (after NPC reply)
    suggest_food_1: "맛있겠다!",
    suggest_food_2: "추천해줘",
    suggest_people_1: "그 사람 어디 있어?",
    suggest_people_2: "소개해줘",
    suggest_place_1: "같이 가자",
    suggest_place_2: "거기 어디야?",
    suggest_care_1: "괜찮아?",
    suggest_care_2: "내가 도와줄까?",
    suggest_more: "더 얘기해줘",
    suggest_thanks: "고마워!",
    suggest_bye: "다음에 보자",

    // Quest board
    board_title: "📜 ━━ 마을 게시판 ━━",
    board_prompt: "채팅창에 번호를 입력하세요:",
    board_opt1: "1. 현재 퀘스트 확인",
    board_opt2: "2. 완료한 퀘스트 목록",
    board_current_title: "━━ 현재 퀘스트 ━━",
    board_no_quest: "진행 중인 퀘스트가 없습니다.",
    board_completed_title: "━━ 완료한 퀘스트 ({count}개) ━━",
    board_no_history: "아직 완료한 퀘스트가 없습니다.",

    // Docent welcome
    docent_hi: "안녕하세요! 이 마을에 오신 걸 환영해요.",
    docent_hi2: "저는 안내원 유진이에요. 주민들에게 말을 걸어보세요!",

    // Mobile buttons
    mobile_exit: "나가기",
    mobile_interact: "상호작용",
    mobile_talk: "대화",

    // Hotspot labels
    hs_exit: "나가기",
    hs_board: "📜 게시판",
    hs_info: "📋 안내소",
    hs_playground: "🏃 술래잡기!",

    // Language selector
    lang_ko: "한국어",
    lang_en: "English",
  },

  en: {
    // System messages
    sys_save_ok: "Save complete",
    sys_load_ok: "Load complete",
    sys_no_save: "No save data",
    sys_npc_busy: "{name} is busy right now.",
    sys_no_npc_nearby: "No NPCs nearby to talk to.",
    sys_wake_npc: "You woke up {name}.",
    sys_wake_bubble: "Mmm... what...",
    sys_tag_start: "🏃 Run! Escape from {name} for 60 seconds!",
    sys_tag_win: "🎉 You escaped! Survived 60 seconds from {name}!",
    sys_tag_lose: "😱 Caught! {name} got you...",
    sys_tag_active: "Tag game already in progress!",
    sys_tag_no_npc: "No NPCs nearby for tag.",
    sys_mp_connected: "Multiplayer mode activated.",
    sys_companion_start: "{name} is now your companion.",
    sys_companion_end: "{name} stopped following you.",
    sys_guide_arrive: "Here's {name}!",
    sys_llm_lost: "I think I forgot how to speak...",
    sys_sim_pause: "Simulation paused",
    sys_sim_resume: "Simulation resumed",
    sys_no_gift_item: "No items to gift. Try picking up items from the ground.",
    sys_no_npc_near_chat: "No NPCs nearby. Move closer to an NPC first.",
    sys_no_gift_target: "No one nearby to give a gift to.",
    sys_tag_zone_only: "You can only play tag near the playground! 🏃",
    sys_stream_partial: "Streaming was interrupted. Only a partial response was received.",
    sys_llm_chat_on: "LLM chat with nearby NPCs is active.",
    sys_llm_chat_off: "No LLM endpoint. Running in local dialogue mode.",
    sys_discovery: "✨ New discovery: {title}!",
    sys_favor_cancel: "Target NPC no longer exists. Request cancelled.",
    sys_item_pickup: "{emoji} Picked up {label}!{extra} (Have: {count})",
    sys_quest_reward: "🎁 Reward: {emoji} {label} acquired!",
    sys_urgent_bonus: "⚡ Urgent delivery bonus! Quick completion ({sec}s)",
    sys_quest_complete: "Quest '{title}' completed!",
    sys_new_quest: "New quest: {title}",
    sys_npc_left_skip: "Target NPC has left. Skipping this stage.",
    sys_arrived_default: "Arrived at the destination.",
    sys_tag_playground: "🏃 Tag at the playground! {name} is it! Escape for 60 seconds!",
    sys_inventory: "Inventory: {summary}",
    sys_npc_removed: "{name} has been removed from the world.",
    sys_received_item: "Received {label} from {npc}!",
    sys_moving_to_npc: "Moving to {name}. You can talk when you arrive.",
    sys_cannot_move_to_npc: "Cannot move near {name}.",
    sys_npc_arrived: "Arrived near {name}. You can talk now.",
    sys_select_1_to_4: "Please select from 1 to 4.",
    sys_select_1_to_3: "Please select from 1 to 3.",
    sys_tag_chat_you: "Alright, let's play tag!",
    sys_tag_chat_npc: "I'm coming for you~! 👹",
    sys_board_stage: "📋 {title} (Stage {stage}/{total})",
    sys_board_stage_simple: "📋 {title} (Stage {stage})",
    sys_board_objective: "   Objective: {objective}",
    sys_board_progress: "   Progress: {bar} {pct}%",
    sys_board_more: "  ... and {count} more",

    // Seasons
    season_spring: "🌸 Spring has arrived! Flowers bloom more often.",
    season_summer: "☀️ It's summer! NPCs are more active.",
    season_fall: "🍂 It's autumn! Special items appear at the market.",
    season_winter: "❄️ It's winter! NPCs spend more time indoors.",
    season_change: "The season has changed to {season}.",

    // Inventory
    inv_empty: "Empty",

    // NPC gift reactions
    gift_react_1: "Wow, {label}! Thank you so much!",
    gift_react_2: "I'm so touched to receive {label}!",
    gift_react_3: "This is my favorite! Thanks!",

    // Player default name
    default_player_name: "Player",

    // Player name change
    log_name_changed: "Player name changed to '{name}'.",

    // NPC creation/removal
    npc_err_no_name: "Please enter a name.",
    npc_err_dup_name: "That name already exists.",
    npc_err_too_many: "Too many NPCs in the world.",
    npc_err_no_query: "Please enter the NPC name to remove.",
    npc_err_not_found: "Cannot find NPC '{query}'.",
    log_shared_npc_sync: "{count} shared NPC(s) synced to the world.",
    log_shared_npc_fail: "Failed to sync shared NPCs.",
    log_npc_removed: "{name} NPC has been removed.",
    log_shared_npc_create_fail: "Failed to create shared NPC: {err}",
    log_npc_joined: "New character joined: {name}",
    npc_creating: "Creating...",
    npc_created: "Created: {name}",
    npc_select: "Select NPC",

    // Mobile panel buttons
    mobile_panel_close: "Close Panel",
    mobile_panel_open: "Open Panel",
    mobile_expand: "Expand",
    mobile_collapse: "Collapse",
    mobile_pickup: "Pick up {emoji}",

    // Auto walk
    autowalk_on: "Auto Walk On",
    autowalk_off: "Auto Walk Off",
    autowalk_on_short: "Walk On",
    autowalk_off_short: "Walk Off",
    log_autowalk_on: "Auto walk mode enabled.",
    log_autowalk_off: "Auto walk mode disabled.",

    // Tag game logs
    log_tag_win: "Tag game won!",
    log_tag_lose: "Tag game lost...",

    // Building / hotspot logs
    log_entered_building: "Entered {label}.",
    log_exited_building: "Went outside.",
    log_checked_building: "Checked {label}.",
    log_leaving_playground: "Leaving playground... Returning to the intro page.",
    log_monument: "Faint patterns are carved into the monument.",
    log_market_board: "Board: 'The night market starts at 8 PM near the plaza.'",
    log_tag_indoor: "Can't play tag indoors.",

    // Discovery
    log_discovery: "🔍 Discovered! \"{title}\" — {desc}",

    // LLM connection logs
    log_llm_restored: "LLM connection restored.",
    log_llm_fallback: "LLM connection unstable. Switching to local responses.",

    // World events
    log_new_day: "A new day begins in the simulation.",
    log_cafe_open: "The cafe opens and morning routines begin.",
    log_night_market: "A night market has opened near the plaza.",
    log_park_aura: "A strange aura is felt near the park monument.",
    log_load_fail: "Failed to load saved state.",
    log_view_reset: "View has been reset.",
    log_world_init: "World initialized. Try interacting with NPCs.",
    log_mp_connected: "Multiplayer connected!",
    log_mp_fail: "Multiplayer init failed: {err}",
    log_npc_chat: "{a} and {b} are chatting.",

    // NPC guide logs
    log_guide_to_npc: "{npc} is guiding to {target}.",
    log_guide_to_place: "{npc} is guiding to {place}.",

    // Weather (canvas HUD)
    weather_cloudy: "☁️ Cloudy",
    weather_rain: "🌧️ Rain",
    weather_storm: "⛈️ Storm",
    weather_snow: "❄️ Snow",
    weather_fog: "🌫️ Fog",

    // Weather (debug log)
    weather_clear_name: "Clear",
    weather_cloudy_name: "Cloudy",
    weather_rain_name: "Rain",
    weather_storm_name: "Storm",
    weather_snow_name: "Snow",
    weather_fog_name: "Fog",
    log_weather_change: "Weather changed: {name}",

    // Canvas labels
    canvas_playground: "🏃 Playground",
    canvas_exit: "Exit",
    canvas_indoor: "Indoor",

    // UI nearby
    npc_state_idle: "Idle",
    npc_state_moving: "Moving",
    npc_state_chatting: "Chatting",
    ui_nearby: "Nearby: {name} ({state})",
    ui_nearby_none: "Nearby: None",
    ui_quest_done: "Quest: {title} - Complete",
    ui_quest_active: "Quest: {title} - {objective}",
    ui_online: "Online: {count}",

    // Chat state
    chat_state_global: "Status: Global Chat",
    chat_state_unavailable: "Status: Unavailable",
    chat_state_moving: "Status: Moving to target",
    chat_state_locked: "Status: Conversation locked",
    chat_state_chatting: "Status: Chatting",
    chat_state_selected: "Status: Click selected",
    chat_state_nearby: "Status: Nearby, can chat",

    // Chat model
    chat_model_local: "Model: Local response",
    chat_model_active: "Model: {model}",
    chat_model_error: "Model: Local response (LLM error)",

    // UI toggle
    ui_show: "Show UI",
    ui_hide: "Hide UI",

    // Suggestions (contextual)
    suggest_play: "Let's play together!",
    suggest_really: "Really?",
    suggest_walk: "Want to go for a walk?",
    suggest_yes: "Yes!",
    suggest_no: "No",
    suggest_where_npc: "Where is {name}?",
    suggest_take_me: "Take me to {name}",

    // Favor quest labels
    favor_request_title: "{name}'s request",
    favor_request_bring: "Please bring {label}.",
    favor_deliver_title: "Deliver to {name}",
    favor_deliver_desc: "Go deliver the message to {name}.",
    favor_need_item: "I need {label}.",
    favor_complete: "✅ '{title}' complete! (Favor +{points})",
    favor_still_need: "You still don't have {label}. Please find it!",

    // Ambient speech (NPC memory lines)
    ambient_gift_remember: "I still have that gift you gave me...",
    ambient_gift_thanks: "Thanks for the gift.",
    ambient_quest_memory: "I remember doing that quest together.",
    ambient_meet_often: "It's nice meeting you so often.",
    ambient_talked_alot: "We've talked quite a lot now.",

    // Ambient NPC species lines
    ambient_a1: "Nice sunshine today.",
    ambient_a2: "This walking path is nice.",
    ambient_b1: "Shall we stop by the cafe?",
    ambient_b2: "This is refreshing.",
    ambient_c1: "So many flowers blooming.",
    ambient_c2: "The breeze feels cool.",
    ambient_d1: "Let's walk slowly today.",
    ambient_d2: "Good place to clear your thoughts.",
    ambient_e1: "The market area is busy.",
    ambient_e2: "Nice atmosphere here.",
    ambient_f1: "This road is pretty.",
    ambient_f2: "Let's take a short break.",
    ambient_g1: "Let's do our best today.",
    ambient_g2: "I like this neighborhood.",
    ambient_h1: "It's nice and quiet.",
    ambient_h2: "Shall we walk a bit more?",
    ambient_i1: "It'll be even prettier at sunset.",
    ambient_i2: "It's a relaxed day.",
    ambient_fallback_1: "Hi!",
    ambient_fallback_2: "How's your day?",
    ambient_fallback_3: "Just taking a walk.",
    ambient_fallback_4: "Nice atmosphere here.",

    // Player fallback lines
    player_line_1: "Where should I go?",
    player_line_2: "Walking is nice.",
    player_line_3: "Who should I talk to next?",

    // Ambient emoji / sounds
    ambient_solo: ["🎵", "🎶", "~♪", "Hmm", "Phew~", "La la~", "Mm~"],
    ambient_chat: ["Heh", "Wow~", "Really?", "Right", "Mm", "Oh~", "Hehe"],
    ambient_mood_happy: ["😊", "~♪", "Heh"],
    ambient_mood_sad: ["😔", "Sigh...", "Haa"],
    ambient_mood_neutral: ["🤔", "Hmm", "..."],

    // Docent info center
    docent_welcome: "Hello! Welcome to the Info Center. What would you like to know?",
    docent_menu_title: "━━ Info Center Menu ━━",
    docent_menu_prompt: "Enter a number in chat:",
    docent_menu_1: "1. What is this village?",
    docent_menu_2: "2. What can I do here?",
    docent_menu_3: "3. Introduce the NPCs",
    docent_menu_4: "4. Show me the places",
    docent_fallback_name: "Guide",
    docent_intro_1: "This is the Playground inside Hyogon Ryu's personal homepage!",
    docent_intro_2: "It's a small open world where AI NPCs live.",
    docent_intro_3: "Chat with NPCs, do quests, and explore the village.",
    docent_activities_title: "Here's what you can do!",
    docent_act_move: "🚶 Move with WASD, run with Shift",
    docent_act_chat: "💬 Press E to talk to NPCs (or chat directly)",
    docent_act_quest: "📋 Complete quests to gain NPC favor",
    docent_act_gift: "🎁 Gifting items improves relationships",
    docent_act_tag: "🏃 Play tag at the playground! Run from NPCs",
    docent_act_discover: "🗺️ Hidden discovery spots are scattered around",
    docent_npc_title: "Let me introduce the current residents!",
    docent_npc_unknown: "Unknown",
    docent_places_title: "Here are the main locations!",
    docent_place_cafe: "☕ Cafe — Where NPCs come to relax",
    docent_place_office: "🏢 Office — Where NPCs work during the day",
    docent_place_market: "🏪 Market — Item trading post",
    docent_place_park: "🌳 Park — Has a monument and discovery spots",
    docent_place_ksa: "🏫 KSA Main/Dorm — Student NPC living space",
    docent_place_facilities: "📚 Library, 🍞 Bakery, 🌸 Florist — Village facilities",
    docent_place_playground: "🏃 Playground — Tag minigame!",
    docent_place_info: "📋 Info Center — Right here! Come back anytime",

    // NPC relation labels (used in memory)
    relation_stranger: "Stranger",

    // Quest objective
    quest_complete: "Complete",

    // Toast: moving to NPC
    toast_moving_to_npc: "Moving to {name}. You can talk when you're close.",

    // HUD
    hud_paused: "(paused)",

    // Chat
    chat_placeholder_npc: "Talk to NPC...",
    chat_placeholder_mp: "Talk to players...",
    chat_send: "Send",
    chat_target_none: "Target: None",
    chat_target_npc: "Target: {name}",
    chat_target_mp: "Target: All players",

    // Suggestions (docent)
    suggest_docent_1: "Tell me about this village",
    suggest_docent_2: "What can I do here?",
    suggest_docent_3: "Introduce the residents",

    // Suggestions (friendly)
    suggest_friend_1: "How are you lately?",
    suggest_friend_2: "What were you doing?",
    suggest_friend_3: "Got anything to tell me?",

    // Suggestions (stranger)
    suggest_stranger_1: "Hello",
    suggest_stranger_2: "What is this place?",
    suggest_stranger_3: "What's your name?",

    // Follow-up suggestions
    suggest_food_1: "That sounds yummy!",
    suggest_food_2: "Any recommendations?",
    suggest_people_1: "Where are they?",
    suggest_people_2: "Introduce me",
    suggest_place_1: "Let's go together",
    suggest_place_2: "Where is it?",
    suggest_care_1: "Are you okay?",
    suggest_care_2: "Can I help?",
    suggest_more: "Tell me more",
    suggest_thanks: "Thanks!",
    suggest_bye: "See you later",

    // Quest board
    board_title: "📜 ━━ Village Board ━━",
    board_prompt: "Enter a number in chat:",
    board_opt1: "1. Current quest",
    board_opt2: "2. Completed quests",
    board_current_title: "━━ Current Quest ━━",
    board_no_quest: "No active quests.",
    board_completed_title: "━━ Completed Quests ({count}) ━━",
    board_no_history: "No completed quests yet.",

    // Docent welcome
    docent_hi: "Hello! Welcome to our village.",
    docent_hi2: "I'm Yujin, the guide. Try talking to the residents!",

    // Mobile buttons
    mobile_exit: "Exit",
    mobile_interact: "Interact",
    mobile_talk: "Talk",

    // Hotspot labels
    hs_exit: "Exit",
    hs_board: "📜 Board",
    hs_info: "📋 Info",
    hs_playground: "🏃 Tag!",

    // Language selector
    lang_ko: "한국어",
    lang_en: "English",
  },
};
