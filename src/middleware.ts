import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    // Add any additional middleware logic here
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Luôn cho phép các route của NextAuth (bao gồm callback)
        if (pathname.startsWith('/api/auth')) return true;
        
        // Bảo vệ dashboard và các api khác (trừ các route public kết thúc bằng -public hoặc cron/telegram)
        if (pathname.startsWith('/dashboard') || 
           (pathname.startsWith('/api') && !pathname.includes('-public') && !pathname.startsWith('/api/cron/') && !pathname.startsWith('/api/telegram/'))) {
          return !!token;
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*'
  ]
};
