import { npcRelationLabel } from '../utils/helpers.js';
import { speciesPool, favorLevelNames } from '../core/constants.js';

/**
 * NPC factory and memory management functions.
 */

function randomSpecies() {
  return speciesPool[Math.floor(Math.random() * speciesPool.length)];
}

export function makeNpc(id, name, color, home, work, hobby, personality = "", species = randomSpecies()) {
  return {
    id, name, color, species,
    x: home.x, y: home.y,
    speed: 2 + Math.random() * 0.9,
    home, work, hobby,
    state: "idle",
    pose: "standing",
    talkCooldown: 0,
    memory: { entries: [], lastConversation: 0, conversationCount: 0, giftsReceived: 0, questsShared: 0 },
    personality,
    roamTarget: null,
    roamWait: 0,
    roamRadius: 2.4 + Math.random() * 2.1,
    nextLongTripAt: 8 + Math.random() * 14,
    mood: "neutral",
    moodUntil: 0,
    needs: {
      hunger: Math.random() * 30,
      energy: 80 + Math.random() * 20,
      social: 50 + Math.random() * 30,
      fun: 50 + Math.random() * 30,
      duty: Math.random() * 20,
    },
    favorLevel: 0,
    favorPoints: 0,
    activeRequest: null,
    lastRequestAt: 0,
    currentScene: "outdoor",
  };
}

export function ensureMemoryFormat(npc) {
  if (!npc.memory || Array.isArray(npc.memory)) {
    npc.memory = { entries: [], lastConversation: 0, conversationCount: 0, giftsReceived: 0, questsShared: 0 };
  }
  if (!Array.isArray(npc.memory.entries)) npc.memory.entries = [];
  if (!npc.memory.conversationCount) npc.memory.conversationCount = 0;
  if (!npc.memory.giftsReceived) npc.memory.giftsReceived = 0;
  if (!npc.memory.questsShared) npc.memory.questsShared = 0;
  return npc.memory;
}

export function addNpcMemory(npc, type, summary, metadata, totalMinutes) {
  const mem = ensureMemoryFormat(npc);
  mem.entries.push({ type, summary, metadata: metadata || {}, time: totalMinutes });
  if (mem.entries.length > 20) mem.entries.shift();
}

export function getNpcMemorySummary(npc, t) {
  const mem = ensureMemoryFormat(npc);
  if (mem.entries.length === 0) return "";
  const levelName = favorLevelNames[npc.favorLevel] || t("relation_stranger");
  const recent = mem.entries.slice(-8);
  const lines = recent.map((e) => {
    if (e.type === "chat") return `[대화] ${e.summary}`;
    if (e.type === "gift") return `[선물] ${e.summary}`;
    if (e.type === "quest") return `[퀘스트] ${e.summary}`;
    if (e.type === "favor") return `[관계] ${e.summary}`;
    return `[기타] ${e.summary}`;
  });
  const stats = `대화 ${mem.conversationCount}회, 선물 ${mem.giftsReceived}회, 퀘스트 ${mem.questsShared}회`;
  return `관계: ${levelName} (호감도 ${npc.favorLevel}단계)\n통계: ${stats}\n최근 기억:\n${lines.join("\n")}`;
}

export function getNpcSocialContext(npc, npcs, getNpcRelation) {
  const others = npcs.filter(n => n.id !== npc.id).slice(0, 6);
  if (others.length === 0) return "";
  const lines = others.map(o => {
    const rel = getNpcRelation(npc.id, o.id);
    return `${o.name}: ${npcRelationLabel(rel)}(${rel})`;
  });
  return "다른 NPC와의 관계:\n" + lines.join(", ");
}

export function getMemoryBasedTone(npc) {
  const level = npc.favorLevel || 0;
  if (level <= 0) return "정중한 존댓말로 대화하세요. 아직 서먹한 사이입니다.";
  if (level === 1) return "정중하지만 약간 친근한 존댓말로 대화하세요.";
  if (level === 2) return "편한 존댓말이나 가벼운 반말을 섞어 대화하세요.";
  if (level === 3) return "친근한 반말로 대화하세요. 친한 친구처럼 대해주세요.";
  return "매우 친밀한 반말로 대화하세요. 오랜 절친처럼 대해주세요.";
}
