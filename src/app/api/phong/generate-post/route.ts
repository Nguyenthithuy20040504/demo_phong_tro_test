import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Phong from '@/models/Phong';
import ToaNha from '@/models/ToaNha';
import '@/models/NguoiDung'; // Ensure User model is registered for populate
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import NguoiDung from '@/models/NguoiDung';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const user = await NguoiDung.findOne({ email: session.user.email }).populate('goiDichVuId');
    if (user?.goiDichVuId) {
      const plan = user.goiDichVuId as any;
      if (plan.hasPostingFeature === false) {
        return NextResponse.json({ message: 'Gói dịch vụ của bạn không hỗ trợ tính năng đăng bài.' }, { status: 403 });
      }
    }

    const { phongId } = await request.json();

    if (!phongId) {
      return NextResponse.json({ message: 'Thiếu ID phòng' }, { status: 400 });
    }

    // 1. Fetch room details including building and owner info
    const phong = await Phong.findById(phongId).populate({
      path: 'toaNha',
      select: 'tenToaNha diaChi chuSoHuu',
      populate: {
        path: 'chuSoHuu',
        select: 'soDienThoai hoTen'
      }
    });

    if (!phong) {
      return NextResponse.json({ message: 'Không tìm thấy phòng' }, { status: 404 });
    }

    const toaNha = phong.toaNha as any;
    const chuSoHuu = toaNha?.chuSoHuu as any;
    const diaChiToaNha = toaNha?.diaChi
      ? [toaNha.diaChi.soNha, toaNha.diaChi.duong, toaNha.diaChi.phuong, toaNha.diaChi.quan, toaNha.diaChi.thanhPho]
        .filter(Boolean)
        .join(', ')
      : 'Không xác định';

    const roomInfo = {
      maPhong: phong.maPhong,
      toaNha: toaNha?.tenToaNha || 'Không xác định',
      diaChi: diaChiToaNha,
      giaThue: phong.giaThue,
      tienCoc: phong.tienCoc,
      dienTich: phong.dienTich,
      tienNghi: phong.tienNghi?.length > 0 ? phong.tienNghi.join(', ') : 'Cơ bản',
      soNguoiToiDa: phong.soNguoiToiDa,
      lienHe: chuSoHuu?.soDienThoai ? `${chuSoHuu.soDienThoai} (${chuSoHuu.hoTen || 'Chủ nhà'})` : 'Vui lòng inbox để biết số điện thoại',
      moTaChiTiet: phong.moTa || 'Phòng đẹp, sạch sẽ, thoáng mát'
    };

    // 2. Prepare System Prompt
    const systemPrompt = `
Bạn là một chuyên gia Content Marketing và Môi giới Bất động sản chuyên nghiệp, năng động và sáng tạo.
Nhiệm vụ của bạn là viết một bài đăng (post) rao vặt cho thuê phòng trọ thật hấp dẫn, chi tiết và đầy đủ thông tin để thu hút người xem trên Facebook, Zalo.

Thông tin chi tiết của phòng trọ:
${JSON.stringify(roomInfo, null, 2)}

YÊU CẦU VỀ CẤU TRÚC BÀI VIẾT (BẮT BUỘC ĐỦ 5 PHẦN):
1. TIÊU ĐỀ: Viết IN HOA, giật tít thu hút. Sử dụng icon bắt mắt (💥, 🏠, 🔥...).
2. MÔ TẢ KHÔNG GIAN & MÔI TRƯỜNG: 
   - Dựa vào địa chỉ "${roomInfo.diaChi}", hãy viết 2-3 câu văn tích cực về khu vực này (Vd: khu dân trí cao, an ninh, gần các tiện ích, giao thông thuận tiện...).
   - Nếu phần "moTaChiTiet" ít thông tin, hãy dùng lời văn khéo léo để "vẽ" ra một không gian sống lý tưởng (Vd: phòng được thiết kế tối ưu, ánh sáng tự nhiên, sạch sẽ, mang lại cảm giác thoải mái...).
3. THÔNG TIN CHI TIẾT (Dùng các dấu tick xanh ✅ hoặc gạch đầu dòng):
   - Diện tích: ${roomInfo.dienTich}m2.
   - Tiện nghi: ${roomInfo.tienNghi}.
   - Số người ở: Tối đa ${roomInfo.soNguoiToiDa} người.
   - Các điểm nổi bật khác (nếu có).
4. CHI PHÍ & LIÊN HỆ:
   - Giá thuê: ${roomInfo.giaThue.toLocaleString('vi-VN')} VNĐ/tháng.
   - Tiền cọc: ${roomInfo.tienCoc.toLocaleString('vi-VN')} VNĐ.
   - Hotline liên hệ: ${roomInfo.lienHe}.
5. HASHTAG: Thêm các hashtag liên quan như #chothuephong #phongtro #quanhaichau #timphong...

QUY TẮC QUAN TRỌNG:
- TUYỆT ĐỐI KHÔNG giải thích, KHÔNG nói 'Đây là bài đăng...', KHÔNG thêm phần kết luận của AI. 
- CHỈ in ra duy nhất nội dung bài quảng cáo từ đầu đến cuối.
- Sử dụng ngôn từ trẻ trung, lôi cuốn nhưng vẫn chuyên nghiệp.
- Bài viết phải dài ít nhất 150-200 từ để cung cấp đủ thông tin cho người đọc.
    `;

    // 3. Call Gemini API with Retry Logic
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Chưa cấu hình GEMINI_API_KEY trong hệ thống');
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`;
    const requestBody = JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{
            text: `${systemPrompt}\n\nLưu ý: Hãy viết một bài đăng thật truyền cảm hứng, chi tiết từng phần như hướng dẫn ở trên. Đảm bảo độ dài cân đối và hấp dẫn.`
          }]
        }
      ],
      generationConfig: {
        temperature: 0.9,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    });

    let data;
    let success = false;
    let attempts = 0;
    const MAX_RETRIES = 3;

    while (attempts < MAX_RETRIES && !success) {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      });

      data = await response.json();

      if (response.ok) {
        success = true;
      } else {
        attempts++;
        const isOverloaded = data.error?.code === 503 || data.error?.code === 429 || data.error?.message?.toLowerCase().includes('high demand');

        if (isOverloaded && attempts < MAX_RETRIES) {
          console.warn(`Gemini API overloaded. Retrying... (${attempts}/${MAX_RETRIES})`);
          // Wait 2 seconds before retrying
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          console.error('Gemini API Error details:', data);
          if (isOverloaded) {
            throw new Error('Hệ thống AI hiện đang quá tải. Vui lòng thử lại sau.');
          }
          throw new Error('Lỗi từ hệ thống AI: ' + (data.error?.message || 'Không xác định'));
        }
      }
    }

    const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';

    if (!text) {
      throw new Error('Dữ liệu trả về từ AI bị trống');
    }

    return NextResponse.json({
      success: true,
      content: text
    });

  } catch (error: any) {
    console.error('Error auto-generating post:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Có lỗi xảy ra khi tạo bài viết',
      },
      { status: 500 }
    );
  }
}
