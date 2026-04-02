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

    const matchQuery: any = {};
    
    if (search) {
      matchQuery.$or = [
        { hoTen: { $regex: search, $options: 'i' } },
        { soDienThoai: { $regex: search, $options: 'i' } },
        { cccd: { $regex: search, $options: 'i' } },
        { queQuan: { $regex: search, $options: 'i' } },
        { ngheNghiep: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (trangThai) {
      if (trangThai === 'hasAccount') {
        matchQuery.matKhau = { $exists: true, $ne: '' };
      } else if (trangThai === 'noAccount') {
        matchQuery.matKhau = { $exists: false };
      } else {
        matchQuery.trangThai = trangThai;
      }
    }

    const accessibleKhachThueIds = await getAccessibleKhachThueIds(session.user);
    if (accessibleKhachThueIds !== null) {
      matchQuery._id = { $in: (accessibleKhachThueIds as any[]).map((id: any) => new mongoose.Types.ObjectId(id.toString())) };
    }

    // === AGGREGATION PIPELINE (Optimized) ===
    const pipeline: any[] = [
      { $match: matchQuery },
      { $sort: { hoTen: 1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      // Lookup HopDong
      {
        $lookup: {
          from: 'hopdongs',
          let: { tenantId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $in: ['$$tenantId', '$khachThueId'] },
                    { $eq: ['$$tenantId', '$nguoiDaiDien'] }
                  ]
                }
              }
            },
            { $sort: { ngayTao: -1 } },
            // Chỉ lấy các trường cần thiết từ Hợp đồng để giảm tải filter
            {
              $project: {
                _id: 1,
                maHopDong: 1,
                phong: 1,
                trangThai: 1,
                ngayBatDau: 1,
                ngayKetThuc: 1,
                giaThue: 1,
                ngayTao: 1
              }
            },
            // Populate Phong và ToaNha (mini-lookup)
            {
              $lookup: {
                from: 'phongs',
                localField: 'phong',
                foreignField: '_id',
                pipeline: [{ $project: { _id: 1, maPhong: 1, toaNha: 1 } }],
                as: 'phongInfo'
              }
            },
            { $unwind: { path: '$phongInfo', preserveNullAndEmptyArrays: true } }
          ],
          as: 'tatCaHopDong'
        }
      },
      // Thêm thông tin NguoiDung (nếu có tài khoản)
      {
        $lookup: {
          from: 'nguoidungs',
          let: { phone: '$soDienThoai', email: { $toLower: '$email' } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$phone', '$$phone'] },
                    { $eq: ['$soDienThoai', '$$phone'] },
                    { $and: [
                      { $ne: ['$$email', null] },
                      { $eq: [{ $toLower: '$email' }, '$$email'] }
                    ]}
                  ]
                }
              }
            },
            { $limit: 1 },
            { $project: { _id: 1, matKhau: { $cond: { if: { $gt: [{ $strLenCP: { $ifNull: ["$matKhau", "$password", ""] } }, 0] }, then: 1, else: 0 } } } }
          ],
          as: 'userAccount'
        }
      },
      { $unwind: { path: '$userAccount', preserveNullAndEmptyArrays: true } },
      // Xử lý dữ liệu cuối cùng
      {
        $addFields: {
          hopDongHienTai: {
            $slice: [
              {
                $filter: {
                  input: '$tatCaHopDong',
                  as: 'h',
                  cond: { $eq: ['$$h.trangThai', 'hoatDong'] }
                }
              },
              1
            ]
          }
        }
      },
      {
        $addFields: {
          hopDongHienTai: { $arrayElemAt: ['$hopDongHienTai', 0] },
          hasPassword: {
            $or: [
              { $and: [{ $ne: ['$matKhau', null] }, { $ne: ['$matKhau', ''] }] },
              { $eq: ['$userAccount.matKhau', 1] }
            ]
          }
        }
      },
      {
        $project: {
          hoTen: 1,
          soDienThoai: 1,
          email: 1,
          cccd: 1,
          ngaySinh: 1,
          gioiTinh: 1,
          queQuan: 1,
          anhCCCD: 1,
          ngheNghiep: 1,
          trangThai: {
            $cond: {
              if: { $ne: ['$hopDongHienTai', null] },
              then: 'dangThue',
              else: '$trangThai'
            }
          },
          ngayTao: { $ifNull: ['$ngayTao', '$createdAt'] },
          ngayCapNhat: { $ifNull: ['$ngayCapNhat', '$updatedAt'] },
          matKhau: { $cond: { if: '$hasPassword', then: '******', else: null } },
          hopDongHienTai: 1,
          tatCaHopDong: 1
        }
      }
    ];

    const [finalData, total] = await Promise.all([
      KhachThue.aggregate(pipeline),
      KhachThue.countDocuments(matchQuery)
    ]);

    // Chạy cập nhật trạng thái trong background (không await)
    if (finalData.length > 0) {
      const idsToUpdate = finalData.map(f => f._id.toString());
      // Giới hạn số lượng update background để không overload DB
      Promise.all(idsToUpdate.slice(0, 5).map(id => updateKhachThueStatus(id))).catch(err => console.error('Background status update failed', err));
    }

    return NextResponse.json({
      success: true,
      data: finalData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
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

    // Cập nhật trạng thái dựa trên hợp đồng (chạy background)
    updateKhachThueStatus(newKhachThue._id.toString()).catch(e => console.error(e));

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
