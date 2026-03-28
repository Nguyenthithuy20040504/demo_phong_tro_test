'use client';

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  Building2,
  Maximize2,
  Users,
  CreditCard,
  CheckCircle2,
  Info,
  Image as ImageIcon,
  User,
  Phone,
  Layers,
  CircleDashed,
  AlertCircle,
  Ban,
  MapPin,
  Sparkles,
  Clock,
  History,
  GalleryVerticalEnd,
  LayoutDashboard,
  Mail,
  Calendar,
  FileText
} from "lucide-react";
import type { Phong, ToaNha } from '@/types';
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PhongDetailDialogProps {
  phong: Phong | null;
  isOpen: boolean;
  onClose: () => void;
  toaNhaList: ToaNha[];
  onEdit?: (phong: Phong) => void;
}

export function PhongDetailDialog({ phong, isOpen, onClose, toaNhaList, onEdit }: PhongDetailDialogProps) {
  if (!phong) return null;

  const capitalizeFirstLetter = (string?: string) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const toaNhaObj = typeof phong.toaNha === 'object' ? phong.toaNha : toaNhaList.find(t => t._id === phong.toaNha);
  const toaNhaName = capitalizeFirstLetter((toaNhaObj as ToaNha)?.tenToaNha) || 'N/A';
  
  const formatAddress = (diaChi?: any) => {
    if (!diaChi) return 'N/A';
    const { soNha, duong, phuong, quan, thanhPho } = diaChi;
    return [soNha, duong, phuong, quan, thanhPho].filter(Boolean).join(', ');
  };

  const getTrangThaiBadge = (status: string) => {
    switch (status) {
      case 'trong':
        return (
          <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 shadow-sm border-0 whitespace-nowrap px-4 py-1.5 font-bold rounded-full transition-colors leading-none">
            Trống
          </Badge>
        );
      case 'dangThue':
        return (
          <Badge variant="secondary" className="bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm border-0 whitespace-nowrap px-4 py-1.5 font-bold rounded-full transition-colors leading-none">
            Đang thuê
          </Badge>
        );
      case 'daDat':
        return (
          <Badge variant="outline" className="border-amber-400 text-amber-600 font-black whitespace-nowrap px-4 py-1.5 bg-amber-50/50 rounded-full transition-colors leading-none">
            Đã đặt
          </Badge>
        );
      case 'baoTri':
        return (
          <Badge variant="destructive" className="bg-red-400 hover:bg-red-500 shadow-sm border-0 whitespace-nowrap px-4 py-1.5 font-bold rounded-full transition-colors leading-none">
            Bảo trì
          </Badge>
        );
      default:
        return <Badge variant="outline" className="whitespace-nowrap px-4 py-1.5 font-bold rounded-full uppercase tracking-widest leading-none">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (date?: Date | string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const tienNghiLabels: Record<string, string> = {
    'dieuHoa': 'Điều hòa',
    'nongLanh': 'Nóng lạnh',
    'tuLanh': 'Tủ lạnh',
    'giuong': 'Giường',
    'tuQuanAo': 'Tủ quần áo',
    'banGhe': 'Bàn ghế',
    'wifi': 'WiFi',
    'mayGiat': 'Máy giặt',
    'bep': 'Bếp',
    'banlamviec': 'Bàn làm việc',
    'ghe': 'Ghế',
    'tivi': 'TV',
    'phongtam': 'Phòng tắm',
    'bancong': 'Ban công',
  };

  const getTienNghiLabel = (item: string) => {
    if (!item) return '';
    const lowerItem = item.toLowerCase();
    
    const labelValues = Object.values(tienNghiLabels);
    if (labelValues.some(l => l.toLowerCase() === lowerItem)) {
      const exactMatch = labelValues.find(l => l.toLowerCase() === lowerItem);
      return exactMatch || item;
    }

    if (tienNghiLabels[item]) return tienNghiLabels[item];
    
    const match = Object.entries(tienNghiLabels).find(([k]) => k.toLowerCase() === lowerItem);
    if (match) return match[1];

    return item;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-[95vw] md:max-w-[750px] lg:max-w-[900px] p-0 flex flex-col h-[90vh] border-0 shadow-2xl overflow-hidden rounded-[2.5rem]"
      >
        {/* Header - Fixed */}
        <DialogHeader className="px-8 py-5 border-b flex flex-row items-center justify-between shrink-0 space-y-0 bg-white">
          <div className="flex items-center gap-4">
            <DialogTitle className="text-3xl font-black text-slate-800">
              Phòng {phong.maPhong}
            </DialogTitle>
            {phong.trangThai === 'dangThue' ? (
              <Badge className="bg-amber-100 text-amber-600 hover:bg-amber-100 border-0 rounded-full px-4 py-1.5 text-[11px] font-black">
                Trễ tiền
              </Badge>
            ) : (
              getTrangThaiBadge(phong.trangThai)
            )}
          </div>
        </DialogHeader>

        {/* Content Area - Scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50/30 custom-scrollbar">
          <div className="p-8 space-y-8">
            {/* Building and Floor info top row */}
            <div className="grid grid-cols-2 gap-5">
                <div className="bg-slate-100/50 p-4 rounded-xl flex items-center gap-3 border border-slate-100">
                  <div className="bg-slate-200/50 p-2 rounded-lg">
                    <Building2 className="h-5 w-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Tòa nhà</p>
                    <p className="text-sm font-bold text-slate-700">{toaNhaName}</p>
                  </div>
                </div>
                <div className="bg-slate-100/50 p-4 rounded-xl flex items-center gap-3 border border-slate-100">
                  <div className="bg-orange-100/50 p-2 rounded-lg">
                    <Home className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Tầng</p>
                    <p className="text-sm font-bold text-slate-700">Tầng {phong.tang}</p>
                  </div>
                </div>
              </div>

              {/* Address card */}
              <div className="bg-slate-100/50 p-4 rounded-xl flex items-center gap-3 border border-slate-100">
                <div className="bg-slate-200/50 p-2 rounded-lg">
                  <MapPin className="h-5 w-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Địa chỉ</p>
                  <p className="text-sm font-bold text-slate-700 truncate">
                    {toaNhaObj ? formatAddress((toaNhaObj as ToaNha).diaChi) : 'Đang cập nhật...'}
                  </p>
                </div>
              </div>

              {/* Pricing and Area main cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border-2 border-emerald-100 shadow-sm">
                  <p className="text-[11px] font-black text-emerald-500/70 uppercase tracking-widest mb-1">Giá thuê tháng</p>
                  <p className="text-2xl font-black text-emerald-600">{formatCurrency(phong.giaThue)}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border-2 border-blue-100 shadow-sm">
                  <p className="text-[11px] font-black text-blue-500/70 uppercase tracking-widest mb-1">Diện tích</p>
                  <p className="text-2xl font-black text-blue-600">{phong.dienTich} m²</p>
                </div>
              </div>

              {/* Photo Gallery section */}
              <div className="space-y-3">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Thư viện ảnh
                </h3>
                <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                  {phong.anhPhong && phong.anhPhong.length > 0 ? (
                    phong.anhPhong.map((img, index) => (
                      <div key={index} className="flex-none w-1/2 md:w-56 aspect-video rounded-2xl overflow-hidden border border-slate-200">
                        <img src={img} alt="Ảnh phòng" className="w-full h-full object-cover" />
                      </div>
                    ))
                  ) : (
                    <div className="w-full h-32 flex flex-col items-center justify-center bg-slate-100 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
                      <ImageIcon className="h-8 w-8 mb-2 opacity-20" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Không có ảnh</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Room Description section */}
              {phong.moTa && (
                <div className="space-y-3">
                  <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Mô tả chi tiết
                  </h3>
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line italic">
                      "{phong.moTa}"
                    </p>
                  </div>
                </div>
              )}

              {/* Amenities List section */}
              <div className="space-y-3">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Danh sách tiện nghi
                </h3>
                <div className="flex flex-wrap gap-2">
                  {phong.tienNghi && phong.tienNghi.length > 0 ? (
                    phong.tienNghi.map((item) => (
                      <Badge key={item} variant="outline" className="px-4 py-1.5 rounded-full text-[11px] font-semibold text-slate-600 border-slate-200 bg-white">
                        {getTienNghiLabel(item)}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">Dữ liệu tiện nghi đang cập nhật...</span>
                  )}
                </div>
              </div>

              {/* Secondary stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                  <p className="text-[10px] font-black text-orange-400 uppercase tracking-tight flex items-center gap-1 mb-1">
                    <CreditCard className="h-3 w-3" />
                    Tiền cọc
                  </p>
                  <p className="text-sm font-black text-orange-600 truncate">{formatCurrency(phong.tienCoc)}</p>
                </div>
                <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                  <p className="text-[10px] font-black text-purple-400 uppercase tracking-tight flex items-center gap-1 mb-1">
                    <Users className="h-3 w-3" />
                    Số người
                  </p>
                  <p className="text-sm font-black text-purple-600">{phong.soNguoiToiDa} người</p>
                </div>
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-tight flex items-center gap-1 mb-1">
                    <Clock className="h-3 w-3" />
                    Ngày tạo hợp đồng
                  </p>
                  <p className="text-sm font-black text-blue-600 truncate">
                    {phong.ngayTao ? new Date(phong.ngayTao).toLocaleDateString('vi-VN') : 'N/A'}
                  </p>
                </div>
              </div>

              <Separator className="bg-slate-200/60" />

              {/* Landlord section */}
              <div className="space-y-3">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Thông tin chủ cho thuê
                </h3>
                <div className="bg-emerald-50/30 p-5 rounded-2xl border border-emerald-100 space-y-4">
                  {typeof (toaNhaObj as ToaNha)?.chuSoHuu === 'object' && (toaNhaObj as ToaNha).chuSoHuu ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-xl shadow-sm text-emerald-500">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Tên chủ trọ</p>
                          <p className="text-sm font-bold text-slate-700">{((toaNhaObj as ToaNha).chuSoHuu as any).ten}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-xl shadow-sm text-emerald-500">
                          <Phone className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Số điện thoại</p>
                          <p className="text-sm font-bold text-slate-700">{((toaNhaObj as ToaNha).chuSoHuu as any).soDienThoai}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 md:col-span-2">
                        <div className="bg-white p-2 rounded-xl shadow-sm text-emerald-500">
                          <Mail className="h-5 w-5" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Email</p>
                          <p className="text-sm font-bold text-slate-700 truncate">{((toaNhaObj as ToaNha).chuSoHuu as any).email}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-2 text-slate-400 text-xs italic">Đang cập nhật thông tin chủ nhà...</div>
                  )}
                </div>
              </div>

              {/* Resident info section */}
              <div className="space-y-3">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Thông tin cư trú
                </h3>
                <div className="bg-blue-50/30 p-5 rounded-2xl border border-blue-100 space-y-4">
                  {phong.hopDongHienTai ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-xl shadow-sm text-blue-500">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Tên người thuê</p>
                          <p className="text-sm font-bold text-slate-700">{phong.hopDongHienTai.nguoiDaiDien.hoTen}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-xl shadow-sm text-blue-500">
                          <Phone className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Số điện thoại</p>
                          <p className="text-sm font-bold text-slate-700">{phong.hopDongHienTai.nguoiDaiDien.soDienThoai}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 md:col-span-2">
                        <div className="bg-white p-2 rounded-xl shadow-sm text-blue-500">
                          <Mail className="h-5 w-5" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Email</p>
                          <p className="text-sm font-bold text-slate-700 truncate">{(phong.hopDongHienTai.nguoiDaiDien as any).email || 'Chưa cập nhật'}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-xs italic flex flex-col items-center gap-2">
                      <Ban className="h-8 w-8 opacity-10" />
                      Phòng hiện đang trống
                    </div>
                  )}
                </div>
              </div>
          </div>
        </div>

        {/* Footer Action Buttons */}
          <div className="p-4 border-t bg-white flex justify-end gap-3 shrink-0">
             <Button variant="outline" onClick={onClose} className="rounded-lg px-6 font-bold text-slate-600">
               Đóng
             </Button>
             {onEdit && (
               <Button 
                 onClick={() => onEdit(phong)} 
                 className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-6 font-bold"
               >
                 Chỉnh sửa
               </Button>
             )}
          </div>
      </DialogContent>
    </Dialog>
  );
}
