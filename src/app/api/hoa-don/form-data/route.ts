import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import ToaNha from '@/models/ToaNha';
import HopDong from '@/models/HopDong';
import mongoose from 'mongoose';
import Phong from '@/models/Phong';
import KhachThue from '@/models/KhachThue';
import { getAccessibleToaNhaIds } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    console.log('Form data API called');
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    await connectToDatabase();
    console.log('Database connected successfully');

    const accessibleToaNhaIds = await getAccessibleToaNhaIds(session.user);
    const query: any = {};
    if (accessibleToaNhaIds !== null) {
      query._id = { $in: accessibleToaNhaIds };
    }

    // Parallelize independent queries
    console.log('Fetching ToaNha, Phong, KhachThue, NguoiDung in parallel...');
    
    const phongQuery: any = {};
    if (accessibleToaNhaIds !== null) {
      phongQuery.toaNha = { $in: accessibleToaNhaIds };
    }

    const [toaNhaListRaw, phongListRaw, khachThueListRaw, nguoiDungListRaw] = await Promise.all([
      ToaNha.find(query).select('tenToaNha').sort({ tenToaNha: 1 }).lean(),
      Phong.find(phongQuery).select('maPhong toaNha tang giaThue trangThai').sort({ maPhong: 1 }).lean(),
      KhachThue.find().select('hoTen soDienThoai email').sort({ hoTen: 1 }).lean(),
      mongoose.model('NguoiDung').find({ role: 'khachThue' }).select('ten name soDienThoai phone email').lean()
    ]);

    const toaNhaList = (toaNhaListRaw as any[]).map(t => ({ ...t, _id: t._id.toString() }));
    const phongList = (phongListRaw as any[]).map(p => ({ 
      ...p, 
      _id: p._id.toString(),
      toaNha: p.toaNha.toString()
    }));
    
    console.log('Fetched independent data. Resolving HopDong...');

    // Get active contracts filtered by building
    const hopDongQuery: any = { trangThai: 'hoatDong' };
    if (accessibleToaNhaIds !== null) {
      const pIds = (phongListRaw as any[]).map(p => p._id);
      hopDongQuery.phong = { $in: pIds };
    }
    const hopDongListRaw = await HopDong.find(hopDongQuery)
      .select('maHopDong phong nguoiDaiDien giaThue giaDien giaNuoc phiDichVu chiSoDienBanDau chiSoNuocBanDau ngayBatDau ngayKetThuc trangThai')
      .sort({ maHopDong: 1 })
      .lean();
    
    // Formatting data
    const hopDongList = (hopDongListRaw as any[]).map(hd => ({
      ...hd,
      _id: hd._id.toString(),
      phong: hd.phong.toString(),
      nguoiDaiDien: hd.nguoiDaiDien.toString()
    }));

    const khachThueList = [
      ...(khachThueListRaw as any[]).map(kt => ({ 
        ...kt, 
        _id: kt._id.toString() 
      })),
      ...(nguoiDungListRaw as any[]).map(nd => ({
        _id: nd._id.toString(),
        hoTen: nd.ten || nd.name || 'Khách thuê',
        soDienThoai: nd.soDienThoai || nd.phone || '',
        email: nd.email || ''
      }))
    ];


    return NextResponse.json({
      success: true,
      data: {
        toaNhaList,
        hopDongList,
        phongList,
        khachThueList,
      },
    });

  } catch (error) {
    console.error('Error fetching form data:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
