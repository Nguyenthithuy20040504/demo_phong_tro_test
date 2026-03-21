import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Phong from '@/models/Phong';
import ToaNha from '@/models/ToaNha';
import { isToaNhaAccessible, getAccessibleToaNhaIds } from '@/lib/auth-utils';
import { updatePhongStatus } from '@/lib/status-utils';
import { z } from 'zod';

const phongSchema = z.object({
  maPhong: z.string().min(1, 'Số phòng là bắt buộc'),
  toaNha: z.string().min(1, 'Tòa nhà là bắt buộc'),
  tang: z.number().min(0, 'Tầng phải lớn hơn hoặc bằng 0'),
  dienTich: z.number().min(1, 'Diện tích phải lớn hơn 0'),
  giaThue: z.number().min(0, 'Giá thuê phải lớn hơn hoặc bằng 0'),
  tienCoc: z.number().min(0, 'Tiền cọc phải lớn hơn hoặc bằng 0'),
  moTa: z.string().optional(),
  anhPhong: z.array(z.string()).optional(),
  tienNghi: z.array(z.string()).optional(),
  soNguoiToiDa: z.number().min(1, 'Số người tối đa phải lớn hơn 0').max(10, 'Số người tối đa không được quá 10'),
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

    const phong = await Phong.findById(id)
      .populate('toaNha', 'tenToaNha diaChi');

    if (!phong) {
      return NextResponse.json(
        { message: 'Phòng không tồn tại' },
        { status: 404 }
      );
    }

    // Kiểm tra quyền truy cập thông qua tòa nhà
    const hasAccess = await isToaNhaAccessible(session.user, (phong.toaNha as any)._id || phong.toaNha);
    if (!hasAccess) {
      return NextResponse.json(
        { message: 'Bạn không có quyền truy cập thông tin phòng này' },
        { status: 403 }
      );
    }

    // Cập nhật trạng thái phòng trước khi trả về
    await updatePhongStatus(id);

    return NextResponse.json({
      success: true,
      data: phong,
    });

  } catch (error) {
    console.error('Error fetching phong:', error);
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
    const validatedData = phongSchema.parse(body);

    await dbConnect();
    const { id } = await params;

    // Check if room exists
    const existingRoom = await Phong.findById(id);
    if (!existingRoom) {
      return NextResponse.json(
        { message: 'Phòng không tồn tại' },
        { status: 404 }
      );
    }

    // Kiểm tra quyền chỉnh sửa thông qua tòa nhà HIỆN TẠI của phòng
    const hasAccessToCurrent = await isToaNhaAccessible(session.user, existingRoom.toaNha);
    if (!hasAccessToCurrent) {
      return NextResponse.json(
        { message: 'Bạn không có quyền chỉnh sửa phòng của tòa nhà này' },
        { status: 403 }
      );
    }

    // Nếu thay đổi tòa nhà, kiểm tra xem có quyền ở tòa nhà MỚI không
    if (validatedData.toaNha && validatedData.toaNha.toString() !== existingRoom.toaNha.toString()) {
      const hasAccessToNew = await isToaNhaAccessible(session.user, validatedData.toaNha);
      if (!hasAccessToNew) {
        return NextResponse.json(
          { message: 'Bạn không có quyền chuyển phòng sang tòa nhà này' },
          { status: 403 }
        );
      }
    }

    // Check if toa nha exists
    const toaNha = await ToaNha.findById(validatedData.toaNha);
    if (!toaNha) {
      return NextResponse.json(
        { message: 'Tòa nhà không tồn tại' },
        { status: 400 }
      );
    }

    // Check duplicate checking for PUT across all accessible buildings
    const accessibleToaNhaIds = await getAccessibleToaNhaIds(session.user);
    const filterQuery: any = {
      _id: { $ne: id },
      maPhong: { $regex: new RegExp(`^${validatedData.maPhong.trim()}$`, 'i') }
    };
    if (accessibleToaNhaIds !== null) {
      filterQuery.toaNha = { $in: accessibleToaNhaIds };
    }

    const duplicatePhong = await Phong.findOne(filterQuery).populate('toaNha', 'tenToaNha');
    
    if (duplicatePhong) {
      const tenToaNha = (duplicatePhong.toaNha as any)?.tenToaNha || 'một tòa nhà khác';
      return NextResponse.json(
        { message: `Số phòng này đã tồn tại ở ${tenToaNha}. Vui lòng sử dụng mã khác!` },
        { status: 400 }
      );
    }

    const phong = await Phong.findByIdAndUpdate(
      id,
      {
        ...validatedData,
        anhPhong: validatedData.anhPhong || [],
        tienNghi: validatedData.tienNghi || [],
        // Trạng thái sẽ được cập nhật tự động dựa trên hợp đồng
      },
      { new: true, runValidators: true }
    ).populate('toaNha', 'tenToaNha diaChi');

    // Cập nhật trạng thái dựa trên hợp đồng sau khi cập nhật phòng
    await updatePhongStatus(id);

    // Lấy lại dữ liệu với trạng thái đã cập nhật
    const updatedPhong = await Phong.findById(id)
      .populate('toaNha', 'tenToaNha diaChi');

    return NextResponse.json({
      success: true,
      data: updatedPhong,
      message: 'Phòng đã được cập nhật thành công',
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Error updating phong:', error);
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

    const phong = await Phong.findById(id);
    if (!phong) {
      return NextResponse.json(
        { message: 'Phòng không tồn tại' },
        { status: 404 }
      );
    }

    // Kiểm tra quyền xóa thông qua tòa nhà
    const hasAccess = await isToaNhaAccessible(session.user, phong.toaNha);
    if (!hasAccess) {
      return NextResponse.json(
        { message: 'Bạn không có quyền xóa phòng của tòa nhà này' },
        { status: 403 }
      );
    }

    await Phong.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Phòng đã được xóa thành công',
    });

  } catch (error) {
    console.error('Error deleting phong:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
