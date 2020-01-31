export enum rKeys {
  BASE = 'file-transfer',
  CACHE = 'cache',
  FILES = 'files',
  FILE = 'file',
  METADATA = 'metadata',
}

export function rk(...args: Array<rKeys | string>): string {
  return Array.prototype.slice.call(args).join(':');
}

export const rBaseKey = rKeys.BASE;
export const rCacheKey = rk(rBaseKey, rKeys.CACHE);
export const rCachedFilesKey = rk(rCacheKey, rKeys.FILES);
