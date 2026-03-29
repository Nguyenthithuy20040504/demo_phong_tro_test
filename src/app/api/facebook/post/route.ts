import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, images } = await request.json();

    if (!message) {
      return NextResponse.json({ success: false, message: 'Thiếu nội dung bài đăng' }, { status: 400 });
    }

    const pageId = process.env.FACEBOOK_PAGE_ID;
    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;

    if (!pageId || !accessToken) {
      return NextResponse.json({ success: false, message: 'Hệ thống chưa cấu hình Facebook API' }, { status: 500 });
    }

    const attachedMedia = [];

    // Nếu có dính kèm ảnh, cần upload ảnh lên Facebook dưới dạng "unpublished" trước để lấy ID
    if (images && images.length > 0) {
      for (const imageUrl of images) {
        try {
          const photoResponse = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: imageUrl,
              published: false, // Upload nhưng không hiển thị ngay ra tường
              access_token: accessToken,
            })
          });
          const photoData = await photoResponse.json();
          if (photoData.id) {
            attachedMedia.push({ media_fbid: photoData.id });
          } else {
            console.error("Lỗi khi upload ảnh lên FB:", photoData);
          }
        } catch (err) {
          console.error("Lỗi ngoại lệ khi up ảnh FB:", err);
        }
      }
    }

    // Tiến hành xuất bản nội dung bài viết
    const postBody: any = {
      message: message,
      access_token: accessToken,
    };

    if (attachedMedia.length > 0) {
      postBody.attached_media = attachedMedia;
    }

    const feedResponse = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postBody)
    });

    const feedData = await feedResponse.json();

    if (feedData.id) {
      // id returned by API is in format: pageId_postId
      return NextResponse.json({
        success: true,
        postId: feedData.id,
        postUrl: `https://facebook.com/${feedData.id}`,
        message: 'Đăng bài lên Facebook thành công!'
      });
    } else {
      console.error("Lỗi Graph API khi đăng tin:", feedData);
      return NextResponse.json({
        success: false,
        message: feedData.error?.message || 'Có lỗi khi Facebook duyệt bài đăng'
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Error posting to Facebook:', error);
    return NextResponse.json({
      success: false,
      message: 'Lỗi máy chủ nội bộ khi xử lý đăng Facebook'
    }, { status: 500 });
  }
}
