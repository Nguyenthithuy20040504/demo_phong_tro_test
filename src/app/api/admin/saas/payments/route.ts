import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import SaaSPayment from '@/models/SaaSPayment';
import NguoiDung from '@/models/NguoiDung';
import GoiDichVu from '@/models/GoiDichVu';
import ThongBao from '@/models/ThongBao';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam) : 10;
    const isAll = searchParams.get('all') === 'true';
    const searchTerm = searchParams.get('q') || '';
    const skip = (page - 1) * limit;

    await dbConnect();
    const _touch = [NguoiDung, GoiDichVu];
    // Tìm kiếm nếu có searchTerm
    let query = {};
    if (searchTerm) {
      const matchedUsers = await NguoiDung.find({
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { ten: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } }
        ]
      }).select('_id');
      
      const userIds = matchedUsers.map(u => u._id);
      query = { chuNha: { $in: userIds } };
    }

    if (isAll) {
      const payments = await SaaSPayment.find(query)
        .populate('chuNha', 'name email ten')
        .populate('goiDichVu', 'ten')
        .sort({ createdAt: -1 });

      return NextResponse.json({
        payments,
        total: payments.length,
        totalPages: 1,
        currentPage: 1
      });
    }

    const [payments, total] = await Promise.all([
      SaaSPayment.find(query)
        .populate('chuNha', 'name email ten')
        .populate('goiDichVu', 'ten')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      SaaSPayment.countDocuments(query)
    ]);

    return NextResponse.json({
      payments,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error: any) {
    console.error('Error fetching SaaS payments:', error);
    return NextResponse.json({ 
        message: error.message || 'Internal Server Error',
        error: error.toString(),
        stack: error.stack
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    await dbConnect();

    // Tạo hóa đơn
    const payment = await SaaSPayment.create(body);
    
    // Nếu trạng thái là đã thanh toán, cập nhật ngayHetHan cho chủ nhà
    if (body.trangThai === 'daThanhToan') {
        await NguoiDung.findByIdAndUpdate(body.chuNha, {
            ngayHetHan: body.ngayHetHanMoi
        });
    }

    return NextResponse.json(payment, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    const { id, trangThai } = await request.json();
    if (!id || !trangThai) {
      return NextResponse.json({ message: 'Thiếu thông tin' }, { status: 400 });
    }

    await dbConnect();
    const payment = await SaaSPayment.findById(id);
    if (!payment) {
      return NextResponse.json({ message: 'Không tìm thấy hóa đơn' }, { status: 404 });
    }

    // Nếu chuyển sang trạng thái đã thanh toán, thực hiện gia hạn
    // Hỗ trợ trường hợp thanh toán QR được tạo mặc định là daThanhToan nhưng chưa được gia hạn (ngayHetHanMoi = null)
    if (trangThai === 'daThanhToan' && (!payment.ngayHetHanMoi || payment.trangThai !== 'daThanhToan')) {
      const plan = await GoiDichVu.findById(payment.goiDichVu);
      const user = await NguoiDung.findById(payment.chuNha);

      console.log(`[SYNC] Payment ID: ${id}, goiDichVu: ${payment.goiDichVu}, chuNha: ${payment.chuNha}`);
      console.log(`[SYNC] Plan found: ${!!plan}, User found: ${!!user}`);

      if (plan && user) {
        // Xác định loại gói - nếu không khớp pattern cũ thì dùng tên gói từ DB
        let userPlanRole: string = 'mienPhi';
        if (plan.ten.toLowerCase().includes('cơ bản') || plan.ten.toLowerCase().includes('basic')) userPlanRole = 'coBan';
        if (plan.ten.toLowerCase().includes('chuyên nghiệp') || plan.ten.toLowerCase().includes('professional') || plan.ten.toLowerCase().includes('vip') || plan.ten.toLowerCase().includes('pro')) userPlanRole = 'chuyenNghiep';

        const currentExpiry = user.ngayHetHan ? new Date(user.ngayHetHan) : new Date();
        const startDate = currentExpiry > new Date() ? currentExpiry : new Date();
        
        const newExpiry = new Date(startDate);
        newExpiry.setMonth(startDate.getMonth() + plan.thoiGian);

        console.log(`[SYNC] ${user.email}: ${plan.ten} (${plan.thoiGian} tháng), startDate=${startDate.toISOString()}, newExpiry=${newExpiry.toISOString()}`);

        // Nâng cấp và cộng ngày cho Chủ Nhà
        user.goiDichVu = userPlanRole;
        user.ngayHetHan = newExpiry;
        await user.save();

        // Đồng bộ ngày hết hạn cho quân lính (Nhân viên)
        await NguoiDung.updateMany(
          { nguoiQuanLy: user._id, $or: [{ vaiTro: 'nhanVien' }, { role: 'nhanVien' }] },
          { $set: { ngayHetHan: newExpiry } }
        );

        // Gửi thông báo cho Chủ nhà
        await ThongBao.create({
          tieuDe: `🎉 Xác nhận thanh toán gói ${plan.ten} thành công`,
          noiDung: `Kính gửi ${user.ten},\n\nKhoản thanh toán cho gói dịch vụ ${plan.ten} của bạn đã được duyệt thành công. Hệ thống đã gia hạn và kích hoạt các tính năng đến ngày ${newExpiry.toLocaleDateString('vi-VN')}.\n\nCảm ơn bạn đã tin tưởng và sử dụng PiRoom!\n\nTrân trọng.`,
          loai: 'thanh_toan_saas',
          nguoiGui: session.user.id, // Admin id
          nguoiNhan: [user._id],
          daDoc: [],
          guiTatCa: false
        });

        payment.ngayHetHanMoi = newExpiry;
        payment.soTienDaChuyen = payment.soTien;
      } else {
        console.error(`[SYNC] Không tìm thấy plan hoặc user! goiDichVu=${payment.goiDichVu}, chuNha=${payment.chuNha}`);
      }
    }

    payment.trangThai = trangThai;
    await payment.save();

    return NextResponse.json({ success: true, payment });
  } catch (error: any) {
    console.error('Error updating SaaS payment:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ message: 'Thiếu ID hóa đơn' }, { status: 400 });
    }

    await dbConnect();
    const deleted = await SaaSPayment.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ message: 'Không tìm thấy hóa đơn' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Đã xóa hóa đơn thành công' });
  } catch (error: any) {
    console.error('Error deleting SaaS payment:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
