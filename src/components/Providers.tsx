'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { SWRConfig } from 'swr';

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    try {
      const root = document.documentElement;
      const savedUiSettings = localStorage.getItem('uiSettings');

      if (savedUiSettings) {
        const { theme, density } = JSON.parse(savedUiSettings);

        if (theme === 'dark') {
          root.classList.add('dark');
          root.classList.remove('light');
          root.style.colorScheme = 'dark';
        } else if (theme === 'auto') {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          root.classList.toggle('dark', prefersDark);
          root.classList.toggle('light', !prefersDark);
          root.style.colorScheme = prefersDark ? 'dark' : 'light';
        } else {
          // 'light' hoặc bất kỳ giá trị nào khác → sáng
          root.classList.remove('dark');
          root.classList.add('light');
          root.style.colorScheme = 'light';
        }

        if (density) {
          document.body.classList.remove('density-compact', 'density-comfortable', 'density-spacious');
          document.body.classList.add(`density-${density}`);
        }
      } else {
        // Chưa có setting → mặc định SÁNG
        root.classList.remove('dark');
        root.classList.add('light');
        root.style.colorScheme = 'light';
        // Lưu mặc định để nhất quán
        localStorage.setItem('uiSettings', JSON.stringify({ theme: 'light', density: 'comfortable' }));
      }
      
      const savedFontSettings = localStorage.getItem('fontSettings');
      if (savedFontSettings) {
        const { fontFamily } = JSON.parse(savedFontSettings);
        if (fontFamily) {
          document.documentElement.style.setProperty('--font-family', fontFamily);
          document.body.style.fontFamily = fontFamily;
        }
      }
    } catch(e) { console.error("Error applying settings", e) }
  }, []);

  return (
    <SWRConfig 
      value={{
        fetcher: (url: string) => fetch(url).then(res => res.json()),
        revalidateOnFocus: false,
        revalidateIfStale: true,
        dedupingInterval: 60000, // 1 phút deduplicate
        provider: () => {
          // Chỉ chạy ở client-side
          if (typeof window !== 'undefined') {
            const map = new Map(JSON.parse(localStorage.getItem('app-cache') || '[]'));
            window.addEventListener('beforeunload', () => {
              const appCache = JSON.stringify(Array.from(map.entries()));
              localStorage.setItem('app-cache', appCache);
            });
            return map as any;
          }
          return new Map() as any;
        }
      }}
    >
      <SessionProvider>{children}</SessionProvider>
    </SWRConfig>
  );
}