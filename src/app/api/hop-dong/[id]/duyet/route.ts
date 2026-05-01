import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import HopDong from '@/models/HopDong';
import KhachThue from '@/models/KhachThue';
import ThongBao from '@/models/ThongBao';
import { updatePhongStatus, updateAllKhachThueStatus } from '@/lib/status-utils';
import mongoose from 'mongoose';
import { sendGeneralNotificationEmail, sendDebtNotificationEmail, isValidEmail } from '@/lib/mail';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body; // 'duyet' | 'tuChoi'

    if (!['duyet', 'tuChoi'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Action phải là "duyet" hoặc "tuChoi"' },
        { status: 400 }
      );
    }

    await dbConnect();
    const { id } = await params;

    const hopDong = await HopDong.findById(id)
      .populate({
        path: 'phong',
        select: 'maPhong toaNha',
        populate: {
          path: 'toaNha',
          select: 'tenToaNha chuSoHuu'
        }
      });

    if (!hopDong) {
      return NextResponse.json(
        { success: false, message: 'Hợp đồng không tồn tại' },
        { status: 404 }
      );
    }

    // Kiểm tra hợp đồng đang ở trạng thái chờ duyệt hoặc chờ duyệt gia hạn hoặc chờ duyệt hủy
    if (!['choDuyet', 'choDuyetGiaHan', 'choDuyetHuy'].includes(hopDong.trangThai)) {
      return NextResponse.json(
        { success: false, message: 'Hợp đồng không ở trạng thái cần phê duyệt' },
        { status: 400 }
      );
    }

    // Kiểm tra người duyệt phải là NGƯỜI ĐẠI DIỆN (không phải bất kỳ khách thuê nào)
    // Xây dựng danh sách linkedIds giống /me route để xử lý trường hợp
    // ID đăng nhập từ NguoiDung khác với ID KhachThue trong hợp đồng
    const userId = session.user.id;
    const linkedIds: string[] = [userId];

    // Tìm KhachThue record liên kết với user đang đăng nhập
    let khachThueRecord: any = await KhachThue.findById(userId);
    if (!khachThueRecord && (session.user as any).phone) {
      khachThueRecord = await KhachThue.findOne({ soDienThoai: (session.user as any).phone });
    }
    if (!khachThueRecord && session.user.email) {
      khachThueRecord = await KhachThue.findOne({ email: session.user.email });
    }
    if (khachThueRecord && khachThueRecord._id.toString() !== userId) {
      linkedIds.push(khachThueRecord._id.toString());
    }

    // Chỉ cho phép NGƯỜI ĐẠI DIỆN duyệt (không phải tất cả khách thuê)
    const nguoiDaiDienId = hopDong.nguoiDaiDien?.toString();
    const isNguoiDaiDien = nguoiDaiDienId && linkedIds.includes(nguoiDaiDienId);

    // Cho phép cả người đại diện và chủ nhà thao tác
    const isOwner = session.user.role === 'chuNha' || session.user.role === 'admin';

    if (!isNguoiDaiDien && !isOwner) {
      return NextResponse.json(
        { success: false, message: 'Chỉ người đại diện hợp đồng mới có quyền phê duyệt' },
        { status: 403 }
      );
    }

    const phongInfo = hopDong.phong as any;
    const tenPhong = phongInfo?.maPhong || 'N/A';
    
    // Lấy chủ nhà từ tòa nhà
    const chuNhaId = phongInfo?.toaNha?.chuSoHuu;

    if (action === 'duyet') {
      const isGiaHan = hopDong.trangThai === 'choDuyetGiaHan';
      const isHuy = hopDong.trangThai === 'choDuyetHuy';

      if (isHuy) {
        // Duyệt hủy hợp đồng
        hopDong.trangThai = 'daHuy';
        await hopDong.save();
        
        // Giải phóng phòng và cập nhật user status
        await updatePhongStatus(hopDong.phong._id || hopDong.phong);
        const khachThueIds = hopDong.khachThueId.map((id: any) => id.toString());
        await updateAllKhachThueStatus(khachThueIds);

        // Xử lý Hoàn tiền cọc (Tạo hóa đơn hoàn tiền)
        if (hopDong.hoanCoc && Number(hopDong.tienCoc) > 0) {
          try {
            const HoaDon = (await import('@/models/HoaDon')).default;
            const targetKhachThue = hopDong.nguoiDaiDien || hopDong.khachThueId[0];
            if (targetKhachThue) {
              console.log('>>> CREATING REFUND INVOICE FOR:', targetKhachThue);
              const now = new Date();
              const maHoaDonHC = `HC-${hopDong.maHopDong}-${now.getTime().toString().slice(-4)}`;
              
              await HoaDon.create({
                maHoaDon: maHoaDonHC,
                hopDong: hopDong._id,
                phong: hopDong.phong._id || hopDong.phong,
                khachThue: targetKhachThue,
                thang: now.getMonth() + 1,
                nam: now.getFullYear(),
                tienPhong: 0,
                tienDien: 0,
                soDien: 0,
                chiSoDienBanDau: 0,
                chiSoDienCuoiKy: 0,
                tienNuoc: 0,
                soNuoc: 0,
                chiSoNuocBanDau: 0,
                chiSoNuocCuoiKy: 0,
                phiDichVu: [],
                tongTien: hopDong.tienCoc,
                daThanhToan: 0,
                conLai: hopDong.tienCoc,
                loai: 'chi', // Loại hoàn trả
                trangThai: 'chuaThanhToan',
                hanThanhToan: hopDong.refundDueDate ? new Date(hopDong.refundDueDate) : now,
                ghiChu: `Hoàn trả tiền cọc do hủy hợp đồng ${hopDong.maHopDong}.`,
                isAutoGenerated: true
              });

              // Gửi thông báo hệ thống về hóa đơn hoàn tiền cọc (HĐHC)
              const nguoiNhanIds = khachThueIds.map((ktId: any) => new mongoose.Types.ObjectId(ktId));
              if (nguoiNhanIds && nguoiNhanIds.length > 0) {
                 await ThongBao.create({
                  tieuDe: '💰 Thông báo hoàn trả tiền cọc',
                  noiDung: `Hợp đồng ${hopDong.maHopDong} đã được duyệt hủy. Hóa đơn hoàn tiền cọc ${maHoaDonHC} trị giá ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(hopDong.tienCoc)} đã được tạo. Vui lòng kiểm tra mục Hóa đơn để biết chi tiết.`,
                  loai: 'hoaDon',
                  nguoiGui: new mongoose.Types.ObjectId(chuNhaId || userId),
                  nguoiNhan: nguoiNhanIds,
                  phong: [hopDong.phong._id || hopDong.phong],
                  ngayGui: new Date()
                });
              }
            }
          } catch (refundError) {
             console.error('Error creating refund invoice upon cancellation review:', refundError);
          }
        }
      } else {
        // Nếu là duyệt gia hạn, cập nhật ngày kết thúc chính thức từ ngày dự kiến
        if (isGiaHan && hopDong.ngayKetThucGiaHan) {
          hopDong.ngayKetThuc = hopDong.ngayKetThucGiaHan;
          hopDong.ngayKetThucGiaHan = undefined;
        }

        // Duyệt hợp đồng (hoặc gia hạn)
        hopDong.trangThai = 'hoatDong';
        await hopDong.save();

        // Cập nhật trạng thái phòng và khách thuê
        await updatePhongStatus(hopDong.phong._id || hopDong.phong);
        const khachThueIds = hopDong.khachThueId.map((id: any) => id.toString());
        await updateAllKhachThueStatus(khachThueIds);
      }

      // Import HoaDon if not already
      const HoaDon = (await import('@/models/HoaDon')).default;

      // Sinh hóa đơn tiền cọc tự động (Chỉ cho hợp đồng mới, KHÔNG cho gia hạn/hủy)
      let checkoutUrl = '';
      if (!isGiaHan && !isHuy && chuNhaId && hopDong.tienCoc > 0) {
        const dbUser = await mongoose.model('NguoiDung').findById(chuNhaId).select('thongTinThanhToan');
        if (dbUser && dbUser.thongTinThanhToan && dbUser.thongTinThanhToan.soTaiKhoan) {
          const { nganHang, soTaiKhoan, chuTaiKhoan } = dbUser.thongTinThanhToan;
          // Fix URL spaces and ensure clean query params
          const bankId = encodeURIComponent(nganHang.trim().replace(/\s+/g, ''));
          const accNo = encodeURIComponent(soTaiKhoan.trim());
          const addInfo = encodeURIComponent(`Thu tien coc HD ${hopDong.maHopDong}`);
          let accName = '';
          if (chuTaiKhoan) accName = `&accountName=${encodeURIComponent(chuTaiKhoan.trim())}`;
          
          checkoutUrl = `https://img.vietqr.io/image/${bankId}-${accNo}-compact2.png?amount=${hopDong.tienCoc}&addInfo=${addInfo}${accName}`;
        }

        const now = new Date();
        const hoaDonCoc = await HoaDon.create({
          maHoaDon: 'COC-' + hopDong.maHopDong,
          hopDong: hopDong._id,
          phong: hopDong.phong._id || hopDong.phong,
          khachThue: hopDong.nguoiDaiDien,
          thang: now.getMonth() + 1,
          nam: now.getFullYear(),
          tienPhong: 0,
          tienDien: 0,
          soDien: 0,
          chiSoDienBanDau: hopDong.chiSoDienBanDau,
          chiSoDienCuoiKy: hopDong.chiSoDienBanDau,
          tienNuoc: 0,
          soNuoc: 0,
          chiSoNuocBanDau: hopDong.chiSoNuocBanDau,
          chiSoNuocCuoiKy: hopDong.chiSoNuocBanDau,
          phiDichVu: [],
          tongTien: hopDong.tienCoc,
          daThanhToan: 0,
          conLai: hopDong.tienCoc,
          trangThai: 'chuaThanhToan',
          hanThanhToan: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days to pay deposit
          ghiChu: `Hóa đơn thu tiền ĐẶT CỌC ban đầu cho hợp đồng ${hopDong.maHopDong}`,
          checkoutUrl: checkoutUrl
        });

        // Gửi thông báo có Hóa đơn Cọc
        try {
          await ThongBao.create({
            tieuDe: `[Quan Trọng] Đóng phí Đặt cọc Hợp đồng - Phòng ${tenPhong}`,
            noiDung: `Hệ thống vừa phát hành Hóa đơn tiền cọc trị giá ${hopDong.tienCoc.toLocaleString('vi-VN')}đ. Vui lòng quét mã VietQR và thực hiện thanh toán.`,
            loai: 'hoaDon',
            nguoiGui: new mongoose.Types.ObjectId(chuNhaId.toString()), // Chủ nhà gửi
            nguoiNhan: [new mongoose.Types.ObjectId(userId)], // Gửi về cho bạn người duyệt
            phong: [hopDong.phong._id || hopDong.phong],
            ngayGui: new Date(),
          });
        } catch(e) {}
      }

      // Gửi thông báo cho chủ nhà (Hợp đồng đã duyệt)
      if (chuNhaId) {
        try {
          await ThongBao.create({
            tieuDe: isHuy ? `Hợp đồng đã hoàn tất hủy - Phòng ${tenPhong}` : `Hợp đồng đã được duyệt - Phòng ${tenPhong}`,
            noiDung: isHuy 
              ? `Khách thuê đã đồng ý hủy hợp đồng thuê phòng ${tenPhong} (Mã: ${hopDong.maHopDong}). Hợp đồng đã chính thức hủy.` 
              : `Khách thuê đã đồng ý và duyệt hợp đồng thuê phòng ${tenPhong} (Mã: ${hopDong.maHopDong}). ${hopDong.tienCoc > 0 ? 'Hóa đơn tiền Đặt cọc đã được phát hành tự động tới khách.' : ''}`,
            loai: 'hopDong',
            nguoiGui: new mongoose.Types.ObjectId(userId),
            nguoiNhan: [chuNhaId],
            phong: [hopDong.phong._id || hopDong.phong],
            ngayGui: new Date(),
          });

          // Gửi email cho chủ nhà báo đã được duyệt (không kèm QR)
          try {
            const NguoiDungModel = mongoose.models.NguoiDung || mongoose.model('NguoiDung');
            const chuNhaDoc = await NguoiDungModel.findById(chuNhaId).select('email ten name').lean() as any;
            if (chuNhaDoc?.email && isValidEmail(chuNhaDoc.email)) {
              await sendGeneralNotificationEmail({
                email: chuNhaDoc.email,
                khachThueName: chuNhaDoc.ten || chuNhaDoc.name || 'Chủ trọ',
                tieuDe: isHuy ? `Hợp đồng đã hoàn tất hủy - Phòng ${tenPhong}` : `Hợp đồng đã được ký duyệt - Phòng ${tenPhong}`,
                noiDung: isHuy ? `Khách thuê đã đồng ý hủy hợp đồng thuê phòng ${tenPhong} (Mã: ${hopDong.maHopDong}). Hợp đồng đã chính thức hủy.` : `Khách thuê đã đồng ý và ký duyệt hợp đồng thuê phòng ${tenPhong} (Mã: ${hopDong.maHopDong}).\n\n${hopDong.tienCoc > 0 ? 'Hóa đơn tiền đặt cọc đã được gửi tự động tới khách thuê.' : 'Hợp đồng đã có hiệu lực.'}`,
                ccEmail: '', // Không CC khi gửi cho chủ nhà
              });
            }
          } catch (emailErr) {
            console.error('[Email] Lỗi gửi email cho chủ nhà khi duyệt hợp đồng:', emailErr);
          }
        } catch (e) {
          console.error('Error sending approval notification:', e);
        }
      }

      // Nếu có hoá đơn cọc: gửi email cho khách thuê (người duyệt) kèm QR (Chỉ cho HD mới)
      if (!isGiaHan && !isHuy && hopDong.tienCoc > 0) {
        try {
          let ktEmail = '';
          let ktName = 'Khách thuê';
          const ktDoc = await KhachThue.findById(userId).select('email hoTen').lean() as any;
          if (ktDoc) {
            ktEmail = ktDoc.email || '';
            ktName = ktDoc.hoTen || 'Khách thuê';
          } else {
            const NguoiDungModel = mongoose.models.NguoiDung || mongoose.model('NguoiDung');
            const ndDoc = await NguoiDungModel.findById(userId).select('email ten name').lean() as any;
            if (ndDoc) {
              ktEmail = ndDoc.email || '';
              ktName = ndDoc.ten || ndDoc.name || 'Khách thuê';
            }
          }
          if (ktEmail && isValidEmail(ktEmail)) {
            const now = new Date();
            const hoaDonCocData = {
              maHoaDon: `COC-${hopDong.maHopDong}`,
              thang: now.getMonth() + 1,
              nam: now.getFullYear(),
              tienPhong: 0,
              tienDien: 0,
              tienNuoc: 0,
              phiDichVu: [],
              tongTien: hopDong.tienCoc,
              daThanhToan: 0,
              conLai: hopDong.tienCoc,
              hanThanhToan: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
              chiSoDienCuoiKy: 0,
              chiSoNuocCuoiKy: 0,
            };
            await sendDebtNotificationEmail({
              email: ktEmail,
              khachThueName: ktName,
              hoaDonData: hoaDonCocData,
              qrUrl: checkoutUrl || '',
            });
          }
        } catch (emailErr) {
          console.error('[Email] Lỗi gửi email hoá đơn cọc cho khách thuê:', emailErr);
        }
      }

      return NextResponse.json({
        success: true,
        message: isHuy ? 'Hợp đồng đã được hủy theo yêu cầu' : 'Hợp đồng đã được duyệt và có hiệu lực',
        data: { trangThai: isHuy ? 'daHuy' : 'hoatDong' }
      });

    } else {
      // Từ chối hợp đồng
      const isGiaHan = hopDong.trangThai === 'choDuyetGiaHan';
      const isHuy = hopDong.trangThai === 'choDuyetHuy';

      if (isGiaHan) {
        // Nếu từ chối gia hạn, quay lại trạng thái hoạt động (hoặc hết hạn nếu đã qua ngày kết thúc)
        const now = new Date();
        const expirationDate = new Date(hopDong.ngayKetThuc);
        
        hopDong.trangThai = now > expirationDate ? 'hetHan' : 'hoatDong';
        hopDong.ngayKetThucGiaHan = undefined; // Xóa ngày dự kiến gia hạn
        await hopDong.save();
      } else if (isHuy) {
        // Từ chối hủy hợp đồng, nó quay lại trạng thái trước đó (chẳng hạn hoatDong)
        const now = new Date();
        const expirationDate = new Date(hopDong.ngayKetThuc);
        
        hopDong.trangThai = now > expirationDate ? 'hetHan' : 'hoatDong';
        await hopDong.save();
      } else {
        // Từ chối duyệt hợp đồng mới -> Hủy hoàn toàn
        hopDong.trangThai = 'daHuy';
        await hopDong.save();

        // Giải phóng phòng
        await updatePhongStatus(hopDong.phong._id || hopDong.phong);
      }

      // Gửi thông báo cho chủ nhà
      if (chuNhaId) {
        try {
          await ThongBao.create({
            tieuDe: isHuy ? `Từ chối yêu cầu hủy hợp đồng - Phòng ${tenPhong}` : isGiaHan ? `Yêu cầu gia hạn bị từ chối - Phòng ${tenPhong}` : `Hợp đồng bị từ chối - Phòng ${tenPhong}`,
            noiDung: isHuy 
              ? `Khách thuê đã không đồng ý hủy hợp đồng phòng ${tenPhong} (Mã: ${hopDong.maHopDong}). Hợp đồng sẽ tiếp tục có hiệu lực.` : isGiaHan 
              ? `Khách thuê đã từ chối yêu cầu gia hạn hợp đồng phòng ${tenPhong} (Mã: ${hopDong.maHopDong}). Hợp đồng sẽ giữ nguyên thời hạn cũ.`
              : `Khách thuê đã từ chối hợp đồng thuê phòng ${tenPhong} (Mã: ${hopDong.maHopDong}).`,
            loai: 'hopDong',
            nguoiGui: new mongoose.Types.ObjectId(userId),
            nguoiNhan: [chuNhaId],
            phong: [hopDong.phong._id || hopDong.phong],
            ngayGui: new Date(),
          });

          // Gửi email cho chủ nhà báo khách từ chối (không kèm QR)
          try {
            const NguoiDungModel = mongoose.models.NguoiDung || mongoose.model('NguoiDung');
            const chuNhaDoc = await NguoiDungModel.findById(chuNhaId).select('email ten name').lean() as any;
            if (chuNhaDoc?.email && isValidEmail(chuNhaDoc.email)) {
              await sendGeneralNotificationEmail({
                email: chuNhaDoc.email,
                khachThueName: chuNhaDoc.ten || chuNhaDoc.name || 'Chủ trọ',
                tieuDe: isGiaHan ? `Khách từ chối gia hạn - Phòng ${tenPhong}` : `Khách thuê từ chối hợp đồng - Phòng ${tenPhong}`,
                noiDung: isGiaHan
                  ? `Khách thuê đã từ chối yêu cầu gia hạn hợp đồng thuê phòng ${tenPhong} (Mã: ${hopDong.maHopDong}).\n\nHợp đồng của khách hiện vẫn được giữ nguyên trạng thái và thời hạn cũ.`
                  : `Khách thuê đã từ chối ký duyệt hợp đồng thuê phòng ${tenPhong} (Mã: ${hopDong.maHopDong}).\n\nVui lòng liên hệ với khách thuê để biết thêm chi tiết hoặc xem xét ký lại hợp đồng.`,
                ccEmail: '', // Không CC khi gửi cho chủ nhà
              });
            }
          } catch (emailErr) {
            console.error('[Email] Lỗi gửi email cho chủ nhà khi từ chối hợp đồng:', emailErr);
          }
        } catch (e) {
          console.error('Error sending rejection notification:', e);
        }
      }

      return NextResponse.json({
        success: true,
        message: isGiaHan ? 'Yêu cầu gia hạn đã bị từ chối' : 'Hợp đồng đã bị từ chối',
        data: { trangThai: hopDong.trangThai }
      });
    }

  } catch (error) {
    console.error('Error processing contract approval:', error);
    return NextResponse.json(
      { success: false, message: 'Có lỗi xảy ra' },
      { status: 500 }
    );
  }
}
