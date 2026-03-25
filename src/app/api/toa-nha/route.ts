import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import ToaNha from '@/models/ToaNha';
import Phong from '@/models/Phong';
import SuCo from '@/models/SuCo';
import HopDong from '@/models/HopDong';
import { getAccessibleToaNhaIds } from '@/lib/auth-utils';
import { z } from 'zod';
import mongoose from 'mongoose';

const toaNghiEnum = z.enum(['wifi', 'camera', 'baoVe', 'giuXe', 'thangMay', 'sanPhoi', 'nhaVeSinhChung', 'khuBepChung']);

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
  tienNghiChung: z.array(toaNghiEnum).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    const query: any = search 
      ? {
          $or: [
            { tenToaNha: { $regex: search, $options: 'i' } },
            { 'diaChi.duong': { $regex: search, $options: 'i' } },
            { 'diaChi.phuong': { $regex: search, $options: 'i' } },
          ]
        }
      : {};

    const accessibleToaNhaIds = await getAccessibleToaNhaIds(session.user);
    if (accessibleToaNhaIds !== null) {
      query._id = { $in: accessibleToaNhaIds };
    }

    const toaNhaList = await ToaNha.find(query)
      .populate('chuSoHuu', 'ten email')
      .sort({ ngayTao: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    console.log('GET /api/toa-nha: Found', toaNhaList.length, 'buildings for query:', JSON.stringify(query));

    // Tính tổng số phòng và thống kê trạng thái cho mỗi tòa nhà
    const toaNhaWithStats = await Promise.all(
      toaNhaList.map(async (toaNha) => {
        // Đếm tổng số phòng
        const tongSoPhong = await Phong.countDocuments({ toaNha: toaNha._id });
        
        // Đếm số phòng trống
        const phongTrong = await Phong.countDocuments({ 
          toaNha: toaNha._id, 
          trangThai: 'trong' 
        });
        
        // Đếm số phòng đang thuê
        const phongDangThue = await Phong.countDocuments({ 
          toaNha: toaNha._id, 
          trangThai: 'dangThue' 
        });
        
        // Đếm số phòng đã đặt
        const phongDaDat = await Phong.countDocuments({ 
          toaNha: toaNha._id, 
          trangThai: 'daDat' 
        });
        
        // Đếm số phòng bảo trì
        const phongBaoTri = await Phong.countDocuments({ 
          toaNha: toaNha._id, 
          trangThai: 'baoTri' 
        });

        // Tìm các phòng thuộc tòa nhà này
        const roomIds = await Phong.find({ toaNha: toaNha._id }).distinct('_id');
        
        // Đếm số sự cố đang hoạt động (moi, dangXuLy) của tất cả các phòng trong tòa nhà
        const suCoCount = await SuCo.countDocuments({
          phong: { $in: roomIds },
          trangThai: { $in: ['moi', 'dangXuLy'] }
        });
        
        return {
          ...toaNha.toObject(),
          tongSoPhong,
          phongTrong,
          phongDangThue,
          phongDaDat,
          phongBaoTri,
          suCoCount
        };
      })
    );

    const total = await ToaNha.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: toaNhaWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Error fetching toa nha:', error);
    
    // Hiển thị chi tiết lỗi trong development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error instanceof Error ? error.message : String(error)
      : 'Internal server error';
    
    const errorDetails = process.env.NODE_ENV === 'development' 
      ? {
          name: error instanceof Error ? error.name : 'Unknown',
          stack: error instanceof Error ? error.stack : undefined,
          fullError: error
        }
      : undefined;

    return NextResponse.json(
      { 
        message: errorMessage,
        details: errorDetails,
        error: 'SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== POST /api/toa-nha started ===');
    
    const session = await getServerSession(authOptions);
    console.log('Session:', session ? 'Found' : 'Not found');
    
    if (!session) {
      console.log('No session found, returning 401');
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Session user ID:', session.user.id);
    console.log('Session user role:', session.user.role);

    const body = await request.json();
    console.log('Request body:', body);
    
    const validatedData = toaNhaSchema.parse(body);
    console.log('Validated data:', validatedData);

    console.log('Connecting to database...');
    await dbConnect();
    console.log('Database connected successfully');

    const chuSoHuuId = new mongoose.Types.ObjectId(session.user.id);
    console.log('Chu so huu ObjectId:', chuSoHuuId);

    // Kiểm tra xem đã tồn tại tòa nhà cùng tên và địa chỉ cho chủ sở hữu này chưa
    const existingToaNha = await ToaNha.findOne({
      chuSoHuu: chuSoHuuId,
      tenToaNha: validatedData.tenToaNha,
      'diaChi.soNha': validatedData.diaChi.soNha,
      'diaChi.duong': validatedData.diaChi.duong,
      'diaChi.phuong': validatedData.diaChi.phuong,
      'diaChi.quan': validatedData.diaChi.quan,
      'diaChi.thanhPho': validatedData.diaChi.thanhPho,
    });

    if (existingToaNha) {
      console.log('Toa nha already exists for this owner');
      return NextResponse.json(
        { 
          message: 'Tòa nhà với tên và địa chỉ này đã tồn tại trong danh sách của bạn rồi.',
          error: 'DUPLICATE_ENTRY' 
        },
        { status: 409 }
      );
    }

    const newToaNha = new ToaNha({
      ...validatedData,
      chuSoHuu: chuSoHuuId,
      tienNghiChung: validatedData.tienNghiChung || [],
      // tongSoPhong sẽ được set mặc định là 0 từ model
    });

    console.log('New toa nha object:', newToaNha);
    console.log('Saving toa nha...');
    await newToaNha.save();
    console.log('Toa nha saved successfully');

    return NextResponse.json({
      success: true,
      data: newToaNha,
      message: 'Tòa nhà đã được tạo thành công',
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.issues);
      return NextResponse.json(
        { 
          message: 'Validation error',
          details: error.issues,
          error: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }

    console.error('Error creating toa nha:', error);
    
    // Hiển thị chi tiết lỗi trong development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error instanceof Error ? error.message : String(error)
      : 'Internal server error';
    
    const errorDetails = process.env.NODE_ENV === 'development' 
      ? {
          name: error instanceof Error ? error.name : 'Unknown',
          stack: error instanceof Error ? error.stack : undefined,
          fullError: error
        }
      : undefined;

    return NextResponse.json(
      { 
        message: errorMessage,
        details: errorDetails,
        error: 'SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}
