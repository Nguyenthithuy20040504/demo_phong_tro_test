import mongoose from 'mongoose';

/**
 * Lấy ra mã VietQR URL từ thông tin thanh toán của chủ nhà
 */
export async function getVietQrUrl(conLai: number, maHoaDon: string, thongTinThanhToan: any) {
  if (!thongTinThanhToan || !thongTinThanhToan.soTaiKhoan || !thongTinThanhToan.nganHang) {
    console.log(`[VietQR] Bỏ qua vì thiếu STK hoặc Ngân hàng.`);
    return '';
  }

  let bin = thongTinThanhToan.nganHang;
  const acc = thongTinThanhToan.soTaiKhoan;

  // Nếu bin chưa đúng định dạng số (có thể là tên ngân hàng VD: "Vietcombank")
  // Chúng ta sẽ cố gắng map sang mã BIN
  if (!/^\d{6,10}$/.test(bin)) {
     try {
         const bankRes = await fetch('https://api.vietqr.io/v2/banks');
         const bankData = await bankRes.json();
         if (bankData.code === '00') {
             const banks = bankData.data;
             const foundBank = banks.find((b: any) => 
                b.shortName?.toLowerCase() === bin.toLowerCase() || 
                b.name?.toLowerCase() === bin.toLowerCase() ||
                b.code?.toLowerCase() === bin.toLowerCase()
             );
             if (foundBank) {
                 console.log(`[VietQR] Mapped "${bin}" to BIN "${foundBank.bin}"`);
                 bin = foundBank.bin;
             }
         }
     } catch (err) {
         console.error('[VietQR] Lỗi khi lấy danh sách ngân hàng:', err);
     }
  }

  if (!/^\d{6,10}$/.test(bin)) {
     console.warn(`[VietQR] Mã ngân hàng "${bin}" vẫn không hợp lệ sau khi map.`);
     return '';
  }

  const name = encodeURIComponent(thongTinThanhToan.chuTaiKhoan || '');
  const desc = encodeURIComponent(`Thanh toan ${maHoaDon}`);
  
  const qrUrl = `https://img.vietqr.io/image/${bin}-${acc}-compact.png?amount=${conLai}&addInfo=${desc}&accountName=${name}`;
  
  console.log(`[VietQR Success] Đã tạo QR cho ${maHoaDon}: ${qrUrl}`);
  return qrUrl;
}

/**
 * Tìm chủ nhà (NguoiDung) từ thông tin hóa đơn bằng cách điều hướng qua ToaNha
 */
export async function getOwnerByHoaDon(hoaDon: any) {
  try {
    const NguoiDung = mongoose.models.NguoiDung || mongoose.model('NguoiDung');
    const Phong = mongoose.models.Phong || mongoose.model('Phong');
    const ToaNha = mongoose.models.ToaNha || mongoose.model('ToaNha');

    // 1. Nếu hoaDon.phong là ObjectId, cần lookup
    let phongObj = hoaDon.phong;
    if (mongoose.Types.ObjectId.isValid(phongObj) || typeof phongObj === 'string') {
        phongObj = await Phong.findById(phongObj).lean();
    }

    if (!phongObj || !phongObj.toaNha) return null;

    // 2. Lookup ToaNha
    let toaNhaObj = phongObj.toaNha;
    if (mongoose.Types.ObjectId.isValid(toaNhaObj) || typeof toaNhaObj === 'string') {
        toaNhaObj = await ToaNha.findById(toaNhaObj).lean();
    }

    if (!toaNhaObj || !toaNhaObj.chuSoHuu) return null;

    // 3. Lookup Owner
    return await NguoiDung.findById(toaNhaObj.chuSoHuu).lean();
  } catch (error) {
    console.error('[payment-utils] Error getting owner:', error);
    return null;
  }
}
