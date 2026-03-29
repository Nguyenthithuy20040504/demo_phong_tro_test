import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Phong from '@/models/Phong';
import ToaNha from '@/models/ToaNha';
import '@/models/NguoiDung'; // Ensure User model is registered for populate

export async function POST(request: NextRequest) {
  try {
    const { phongId } = await request.json();

    if (!phongId) {
      return NextResponse.json({ message: 'Thiếu ID phòng' }, { status: 400 });
    }

    await dbConnect();

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
Nhiệm vụ của bạn là viết MỘT bài đăng (post) rao vặt cho thuê phòng trọ thật hấp dẫn dể thu hút người xem trên Facebook, Zalo hoặc các hội nhóm.

Thông tin chi tiết của phòng trọ:
${JSON.stringify(roomInfo, null, 2)}

HƯỚNG DẪN VIẾT BÀI:
1. Tiêu đề: Viết IN HOA, giật tít thu hút (Nhấn mạnh vị trí, giá ưu đãi hoặc phòng đẹp). Sử dụng các icon bắt mắt (như 💥, 🏠, 🔥, 🌈...).
2. Bố cục rõ ràng: Chia làm các phần bằng gạch đầu dòng hoặc dấu tick xanh (vị trí, tiện ích, chi phí, liên hệ).
3. Nội dung:
   - Làm nổi bật các điểm mạnh dựa vào "Thông tin chi tiết" ở trên (VD: giá siêu lướt, full tiện nghi, rộng rãi...).
   - Format giá thuê thành số có chấm (VD: 3.500.000 VNĐ/tháng) để dễ đọc. Miêu tả rõ ràng tiền cọc.
   - Bắt buộc phải để lại địa chỉ, thông tin liên hệ một cách khéo léo ở cuối bài.
   - Thêm các hashtag phổ biến (VD: #chothuephong #phongtro #timphong...).
4. Giọng điệu (Tone): Thân thiện, đánh trúng tâm lý người đi thuê (mong muốn phòng sạch, rẻ, an ninh), thôi thúc họ inbox/gọi điện ngay kẻo lỡ.
    
QUAN TRỌNG: TUYỆT ĐỐI KHÔNG giải thích, KHÔNG thêm lời chào mừng (VD: 'Chào bạn...', 'Dưới đây là...'), KHÔNG thêm phần kết luận. CHỈ in ra duy nhất nguyên văn nội dung bài quảng cáo.
    `;

    // 3. Call Gemini API with Retry Logic
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Chưa cấu hình GEMINI_API_KEY trong hệ thống');
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
    const requestBody = JSON.stringify({
      system_instruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: 'Viết cho tôi một bài đăng cho thuê phòng trọ hoàn chỉnh dựa vào thông tin của JSON đính kèm.' }]
        }
      ],
      generationConfig: {
        temperature: 0.7, // Mức độ sáng tạo
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
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
            throw new Error('Hệ thống AI hiện đang quá tải do lượng truy cập cao. Bạn vui lòng đợi khoảng 1 phút rồi bấm thử lại nhé!');
          }
          throw new Error('Lỗi từ hệ thống AI: ' + (data.error?.message || 'Không xác định'));
        }
      }
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

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
