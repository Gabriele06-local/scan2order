const CACHE_PREFIX = 'qr-menu-';
const TTL = 60 * 60 * 1000; // 1 hour

export function setCache<T>(key: string, data: T): void {
  try {
    const entry = { data, ts: Date.now() };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {}
}

export function getCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.ts > TTL) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return entry.data as T;
  } catch {
    return null;
  }
}
