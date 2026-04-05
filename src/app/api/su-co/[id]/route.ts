import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import SuCo from '@/models/SuCo';
import ThongBao from '@/models/ThongBao';
import { isToaNhaAccessible } from '@/lib/auth-utils';
import { sendGeneralNotificationEmail } from '@/lib/mail';
import { z } from 'zod';
import mongoose from 'mongoose';

const updateSuCoSchema = z.object({
  tieuDe: z.string().min(1, 'Tiêu đề là bắt buộc').optional(),
  moTa: z.string().min(1, 'Mô tả là bắt buộc').optional(),
  anhSuCo: z.array(z.string()).optional(),
  loaiSuCo: z.enum(['dienNuoc', 'noiThat', 'vesinh', 'anNinh', 'khac']).optional(),
  mucDoUuTien: z.enum(['thap', 'trungBinh', 'cao', 'khancap']).optional(),
  trangThai: z.enum(['moi', 'dangXuLy', 'daXong', 'daHuy']).optional(),
  nguoiXuLy: z.string().optional(),
  ghiChuXuLy: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();
    const { id } = await params;

    const suCo = await SuCo.findById(id)
      .populate('phong', 'maPhong toaNha')
      .populate('khachThue', 'hoTen soDienThoai')
      .populate('nguoiXuLy', 'ten email');

    if (!suCo) {
      return NextResponse.json(
        { message: 'Sự cố không tồn tại' },
        { status: 404 }
      );
    }

    // Kiểm tra quyền truy cập thông qua tòa nhà của phòng
    const toaNhaId = (suCo.phong as any).toaNha || suCo.phong;
    const hasAccess = await isToaNhaAccessible(session.user, toaNhaId);
    if (!hasAccess) {
      return NextResponse.json(
        { message: 'Bạn không có quyền truy cập sự cố của tòa nhà này' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: suCo,
    });

  } catch (error) {
    console.error('Error fetching su co:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = updateSuCoSchema.parse(body);

    await dbConnect();
    const { id } = await params;

    const existingSuCo = await SuCo.findById(id).populate('phong');
    if (!existingSuCo) {
      return NextResponse.json(
        { message: 'Sự cố không tồn tại' },
        { status: 404 }
      );
    }

    // Kiểm tra quyền chỉnh sửa
    const toaNhaId = (existingSuCo.phong as any).toaNha || existingSuCo.phong;
    const hasAccess = await isToaNhaAccessible(session.user, toaNhaId);
    if (!hasAccess) {
      return NextResponse.json(
        { message: 'Bạn không có quyền chỉnh sửa sự cố của tòa nhà này' },
        { status: 403 }
      );
    }

    // Lưu trạng thái cũ để so sánh sau khi cập nhật
    const oldTrangThai = existingSuCo.trangThai;

    // Query lại document KHÔNG populate để tránh lỗi cast khi .save()
    const suCoToUpdate = await SuCo.findById(id);
    // Gán dữ liệu mới lên document rồi .save() để pre-save hook chạy
    // (tự động cập nhật ngayXuLy khi chuyển sang dangXuLy, ngayHoanThanh khi chuyển sang daXong)
    Object.assign(suCoToUpdate!, validatedData);
    await suCoToUpdate!.save();

    // Populate lại để trả về dữ liệu đầy đủ
    const suCo = await SuCo.findById(id)
      .populate('phong', 'maPhong toaNha')
      .populate('khachThue', 'hoTen soDienThoai')
      .populate('nguoiXuLy', 'ten email');

    // --- Gửi thông báo In-App + Email cho khách thuê trong BACKGROUND (không await) ---
    const newTrangThai = validatedData.trangThai;
    if (newTrangThai && newTrangThai !== oldTrangThai && existingSuCo.khachThue) {
      const statusLabels: Record<string, string> = {
        moi: 'Mới',
        dangXuLy: 'Đang xử lý',
        daXong: 'Đã hoàn thành',
        daHuy: 'Đã hủy',
      };

      const statusEmoji: Record<string, string> = {
        dangXuLy: '🔧',
        daXong: '✅',
        daHuy: '❌',
      };

      const maPhong = (suCo?.phong as any)?.maPhong || '';
      const emoji = statusEmoji[newTrangThai] || '📋';
      const label = statusLabels[newTrangThai] || newTrangThai;

      const tieuDeNotif = `${emoji} Sự cố "${existingSuCo.tieuDe}" - ${label}`;
      const noiDungNotif = `Sự cố "${existingSuCo.tieuDe}" tại phòng ${maPhong} đã được cập nhật trạng thái: ${label}.${
        newTrangThai === 'dangXuLy'
          ? '\n\nĐội ngũ kỹ thuật đang tiến hành xử lý. Chúng tôi sẽ thông báo khi hoàn tất.'
          : newTrangThai === 'daXong'
          ? '\n\nSự cố đã được khắc phục hoàn toàn. Nếu vẫn còn vấn đề, vui lòng báo cáo sự cố mới.'
          : newTrangThai === 'daHuy'
          ? '\n\nSự cố đã bị hủy. Nếu bạn cho rằng đây là nhầm lẫn, vui lòng liên hệ chủ nhà.'
          : ''
      }`;

      // Thực thi ngầm không đợi kết quả để API phản hồi ngay
      const khachThueId = existingSuCo.khachThue;
      (async () => {
        // 1) In-App Notification
        try {
          await ThongBao.create({
            tieuDe: tieuDeNotif,
            noiDung: noiDungNotif,
            loai: 'suCo',
            nguoiGui: new mongoose.Types.ObjectId(session.user.id),
            nguoiNhan: [khachThueId],
            toaNha: toaNhaId,
            daDoc: [],
          });
          console.log(`[SuCo Notification] Background In-App notification sent to ${khachThueId}`);
        } catch (notifError) {
          console.error('Error in background notification:', notifError);
        }

        // 2) Email Notification
        try {
          const KhachThue = (await import('@/models/KhachThue')).default;
          const NguoiDung = (await import('@/models/NguoiDung')).default;

          let tenantEmail = '';
          let tenantName = 'Khách thuê';
          const ktId = khachThueId.toString();

          const ktRecord = await KhachThue.findById(ktId).select('email hoTen').lean() as any;
          if (ktRecord?.email) {
            tenantEmail = ktRecord.email;
            tenantName = ktRecord.hoTen || tenantName;
          } else {
            const ndRecord = await NguoiDung.findById(ktId).select('email ten name').lean() as any;
            if (ndRecord?.email) {
              tenantEmail = ndRecord.email;
              tenantName = ndRecord.ten || ndRecord.name || tenantName;
            }
          }

          if (tenantEmail) {
            await sendGeneralNotificationEmail({
              email: tenantEmail,
              khachThueName: tenantName,
              tieuDe: tieuDeNotif.replace(/[🔧✅❌📋]\s?/, ''),
              noiDung: noiDungNotif,
            });
            console.log(`[SuCo Email] Background email sent to ${tenantEmail}`);
          }
        } catch (emailError) {
          console.error('Error in background email:', emailError);
        }
      })();
    }

    return NextResponse.json({
      success: true,
      data: suCo,
      message: 'Sự cố đã được cập nhật thành công',
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: (error as z.ZodError).issues[0].message },
        { status: 400 }
      );
    }

    console.error('Error updating su co:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();
    const { id } = await params;

    const suCo = await SuCo.findById(id).populate('phong');
    if (!suCo) {
      return NextResponse.json(
        { message: 'Sự cố không tồn tại' },
        { status: 404 }
      );
    }

    // Kiểm tra quyền xóa
    const toaNhaId = (suCo.phong as any).toaNha || suCo.phong;
    const hasAccess = await isToaNhaAccessible(session.user, toaNhaId);
    if (!hasAccess) {
      return NextResponse.json(
        { message: 'Bạn không có quyền xóa sự cố của tòa nhà này' },
        { status: 403 }
      );
    }

    await SuCo.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Sự cố đã được xóa thành công',
    });

  } catch (error) {
    console.error('Error deleting su co:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
