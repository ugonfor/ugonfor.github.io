import { dist, nowMs, npcRelationLabel } from "../utils/helpers.js";
import { GAME } from "../core/constants.js";

/**
 * NPC social event systems:
 * - NPC-to-NPC social conversations (updateNpcSocialEvents)
 * - NPC social interactions / relation adjustments (updateNpcSocialInteractions)
 * - Gossip queue (spreadGossip / processGossip)
 *
 * ctx must provide:
 *   npcs, player, convoMgr, t, llmReplyOrEmpty, upsertSpeechBubble, addChat, addLog,
 *   ambientEmoji, formatTime, npcById, getNpcRelation, adjustNpcRelation, ensureMemoryFormat
 */
export function createNpcSocialSystem(ctx) {
  let nextSocialAt = performance.now() + 5000;
  let npcChatLlmPending = false;
  let nextNpcSocialAt = performance.now() + 2000;
  let socialGossipLlmPending = false;
  const gossipQueue = [];

  function spreadGossip(sourceNpcId, aboutNpcId, topic, sentiment) {
    gossipQueue.push({ sourceNpcId, aboutNpcId, topic, sentiment, time: ctx.world.totalMinutes });
    if (gossipQueue.length > 30) gossipQueue.shift();
  }

  function processGossip() {
    if (gossipQueue.length === 0) return;
    const g = gossipQueue[0];
    const source = ctx.npcById(g.sourceNpcId);
    if (!source) { gossipQueue.shift(); return; }

    const nearby = ctx.npcs.filter(n => n.id !== g.sourceNpcId && n.id !== g.aboutNpcId && dist(source, n) < GAME.GOSSIP_RANGE);
    for (const listener of nearby) {
      const change = g.sentiment === "positive" ? 2 : g.sentiment === "negative" ? -2 : 0;
      if (change !== 0) ctx.adjustNpcRelation(listener.id, g.aboutNpcId, change);
    }
    gossipQueue.shift();
  }

  function updateNpcSocialInteractions() {
    const now = nowMs();
    if (now < nextNpcSocialAt) return;
    nextNpcSocialAt = now + 8_000 + Math.random() * 12_000;

    for (const a of ctx.npcs) {
      for (const b of ctx.npcs) {
        if (a.id >= b.id) continue;
        if (dist(a, b) > 3.0) continue;
        const rel = ctx.getNpcRelation(a.id, b.id);
        if (rel >= 60 && Math.random() < 0.3) {
          ctx.adjustNpcRelation(a.id, b.id, 1);
        } else if (rel < 40 && Math.random() < 0.2) {
          ctx.adjustNpcRelation(a.id, b.id, -1);
        }
        if (Math.random() < 0.15 && dist(ctx.player, a) < 8 && !socialGossipLlmPending) {
          const relLabel = npcRelationLabel(rel, ctx.t);
          const sentiment = rel >= 60 ? "positive" : rel < 35 ? "negative" : "neutral";
          socialGossipLlmPending = true;
          const gossipPrompt = ctx.t("llm_gossip_prompt", { nameB: b.name, rel: relLabel });
          ctx.llmReplyOrEmpty(a, gossipPrompt, { favorLevel: 2, isNpcChat: true }).then((line) => {
            if (line) {
              ctx.upsertSpeechBubble(a.id, line, 3500);
            }
          }).catch(e => console.warn("[gossip LLM]", e.message)).finally(() => { socialGossipLlmPending = false; });
          spreadGossip(a.id, b.id, "relationship", sentiment);
        }
      }
    }
  }

  function updateNpcSocialEvents() {
    const now = nowMs();
    if (now < nextSocialAt) return;
    nextSocialAt = now + 10000 + Math.random() * 15000;

    const moving = ctx.npcs.filter((n) => !ctx.convoMgr.isSessionActive(n.id) && n.id !== "guide");
    if (moving.length < 2) return;

    let bestPair = null;
    let bestDist = Infinity;
    for (let i = 0; i < moving.length; i++) {
      for (let j = i + 1; j < moving.length; j++) {
        if ((moving[i].currentScene || "outdoor") !== (moving[j].currentScene || "outdoor")) continue;
        const d = dist(moving[i], moving[j]);
        if (d < bestDist) {
          bestDist = d;
          bestPair = [moving[i], moving[j]];
        }
      }
    }
    if (!bestPair || bestDist > 6) return;

    const [a, b] = bestPair;

    if (bestDist > 2.5) {
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      a.roamTarget = mid;
      b.roamTarget = mid;
      a.roamWait = 0;
      b.roamWait = 0;
    }

    a.roamWait = Math.max(a.roamWait, 4 + Math.random() * 2);
    b.roamWait = Math.max(b.roamWait, 4 + Math.random() * 2);
    a.state = "chatting";
    b.state = "chatting";

    const playerNearby = dist(ctx.player, a) < 12 || dist(ctx.player, b) < 12;
    if (playerNearby && !npcChatLlmPending) {
      npcChatLlmPending = true;
      const rel = npcRelationLabel(ctx.getNpcRelation(a.id, b.id), ctx.t);
      ctx.upsertSpeechBubble(a.id, ctx.ambientEmoji(a, true), 8000);
      ctx.upsertSpeechBubble(b.id, ctx.ambientEmoji(b, true), 8000);
      const delay = (ms) => new Promise(r => setTimeout(r, ms));
      const npcChatOverrides = { favorLevel: 2, isNpcChat: true };
      ctx.llmReplyOrEmpty(a, ctx.t("llm_social_start", { nameB: b.name, rel: rel, time: ctx.formatTime() }), npcChatOverrides)
        .then((lineA) => {
          if (lineA) {
            ctx.upsertSpeechBubble(a.id, lineA, 4500);
            if (!ctx.convoMgr.focusNpcId) ctx.addChat(a.name, lineA, "npc-chat");
          }
          return delay(2500).then(() =>
            ctx.llmReplyOrEmpty(b, ctx.t("llm_social_reply", { nameA: a.name, line: lineA || '...' }), npcChatOverrides)
          );
        })
        .then((lineB) => {
          if (lineB) {
            ctx.upsertSpeechBubble(b.id, lineB, 4500);
            if (!ctx.convoMgr.focusNpcId) ctx.addChat(b.name, lineB, "npc-chat");
          }
          if (Math.random() < GAME.MULTI_TURN_CHANCE && lineB) {
            return delay(2500).then(() =>
              ctx.llmReplyOrEmpty(a, ctx.t("llm_social_react", { nameB: b.name, line: lineB }), npcChatOverrides)
            );
          }
        })
        .then((lineA2) => {
          if (lineA2) {
            ctx.upsertSpeechBubble(a.id, lineA2, 3000);
            if (!ctx.convoMgr.focusNpcId) ctx.addChat(a.name, lineA2, "npc-chat");
          }
        })
        .catch(e => console.warn("[NPC social chat]", e.message))
        .finally(() => { npcChatLlmPending = false; });
      ctx.addLog(ctx.t("log_npc_chat", { a: a.name, b: b.name }));
    } else {
      ctx.upsertSpeechBubble(a.id, ctx.ambientEmoji(a, true), 2800);
      ctx.upsertSpeechBubble(b.id, ctx.ambientEmoji(b, true), 2800);
    }
  }

  return {
    spreadGossip,
    processGossip,
    updateSocialInteractions: updateNpcSocialInteractions,
    updateSocialEvents: updateNpcSocialEvents,
  };
}
