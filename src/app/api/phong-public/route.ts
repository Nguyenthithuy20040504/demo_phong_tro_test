import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Phong from '@/models/Phong';
import ToaNha from '@/models/ToaNha';
import '@/models/NguoiDung';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const toaNha = searchParams.get('toaNha') || '';
    const trangThai = searchParams.get('trangThai') || '';

    const query: any = {
      trangThai: 'trong' // Chỉ lấy những phòng chưa cho thuê (đang trống)
    };
    
    if (search) {
      query.$or = [
        { maPhong: { $regex: search, $options: 'i' } },
        { moTa: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (toaNha && toaNha !== 'all') {
      query.toaNha = toaNha;
    }


    const phongList = await Phong.find(query)
      .populate({
        path: 'toaNha',
        select: 'tenToaNha diaChi chuSoHuu',
        populate: {
          path: 'chuSoHuu',
          select: 'ten soDienThoai email anhDaiDien'
        }
      })
      .sort({ maPhong: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Phong.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: phongList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Error fetching public phong:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
