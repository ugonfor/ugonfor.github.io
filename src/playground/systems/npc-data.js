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
  // 15개 초과 시 오래된 5개를 1줄 요약으로 압축
  if (mem.entries.length > 15) {
    compressOldMemories(npc);
  }
}

export function compressOldMemories(npc) {
  const mem = ensureMemoryFormat(npc);
  if (mem.entries.length <= 15) return;
  const old = mem.entries.splice(0, 5);
  const types = [...new Set(old.map(e => e.type))];
  const summary = old.map(e => e.summary.slice(0, 15)).join("; ");
  mem.entries.unshift({
    type: "summary",
    summary: `[${types.join("/")}] ${summary}`,
    time: old[0].time,
  });
}

export function getNpcMemorySummary(npc, t) {
  const mem = ensureMemoryFormat(npc);
  if (mem.entries.length === 0) return "";
  const levelName = t(favorLevelNames[npc.favorLevel]) || t("relation_stranger");
  const recent = mem.entries.slice(-8);
  const lines = recent.map((e) => {
    if (e.type === "chat") return `${t("npc_memory_chat")} ${e.summary}`;
    if (e.type === "gift") return `${t("npc_memory_gift")} ${e.summary}`;
    if (e.type === "quest") return `${t("npc_memory_quest")} ${e.summary}`;
    if (e.type === "favor") return `${t("npc_memory_favor")} ${e.summary}`;
    return `${t("npc_memory_other")} ${e.summary}`;
  });
  const stats = t("npc_memory_stats", { chat: mem.conversationCount, gift: mem.giftsReceived, quest: mem.questsShared });
  return t("npc_memory_summary", { level: levelName, stage: npc.favorLevel, stats, lines: lines.join("\n") });
}

export function getNpcSocialContext(npc, npcs, getNpcRelation, t) {
  const others = npcs.filter(n => n.id !== npc.id).slice(0, 6);
  if (others.length === 0) return "";
  const lines = others.map(o => {
    const rel = getNpcRelation(npc.id, o.id);
    return `${o.name}: ${npcRelationLabel(rel, t)}(${rel})`;
  });
  return t("npc_social_header") + "\n" + lines.join(", ");
}

export function getMemoryBasedTone(npc, t) {
  const level = npc.favorLevel || 0;
  if (t) {
    if (level <= 0) return t("npc_tone_0");
    if (level === 1) return t("npc_tone_1");
    if (level === 2) return t("npc_tone_2");
    if (level === 3) return t("npc_tone_3");
    return t("npc_tone_4");
  }
  // fallback without t
  if (level <= 0) return "Speak politely. You're still acquaintances.";
  if (level === 1) return "Speak politely but with a hint of friendliness.";
  if (level === 2) return "Mix casual and polite speech.";
  if (level === 3) return "Speak casually like a close friend.";
  return "Speak very intimately like a lifelong best friend.";
}
