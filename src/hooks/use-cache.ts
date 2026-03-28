import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface CacheConfig {
  key: string;
  duration?: number; // milliseconds, mặc định 5 phút
}

interface CachedData<T> {
  timestamp: number;
  data: T;
  userId?: string;
}

export function useCache<T>(config: CacheConfig) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  
  const { key, duration = 300000 } = config; // 5 phút mặc định
  const storageKey = userId ? `${userId}_${key}` : key;
  
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get cached data
  const getCache = useCallback((): T | null => {
    try {
      const cached = sessionStorage.getItem(storageKey);
      if (!cached) return null;

      const parsed: CachedData<T> = JSON.parse(cached);
      const now = Date.now();

      // Kiểm tra cache còn hiệu lực không
      // Và kiểm tra xem có đúng User ID của cache đó không (đề phòng)
      if (now - parsed.timestamp < duration && (!parsed.userId || parsed.userId === userId)) {
        return parsed.data;
      }

      // Cache hết hạn hoặc sai user, xóa luôn
      sessionStorage.removeItem(storageKey);
      return null;
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  }, [storageKey, duration, userId]);

  // Set cached data
  const setCache = useCallback((data: T) => {
    try {
      const cacheData: CachedData<T> = {
        timestamp: Date.now(),
        data,
        userId: userId || undefined,
      };
      sessionStorage.setItem(storageKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  }, [storageKey, userId]);

  // Clear all dashboard caches
  const clearAllCaches = useCallback(() => {
    const keys = [
      'hop-dong-data',
      'hoa-don-data',
      'phong-data',
      'khach-thue-data',
      'toa-nha-data',
      'thanh-toan-data',
      'su-co-data',
      'tai-khoan-data',
    ];
    keys.forEach(k => sessionStorage.removeItem(k));
  }, []);

  // Clear cache for current key AND all other caches to prevent cross-entity sync issues
  const clearCache = useCallback(() => {
    sessionStorage.removeItem(storageKey);
    clearAllCaches();
  }, [storageKey, clearAllCaches]);

  return {
    getCache,
    setCache,
    clearCache,
    clearAllCaches,
    isRefreshing,
    setIsRefreshing,
  };
}

