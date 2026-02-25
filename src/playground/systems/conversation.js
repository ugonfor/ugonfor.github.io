/**
 * Conversation system: LLM requests, sentiment analysis, action detection.
 *
 * ctx varies per function:
 *
 * applyConversationEffect ctx = { adjustRelation, relationKeyForNpc, addNpcMemory, t }
 *
 * requestLlmNpcReply ctx = { LLM_API_URL, player, npcPersonas, getNpcMemorySummary,
 *   getNpcSocialContext, getMemoryBasedTone, debugMode, t, resolvePersona, addLog,
 *   currentLang, nearestNpc, CHAT_NEARBY_DISTANCE, getNpcChats, formatTime, quest,
 *   relations, buildApiHeaders }
 *
 * requestLlmNpcReplyStream ctx = { LLM_STREAM_API_URL, player, npcPersonas,
 *   getNpcMemorySummary, getNpcSocialContext, getMemoryBasedTone, debugMode, t,
 *   resolvePersona, addLog, currentLang, nearestNpc, CHAT_NEARBY_DISTANCE,
 *   getNpcChats, formatTime, quest, relations, buildApiHeaders }
 *
 * detectActionFromReply ctx = { npcs }
 */

import { nowMs } from '../utils/helpers.js';
import { places, favorLevelNames, PLACE_ALIASES, GAME } from '../core/constants.js';

// NPC의 LLM 응답에서 감정 추론 (AI가 맥락을 이해하고 답했으므로 응답 분석이 더 정확)
export function inferSentimentFromReply(replyText) {
  const text = replyText.toLowerCase();
  if (/(고마워|반가|좋은|기뻐|재밌|행복|최고|사랑|감동|응원|좋아해|함께|친구|헤헤|ㅎㅎ|감사|축하|대단|멋져)/.test(text))
    return { sentiment: "positive", intensity: 2 };
  if (/(응|맞아|그래|좋아|괜찮|그럴게|알겠|오|와)/.test(text))
    return { sentiment: "positive", intensity: 1 };
  if (/(싫|짜증|그만|화나|실망|별로|최악|됐어|하지\s?마|무례)/.test(text))
    return { sentiment: "negative", intensity: 2 };
  if (/(\?|뭐|어떻게|왜|정말|진짜|궁금)/.test(text))
    return { sentiment: "curious", intensity: 1 };
  return { sentiment: "neutral", intensity: 0 };
}

export function applyConversationEffect(npc, playerMsg, npcReplyText, emotion, ctx) {
  const { adjustRelation, relationKeyForNpc, addNpcMemory, t } = ctx;
  // structured output의 emotion 사용, 없으면 텍스트에서 추론
  let sentiment, intensity;
  if (emotion && emotion !== "neutral") {
    sentiment = emotion;
    intensity = (sentiment === "happy" || sentiment === "angry") ? 2 : 1;
  } else {
    ({ sentiment, intensity } = inferSentimentFromReply(npcReplyText));
  }
  const relKey = relationKeyForNpc(npc.id);

  if (sentiment === "positive" || sentiment === "happy") {
    if (relKey) adjustRelation(relKey, intensity * 2);
    npc.favorPoints += Math.round(intensity * 2 * 1 * 1);
    if (intensity >= 2) {
      npc.mood = "happy";
      npc.moodUntil = nowMs() + 20_000;
    }
  } else if (sentiment === "negative" || sentiment === "sad" || sentiment === "angry") {
    if (relKey) adjustRelation(relKey, -intensity * 2);
    npc.favorPoints = Math.max(0, npc.favorPoints - intensity);
    npc.mood = "sad";
    npc.moodUntil = nowMs() + 15_000;
  } else if (sentiment === "curious") {
    if (relKey) adjustRelation(relKey, 1);
  }

  if (npc.favorPoints >= 100) {
    npc.favorLevel = Math.min(npc.favorLevel + 1, 4);
    npc.favorPoints = 0;
    addNpcMemory(npc, "favor", t("mem_favor_advance", { level: t(favorLevelNames[npc.favorLevel]) }));
  }
}

export async function requestLlmNpcReply(npc, userMessage, ctx) {
  const {
    LLM_API_URL, debugMode, currentLang, resolvePersona,
    nearestNpc, CHAT_NEARBY_DISTANCE, getNpcChats, formatTime,
    quest, relations, getNpcMemorySummary, getMemoryBasedTone,
    getNpcSocialContext, buildApiHeaders, t, player,
  } = ctx;

  if (!LLM_API_URL) throw new Error("LLM API URL is empty");

  const persona = resolvePersona(npc);
  const near = nearestNpc(CHAT_NEARBY_DISTANCE);
  const payload = {
    npcId: npc.id,
    npcName: npc.name,
    playerName: player?.name || "",
    persona,
    userMessage,
    lang: currentLang,
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
    recentMessages: getNpcChats(npc.id).slice(0, 8).reverse(),
    memory: getNpcMemorySummary(npc),
    tone: getMemoryBasedTone(npc, t),
    socialContext: getNpcSocialContext(npc),
    favorLevel: npc.favorLevel || 0,
    npcNeeds: npc.needs ? { hunger: Math.round(npc.needs.hunger), energy: Math.round(npc.needs.energy), social: Math.round(npc.needs.social), fun: Math.round(npc.needs.fun), duty: Math.round(npc.needs.duty) } : null,
  };

  if (debugMode) {
    console.group(`%c[LLM DEBUG] Request → ${npc.name} (${npc.id})`, 'color:#00bcd4;font-weight:bold');
    console.log('Payload:', JSON.parse(JSON.stringify(payload)));
    console.groupEnd();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("LLM request timeout (15s)"), GAME.LLM_TIMEOUT_MS);
  try {
    const headers = await buildApiHeaders("npc_chat");
    if (debugMode) headers["x-debug"] = "1";
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
    const suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
    const result = {
      reply, model, suggestions,
      emotion: data.emotion || "neutral",
      farewell: !!data.farewell,
      action: data.action || { type: "none", target: "" },
      mention: data.mention || { npc: null, place: null },
    };
    if (debugMode) {
      console.group(`%c[LLM DEBUG] Response ← ${npc.name} (${model})`, 'color:#4caf50;font-weight:bold');
      if (data._debug?.prompt) {
        console.log('%c── Full Prompt (서버 조립) ──', 'color:#e91e63;font-weight:bold');
        console.log(data._debug.prompt);
      }
      console.log('Reply:', reply);
      console.log('Emotion:', result.emotion, '| Farewell:', result.farewell);
      console.log('Action:', result.action);
      console.log('Suggestions:', suggestions);
      console.log('Mention:', result.mention);
      console.groupEnd();
    }
    return result;
  } finally {
    clearTimeout(timeout);
  }
}

