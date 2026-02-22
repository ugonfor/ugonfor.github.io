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
