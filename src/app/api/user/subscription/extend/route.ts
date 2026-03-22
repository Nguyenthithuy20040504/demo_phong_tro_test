
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';
import GoiDichVu from '@/models/GoiDichVu';
import SaasPayment from '@/models/SaaSPayment';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || (session.user.role !== 'chuNha')) {
      return NextResponse.json({ message: 'Tính năng này chỉ dành cho chủ nhà' }, { status: 401 });
    }

    const body = await request.json();
    const { planId, paymentMethod } = body;

    if (!planId) {
      return NextResponse.json({ message: 'Vui lòng chọn gói dịch vụ' }, { status: 400 });
    }

    await dbConnect();
    
    const plan = await GoiDichVu.findById(planId);
    if (!plan || !plan.isActive) {
      return NextResponse.json({ message: 'Gói dịch vụ không khả dụng' }, { status: 404 });
    }

    // Chặn mua lại gói Miễn phí
    if (plan.ten.toLowerCase().includes('miễn phí') || plan.ten.toLowerCase().includes('free')) {
      return NextResponse.json({ message: 'Đã hết quyền dùng thử. Gói Miễn phí chỉ được áp dụng 1 lần duy nhất khi tạo tài khoản.' }, { status: 403 });
    }

    const user = await NguoiDung.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ message: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    // Map plan names to user goiDichVu enum if necessary
    let userPlanRole: 'mienPhi' | 'coBan' | 'chuyenNghiep' = 'mienPhi';
    if (plan.ten.toLowerCase().includes('cơ bản') || plan.ten.toLowerCase().includes('basic')) {
      userPlanRole = 'coBan';
    } else if (plan.ten.toLowerCase().includes('chuyên nghiệp') || plan.ten.toLowerCase().includes('professional')) {
      userPlanRole = 'chuyenNghiep';
    }

    // Logic gia hạn: cộng thêm thời gian vào ngày hết hạn hiện tại hoặc hôm nay (nếu đã hết hạn)
    const currentExpiry = user.ngayHetHan ? new Date(user.ngayHetHan) : new Date();
    const startDate = currentExpiry > new Date() ? currentExpiry : new Date();
    
    const newExpiry = new Date(startDate);
    newExpiry.setMonth(startDate.getMonth() + plan.thoiGian);

    // Cập nhật người dùng chủ nhà
    user.goiDichVu = userPlanRole;
    user.ngayHetHan = newExpiry;
    await user.save();

    // Cập nhật đồng bộ ngày hết hạn cho toàn bộ nhân viên do chủ nhà này quản lý
    await NguoiDung.updateMany(
      { nguoiQuanLy: user._id, $or: [{ vaiTro: 'nhanVien' }, { role: 'nhanVien' }] },
      { $set: { ngayHetHan: newExpiry } }
    );

    // Tạo hóa đơn SaasPayment
    const payment = new SaasPayment({
      chuNha: user._id,
      goiDichVu: plan._id,
      soTien: plan.gia,
      phuongThuc: paymentMethod || 'chuyenKhoan',
      trangThai: 'daThanhToan',
      ngayThanhToan: new Date(),
      ngayHetHanMoi: newExpiry
    });

    await payment.save();

    return NextResponse.json({
      message: 'Gia hạn gói dịch vụ thành công!',
      newExpiry: newExpiry
    });
  } catch (error) {
    console.error('Error extending subscription:', error);
    return NextResponse.json({ message: 'Lỗi hệ thống khi gia hạn gói' }, { status: 500 });
  }
}
