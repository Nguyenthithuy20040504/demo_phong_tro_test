'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Receipt, Search, Filter, ArrowUpRight, ChevronLeft, ChevronRight, FileDown, FileSpreadsheet, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

export default function SaaSInvoicesPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchPayments();
  }, [currentPage, debouncedSearch]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/saas/payments?page=${currentPage}&limit=${limit}&q=${debouncedSearch}`);
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      
      if (data && Array.isArray(data.payments)) {
        setPayments(data.payments);
        setTotalPages(data.totalPages || 1);
      } else {
        setPayments([]);
        setTotalPages(1);
      }
    } catch (error) {
      toast.error('Lỗi khi tải lịch sử hóa đơn.');
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    const statusLabel = newStatus === 'daThanhToan' ? 'Thành công' : 'Hủy';
    if (!confirm(`Bạn có chắc muốn chuyển trạng thái hóa đơn này thành "${statusLabel}"?`)) return;

    try {
      const res = await fetch('/api/admin/saas/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, trangThai: newStatus }),
      });

      if (res.ok) {
        toast.success(`Đã cập nhật trạng thái thành "${statusLabel}"`);
        fetchPayments();
      } else {
        toast.error('Cập nhật thất bại');
      }
    } catch (error) {
      toast.error('Lỗi khi cập nhật trạng thái.');
    }
  };

  const handleExportExcel = async () => {
    try {
      toast.loading('Đang chuẩn bị dữ liệu Excel...');
      const res = await fetch(`/api/admin/saas/payments?all=true&q=${debouncedSearch}`);
      const data = await res.json();
      const allPayments = data.payments || [];

      if (allPayments.length === 0) {
        toast.dismiss();
        toast.error('Không có dữ liệu để xuất.');
        return;
      }

      const excelData = allPayments.map((p: any) => ({
        'Chủ nhà': p.chuNha?.name || p.chuNha?.ten || 'N/A',
        'Email': p.chuNha?.email || 'N/A',
        'Gói cước': p.goiDichVu?.ten || 'N/A',
        'Ngày thanh toán': new Date(p.ngayThanhToan).toLocaleDateString('vi-VN'),
        'Số tiền': p.soTien,
        'Phương thức': p.phuongThuc === 'chuyenKhoan' ? 'Chuyển khoản' : p.phuongThuc === 'tienMat' ? 'Tiền mặt' : 'Ví điện tử',
        'Trạng thái': p.trangThai === 'daThanhToan' ? 'Thành công' : 'Chờ duyệt',
        'Hết hạn mới': p.ngayHetHanMoi ? new Date(p.ngayHetHanMoi).toLocaleDateString('vi-VN') : 'Đang xử lý...'
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Setup column widths
      const wscols = [
        { wch: 25 }, // Chủ nhà
        { wch: 30 }, // Email
        { wch: 15 }, // Gói cước
        { wch: 15 }, // Ngày thanh toán
        { wch: 15 }, // Số tiền
        { wch: 15 }, // Phương thức
        { wch: 15 }, // Trạng thái
        { wch: 15 }  // Hết hạn mới
      ];
      worksheet['!cols'] = wscols;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "HoaDonSaaS");
      XLSX.writeFile(workbook, `BaoCao_SaaS_${new Date().getTime()}.xlsx`);
      
      toast.dismiss();
      toast.success('Đã xuất Excel thành công!');
    } catch (error) {
      toast.dismiss();
      toast.error('Lỗi khi xuất dữ liệu Excel.');
    }
  };

  const handleExportPDF = async () => {
    try {
      toast.loading('Đang chuẩn bị dữ liệu PDF...');
      const res = await fetch(`/api/admin/saas/payments?all=true&q=${debouncedSearch}`);
      const data = await res.json();
      const allPayments = data.payments || [];

      if (allPayments.length === 0) {
        toast.dismiss();
        toast.error('Không có dữ liệu để xuất.');
        return;
      }

      // Create isolated environment using an iframe to avoid global OKLCH/LAB styles
      const iframe = document.createElement('iframe');
      iframe.style.visibility = 'hidden';
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      document.body.appendChild(iframe);
      
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Could not create iframe doc');

      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { 
              background-color: #ffffff; 
              margin: 0;
              padding: 40px; 
              color: #333; 
              font-family: Arial, sans-serif; 
            }
            .header { text-align: center; margin-bottom: 30px; }
            .title { font-size: 28px; font-weight: bold; margin: 0; color: #000; }
            .date { font-size: 16px; margin: 10px 0 0 0; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #2563eb; color: #ffffff; padding: 12px; border: 1px solid #ddd; text-align: left; }
            td { padding: 10px; border: 1px solid #ddd; }
            .owner-name { font-weight: bold; }
            .owner-email { font-size: 12px; color: #666; }
            .amount { font-weight: bold; color: #059669; }
            .footer { margin-top: 30px; text-align: right; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">BÁO CÁO HÓA ĐƠN SAAS</h1>
            <p class="date">Ngày xuất: ${new Date().toLocaleString('vi-VN')}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Chủ nhà</th>
                <th>Gói cước</th>
                <th>Ngày thanh toán</th>
                <th>Số tiền</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              ${allPayments.map((p: any) => `
                <tr>
                  <td>
                    <div class="owner-name">${p.chuNha?.name || p.chuNha?.ten || 'N/A'}</div>
                    <div class="owner-email">${p.chuNha?.email || ''}</div>
                  </td>
                  <td>${p.goiDichVu?.ten || 'N/A'}</td>
                  <td>${new Date(p.ngayThanhToan).toLocaleDateString('vi-VN')}</td>
                  <td class="amount">${p.soTien.toLocaleString('vi-VN')} đ</td>
                  <td>${p.trangThai === 'daThanhToan' ? 'Thành công' : 'Chờ duyệt'}</td>
                  <td>${p.ngayHetHanMoi ? new Date(p.ngayHetHanMoi).toLocaleDateString('vi-VN') : 'Đang xử lý...'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            <p>Tổng số bản ghi: ${allPayments.length}</p>
          </div>
        </body>
        </html>
      `;

      iframeDoc.write(fullHtml);
      iframeDoc.close();

      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(iframeDoc.body, { 
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      document.body.removeChild(iframe);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 190; // A4 width - padding
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 10; // Margin top

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`BaoCao_SaaS_${new Date().getTime()}.pdf`);
      
      toast.dismiss();
      toast.success('Đã xuất PDF thành công!');
    } catch (error) {
      console.error('PDF Export Error:', error);
      toast.dismiss();
      toast.error('Lỗi khi xuất dữ liệu PDF.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Hóa đơn Gia hạn SaaS</h1>
        <p className="text-muted-foreground">Theo dõi lịch sử nộp tiền mua gói của các Chủ trọ.</p>
      </div>

      <div className="flex items-center gap-4 justify-between bg-background/50 p-2 rounded-lg border">
         <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
               placeholder="Tìm theo tên hoặc email chủ trọ..."
               className="pl-9"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>
         <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExportPDF}>
                <FileDown className="h-4 w-4" /> Xuất PDF
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExportExcel}>
                <FileSpreadsheet className="h-4 w-4" /> Xuất Excel
            </Button>
         </div>
      </div>

      <Card className="premium-card">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chủ nhà</TableHead>
                <TableHead>Gói cước</TableHead>
                <TableHead>Ngày thanh toán</TableHead>
                <TableHead>Số tiền</TableHead>
                <TableHead>Phương thức</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Hết hạn mới</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <div className="flex justify-center items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      Đang tải dữ liệu...
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {payments.map((payment) => (
                    <TableRow key={payment._id}>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                            <span className="font-bold">{payment.chuNha?.name || payment.chuNha?.ten || 'Chủ trọ ẩn danh'}</span>
                            <span className="text-xs text-muted-foreground">{payment.chuNha?.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{payment.goiDichVu?.ten || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(payment.ngayThanhToan).toLocaleDateString('vi-VN')}
                      </TableCell>
                      <TableCell className="font-bold text-emerald-600">
                        {payment.soTien?.toLocaleString('vi-VN')} đ
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <ArrowUpRight className="h-3 w-3" />
                            {payment.phuongThuc === 'chuyenKhoan' ? 'Chuyển khoản' : payment.phuongThuc === 'tienMat' ? 'Tiền mặt' : 'Ví điện tử'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={payment.trangThai === 'daThanhToan' ? 'default' : 'secondary'}
                          className={payment.trangThai === 'daThanhToan' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                        >
                          {payment.trangThai === 'daThanhToan' ? 'Thành công' : 'Chờ duyệt'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 font-medium">
                            {payment.ngayHetHanMoi ? new Date(payment.ngayHetHanMoi).toLocaleDateString('vi-VN') : 'Đang xử lý...'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {payment.trangThai === 'choDuyet' && (
                          <div className="flex items-center gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => handleUpdateStatus(payment._id, 'daThanhToan')}
                              title="Duyệt - Xác nhận đã thanh toán"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleUpdateStatus(payment._id, 'daHuy')}
                              title="Hủy hóa đơn"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {payments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                        Không có lịch sử giao dịch nào được tìm thấy.
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 px-2">
              <p className="text-sm text-muted-foreground">
                Trang {currentPage} trên {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || loading}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" /> Trước
                </Button>
                
                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, i) => (
                    <Button
                      key={i + 1}
                      variant={currentPage === i + 1 ? "default" : "outline"}
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => setCurrentPage(i + 1)}
                      disabled={loading}
                    >
                      {i + 1}
                    </Button>
                  )).slice(Math.max(0, currentPage - 2), Math.min(totalPages, currentPage + 1))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || loading}
                  className="gap-1"
                >
                  Sau <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
