import { nowMs } from "../utils/helpers.js";

/**
 * Conversation state machine.
 * Only this module owns conversationFocusNpcId and chatSession state.
 * All external code must go through these methods.
 */
export function createConversationManager({ onFocusChange } = {}) {
  let _focusNpcId = null;
  let _sessionNpcId = null;
  let _sessionExpiresAt = 0;
  let _lockReason = null;

  function _notify() {
    onFocusChange?.(_focusNpcId);
  }

  return {
    /** Currently focused NPC id (null = no conversation) */
    get focusNpcId() { return _focusNpcId; },

    /** Session NPC id (may outlive focus for UI purposes) */
    get sessionNpcId() { return _sessionNpcId; },

    /**
     * Start or switch conversation focus.
     * Returns false if locked by an async operation with a different reason.
     */
    startConversation(npcId, holdMs = 18_000, reason = "user") {
      if (_lockReason && reason !== _lockReason) {
        return false;
      }
      _focusNpcId = npcId;
      _sessionNpcId = npcId;
      _sessionExpiresAt = nowMs() + holdMs;
      _lockReason = null;
      _notify();
      return true;
    },

    /** End conversation and clear all state. */
    endConversation() {
      const prev = _focusNpcId;
      _focusNpcId = null;
      _sessionNpcId = null;
      _sessionExpiresAt = 0;
      _lockReason = null;
      if (prev) _notify();
    },

    /** Clear focus for a specific NPC (e.g., when NPC removed or out of range). */
    clearFocusIf(npcId) {
      if (_focusNpcId === npcId) {
        _focusNpcId = null;
        _notify();
      }
      if (_sessionNpcId === npcId) {
        _sessionNpcId = null;
        _sessionExpiresAt = 0;
      }
    },

    /** Lock to prevent other reasons from changing focus during async ops. */
    lockForAsync(reason) { _lockReason = reason; },
    unlockAsync(reason) { if (_lockReason === reason) _lockReason = null; },

    /** Check if session is still active for a given NPC. */
    isSessionActive(npcId) {
      return _sessionNpcId === npcId && nowMs() < _sessionExpiresAt;
    },

    /** Extend session timer. */
    refreshSession(npcId, holdMs) {
      if (_sessionNpcId === npcId) {
        _sessionExpiresAt = nowMs() + holdMs;
      }
    },

    /**
     * Get the effective chat target NPC id.
     * Prefers focusNpcId, falls back to active session.
     */
    chatTargetNpcId() {
      return _focusNpcId
        || (_sessionNpcId && nowMs() < _sessionExpiresAt ? _sessionNpcId : null);
    },
  };
}
