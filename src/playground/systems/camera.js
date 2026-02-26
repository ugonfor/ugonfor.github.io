import { CONVERSATION_MIN_ZOOM, DEFAULT_ZOOM, GAME } from '../core/constants.js';
import { clamp } from '../utils/helpers.js';

/**
 * Camera system — manages camera pan, conversation zoom, and contemplation mode.
 *
 * ctx must provide:
 *   world, player, npcs, canvas, activeConversationNpc (fn), project (fn), addLog, t
 */
export function createCameraSystem(ctx) {
  const cameraPan = { x: 0, y: 0 };
  const convoPan = { x: 0, y: 0 };
  let preConversationZoom = null;
  let contemplationMode = false;
  let contemplationTargetIdx = 0;
  let contemplationNextAt = 0;

  return {
    /** Expose cameraPan for save/load and enterBuilding/exitBuilding */
    get cameraPan() { return cameraPan; },
    get convoPan() { return convoPan; },
    get contemplationMode() { return contemplationMode; },

    setContemplationMode(v) { contemplationMode = v; },

    toggleContemplation() {
      contemplationMode = !contemplationMode;
      if (contemplationMode) {
        contemplationTargetIdx = 0;
        contemplationNextAt = 0;
      }
    },

    /** Called from mouse/touch drag handlers */
    addPan(dx, dy) {
      cameraPan.x = clamp(cameraPan.x + dx, -320, 320);
      cameraPan.y = clamp(cameraPan.y + dy, -220, 220);
    },

    /** Save current pan and reset (e.g. entering a building) */
    savePanAndReset() {
      const saved = { x: cameraPan.x, y: cameraPan.y };
      cameraPan.x = 0;
      cameraPan.y = 0;
      return saved;
    },

    /** Restore previously saved pan (e.g. exiting a building) */
    restorePan(saved) {
      if (saved) {
        cameraPan.x = saved.x;
        cameraPan.y = saved.y;
      }
    },

    /** Set pan directly (used by loadState) */
    setPan(x, y) {
      cameraPan.x = clamp(x, -320, 320);
      cameraPan.y = clamp(y, -220, 220);
    },

    /** Adjusts camera zoom/pan during NPC conversation */
    updateConversation() {
      const { world, player } = ctx;
      const npc = ctx.activeConversationNpc();
      if (npc) {
        if (preConversationZoom === null) preConversationZoom = world.zoom;
        const desiredZoom = Math.max(preConversationZoom, CONVERSATION_MIN_ZOOM);
        world.zoom += (desiredZoom - world.zoom) * 0.1;

        const dx = npc.x - player.x;
        const dy = npc.y - player.y;
        const d = Math.hypot(dx, dy) || 1;
        const nx = dx / d;
        const ny = dy / d;
        const px = -ny;
        const py = nx;

        const desiredPanX = clamp(-nx * 130 + px * 72, -220, 220);
        const desiredPanY = clamp(-ny * 94 + py * 40 - 44, -180, 180);
        convoPan.x += (desiredPanX - convoPan.x) * 0.16;
        convoPan.y += (desiredPanY - convoPan.y) * 0.16;
        return;
      }

      if (preConversationZoom !== null) {
        world.zoom += (preConversationZoom - world.zoom) * 0.08;
        if (Math.abs(preConversationZoom - world.zoom) < 0.02) {
          world.zoom = preConversationZoom;
          preConversationZoom = null;
        }
      }
      convoPan.x *= 0.84;
      convoPan.y *= 0.84;
      if (Math.abs(convoPan.x) < 0.2) convoPan.x = 0;
      if (Math.abs(convoPan.y) < 0.2) convoPan.y = 0;
    },

    /** V-key auto-follow mode — cycles camera to outdoor NPCs */
    updateContemplation(now) {
      const { npcs, player } = ctx;
      if (!contemplationMode) return;
      if (now < contemplationNextAt) return;
      contemplationNextAt = now + GAME.CONTEMPLATION_MIN_MS + Math.random() * GAME.CONTEMPLATION_RANGE_MS;
      const outdoor = npcs.filter(n => (n.currentScene || "outdoor") === "outdoor");
      if (!outdoor.length) return;
      contemplationTargetIdx = (contemplationTargetIdx + 1) % outdoor.length;
      const target = outdoor[contemplationTargetIdx];
      cameraPan.x = clamp((target.x - player.x) * 20, -320, 320);
      cameraPan.y = clamp((target.y - player.y) * 12, -220, 220);
    },

    /** Reset camera to centered on player */
    resetView() {
      const { world, addLog, t } = ctx;
      cameraPan.x = 0;
      cameraPan.y = 0;
      world.zoom = DEFAULT_ZOOM;
      addLog(t("log_view_reset"));
    },

    /** Final camera position calculation each frame */
    updateCamera() {
      const { world, player, canvas, project } = ctx;
      const p = project(player.x, player.y, 0);
      const tx = canvas.width * 0.5 - (p.x - world.cameraX) + cameraPan.x + convoPan.x;
      const ty = canvas.height * 0.58 - (p.y - world.cameraY) + cameraPan.y + convoPan.y;
      world.cameraX += (tx - world.cameraX) * 0.08;
      world.cameraY += (ty - world.cameraY) * 0.08;
    },
  };
}
