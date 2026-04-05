import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import HopDong from '@/models/HopDong';
import HoaDon from '@/models/HoaDon';
import Phong from '@/models/Phong';
import ThongBao from '@/models/ThongBao';
import mongoose from 'mongoose';
import { getAccessibleToaNhaIds } from '@/lib/auth-utils';


export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Lấy toaNhaId và readings từ body
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body trống cũng OK
    }
    const toaNhaId = body.toaNhaId;
    const submittedReadings = body.readings || []; // Array of { contractId, chiSoDienCuoiKy, chiSoNuocCuoiKy }

    // Xây dựng query phòng theo tòa nhà
    const accessibleToaNhaIds = await getAccessibleToaNhaIds(session.user);
    let phongFilter: any = {};

    if (toaNhaId && toaNhaId !== 'all') {
      phongFilter.toaNha = new mongoose.Types.ObjectId(toaNhaId);
    } else if (accessibleToaNhaIds !== null) {
      phongFilter.toaNha = { $in: accessibleToaNhaIds };
    }

    // Lấy danh sách phòng thuộc tòa nhà
    const phongIds = Object.keys(phongFilter).length > 0
      ? (await Phong.find(phongFilter).select('_id')).map(p => p._id)
      : null;

    // Build contract query
    const submittedContractIds = submittedReadings.map((r: any) => r.contractId);

    const contractQuery: any = {
      trangThai: 'hoatDong',
      ngayBatDau: { $lte: currentDate },
      ngayKetThuc: { $gte: currentDate },
    };

    if (phongIds !== null) {
      contractQuery.phong = { $in: phongIds };
    }

    // Nếu có gửi readings lên (tức là tạo chọn lọc), chỉ xử lý những hợp đồng đó
    if (submittedContractIds.length > 0) {
      contractQuery._id = { $in: submittedContractIds };
    }

    // Get active contracts
    const activeContracts = await HopDong.find(contractQuery)
      .populate('phong')
      .populate('nguoiDaiDien');

    let createdInvoices = 0;
    let skippedExisting = 0;
    let errors: string[] = [];

    for (const contract of activeContracts) {
      try {
        const invoiceNumber = `HD${currentYear}${currentMonth.toString().padStart(2, '0')}${contract.phong.maPhong}`;

        // Check if invoice already exists (by contract OR by generated ID)
        const existingInvoice = await HoaDon.findOne({
          $or: [
            {
              hopDong: contract._id,
              thang: currentMonth,
              nam: currentYear,
              maHoaDon: { $not: /^COC-/i }
            },
            {
              maHoaDon: invoiceNumber
            }
          ]
        });

        if (existingInvoice) {
          skippedExisting++;
          continue;
        }

        // === ĐỒNG BỘ: Lấy chỉ số từ HoaDon chain ===
        let chiSoDienBanDau = 0;
        let chiSoNuocBanDau = 0;

        const lastHoaDon = await HoaDon.findOne({
          hopDong: contract._id,
          $or: [
            { nam: { $lt: currentYear } },
            { nam: currentYear, thang: { $lt: currentMonth } }
          ]
        }).sort({ nam: -1, thang: -1 });

        if (lastHoaDon) {
          chiSoDienBanDau = lastHoaDon.chiSoDienCuoiKy || 0;
          chiSoNuocBanDau = lastHoaDon.chiSoNuocCuoiKy || 0;
        } else {
          chiSoDienBanDau = contract.chiSoDienBanDau || 0;
          chiSoNuocBanDau = contract.chiSoNuocBanDau || 0;
        }

        // Lấy chỉ số cuối từ payload (nếu có)
        const readingInput = submittedReadings.find((r: any) => r.contractId === contract._id.toString());
        
        const chiSoDienCuoiKy = readingInput ? readingInput.chiSoDienCuoiKy : chiSoDienBanDau;
        const chiSoNuocCuoiKy = readingInput ? readingInput.chiSoNuocCuoiKy : chiSoNuocBanDau;

        // Tính số tiêu thụ
        const soDien = Math.max(0, chiSoDienCuoiKy - chiSoDienBanDau);
        const soNuoc = Math.max(0, chiSoNuocCuoiKy - chiSoNuocBanDau);

        // Tính tiền
        const tienDien = soDien * contract.giaDien;
        const tienNuoc = soNuoc * contract.giaNuoc;
        const tongTienDichVu = contract.phiDichVu.reduce((sum: number, dv: { gia: number }) => sum + dv.gia, 0);
        const tongTien = contract.giaThue + tienDien + tienNuoc + tongTienDichVu;

        // invoiceNumber already defined above for check

        const dueDate = new Date(currentYear, currentMonth - 1, contract.ngayThanhToan);
        if (dueDate < currentDate) {
          dueDate.setMonth(dueDate.getMonth() + 1);
        }

        const newInvoice = new HoaDon({
          maHoaDon: invoiceNumber,
          hopDong: contract._id,
          phong: contract.phong._id,
          khachThue: contract.nguoiDaiDien._id,
          thang: currentMonth,
          nam: currentYear,
          tienPhong: contract.giaThue,
          tienDien,
          soDien,
          chiSoDienBanDau,
          chiSoDienCuoiKy,
          tienNuoc,
          soNuoc,
          chiSoNuocBanDau,
          chiSoNuocCuoiKy,
          phiDichVu: contract.phiDichVu,
          tongTien,
          daThanhToan: 0,
          conLai: tongTien,
          hanThanhToan: dueDate,
          trangThai: 'chuaThanhToan',
          isAutoGenerated: true,
        });

        await newInvoice.save();
        createdInvoices++;

        try {
          const noiDungThongBao = `Chào bạn, hóa đơn thuê phòng tháng ${newInvoice.thang}/${newInvoice.nam} đã được hệ thống tạo tự động với tổng tiền ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(newInvoice.tongTien)}. Hạn thanh toán: ${new Date(newInvoice.hanThanhToan).toLocaleDateString('vi-VN')}.`;
          
          await new ThongBao({
            tieuDe: 'Thông báo hóa đơn mới (Batch)',
            noiDung: noiDungThongBao,
            loai: 'hoaDon',
            nguoiGui: session.user.id,
            nguoiNhan: [newInvoice.khachThue],
            ngayGui: new Date()
          }).save();
        } catch (notifErr) {
          console.error('Lỗi tạo thông báo batch:', notifErr);
        }

      } catch (error) {
        console.error(`Error creating invoice for contract ${contract.maHopDong}:`, error);
        errors.push(`Lỗi tạo hóa đơn cho hợp đồng ${contract.maHopDong}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        createdInvoices,
        totalContracts: activeContracts.length,
        skippedExisting,
        errors,
      },
      message: `Đã tạo ${createdInvoices} hóa đơn tự động`,
    });

  } catch (error) {
    console.error('Error in auto invoice generation:', error);
    return NextResponse.json(
      { message: 'Lỗi khi tạo hóa đơn tự động' },
      { status: 500 }
    );
  }
}

// GET endpoint to check auto-invoice status and return pending rooms
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

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const { searchParams } = new URL(request.url);
    const toaNhaId = searchParams.get('toaNhaId');

    const accessibleToaNhaIds = await getAccessibleToaNhaIds(session.user);
    let phongFilter: any = {};

    if (toaNhaId && toaNhaId !== 'all') {
      phongFilter.toaNha = new mongoose.Types.ObjectId(toaNhaId);
    } else if (accessibleToaNhaIds !== null) {
      phongFilter.toaNha = { $in: accessibleToaNhaIds };
    }

    const simplePhongs = await Phong.find(phongFilter).select('_id toaNha');
    const phongIds = simplePhongs.map(p => p._id);

    // Build contract query
    const contractQuery: any = {
      trangThai: 'hoatDong',
      ngayBatDau: { $lte: currentDate },
      ngayKetThuc: { $gte: currentDate },
    };
    if (phongIds.length > 0) {
      contractQuery.phong = { $in: phongIds };
    } else if (phongFilter.toaNha) {
       // Filtering by building but no rooms found
       return NextResponse.json({
        success: true,
        data: {
          currentMonth, currentYear,
          activeContractsCount: 0,
          existingInvoicesCount: 0,
          contractsWithoutReadingsCount: 0,
          pendingContracts: [],
          canRun: false,
        },
      });
    }

    const activeContractsCount = await HopDong.countDocuments(contractQuery);

    const invoiceQuery: any = {
      thang: currentMonth,
      nam: currentYear,
      phong: { $in: phongIds },
      maHoaDon: { $not: /^COC-/i } // Bỏ qua hóa đơn cọc
    };
    const existingInvoicesCount = await HoaDon.countDocuments(invoiceQuery);

    const contractsWithInvoices = await HoaDon.distinct('hopDong', invoiceQuery);
    
    const contractsWithoutInvoiceQuery: any = {
      ...contractQuery,
      _id: { $nin: contractsWithInvoices },
    };

    // Get detailed pending contracts
    const pendingContractsList = await HopDong.find(contractsWithoutInvoiceQuery)
      .populate('phong', 'maPhong toaNha')
      .populate('nguoiDaiDien', 'hoTen');

    const pendingContractsResult = [];
    for (const contract of pendingContractsList) {
      // Calculate start readings
      let chiSoDienBanDau = 0;
      let chiSoNuocBanDau = 0;

      const lastHoaDon = await HoaDon.findOne({
        hopDong: contract._id,
        $or: [
          { nam: { $lt: currentYear } },
          { nam: currentYear, thang: { $lt: currentMonth } }
        ]
      }).sort({ nam: -1, thang: -1 });

      if (lastHoaDon) {
        chiSoDienBanDau = lastHoaDon.chiSoDienCuoiKy || 0;
        chiSoNuocBanDau = lastHoaDon.chiSoNuocCuoiKy || 0;
      } else {
        // Nếu không có hóa đơn tháng trước, mặc định bằng 0 theo yêu cầu người dùng
        chiSoDienBanDau = 0;
        chiSoNuocBanDau = 0;
      }

      pendingContractsResult.push({
        _id: contract._id,
        phong: contract.phong,
        khachThue: contract.nguoiDaiDien ? {
          _id: (contract.nguoiDaiDien as any)._id.toString(),
          ten: (contract.nguoiDaiDien as any).hoTen
        } : null,
        chiSoDienCu: chiSoDienBanDau,
        chiSoNuocCu: chiSoNuocBanDau,
        giaDien: contract.giaDien,
        giaNuoc: contract.giaNuoc,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        currentMonth,
        currentYear,
        activeContractsCount,
        existingInvoicesCount,
        contractsWithoutReadingsCount: pendingContractsResult.length,
        pendingContracts: pendingContractsResult,
        canRun: activeContractsCount > 0 && pendingContractsResult.length > 0,
      },
    });

  } catch (error) {
    console.error('Error checking auto-invoice status:', error);
    return NextResponse.json(
      { message: 'Lỗi khi kiểm tra trạng thái tạo hóa đơn tự động' },
      { status: 500 }
    );
  }
}
