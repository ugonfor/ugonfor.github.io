/**
 * Firebase-based NPC memory persistence.
 * Shared memory: all visitors' conversations stored together.
 * Per-player favor: each visitor has their own favor level.
 *
 * Firebase structure:
 *   playground/npc-memory/{npcId}/entries = [...with playerName tag]
 *   playground/npc-memory/{npcId}/favor/{playerName} = { level, points }
 */
export function createMemorySync(firebaseDb, playerId) {
  if (!firebaseDb || !playerId) return null;

  const sharedRef = firebaseDb.ref("playground/npc-memory");
  // Legacy per-player ref for migration
  const legacyRef = firebaseDb.ref(`playground/memories/${playerId}`);
  let lastSyncAt = 0;

  return {
    async save(npcs, playerName) {
      if (!playerName) return;
      const updates = {};
      for (const npc of npcs) {
        if (!npc.memory || npc.id.startsWith("shared_") || npc.id.startsWith("custom_")) continue;
        // Save shared entries (tagged with playerName)
        updates[`${npc.id}/entries`] = npc.memory.entries || [];
        updates[`${npc.id}/stats`] = {
          conversationCount: npc.memory.conversationCount || 0,
          giftsReceived: npc.memory.giftsReceived || 0,
          questsShared: npc.memory.questsShared || 0,
          lastConversation: npc.memory.lastConversation || 0,
        };
        // Save per-player favor
        updates[`${npc.id}/favor/${playerName}`] = {
          level: npc.favorLevel,
          points: npc.favorPoints,
        };
      }
      updates["_meta/lastSaved"] = Date.now();
      try {
        await sharedRef.update(updates);
        lastSyncAt = Date.now();
      } catch (e) {
        console.warn("[MemorySync] save failed:", e.message);
      }
    },

    async load(playerName) {
      try {
        const snap = await sharedRef.once("value");
        const data = snap.val();
        if (!data) {
          // Try legacy per-player data for migration
          return { _legacy: true, data: await loadLegacy() };
        }
        return { _legacy: false, data, playerName };
      } catch (e) {
        console.warn("[MemorySync] load failed:", e.message);
        return null;
      }
    },

    getLastSyncAt() {
      return lastSyncAt;
    },
  };

  async function loadLegacy() {
    try {
      const snap = await legacyRef.once("value");
      return snap.val();
    } catch (e) {
      return null;
    }
  }
}

/**
 * Apply shared memory data to NPC array.
 */
export function applyServerMemory(npcs, result, localLastSaved) {
  if (!result) return false;

  // Legacy format migration
  if (result._legacy && result.data) {
    return applyLegacyMemory(npcs, result.data, localLastSaved);
  }

  const serverData = result.data;
  const playerName = result.playerName;
  if (!serverData) return false;

  let applied = 0;
  for (const npc of npcs) {
    const saved = serverData[npc.id];
    if (!saved) continue;

    // Restore shared entries
    if (saved.entries && Array.isArray(saved.entries)) {
      npc.memory = npc.memory || {};
      npc.memory.entries = saved.entries;
    }
    if (saved.stats) {
      npc.memory = npc.memory || {};
      npc.memory.conversationCount = saved.stats.conversationCount || 0;
      npc.memory.giftsReceived = saved.stats.giftsReceived || 0;
      npc.memory.questsShared = saved.stats.questsShared || 0;
      npc.memory.lastConversation = saved.stats.lastConversation || 0;
    }
    // Restore per-player favor
    if (playerName && saved.favor && saved.favor[playerName]) {
      const fav = saved.favor[playerName];
      if (fav.level != null) npc.favorLevel = fav.level;
      if (fav.points != null) npc.favorPoints = fav.points;
    }
    applied++;
  }
  return applied > 0;
}

/** Apply old per-player format (migration path) */
function applyLegacyMemory(npcs, serverData, localLastSaved) {
  if (!serverData || !serverData._meta) return false;
  if (localLastSaved && serverData._meta.lastSaved <= localLastSaved) return false;

  let applied = 0;
  for (const npc of npcs) {
    const saved = serverData[npc.id];
    if (!saved) continue;
    if (saved.memory) npc.memory = saved.memory;
    if (saved.favorLevel != null) npc.favorLevel = saved.favorLevel;
    if (saved.favorPoints != null) npc.favorPoints = saved.favorPoints;
    applied++;
  }
  return applied > 0;
}
