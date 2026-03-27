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
        
        // Bảo vệ dashboard và các api khác (trừ các route public kết thúc bằng -public)
        if (pathname.startsWith('/dashboard') || (pathname.startsWith('/api') && !pathname.includes('-public'))) {
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
