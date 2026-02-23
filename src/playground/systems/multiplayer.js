import { nowMs } from '../utils/helpers.js';

/**
 * Multiplayer system: Firebase Realtime DB based player sync.
 * @param {object} ctx - { player, world, addChat, addLog, t, upsertSpeechBubble, normalizePlayerFlag, uiOnlineEl }
 */
export function createMultiplayer(ctx) {
  const mp = {
    enabled: false,
    db: null,
    sessionId: null,
    playersRef: null,
    messagesRef: null,
    remotePlayers: {},
    lastBroadcastAt: 0,
    lastMessageSendAt: 0,
    MESSAGE_COOLDOWN: 1500,
    BROADCAST_INTERVAL: 100,
    STALE_TIMEOUT: 12_000,
  };

  function remotePlayerList() {
    return Object.values(mp.remotePlayers);
  }

  function init() {
    const cfg = window.PG_FIREBASE_CONFIG;
    if (!cfg || !cfg.databaseURL || typeof firebase === "undefined") return;
    try {
      firebase.initializeApp(cfg);
      mp.db = firebase.database();
      mp.enabled = true;
      mp.sessionId = "p_" + Math.random().toString(36).slice(2, 10) + "_" + Date.now().toString(36);
      mp.playersRef = mp.db.ref("playground/players");

      const myRef = mp.playersRef.child(mp.sessionId);
      myRef.onDisconnect().remove();

      myRef.set({
        name: ctx.player.name,
        flag: ctx.player.flag || "",
        x: Math.round(ctx.player.x * 100) / 100,
        y: Math.round(ctx.player.y * 100) / 100,
        color: ctx.player.color,
        species: ctx.player.species || "human_a",
        ts: firebase.database.ServerValue.TIMESTAMP,
      });

      function sanitizeRemote(d) {
        const clampX = typeof d.x === "number" && isFinite(d.x) ? Math.max(0, Math.min(ctx.world.width, d.x)) : 0;
        const clampY = typeof d.y === "number" && isFinite(d.y) ? Math.max(0, Math.min(ctx.world.height, d.y)) : 0;
        const safeName = String(d.name || "???").replace(/[<>]/g, "").slice(0, 20);
        const safeFlag = ctx.normalizePlayerFlag(d.flag);
        return { x: clampX, y: clampY, name: safeName, flag: safeFlag, color: String(d.color || "#aaa").slice(0, 20), species: String(d.species || "human_a").slice(0, 20), ts: d.ts || 0 };
      }

      mp.playersRef.on("child_added", (snap) => {
        if (snap.key === mp.sessionId) return;
        const d = snap.val();
        if (!d) return;
        const s = sanitizeRemote(d);
        mp.remotePlayers[snap.key] = {
          id: snap.key, name: s.name, flag: s.flag,
          x: s.x, y: s.y, _targetX: s.x, _targetY: s.y,
          color: s.color, species: s.species, ts: s.ts, _isRemotePlayer: true,
        };
      });

      mp.playersRef.on("child_changed", (snap) => {
        if (snap.key === mp.sessionId) return;
        const d = snap.val();
        if (!d) return;
        const s = sanitizeRemote(d);
        const rp = mp.remotePlayers[snap.key];
        if (rp) {
          rp.name = s.name; rp.flag = s.flag;
          rp._targetX = s.x; rp._targetY = s.y;
          rp.color = s.color; rp.species = s.species; rp.ts = s.ts;
        } else {
          mp.remotePlayers[snap.key] = {
            id: snap.key, name: s.name, flag: s.flag,
            x: s.x, y: s.y, _targetX: s.x, _targetY: s.y,
            color: s.color, species: s.species, ts: s.ts, _isRemotePlayer: true,
          };
        }
      });

      mp.playersRef.on("child_removed", (snap) => {
        delete mp.remotePlayers[snap.key];
      });

      mp.messagesRef = mp.db.ref("playground/messages");
      mp.messagesRef.orderByChild("ts").startAt(Date.now()).on("child_added", (snap) => {
        const d = snap.val();
        if (!d || d.sessionId === mp.sessionId) return;
        const name = String(d.name || "???").replace(/[<>]/g, "").slice(0, 20);
        const text = String(d.text || "").slice(0, 200);
        const flag = ctx.normalizePlayerFlag(d.flag);
        const displayName = (flag ? flag + " " : "") + name;
        if (!text) return;
        ctx.addChat(displayName, text, "remote");
        if (d.sessionId && mp.remotePlayers[d.sessionId]) {
          ctx.upsertSpeechBubble("remote_" + d.sessionId, text, 4000);
        }
      });

      if (ctx.uiOnlineEl) ctx.uiOnlineEl.hidden = false;
      ctx.addLog(ctx.t("log_mp_connected"));
      ctx.addChat("System", ctx.t("sys_mp_connected"));
    } catch (err) {
      ctx.addLog(ctx.t("log_mp_fail", { err: err.message || err }));
    }
  }

  function broadcast() {
    if (!mp.enabled) return;
    const now = nowMs();
    if (now - mp.lastBroadcastAt < mp.BROADCAST_INTERVAL) return;
    mp.lastBroadcastAt = now;
    mp.playersRef.child(mp.sessionId).update({
      name: ctx.player.name, flag: ctx.player.flag || "",
      x: Math.round(ctx.player.x * 100) / 100, y: Math.round(ctx.player.y * 100) / 100,
      color: ctx.player.color, species: ctx.player.species || "human_a",
      ts: firebase.database.ServerValue.TIMESTAMP,
    });
  }

  function interpolate(dt) {
    for (const rp of Object.values(mp.remotePlayers)) {
      if (!isFinite(rp._targetX) || !isFinite(rp._targetY)) continue;
      const dx = rp._targetX - rp.x;
      const dy = rp._targetY - rp.y;
      const lerp = Math.min(1, dt * 8);
      rp.x += dx * lerp;
      rp.y += dy * lerp;
    }
  }

  function cleanStale() {
    const now = Date.now();
    for (const [key, rp] of Object.entries(mp.remotePlayers)) {
      if (now - rp.ts > mp.STALE_TIMEOUT) {
        delete mp.remotePlayers[key];
        mp.playersRef.child(key).remove().catch(() => {});
      }
    }
  }

  function sendMessage(text) {
    if (!mp.enabled || !mp.messagesRef) return;
    const now = Date.now();
    if (now - mp.lastMessageSendAt < mp.MESSAGE_COOLDOWN) return;
    mp.lastMessageSendAt = now;
    const safeText = String(text || "").slice(0, 200);
    if (!safeText) return;
    mp.messagesRef.push({
      name: ctx.player.name, flag: ctx.player.flag || "", text: safeText,
      sessionId: mp.sessionId, ts: firebase.database.ServerValue.TIMESTAMP,
    });
    ctx.upsertSpeechBubble("player", safeText, 4000);
  }

  function cleanMessages() {
    if (!mp.enabled || !mp.messagesRef) return;
    const cutoff = Date.now() - 60_000;
    mp.messagesRef.orderByChild("ts").endAt(cutoff).once("value", (snap) => {
      const updates = {};
      snap.forEach((child) => { updates[child.key] = null; });
      if (Object.keys(updates).length > 0) mp.messagesRef.update(updates);
    });
  }

  function onlineCount() {
    return Object.keys(mp.remotePlayers).length + 1;
  }

  return {
    get enabled() { return mp.enabled; },
    init, broadcast, interpolate, cleanStale, sendMessage, cleanMessages,
    onlineCount, remotePlayerList,
  };
}
