'use client';

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  MapPin,
  Info,
  Sparkles,
  Clock,
  History,
  AlertCircle,
  CheckCircle2,
  Home,
  Layers,
  X as CloseIcon,
} from "lucide-react";
import type { ToaNha } from '@/types';
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

interface ToaNhaDetailDialogProps {
  toaNha: ToaNha | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ToaNhaDetailDialog({ toaNha, isOpen, onClose }: ToaNhaDetailDialogProps) {
  if (!toaNha) return null;

  const formatAddress = (diaChi?: ToaNha['diaChi']) => {
    if (!diaChi) return 'N/A';
    const { soNha, duong, phuong, quan, thanhPho } = diaChi;
    return [soNha, duong, phuong, quan, thanhPho].filter(Boolean).join(', ');
  };

  const suCoCount = (toaNha as any).suCoCount || 0;

  const getTrangThaiBadge = (count: number) => {
    if (count > 0) {
      return (
        <Badge variant="destructive" className="bg-red-500 hover:bg-red-600 shadow-sm border-0 whitespace-nowrap px-4 py-1.5 font-bold rounded-full transition-colors leading-none">
          <AlertCircle className="h-3.5 w-3.5 mr-1 inline-block" />
          {count} Hỏng hóc
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 shadow-sm border-0 whitespace-nowrap px-4 py-1.5 font-bold rounded-full transition-colors leading-none">
        <CheckCircle2 className="h-3.5 w-3.5 mr-1 inline-block" />
        Bình thường
      </Badge>
    );
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
    'wifi': 'WiFi',
    'camera': 'Camera an ninh',
    'baoVe': 'Bảo vệ 24/7',
    'giuXe': 'Giữ xe',
    'thangMay': 'Thang máy',
    'sanPhoi': 'Sân phơi',
    'nhaVeSinhChung': 'Nhà vệ sinh chung',
    'khuBepChung': 'Khu bếp chung',
    'tuDoCung': 'Tủ đồ dùng',
    'sanDeXe': 'Sân để xe',
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
        className="max-w-[95vw] sm:max-w-[550px] md:max-w-[650px] p-0 flex flex-col h-[85vh] border-0 shadow-2xl overflow-hidden rounded-[2.5rem]"
      >
        {/* Header */}
        <DialogHeader className="px-8 py-5 border-b flex flex-row items-center justify-between shrink-0 space-y-0 bg-white">
          <div className="flex items-center gap-4">
            <DialogTitle className="text-3xl font-black text-slate-800 flex items-center gap-2">
              <Building2 className="h-8 w-8 text-primary" />
              Tòa nhà {toaNha.tenToaNha}
            </DialogTitle>
            {getTrangThaiBadge(suCoCount)}
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50/30 custom-scrollbar">
          <div className="p-8 space-y-8">
            {/* Address */}
            <div className="bg-slate-100/50 p-4 rounded-xl flex items-center gap-3 border border-slate-100">
              <div className="bg-slate-200/50 p-2 rounded-lg">
                <MapPin className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Địa chỉ</p>
                <p className="text-sm font-bold text-slate-700 truncate">
                  {formatAddress(toaNha.diaChi)}
                </p>
              </div>
            </div>

            {/* Main stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border-2 border-slate-100 shadow-sm text-center">
                <p className="text-[11px] font-black text-slate-500/70 uppercase tracking-widest mb-1">Tổng số phòng</p>
                <p className="text-2xl font-black text-slate-700">{toaNha.tongSoPhong}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border-2 border-emerald-100 shadow-sm text-center">
                <p className="text-[11px] font-black text-emerald-500/70 uppercase tracking-widest mb-1">Phòng trống</p>
                <p className="text-2xl font-black text-emerald-600">{(toaNha as any).phongTrong || 0}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border-2 border-indigo-100 shadow-sm text-center">
                <p className="text-[11px] font-black text-indigo-500/70 uppercase tracking-widest mb-1">Phòng đang thuê</p>
                <p className="text-2xl font-black text-indigo-600">{(toaNha as any).phongDangThue || 0}</p>
              </div>
            </div>

            {/* Description */}
            {toaNha.moTa && (
              <div className="space-y-3">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Mô tả tòa nhà
                </h3>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line italic">
                    "{toaNha.moTa}"
                  </p>
                </div>
              </div>
            )}

            {/* Amenities */}
            <div className="space-y-3">
              <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Tiện ích dùng chung
              </h3>
              <div className="flex flex-wrap gap-2">
                {toaNha.tienNghiChung && toaNha.tienNghiChung.length > 0 ? (
                  toaNha.tienNghiChung.map((item) => (
                    <Badge key={item} variant="outline" className="px-4 py-1.5 rounded-full text-[11px] font-semibold text-slate-600 border-slate-200 bg-white">
                      {getTienNghiLabel(item)}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">Tiện ích cơ bản</span>
                )}
              </div>
            </div>

            {/* Maintenance */}
            <div className="space-y-3">
              <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Sự cố & Bảo trì
              </h3>
              <div className="bg-red-50 p-5 rounded-2xl border border-red-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-600 mb-1">Phòng đang bảo trì</p>
                  <p className="text-xl font-black text-red-500">{(toaNha as any).phongBaoTri || 0}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-600 mb-1">Sự cố đang xử lý</p>
                  <p className="text-xl font-black text-red-500">{suCoCount}</p>
                </div>
              </div>
            </div>

            {/* Footer info (Dates) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-tight flex items-center gap-1 mb-1">
                  <Clock className="h-3 w-3" />
                  Ngày tạo
                </p>
                <p className="text-sm font-black text-blue-600 truncate">{formatDate(toaNha.ngayTao)}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight flex items-center gap-1 mb-1">
                  <History className="h-3 w-3" />
                  Cập nhật cuối
                </p>
                <p className="text-sm font-black text-slate-600">{formatDate(toaNha.ngayCapNhat)}</p>
              </div>
            </div>

          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t bg-white flex justify-end gap-3 shrink-0">
           <Button variant="outline" onClick={onClose} className="rounded-lg px-6 font-bold text-slate-600">
             Đóng
           </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
