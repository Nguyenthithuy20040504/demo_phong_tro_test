'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useCache } from '@/hooks/use-cache';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  FileText, 
  Calendar,
  Download,
  Edit,
  X as CloseIcon,
  RefreshCw,
  Search,
  Trash2,
  Users,
  Building2,
  Home
} from 'lucide-react';
import { HopDong, Phong, KhachThue, ToaNha } from '@/types';
import { HopDongDataTable } from './table';
import { toast } from 'sonner';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

export default function HopDongPage() {
  const router = useRouter();
  const cache = useCache<{
    hopDongList: HopDong[];
    phongList: Phong[];
    khachThueList: KhachThue[];
    toaNhaList: ToaNha[];
  }>({ key: 'hop-dong-data', duration: 300000 }); // 5 phút
  
  const [hopDongList, setHopDongList] = useState<HopDong[]>([]);
  const [phongList, setPhongList] = useState<Phong[]>([]);
  const [khachThueList, setKhachThueList] = useState<KhachThue[]>([]);
  const [toaNhaList, setToaNhaList] = useState<ToaNha[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [toaNhaFilter, setToaNhaFilter] = useState<string>('all');
  const [viewingHopDong, setViewingHopDong] = useState<HopDong | null>(null);
  const [extendingHopDong, setExtendingHopDong] = useState<HopDong | null>(null);
  const [cancellingHopDong, setCancellingHopDong] = useState<HopDong | null>(null);
  const [newEndDate, setNewEndDate] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Quản lý Hợp đồng';
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      // Thử load từ cache trước (nếu không force refresh)
      if (!forceRefresh) {
        const cachedData = cache.getCache();
        if (cachedData) {
          setHopDongList(cachedData.hopDongList || []);
          setPhongList(cachedData.phongList || []);
          setKhachThueList(cachedData.khachThueList || []);
          setToaNhaList(cachedData.toaNhaList || []);
          setLoading(false);
          return;
        }
      }
      
      // Fetch hop dong data
      const hopDongResponse = await fetch('/api/hop-dong?limit=100');
      const hopDongData = hopDongResponse.ok ? await hopDongResponse.json() : { data: [] };
      const hopDongs = hopDongData.data || [];
      setHopDongList(hopDongs);

      // Fetch phong data
      const phongResponse = await fetch('/api/phong?limit=100');
      const phongData = phongResponse.ok ? await phongResponse.json() : { data: [] };
      const phongs = phongData.data || [];
      setPhongList(phongs);

      // Fetch khach thue data
      const khachThueResponse = await fetch('/api/khach-thue?limit=100');
      const khachThueData = khachThueResponse.ok ? await khachThueResponse.json() : { data: [] };
      const khachThues = khachThueData.data || [];
      setKhachThueList(khachThues);

      // Fetch toa nha data
      const toaNhaResponse = await fetch('/api/toa-nha?limit=100');
      const toaNhaData = toaNhaResponse.ok ? await toaNhaResponse.json() : { data: [] };
      const toaNhas = toaNhaData.data || [];
      setToaNhaList(toaNhas);

      // Lưu vào cache
      cache.setCache({
        hopDongList: hopDongs,
        phongList: phongs,
        khachThueList: khachThues,
        toaNhaList: toaNhas,
      });

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && hopDongList.length === 0) {
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
    toast.success('Dữ liệu hợp đồng đã được cập nhật mới nhất!');
  };


  const filteredHopDong = hopDongList.filter(hopDong => {
    const matchesSearch = hopDong.maHopDong.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         hopDong.dieuKhoan.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || hopDong.trangThai === statusFilter;
    
    // Filter by toa nha
    let matchesToaNha = true;
    if (toaNhaFilter !== 'all') {
      let hopDongToaNhaId = null;
      
      // Xử lý khi hopDong.phong là object (đã populate)
      if (typeof hopDong.phong === 'object' && hopDong.phong !== null) {
        const phongObj = hopDong.phong as any;
        hopDongToaNhaId = typeof phongObj.toaNha === 'object' && phongObj.toaNha !== null 
          ? phongObj.toaNha._id 
          : phongObj.toaNha;
      } else {
        // Xử lý khi hopDong.phong chỉ là chuỗi ID
        const phong = phongList.find(p => p._id === hopDong.phong);
        if (phong) {
          hopDongToaNhaId = typeof phong.toaNha === 'object' && phong.toaNha !== null 
            ? (phong.toaNha as any)._id 
            : phong.toaNha;
        }
      }
      
      matchesToaNha = hopDongToaNhaId === toaNhaFilter;
    }
    
    return matchesSearch && matchesStatus && matchesToaNha;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'hoatDong':
        return <Badge variant="default">Hoạt động</Badge>;
      case 'hetHan':
        return <Badge variant="destructive">Hết hạn</Badge>;
      case 'daHuy':
        return <Badge variant="secondary">Đã hủy</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPhongName = (phong: string | { maPhong: string }) => {
    if (typeof phong === 'object' && phong?.maPhong) {
      return phong.maPhong;
    }
    const phongObj = phongList.find(p => p._id === phong);
    return phongObj?.maPhong || 'Không xác định';
  };

  const getToaNhaName = (toaNha: string | { tenToaNha: string }) => {
    if (typeof toaNha === 'object' && toaNha?.tenToaNha) {
      return toaNha.tenToaNha;
    }
    const toaNhaObj = toaNhaList.find(t => t._id === toaNha);
    return toaNhaObj?.tenToaNha || 'Không xác định';
  };

  const getPhongInfo = (phong: string | { maPhong: string; toaNha?: { tenToaNha: string } }) => {
    if (typeof phong === 'object' && phong?.maPhong) {
      return {
        maPhong: phong.maPhong,
        toaNha: phong.toaNha?.tenToaNha || 'Không xác định'
      };
    }
    
    const phongObj = phongList.find(p => p._id === phong);
    if (!phongObj) return { maPhong: 'Không xác định', toaNha: 'Không xác định' };
    
    const toaNha = toaNhaList.find(t => t._id === phongObj.toaNha);
    return {
      maPhong: phongObj.maPhong,
      toaNha: toaNha?.tenToaNha || 'Không xác định'
    };
  };

  const getKhachThueName = (khachThue: string | { hoTen: string }) => {
    if (typeof khachThue === 'object' && khachThue?.hoTen) {
      return khachThue.hoTen;
    }
    const khachThueObj = khachThueList.find(k => k._id === khachThue);
    return khachThueObj?.hoTen || 'Không xác định';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const isExpiringSoon = (ngayKetThuc: Date | string) => {
    const today = new Date();
    const endDate = new Date(ngayKetThuc);
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  };

  const isExpired = (ngayKetThuc: Date | string) => {
    const today = new Date();
    const endDate = new Date(ngayKetThuc);
    return endDate < today;
  };

  const handleEdit = (hopDong: HopDong) => {
    router.push(`/dashboard/hop-dong/${hopDong._id}`);
  };

  const handleView = (hopDong: HopDong) => {
    setViewingHopDong(hopDong);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/hop-dong/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        cache.clearCache();
        setHopDongList(prev => prev.filter(hopDong => hopDong._id !== id));
        toast.success('Đã xóa hợp đồng thành công khỏi hệ thống!');
      } else {
        toast.error('Ồ, không xóa được hợp đồng này. Bạn thử lại sau nhé!');
      }
    } catch (error) {
      toast.error('Lỗi kết nối rồi. Bạn kiểm tra lại mạng nhé!');
    }
  };

  const handleDownload = async (hopDong: HopDong) => {
    try {
      const phongInfo = getPhongInfo(hopDong.phong);
      const nguoiDaiDien = getKhachThueName(hopDong.nguoiDaiDien);
      
      const nguoiDaiDienObj = khachThueList.find(kt => {
        const ktId = typeof kt._id === 'object' ? (kt._id as { _id: string })._id : kt._id;
        const daiDienId = typeof hopDong.nguoiDaiDien === 'object' ? (hopDong.nguoiDaiDien as { _id: string })._id : hopDong.nguoiDaiDien;
        return ktId === daiDienId;
      });
      
      const ngayBatDau = new Date(hopDong.ngayBatDau);
      const ngayKetThuc = new Date(hopDong.ngayKetThuc);
      const ngayHienTai = new Date();
      
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
                  text: "Ông/bà: ................................................................................. Sinh ngày: .................................",
                  size: 20,
                }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Nơi đăng ký hộ khẩu thường trú: ....................................................................................................",
                  size: 20,
                }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "CMND (CCCD) số: .......................................... cấp ngày: ............................. tại: .............................",
                  size: 20,
                }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Số điện thoại liên hệ: .......................................................................................................................",
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
                  text: `Ông/bà: ................................................................................. Sinh ngày: .................................`,
                  size: 20,
                }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Nơi đăng ký hộ khẩu thường trú: ....................................................................................................`,
                  size: 20,
                }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Số CMND (CCCD): .......................................... cấp ngày: ............................. tại: .............................`,
                  size: 20,
                }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Số điện thoại liên hệ: .......................................................................................................................`,
                  size: 20,
                }),
              ],
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
                  text: `Hình thức thanh toán: Hàng ${hopDong.chuKyThanhToan === 'thang' ? 'tháng' : hopDong.chuKyThanhToan === 'quy' ? 'quý' : 'năm'} - ngày ${hopDong.ngayThanhToan}`,
                  size: 20,
                }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Tiền điện: ${formatCurrency(hopDong.giaDien)}/kWh tính theo chỉ số công tơ, thanh toán vào cuối các tháng.`,
                  size: 20,
                }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Tiền nước: ${formatCurrency(hopDong.giaNuoc)}/m³ thanh toán vào cuối các tháng.`,
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
                  text: `Hợp đồng có giá trị kể từ ngày ${ngayBatDau.getDate()} tháng ${ngayBatDau.getMonth() + 1} năm ${ngayBatDau.getFullYear()} đến ngày ${ngayKetThuc.getDate()} tháng ${ngayKetThuc.getMonth() + 1} năm ${ngayKetThuc.getFullYear()}.`,
                  size: 20,
                }),
              ],
              spacing: { after: 400 },
            }),
            
            // Responsibilities
            new Paragraph({
              children: [
                new TextRun({
                  text: "TRÁCH NHIỆM CỦA CÁC BÊN",
                  bold: true,
                  size: 24,
                }),
              ],
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "* Trách nhiệm của bên A:",
                  bold: true,
                  size: 20,
                }),
              ],
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "- Tạo mọi điều kiện thuận lợi để bên B thực hiện theo hợp đồng.",
                  size: 20,
                }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "- Cung cấp nguồn điện, nước đầy đủ cho bên B sử dụng.",
                  size: 20,
                }),
              ],
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "* Trách nhiệm của bên B:",
                  bold: true,
                  size: 20,
                }),
              ],
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "- Thanh toán đầy đủ tiền theo đúng thỏa thuận.",
                  size: 20,
                }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "- Bảo quản các trang thiết bị và cơ sở vật chất của bên A trang bị cho ban đầu (làm hỏng phải sửa, mất phải đền).",
                  size: 20,
                }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "- Không được tự ý sửa chữa, cải tạo cơ sở vật chất khi chưa được sự đồng ý của bên A.",
                  size: 20,
                }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "- Luôn có ý thức giữ gìn vệ sinh trong và ngoài khu vực phòng trọ.",
                  size: 20,
                }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "- Bên B phải chấp hành mọi quy định của pháp luật Nhà nước và quy định của địa phương.",
                  size: 20,
                }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "- Nếu bên B cho khách ở qua đêm thì phải báo trước và được sự đồng ý của bên A, đồng thời phải chịu trách nhiệm về các hành vi vi phạm pháp luật của khách trong thời gian ở lại (nếu có).",
                  size: 20,
                }),
              ],
              spacing: { after: 400 },
            }),
            
            // Common responsibilities
            new Paragraph({
              children: [
                new TextRun({
                  text: "TRÁCH NHIỆM CHUNG",
                  bold: true,
                  size: 24,
                }),
              ],
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "- Hai bên phải tạo điều kiện thuận lợi cho nhau để thực hiện hợp đồng.",
                  size: 20,
                }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "- Nếu một trong hai bên vi phạm hợp đồng trong thời gian hợp đồng vẫn còn hiệu lực thì bên còn lại có quyền đơn phương chấm dứt hợp đồng thuê nhà trọ. Ngoài ra, nếu hành vi vi phạm đó gây tổn thất cho bên bị vi phạm thì bên vi phạm sẽ phải bồi thường mọi thiệt hại đã gây ra.",
                  size: 20,
                }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "- Trong trường hợp muốn chấm dứt hợp đồng trước thời hạn, cần phải báo trước cho bên kia ít nhất 30 ngày và hai bên phải có sự thống nhất với nhau.",
                  size: 20,
                }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "- Kết thúc hợp đồng, Bên A phải trả lại đầy đủ tiền đặt cọc cho bên B.",
                  size: 20,
                }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "- Bên nào vi phạm các điều khoản chung thì phải chịu trách nhiệm trước pháp luật.",
                  size: 20,
                }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "- Hợp đồng này được lập thành 02 bản và có giá trị pháp lý như nhau, mỗi bên giữ một bản.",
                  size: 20,
                }),
              ],
              spacing: { after: 400 },
            }),
            
            // Additional tokens/services if any
            ...(hopDong.phiDichVu.length > 0 ? [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "PHÍ DỊCH VỤ BỔ SUNG:",
                    bold: true,
                    size: 24,
                  }),
                ],
                spacing: { after: 200 },
              }),
              ...hopDong.phiDichVu.map(phi => 
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `- ${phi.ten}: ${formatCurrency(phi.gia)}`,
                      size: 20,
                    }),
                  ],
                  spacing: { after: 100 },
                })
              ),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "",
                    size: 20,
                  }),
                ],
                spacing: { after: 200 },
              }),
            ] : []),
            
            // Custom clauses provided by user
            new Paragraph({
              children: [
                new TextRun({
                  text: "ĐIỀU KHOẢN HỢP ĐỒNG THUÊ PHÒNG",
                  bold: true,
                  size: 24,
                }),
              ],
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "1. BÊN CHO THUÊ (Chủ nhà):",
                  bold: true,
                  size: 20,
                }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "- Cung cấp phòng ở đầy đủ tiện nghi theo thỏa thuận\n- Đảm bảo an ninh, an toàn cho khách thuê\n- Bảo trì, sửa chữa các hư hỏng do hao mòn tự nhiên",
                  size: 20,
                }),
              ],
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "2. BÊN THUÊ (Khách thuê):",
                  bold: true,
                  size: 20,
                }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "- Thanh toán đúng hạn tiền thuê và các chi phí khác\n- Sử dụng phòng đúng mục đích, giữ gìn vệ sinh\n- Không được cải tạo, sửa chữa phòng mà không có sự đồng ý\n- Báo cáo kịp thời các hư hỏng, sự cố",
                  size: 20,
                }),
              ],
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "3. ĐIỀU KHOẢN CHUNG:",
                  bold: true,
                  size: 20,
                }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `- Thời hạn hợp đồng: Từ ngày ${ngayBatDau.toLocaleDateString('vi-VN')} đến ngày ${ngayKetThuc.toLocaleDateString('vi-VN')}\n- Tiền cọc: Được hoàn trả khi kết thúc hợp đồng (trừ các khoản phát sinh)\n- Thanh toán: Hàng tháng vào ngày ${hopDong.ngayThanhToan}\n- Điện, nước: Tính theo chỉ số đồng hồ và giá quy định\n- Phí dịch vụ: Theo thỏa thuận riêng`,
                  size: 20,
                }),
              ],
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "4. CHẤM DỨT HỢP ĐỒNG:",
                  bold: true,
                  size: 20,
                }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "- Bên thuê có thể chấm dứt hợp đồng trước thời hạn với thông báo trước 30 ngày\n- Bên cho thuê có thể chấm dứt hợp đồng nếu vi phạm nghiêm trọng\n- Hoàn trả tiền cọc sau khi kiểm tra tình trạng phòng",
                  size: 20,
                }),
              ],
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "5. ĐIỀU KHOẢN KHÁC:",
                  bold: true,
                  size: 20,
                }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "- Hai bên cam kết thực hiện đúng các điều khoản đã thỏa thuận\n- Mọi tranh chấp sẽ được giải quyết thông qua thương lượng\n- Hợp đồng có hiệu lực kể từ ngày ký",
                  size: 20,
                }),
              ],
              spacing: { after: 400 },
            }),
            
            // Signatures
            new Paragraph({
              children: [
                new TextRun({
                  text: "        ĐẠI DIỆN BÊN A                                    ĐẠI DIỆN BÊN B",
                  bold: true,
                  size: 20,
                }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "      (Ký và ghi họ tên)                                (Ký và ghi họ tên)",
                  size: 18,
                  italics: true,
                }),
              ],
              spacing: { after: 800 },
            }),

            // Footer info
            new Paragraph({
              children: [
                new TextRun({
                  text: `Ngày tạo: ${new Date(hopDong.ngayTao).toLocaleDateString('vi-VN')}`,
                  size: 18,
                }),
              ],
              spacing: { before: 400 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Trạng thái: ${hopDong.trangThai === 'hoatDong' ? 'Hoạt động' : hopDong.trangThai === 'hetHan' ? 'Hết hạn' : 'Đã hủy'}`,
                  size: 18,
                }),
              ],
            }),
          ],
        }],
      });

      // Generate and download Word document
      const buffer = await Packer.toBuffer(doc);
      const uint8Array = new Uint8Array(buffer);
      const blob = new Blob([uint8Array], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      saveAs(blob, `hop-dong-${hopDong.maHopDong}.docx`);
      
      toast.success('Đã tải xuống file hợp đồng thành công!');
    } catch (error) {
      toast.error('Chưa tạo được file Word. Bạn thử lại xem sao!');
    }
  };

  const handleGiaHan = (hopDong: HopDong) => {
    setExtendingHopDong(hopDong);
    // Set default new end date to tomorrow or 6 months from current end date
    const currentEnd = new Date(hopDong.ngayKetThuc);
    const futureDate = new Date(currentEnd);
    futureDate.setMonth(futureDate.getMonth() + 6);
    setNewEndDate(futureDate.toISOString().split('T')[0]);
  };

  const submitGiaHan = async () => {
    if (!extendingHopDong || !newEndDate) return;
    
    setActionLoading(`giahan-${extendingHopDong._id}`);
    try {
      const response = await fetch(`/api/hop-dong/${extendingHopDong._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ngayKetThuc: newEndDate,
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        cache.clearCache();
        setHopDongList(prev => prev.map(hd => 
          hd._id === extendingHopDong._id ? result.data : hd
        ));
        toast.success('Đã gia hạn hợp đồng thành công rồi nhé!');
        setExtendingHopDong(null);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Không gia hạn được hợp đồng. Bạn kiểm tra lại thông tin nhé!');
      }
    } catch (error) {
      toast.error('Lỗi kết nối khi gia hạn hợp đồng.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleHuy = (hopDong: HopDong) => {
    setCancellingHopDong(hopDong);
  };

  const submitHuy = async () => {
    if (!cancellingHopDong) return;
    
    setActionLoading(`huy-${cancellingHopDong._id}`);
    try {
      const response = await fetch(`/api/hop-dong/${cancellingHopDong._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trangThai: 'daHuy',
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        cache.clearCache();
        setHopDongList(prev => prev.map(hd => 
          hd._id === cancellingHopDong._id ? result.data : hd
        ));
        toast.success('Hợp đồng đã được hủy thành công!');
        setCancellingHopDong(null);
      } else {
        toast.error('Chưa hủy được hợp đồng này. Thử lại sau nhé!');
      }
    } catch (error) {
      toast.error('Lỗi kết nối khi hủy hợp đồng.');
    } finally {
      setActionLoading(null);
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
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">Quản lý hợp đồng</h1>
          <p className="text-xs md:text-sm text-gray-600">Danh sách tất cả hợp đồng trong hệ thống</p>
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
          <Button size="sm" onClick={() => router.push('/dashboard/hop-dong/them-moi')} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Thêm hợp đồng</span>
            <span className="sm:hidden">Thêm</span>
          </Button>
        </div>
      </div>

      {/* View Modal */}
      {viewingHopDong && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => setViewingHopDong(null)}
          />
          
          {/* Modal Content */}
          <div className="relative w-full h-full md:w-[95vw] md:h-[95vh] md:max-w-6xl bg-white md:rounded-lg shadow-lg overflow-hidden flex flex-col">
            {/* Fixed Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b bg-white flex-shrink-0">
              <div>
                <h2 className="text-lg md:text-2xl font-semibold">Chi tiết hợp đồng</h2>
                <p className="text-xs md:text-sm text-gray-600">
                  Thông tin chi tiết hợp đồng {viewingHopDong.maHopDong}
                </p>
              </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewingHopDong(null)}
                  className="h-8 w-8 p-0"
                >
                  <CloseIcon className="h-4 w-4" />
                </Button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <Label className="text-xs md:text-sm font-medium text-gray-500">Mã hợp đồng</Label>
                    <p className="text-base md:text-lg font-semibold">{viewingHopDong.maHopDong}</p>
                  </div>
                  <div>
                    <Label className="text-xs md:text-sm font-medium text-gray-500">Trạng thái</Label>
                    <div className="mt-1">{getStatusBadge(viewingHopDong.trangThai)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <Label className="text-xs md:text-sm font-medium text-gray-500">Phòng</Label>
                    <p className="text-base md:text-lg">{getPhongName(viewingHopDong.phong)}</p>
                  </div>
                  <div>
                    <Label className="text-xs md:text-sm font-medium text-gray-500">Tòa nhà</Label>
                    <p className="text-base md:text-lg">{getPhongInfo(viewingHopDong.phong).toaNha}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-500">Khách thuê</Label>
                  <div className="mt-2 space-y-1">
                    {viewingHopDong.khachThueId.map((khachThue, index) => {
                      const khachThueId = typeof khachThue === 'object' ? (khachThue as { _id: string })._id : khachThue;
                      const nguoiDaiDienId = typeof viewingHopDong.nguoiDaiDien === 'object' ? (viewingHopDong.nguoiDaiDien as { _id: string })._id : viewingHopDong.nguoiDaiDien;
                      return (
                        <div key={khachThueId} className="flex items-center gap-2">
                          <span className="text-sm">
                            {index + 1}. {getKhachThueName(khachThue)}
                            {khachThueId === nguoiDaiDienId && (
                              <Badge variant="outline" className="ml-2">Người đại diện</Badge>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Ngày bắt đầu</Label>
                    <p className="text-lg">{new Date(viewingHopDong.ngayBatDau).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Ngày kết thúc</Label>
                    <p className="text-lg">{new Date(viewingHopDong.ngayKetThuc).toLocaleDateString('vi-VN')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Giá thuê</Label>
                    <p className="text-lg font-semibold">{formatCurrency(viewingHopDong.giaThue)}/tháng</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Tiền cọc</Label>
                    <p className="text-lg font-semibold">{formatCurrency(viewingHopDong.tienCoc)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Ngày thanh toán</Label>
                    <p className="text-lg">Hàng {viewingHopDong.chuKyThanhToan} - ngày {viewingHopDong.ngayThanhToan}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Giá điện</Label>
                    <p className="text-lg">{formatCurrency(viewingHopDong.giaDien)}/kWh</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Giá nước</Label>
                    <p className="text-lg">{formatCurrency(viewingHopDong.giaNuoc)}/m³</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Chỉ số điện ban đầu</Label>
                    <p className="text-lg">{viewingHopDong.chiSoDienBanDau} kWh</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Chỉ số nước ban đầu</Label>
                    <p className="text-lg">{viewingHopDong.chiSoNuocBanDau} m³</p>
                  </div>
                </div>

                {viewingHopDong.phiDichVu.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Phí dịch vụ</Label>
                    <div className="mt-2 space-y-2">
                      {viewingHopDong.phiDichVu.map((phi, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span>{phi.ten}</span>
                          <span className="font-semibold">{formatCurrency(phi.gia)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium text-gray-500">Điều khoản</Label>
                  <p className="text-sm mt-2 p-3 bg-gray-50 rounded whitespace-pre-wrap">
                    {viewingHopDong.dieuKhoan}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Ngày tạo</Label>
                    <p className="text-sm">{new Date(viewingHopDong.ngayTao).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Ngày cập nhật</Label>
                    <p className="text-sm">{new Date(viewingHopDong.ngayCapNhat).toLocaleDateString('vi-VN')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="flex flex-col sm:flex-row gap-2 p-4 md:p-6 border-t bg-white flex-shrink-0">
              <Button variant="outline" size="sm" onClick={() => setViewingHopDong(null)} className="flex-1 sm:flex-none">
                Đóng
              </Button>
              <Button size="sm" onClick={() => handleDownload(viewingHopDong)} className="flex-1 sm:flex-none">
                <Download className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                Tải xuống
              </Button>
              <Button size="sm" onClick={() => {
                setViewingHopDong(null);
                handleEdit(viewingHopDong);
              }} className="flex-1 sm:flex-none">
                <Edit className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                Chỉnh sửa
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Extension Dialog */}
      <Dialog open={!!extendingHopDong} onOpenChange={(open) => !open && setExtendingHopDong(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Gia hạn hợp đồng</DialogTitle>
            <DialogDescription>
              Hợp đồng <strong>{extendingHopDong?.maHopDong}</strong> hiện tại kết thúc vào ngày {extendingHopDong && new Date(extendingHopDong.ngayKetThuc).toLocaleDateString('vi-VN')}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newEndDate">Ngày kết thúc mới</Label>
              <Input
                id="newEndDate"
                type="date"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                min={extendingHopDong ? new Date(extendingHopDong.ngayBatDau).toISOString().split('T')[0] : ''}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[3, 6, 12, 24].map((months) => (
                <Button
                  key={months}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (extendingHopDong) {
                      const start = new Date(extendingHopDong.ngayKetThuc);
                      const end = new Date(start);
                      end.setMonth(end.getMonth() + months);
                      setNewEndDate(end.toISOString().split('T')[0]);
                    }
                  }}
                  className="text-xs"
                >
                  +{months} tháng
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendingHopDong(null)}>Hủy</Button>
            <Button 
              onClick={submitGiaHan} 
              disabled={actionLoading === `giahan-${extendingHopDong?._id}`}
            >
              {actionLoading === `giahan-${extendingHopDong?._id}` ? 'Đang xử lý...' : 'Xác nhận gia hạn'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancellation Dialog */}
      <Dialog open={!!cancellingHopDong} onOpenChange={(open) => !open && setCancellingHopDong(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-destructive font-bold">Xác nhận hủy hợp đồng</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn hủy hợp đồng <strong>{cancellingHopDong?.maHopDong}</strong>?<br/>
              Hành động này sẽ giải phóng phòng và chuyển trạng thái khách thuê thành "Đã trả phòng".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setCancellingHopDong(null)}>Quay lại</Button>
            <Button 
              variant="destructive"
              onClick={submitHuy} 
              disabled={actionLoading === `huy-${cancellingHopDong?._id}`}
            >
              {actionLoading === `huy-${cancellingHopDong?._id}` ? 'Đang xử lý...' : 'Xác nhận hủy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 md:gap-4 lg:gap-6">
        <Card className="p-2 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-medium text-gray-600 uppercase tracking-wider">Tổng hợp đồng</p>
              <p className="text-base md:text-2xl font-bold">{hopDongList.length}</p>
            </div>
            <FileText className="h-3 w-3 md:h-4 md:w-4 text-gray-500" />
          </div>
        </Card>

        <Card className="p-2 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-medium text-gray-600 uppercase tracking-wider">Hoạt động</p>
              <p className="text-base md:text-2xl font-bold text-green-600">
                {hopDongList.filter(h => h.trangThai === 'hoatDong').length}
              </p>
            </div>
            <FileText className="h-3 w-3 md:h-4 md:w-4 text-green-600" />
          </div>
        </Card>

        <Card className="p-2 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-medium text-gray-600 uppercase tracking-wider">Sắp hết hạn</p>
              <p className="text-base md:text-2xl font-bold text-orange-600">
                {hopDongList.filter(h => isExpiringSoon(h.ngayKetThuc)).length}
              </p>
            </div>
            <Calendar className="h-3 w-3 md:h-4 md:w-4 text-orange-600" />
          </div>
        </Card>

        <Card className="p-2 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-medium text-gray-600 uppercase tracking-wider">Đã hết hạn</p>
              <p className="text-base md:text-2xl font-bold text-red-600">
                {hopDongList.filter(h => isExpired(h.ngayKetThuc)).length}
              </p>
            </div>
            <Calendar className="h-3 w-3 md:h-4 md:w-4 text-red-600" />
          </div>
        </Card>
      </div>

      <Card className={`hidden md:block transition-opacity duration-300 ${loading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        <CardHeader className="relative">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Danh sách hợp đồng</CardTitle>
              <CardDescription>
                {filteredHopDong.length} hợp đồng được tìm thấy
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
          <HopDongDataTable
            data={filteredHopDong}
            phongList={phongList}
            khachThueList={khachThueList}
            toaNhaList={toaNhaList}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDownload={handleDownload}
            onGiaHan={handleGiaHan}
            onHuy={handleHuy}
            actionLoading={actionLoading}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            toaNhaFilter={toaNhaFilter}
            onToaNhaChange={setToaNhaFilter}
            allToaNhaList={toaNhaList}
          />
        </CardContent>
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Danh sách hợp đồng</h2>
          <div className="flex items-center gap-2">
            {loading && <RefreshCw className="h-3 w-3 animate-spin text-primary" />}
            <span className="text-sm text-gray-500">{filteredHopDong.length} hợp đồng</span>
          </div>
        </div>
        
        {/* Mobile Filters */}
        <div className="space-y-2 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Tìm kiếm hợp đồng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-sm">Tất cả</SelectItem>
                <SelectItem value="hoatDong" className="text-sm">Hoạt động</SelectItem>
                <SelectItem value="hetHan" className="text-sm">Hết hạn</SelectItem>
                <SelectItem value="daHuy" className="text-sm">Đã hủy</SelectItem>
              </SelectContent>
            </Select>
            <Select value={toaNhaFilter} onValueChange={setToaNhaFilter}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Tòa nhà" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-sm">Tất cả</SelectItem>
                {toaNhaList.map((toaNha) => (
                  <SelectItem key={toaNha._id} value={toaNha._id!} className="text-sm">
                    {toaNha.tenToaNha}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Mobile Card List */}
        <div className="space-y-3">
          {filteredHopDong.map((hopDong) => {
            const phongInfo = getPhongInfo(hopDong.phong);
            const nguoiDaiDien = getKhachThueName(hopDong.nguoiDaiDien);
            const isExpiring = isExpiringSoon(hopDong.ngayKetThuc);

            return (
              <Card 
                key={hopDong._id} 
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleView(hopDong)}
              >
                <div className="space-y-3">
                  {/* Header with contract code and status */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{hopDong.maHopDong}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Home className="h-3 w-3 text-gray-400" />
                        <span className="text-sm text-gray-600">{phongInfo.maPhong}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      {(() => {
                        switch (hopDong.trangThai) {
                          case 'hoatDong':
                            return <Badge variant="default" className="text-xs">Hoạt động</Badge>;
                          case 'hetHan':
                            return <Badge variant="destructive" className="text-xs">Hết hạn</Badge>;
                          case 'daHuy':
                            return <Badge variant="secondary" className="text-xs">Đã hủy</Badge>;
                          default:
                            return <Badge variant="outline" className="text-xs">{hopDong.trangThai}</Badge>;
                        }
                      })()}
                      {isExpiring && hopDong.trangThai === 'hoatDong' && (
                        <Badge variant="outline" className="text-xs text-orange-600 border-orange-600">
                          Sắp hết hạn
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Building and tenant info */}
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-600">{phongInfo.toaNha}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-600">{nguoiDaiDien}</span>
                      {hopDong.khachThueId.length > 1 && (
                        <Badge variant="secondary" className="text-[10px]">
                          +{hopDong.khachThueId.length - 1}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Contract dates */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 border-t pt-2">
                    <div>
                      <Calendar className="h-3 w-3 inline mr-1" />
                       Từ: {new Date(hopDong.ngayBatDau).toLocaleDateString('vi-VN')}
                    </div>
                    <div>
                      <Calendar className="h-3 w-3 inline mr-1" />
                      Đến: {new Date(hopDong.ngayKetThuc).toLocaleDateString('vi-VN')}
                    </div>
                  </div>

                  {/* Pricing info */}
                  <div className="border-t pt-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Giá thuê:</span>
                        <p className="font-semibold text-green-600">{formatCurrency(hopDong.giaThue)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Tiền cọc:</span>
                        <p className="font-semibold text-blue-600">{formatCurrency(hopDong.tienCoc)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(hopDong);
                      }}
                      className="flex-1 min-w-[30%]"
                    >
                      <Edit className="h-3.5 w-3.5 mr-1" />
                      Sửa
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(hopDong);
                      }}
                      className="flex-1 min-w-[30%]"
                    >
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Tải
                    </Button>
                    {(hopDong.trangThai === 'hoatDong' || hopDong.trangThai === 'hetHan') && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGiaHan(hopDong);
                        }}
                        className="flex-1 min-w-[45%]"
                      >
                        <Calendar className="h-3.5 w-3.5 mr-1" />
                        Gia hạn
                      </Button>
                    )}
                    {hopDong.trangThai === 'hoatDong' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleHuy(hopDong);
                        }}
                        className="flex-1 min-w-[45%]"
                      >
                        <CloseIcon className="h-3.5 w-3.5 mr-1" />
                        Hủy
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {filteredHopDong.length === 0 && (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Không có hợp đồng nào</p>
          </div>
        )}
      </div>

    </div>
  );
}