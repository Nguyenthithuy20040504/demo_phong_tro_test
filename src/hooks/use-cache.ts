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
  const userId = (session?.user as any)?.id;
  
  const { key, duration = 300000 } = config; // 5 phút mặc định
  
  const getStorageKey = useCallback(() => {
    const bId = typeof window !== 'undefined' ? localStorage.getItem('selected_building_id') || 'all' : 'all';
    return userId ? `${userId}_${bId}_${key}` : `${bId}_${key}`;
  }, [userId, key]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get cached data
  const getCache = useCallback((): T | null => {
    try {
      const storageKey = getStorageKey();
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
  }, [getStorageKey, duration, userId]);

  // Set cached data
  const setCache = useCallback((data: T) => {
    try {
      const storageKey = getStorageKey();
      const cacheData: CachedData<T> = {
        timestamp: Date.now(),
        data,
        userId: userId || undefined,
      };
      sessionStorage.setItem(storageKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  }, [getStorageKey, userId]);

  // Clear all dashboard caches for all buildings or specific ones
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
    
    // Tìm và xóa tất cả các key liên quan trong sessionStorage
    // Vì key có cấu trúc phức tạp (userId_buildingId_key), ta sẽ lặp qua storage
    try {
      const allKeys = Object.keys(sessionStorage);
      allKeys.forEach(sKey => {
        // Nếu sKey chứa một trong các keyword của dashboard
        if (keys.some(k => sKey.includes(k))) {
          sessionStorage.removeItem(sKey);
        }
      });
    } catch (e) {
      // Fallback nếu không lặp được (hiếm)
      keys.forEach(k => {
        sessionStorage.removeItem(k);
        if (userId) {
          sessionStorage.removeItem(`${userId}_${k}`);
          sessionStorage.removeItem(`${userId}_all_${k}`);
        }
      });
    }
  }, [userId]);

  // Clear cache for current key AND all other caches to prevent cross-entity sync issues
  const clearCache = useCallback(() => {
    clearAllCaches();
  }, [clearAllCaches]);

  return {
    getCache,
    setCache,
    clearCache,
    clearAllCaches,
    isRefreshing,
    setIsRefreshing,
  };
}

