enum rKeys {
  BASE = 'file-transfer',
  CACHE = 'cache',
  IMAGES = 'images',
  DOCUMENTS = 'documents',
}

export function rk(...args: Array<rKeys | string>): string {
  return Array.prototype.slice.call(args).join(':');
}

export const rBaseKey = rKeys.BASE;
export const rCacheKey = rk(rBaseKey, rKeys.CACHE);
export const rCachedImgsKey = rk(rCacheKey, rKeys.IMAGES);
export const rCachedDocsKey = rk(rCacheKey, rKeys.DOCUMENTS);
