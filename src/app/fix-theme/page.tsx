'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FixThemePage() {
  const router = useRouter();

  useEffect(() => {
    // Reset theme về sáng (light mode)
    localStorage.setItem('uiSettings', JSON.stringify({ theme: 'light', density: 'comfortable' }));
    
    const root = document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
    root.style.colorScheme = 'light';
    
    // Redirect về dashboard sau 1 giây
    setTimeout(() => {
      router.push('/dashboard');
    }, 1000);
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#ffffff',
      flexDirection: 'column',
      gap: '16px',
      fontFamily: 'sans-serif'
    }}>
      <div style={{ fontSize: '48px' }}>☀️</div>
      <h1 style={{ color: '#0284C7', margin: 0 }}>Đang đổi sang chế độ sáng...</h1>
      <p style={{ color: '#64748B', margin: 0 }}>Bạn sẽ được chuyển về Dashboard</p>
    </div>
  );
}
