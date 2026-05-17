// Shim window.storage qui mappe vers localStorage pour fonctionner hors de claude.ai.
// L'API mimique celle utilisée dans le code original (get/set retournent { value }).

if (typeof window !== 'undefined' && !window.storage) {
  const PREFIX = 'coach-nutrition:';

  window.storage = {
    async get(key) {
      try {
        const raw = localStorage.getItem(PREFIX + key);
        if (raw === null) return null;
        return { key, value: raw, shared: false };
      } catch (e) {
        console.warn('[storage.get] failed', e);
        return null;
      }
    },
    async set(key, value, shared = false) {
      try {
        localStorage.setItem(PREFIX + key, String(value));
        return { key, value: String(value), shared };
      } catch (e) {
        console.warn('[storage.set] failed', e);
        return null;
      }
    },
    async delete(key) {
      try {
        localStorage.removeItem(PREFIX + key);
        return { key, deleted: true, shared: false };
      } catch (e) {
        console.warn('[storage.delete] failed', e);
        return null;
      }
    },
    async list(prefix = '') {
      try {
        const fullPrefix = PREFIX + prefix;
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(fullPrefix)) {
            keys.push(k.slice(PREFIX.length));
          }
        }
        return { keys, prefix, shared: false };
      } catch (e) {
        console.warn('[storage.list] failed', e);
        return { keys: [], prefix, shared: false };
      }
    }
  };
}

export default {};
