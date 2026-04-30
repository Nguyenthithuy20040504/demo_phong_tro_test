import nodemailer from 'nodemailer';
import { IHoaDon } from '@/models/HoaDon';

// The transport will be instantiated dynamically to ensure it picks up process.env correctly
const getMailTransport = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return !!email && emailRegex.test(email) && !email.includes('example.com'); // Exclude placeholders
};

export const sendDebtNotificationEmail = async ({
  email,
  khachThueName,
  hoaDonData,
  qrUrl
}: {
  email: string;
  khachThueName: string;
  hoaDonData: any; // Ideally mapped from IHoaDon
  qrUrl: string;
}) => {
  if (!email || !process.env.SMTP_USER) {
    console.warn('Bỏ qua gửi email: cấu hình SMTP hoặc email khách hàng không tồn tại.');
    return false;
  }

  // Cấu trúc nội dung bảng
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const tienPhong = hoaDonData.tienPhong || 0;
  const tienDien = hoaDonData.tienDien || 0;
  const tienNuoc = hoaDonData.tienNuoc || 0;
  
  // Tổng dịch vụ
  const tongDichVu = hoaDonData.phiDichVu?.reduce((sum: number, fee: any) => sum + (fee.gia || 0), 0) || 0;
  const tongTien = hoaDonData.tongTien || 0;
  const daThanhToan = hoaDonData.daThanhToan || 0;
  const conLai = hoaDonData.conLai || 0;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #2563eb; padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0; font-size: 20px;">Thông Báo Cước Phí Thuê Nhà</h2>
        <p style="color: #e0e7ff; margin: 5px 0 0 0; font-size: 14px;">Tháng ${hoaDonData.thang}/${hoaDonData.nam}</p>
      </div>
      
      <div style="padding: 24px;">
        <p>Xin chào <strong>${khachThueName}</strong>,</p>
        <p>Đây là thông báo thanh toán tiền thuê nhà cho kỳ hạn tháng ${hoaDonData.thang}/${hoaDonData.nam}. Chi tiết hóa đơn như sau:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px 0;"><strong>Tiền Thuê Nhà</strong></td>
            <td style="padding: 10px 0; text-align: right;">${formatCurrency(tienPhong)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px 0;">Tiền Điện (Chữ số mới: ${hoaDonData.chiSoDienCuoiKy})</td>
            <td style="padding: 10px 0; text-align: right;">${formatCurrency(tienDien)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px 0;">Tiền Nước (Chữ số mới: ${hoaDonData.chiSoNuocCuoiKy})</td>
            <td style="padding: 10px 0; text-align: right;">${formatCurrency(tienNuoc)}</td>
          </tr>
          ${hoaDonData.phiDichVu?.length > 0 ? `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px 0;">Phí Dịch Vụ Khác</td>
            <td style="padding: 10px 0; text-align: right;">${formatCurrency(tongDichVu)}</td>
          </tr>
          ` : ''}
          <tr style="border-bottom: 1px solid #eee; background-color: #f9fafb;">
            <td style="padding: 10px 5px;"><strong>Tổng Cộng</strong></td>
            <td style="padding: 10px 5px; text-align: right;"><strong>${formatCurrency(tongTien)}</strong></td>
          </tr>
          <tr style="border-bottom: 1px solid #eee; background-color: #f9fafb; color: #16a34a;">
            <td style="padding: 10px 5px;"><strong>Đã Thanh Toán</strong></td>
            <td style="padding: 10px 5px; text-align: right;"><strong>-${formatCurrency(daThanhToan)}</strong></td>
          </tr>
          <tr style="border-bottom: 2px solid #2563eb; background-color: #eef2ff; color: #1d4ed8; font-size: 18px;">
            <td style="padding: 15px 5px;"><strong>Tổng Dư Nợ Cần Thanh Toán</strong></td>
            <td style="padding: 15px 5px; text-align: right;"><strong>${formatCurrency(conLai)}</strong></td>
          </tr>
        </table>

        ${qrUrl ? `
        <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; padding: 20px; text-align: center; border-radius: 8px; margin-top: 20px;">
          <h3 style="margin-top: 0; color: #334155; font-size: 16px;">Mã QR Thanh Toán (VietQR)</h3>
          <p style="color: #64748b; font-size: 13px; margin-bottom: 15px;">Mở ứng dụng ngân hàng và quét mã để thanh toán chính xác số dư nợ ${formatCurrency(conLai)}</p>
          <img src="${qrUrl}" alt="VietQR" style="max-width: 100%; height: auto; max-height: 250px;" />
        </div>
        ` : `
        <div style="background-color: #fffbeb; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-top: 20px;">
          <p style="margin: 0; color: #92400e; font-size: 14px;"><strong>Chú ý:</strong> Thông tin mã QR chưa được tạo thành công, vui lòng xử lý thủ công hoặc chuyển khoản trực tiếp qua Số Tài Khoản chủ nhà.</p>
        </div>`}

        <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p>Hạn thanh toán: ${new Date(hoaDonData.hanThanhToan).toLocaleDateString('vi-VN')}</p>
          <p>Cảm ơn sự hợp tác của bạn!</p>
          <p><em>Đây là email tự động, vui lòng không phản hồi lại địa chỉ này.</em></p>
        </div>
      </div>
    </div>
  `;

  try {
    const transport = getMailTransport();
    const info = await transport.sendMail({
      from: `"Quản Lý Phòng Trọ" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Thông báo dư nợ thanh toán - Hóa đơn tháng ${hoaDonData.thang}/${hoaDonData.nam}`,
      html: htmlContent,
    });
    console.log(`[Email Success] Đã gửi thông báo tới ${email}. MessageId: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error(`[Email Error] Lỗi nghiêm trọng khi gửi mail tới ${email}:`, {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response
    });
    return false;
  }
};

export const sendGeneralNotificationEmail = async ({
  email,
  khachThueName,
  tieuDe,
  noiDung,
}: {
  email: string;
  khachThueName: string;
  tieuDe: string;
  noiDung: string;
}) => {
  if (!email || !process.env.SMTP_USER) {
    console.warn('Bỏ qua gửi email: cấu hình SMTP hoặc email khách hàng không tồn tại.');
    return false;
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0d9488; padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0; font-size: 20px;">Thông Báo Hệ Thống</h2>
      </div>
      
      <div style="padding: 24px;">
        <p>Xin chào <strong>${khachThueName}</strong>,</p>
        <p>Hệ thống Quản lý nhà trọ xin thông báo:</p>
        
        <div style="background-color: #f0fdfa; border-left: 4px solid #0d9488; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #134e4a; font-size: 16px;">${tieuDe}</h3>
          <p style="margin-bottom: 0; white-space: pre-wrap; color: #374151;">${noiDung}</p>
        </div>

        <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px;">
          <p>Hệ thống Quản lý nhà trọ chuyên nghiệp - Thuận tiện - Minh bạch</p>
          <p><em>Đây là email tự động, vui lòng không phản hồi lại địa chỉ này.</em></p>
        </div>
      </div>
    </div>
  `;

  try {
    const transport = getMailTransport();
    const info = await transport.sendMail({
      from: `"Quản Lý Nhà Trọ" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `[Thông báo] ${tieuDe}`,
      html: htmlContent,
    });
    console.log(`[Email Success] Đã gửi thông báo tới ${email}. MessageId: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error(`[Email Error] Lỗi nghiêm trọng khi gửi mail tới ${email}:`, error);
    return false;
  }
};

export const sendAccountConfirmationLinkEmail = async ({
  email,
  khachThueName,
  confirmLink,
}: {
  email: string;
  khachThueName: string;
  confirmLink: string;
}) => {
  if (!email || !process.env.SMTP_USER) {
    console.warn('Bỏ qua gửi email: cấu hình SMTP hoặc email khách hàng không tồn tại.');
    return false;
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #2563eb; padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0; font-size: 20px;">Xác Nhận Tài Khoản Khách Thuê</h2>
      </div>
      
      <div style="padding: 24px; text-align: center;">
        <p style="text-align: left;">Xin chào <strong>${khachThueName}</strong>,</p>
        <p style="text-align: left;">Chủ nhà đã tạo hồ sơ khách thuê cho bạn trên hệ thống Quản lý nhà trọ. Để kích hoạt tài khoản và thiết lập mật khẩu, vui lòng nhấn vào nút bên dưới:</p>
        
        <div style="margin: 30px 0;">
          <a href="${confirmLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Kích hoạt tài khoản</a>
        </div>

        <p style="text-align: left; font-size: 14px; color: #64748b;">Nếu nút trên không hoạt động, bạn có thể copy link sau dán vào trình duyệt:</p>
        <p style="text-align: left; font-size: 13px; color: #2563eb; word-break: break-all;">${confirmLink}</p>
        
        <p style="text-align: left; font-size: 14px; color: #ef4444; margin-top: 20px;"><strong>Lưu ý:</strong> Link này chỉ có hiệu lực trong vòng 24 giờ kể từ khi được gửi.</p>

        <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px;">
          <p>Hệ thống Quản lý nhà trọ chuyên nghiệp</p>
          <p><em>Nếu bạn không phải là người nhận được thông báo này, vui lòng bỏ qua email.</em></p>
        </div>
      </div>
    </div>
  `;

  try {
    const transport = getMailTransport();
    const info = await transport.sendMail({
      from: `"Quản Lý Nhà Trọ" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `[Kích hoạt tài khoản] Chào mừng bạn đến với hệ thống Quản lý nhà trọ`,
      html: htmlContent,
    });
    console.log(`[Email Success] Đã gửi link kích hoạt tới ${email}. MessageId: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error(`[Email Error] Lỗi khi gửi email kích hoạt tới ${email}:`, error);
    return false;
  }
};
