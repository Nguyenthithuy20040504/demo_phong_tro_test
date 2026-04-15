import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/verify-link?email=...&token=...
 * Handles account verification via email confirmation link.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const token = searchParams.get('token');

    if (!email || !token) {
      return NextResponse.redirect(new URL('/dang-nhap?error=invalid_link', request.url));
    }

    await dbConnect();

    const user = await NguoiDung.findOne({ email: email.toLowerCase() });

    if (!user) {
      return NextResponse.redirect(new URL('/dang-nhap?error=user_not_found', request.url));
    }

    if (user.daXacMinhEmail) {
      return NextResponse.redirect(new URL('/dang-nhap?info=already_verified', request.url));
    }

    // Check token and expiry
    if (user.maXacNhanEmail !== token) {
      return NextResponse.redirect(new URL('/dang-nhap?error=invalid_token', request.url));
    }

    if (user.hanMaXacNhanEmail && new Date() > user.hanMaXacNhanEmail) {
      return NextResponse.redirect(new URL('/dang-nhap?error=token_expired', request.url));
    }

    // Success
    user.daXacMinhEmail = true;
    user.maXacNhanEmail = null;
    user.hanMaXacNhanEmail = null;
    await user.save();

    // Redirect to login with success message
    return NextResponse.redirect(new URL('/dang-nhap?message=verified', request.url));
    
  } catch (error) {
    console.error('[Verify Link Error]:', error);
    return NextResponse.redirect(new URL('/dang-nhap?error=system_error', request.url));
  }
}
