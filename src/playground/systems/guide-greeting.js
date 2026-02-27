import { dist } from "../utils/helpers.js";
import { ensureMemoryFormat } from "./npc-data.js";

/**
 * Guide (docent) NPC greeting system.
 * Manages the approach + greeting sequence when a player first loads in.
 *
 * ctx must provide:
 *   npcs, player, convoMgr, t, llmReplyOrEmpty, upsertSpeechBubble, addChat,
 *   canStandInScene, isIntroDone
 */
export function createGuideGreetingSystem(ctx) {
  let guideGreetingPhase = 0;    // 0: waiting, 1: approaching, 2: done
  let guideGreetingTimer = 0;

  function update(dt) {
    if (guideGreetingPhase === 2) return;
    const guideNpc = ctx.npcs.find(n => n.id === "guide");
    if (!guideNpc) { guideGreetingPhase = 2; return; }

    if (guideGreetingPhase === 0) {
      guideGreetingTimer += dt;
      if (guideGreetingTimer >= 3 && ctx.isIntroDone()) {
        guideGreetingPhase = 1;
        guideGreetingTimer = 0;
        guideNpc.roamTarget = null;
        guideNpc.roamWait = 0;
      }
      return;
    }

    if (guideGreetingPhase === 1) {
      guideGreetingTimer += dt;
      const gd = dist(guideNpc, ctx.player);

      if (gd > 1.2) {
        const dx = ctx.player.x - guideNpc.x;
        const dy = ctx.player.y - guideNpc.y;
        const d = Math.hypot(dx, dy) || 1;
        const speedMult = gd > 5 ? 2.5 : 1.2;
        const spd = guideNpc.speed * speedMult * dt;
        const nx = guideNpc.x + (dx / d) * Math.min(spd, d);
        const ny = guideNpc.y + (dy / d) * Math.min(spd, d);
        if (ctx.canStandInScene(nx, ny, guideNpc.currentScene || "outdoor")) {
          guideNpc.x = nx;
          guideNpc.y = ny;
        }
        guideNpc.state = "moving";
        guideNpc.roamTarget = null;
        guideNpc.roamWait = 0;
        if (guideGreetingTimer > 8) {
          guideNpc.x = ctx.player.x + (Math.random() - 0.5) * 2;
          guideNpc.y = ctx.player.y + (Math.random() - 0.5) * 2;
        }
        return;
      }

      // Arrived -> phase 2: greet with follow-up
      guideGreetingPhase = 2;
      guideNpc.pose = "waving";
      guideNpc.state = "chatting";
      const mem = ensureMemoryFormat(guideNpc);
      const isReturn = mem.conversationCount > 0;
      const greetPrompt = isReturn
        ? ctx.t("llm_guide_return", { name: ctx.player.name })
        : ctx.t("llm_guide_first", { name: ctx.player.name });
      const followUpPrompt = isReturn
        ? ctx.t("llm_guide_return2", { name: ctx.player.name })
        : ctx.t("llm_guide_first2", { name: ctx.player.name });
      ctx.convoMgr.startConversation(guideNpc.id, 30_000, "guide");
      ctx.llmReplyOrEmpty(guideNpc, greetPrompt).then((hi) => {
        const line = hi || ctx.t("docent_hi");
        ctx.addChat(guideNpc.name, line);
        ctx.upsertSpeechBubble(guideNpc.id, line, 5000);
        // 후속 대사: 탐험 유도 or 마을 근황
        return new Promise(r => setTimeout(r, 3500)).then(() =>
          ctx.llmReplyOrEmpty(guideNpc, followUpPrompt)
        );
      }).then((line2) => {
        if (line2) {
          ctx.addChat(guideNpc.name, line2);
          ctx.upsertSpeechBubble(guideNpc.id, line2, 5000);
        } else {
          const fallback = ctx.t("docent_hi2");
          ctx.addChat(guideNpc.name, fallback);
          ctx.upsertSpeechBubble(guideNpc.id, fallback, 5000);
        }
        setTimeout(() => {
          guideNpc.pose = "standing";
          // 인사 끝 → 대화 세션 해제, 안내소로 복귀
          ctx.convoMgr.clearFocusIf(guideNpc.id);
          guideNpc.state = "idle";
        }, 3000);
      }).catch(e => {
        console.warn("[guide greet]", e.message);
        guideNpc.pose = "standing";
        ctx.convoMgr.clearFocusIf(guideNpc.id);
      });
      guideNpc.roamTarget = null;
      guideNpc.roamWait = 12;
    }
  }

  return {
    update,
    get phase() { return guideGreetingPhase; },
  };
}
