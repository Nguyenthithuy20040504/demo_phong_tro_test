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
import NguoiDung from '@/models/NguoiDung';
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
  toaNhaBanDau: z.string().optional(),
  userId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
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
    const toaNhaId = searchParams.get('toaNhaId');

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
    
    if (trangThai && trangThai !== 'hasAccount' && trangThai !== 'noAccount') {
      matchQuery.trangThai = trangThai;
    }

    const accessibleKhachThueIds = await getAccessibleKhachThueIds(session.user);
    let targetKhachThueIds = accessibleKhachThueIds;

    // Filter by building if requested
    if (toaNhaId && toaNhaId !== 'all') {
      const phongs = await Phong.find({ toaNha: toaNhaId }).select('_id');
      const phongIds = phongs.map(p => p._id);
      
      const activeHopDongs = await HopDong.find({ 
        phong: { $in: phongIds },
        trangThai: { $in: ['hoatDong', 'choDuyet'] }
      }).select('khachThueId nguoiDaiDien');
      
      const tenantIdsInBuilding = new Set<string>();
      activeHopDongs.forEach(hd => {
        if (hd.khachThueId) hd.khachThueId.forEach((id: any) => tenantIdsInBuilding.add(id.toString()));
        if (hd.nguoiDaiDien) tenantIdsInBuilding.add(hd.nguoiDaiDien.toString());
      });

      const historicalHopDongs = await HopDong.find({ phong: { $in: phongIds } }).select('khachThueId nguoiDaiDien');
      const historicalTenantIds = new Set<string>();
      historicalHopDongs.forEach(hd => {
        if (hd.khachThueId) hd.khachThueId.forEach((id: any) => historicalTenantIds.add(id.toString()));
        if (hd.nguoiDaiDien) historicalTenantIds.add(hd.nguoiDaiDien.toString());
      });

      const chuaThueTenants = await KhachThue.find({
        trangThai: 'chuaThue',
        $or: [
          { toaNhaBanDau: toaNhaId },
          { _id: { $in: Array.from(historicalTenantIds).map(id => new mongoose.Types.ObjectId(id)) } }
        ]
      }).select('_id');
      
      chuaThueTenants.forEach((t: any) => tenantIdsInBuilding.add(t._id.toString()));

      let buildingTenantIds = Array.from(tenantIdsInBuilding);
      
      if (buildingTenantIds.length === 0) {
        return NextResponse.json({ success: true, data: [], pagination: { total: 0 } });
      }
      
      if (accessibleKhachThueIds !== null) {
        const accessibleStrIds = accessibleKhachThueIds.map(id => id.toString());
        const filteredIds = buildingTenantIds.filter(id => accessibleStrIds.includes(id));
        targetKhachThueIds = filteredIds.map(id => new mongoose.Types.ObjectId(id));
      } else {
        targetKhachThueIds = buildingTenantIds.map(id => new mongoose.Types.ObjectId(id));
      }
    }

    if (targetKhachThueIds !== null) {
      matchQuery._id = { $in: targetKhachThueIds };
    }

    let chuNhaId = session.user.id;
    if (session.user.role === 'nhanVien') {
      const dbUser = await NguoiDung.findById(session.user.id).select('nguoiQuanLy');
      if (dbUser && dbUser.nguoiQuanLy) {
        chuNhaId = dbUser.nguoiQuanLy.toString();
      }
    }

    const trangThaiFilter = searchParams.get('trangThai');
    const action = searchParams.get('action');

    if (action === 'basic') {
      const metadata = [{ total: await KhachThue.countDocuments(matchQuery) }];
      const rawData = await KhachThue.find(matchQuery).sort({ ngayTao: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
      return NextResponse.json({
        success: true,
        data: rawData,
        pagination: {
          page, limit, total: metadata[0].total, totalPages: Math.ceil(metadata[0].total/limit)
        }
      });
    }

    const pipeline: any[] = [
      { $match: matchQuery },
      {
        $lookup: {
          from: 'nguoidungs',
          let: { 
            tid: '$_id', 
            ph: '$soDienThoai', 
            em: { $toLower: '$email' },
            un: { $toLower: '$tenDangNhap' }
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$_id', '$$tid'] },
                    { $eq: ['$soDienThoai', '$$ph'] },
                    { $eq: ['$soDienThoai', { $concat: ['kt_', '$$ph'] }] },
                    { $eq: ['$phone', '$$ph'] },
                    { $and: [{ $ne: ['$$em', null] }, { $eq: [{ $toLower: '$email' }, '$$em'] }] },
                    { $and: [{ $ne: ['$$un', null] }, { $eq: [{ $toLower: '$tenDangNhap' }, '$$un'] }] },
                    { $and: [{ $ne: ['$$un', null] }, { $eq: [{ $toLower: '$username' }, '$$un'] }] },
                    { $and: [{ $eq: ['$vaiTro', 'khachThue'] }, { $eq: ['$ten', '$hoTen' ] }] },
                    { $and: [{ $eq: ['$role', 'khachThue'] }, { $eq: ['$name', '$hoTen' ] }] }
                  ]
                }
              }
            },
            { $limit: 1 }
          ],
          as: 'account'
        }
      },
      {
        $addFields: {
          hasAccount: {
            $or: [
              { $gt: [{ $strLenCP: { $ifNull: ["$matKhau", ""] } }, 0] },
              { $gt: [{ $size: '$account' }, 0] }
            ]
          }
        }
      },
      ...(trangThaiFilter === 'hasAccount' ? [{ $match: { hasAccount: true } }] : []),
      ...(trangThaiFilter === 'noAccount' ? [{ $match: { hasAccount: false } }] : []),
      
      {
        $addFields: {
          sortDate: { $ifNull: ['$ngayTao', '$createdAt'] }
        }
      },
      { $sort: { sortDate: -1 } },
      
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
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
                  {
                    $lookup: {
                      from: 'phongs',
                      localField: 'phong',
                      foreignField: '_id',
                      pipeline: [
                        {
                          $lookup: {
                            from: 'toanhas',
                            localField: 'toaNha',
                            foreignField: '_id',
                            pipeline: [{ $project: { _id: 1, tenToaNha: 1 } }],
                            as: 'toaNhaInfo'
                          }
                        },
                        { $unwind: { path: '$toaNhaInfo', preserveNullAndEmptyArrays: true } },
                        { $project: { _id: 1, maPhong: 1, toaNhaInfo: 1 } }
                      ],
                      as: 'phongInfo'
                    }
                  },
                  { $unwind: { path: '$phongInfo', preserveNullAndEmptyArrays: true } }
                ],
                as: 'tatCaHopDong'
              }
            },
            {
              $addFields: {
                hopDongHienTai: {
                  $slice: [
                    {
                      $filter: {
                        input: '$tatCaHopDong',
                        as: 'h',
                        cond: { 
                          $and: [
                            { $eq: ['$$h.trangThai', 'hoatDong'] },
                            ...(toaNhaId && toaNhaId !== 'all' 
                              ? [{ $eq: ['$$h.phongInfo.toaNhaInfo._id', new mongoose.Types.ObjectId(toaNhaId)] }] 
                              : []
                            )
                          ]
                        }
                      }
                    },
                    1
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
                tenDangNhap: 1,
                matKhau: { $cond: { if: '$hasAccount', then: '******', else: null } },
                trangThai: {
                  $cond: {
                    if: { $ne: [{ $arrayElemAt: ['$hopDongHienTai', 0] }, null] },
                    then: 'dangThue',
                    else: '$trangThai'
                  }
                },
                ngayTao: { $ifNull: ['$ngayTao', '$createdAt'] },
                ngayCapNhat: { $ifNull: ['$ngayCapNhat', '$updatedAt'] },
                hopDongHienTai: { $arrayElemAt: ['$hopDongHienTai', 0] },
                tatCaHopDong: 1
              }
            }
          ]
        }
      }
    ];

    const result = await KhachThue.aggregate(pipeline);
    const finalData = result[0].data || [];
    const total = result[0].metadata[0]?.total || 0;

    if (finalData.length > 0) {
      const idsToUpdate = finalData.map((f: any) => f._id.toString());
      Promise.all(idsToUpdate.slice(0, 5).map((id: string) => updateKhachThueStatus(id))).catch(err => console.error('Background status update failed', err));
    }

    return NextResponse.json({
      success: true,
      data: finalData,
      pagination: {
        page, limit, total, totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Error fetching khach thue:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = khachThueSchema.parse(body);

    await dbConnect();

    let nguoiQuanLyId = session.user.id;
    if (session.user.role === 'nhanVien') {
      const nhanVien = await NguoiDung.findById(session.user.id).select('nguoiQuanLy');
      if (nhanVien && nhanVien.nguoiQuanLy) {
        nguoiQuanLyId = nhanVien.nguoiQuanLy.toString();
      }
    }

    const dbSession = await mongoose.startSession();
    let newKhachThueData: any;
    let linkUserId: mongoose.Types.ObjectId | undefined = undefined;

    try {
      await dbSession.withTransaction(async () => {
        const existingKhachThue = await KhachThue.findOne({
          nguoiQuanLy: new mongoose.Types.ObjectId(nguoiQuanLyId),
          $or: [
            { soDienThoai: validatedData.soDienThoai },
            { cccd: validatedData.cccd },
            ...(validatedData.email ? [{ email: { $regex: new RegExp(`^${validatedData.email}$`, 'i') } }] : [])
          ]
        }).session(dbSession);

        if (existingKhachThue) {
          let conflictField = 'Số điện thoại hoặc CCCD';
          if (validatedData.email && existingKhachThue.email?.toLowerCase() === validatedData.email.toLowerCase()) {
            conflictField = 'Email, Số điện thoại hoặc CCCD';
          }
          throw new Error(`${conflictField} đã được bạn sử dụng cho một khách thuê khác trong danh sách của mình.`);
        }

        if (body.userId) {
          const userObjId = new mongoose.Types.ObjectId(body.userId);
          const userTarget = await NguoiDung.findById(userObjId).session(dbSession);
          if (!userTarget) {
            throw new Error('Tài khoản được chọn không tồn tại.');
          }
          if (userTarget.role !== 'khachThue' && userTarget.vaiTro !== 'khachThue') {
            throw new Error('Tài khoản được chọn không phải là vai trò Khách thuê.');
          }

          const alreadyLinkedKhachThue = await KhachThue.findById(userObjId).session(dbSession);
          if (alreadyLinkedKhachThue) {
            throw new Error('Tài khoản này đã được liên kết với một hồ sơ khách thuê khác!');
          }

          linkUserId = userObjId;
          
          let targetUserEmail = userTarget.email;
          if (targetUserEmail && targetUserEmail.startsWith(`unlinked_${nguoiQuanLyId}_`)) {
             targetUserEmail = targetUserEmail.replace(`unlinked_${nguoiQuanLyId}_`, '');
          }

          await NguoiDung.findByIdAndUpdate(userObjId, {
            $set: {
              ten: validatedData.hoTen,
              name: validatedData.hoTen,
              soDienThoai: validatedData.soDienThoai,
              phone: validatedData.soDienThoai,
              email: validatedData.email || targetUserEmail
            }
          }, { session: dbSession });
        }

        const newKhachThueObj = new KhachThue({
          ...(linkUserId ? { _id: linkUserId } : {}),
          ...validatedData,
          ngaySinh: new Date(validatedData.ngaySinh),
          anhCCCD: validatedData.anhCCCD || { matTruoc: '', matSau: '' },
          trangThai: 'chuaThue',
          nguoiQuanLy: new mongoose.Types.ObjectId(nguoiQuanLyId),
          toaNhaBanDau: body.toaNhaBanDau ? new mongoose.Types.ObjectId(body.toaNhaBanDau) : undefined
        });

        await newKhachThueObj.save({ session: dbSession });
        newKhachThueData = newKhachThueObj;
      });
      await dbSession.endSession();
    } catch (e: any) {
      await dbSession.endSession();
      return NextResponse.json({ success: false, message: e.message || 'Lỗi khi tạo khách thuê' }, { status: 400 });
    }

    if (!newKhachThueData) {
      return NextResponse.json({ success: false, message: 'Không thể tạo khách thuê' }, { status: 500 });
    }

    updateKhachThueStatus(newKhachThueData._id.toString()).catch(e => console.error(e));

    if (linkUserId) {
      const dbUser = await NguoiDung.findById(linkUserId);
      if (dbUser && !dbUser.daXacMinhEmail && dbUser.maXacNhanEmail && dbUser.email && !dbUser.email.includes('@no-email.local')) {
        const rootUrl = request.nextUrl.origin;
        const confirmLink = `${rootUrl}/api/auth/verify-link?email=${encodeURIComponent(dbUser.email)}&token=${dbUser.maXacNhanEmail}&type=khachThue`;
        const { sendAccountConfirmationLinkEmail } = await import('@/lib/mail');
        sendAccountConfirmationLinkEmail({
          email: dbUser.email,
          khachThueName: dbUser.ten,
          confirmLink: confirmLink,
        }).catch(e => console.error('Lỗi gửi email khi liên kết:', e));
      }
    }

    return NextResponse.json({
      success: true,
      data: newKhachThueData,
      message: 'Khách thuê đã được tạo thành công',
    }, { status: 201 });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: error.issues[0].message }, { status: 400 });
    }
    console.error('Error creating khach thue:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 500 });
  }
}
