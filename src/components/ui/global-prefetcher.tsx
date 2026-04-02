"use client";

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function GlobalPrefetcher() {
  const { data: session } = useSession();

  useEffect(() => {
    // Chỉ prefetch nếu là role có quyền (chuTro, chuNha...)
    if (!session?.user || session.user.role === 'khachThue') return;

    const timeout = setTimeout(async () => {
      const userId = session.user.id;
      
      try {
        const [phongRes, toaNhaRes, khachThueRes, hopDongRes, hoaDonRes] = await Promise.all([
          fetch('/api/phong?limit=500'),
          fetch('/api/toa-nha'),
          fetch('/api/khach-thue?limit=500'),
          fetch('/api/hop-dong?limit=500'),
          fetch('/api/hoa-don?limit=1000'),
        ]);

        const phongData = phongRes.ok ? (await phongRes.json()).data : [];
        const toaNhaData = toaNhaRes.ok ? (await toaNhaRes.json()).data : [];
        const khachThueData = khachThueRes.ok ? (await khachThueRes.json()).data : [];
        const hopDongData = hopDongRes.ok ? (await hopDongRes.json()).data : [];
        const hoaDonData = hoaDonRes.ok ? (await hoaDonRes.json()).data : [];
        
        const timestamp = Date.now();
        
        // Tạo hàm helper để lưu cache
        const setCache = (key: string, dataObj: any) => {
          const storageKey = userId ? `${userId}_${key}` : key;
          if (!sessionStorage.getItem(storageKey)) {
            sessionStorage.setItem(storageKey, JSON.stringify({ timestamp, data: dataObj, userId }));
            console.log(`[Prefetch] Preloaded data for ${key}`);
          }
        };

        // Ghi cache cho Phòng
        setCache('phong-data', { phongList: phongData, toaNhaList: toaNhaData });
        // Ghi cache cho Khách Thuê
        setCache('khach-thue-data', { khachThueList: khachThueData, toaNhaList: toaNhaData, phongList: phongData, hopDongList: hopDongData });
        // Ghi cache cho Hợp Đồng
        setCache('hop-dong-data', { hopDongList: hopDongData, phongList: phongData, khachThueList: khachThueData, toaNhaList: toaNhaData });
        // Ghi cache cho Hóa Đơn
        setCache('hoa-don-data', { hoaDonList: hoaDonData, toaNhaList: toaNhaData, phongList: phongData, khachThueList: khachThueData });

      } catch (e) {
        console.error(`[Prefetch] failed`, e);
      }
    }, 4000);

    return () => clearTimeout(timeout);
  }, [session]);

  return null;
}
