import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Phong, { IPhong } from '@/models/Phong';
import ToaNha from '@/models/ToaNha';
import '@/models/NguoiDung';

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json();

    if (!message) {
      return NextResponse.json({ message: 'Nội dung tin nhắn là bắt buộc' }, { status: 400 });
    }

    await dbConnect();

    // --- BƯỚC 1: TRÍ TUỆ NHÂN TẠO PHÂN TÍCH Ý ĐỊNH ---
    const apiKey = process.env.GEMINI_API_KEY;
    const extractUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    let searchArea = { district: '', street: '', landmark: '' };
    try {
      const extractResponse = await fetch(extractUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `Dựa vào tin nhắn sau: "${message}", hãy bóc tách thông tin địa điểm tìm kiếm. 
            Nếu không có thông tin cụ thể, hãy để trống. 
            Trả về CHỈ DUY NHẤT một chuỗi JSON theo định dạng sau: {"district": "tên quận/huyện chuẩn", "street": "tên đường chuẩn", "landmark": "địa danh nổi tiếng nếu có"}` }]
          }],
          generationConfig: { response_mime_type: "application/json" }
        })
      });
      const extractData = await extractResponse.json();
      if (extractData.candidates?.[0]?.content?.parts?.[0]?.text) {
        searchArea = JSON.parse(extractData.candidates[0].content.parts[0].text);
      }
    } catch (e) {
      console.error('Lỗi khi bóc tách địa chỉ:', e);
    }

    // --- BƯỚC 2: TRUY VẤN DATABASE THÔNG MINH ---
    let query: any = { trangThai: 'trong' };
    
    // Nếu AI bóc tách được Quận hoặc Đường, chúng ta sẽ ưu tiên tìm đúng nơi đó
    if (searchArea.district || searchArea.street) {
      const searchTerms: any = {};
      if (searchArea.district) searchTerms['diaChi.quan'] = searchArea.district;
      if (searchArea.street) searchTerms['diaChi.duong'] = searchArea.street;
      
      const matchingToaNhas = await ToaNha.find(searchTerms)
        .collation({ locale: 'vi', strength: 1 }) // Sức mạnh 1: Bỏ qua dấu và hoa thường (giang vo = Giảng Võ)
        .select('_id');
      
      const toaNhaIds = matchingToaNhas.map(t => t._id);
      if (toaNhaIds.length > 0) {
        query.toaNha = { $in: toaNhaIds };
      }
    }

    // Lấy tối đa 100 phòng liên quan nhất
    const allAvailableRooms = await Phong.find(query)
      .populate({
        path: 'toaNha',
        select: 'tenToaNha diaChi chuSoHuu',
        populate: {
          path: 'chuSoHuu',
          select: 'soDienThoai'
        }
      })
      .sort({ ngayCapNhat: -1 })
      .limit(100);

    // Gộp thêm một số phòng mới nhất nếu kết quả tìm kiếm quá ít để gợi ý thêm
    if (allAvailableRooms.length < 5 && !query.toaNha) {
       // Optional: Add some global newest rooms
    }

    // Chuẩn bị dữ liệu cho Gemini trả lời cuối cùng
    const roomsInfo = allAvailableRooms.map((p: IPhong) => {
      const toaNha = p.toaNha as any;
      const chuSoHuu = toaNha?.chuSoHuu as any;
      return {
        maPhong: p.maPhong,
        toaNha: toaNha?.tenToaNha || 'N/A',
        diaChi: toaNha?.diaChi 
          ? [toaNha.diaChi.soNha, toaNha.diaChi.duong, toaNha.diaChi.phuong, toaNha.diaChi.quan, toaNha.diaChi.thanhPho]
              .filter(Boolean)
              .join(', ') 
          : 'N/A',
        giaThue: p.giaThue,
        dienTich: p.dienTich,
        tienNghi: p.tienNghi?.join(', ') || 'Cơ bản',
        lienHe: chuSoHuu?.soDienThoai || 'Đang cập nhật',
        moTa: p.moTa || 'Không có mô tả'
      };
    });

    const systemPrompt = `
 Bạn là một trợ lý ảo thông minh của hệ thống PiRoom.
 Hãy giúp khách tìm phòng dựa trên dữ liệu thật sau:
 ${JSON.stringify(roomsInfo, null, 2)}
 
 HƯỚNG DẪN TRẢ LỜI:
 1. LUÔN dùng bảng Markdown với các cột: | Mã Phòng | Tòa Nhà | Địa Chỉ | Giá Thuê | Diện Tích | Liên Hệ |
 2. Cột "Liên Hệ" cực kỳ quan trọng, hãy lấy số điện thoại từ trường "lienHe".
 3. Định dạng giá thuê (VD: 3.500.000 VNĐ).
 4. THÔNG MINH ĐỊA LÝ: 
    - Nếu có phòng phù hợp chính xác với khu vực người dùng hỏi (Quận/Đường), hãy hiển thị chúng lên đầu.
    - Nếu không có phòng đúng chính xác khu vực đó, hãy thông báo "Hiện chưa có phòng ở [Khu vực], bạn có thể tham khảo các phòng lân cận sau:" và hiển thị các phòng khác có trong dữ liệu.
    - Bạn có kiến thức về địa lý để hiểu "Trường ĐH Bách Khoa" gần "Quận Hai Bà Trưng" hay "Phố Vọng", hãy tận dụng điều đó để tư vấn phòng phù hợp nhất từ danh sách.
 `;

    // Dùng cùng một apiKey đã khai báo ở trên cho bước phản hồi cuối cùng
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

    const geminiHistory = (history || []).map((h: any) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }],
    }));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          ...geminiHistory,
          {
            role: 'user',
            parts: [{ text: message }]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API Error details:', data);
      throw new Error(data.error?.message || 'Lỗi khi gọi Gemini API');
    }

    const text = data.candidates[0].content.parts[0].text;

    return NextResponse.json({
      success: true,
      content: text
    });

  } catch (error: any) {
    console.error('Error in Gemini Chat API:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi hệ thống AI: ' + error.message,
      },
      { status: 500 }
    );
  }
}
