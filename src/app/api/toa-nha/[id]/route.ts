import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import ToaNha from '@/models/ToaNha';
import Phong from '@/models/Phong';
import HopDong from '@/models/HopDong';
import { z } from 'zod';

import { isToaNhaAccessible } from '@/lib/auth-utils';

const toaNhaSchema = z.object({
  tenToaNha: z.string().min(1, 'Tên tòa nhà là bắt buộc'),
  diaChi: z.object({
    soNha: z.string().min(1, 'Số nhà là bắt buộc'),
    duong: z.string().min(1, 'Tên đường là bắt buộc'),
    phuong: z.string().min(1, 'Phường/xã là bắt buộc'),
    quan: z.string().min(1, 'Quận/huyện là bắt buộc'),
    thanhPho: z.string().min(1, 'Thành phố là bắt buộc'),
  }),
  moTa: z.string().optional(),
  tienNghiChung: z.array(z.string()).optional(),
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

    // Kiểm tra quyền truy cập
    const hasAccess = await isToaNhaAccessible(session.user, id);
    if (!hasAccess) {
      return NextResponse.json(
        { message: 'Bạn không có quyền truy cập tòa nhà này' },
        { status: 403 }
      );
    }

    const toaNha = await ToaNha.findById(id)
      .populate('chuSoHuu', 'ten email');

    if (!toaNha) {
      return NextResponse.json(
        { message: 'Tòa nhà không tồn tại' },
        { status: 404 }
      );
    }

    // Tính tổng số phòng thực tế
    const phongCount = await Phong.countDocuments({ toaNha: id });
    const toaNhaWithPhongCount = {
      ...toaNha.toObject(),
      tongSoPhong: phongCount
    };

    return NextResponse.json({
      success: true,
      data: toaNhaWithPhongCount,
    });

  } catch (error) {
    console.error('Error fetching toa nha:', error);
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
    const validatedData = toaNhaSchema.parse(body);

    await dbConnect();
    const { id } = await params;

    const toaNha = await ToaNha.findById(id);

    if (!toaNha) {
      return NextResponse.json(
        { message: 'Tòa nhà không tồn tại' },
        { status: 404 }
      );
    }

    // Kiểm tra quyền chỉnh sửa
    const hasAccess = await isToaNhaAccessible(session.user, id);
    if (!hasAccess) {
      return NextResponse.json(
        { message: 'Bạn không có quyền chỉnh sửa tòa nhà này' },
        { status: 403 }
      );
    }

    const updatedToaNha = await ToaNha.findByIdAndUpdate(
      id,
      {
        ...validatedData,
        tienNghiChung: validatedData.tienNghiChung || [],
        // Không cập nhật tongSoPhong vì sẽ được tính tự động
      },
      { new: true, runValidators: true }
    ).populate('chuSoHuu', 'ten email');

    // Tính tổng số phòng thực tế
    const phongCount = await Phong.countDocuments({ toaNha: id });
    const toaNhaWithPhongCount = {
      ...updatedToaNha!.toObject(),
      tongSoPhong: phongCount
    };

    return NextResponse.json({
      success: true,
      data: toaNhaWithPhongCount,
      message: 'Tòa nhà đã được cập nhật thành công',
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Error updating toa nha:', error);
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

    const toaNha = await ToaNha.findById(id);

    if (!toaNha) {
      return NextResponse.json(
        { message: 'Tòa nhà không tồn tại' },
        { status: 404 }
      );
    }

    // Kiểm tra quyền xóa
    const hasAccess = await isToaNhaAccessible(session.user, id);
    if (!hasAccess) {
      return NextResponse.json(
        { message: 'Bạn không có quyền xóa tòa nhà này' },
        { status: 403 }
      );
    }

    // Check if building has any active contracts in any of its rooms
    const rooms = await Phong.find({ toaNha: id });
    const roomIds = rooms.map(r => r._id);

    const activeContractsCount = await HopDong.countDocuments({
      phong: { $in: roomIds },
      trangThai: 'hoatDong',
      ngayKetThuc: { $gte: new Date() }
    });

    if (activeContractsCount > 0) {
      return NextResponse.json(
        { message: 'Không thể xóa tòa nhà vì có phòng đang có hợp đồng hoạt động. Vui lòng kết thúc tất cả hợp đồng trước.' },
        { status: 400 }
      );
    }

    // If no active contracts, delete all rooms and then the building
    await Phong.deleteMany({ toaNha: id });
    await ToaNha.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Tòa nhà và tất cả phòng liên quan đã được xóa thành công',
    });

  } catch (error) {
    console.error('Error deleting toa nha:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
