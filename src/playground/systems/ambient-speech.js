import { dist, bubbleText, nowMs } from '../utils/helpers.js';
import { ensureMemoryFormat } from './npc-data.js';
import { GAME, npcPersonas } from '../core/constants.js';

/**
 * Ambient speech system: NPC ambient bubbles, player auto-talk,
 * NPC proactive greetings, and auto-conversations during autoWalk.
 *
 * Factory pattern — receives ctx, returns { update(now) }.
 */
export function createAmbientSpeechSystem(ctx) {
  // --- encapsulated state ---
  let nextAmbientBubbleAt = performance.now() + 3000;
  let nextPlayerBubbleAt = 0;
  let nextAutoConversationAt = 0;
  let autoConversationBusy = false;
  let playerBubblePending = false;
  let ambientLlmPending = false;
  let lastAmbientNpcId = null;
  let npcProactiveGreetPending = false;
  let nextNpcProactiveAt = 0;

  // pre-computed i18n emoji pools (evaluated once at creation)
  const ambientSolo = ctx.t("ambient_solo");
  const ambientChat = ctx.t("ambient_chat");
  const ambientMood = {
    happy: ctx.t("ambient_mood_happy"),
    sad: ctx.t("ambient_mood_sad"),
    neutral: ctx.t("ambient_mood_neutral"),
  };

  // --- helpers ---

  function ambientEmoji(npc, nearOther) {
    if (nearOther) return ambientChat[Math.floor(Math.random() * ambientChat.length)];
    const mood = (npc.moodUntil > nowMs() && npc.mood !== "neutral") ? npc.mood : "neutral";
    const pool = ambientMood[mood] || ambientSolo;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function npcAmbientLine(npc) {
    const mem = ensureMemoryFormat(npc);
    if (mem.entries.length > 0 && Math.random() < 0.3) {
      const memLines = [];
      const giftEntries = mem.entries.filter((e) => e.type === "gift");
      const questEntries = mem.entries.filter((e) => e.type === "quest");
      if (giftEntries.length > 0) {
        const last = giftEntries[giftEntries.length - 1];
        memLines.push(last.metadata.item ? ctx.t("ambient_gift_remember") : ctx.t("ambient_gift_thanks"));
      }
      if (questEntries.length > 0) {
        memLines.push(ctx.t("ambient_quest_memory"));
      }
      if (npc.favorLevel >= 2) {
        memLines.push(ctx.t("ambient_meet_often"));
      }
      if (mem.conversationCount >= 5) {
        memLines.push(ctx.t("ambient_talked_alot"));
      }
      if (memLines.length > 0) return memLines[Math.floor(Math.random() * memLines.length)];
    }

    const bySpecies = {
      human_a: [ctx.t("ambient_a1"), ctx.t("ambient_a2")],
      human_b: [ctx.t("ambient_b1"), ctx.t("ambient_b2")],
      human_c: [ctx.t("ambient_c1"), ctx.t("ambient_c2")],
      human_d: [ctx.t("ambient_d1"), ctx.t("ambient_d2")],
      human_e: [ctx.t("ambient_e1"), ctx.t("ambient_e2")],
      human_f: [ctx.t("ambient_f1"), ctx.t("ambient_f2")],
      human_g: [ctx.t("ambient_g1"), ctx.t("ambient_g2")],
      human_h: [ctx.t("ambient_h1"), ctx.t("ambient_h2")],
      human_i: [ctx.t("ambient_i1"), ctx.t("ambient_i2")],
    };
    const fallback = [ctx.t("ambient_fallback_1"), ctx.t("ambient_fallback_2"), ctx.t("ambient_fallback_3"), ctx.t("ambient_fallback_4")];
    const pool = bySpecies[npc.species] || fallback;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function playerFallbackLine() {
    const lines = [ctx.t("player_line_1"), ctx.t("player_line_2"), ctx.t("player_line_3")];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  async function requestLlmPlayerLine(nearNpc = null) {
    const proxy = {
      id: "player_inner_voice",
      name: ctx.player.name,
      personality: ctx.t("llm_player_personality"),
      species: ctx.player.species || "cat",
      color: ctx.player.color,
    };
    const contextNpc = nearNpc ? ctx.t("llm_player_context_near", { name: nearNpc.name }) : ctx.t("llm_player_context_alone");
    const prompt = ctx.t("llm_player_line_prompt", { time: ctx.formatTime(), context: contextNpc });
    const reply = await ctx.llmReplyOrEmpty(proxy, prompt);
    return bubbleText(reply || playerFallbackLine());
  }

  async function requestLlmNpcAutoReply(npc, playerLine) {
    const prompt = ctx.t("llm_npc_auto_reply_prompt", { player: ctx.player.name, line: playerLine, npc: npc.name });
    const reply = await ctx.llmReplyOrEmpty(npc, prompt);
    return bubbleText(reply || npcAmbientLine(npc));
  }

  function maybeRunAutoConversation(now) {
    if (!ctx.autoWalk.enabled || autoConversationBusy || now < nextAutoConversationAt) return;
    if (ctx.isTypingInInput()) return;
    const near = ctx.nearestNpc(GAME.AUTO_CONVO_DIST);
    if (!near || !near.npc || near.npc.talkCooldown > 0) return;
    const npc = near.npc;

    autoConversationBusy = true;
    npc.talkCooldown = Math.max(npc.talkCooldown, GAME.AUTO_WALK_COOLDOWN_SEC);
    ctx.convoMgr.startConversation(npc.id, 9000, "auto");
    nextAutoConversationAt = now + 13000 + Math.random() * 12000;

    (async () => {
      const playerLine = await requestLlmPlayerLine(npc);
      ctx.upsertSpeechBubble("player", playerLine, 3000);
      ctx.addChat(ctx.player.name, playerLine);
      const npcLine = await requestLlmNpcAutoReply(npc, playerLine);
      ctx.upsertSpeechBubble(npc.id, npcLine, 3200);
      ctx.addChat(npc.name, npcLine);
    })()
      .catch(e => console.warn("[auto conversation]", e.message))
      .finally(() => {
        autoConversationBusy = false;
      });
  }

  // --- main update ---

  function update(now) {
    const speechBubbles = ctx.chatMgr.speechBubbles;
    for (let i = speechBubbles.length - 1; i >= 0; i -= 1) {
      if (speechBubbles[i].until <= now) speechBubbles.splice(i, 1);
    }

    if (now >= nextAmbientBubbleAt) {
      nextAmbientBubbleAt = now + 8000 + Math.random() * 12000;
      const visible = ctx.npcs.filter((n) => dist(n, ctx.player) < GAME.AMBIENT_SPEECH_RANGE && !ctx.convoMgr.isSessionActive(n.id));
      if (visible.length) {
        visible.sort((a, b) => dist(a, ctx.player) - dist(b, ctx.player));
        const closest = visible[0];
        for (let i = 1; i < Math.min(visible.length, 4); i++) {
          const nearOther = ctx.npcs.some(o => o.id !== visible[i].id && dist(visible[i], o) < 3);
          if (Math.random() < 0.3) ctx.upsertSpeechBubble(visible[i].id, ambientEmoji(visible[i], nearOther), 2500);
        }
        const ambientNpc = (visible.length > 1 && closest.id === lastAmbientNpcId) ? visible[1] : closest;
        if (!ambientLlmPending) {
          ambientLlmPending = true;
          lastAmbientNpcId = ambientNpc.id;
          ctx.upsertSpeechBubble(ambientNpc.id, ambientEmoji(ambientNpc, false), 6000);
          const n = ambientNpc.needs || {};
          const needHint = n.hunger > 60 ? ctx.t("llm_need_hungry") : n.energy < 30 ? ctx.t("llm_need_tired") : n.social < 30 ? ctx.t("llm_need_lonely") : n.fun < 20 ? ctx.t("llm_need_bored") : n.duty > 70 ? ctx.t("llm_need_busy") : "";
          const _wMap = { clear: ctx.t("llm_weather_clear"), cloudy: ctx.t("llm_weather_cloudy"), rain: ctx.t("llm_weather_rain"), storm: ctx.t("llm_weather_storm"), snow: ctx.t("llm_weather_snow"), fog: ctx.t("llm_weather_fog") };
          const _tw = ctx.t("llm_ambient_weather", { time: ctx.formatTime(), weather: _wMap[ctx.weather.current] || ctx.t("llm_weather_clear") });
          ctx.llmReplyOrEmpty(ambientNpc, ctx.t("llm_ambient_prompt", { weather: _tw, need: needHint }))
            .then((line) => {
              if (line) {
                ctx.upsertSpeechBubble(ambientNpc.id, line, 4000);
                if (!ctx.convoMgr.focusNpcId) ctx.addChat(ambientNpc.name, line, "ambient");
              }
            })
            .catch(e => console.warn("[ambient LLM]", e.message))
            .finally(() => { ambientLlmPending = false; });
        }
      }
    }

    if (ctx.autoWalk.enabled && now >= nextPlayerBubbleAt && !playerBubblePending) {
      nextPlayerBubbleAt = now + 12000 + Math.random() * 14000;
      playerBubblePending = true;
      const near = ctx.nearestNpc(2.4);
      requestLlmPlayerLine(near ? near.npc : null)
        .then((line) => {
          ctx.upsertSpeechBubble("player", line, 2800);
        })
        .catch(e => console.warn("[player bubble]", e.message))
        .finally(() => {
          playerBubblePending = false;
        });
    }

    // NPC proactive greeting
    if (!npcProactiveGreetPending && now > nextNpcProactiveAt && !ctx.convoMgr.focusNpcId) {
      nextNpcProactiveAt = now + 20000 + Math.random() * 30000;
      const close = ctx.npcs.filter(n => dist(n, ctx.player) < GAME.PROACTIVE_GREET_DIST && !ctx.convoMgr.isSessionActive(n.id) && n.talkCooldown <= 0 && !(npcPersonas[n.id] && npcPersonas[n.id].isDocent));
      if (close.length && Math.random() < GAME.PROACTIVE_GREET_CHANCE) {
        const npc = close[Math.floor(Math.random() * close.length)];
        npcProactiveGreetPending = true;
        npc.pose = "waving";
        const mem = ensureMemoryFormat(npc);
        const convCount = mem.conversationCount || 0;
        const lastChat = mem.entries.filter(e => e.type === "chat").slice(-1)[0];
        const memHint = lastChat
          ? ctx.t("llm_proactive_last_chat", { summary: lastChat.summary.slice(0, 30) })
          : ctx.t("llm_proactive_first_meet");

        let greetPrompt;
        if (convCount >= 5) {
          greetPrompt = ctx.t("llm_proactive_many_chats", { hint: memHint, name: ctx.player.name });
        } else if (convCount >= 1) {
          greetPrompt = ctx.t("llm_proactive_few_chats", { hint: memHint, name: ctx.player.name });
        } else {
          greetPrompt = ctx.t("llm_proactive_stranger", { hint: memHint });
        }
        ctx.llmReplyOrEmpty(npc, greetPrompt)
          .then((line) => {
            if (line) {
              ctx.convoMgr.startConversation(npc.id, GAME.LLM_TIMEOUT_MS, "proactive");
              ctx.addChat(npc.name, line);
              ctx.upsertSpeechBubble(npc.id, line, 4000);
            }
          })
          .catch(e => console.warn("[proactive greet]", e.message))
          .finally(() => {
            npcProactiveGreetPending = false;
            setTimeout(() => { npc.pose = "standing"; }, 3000);
          });
      }
    }

    maybeRunAutoConversation(now);
  }

  function resetAutoConversation() {
    nextAutoConversationAt = 0;
    autoConversationBusy = false;
    playerBubblePending = false;
  }

  return { update, ambientEmoji, resetAutoConversation };
}
