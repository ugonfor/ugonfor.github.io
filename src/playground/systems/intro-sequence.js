import { dist } from '../utils/helpers.js';

/**
 * Intro camera sequence: pans camera across NPC targets showing
 * their monologues/conversations, then zooms back to player.
 *
 * ctx expects: { npcs, player, world, weather, gameRenderer3D,
 *   DEFAULT_ZOOM, t, formatTime, getNpcRelation, npcRelationLabel,
 *   llmReplyOrEmpty, upsertSpeechBubble, canStandInScene, clamp }
 */
export function createIntroSequence(ctx) {
  let introPhase = 0;  // 0: overview pan, 1: zoom to player, 2: done
  let introTimer = 0;
  const introTargets = [];  // [{npc, x, y}]
  let introTargetIdx = 0;
  let introTriggeredSpeech = new Set();
  const introCamPos = { x: 20, y: 25 };  // virtual camera position
  const INTRO_PHASE0_EACH = 2.5;  // seconds per target

  function initTargets() {
    const outdoor = ctx.npcs.filter(n => n.id !== "guide" && (n.currentScene || "outdoor") === "outdoor");
    // closest NPC pair (for conversation)
    let closestPair = null;
    let closestDist = Infinity;
    for (let i = 0; i < outdoor.length; i++) {
      for (let j = i + 1; j < outdoor.length; j++) {
        const d = dist(outdoor[i], outdoor[j]);
        if (d < closestDist) { closestDist = d; closestPair = [outdoor[i], outdoor[j]]; }
      }
    }
    // remaining random 2 for monologues
    const used = new Set(closestPair ? closestPair.map(n => n.id) : []);
    const soloPool = outdoor.filter(n => !used.has(n.id)).sort(() => Math.random() - 0.5);

    // order: solo1 → pair conversation → solo2
    if (soloPool[0]) introTargets.push({ npc: soloPool[0], x: soloPool[0].x, y: soloPool[0].y, type: "solo" });
    if (closestPair) {
      const mid = { x: (closestPair[0].x + closestPair[1].x) / 2, y: (closestPair[0].y + closestPair[1].y) / 2 };
      introTargets.push({ npc: closestPair[0], npc2: closestPair[1], x: mid.x, y: mid.y, type: "pair" });
    }
    if (soloPool[1]) introTargets.push({ npc: soloPool[1], x: soloPool[1].x, y: soloPool[1].y, type: "solo" });
  }

  function triggerSpeech(target) {
    const key = target.npc.id + (target.npc2 ? "_" + target.npc2.id : "");
    if (introTriggeredSpeech.has(key)) return;
    introTriggeredSpeech.add(key);

    if (target.type === "pair" && target.npc2) {
      // NPC pair conversation
      const a = target.npc, b = target.npc2;
      const rel = ctx.npcRelationLabel(ctx.getNpcRelation(a.id, b.id), ctx.t);
      const introNpcOverrides = { favorLevel: 2, isNpcChat: true };
      ctx.llmReplyOrEmpty(a, ctx.t("llm_social_start", { nameB: b.name, rel, time: ctx.formatTime() }), introNpcOverrides)
        .then(lineA => {
          if (lineA) ctx.upsertSpeechBubble(a.id, lineA, 4000);
          return new Promise(r => setTimeout(r, 1500)).then(() =>
            ctx.llmReplyOrEmpty(b, ctx.t("llm_social_reply", { nameA: a.name, line: lineA || "..." }), introNpcOverrides)
          );
        })
        .then(lineB => { if (lineB) ctx.upsertSpeechBubble(b.id, lineB, 4000); })
        .catch(e => console.warn("[intro pair]", e.message));
    } else {
      // monologue
      const npc = target.npc;
      const n = npc.needs || {};
      const needHint = n.hunger > 60 ? ctx.t("llm_need_hungry") : n.energy < 30 ? ctx.t("llm_need_tired") : "";
      const _wMap = { clear: ctx.t("llm_weather_clear"), cloudy: ctx.t("llm_weather_cloudy"), rain: ctx.t("llm_weather_rain"), storm: ctx.t("llm_weather_storm"), snow: ctx.t("llm_weather_snow"), fog: ctx.t("llm_weather_fog") };
      const _tw = ctx.t("llm_ambient_weather", { time: ctx.formatTime(), weather: _wMap[ctx.weather.current] || ctx.t("llm_weather_clear") });
      ctx.llmReplyOrEmpty(npc, ctx.t("llm_ambient_prompt", { weather: _tw, need: needHint }))
        .then(line => { if (line) ctx.upsertSpeechBubble(npc.id, line, 4000); })
        .catch(e => console.warn("[intro solo]", e.message));
    }
  }

  function update(dt) {
    if (introPhase >= 2) return;
    introTimer += dt;

    if (introPhase === 0) {
      if (introTargets.length === 0) {
        initTargets();
        introCamPos.x = ctx.player.x;
        introCamPos.y = ctx.player.y;
      }

      // zoom in on NPCs
      const targetZoom = ctx.DEFAULT_ZOOM * 1.6;
      ctx.world.zoom += (targetZoom - ctx.world.zoom) * 0.12;

      // move virtual camera toward current NPC target
      const target = introTargets[introTargetIdx];
      if (target) {
        triggerSpeech(target);
        const targetX = target.npc ? target.npc.x : target.x;
        const targetY = target.npc ? target.npc.y : target.y;
        introCamPos.x += (targetX - introCamPos.x) * 0.08;
        introCamPos.y += (targetY - introCamPos.y) * 0.08;
      }

      // set renderer camera override
      if (ctx.gameRenderer3D) ctx.gameRenderer3D._cameraFollowTarget = introCamPos;

      // advance to next target after time
      const elapsed = introTimer - introTargetIdx * INTRO_PHASE0_EACH;
      if (elapsed >= INTRO_PHASE0_EACH) {
        introTargetIdx++;
        if (introTargetIdx >= introTargets.length) {
          introPhase = 1;
        }
      }
    }

    if (introPhase === 1) {
      // return camera to player position
      introCamPos.x += (ctx.player.x - introCamPos.x) * 0.08;
      introCamPos.y += (ctx.player.y - introCamPos.y) * 0.08;
      ctx.world.zoom += (ctx.DEFAULT_ZOOM - ctx.world.zoom) * 0.08;

      if (ctx.gameRenderer3D) ctx.gameRenderer3D._cameraFollowTarget = introCamPos;

      const dx = Math.abs(introCamPos.x - ctx.player.x);
      const dy = Math.abs(introCamPos.y - ctx.player.y);
      if (dx < 0.2 && dy < 0.2) {
        introPhase = 2;
        ctx.world.zoom = ctx.DEFAULT_ZOOM;
        // release camera override → follow player
        if (ctx.gameRenderer3D) ctx.gameRenderer3D._cameraFollowTarget = null;
      }
    }
  }

  /**
   * Pre-simulate NPC movement before first frame.
   */
  function presimulateNpcs(seconds) {
    const steps = seconds * 10;  // 0.1s per step
    for (let i = 0; i < steps; i++) {
      for (const npc of ctx.npcs) {
        if (npc.id === "guide") continue;
        if (!npc.roamTarget || dist(npc, npc.roamTarget) < 0.5) {
          const destinations = [npc.home, npc.work, npc.hobby].filter(Boolean);
          const base = destinations[Math.floor(Math.random() * destinations.length)];
          npc.roamTarget = {
            x: ctx.clamp(base.x + (Math.random() - 0.5) * 4, 1, ctx.world.width - 1),
            y: ctx.clamp(base.y + (Math.random() - 0.5) * 4, 1, ctx.world.height - 1),
          };
        }
        const dx = npc.roamTarget.x - npc.x;
        const dy = npc.roamTarget.y - npc.y;
        const d = Math.hypot(dx, dy);
        if (d > 0.3) {
          const speed = npc.speed * 0.1;
          const nx = npc.x + (dx / d) * Math.min(speed, d);
          const ny = npc.y + (dy / d) * Math.min(speed, d);
          if (ctx.canStandInScene(nx, ny, "outdoor")) {
            npc.x = nx;
            npc.y = ny;
          } else {
            npc.roamTarget = null;
          }
        }
      }
    }
  }

  function skip() {
    introPhase = 2;
    if (ctx.gameRenderer3D) ctx.gameRenderer3D._cameraFollowTarget = null;
  }

  return {
    initTargets,
    update,
    presimulate: presimulateNpcs,
    skip,
    get phase() { return introPhase; },
    get isDone() { return introPhase >= 2; },
    get camPos() { return introCamPos; },
  };
}
