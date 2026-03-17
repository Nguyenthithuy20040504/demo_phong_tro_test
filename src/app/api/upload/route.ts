import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { message: 'Không có file được chọn' },
        { status: 400 }
      );
    }

    // Kiểm tra loại file
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { message: 'Chỉ được upload file ảnh' },
        { status: 400 }
      );
    }

    // Kiểm tra kích thước file (tối đa 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { message: 'Kích thước file không được vượt quá 10MB' },
        { status: 400 }
      );
    }

    // Upload lên Cloudinary
    const cloudinaryFormData = new FormData();
    cloudinaryFormData.append('file', file);
    
    // Sử dụng biến môi trường hoặc fallback chính xác từ .env
    const uploadPreset = process.env.NEXT_PUBLIC_UPLOAD_PRESET || 'demophongtro';
    const cloudName = process.env.NEXT_PUBLIC_CLOUD_NAME || 'dq9s0m5v2';
    
    cloudinaryFormData.append('upload_preset', uploadPreset);

    console.log(`Uploading to Cloudinary: CloudName=${cloudName}, Preset=${uploadPreset}`);

    const cloudinaryResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: cloudinaryFormData,
      }
    );

    if (!cloudinaryResponse.ok) {
      const errorText = await cloudinaryResponse.text();
      console.error('Cloudinary upload error response:', errorText);
      throw new Error(`Cloudinary Error: ${cloudinaryResponse.statusText} - ${errorText}`);
    }

    const cloudinaryResult = await cloudinaryResponse.json();

    return NextResponse.json({
      success: true,
      data: {
        public_id: cloudinaryResult.public_id,
        secure_url: cloudinaryResult.secure_url,
        width: cloudinaryResult.width,
        height: cloudinaryResult.height,
      },
      message: 'Upload ảnh thành công',
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { 
        message: 'Có lỗi xảy ra khi upload file',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}