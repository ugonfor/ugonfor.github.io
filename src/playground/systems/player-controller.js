import { clamp, dist, nowMs } from '../utils/helpers.js';
import { GAME, places, props, interiorDefs, AUTO_WALK_KEY } from '../core/constants.js';

/**
 * Player movement controller — owns player movement, auto-walk,
 * idle sitting, and move-target logic.
 *
 * ctx must provide:
 *   player, world, keys, inputState, sceneState, weather,
 *   convoMgr, canStand, canStandInScene,
 *   introSeq (or isIntroDone getter),
 *   isMobileViewport, mobileChatOpen (getter), isTypingInInput,
 *   resetJoystick, npcById, addChat, addLog, t,
 *   ensureAmbientSpeech, chatInputEl,
 *   autoWalkBtn (getter), mobileAutoWalkBtn (getter),
 */
export function createPlayerController(ctx) {
  const autoWalk = { enabled: false, nextPickAt: 0, target: null };

  // ─── Internal helpers ───

  function randomStandPoint() {
    const { player, world, canStand } = ctx;
    for (let i = 0; i < 60; i += 1) {
      const x = 1.5 + Math.random() * (world.width - 3);
      const y = 1.5 + Math.random() * (world.height - 3);
      if (canStand(x, y)) return { x, y };
    }
    return { x: player.x, y: player.y };
  }

  function pickAutoWalkTarget() {
    const { player, canStand } = ctx;
    const npcs = ctx.npcs();
    const r = Math.random();
    if (r < 0.42 && npcs.length) {
      const npc = npcs[Math.floor(Math.random() * npcs.length)];
      const a = Math.random() * Math.PI * 2;
      const d = 1.1 + Math.random() * 1.1;
      const x = npc.x + Math.cos(a) * d;
      const y = npc.y + Math.sin(a) * d;
      if (canStand(x, y)) return { x, y, reason: 'npc', npcId: npc.id };
    }
    if (r < 0.74) {
      const placeArr = Object.values(places);
      const base = placeArr[Math.floor(Math.random() * placeArr.length)];
      const x = base.x + (Math.random() * 2 - 1) * 1.8;
      const y = base.y + (Math.random() * 2 - 1) * 1.8;
      if (canStand(x, y)) return { x, y, reason: 'place' };
    }
    const p = randomStandPoint();
    return { x: p.x, y: p.y, reason: 'wander' };
  }

  function refreshAutoWalkButton() {
    const { t } = ctx;
    const autoWalkBtn = ctx.autoWalkBtn();
    const mobileAutoWalkBtn = ctx.mobileAutoWalkBtn();
    if (autoWalkBtn) {
      autoWalkBtn.textContent = autoWalk.enabled ? t('autowalk_off') : t('autowalk_on');
      autoWalkBtn.setAttribute('aria-pressed', autoWalk.enabled ? 'true' : 'false');
    }
    if (mobileAutoWalkBtn) {
      mobileAutoWalkBtn.textContent = autoWalk.enabled ? t('autowalk_off_short') : t('autowalk_on_short');
      mobileAutoWalkBtn.setAttribute('aria-pressed', autoWalk.enabled ? 'true' : 'false');
      mobileAutoWalkBtn.classList.toggle('pg-pressed', autoWalk.enabled);
    }
  }

  function updateAutoWalk(now) {
    const { player, sceneState } = ctx;
    if (!autoWalk.enabled) return;
    if (sceneState.current !== 'outdoor') return;
    if (player.moveTarget && !player.moveTarget.autoWalk) return;
    if (now < autoWalk.nextPickAt && player.moveTarget && player.moveTarget.autoWalk) return;

    if (!autoWalk.target || now >= autoWalk.nextPickAt) {
      autoWalk.target = pickAutoWalkTarget();
      autoWalk.nextPickAt = now + 1200 + Math.random() * 2200;
      player.moveTarget = {
        x: autoWalk.target.x,
        y: autoWalk.target.y,
        autoWalk: true,
        npcId: autoWalk.target.npcId || null,
      };
    }
  }

  // ─── Public API ───

  return {
    get autoWalkEnabled() { return autoWalk.enabled; },

    /** Thin autoWalk-compatible object for ambient-speech ctx */
    get autoWalkRef() { return autoWalk; },

    setAutoWalkEnabled(next, silent = false) {
      const { player, addLog, t } = ctx;
      autoWalk.enabled = !!next;
      autoWalk.target = null;
      autoWalk.nextPickAt = 0;
      ctx.ensureAmbientSpeech().resetAutoConversation();
      if (!autoWalk.enabled) player.moveTarget = null;
      refreshAutoWalkButton();
      try {
        localStorage.setItem(AUTO_WALK_KEY, autoWalk.enabled ? '1' : '0');
      } catch {
        // ignore localStorage errors
      }
      if (!silent) addLog(autoWalk.enabled ? t('log_autowalk_on') : t('log_autowalk_off'));
    },

    setMoveTarget(x, y, extra) {
      ctx.player.moveTarget = extra ? { x, y, ...extra } : { x, y };
    },

    clearMoveTarget() {
      ctx.player.moveTarget = null;
    },

    update(dt) {
      const { player, world, keys, inputState, sceneState, weather, canStand, npcById, addChat, t } = ctx;

      // Block movement during intro sequence
      if (!ctx.isIntroDone()) return;

      if (ctx.isMobileViewport() && ctx.mobileChatOpen()) {
        keys.clear();
        player.moveTarget = null;
        inputState.runHold = false;
        ctx.resetJoystick();
        return;
      }

      if (ctx.isTypingInInput()) {
        keys.clear();
        player.moveTarget = null;
        return;
      }

      let keyDx = 0;
      let keyDy = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) keyDx -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) keyDx += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) keyDy -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) keyDy += 1;

      const manualDx = keyDx + inputState.joyX;
      const manualDy = keyDy + inputState.joyY;
      let dx = manualDx;
      let dy = manualDy;

      if ((manualDx || manualDy) && autoWalk.enabled) {
        this.setAutoWalkEnabled(false);
      }

      if (!manualDx && !manualDy) {
        updateAutoWalk(nowMs());
      }

      if (manualDx || manualDy) {
        player.moveTarget = null;
      } else if (player.moveTarget) {
        const tx = player.moveTarget.x - player.x;
        const ty = player.moveTarget.y - player.y;
        const td = Math.hypot(tx, ty);
        if (td <= 0.08) {
          player.moveTarget = null;
        } else {
          dx = tx / td;
          dy = ty / td;
        }
      }

      const mag = Math.hypot(dx, dy);
      if (!mag) {
        // Idle accumulation -> auto sit
        player.idleTime += dt;
        if (player.idleTime > 5 && player.pose === 'standing') {
          const sittable = ['bench', 'chair', 'stool', 'armchair', 'bean_bag', 'floor_cushion', 'gaming_chair'];
          let seat = props.find(p => sittable.includes(p.type) && dist(player, p) < GAME.SEAT_CHECK_DIST);
          if (!seat && sceneState.current !== 'outdoor') {
            const interior = interiorDefs && interiorDefs[sceneState.current];
            if (interior && interior.furniture) {
              seat = interior.furniture.find(f => sittable.includes(f.type) && Math.hypot(f.x - player.x, f.y - player.y) < GAME.SEAT_CHECK_DIST);
            }
          }
          if (seat) {
            player.x = seat.x;
            player.y = seat.y;
            player.pose = 'sitting';
          }
        }
        return;
      }

      // Moving -> stand up
      player.idleTime = 0;
      if (player.pose !== 'standing') player.pose = 'standing';

      const runMul = keys.has('ShiftLeft') || keys.has('ShiftRight') || inputState.runHold ? 1.75 : 1;
      const walkMul = (player.moveTarget && player.moveTarget.autoWalk) ? 0.5 : 1;
      const weatherSlow = weather.current === 'storm' ? 0.8 : weather.current === 'snow' ? 0.88 : 1;
      const spd = player.speed * runMul * walkMul * 1 * weatherSlow;
      const tx = player.x + (dx / mag) * spd * dt;
      const ty = player.y + (dy / mag) * spd * dt;

      if (canStand(tx, player.y)) player.x = tx;
      if (canStand(player.x, ty)) player.y = ty;

      if (sceneState.current !== 'outdoor') {
        const interior = interiorDefs && interiorDefs[sceneState.current];
        if (interior) {
          player.x = clamp(player.x, 0.3, interior.width - 0.3);
          player.y = clamp(player.y, 0.3, interior.height - 0.3);
        }
      } else {
        player.x = clamp(player.x, 1, world.width - 1);
        player.y = clamp(player.y, 1, world.height - 1);
      }

      if (player.moveTarget) {
        const td = Math.hypot(player.moveTarget.x - player.x, player.moveTarget.y - player.y);
        if (td <= 0.12) {
          const targetNpc = npcById(player.moveTarget.npcId);
          if (targetNpc) {
            addChat('System', t('sys_npc_arrived', { name: targetNpc.name }));
            const chatInputEl = ctx.chatInputEl();
            if (chatInputEl) chatInputEl.focus();
          }
          if (player.moveTarget.autoWalk) {
            autoWalk.target = null;
            autoWalk.nextPickAt = nowMs() + 700 + Math.random() * 1500;
          }
          player.moveTarget = null;
        }
      }
    },
  };
}
