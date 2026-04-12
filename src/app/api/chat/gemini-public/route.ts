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
    
    let searchArea = { district: '', street: '', landmark: '', maxPrice: 0, amenities: [] as string[] };
    try {
      const extractResponse = await fetch(extractUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `Dựa vào tin nhắn của khách hàng: "${message}", hãy phân tích ý định tìm kiếm phòng trọ. 
            Bóc tách các thông tin sau:
            - Quận/Huyện (district)
            - Tên đường/Phố (street) 
            - Địa danh/Trường học/Landmark (landmark)
            - Mức giá mong muốn (maxPrice - chỉ lấy số)
            - Tiện nghi yêu cầu (amenities - mảng chuỗi)

            Trả về CHỈ DUY NHẤT một chuỗi JSON theo định dạng: {"district": "string", "street": "string", "landmark": "string", "maxPrice": number, "amenities": ["string"]}` }]
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
    
    // Tìm kiếm đa điều kiện dựa trên bóc tách của AI
    const searchConditions: any[] = [];
    
    if (searchArea.district) {
      searchConditions.push({ 'diaChi.quan': { $regex: searchArea.district, $options: 'i' } });
    }
    if (searchArea.street) {
      searchConditions.push({ 'diaChi.duong': { $regex: searchArea.street, $options: 'i' } });
    }
    if (searchArea.landmark) {
      searchConditions.push({ 'tenToaNha': { $regex: searchArea.landmark, $options: 'i' } });
      searchConditions.push({ 'diaChi.duong': { $regex: searchArea.landmark, $options: 'i' } });
      searchConditions.push({ 'diaChi.phuong': { $regex: searchArea.landmark, $options: 'i' } });
    }

    if (searchConditions.length > 0) {
      const matchingToaNhas = await ToaNha.find({ $or: searchConditions }).select('_id');
      const toaNhaIds = matchingToaNhas.map(t => t._id);
      if (toaNhaIds.length > 0) {
        query.toaNha = { $in: toaNhaIds };
      }
    }

    // Lọc theo giá nếu có
    if (searchArea.maxPrice && searchArea.maxPrice > 0) {
      query.giaThue = { $lte: searchArea.maxPrice };
    }
    
    // Lọc theo tiện nghi (nếu có yêu cầu cụ thể)
    if (searchArea.amenities && searchArea.amenities.length > 0) {
      query.tienNghi = { $all: searchArea.amenities.map((a: string) => new RegExp(a, 'i')) };
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
 Bạn là **PiRoom Expert** - Chuyên gia tư vấn bất động sản cho thuê chuyên nghiệp, nhiệt tình và cực kỳ am hiểu địa lý Hà Nội/HCM.
 
 CÔNG VIỆC CỦA BẠN:
 1. Phân tích yêu cầu khách thuê và ĐỀ XUẤT các phòng phù hợp nhất từ danh sách dữ liệu thật được cung cấp bên dưới.
 2. Luôn giữ thái độ thân thiện, chuyên nghiệp, sử dụng icon phù hợp.
 3. Nếu không có phòng đúng khu vực yêu cầu, hãy thông báo lịch sự và ĐỀ XUẤT các phòng ở khu vực lân cận hoặc các phòng "hot" nhất hiện nay.
 
 DỮ LIỆU PHÒNG TRỐNG HIỆN TẠI:
 ${JSON.stringify(roomsInfo, null, 2)}
 
 QUY TẮC TRÌNH BÀY:
 - Luôn bắt đầu bằng một câu chào hoặc phản hồi ngắn gọn về yêu cầu của khách.
 - Trình bày danh sách phòng dưới dạng bảng Markdown:
   | Mã Phòng | Tòa Nhà | Địa Chỉ | Giá | Diện Tích | Tiện Nghi | Liên Hệ |
   |:---|:---|:---|:---|:---|:---|:---|
 - Định dạng giá thuê rõ ràng (VD: 4.5 TR hoặc 4.500.000đ).
 - Sau bảng, hãy đưa ra 1-2 lời khuyên chuyên gia về các phòng này (VD: "Phòng A gần điểm dừng xe buýt, rất tiện cho các bạn sinh viên Bách Khoa...").
 - Cuối cùng, nhắc khách liên hệ theo số điện thoại trong cột "Liên Hệ".
 
 LỜI KHUYÊN: Hãy thông minh hơn! Nếu khách hỏi "Phòng cho sinh viên Thủy Lợi", bạn phải hiểu là ở khu vực "Đống Đa" hoặc gần "Chùa Bộc" để lọc ra những phòng phù hợp từ danh sách.
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
