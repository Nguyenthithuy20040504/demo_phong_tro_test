import { Document, Paragraph, TextRun, AlignmentType, Packer, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';

export const exportHopDongToDocx = async (hopDong: any) => {
  try {
    const phongObj = hopDong.phong || {};
    const toaNhaObj = phongObj.toaNha || {};
    
    // Format địa chỉ tòa nhà
    let diaChiToaNha = toaNhaObj.tenToaNha || '';
    if (toaNhaObj.diaChi) {
      const { soNha, duong, phuong, quan, thanhPho } = toaNhaObj.diaChi;
      const parts = [soNha, duong, phuong, quan, thanhPho].filter(Boolean);
      if (parts.length > 0) diaChiToaNha = parts.join(', ');
    }

    const phongInfo = {
      maPhong: phongObj.maPhong || '...',
      toaNha: diaChiToaNha || 'Trống'
    };
    
    // Lấy thông tin chủ sở hữu (Bên A) từ toà nhà trong hợp đồng
    const chuSoHuu = toaNhaObj.chuSoHuu || {};
    const tenChuTro = chuSoHuu.hoTen || chuSoHuu.ten || chuSoHuu.name || '';
    const sdtChuTro = chuSoHuu.soDienThoai || chuSoHuu.phone || '';
    const cccdChuTro = chuSoHuu.cccd || '';
    const diaChiChuTro = chuSoHuu.address || chuSoHuu.queQuan || '';

    // Lấy thông tin khách thuê (Bên B)
    const khachDaiDienObj = hopDong.nguoiDaiDien || {};
    const nguoiDaiDien = khachDaiDienObj.hoTen || khachDaiDienObj.ten || '';
    const nguoiDaiDienPhone = khachDaiDienObj.soDienThoai || khachDaiDienObj.phone || '';
    const cccdKhach = khachDaiDienObj.cccd || '';
    const queQuanKhach = khachDaiDienObj.queQuan || khachDaiDienObj.address || '';

    // Lấy danh sách tất cả khách thuê
    const allTenantNames: string[] = [];
    if (Array.isArray(hopDong.khachThueId)) {
      hopDong.khachThueId.forEach((kt: any) => {
        const name = kt.hoTen || kt.ten;
        if (name && !allTenantNames.includes(name)) allTenantNames.push(name);
      });
    }
    if (hopDong.snapshotKhachThue) {
      hopDong.snapshotKhachThue.forEach((snap: any) => {
        if (snap.hoTen && !allTenantNames.includes(snap.hoTen)) {
          allTenantNames.push(snap.hoTen);
        }
      });
    }
    
    const ngayBatDau = new Date(hopDong.ngayBatDau || new Date());
    const ngayKetThuc = new Date(hopDong.ngayKetThuc || new Date());
    const ngayHienTai = new Date();

    const formatCurrency = (val: any) => 
      new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Header
          new Paragraph({
            children: [
              new TextRun({
                text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
                bold: true,
                size: 24,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Độc lập - Tự do - Hạnh phúc",
                bold: true,
                size: 20,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          
          // Title
          new Paragraph({
            children: [
              new TextRun({
                text: "HỢP ĐỒNG THUÊ PHÒNG TRỌ",
                bold: true,
                size: 28,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `(Số: ${hopDong.maHopDong}/HĐTN)`,
                bold: true,
                size: 20,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          
          // Date and location
          new Paragraph({
            children: [
              new TextRun({
                text: `Hôm nay, ngày ${ngayHienTai.getDate()} tháng ${ngayHienTai.getMonth() + 1} năm ${ngayHienTai.getFullYear()};`,
                size: 20,
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Tại địa chỉ: ${phongInfo.toaNha}`,
                size: 20,
              }),
            ],
            spacing: { after: 400 },
          }),
          
          // Parties
          new Paragraph({
            children: [
              new TextRun({
                text: "Chúng tôi gồm:",
                bold: true,
                size: 20,
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "1. Đại diện bên cho thuê phòng trọ (Bên A):",
                bold: true,
                size: 20,
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Ông/bà: ${tenChuTro || '......................................................................'}`,
                size: 20,
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Nơi đăng ký hộ khẩu thường trú: ${diaChiChuTro || '....................................................................................................'}`,
                size: 20,
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `CMND(CCCD) số: ${cccdChuTro || '..............................................................................................................'}`,
                size: 20,
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Số điện thoại liên hệ: ${sdtChuTro || '......................................................................................................................'}`,
                size: 20,
              }),
            ],
            spacing: { after: 200 },
          }),
          
          new Paragraph({
            children: [
              new TextRun({
                text: "2. Bên thuê phòng trọ (Bên B):",
                bold: true,
                size: 20,
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Người đại diện: ${nguoiDaiDien || '......................................................................'}`,
                size: 20,
                bold: true,
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Số điện thoại: ${nguoiDaiDienPhone || '......................................................................................................................'}`,
                size: 20,
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Nơi đăng ký hộ khẩu thường trú: ${queQuanKhach || '....................................................................................................'}`,
                size: 20,
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Số CMND (CCCD): ${cccdKhach || '..............................................................................................................'}`,
                size: 20,
              }),
            ],
            spacing: { after: 100 },
          }),
          ...(allTenantNames.length > 1 ? [
            new Paragraph({
              children: [
                new TextRun({
                  text: `Người cùng thuê: ${allTenantNames.filter(n => n !== nguoiDaiDien).join(', ')}`,
                  size: 20,
                }),
              ],
              spacing: { after: 100 },
            }),
          ] : []),
          new Paragraph({
            children: [],
            spacing: { after: 400 },
          }),
          
          // Agreement details
          new Paragraph({
            children: [
              new TextRun({
                text: "Sau khi bàn bạc kỹ lưỡng, hai bên cùng thống nhất như sau:",
                size: 20,
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Bên A đồng ý cho bên B thuê 01 phòng ở tại địa chỉ: ${phongInfo.maPhong} - ${phongInfo.toaNha}`,
                size: 20,
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Giá thuê: ${formatCurrency(hopDong.giaThue)}/tháng`,
                size: 20,
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Hình thức thanh toán: Hàng ${hopDong.chuKyThanhToan === 'thang' ? 'tháng' : hopDong.chuKyThanhToan === 'quy' ? 'quý' : 'năm'} - ngày ${hopDong.ngayThanhToan} hàng kỳ`,
                size: 20,
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Tiền điện: ${formatCurrency(hopDong.giaDien)}/kWh; Tiền nước: ${formatCurrency(hopDong.giaNuoc)}/m³`,
                size: 20,
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Tiền đặt cọc: ${formatCurrency(hopDong.tienCoc)}`,
                size: 20,
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Hợp đồng có giá trị kể từ ngày ${ngayBatDau.toLocaleDateString('vi-VN')} đến ngày ${ngayKetThuc.toLocaleDateString('vi-VN')}.`,
                size: 20,
              }),
            ],
            spacing: { after: 400 },
          }),
          
          // Responsibilities and custom terms
          new Paragraph({
            children: [
              new TextRun({
                text: "ĐIỀU KHOẢN VÀ TRÁCH NHIỆM",
                bold: true,
                size: 24,
              }),
            ],
            spacing: { after: 200 },
          }),
          ...(hopDong.dieuKhoan 
            ? hopDong.dieuKhoan.split('\n').map((line: string) => 
                new Paragraph({
                  children: [
                    new TextRun({
                      text: line.trim(),
                      size: 22,
                    }),
                  ],
                  spacing: { after: 120 },
                })
              )
            : [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Theo quy định của pháp luật và nội quy tòa nhà.",
                      size: 22,
                    }),
                  ],
                  spacing: { after: 400 },
                })
              ]),
          new Paragraph({
            children: [],
            spacing: { after: 400 },
          }),
          
          // Signatures using Table for perfect alignment
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "auto" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
              left: { style: BorderStyle.NONE, size: 0, color: "auto" },
              right: { style: BorderStyle.NONE, size: 0, color: "auto" },
              insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
              insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "ĐẠI DIỆN BÊN A",
                            bold: true,
                            size: 24,
                          })
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "(Ký và ghi họ tên)",
                            size: 20,
                            italics: true,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 1200 },
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: tenChuTro || '.............................................',
                            bold: true,
                            size: 24,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "ĐẠI DIỆN BÊN B",
                            bold: true,
                            size: 24,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "(Ký và ghi họ tên)",
                            size: 20,
                            italics: true,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 1200 },
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: nguoiDaiDien || '.............................................',
                            bold: true,
                            size: 24,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // Footer info
          new Paragraph({
            children: [
              new TextRun({
                text: `Ngày tạo: ${new Date(hopDong.ngayTao || new Date()).toLocaleDateString('vi-VN')}`,
                size: 18,
              }),
            ],
            spacing: { before: 400 },
          }),
        ],
      }],
    });

    // Generate and download Word document
    const buffer = await Packer.toBuffer(doc);
    const uint8Array = new Uint8Array(buffer);
    const blob = new Blob([uint8Array], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    saveAs(blob, `hop-dong-${hopDong.maHopDong}.docx`);
    
    toast.success('Hợp đồng đã được tải xuống dưới định dạng Word.');
  } catch (error) {
    console.error(error);
    toast.error('Không thể tạo tệp tin tải về. Vui lòng thử lại.');
  }
};