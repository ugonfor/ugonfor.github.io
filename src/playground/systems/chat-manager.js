import { nowMs, bubbleText } from '../utils/helpers.js';

/**
 * ChatManager — owns all chat-related state and rendering.
 *
 * State:
 *   npcChatHistories, globalChats, systemToasts, speechBubbles, logs
 *
 * Depends on:
 *   convoMgr  — to decide NPC vs global routing
 *   t         — i18n translation function
 *   formatTime — returns current in-game HH:MM string
 *   chatTargetNpc — returns { npc, focused, near } or null
 *   mp        — multiplayer reference (lazy getter, may be null)
 *   domRefs   — DOM elements used for rendering
 */
export function createChatManager({
  convoMgr, t, formatTime, chatTargetNpc, getMp,
  domRefs,
}) {
  // domRefs = { chatLogEl, uiLog, toastContainer }

  // ─── Internal state ───
  const npcChatHistories = {};
  const globalChats = [];
  const systemToasts = [];
  const speechBubbles = [];
  const logs = [];

  const TOAST_DURATION_MS = 4000;

  // ─── Speech bubbles ───

  function upsertSpeechBubble(id, text, ttlMs = 3600) {
    const now = nowMs();
    const value = bubbleText(text);
    for (let i = 0; i < speechBubbles.length; i += 1) {
      if (speechBubbles[i].id === id) {
        speechBubbles[i].text = value;
        speechBubbles[i].until = now + ttlMs;
        return;
      }
    }
    speechBubbles.push({ id, text: value, until: now + ttlMs });
    if (speechBubbles.length > 14) speechBubbles.splice(0, speechBubbles.length - 14);
  }

  // ─── Logging ───

  function addLog(text) {
    logs.unshift({ text, stamp: formatTime() });
    if (logs.length > 16) logs.length = 16;
    const uiLog = domRefs.uiLog;
    if (!uiLog) return;
    const frag = document.createDocumentFragment();
    for (const entry of logs) {
      const row = document.createElement("div");
      const stamp = document.createElement("strong");
      stamp.textContent = entry.stamp;
      row.appendChild(stamp);
      row.appendChild(document.createTextNode(` ${entry.text}`));
      frag.appendChild(row);
    }
    uiLog.replaceChildren(frag);
  }

  // ─── Chat histories ───

  function getNpcChats(npcId) {
    if (!npcChatHistories[npcId]) npcChatHistories[npcId] = [];
    return npcChatHistories[npcId];
  }

  function addNpcChat(npcId, speaker, text) {
    const history = getNpcChats(npcId);
    history.unshift({ speaker, text, source: "", stamp: formatTime() });
    if (history.length > 30) history.length = 30;
    renderCurrentChat();
  }

  function addGlobalChat(speaker, text, source) {
    globalChats.unshift({ speaker, text, source: source || "", stamp: formatTime() });
    if (globalChats.length > 24) globalChats.length = 24;
    renderCurrentChat();
  }

  function addSystemToast(text) {
    systemToasts.push({ text, stamp: formatTime(), until: performance.now() + TOAST_DURATION_MS });
    if (systemToasts.length > 5) systemToasts.shift();
    renderToasts();
  }

  function addChat(speaker, text, source) {
    if (speaker === "System") { addSystemToast(text); return; }
    if (source === "remote" || source === "local-player") { addGlobalChat(speaker, text, source); return; }
    const targetNpcId = convoMgr.chatTargetNpcId();
    if (targetNpcId) { addNpcChat(targetNpcId, speaker, text); }
    else { addGlobalChat(speaker, text, source); }
  }

  // ─── Rendering ───

  function renderCurrentChat() {
    const chatLogEl = domRefs.chatLogEl;
    if (!chatLogEl) return;
    const target = chatTargetNpc();
    const npcNear = target && target.near;
    const mp = getMp();
    const mpChat = mp && mp.enabled && !npcNear;

    let messages;
    if (mpChat) {
      messages = globalChats;
    } else if (target && target.npc) {
      messages = getNpcChats(target.npc.id);
    } else if (convoMgr.focusNpcId) {
      messages = getNpcChats(convoMgr.focusNpcId);
    } else {
      messages = [];
    }

    const frag = document.createDocumentFragment();
    for (const c of messages) {
      const row = document.createElement("div");
      if (c.source === "remote") row.classList.add("pg-chat-remote");
      else if (c.source === "local-player") row.classList.add("pg-chat-local-player");
      const sp = document.createElement("strong");
      sp.textContent = c.speaker;
      row.appendChild(sp);
      row.appendChild(document.createTextNode(`: ${c.text}`));
      frag.appendChild(row);
    }
    chatLogEl.replaceChildren(frag);
  }

  function renderToasts() {
    const toastContainer = domRefs.toastContainer;
    if (!toastContainer) return;
    const now = performance.now();
    while (systemToasts.length && systemToasts[0].until <= now) systemToasts.shift();
    const frag = document.createDocumentFragment();
    for (const n of systemToasts) {
      const el = document.createElement("div");
      el.className = "pg-toast";
      el.textContent = n.text;
      frag.appendChild(el);
    }
    toastContainer.replaceChildren(frag);
  }

  // ─── Streaming chat (used for LLM streaming responses) ───

  function startStreamingChat(npcId, speaker) {
    const history = getNpcChats(npcId);
    const entry = { speaker, text: "", stamp: formatTime(), streaming: true };
    history.unshift(entry);
    if (history.length > 30) history.length = 30;
    renderCurrentChat();
    return {
      append(chunk) {
        entry.text += chunk;
        renderCurrentChat();
      },
      done() {
        entry.streaming = false;
        renderCurrentChat();
      },
      empty() {
        return !entry.text.trim();
      },
      remove() {
        const idx = history.indexOf(entry);
        if (idx >= 0) history.splice(idx, 1);
        renderCurrentChat();
      },
      text() {
        return entry.text;
      },
    };
  }

  // ─── Public API ───

  return {
    // Speech bubbles
    get speechBubbles() { return speechBubbles; },
    upsertSpeechBubble,

    // Chat histories
    getNpcChats,
    addNpcChat,
    addGlobalChat,
    addChat,

    // Logging
    addLog,
    addSystemToast,

    // System toasts (direct access for updateUI check)
    get systemToasts() { return systemToasts; },

    // Rendering
    renderCurrentChat,
    renderToasts,

    // Streaming
    startStreamingChat,
  };
}
