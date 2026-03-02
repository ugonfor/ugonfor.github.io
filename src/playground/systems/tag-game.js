import { nowMs } from '../utils/helpers.js';
import { GAME } from '../core/constants.js';

/**
 * Tag minigame: NPC chases player for 60 seconds.
 * Player wins by surviving; NPC wins by catching player.
 */
export function createTagGame(ctx) {
  const state = {
    active: false,
    targetNpcId: null,
    startedAt: 0,
    duration: GAME.TAG_DURATION_MS,
    caught: false,
    cooldownUntil: 0,
    _sprintUntil: 0,
    _nextSprintAt: 0,
  };

  function start(npc) {
    state.active = true;
    state.targetNpcId = npc.id;
    state.startedAt = nowMs();
    state.caught = false;
    state._sprintUntil = 0;
    state._nextSprintAt = nowMs() + 4000 + Math.random() * 3000;
    npc.roamTarget = null;
    ctx.addChat("System", ctx.t("sys_tag_start", { name: npc.name }));
    ctx.addLog(ctx.t("sys_tag_start", { name: npc.name }));
  }

  function update(dt) {
    if (!state.active) return;
    const elapsed = nowMs() - state.startedAt;
    const remaining = state.duration - elapsed;

    const targetNpc = ctx.npcs.find(n => n.id === state.targetNpcId);
    if (!targetNpc) { state.active = false; return; }

    // Time up → win! (survived 60 seconds)
    if (remaining <= 0) {
      state.active = false;
      targetNpc.favorPoints += 8;
      ctx.addChat("System", ctx.t("sys_tag_win", { name: targetNpc.name }));
      ctx.addLog(ctx.t("log_tag_win"));
      return;
    }

    // Check if NPC caught the player
    const d = Math.hypot(ctx.player.x - targetNpc.x, ctx.player.y - targetNpc.y);
    if (d < GAME.TAG_CATCH_DIST) {
      state.active = false;
      state.caught = true;
      ctx.addChat("System", ctx.t("sys_tag_lose", { name: targetNpc.name }));
      ctx.addLog(ctx.t("log_tag_lose"));
      return;
    }

    // NPC chase AI: move toward player
    const dx = ctx.player.x - targetNpc.x;
    const dy = ctx.player.y - targetNpc.y;
    if (d > 0.3) {
      // Sprint burst: sprint for 1.5s every 3-7 seconds
      const now = nowMs();
      if (now > state._nextSprintAt && now > state._sprintUntil) {
        state._sprintUntil = now + GAME.TAG_SPRINT_MS;
        state._nextSprintAt = now + 4000 + Math.random() * 3000;
        ctx.upsertSpeechBubble(targetNpc.id, "\u{1F4A8}", GAME.TAG_SPRINT_MS);
      }

      const isSprinting = now < state._sprintUntil;
      const chaseSpeed = ctx.player.speed * GAME.TAG_CHASE_SPEED_RATIO * (isSprinting ? GAME.TAG_SPRINT_MULTIPLIER : 1.0) * dt;

      // Slight prediction: adjust toward player movement direction
      const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.3;
      const nx = targetNpc.x + Math.cos(angle) * chaseSpeed;
      const ny = targetNpc.y + Math.sin(angle) * chaseSpeed;
      if (ctx.canStand(nx, ny)) {
        targetNpc.x = nx;
        targetNpc.y = ny;
        targetNpc.state = "moving";
      } else {
        // Wall avoidance
        const altAngle = angle + Math.PI * 0.4 * (Math.random() > 0.5 ? 1 : -1);
        const ax = targetNpc.x + Math.cos(altAngle) * chaseSpeed;
        const ay = targetNpc.y + Math.sin(altAngle) * chaseSpeed;
        if (ctx.canStand(ax, ay)) {
          targetNpc.x = ax;
          targetNpc.y = ay;
          targetNpc.state = "moving";
        }
      }
    }
  }

  return {
    start,
    update,
    isActive() { return state.active; },
    getState() { return state; },
    getTargetNpcId() { return state.targetNpcId; },
  };
}
