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
      if (trangThai === 'hasAccount') {
        query.matKhau = { $exists: true, $ne: '' };
      } else if (trangThai === 'noAccount') {
        query.matKhau = { $exists: false };
      } else {
        query.trangThai = trangThai;
      }
    }

    const accessibleKhachThueIds = await getAccessibleKhachThueIds(session.user);
    if (accessibleKhachThueIds !== null) {
      if (accessibleKhachThueIds.length === 0) {
        return NextResponse.json({ success: true, data: [], pagination: { total: 0 } });
      }
      query._id = { $in: accessibleKhachThueIds };
    }

    // === QUERY 1: Lấy danh sách khách thuê (1 query duy nhất) ===
    const [khachThueList, total] = await Promise.all([
      KhachThue.find(query)
        .select('+matKhau')
        .sort({ hoTen: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      KhachThue.countDocuments(query)
    ]);

    // Collect IDs, phones, emails cho batch queries
    const tenantIds = khachThueList.map(k => k._id);
    const tenantIdStrings = tenantIds.map(id => id.toString());
    const tenantPhones = khachThueList.map(k => k.soDienThoai).filter(Boolean);
    const tenantEmails = khachThueList.map(k => (k as any).email?.toLowerCase()).filter(Boolean);

    // === QUERY 2 & 3: Batch lấy tài khoản NguoiDung + Hợp đồng (song song) ===
    const [userAccounts, allContracts] = await Promise.all([
      // Batch NguoiDung query
      mongoose.model('NguoiDung').find({
        role: 'khachThue',
        $or: [
          { _id: { $in: tenantIds } },
          { soDienThoai: { $in: tenantPhones } },
          { phone: { $in: tenantPhones } },
          ...(tenantEmails.length > 0 ? [{ email: { $in: tenantEmails } }] : [])
        ]
      }).select('+matKhau').lean(),
      // Batch HopDong query — 1 query thay vì N queries
      HopDong.find({
        $or: [
          { khachThueId: { $in: tenantIds } },
          { nguoiDaiDien: { $in: tenantIds } }
        ]
      })
      .sort({ ngayTao: -1 })
      .populate('phong', 'maPhong toaNha')
      .populate({
        path: 'phong',
        populate: { path: 'toaNha', select: 'tenToaNha diaChi' }
      })
      .lean()
    ]);

    // Build lookup maps cho O(1) access
    const contractsByTenant = new Map<string, any[]>();
    for (const contract of allContracts) {
      // Map theo khachThueId array
      const ktIds: any[] = contract.khachThueId || [];
      for (const ktId of ktIds) {
        const key = ktId.toString();
        if (!contractsByTenant.has(key)) contractsByTenant.set(key, []);
        contractsByTenant.get(key)!.push(contract);
      }
      // Map theo nguoiDaiDien
      if (contract.nguoiDaiDien) {
        const key = contract.nguoiDaiDien.toString();
        if (!contractsByTenant.has(key)) contractsByTenant.set(key, []);
        // Avoid duplicate
        const list = contractsByTenant.get(key)!;
        if (!list.some((c: any) => c._id.toString() === contract._id.toString())) {
          list.push(contract);
        }
      }
    }

    // Process all tenants synchronously (no more async per tenant)
    const processedList = khachThueList.map((tenantData: any) => {
      const tenantId = tenantData._id.toString();
      
      // Find matching NguoiDung account
      const userAccount = userAccounts.find((u: any) => 
        u._id.toString() === tenantId || 
        u.soDienThoai === tenantData.soDienThoai ||
        u.phone === tenantData.soDienThoai ||
        (tenantData.email && u.email === tenantData.email.toLowerCase())
      );
      
      // Get contracts from map (O(1) lookup)
      const tatCaHopDong = contractsByTenant.get(tenantId) || [];
      const hopDongHienTai = tatCaHopDong.find((h: any) => h.trangThai === 'hoatDong') || null;
      
      // Compute status inline (no DB write needed)
      let trangThaiComputed = tenantData.trangThai || 'chuaThue';
      if (hopDongHienTai) trangThaiComputed = 'dangThue';
      
      const hasPassword = !!tenantData.matKhau || (userAccount && !!(userAccount as any).matKhau);

      return {
        ...tenantData,
        ngayTao: tenantData.ngayTao || tenantData.createdAt || null,
        ngayCapNhat: tenantData.ngayCapNhat || tenantData.updatedAt || null,
        matKhau: hasPassword ? '******' : undefined,
        hopDongHienTai,
        tatCaHopDong,
        trangThai: trangThaiComputed
      };
    });

    // === QUERY 4: Bổ sung NguoiDung khách thuê chưa có trong KhachThue ===
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

    const userTenants = await mongoose.model('NguoiDung').find(userQuery).select('+matKhau').lean().limit(limit);
    
    const finalData = [...processedList];
    const existingIds = new Set(tenantIdStrings);
    const existingPhones = new Set(tenantPhones);
    const existingEmails = new Set(tenantEmails);
    
    for (const user of userTenants) {
      const userId = (user as any)._id.toString();
      const userPhone = (user as any).soDienThoai || (user as any).phone;
      const userEmail = (user as any).email;
      
      if (existingIds.has(userId) || 
          (userPhone && existingPhones.has(userPhone)) ||
          (userEmail && existingEmails.has(userEmail))) {
        continue; // Already in list
      }
      
      const userContracts = contractsByTenant.get(userId) || [];
      const activeContract = userContracts.find((h: any) => h.trangThai === 'hoatDong') || null;
      
      finalData.push({
        _id: (user as any)._id,
        hoTen: (user as any).ten || (user as any).name,
        soDienThoai: userPhone,
        email: userEmail,
        matKhau: (user as any).matKhau ? '******' : undefined,
        trangThai: activeContract ? 'dangThue' : 'chuaThue',
        vaiTro: 'khachThue',
        anhDaiDien: (user as any).anhDaiDien || (user as any).avatar,
        ngayTao: (user as any).createdAt || null,
        ngayCapNhat: (user as any).updatedAt || null,
        hopDongHienTai: activeContract,
        tatCaHopDong: userContracts,
      } as any);
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
