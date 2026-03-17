import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import KhachThue from '@/models/KhachThue';
import HopDong from '@/models/HopDong';
import Phong from '@/models/Phong';
import { updateKhachThueStatus } from '@/lib/status-utils';
import { getAccessibleKhachThueIds } from '@/lib/auth-utils';
import { z } from 'zod';
import mongoose from 'mongoose';

const khachThueSchema = z.object({
  hoTen: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
  soDienThoai: z.string().regex(/^[0-9]{10,11}$/, 'Số điện thoại không hợp lệ'),
  email: z.string().email('Email không hợp lệ').optional(),
  cccd: z.string().regex(/^[0-9]{12}$/, 'CCCD phải có 12 chữ số'),
  ngaySinh: z.string().min(1, 'Ngày sinh là bắt buộc'),
  gioiTinh: z.enum(['nam', 'nu', 'khac']),
  queQuan: z.string().min(1, 'Quê quán là bắt buộc'),
  anhCCCD: z.object({
    matTruoc: z.string().optional(),
    matSau: z.string().optional(),
  }).optional(),
  ngheNghiep: z.string().optional(),
  matKhau: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').optional(),
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
    const trangThai = searchParams.get('trangThai') || '';

    const query: any = {};
    
    if (search) {
      query.$or = [
        { hoTen: { $regex: search, $options: 'i' } },
        { soDienThoai: { $regex: search, $options: 'i' } },
        { cccd: { $regex: search, $options: 'i' } },
        { queQuan: { $regex: search, $options: 'i' } },
        { ngheNghiep: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (trangThai) {
      query.trangThai = trangThai;
    }

    const accessibleKhachThueIds = await getAccessibleKhachThueIds(session.user);
    if (accessibleKhachThueIds !== null) {
      // User is not Admin => restrict query to these IDs
      if (accessibleKhachThueIds.length === 0) {
        return NextResponse.json({ success: true, data: [], pagination: { total: 0 } });
      }
      query._id = { $in: accessibleKhachThueIds };
    }

    const khachThueList = await KhachThue.find(query)
      .select('+matKhau') // Include password field to check if exists
      .sort({ hoTen: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Cập nhật trạng thái khách thuê dựa trên hợp đồng
    await Promise.all(
      khachThueList.map((khach: any) => updateKhachThueStatus(khach._id.toString()))
    );

    // Lấy lại dữ liệu với trạng thái đã cập nhật
    const updatedKhachThueList = await KhachThue.find(query)
      .select('+matKhau')
      .sort({ hoTen: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Lấy thông tin tài khoản để kiểm tra trạng thái "Đã tạo tài khoản"
    const tenantIds = updatedKhachThueList.map(k => k._id);
    const userAccounts = await mongoose.model('NguoiDung').find({
      _id: { $in: tenantIds }
    }).select('+matKhau');

    // Thêm thông tin tất cả hợp đồng và phòng cho mỗi khách thuê
    const processTenant = async (tenantData: any) => {
      try {
        const tenantId = tenantData._id.toString();
        
        // Tìm tài khoản tương ứng
        const userAccount = userAccounts.find(u => u._id.toString() === tenantId);
        
        // Truy vấn tất cả hợp đồng của khách thuê này
        // Sử dụng cả định dạng String và ObjectId để đảm bảo tìm thấy
        const tatCaHopDong = await HopDong.find({
          $or: [
            { khachThueId: { $in: [tenantId, new mongoose.Types.ObjectId(tenantId)] } },
            { nguoiDaiDien: { $in: [tenantId, new mongoose.Types.ObjectId(tenantId)] } }
          ]
        })
        .sort({ ngayTao: -1 })
        .populate('phong', 'maPhong toaNha')
        .populate({
          path: 'phong',
          populate: {
            path: 'toaNha',
            select: 'tenToaNha diaChi'
          }
        });
        
        const resData = tenantData.toObject ? tenantData.toObject() : tenantData;
        
        // Map timestamps explicitly - check multiple possible locations
        const ngayTao = resData.ngayTao || resData.createdAt || tenantData.createdAt || tenantData.ngayTao;
        const ngayCapNhat = resData.ngayCapNhat || resData.updatedAt || tenantData.updatedAt || tenantData.ngayCapNhat;
        
        // Xác định hợp đồng hiện tại (đang hoạt động)
        const hopDongHienTai = tatCaHopDong.find(h => h.trangThai === 'hoatDong');
        
        // Cập nhật trạng thái dựa trên hợp đồng thực tế
        let trangThai = resData.trangThai || 'chuaThue';
        if (hopDongHienTai) {
          trangThai = 'dangThue';
        }

        // Kiểm tra xem đã có mật khẩu ở đâu chưa
        const hasPassword = !!resData.matKhau || (userAccount && !!userAccount.matKhau);

        console.log(`[DEBUG] Processed ${resData.hoTen || tenantId}: Contracts=${tatCaHopDong.length}, HasAccount=${hasPassword}`);

        return {
          ...resData,
          ngayTao: ngayTao || null,
          ngayCapNhat: ngayCapNhat || null,
          matKhau: hasPassword ? '******' : undefined,
          hopDongHienTai: hopDongHienTai || null,
          tatCaHopDong: tatCaHopDong || [],
          trangThai
        };
      } catch (err) {
        console.error(`Error processing tenant ${tenantData._id}:`, err);
        return tenantData.toObject ? tenantData.toObject() : tenantData;
      }
    };

    const khachThueListWithContracts = await Promise.all(
      updatedKhachThueList.map(processTenant)
    );

    const total = await KhachThue.countDocuments(query);

    // Bổ sung thêm các tài khoản khách thuê từ NguoiDung model nếu chưa có trong KhachThue
    const userQuery: any = { role: 'khachThue' };
    if (accessibleKhachThueIds !== null) {
      userQuery._id = { $in: accessibleKhachThueIds };
    }
    if (search) {
      userQuery.$or = [
        { ten: { $regex: search, $options: 'i' } },
        { soDienThoai: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const userTenants = await mongoose.model('NguoiDung').find(userQuery).select('+matKhau').limit(limit);
    
    // Trộn và đảm bảo không trùng lặp
    const finalData = [...khachThueListWithContracts];
    
    for (const user of userTenants) {
      const exists = finalData.some(k => 
        k._id?.toString() === user._id.toString() || 
        k.soDienThoai === (user.soDienThoai || user.phone) ||
        (user.email && k.email === user.email)
      );
      
      if (!exists) {
        const tenantInfo = await processTenant({
          _id: user._id,
          hoTen: user.ten || user.name,
          soDienThoai: user.soDienThoai || user.phone,
          email: user.email,
          matKhau: user.matKhau, // Chuyển mật khẩu để UI biết đã có tài khoản
          trangThai: 'chuaThue',
          vaiTro: 'khachThue',
          anhDaiDien: user.anhDaiDien || user.avatar,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        });
        finalData.push(tenantInfo);
      }
    }

    return NextResponse.json({
      success: true,
      data: finalData,
      pagination: {
        page,
        limit,
        total: Math.max(total, finalData.length),
        totalPages: Math.ceil(Math.max(total, finalData.length) / limit),
      },
    });

  } catch (error) {
    console.error('Error fetching khach thue:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    const validatedData = khachThueSchema.parse(body);

    await dbConnect();

    // Check if phone or CCCD already exists
    const existingKhachThue = await KhachThue.findOne({
      $or: [
        { soDienThoai: validatedData.soDienThoai },
        { cccd: validatedData.cccd }
      ]
    });

    if (existingKhachThue) {
      return NextResponse.json(
        { message: 'Số điện thoại hoặc CCCD đã được sử dụng' },
        { status: 400 }
      );
    }

    let nguoiQuanLyId = session.user.id;
    if (session.user.role === 'nhanVien') {
      const nhanVien = await mongoose.model('NguoiDung').findById(session.user.id).select('nguoiQuanLy');
      if (nhanVien && nhanVien.nguoiQuanLy) {
        nguoiQuanLyId = nhanVien.nguoiQuanLy.toString();
      }
    }

    const newKhachThue = new KhachThue({
      ...validatedData,
      ngaySinh: new Date(validatedData.ngaySinh),
      anhCCCD: validatedData.anhCCCD || { matTruoc: '', matSau: '' },
      trangThai: 'chuaThue', // Mặc định là chưa thuê, sẽ được cập nhật tự động
      nguoiQuanLy: new mongoose.Types.ObjectId(nguoiQuanLyId)
    });

    await newKhachThue.save();

    // Cập nhật trạng thái dựa trên hợp đồng
    await updateKhachThueStatus(newKhachThue._id.toString());

    return NextResponse.json({
      success: true,
      data: newKhachThue,
      message: 'Khách thuê đã được tạo thành công',
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Error creating khach thue:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
