import mongoose from 'mongoose';

/**
 * Lß║Ñy ra m├ú VietQR URL tß╗½ th├┤ng tin thanh to├ín cß╗ºa chß╗º nh├á
 */
export async function getVietQrUrl(conLai: number, maHoaDon: string, thongTinThanhToan: any) {
  if (!thongTinThanhToan || !thongTinThanhToan.soTaiKhoan || !thongTinThanhToan.nganHang) {
    console.log(`[VietQR] Bß╗Å qua v├¼ thiß║┐u STK hoß║╖c Ng├ón h├áng.`);
    return '';
  }

  let bin = thongTinThanhToan.nganHang;
  const acc = thongTinThanhToan.soTaiKhoan;

  // Nß║┐u bin ch╞░a ─æ├║ng ─æß╗ïnh dß║íng sß╗æ (c├│ thß╗â l├á t├¬n ng├ón h├áng VD: "Vietcombank")
  // Ch├║ng ta sß║╜ cß╗æ gß║»ng map sang m├ú BIN
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
         console.error('[VietQR] Lß╗ùi khi lß║Ñy danh s├ích ng├ón h├áng:', err);
     }
  }

  if (!/^\d{6,10}$/.test(bin)) {
     console.warn(`[VietQR] M├ú ng├ón h├áng "${bin}" vß║½n kh├┤ng hß╗úp lß╗ç sau khi map.`);
     return '';
  }

  const name = encodeURIComponent(thongTinThanhToan.chuTaiKhoan || '');
  const desc = encodeURIComponent(`Thanh toan ${maHoaDon}`);
  
  const qrUrl = `https://img.vietqr.io/image/${bin}-${acc}-compact.png?amount=${conLai}&addInfo=${desc}&accountName=${name}`;
  
  console.log(`[VietQR Success] ─É├ú tß║ío QR cho ${maHoaDon}: ${qrUrl}`);
  return qrUrl;
}

/**
 * T├¼m chß╗º nh├á (NguoiDung) tß╗½ th├┤ng tin h├│a ─æ╞ín bß║▒ng c├ích ─æiß╗üu h╞░ß╗¢ng qua ToaNha
 */
export async function getOwnerByHoaDon(hoaDon: any) {
  try {
    const NguoiDung = mongoose.models.NguoiDung || mongoose.model('NguoiDung');
    const Phong = mongoose.models.Phong || mongoose.model('Phong');
    const ToaNha = mongoose.models.ToaNha || mongoose.model('ToaNha');

    // 1. Nß║┐u hoaDon.phong l├á ObjectId, cß║ºn lookup
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
