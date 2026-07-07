import LruCache from "../utils/LruCache.js";


const TTL_MS = Number(process.env.LINK_CACHE_TTL_MS) || 60_000;
const MAX_SIZE = Number(process.env.LINK_CACHE_MAX_SIZE) || 500;

const linkCache = new LruCache({ maxSize: MAX_SIZE, ttlMs: TTL_MS });


export function toCacheEntry(link) {
  return {
    _id: link._id,
    longUrl: link.longUrl,
    isActive: link.isActive,
    expiresAt: link.expiresAt || null,
  };
}


export function getCachedLink(code) {
  return linkCache.get(code);
}


export function cacheLink(code, link) {
  linkCache.set(code, toCacheEntry(link));
}


export function invalidateLink(code) {
  if (code) linkCache.delete(code);
}

export function cacheStats() {
  return linkCache.stats();
}

export default linkCache;
