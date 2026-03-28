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

    // 1. Phục hồi 5 phòng trọ để hiển thị đa dạng dữ liệu
    const availableRooms = await Phong.find({ trangThai: 'trong' })
      .populate({
        path: 'toaNha',
        select: 'tenToaNha diaChi chuSoHuu',
        populate: {
          path: 'chuSoHuu',
          select: 'soDienThoai'
        }
      })
      .limit(5);

    const roomsInfo = availableRooms.map((p: IPhong) => {
      const toaNha = p.toaNha as any;
      const chuSoHuu = toaNha?.chuSoHuu as any;
      return {
        maPhong: p.maPhong,
        toaNha: toaNha?.tenToaNha || 'N/A',
        diaChi: toaNha?.diaChi ? `${toaNha.diaChi.quan}, ${toaNha.diaChi.thanhPho}` : 'N/A',
        giaThue: p.giaThue,
        dienTich: p.dienTich,
        tienNghi: p.tienNghi?.join(', ') || 'Cơ bản',
        lienHe: chuSoHuu?.soDienThoai || 'Đang cập nhật',
        moTa: p.moTa || 'Không có mô tả'
      };
    });

    const systemPrompt = `
 Bạn là một trợ lý ảo thông minh của hệ thống PiRoom.
 Hãy giúp khách tìm phòng dựa trên dữ liệu:
 ${JSON.stringify(roomsInfo, null, 2)}
 
 Trả lời ngắn gọn, lịch sự. PHẢI dùng bảng Markdown:
 | Mã Phòng | Tòa Nhà | Địa Chỉ | Giá Thuê | Diện Tích | Liên Hệ |
 | :--- | :--- | :--- | :--- | :--- | :--- |
 
 Luôn định dạng giá (VD: 3.500.000 VNĐ).
    `;

    const apiKey = process.env.GEMINI_API_KEY;
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
