import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';
import { sendAccountConfirmationLinkEmail } from '@/lib/mail';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/users/resend-verification
 * Admin resends the email verification link for a landlord account.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Không có quyền truy cập' }, { status: 403 });
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ message: 'Thiếu userId' }, { status: 400 });
    }

    await dbConnect();

    const user = await NguoiDung.findById(userId);

    if (!user) {
      return NextResponse.json({ message: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    if (user.daXacMinhEmail) {
      return NextResponse.json({ message: 'Tài khoản này đã xác minh email rồi' }, { status: 400 });
    }

    // Generate new token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const otpExpiry = new Date();
    otpExpiry.setHours(otpExpiry.getHours() + 24);

    user.maXacNhanEmail = verifyToken;
    user.hanMaXacNhanEmail = otpExpiry;
    await user.save();

    // Send confirmation link email
    const origin = request.nextUrl.origin;
    const confirmLink = `${origin}/api/auth/verify-link?email=${encodeURIComponent(user.email)}&token=${verifyToken}`;

    await sendAccountConfirmationLinkEmail({
      email: user.email,
      khachThueName: user.ten,
      confirmLink: confirmLink,
    });

    console.log(`[Admin] Resent verification email to ${user.email}`);

    return NextResponse.json({ message: 'Đã gửi lại email xác nhận thành công' });
  } catch (error) {
    console.error('[Resend Verification Error]:', error);
    return NextResponse.json({ message: 'Lỗi hệ thống khi gửi lại email xác nhận' }, { status: 500 });
  }
}
