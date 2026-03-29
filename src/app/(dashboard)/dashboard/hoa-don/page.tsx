'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useCache } from '@/hooks/use-cache';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ImageUpload } from '@/components/ui/image-upload';
import { HoaDonDataTable } from './table';
import { DeleteConfirmPopover } from '@/components/ui/delete-confirm-popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Receipt, 
  AlertCircle,
  Zap,
  Download,
  CreditCard,
  Camera,
  FileText,
  Copy,
  RefreshCw,
  Users,
  Home,
  Edit,
  Trash2,
  MessageCircle,
  Calendar
} from 'lucide-react';
import { HoaDon, HopDong, Phong, KhachThue } from '@/types';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { generateZaloDeepLink } from '@/lib/zalo-formatter';

// Helper functions for form and dialogs
const getPhongName = (phongId: string | Phong, phongList: Phong[]) => {
  if (!phongId) return 'N/A';
  if (typeof phongId === 'object' && phongId.maPhong) {
    return phongId.maPhong;
  }
  if (typeof phongId === 'string') {
    const phong = phongList.find(p => p._id === phongId);
    return phong?.maPhong || 'N/A';
  }
  return 'N/A';
};

const getKhachThueName = (khachThueId: string | any, khachThueList: KhachThue[]) => {
  if (!khachThueId) return 'N/A';
  if (typeof khachThueId === 'object' && khachThueId) {
    return khachThueId.hoTen || khachThueId.ten || khachThueId.name || 'Khách thuê';
  }
  if (typeof khachThueId === 'string') {
    const khachThue = khachThueList.find(k => k._id === khachThueId);
    return khachThue?.hoTen || 'N/A';
  }
  return 'N/A';
};

const formatCurrency = (amount: number | undefined | null) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

