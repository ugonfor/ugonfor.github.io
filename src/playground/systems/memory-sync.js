/**
 * Firebase-based NPC memory persistence.
 * Syncs NPC memory/favor data to Firebase Realtime DB.
 */
export function createMemorySync(firebaseDb, playerId) {
  if (!firebaseDb || !playerId) return null;

  const ref = firebaseDb.ref(`playground/memories/${playerId}`);
  let lastSyncAt = 0;

  return {
    async save(npcs, playerName) {
      const data = {};
      for (const npc of npcs) {
        if (!npc.memory || npc.id.startsWith("shared_") || npc.id.startsWith("custom_")) continue;
        data[npc.id] = {
          memory: npc.memory,
          favorLevel: npc.favorLevel,
          favorPoints: npc.favorPoints,
        };
      }
      data._meta = { name: playerName, lastSaved: Date.now() };
      try {
        await ref.set(data);
        lastSyncAt = Date.now();
      } catch (e) {
        console.warn("[MemorySync] save failed:", e.message);
      }
    },

    async load() {
      try {
        const snap = await ref.once("value");
        return snap.val();
      } catch (e) {
        console.warn("[MemorySync] load failed:", e.message);
        return null;
      }
    },

    getLastSyncAt() {
      return lastSyncAt;
    },
  };
}

/**
 * Apply server memory data to NPC array.
 * Only overrides if server data is newer.
 */
export function applyServerMemory(npcs, serverData, localLastSaved) {
  if (!serverData || !serverData._meta) return false;
  if (localLastSaved && serverData._meta.lastSaved <= localLastSaved) return false;

  let applied = 0;
  for (const npc of npcs) {
    const saved = serverData[npc.id];
    if (!saved) continue;
    if (saved.memory) {
      npc.memory = saved.memory;
    }
    if (saved.favorLevel != null) npc.favorLevel = saved.favorLevel;
    if (saved.favorPoints != null) npc.favorPoints = saved.favorPoints;
    applied++;
  }
  return applied > 0;
}
