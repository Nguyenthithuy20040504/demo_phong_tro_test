"use client";

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

/**
 * GlobalPrefetcher - Prefetch dữ liệu chính ngay sau khi login
 * 
 * Chiến lược:
 * 1. Prefetch ngay lập tức (không delay) sau khi session sẵn sàng
 * 2. Cache key PHẢI match với key của useCache hook (userId_buildingId_key)
 * 3. Prefetch lại khi đổi tòa nhà
 * 4. Dùng AbortController để cancel request cũ nếu building thay đổi nhanh
 */
export function GlobalPrefetcher() {
  const { data: session, status } = useSession();
  const abortRef = useRef<AbortController | null>(null);
  const hasPrefetched = useRef(false);

  const doPrefetch = async (signal: AbortSignal) => {
    const userId = (session?.user as any)?.id;
    if (!userId) return;
    
    const buildingId = typeof window !== 'undefined' 
      ? localStorage.getItem('selected_building_id') || 'all' 
      : 'all';
    
    const buildingParam = buildingId !== 'all' ? `toaNhaId=${buildingId}` : '';
    const buildingQS = buildingParam ? `&${buildingParam}` : '';
    
    try {
      const [phongRes, toaNhaRes, khachThueRes, hopDongRes, hoaDonRes, hoaDonFormRes, statsRes] = await Promise.all([
        fetch(`/api/phong?limit=500${buildingQS}`, { signal }).catch(() => null),
        fetch('/api/toa-nha', { signal }).catch(() => null),
        fetch(`/api/khach-thue?limit=500${buildingQS}`, { signal }).catch(() => null),
        fetch(`/api/hop-dong?limit=1000${buildingQS}`, { signal }).catch(() => null),
        fetch(`/api/hoa-don?limit=1000${buildingQS}`, { signal }).catch(() => null),
        fetch(`/api/hoa-don/form-data?${buildingParam}`, { signal }).catch(() => null),
        fetch(`/api/dashboard/stats?${buildingParam}`, { signal }).catch(() => null),
      ]);

      if (signal.aborted) return;

      const phongData = phongRes?.ok ? (await phongRes.json()).data : [];
      const toaNhaData = toaNhaRes?.ok ? (await toaNhaRes.json()).data : [];
      const khachThueData = khachThueRes?.ok ? (await khachThueRes.json()).data : [];
      const hopDongData = hopDongRes?.ok ? (await hopDongRes.json()).data : [];
      const hoaDonData = hoaDonRes?.ok ? (await hoaDonRes.json()).data : [];
      const hoaDonFormData = hoaDonFormRes?.ok ? (await hoaDonFormRes.json()).data : null;
      const statsData = statsRes?.ok ? (await statsRes.json()).data : null;

      if (signal.aborted) return;

      const timestamp = Date.now();
      
      // Cache key format PHẢI MATCH với useCache hook: userId_buildingId_key
      const setCache = (key: string, dataObj: any) => {
        const storageKey = `${userId}_${buildingId}_${key}`;
        try {
          sessionStorage.setItem(storageKey, JSON.stringify({ 
            timestamp, 
            data: dataObj, 
            userId 
          }));
        } catch (e) {
          // sessionStorage full — clear old entries
          try {
            const allKeys = Object.keys(sessionStorage);
            const dashboardKeys = allKeys.filter(k => k.includes('-data'));
            dashboardKeys.forEach(k => sessionStorage.removeItem(k));
            sessionStorage.setItem(storageKey, JSON.stringify({ timestamp, data: dataObj, userId }));
          } catch {
            // Give up silently
          }
        }
      };

      // Ghi cache cho Phòng
      setCache('phong-data', { phongList: phongData, toaNhaList: toaNhaData });
      // Ghi cache cho Khách Thuê
      setCache('khach-thue-data', { khachThueList: khachThueData, toaNhaList: toaNhaData, phongList: phongData, hopDongList: hopDongData });
      // Ghi cache cho Hợp Đồng
      setCache('hop-dong-data', { hopDongList: hopDongData, phongList: phongData, khachThueList: khachThueData, toaNhaList: toaNhaData });
      // Ghi cache cho Hóa Đơn
      const formDataHopDong = hoaDonFormData?.hopDongList || hopDongData;
      const formDataPhong = hoaDonFormData?.phongList || phongData;
      const formDataKhachThue = hoaDonFormData?.khachThueList || khachThueData;
      setCache('hoa-don-data', { 
        hoaDonList: hoaDonData, 
        hopDongList: formDataHopDong,
        phongList: formDataPhong, 
        khachThueList: formDataKhachThue 
      });
      
      // Ghi cache cho Dashboard Stats (localStorage để tương thích với Dashboard page)
      if (statsData) {
        localStorage.setItem('dashboard_stats_cache', JSON.stringify({
          data: statsData,
          selectedToaNha: buildingId,
          timestamp
        }));
      }

      console.log(`[Prefetch] ✅ Preloaded all data for building: ${buildingId} (${phongData.length} phòng, ${hopDongData.length} hợp đồng, ${hoaDonData.length} hóa đơn)`);
    } catch (e: any) {
      if (e?.name === 'AbortError') return; // Expected when switching buildings
      console.error(`[Prefetch] ❌ Failed:`, e);
    }
  };

  // Prefetch ngay khi session sẵn sàng
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return;
    if (session.user.role === 'khachThue' || session.user.role === 'admin') return;
    if (hasPrefetched.current) return;

    hasPrefetched.current = true;
    
    // Prefetch ngay lập tức (không delay 4s như trước)
    abortRef.current = new AbortController();
    doPrefetch(abortRef.current.signal);

    return () => {
      abortRef.current?.abort();
    };
  }, [status, session]);

  // Re-prefetch khi đổi tòa nhà
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return;
    if (session.user.role === 'khachThue' || session.user.role === 'admin') return;

    const handleBuildingChange = () => {
      // Cancel request cũ
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      
      // Prefetch cho building mới
      doPrefetch(abortRef.current.signal);
    };

    window.addEventListener('buildingChange', handleBuildingChange);
    return () => {
      window.removeEventListener('buildingChange', handleBuildingChange);
      abortRef.current?.abort();
    };
  }, [status, session]);

  return null;
}
