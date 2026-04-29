import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import HoaDon from '@/models/HoaDon';

// POST - Fix incorrect invoice statuses (one-time migration)
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    // Tìm tất cả hóa đơn có trạng thái sai:
    const wrongInvoices = await HoaDon.find({
      $or: [
        // Đánh "đã thanh toán" nhưng thực tế chưa trả đủ
        { trangThai: 'daThanhToan', conLai: { $gt: 0 } },
        // Đánh "đã thanh toán" nhưng tongTien = 0 (bug cũ)
        { trangThai: 'daThanhToan', tongTien: 0, daThanhToan: 0 },
      ]
    });

    let fixedCount = 0;
    const fixedDetails: any[] = [];

    for (const hoaDon of wrongInvoices) {
      const oldStatus = hoaDon.trangThai;
      // Re-save sẽ trigger pre-save middleware đã sửa
      await hoaDon.save();
      
      if (hoaDon.trangThai !== oldStatus) {
        fixedCount++;
        fixedDetails.push({
          maHoaDon: hoaDon.maHoaDon,
          tongTien: hoaDon.tongTien,
          daThanhToan: hoaDon.daThanhToan,
          conLai: hoaDon.conLai,
          oldStatus,
          newStatus: hoaDon.trangThai,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã kiểm tra ${wrongInvoices.length} hóa đơn, sửa ${fixedCount} hóa đơn sai trạng thái.`,
      data: {
        checked: wrongInvoices.length,
        fixed: fixedCount,
        details: fixedDetails,
      }
    });
  } catch (error) {
    console.error('Error fixing invoice statuses:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: String(error) },
      { status: 500 }
    );
  }
}
