/**
 * Prevents concurrent async operations from creating race conditions.
 * Each named slot can have at most one pending operation.
 */
export function createAsyncGuard() {
  const slots = {};
  return {
    isPending(name) { return !!slots[name]; },
    acquire(name) {
      if (slots[name]) return false;
      slots[name] = true;
      return true;
    },
    release(name) { slots[name] = false; },
    async guarded(name, fn) {
      if (!this.acquire(name)) return null;
      try { return await fn(); }
      finally { this.release(name); }
    },
  };
}
