import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import ChiSoDienNuoc from '@/models/ChiSoDienNuoc';
import Phong from '@/models/Phong';
import { isToaNhaAccessible } from '@/lib/auth-utils';
import { z } from 'zod';

const chiSoSchema = z.object({
  phong: z.string().min(1, 'Phòng là bắt buộc'),
  thang: z.number().min(1).max(12, 'Tháng phải từ 1-12'),
  nam: z.number().min(2020, 'Năm phải từ 2020 trở lên'),
  chiSoDienCu: z.number().min(0, 'Chỉ số điện cũ phải lớn hơn hoặc bằng 0'),
  chiSoDienMoi: z.number().min(0, 'Chỉ số điện mới phải lớn hơn hoặc bằng 0'),
  chiSoNuocCu: z.number().min(0, 'Chỉ số nước cũ phải lớn hơn hoặc bằng 0'),
  chiSoNuocMoi: z.number().min(0, 'Chỉ số nước mới phải lớn hơn hoặc bằng 0'),
  anhChiSoDien: z.string().optional(),
  anhChiSoNuoc: z.string().optional(),
  ngayGhi: z.string().optional(),
});

const batchSchema = z.array(chiSoSchema);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = batchSchema.parse(body);

    await dbConnect();

    const results = [];
    const errors = [];

    for (const item of validatedData) {
      try {
        const phong = await Phong.findById(item.phong);
        if (!phong) {
          errors.push({ phong: item.phong, message: 'Phòng không tồn tại' });
          continue;
        }

        const hasAccess = await isToaNhaAccessible(session.user, phong.toaNha);
        if (!hasAccess) {
          errors.push({ phong: item.phong, message: 'Không có quyền truy cập' });
          continue;
        }

        // Upsert logic: nếu đã có thì cập nhật, chưa có thì tạo mới
        const existingChiSo = await ChiSoDienNuoc.findOne({
          phong: item.phong,
          thang: item.thang,
          nam: item.nam,
        });

        if (existingChiSo) {
          Object.assign(existingChiSo, {
            ...item,
            nguoiGhi: session.user.id,
            ngayGhi: item.ngayGhi ? new Date(item.ngayGhi) : new Date(),
          });
          await existingChiSo.save();
          results.push(existingChiSo);
        } else {
          const newChiSo = new ChiSoDienNuoc({
            ...item,
            nguoiGhi: session.user.id,
            ngayGhi: item.ngayGhi ? new Date(item.ngayGhi) : new Date(),
          });
          await newChiSo.save();
          results.push(newChiSo);
        }
      } catch (err: any) {
        errors.push({ phong: item.phong, message: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      errors: errors.length > 0 ? errors : undefined,
      message: `Đã xử lý ${results.length} chỉ số. Có ${errors.length} lỗi.`,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Dữ liệu không hợp lệ', errors: error.issues },
        { status: 400 }
      );
    }

    console.error('Error batch creating chi so dien nuoc:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
