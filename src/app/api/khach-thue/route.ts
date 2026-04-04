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
  toaNhaBanDau: z.string().optional(),
  userId: z.string().optional(),
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
      // Logic: Khách thuê thuộc tòa nhà nếu họ có hợp đồng trong tòa nhà đó
      const phongs = await Phong.find({ toaNha: toaNhaId }).select('_id');
      const phongIds = phongs.map(p => p._id);
      
      const hopDongs = await HopDong.find({ phong: { $in: phongIds } }).select('khachThueId nguoiDaiDien');
      
      const tenantIdsInBuilding = new Set<string>();
      hopDongs.forEach(hd => {
        if (hd.khachThueId) hd.khachThueId.forEach((id: any) => tenantIdsInBuilding.add(id.toString()));
        if (hd.nguoiDaiDien) tenantIdsInBuilding.add(hd.nguoiDaiDien.toString());
      });

      // Lấy thêm các khách thuê được tạo trực tiếp ở tòa nhà này (toaNhaBanDau)
      const tenantsCreatedInBuilding = await KhachThue.find({ toaNhaBanDau: toaNhaId }).select('_id');
      tenantsCreatedInBuilding.forEach(t => tenantIdsInBuilding.add(t._id.toString()));

      const buildingTenantIds = Array.from(tenantIdsInBuilding);
      
      if (accessibleKhachThueIds !== null) {
        // Intersect building tenants with accessible tenants
        const accessibleStrIds = accessibleKhachThueIds.map(id => id.toString());
        const filteredIds = buildingTenantIds.filter(id => accessibleStrIds.includes(id));
        targetKhachThueIds = filteredIds.map(id => new mongoose.Types.ObjectId(id));
      } else {
        // Admin
        targetKhachThueIds = buildingTenantIds.map(id => new mongoose.Types.ObjectId(id));
      }
    }

    if (targetKhachThueIds !== null) {
      matchQuery._id = { $in: targetKhachThueIds };
    }

    let chuNhaId = session.user.id;
    if (session.user.role === 'nhanVien') {
      const dbUser = await mongoose.model('NguoiDung').findById(session.user.id).select('nguoiQuanLy');
      if (dbUser && dbUser.nguoiQuanLy) {
        chuNhaId = dbUser.nguoiQuanLy.toString();
      }
    }

    // Get trangThai from searchParams again for pipeline filtering
    const trangThaiFilter = searchParams.get('trangThai');

    // === AGGREGATION PIPELINE (Refactored to handle account filtering before skip/limit) ===
    const pipeline: any[] = [
      { $match: matchQuery },
      // Lookup User Account (NguoiDung)
      {
        $lookup: {
          from: 'nguoidungs',
          let: { tenantId: '$_id', phone: '$soDienThoai', email: { $toLower: '$email' }, landlordId: new mongoose.Types.ObjectId(chuNhaId) },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$_id', '$$tenantId'] },
                    {
                      $and: [
                        { $eq: ['$nguoiQuanLy', '$$landlordId'] },
                        {
                          $or: [
                            { $eq: ['$soDienThoai', '$$phone'] },
                            { $and: [
                              { $ne: ['$$email', null] },
                              { $eq: [{ $toLower: '$email' }, '$$email'] }
                            ]}
                          ]
                        }
                      ]
                    }
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
      // Mark hasAccount
      {
        $addFields: {
          hasAccount: {
            $or: [
              { $gt: [{ $strLenCP: { $ifNull: ["$matKhau", ""] } }, 5] },
              { $eq: ['$userAccount.matKhau', 1] }
            ]
          }
        }
      },
      // FILTER BY ACCOUNT STATUS IF REQUESTED
      ...(trangThaiFilter === 'hasAccount' ? [{ $match: { hasAccount: true } }] : []),
      ...(trangThaiFilter === 'noAccount' ? [{ $match: { hasAccount: false } }] : []),
      
      { $sort: { hoTen: 1 } },
      
      // Pagination logic moved after filtering
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            // Lookup Contracts
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
                      pipeline: [{ $project: { _id: 1, maPhong: 1, toaNha: 1 } }],
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
                        cond: { $eq: ['$$h.trangThai', 'hoatDong'] }
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

    // Chạy cập nhật trạng thái trong background (không await)
    if (finalData.length > 0) {
      const idsToUpdate = finalData.map((f: any) => f._id.toString());
      // Giới hạn số lượng update background để không overload DB
      Promise.all(idsToUpdate.slice(0, 5).map((id: string) => updateKhachThueStatus(id))).catch(err => console.error('Background status update failed', err));
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

    let nguoiQuanLyId = session.user.id;
    const NguoiDung = mongoose.model('NguoiDung');
    
    if (session.user.role === 'nhanVien') {
      const nhanVien = await NguoiDung.findById(session.user.id).select('nguoiQuanLy');
      if (nhanVien && nhanVien.nguoiQuanLy) {
        nguoiQuanLyId = nhanVien.nguoiQuanLy.toString();
      }
    }

    // Start Transaction
    const dbSession = await mongoose.startSession();
    let newKhachThueData: any;

    try {
      await dbSession.withTransaction(async () => {
        // Check if phone or CCCD already exists for THIS landlord
        const existingKhachThue = await KhachThue.findOne({
          nguoiQuanLy: new mongoose.Types.ObjectId(nguoiQuanLyId),
          $or: [
            { soDienThoai: validatedData.soDienThoai },
            { cccd: validatedData.cccd }
          ]
        }).session(dbSession);

        if (existingKhachThue) {
          throw new Error('Số điện thoại hoặc CCCD đã được bạn sử dụng cho khách thuê khác trong hệ thống của mình.');
        }

        let linkUserId = undefined;

        // Nếu có truyền userId (Account vừa chọn)
        if (validatedData.userId) {
          const userObjId = new mongoose.Types.ObjectId(validatedData.userId);
          
          // Kiểm tra User này có tồn tại không và role có phải TENANT không
          const userTarget = await NguoiDung.findById(userObjId).session(dbSession);
          if (!userTarget) {
            throw new Error('Tài khoản được chọn không tồn tại.');
          }
          if (userTarget.role !== 'khachThue' && userTarget.vaiTro !== 'khachThue') {
            throw new Error('Tài khoản được chọn không phải là vai trò Khách thuê.');
          }

          // Kiểm tra xem User này đã bị liên kết với một KhachThue khác chưa
          const alreadyLinkedKhachThue = await KhachThue.findById(userObjId).session(dbSession);
          if (alreadyLinkedKhachThue) {
            throw new Error('Tài khoản này đã được liên kết với một hồ sơ khách thuê khác!');
          }

          linkUserId = userObjId;
          
          // Cập nhật lại thông tin của User cho khớp 100% với hồ sơ chuẩn
          await NguoiDung.findByIdAndUpdate(userObjId, {
            $set: {
              ten: validatedData.hoTen,
              name: validatedData.hoTen,
              soDienThoai: validatedData.soDienThoai,
              phone: validatedData.soDienThoai,
              email: validatedData.email || userTarget.email
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
          toaNhaBanDau: validatedData.toaNhaBanDau ? new mongoose.Types.ObjectId(validatedData.toaNhaBanDau) : undefined
        });

        await newKhachThueObj.save({ session: dbSession });
        newKhachThueData = newKhachThueObj;
      });
      await dbSession.endSession();
    } catch (e: any) {
      await dbSession.endSession();
      throw e;
    }

    // Background process outside transaction
    if (newKhachThueData) {
      updateKhachThueStatus(newKhachThueData._id.toString()).catch(e => console.error(e));
    }

    return NextResponse.json({
      success: true,
      data: newKhachThueData,
      message: validatedData.userId ? 'Đã tạo hồ sơ và liên kết tài khoản thành công. Khách thuê có thể dùng tài khoản cũ.' : 'Khách thuê đã được tạo thành công',
    }, { status: 201 });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Error creating khach thue:', error);
    
    // Nếu lỗi do throw new Error bên trong transaction
    if (error.message && !error.message.includes('Internal server error')) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