export async function requestLlmNpcReplyStream(npc, userMessage, onChunk, ctx) {
  const {
    LLM_STREAM_API_URL, debugMode, currentLang, resolvePersona,
    nearestNpc, CHAT_NEARBY_DISTANCE, getNpcChats, formatTime,
    quest, relations, getNpcMemorySummary, getMemoryBasedTone,
    getNpcSocialContext, buildApiHeaders, t,
  } = ctx;

  if (!LLM_STREAM_API_URL) throw new Error("LLM stream API URL is empty");

  const persona = resolvePersona(npc);
  const near = nearestNpc(CHAT_NEARBY_DISTANCE);
  const payload = {
    npcId: npc.id,
    npcName: npc.name,
    playerName: player?.name || "",
    persona,
    userMessage,
    lang: currentLang,
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
    recentMessages: getNpcChats(npc.id).slice(0, 8).reverse(),
    memory: getNpcMemorySummary(npc),
    tone: getMemoryBasedTone(npc, t),
    socialContext: getNpcSocialContext(npc),
    favorLevel: npc.favorLevel || 0,
    npcNeeds: npc.needs ? { hunger: Math.round(npc.needs.hunger), energy: Math.round(npc.needs.energy), social: Math.round(npc.needs.social), fun: Math.round(npc.needs.fun), duty: Math.round(npc.needs.duty) } : null,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GAME.LLM_STREAM_TIMEOUT_MS);
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
    let streamMeta = {};
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
        streamMeta = data || {};
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
    return {
      reply, model,
      suggestions: Array.isArray(streamMeta.suggestions) ? streamMeta.suggestions : [],
      emotion: streamMeta.emotion || "neutral",
      farewell: !!streamMeta.farewell,
      action: streamMeta.action || { type: "none", target: "" },
      mention: streamMeta.mention || { npc: null, place: null },
    };
  } finally {
    clearTimeout(timeout);
  }
}

// 키워드 기반 액션 감지 (스트리밍 폴백)
// NPC 응답 텍스트에서 follow/guide 의도를 감지하여 action 객체를 반환
export function detectActionFromReply(npc, replyText, ctx) {
  const { npcs } = ctx;

  // 동행해제 감지 (follow 해제보다 먼저 체크)
  if (/(그만\s*따라|동행.*끝|헤어지|각자|따로\s*가|이만\s*가|그럼\s*여기서|돌아가|다시\s*내\s*할\s*일|stop\s*follow|unfollow)/i.test(replyText)) {
    return { type: "unfollow", target: "" };
  }

  // 동행 감지
  if (/(따라갈|같이\s*가|함께\s*가|동행|따라올|따라가|같이\s*다니|같이\s*걸|데려다|나를\s*따|내가\s*따|follow|let'?s\s*go\s*together|come\s*with|i'?ll\s*follow)/i.test(replyText)) {
    return { type: "follow", target: "" };
  }

  // NPC 안내 감지 — "~에게 가자" / "~를 만나러" / "~한테 데려다줄게"
  const npcGuidePatterns = [
    /(?:에게|한테|만나러|찾아|소개해|데려다|안내해)\s*(?:가자|갈게|줄게|주|가|보자)/,
    /(?:take\s*you\s*to|show\s*you\s*where|let\s*me\s*introduce|bring\s*you\s*to)/i,
  ];
  if (npcGuidePatterns.some(p => p.test(replyText))) {
    // NPC 이름으로 대상 감지
    for (const otherNpc of npcs) {
      if (otherNpc.id === npc.id) continue;
      if (replyText.includes(otherNpc.name) || replyText.includes(otherNpc.id)) {
        return { type: "guide_npc", target: otherNpc.id };
      }
    }
  }

  // 장소 안내 감지 — "~로 가자" / "~에 데려다줄게" / "보여줄게"
  const placeGuidePatterns = [
    /(안내|가자|데려다|보여줄|가\s*볼래|가\s*볼까|같이.*가|따라.*와|따라.*오|알려\s*줄)/,
    /(take\s*you|show\s*you|let'?s\s*go\s*to|guide\s*you|head\s*to)/i,
  ];
  if (placeGuidePatterns.some(p => p.test(replyText))) {
    // 장소 이름 매칭 (PLACE_ALIASES from constants.js)
    for (const [alias, key] of Object.entries(PLACE_ALIASES)) {
      if (replyText.includes(alias) && places[key]) {
        return { type: "guide_place", target: key };
      }
    }
  }

  return { type: "none", target: "" };
}