export default function HoaDonPage() {
  const router = useRouter();
  const cache = useCache<{
    hoaDonList: HoaDon[];
    hopDongList: HopDong[];
    phongList: Phong[];
    khachThueList: KhachThue[];
  }>({ key: 'hoa-don-data', duration: 300000 }); // 5 phút
  
  const [hoaDonList, setHoaDonList] = useState<HoaDon[]>([]);
  const [hopDongList, setHopDongList] = useState<HopDong[]>([]);
  const [phongList, setPhongList] = useState<Phong[]>([]);
  const [khachThueList, setKhachThueList] = useState<KhachThue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [isAutoCreating, setIsAutoCreating] = useState(false);
  const [viewingHoaDon, setViewingHoaDon] = useState<HoaDon | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [paymentHoaDon, setPaymentHoaDon] = useState<HoaDon | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  useEffect(() => {
    document.title = 'Quản lý Hóa đơn';
  }, []);

  useEffect(() => {
    fetchData();
  }, []);


  // Debug hopDongList state
  useEffect(() => {
    console.log('hopDongList state updated:', hopDongList);
  }, [hopDongList]);

  const fetchData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      // Thử load từ cache trước (nếu không force refresh)
      if (!forceRefresh) {
        const cachedData = cache.getCache();
        if (cachedData) {
          setHoaDonList(cachedData.hoaDonList || []);
          setHopDongList(cachedData.hopDongList || []);
          setPhongList(cachedData.phongList || []);
          setKhachThueList(cachedData.khachThueList || []);
          setLoading(false);
          return;
        }
      }
      
      // Fetch hóa đơn từ API
      const hoaDonResponse = await fetch('/api/hoa-don');
      const hoaDonData = hoaDonResponse.ok ? await hoaDonResponse.json() : { data: [] };
      const hoaDons = hoaDonData.data || [];
      setHoaDonList(hoaDons);

      // Fetch form data (hop dong, phong, khach thue) từ API
      const formDataResponse = await fetch('/api/hoa-don/form-data');
      if (formDataResponse.ok) {
        const formData = await formDataResponse.json();
        console.log('Form data loaded:', formData.data);
        const hopDongs = formData.data.hopDongList || [];
        const phongs = formData.data.phongList || [];
        const khachThues = formData.data.khachThueList || [];
        
        setHopDongList(hopDongs);
        setPhongList(phongs);
        setKhachThueList(khachThues);
        
        // Lưu vào cache
        cache.setCache({
          hoaDonList: hoaDons,
          hopDongList: hopDongs,
          phongList: phongs,
          khachThueList: khachThues,
        });
      } else {
        console.error('Failed to load form data:', formDataResponse.status);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && hoaDonList.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>)}
        </div>
        <div className="h-96 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  const handleRefresh = async () => {
    cache.setIsRefreshing(true);
    await fetchData(true);
    cache.setIsRefreshing(false);
    toast.success('Dữ liệu hóa đơn đã được cập nhật mới nhất!');
  };

  const filteredHoaDon = hoaDonList.filter(hoaDon => {
    const matchesSearch = hoaDon.maHoaDon.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         hoaDon.ghiChu?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || hoaDon.trangThai === statusFilter;
    const matchesMonth = monthFilter === 'all' || hoaDon.thang.toString() === monthFilter;
    const matchesYear = yearFilter === 'all' || hoaDon.nam.toString() === yearFilter;
    
    return matchesSearch && matchesStatus && matchesMonth && matchesYear;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'chuaThanhToan':
        return <Badge variant="destructive">Chưa thanh toán</Badge>;
      case 'daThanhToanMotPhan':
        return <Badge variant="secondary">Thanh toán một phần</Badge>;
      case 'daThanhToan':
        return <Badge variant="default">Đã thanh toán</Badge>;
      case 'choDuyet':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Chờ duyệt</Badge>;
      case 'quaHan':
        return <Badge variant="outline">Quá hạn</Badge>;
      case 'tuChoi':
        return <Badge variant="destructive" className="bg-red-600">Từ chối</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMonthOptions = () => {
    return Array.from({ length: 12 }, (_, i) => i + 1);
  };

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  };

  const handleEdit = (hoaDon: HoaDon) => {
    console.log('Editing hoa don:', hoaDon);
    router.push(`/dashboard/hoa-don/${hoaDon._id}`);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/hoa-don?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        cache.clearCache();
        setHoaDonList(prev => prev.filter(hoaDon => hoaDon._id !== id));
        toast.success('Đã xóa hóa đơn thành công khỏi hệ thống!');
      } else {
        const errorData = await response.json();
        toast.error('Ồ, chưa xóa được hóa đơn này. ' + (errorData.message || 'Bạn thử lại sau nhé!'));
      }
    } catch (error) {
      toast.error('Lỗi kết nối rồi. Bạn kiểm tra lại mạng nhé!');
    }
  };

  const handleDeleteMultiple = async (ids: string[]) => {
    if (ids.length === 0) return;
    
    try {
      const deletePromises = ids.map(id => 
        fetch(`/api/hoa-don?id=${id}`, { method: 'DELETE' })
      );
      
      const results = await Promise.all(deletePromises);
      const failedDeletes = results.filter(result => !result.ok);
      
      if (failedDeletes.length === 0) {
        cache.clearCache();
        setHoaDonList(prev => prev.filter(hoaDon => !ids.includes(hoaDon._id!)));
        toast.success(`Tuyệt vời! Đã dọn dẹp xong ${ids.length} hóa đơn.`);
      } else {
        toast.error(`Có ${failedDeletes.length} hóa đơn chưa xóa được. Bạn kiểm tra lại nhé!`);
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra khi kết nối. Một số hóa đơn có thể chưa được xóa.');
    }
  };

  const handleView = (hoaDon: HoaDon) => {
    setViewingHoaDon(hoaDon);
    setIsViewDialogOpen(true);
  };

  const handlePayment = (hoaDon: HoaDon) => {
    setPaymentHoaDon(hoaDon);
    setIsPaymentDialogOpen(true);
  };

  const handleCopyLink = (hoaDon: HoaDon) => {
    const publicUrl = `${window.location.origin}/hoa-don/${hoaDon._id}`;
    
    navigator.clipboard.writeText(publicUrl).then(() => {
      toast.success('Đã sao chép link hóa đơn! Bạn có thể gửi cho khách ngay.');
    }).catch(() => {
      // Fallback: hiển thị modal với link
      const modal = document.createElement('div');
      modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;">
          <div style="background: white; padding: 20px; border-radius: 8px; max-width: 500px; width: 90%;">
            <h3 style="margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">Link hóa đơn công khai</h3>
            <p style="margin: 0 0 10px 0; color: #666;">Gửi link này cho khách hàng để họ có thể xem hóa đơn:</p>
            <input type="text" value="${publicUrl}" readonly style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 15px;" />
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
              <button onclick="this.closest('div').remove()" style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">Đóng</button>
              <button onclick="navigator.clipboard.writeText('${publicUrl}').then(() => alert('Đã sao chép!')).catch(() => alert('Không thể sao chép')); this.closest('div').remove();" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Sao chép</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    });
  };

  const handleDownload = (hoaDon: HoaDon) => {
    // Create a simple HTML invoice and download as PDF
    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Hóa đơn ${hoaDon.maHoaDon}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .invoice-info { margin-bottom: 20px; }
          .items { margin: 20px 0; }
          .item { display: flex; justify-content: space-between; margin: 5px 0; }
          .total { border-top: 2px solid #000; padding-top: 10px; margin-top: 20px; }
          .footer { margin-top: 30px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>HÓA ĐƠN THUÊ PHÒNG</h1>
          <p>Mã hóa đơn: ${hoaDon.maHoaDon}</p>
        </div>
        
        <div class="invoice-info">
          <p><strong>Phòng:</strong> ${getPhongName(hoaDon.phong, phongList)}</p>
          <p><strong>Khách thuê:</strong> ${getKhachThueName(hoaDon.khachThue, khachThueList)}</p>
          <p><strong>Tháng/Năm:</strong> ${hoaDon.thang}/${hoaDon.nam}</p>
          <p><strong>Hạn thanh toán:</strong> ${new Date(hoaDon.hanThanhToan).toLocaleDateString('vi-VN')}</p>
        </div>
        
        <div class="items">
          <h3>Chi tiết hóa đơn:</h3>
          <div class="item">
            <span>Tiền phòng</span>
            <span>${formatCurrency(hoaDon.tienPhong)}</span>
          </div>
          <div class="item">
            <span>Tiền điện (${hoaDon.soDien} kWh)</span>
            <span>${formatCurrency(hoaDon.tienDien)}</span>
          </div>
          <div class="item">
            <span>Tiền nước (${hoaDon.soNuoc} m³)</span>
            <span>${formatCurrency(hoaDon.tienNuoc)}</span>
          </div>
          ${hoaDon.phiDichVu.map(phi => `
            <div class="item">
              <span>${phi.ten}</span>
              <span>${formatCurrency(phi.gia)}</span>
            </div>
          `).join('')}
        </div>
        
        <div class="total">
          <div class="item">
            <span><strong>Tổng tiền:</strong></span>
            <span><strong>${formatCurrency(hoaDon.tongTien)}</strong></span>
          </div>
          <div class="item">
            <span>Đã thanh toán:</span>
            <span>${formatCurrency(hoaDon.daThanhToan)}</span>
          </div>
          <div class="item">
            <span>Còn lại:</span>
            <span>${formatCurrency(hoaDon.conLai)}</span>
          </div>
        </div>
        
        <div class="footer">
          <p>Trạng thái: ${hoaDon.trangThai === 'daThanhToan' ? 'Đã thanh toán' : 
                         hoaDon.trangThai === 'daThanhToanMotPhan' ? 'Thanh toán một phần' : 
                         hoaDon.trangThai === 'quaHan' ? 'Quá hạn' :
                         hoaDon.trangThai === 'tuChoi' ? 'Từ chối' : 'Chưa thanh toán'}</p>
          ${hoaDon.ghiChu ? `<p>Ghi chú: ${hoaDon.ghiChu}</p>` : ''}
        </div>
      </body>
      </html>
    `;
    
    const blob = new Blob([invoiceHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hoa-don-${hoaDon.maHoaDon}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleScreenshot = async (hoaDon: HoaDon) => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    const toastId = toast.loading('Đang chuẩn bị PDF...');

    try {
      const printContent = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="utf-8">
          <title>Hóa đơn ${hoaDon.maHoaDon}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #000; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
            .header h1 { font-size: 22px; font-weight: bold; text-transform: uppercase; }
            .header p { font-size: 16px; margin-top: 6px; color: #444; }
            .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
            .box { border: 1px solid #ccc; border-radius: 6px; padding: 12px; }
            .box h3 { font-size: 14px; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 6px; }
            .box p { margin: 4px 0; font-size: 13px; }
            .status-paid { color: #16a34a; font-weight: bold; }
            .status-unpaid { color: #dc2626; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 13px; }
            th { background: #f3f4f6; border: 1px solid #d1d5db; padding: 8px; text-align: left; }
            td { border: 1px solid #d1d5db; padding: 8px; }
            td.right { text-align: right; }
            .summary { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 6px; padding: 12px; margin-bottom: 20px; }
            .summary-row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 13px; }
            .summary-total { font-size: 16px; font-weight: bold; color: #dc2626; }
            .sigs { display: flex; justify-content: space-between; margin-top: 40px; }
            .sig { text-align: center; width: 45%; }
            .sig-line { height: 50px; border-bottom: 1px dashed #ccc; margin-bottom: 6px; }
            .footer { text-align: center; border-top: 1px dashed #ccc; margin-top: 20px; padding-top: 10px; font-size: 11px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Hóa đơn thuê phòng</h1>
            <p>Mã: ${hoaDon.maHoaDon}</p>
          </div>

          <div class="grid2">
            <div class="box">
              <h3>Thông tin khách hàng</h3>
              <p><strong>Phòng:</strong> ${getPhongName(hoaDon.phong, phongList)}</p>
              <p><strong>Khách thuê:</strong> ${getKhachThueName(hoaDon.khachThue, khachThueList)}</p>
              <p><strong>Điện thoại:</strong> ${(hoaDon.khachThue as any)?.soDienThoai || 'N/A'}</p>
            </div>
            <div class="box">
              <h3>Chi tiết kỳ thanh toán</h3>
              <p><strong>Kỳ hóa đơn:</strong> Tháng ${hoaDon.thang}/${hoaDon.nam}</p>
              <p><strong>Hạn đóng tiền:</strong> ${hoaDon.hanThanhToan ? new Date(hoaDon.hanThanhToan).toLocaleDateString('vi-VN') : 'N/A'}</p>
              <p><strong>Trạng thái:</strong> <span class="${hoaDon.trangThai === 'daThanhToan' ? 'status-paid' : 'status-unpaid'}">${hoaDon.trangThai === 'daThanhToan' ? 'Đã thanh toán' : hoaDon.trangThai === 'daThanhToanMotPhan' ? 'Thanh toán một phần' : 'Chưa thanh toán'}</span></p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th width="60%">Nội dung</th>
                <th>Số lượng</th>
                <th>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Tiền phòng</td><td>1</td><td class="right">${formatCurrency(hoaDon.tienPhong)}</td></tr>
              <tr><td>Tiền điện (${hoaDon.soDien || 0} kWh)</td><td>${hoaDon.soDien || 0}</td><td class="right">${formatCurrency(hoaDon.tienDien)}</td></tr>
              <tr><td>Tiền nước (${hoaDon.soNuoc || 0} m³)</td><td>${hoaDon.soNuoc || 0}</td><td class="right">${formatCurrency(hoaDon.tienNuoc || 0)}</td></tr>
              ${(hoaDon.phiDichVu || []).map(phi => `<tr><td>${phi.ten}</td><td>1</td><td class="right">${formatCurrency(phi.gia)}</td></tr>`).join('')}
              <tr style="background:#f3f4f6;font-weight:bold">
                <td colspan="2">TỔNG CỘNG</td>
                <td class="right">${formatCurrency(hoaDon.tongTien)}</td>
              </tr>
            </tbody>
          </table>

          <div class="summary">
            <div class="summary-row"><span>Đã thanh toán:</span><span style="color:#16a34a;font-weight:bold">${formatCurrency(hoaDon.daThanhToan)}</span></div>
            <div class="summary-row summary-total"><span>Còn phải đóng:</span><span>${formatCurrency(hoaDon.conLai)}</span></div>
          </div>

          <div class="sigs">
            <div class="sig"><div class="sig-line"></div><p>Người thuê phòng</p><p style="font-size:11px;color:#888">(Ký và ghi rõ họ tên)</p></div>
            <div class="sig"><div class="sig-line"></div><p>Chủ nhà / Đại diện</p><p style="font-size:11px;color:#888">(Ký và ghi rõ họ tên)</p></div>
          </div>
          <div class="footer"><p>Hóa đơn được khởi tạo tự động từ hệ thống quản lý phòng trọ. Vui lòng giữ lại để đối soát.</p></div>
        </body>
        </html>
      `;

      const printWindow = window.open('', '_blank', 'width=800,height=1000');
      if (!printWindow) {
        toast.error('Trình duyệt đã chặn popup. Vui lòng cho phép popup và thử lại.', { id: toastId });
        return;
      }
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        toast.success('Đã mở cửa sổ in/xuất PDF!', { id: toastId });
      }, 500);
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Không mở được cửa sổ in. Hãy thử lại.', { id: toastId });
    } finally {
      setIsExportingPdf(false);
    }
  };



  const handleAutoCreateInvoices = async () => {
    if (!confirm('Bạn có chắc chắn muốn tạo hóa đơn tự động cho tất cả hợp đồng đang hoạt động?')) {
      return;
    }

    setIsAutoCreating(true);
    try {
      const response = await fetch('/api/auto-invoice', {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Hệ thống đã tự động tạo xong ${result.data.createdInvoices} hóa đơn cho bạn.`);
        if (result.data.errors.length > 0) {
          toast.warning(`Có ${result.data.errors.length} hóa đơn bị lỗi, bạn kiểm tra lại nhé.`);
        }
        fetchData(); // Refresh data
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Chưa tạo được hóa đơn tự động. Có thể do dữ liệu chưa đủ!');
      }
    } catch (error) {
      toast.error('Lỗi kết nối khi tạo hóa đơn tự động.');
    } finally {
      setIsAutoCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="h-96 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">Quản lý hóa đơn</h1>
          <p className="text-xs md:text-sm text-gray-600">Danh sách tất cả hóa đơn trong hệ thống</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={cache.isRefreshing}
            className="flex-1 sm:flex-none"
          >
            <RefreshCw className={`h-4 w-4 sm:mr-2 ${cache.isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{cache.isRefreshing ? 'Đang tải...' : 'Tải mới'}</span>
          </Button>
          <Button size="sm" onClick={() => router.push('/dashboard/hoa-don/them-moi')} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Tạo hóa đơn</span>
            <span className="sm:hidden">Tạo</span>
          </Button>
        </div>
      </div>


      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 md:gap-4 lg:gap-6">
        <Card className="p-2 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-medium text-gray-600 uppercase tracking-wider">Tổng hóa đơn</p>
              <p className="text-base md:text-2xl font-bold">{hoaDonList.length}</p>
            </div>
            <Receipt className="h-3 w-3 md:h-4 md:w-4 text-gray-500" />
          </div>
        </Card>

        <Card className="p-2 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-medium text-gray-600 uppercase tracking-wider">Chưa thanh toán</p>
              <p className="text-base md:text-2xl font-bold text-red-600">
                {hoaDonList.filter(h => h.trangThai === 'chuaThanhToan').length}
              </p>
            </div>
            <Receipt className="h-3 w-3 md:h-4 md:w-4 text-red-600" />
          </div>
        </Card>

        <Card className="p-2 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-medium text-gray-600 uppercase tracking-wider">Quá hạn</p>
              <p className="text-base md:text-2xl font-bold text-orange-600">
                {hoaDonList.filter(h => h.trangThai !== 'daThanhToan' && new Date(h.hanThanhToan) < new Date()).length}
              </p>
            </div>
            <AlertCircle className="h-3 w-3 md:h-4 md:w-4 text-orange-600" />
          </div>
        </Card>

        <Card className="p-2 md:p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs font-medium text-gray-600 uppercase tracking-wider">Doanh thu</p>
              <p className="text-xs md:text-2xl font-bold text-green-600 truncate">
                {formatCurrency(hoaDonList.reduce((sum, h) => sum + h.daThanhToan, 0))}
              </p>
            </div>
            <Receipt className="h-3 w-3 md:h-4 md:w-4 text-green-600 flex-shrink-0" />
          </div>
        </Card>
      </div>

      <Card className={`hidden md:block transition-opacity duration-300 ${loading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        <CardHeader className="relative">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Danh sách hóa đơn</CardTitle>
              <CardDescription>
                {filteredHoaDon.length} hóa đơn được tìm thấy
              </CardDescription>
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Đang cập nhật...
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <HoaDonDataTable
            data={filteredHoaDon}
            phongList={phongList}
            khachThueList={khachThueList}
            onView={handleView}
            onDownload={handleDownload}
            onScreenshot={handleScreenshot}
            onShare={handleCopyLink}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDeleteMultiple={handleDeleteMultiple}
            onPayment={handlePayment}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            monthFilter={monthFilter}
            onMonthChange={setMonthFilter}
            yearFilter={yearFilter}
            onYearChange={setYearFilter}
            getMonthOptions={getMonthOptions}
            getYearOptions={getYearOptions}
          />
        </CardContent>
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Danh sách hóa đơn</h2>
          <div className="flex items-center gap-2">
            {loading && <RefreshCw className="h-3 w-3 animate-spin text-primary" />}
            <span className="text-sm text-gray-500">{filteredHoaDon.length} hóa đơn</span>
          </div>
        </div>
        
        {/* Mobile Filters */}
        <div className="space-y-2 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Tìm kiếm hóa đơn..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-sm">Tất cả</SelectItem>
                <SelectItem value="chuaThanhToan" className="text-sm">Chưa thanh toán</SelectItem>
                <SelectItem value="daThanhToan" className="text-sm">Đã thanh toán</SelectItem>
                <SelectItem value="choDuyet" className="text-sm">Chờ duyệt</SelectItem>
                <SelectItem value="thanhToanMotPhan" className="text-sm">Thanh toán 1 phần</SelectItem>
                <SelectItem value="quaHan" className="text-sm">Quá hạn</SelectItem>
                <SelectItem value="tuChoi" className="text-sm">Từ chối</SelectItem>
              </SelectContent>
            </Select>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Tháng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-sm">Tất cả</SelectItem>
                {getMonthOptions().map(month => (
                  <SelectItem key={month} value={month.toString()} className="text-sm">
                    Tháng {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Năm" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-sm">Tất cả</SelectItem>
                {getYearOptions().map(year => (
                  <SelectItem key={year} value={year.toString()} className="text-sm">
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Mobile Card List */}
        <div className="space-y-3">
          {filteredHoaDon.map((hoaDon) => {
            const isOverdue = new Date(hoaDon.hanThanhToan) < new Date() && hoaDon.trangThai !== 'daThanhToan';
            
            return (
              <Card key={hoaDon._id} className="p-4">
                <div className="space-y-3">
                  {/* Header with invoice code and status */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{hoaDon.maHoaDon}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Home className="h-3 w-3 text-gray-400" />
                        <span className="text-sm text-gray-600">{getPhongName(hoaDon.phong, phongList)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      {getStatusBadge(hoaDon.trangThai)}
                      {isOverdue && (
                        <Badge variant="outline" className="text-xs text-orange-600 border-orange-600">
                          Quá hạn
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Customer and period info */}
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-600">{getKhachThueName(hoaDon.khachThue, khachThueList)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      <span>Tháng {hoaDon.thang}/{hoaDon.nam}</span>
                      <span className="mx-1">•</span>
                      <span>Hạn: {new Date(hoaDon.hanThanhToan).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>

                  {/* Amount info */}
                  <div className="border-t pt-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Tổng tiền:</span>
                        <p className="font-semibold text-blue-600">{formatCurrency(hoaDon.tongTien)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Đã thanh toán:</span>
                        <p className="font-semibold text-green-600">{formatCurrency(hoaDon.daThanhToan)}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Còn lại:</span>
                        <p className="font-semibold text-red-600">{formatCurrency(hoaDon.conLai)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(hoaDon)}
                      className="flex-1"
                    >
                      <FileText className="h-3.5 w-3.5 mr-1" />
                      Xem
                    </Button>
                    {hoaDon.conLai > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePayment(hoaDon)}
                        className="flex-1 text-green-600 hover:bg-green-50"
                      >
                        <CreditCard className="h-3.5 w-3.5 mr-1" />
                        Thanh toán
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyLink(hoaDon)}
                      className="flex-1"
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Link
                    </Button>
                    <a 
                      href={generateZaloDeepLink(hoaDon)} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex-1"
                    >
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full bg-[#0068FF] hover:bg-[#0052CC] text-white"
                      >
                        <MessageCircle className="h-3.5 w-3.5 mr-1" />
                        Zalo
                      </Button>
                    </a>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {filteredHoaDon.length === 0 && (
          <div className="text-center py-8">
            <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Không có hóa đơn nào</p>
          </div>
        )}
      </div>

      {/* View Invoice Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="w-[95vw] md:w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Chi tiết hóa đơn</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Thông tin chi tiết hóa đơn {viewingHoaDon?.maHoaDon}
            </DialogDescription>
          </DialogHeader>
          
          {viewingHoaDon && (
            <div className="space-y-4 md:space-y-6">
              {/* Invoice Header */}
              <div className="text-center border-b pb-3 md:pb-4">
                <h2 className="text-lg md:text-2xl font-bold">HÓA ĐƠN THUÊ PHÒNG</h2>
                <p className="text-base md:text-lg text-gray-600">{viewingHoaDon.maHoaDon}</p>
              </div>

              {/* Invoice Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <h3 className="text-sm md:text-base font-semibold mb-2">Thông tin phòng</h3>
                  <p className="text-xs md:text-sm"><strong>Phòng:</strong> {getPhongName(viewingHoaDon.phong, phongList)}</p>
                  <p className="text-xs md:text-sm"><strong>Khách thuê:</strong> {getKhachThueName(viewingHoaDon.khachThue, khachThueList)}</p>
                  <p className="text-xs md:text-sm"><strong>Hợp đồng:</strong> {
                    hopDongList.find(hd => hd._id === viewingHoaDon.hopDong)?.maHopDong || 'N/A'
                  }</p>
                </div>
                <div>
                  <h3 className="text-sm md:text-base font-semibold mb-2">Thông tin thanh toán</h3>
                  <p className="text-xs md:text-sm"><strong>Tháng/Năm:</strong> {viewingHoaDon.thang}/{viewingHoaDon.nam}</p>
                  <p className="text-xs md:text-sm"><strong>Hạn thanh toán:</strong> {new Date(viewingHoaDon.hanThanhToan).toLocaleDateString('vi-VN')}</p>
                  <p className="text-xs md:text-sm"><strong>Trạng thái:</strong> {getStatusBadge(viewingHoaDon.trangThai)}</p>
                </div>
              </div>

              {/* Chỉ số điện nước */}
              <div>
                <h3 className="text-sm md:text-base font-semibold mb-3">Chỉ số điện nước</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4">
                  <div>
                    <h4 className="font-medium mb-2">Điện</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Chỉ số ban đầu:</span>
                        <span>{viewingHoaDon.chiSoDienBanDau || 0} kWh</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Chỉ số cuối kỳ:</span>
                        <span>{viewingHoaDon.chiSoDienCuoiKy || 0} kWh</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Số điện sử dụng:</span>
                        <span>{viewingHoaDon.soDien || 0} kWh</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Nước</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Chỉ số ban đầu:</span>
                        <span>{viewingHoaDon.chiSoNuocBanDau || 0} m³</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Chỉ số cuối kỳ:</span>
                        <span>{viewingHoaDon.chiSoNuocCuoiKy || 0} m³</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Số nước sử dụng:</span>
                        <span>{viewingHoaDon.soNuoc || 0} m³</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Details */}
              <div>
                <h3 className="text-sm md:text-base font-semibold mb-3">Chi tiết hóa đơn</h3>
                <div className="space-y-2 text-xs md:text-sm">
                  <div className="flex justify-between">
                    <span>Tiền phòng</span>
                    <span>{formatCurrency(viewingHoaDon.tienPhong)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tiền điện ({viewingHoaDon.soDien} kWh)</span>
                    <span>{formatCurrency(viewingHoaDon.tienDien)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tiền nước ({viewingHoaDon.soNuoc} m³)</span>
                    <span>{formatCurrency(viewingHoaDon.tienNuoc)}</span>
                  </div>
                  {viewingHoaDon.phiDichVu.map((phi, index) => (
                    <div key={index} className="flex justify-between">
                      <span>{phi.ten}</span>
                      <span>{formatCurrency(phi.gia)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="border-t pt-3 md:pt-4">
                <div className="flex justify-between text-base md:text-lg font-semibold">
                  <span>Tổng tiền:</span>
                  <span>{formatCurrency(viewingHoaDon.tongTien)}</span>
                </div>
                <div className="flex justify-between text-xs md:text-sm">
                  <span>Đã thanh toán:</span>
                  <span className="text-green-600">{formatCurrency(viewingHoaDon.daThanhToan)}</span>
                </div>
                <div className="flex justify-between text-xs md:text-sm">
                  <span>Còn lại:</span>
                  <span className={viewingHoaDon.conLai > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                    {formatCurrency(viewingHoaDon.conLai)}
                  </span>
                </div>
              </div>

              {/* Notes */}
              {viewingHoaDon.ghiChu && (
                <div>
                  <h3 className="text-sm md:text-base font-semibold mb-2">Ghi chú</h3>
                  <p className="text-xs md:text-sm text-gray-600">{viewingHoaDon.ghiChu}</p>
                </div>
              )}

              {/* Actions */}
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsViewDialogOpen(false)} className="w-full sm:w-auto">
                  Đóng
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleCopyLink(viewingHoaDon)} className="w-full sm:w-auto">
                  <Copy className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                  Copy link
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDownload(viewingHoaDon)} className="w-full sm:w-auto">
                  <Download className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                  Tải HTML
                </Button>
                <Button size="sm" onClick={() => handleScreenshot(viewingHoaDon)} className="w-full sm:w-auto">
                  <Camera className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                  Xuất PDF
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="w-[95vw] md:w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Xác nhận thanh toán</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Tạo thanh toán cho hóa đơn {paymentHoaDon?.maHoaDon}
            </DialogDescription>
          </DialogHeader>
          
      {paymentHoaDon && (
            <PaymentForm 
              hoaDon={paymentHoaDon}
              onClose={() => setIsPaymentDialogOpen(false)}
              onSuccess={async (updatedHoaDon) => {
                setIsPaymentDialogOpen(false);
                // Force-refresh để lấy trạng thái mới nhất từ server
                cache.clearCache();
                await fetchData(true);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Payment Form Component
function PaymentForm({ 
  hoaDon, 
  onClose, 
  onSuccess 
}: { 
  hoaDon: HoaDon;
  onClose: () => void;
  onSuccess: (updatedHoaDon?: HoaDon) => void;
}) {
  const [formData, setFormData] = useState({
    soTien: hoaDon.conLai,
    phuongThuc: 'tienMat' as 'tienMat' | 'chuyenKhoan' | 'viDienTu',
    nganHang: '',
    soGiaoDich: '',
    ngayThanhToan: new Date().toISOString().split('T')[0],
    ghiChu: '',
    anhBienLai: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) {
      toast.warning('Ảnh biên lai đang được upload, vui lòng đợi...');
      return;
    }
    setSubmitting(true);
    
    try {
      const requestData = {
        hoaDonId: hoaDon._id,
        soTien: formData.soTien,
        phuongThuc: formData.phuongThuc,
        thongTinChuyenKhoan: formData.phuongThuc === 'chuyenKhoan' ? {
          nganHang: formData.nganHang,
          soGiaoDich: formData.soGiaoDich
        } : undefined,
        ngayThanhToan: formData.ngayThanhToan,
        ghiChu: formData.ghiChu,
        anhBienLai: formData.anhBienLai
      };
      
      const response = await fetch('/api/thanh-toan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(result.message || 'Thanh toán đã được ghi nhận thành công!');
        onSuccess(result.data?.hoaDon);
      } else {
        toast.error(result.message || 'Có lỗi xảy ra khi thanh toán');
      }
    } catch (error) {
      console.error('Error submitting payment:', error);
      toast.error('Lỗi kết nối khi tạo thanh toán');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Thông tin hóa đơn */}
      <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
        <h3 className="text-sm md:text-base font-semibold mb-3">Thông tin hóa đơn</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
          <div>
            <span className="text-gray-600">Mã hóa đơn:</span>
            <div className="font-medium">{hoaDon.maHoaDon}</div>
          </div>
          <div>
            <span className="text-gray-600">Tháng/Năm:</span>
            <div className="font-medium">{hoaDon.thang}/{hoaDon.nam}</div>
          </div>
          <div>
            <span className="text-gray-600">Tổng tiền:</span>
            <div className="font-medium">{formatCurrency(hoaDon.tongTien)}</div>
          </div>
          <div>
            <span className="text-gray-600">Đã thanh toán:</span>
            <div className="font-medium text-green-600">{formatCurrency(hoaDon.daThanhToan)}</div>
          </div>
          <div className="col-span-2">
            <span className="text-gray-600">Còn lại:</span>
            <div className="font-medium text-red-600 text-lg">{formatCurrency(hoaDon.conLai)}</div>
          </div>
        </div>
      </div>

      {/* Form thanh toán */}
      {/* VietQR tĩnh - nếu có */}
      {hoaDon.checkoutUrl && hoaDon.conLai > 0 && (
        <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-3 md:p-4 space-y-3">
          <h3 className="text-sm md:text-base font-semibold text-emerald-800 flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Mã QR thanh toán (VietQR)
          </h3>
          <p className="text-xs text-emerald-700">
            Gửi link hoặc ảnh QR này cho khách thuê để họ quét và chuyển khoản trực tiếp vào tài khoản của bạn.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <img 
              src={hoaDon.checkoutUrl} 
              alt="Mã QR thanh toán VietQR"
              className="w-40 h-40 object-contain border rounded-lg bg-white p-1"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="flex-1 space-y-2 w-full">
              <p className="text-xs text-gray-500">Link QR:</p>
              <div className="flex items-center gap-2">
                <input 
                  readOnly 
                  value={hoaDon.checkoutUrl} 
                  className="text-xs border rounded px-2 py-1 flex-1 bg-white truncate"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(hoaDon.checkoutUrl || '');
                    toast.success('Đã sao chép link QR!');
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-xs text-gray-400 italic">
                Sau khi khách chuyển tiền, bấm &quot;Xác nhận thanh toán&quot; bên dưới để cập nhật trạng thái.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Form thanh toán thủ công */}
      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        <div className="space-y-2">
          <Label htmlFor="soTien" className="text-xs md:text-sm">Số tiền thanh toán (VNĐ) *</Label>
          <Input
            id="soTien"
            type="number"
            min="1"
            max={hoaDon.conLai}
            value={formData.soTien}
            onChange={(e) => setFormData(prev => ({ ...prev, soTien: parseInt(e.target.value) || 0 }))}
            required
            className="text-base md:text-lg"
          />
          <div className="text-[10px] md:text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md">
            💰 Tối đa có thể thanh toán: <span className="font-semibold">{formatCurrency(hoaDon.conLai)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phuongThuc" className="text-xs md:text-sm">Phương thức thanh toán *</Label>
          <Select value={formData.phuongThuc} onValueChange={(value) => setFormData(prev => ({ ...prev, phuongThuc: value as 'tienMat' | 'chuyenKhoan' | 'viDienTu' }))}>
            <SelectTrigger className="h-10 md:h-12 text-sm">
              <SelectValue placeholder="Chọn phương thức thanh toán" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tienMat" className="text-sm">💵 Tiền mặt</SelectItem>
              <SelectItem value="chuyenKhoan" className="text-sm">🏦 Chuyển khoản</SelectItem>
              <SelectItem value="viDienTu" className="text-sm">📱 Ví điện tử</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.phuongThuc === 'chuyenKhoan' && (
          <div className="space-y-3 md:space-y-4 p-3 md:p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="text-xs md:text-sm font-semibold text-green-800 flex items-center gap-2">
              🏦 Thông tin chuyển khoản
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div className="space-y-2">
                <Label htmlFor="nganHang" className="text-xs md:text-sm">Ngân hàng</Label>
                <Input
                  id="nganHang"
                  value={formData.nganHang}
                  onChange={(e) => setFormData(prev => ({ ...prev, nganHang: e.target.value }))}
                  placeholder="Ví dụ: Vietcombank, BIDV..."
                  className="text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="soGiaoDich" className="text-xs md:text-sm">Số giao dịch/Mã tham chiếu</Label>
                <Input
                  id="soGiaoDich"
                  value={formData.soGiaoDich}
                  onChange={(e) => setFormData(prev => ({ ...prev, soGiaoDich: e.target.value }))}
                  placeholder="Mã giao dịch từ ngân hàng"
                  className="text-sm"
                />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <div className="space-y-2">
            <Label htmlFor="ngayThanhToan" className="text-xs md:text-sm">Ngày thanh toán *</Label>
            <Input
              id="ngayThanhToan"
              type="date"
              value={formData.ngayThanhToan}
              onChange={(e) => setFormData(prev => ({ ...prev, ngayThanhToan: e.target.value }))}
              required
              className="h-10 md:h-12 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ghiChu" className="text-xs md:text-sm">Ghi chú</Label>
            <Input
              id="ghiChu"
              value={formData.ghiChu}
              onChange={(e) => setFormData(prev => ({ ...prev, ghiChu: e.target.value }))}
              placeholder="Ghi chú về giao dịch..."
              className="h-10 md:h-12 text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs md:text-sm">Ảnh biên lai thanh toán</Label>
          <ImageUpload
            imageUrl={formData.anhBienLai}
            onImageChange={(url) => setFormData(prev => ({ ...prev, anhBienLai: url }))}
            placeholder="Chọn ảnh biên lai thanh toán"
            onUploadingChange={setUploading}
          />
          <div className="text-[10px] md:text-xs text-gray-500">
            📷 Tải lên ảnh biên lai để xác nhận giao dịch (tùy chọn)
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 md:pt-6 border-t">
          <Button 
            type="button" 
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={submitting}
            className="w-full sm:w-auto sm:min-w-[100px]"
          >
            Hủy
          </Button>
          <Button 
            type="submit"
            size="sm"
            disabled={submitting || uploading}
            className="w-full sm:w-auto sm:min-w-[160px]"
          >
            <CreditCard className="h-3 w-3 md:h-4 md:w-4 mr-2" />
            {submitting ? 'Đang xử lý...' : uploading ? 'Đang upload ảnh...' : 'Xác nhận thanh toán'}
          </Button>
        </DialogFooter>
      </form>
    </div>
  );
}

