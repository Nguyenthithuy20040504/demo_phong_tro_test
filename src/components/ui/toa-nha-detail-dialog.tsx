'use client';

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  MapPin,
  Info,
  Sparkles,
  Clock,
  History,
  GalleryVerticalEnd,
  LayoutDashboard,
  AlertCircle,
  CheckCircle2,
  Home,
  Layers,
} from "lucide-react";
import type { ToaNha } from '@/types';
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

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
        <Badge variant="destructive" className="bg-red-500 hover:bg-red-600 shadow-sm border-0 whitespace-nowrap px-4 py-1.5 font-bold rounded-full transition-colors">
          <AlertCircle className="h-3.5 w-3.5 mr-1" />
          {count} Hỏng hóc
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 shadow-sm border-0 whitespace-nowrap px-4 py-1.5 font-bold rounded-full transition-colors">
        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
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
    
    // Check if it already matches a label (accented)
    const labelValues = Object.values(tienNghiLabels);
    if (labelValues.some(l => l.toLowerCase() === lowerItem)) {
      const exactMatch = labelValues.find(l => l.toLowerCase() === lowerItem);
      return exactMatch || item;
    }

    if (tienNghiLabels[item]) return tienNghiLabels[item];
    
    // Search in keys case-insensitively
    const match = Object.entries(tienNghiLabels).find(([k]) => k.toLowerCase() === lowerItem);
    if (match) return match[1];

    return item;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        className="w-[98vw] lg:max-w-4xl p-0 flex flex-col h-[90vh] my-auto mr-4 lg:mr-6 rounded-[3rem] border-0 shadow-[0_0_50px_-12px_rgba(0,0,0,0.15)] overflow-hidden bg-background/80 backdrop-blur-3xl transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
      >
        <div className="flex flex-col h-full overflow-hidden">
          <SheetHeader className="px-10 py-8 border-b bg-gradient-to-br from-primary/[0.03] via-transparent to-primary/[0.03] shrink-0 space-y-0">
             <div className="flex items-center justify-between gap-8">
              <div className="space-y-2 overflow-hidden">
                <div className="flex items-center gap-5">
                  <div className="bg-primary/10 p-3 rounded-[1.25rem] shadow-sm transform -rotate-2 hover:rotate-0 transition-all duration-500">
                     <Building2 className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <SheetTitle className="text-4xl font-black tracking-tight text-foreground leading-none mb-1">
                      {toaNha.tenToaNha}
                    </SheetTitle>
                    <SheetDescription className="text-muted-foreground font-semibold flex items-center gap-2">
                       Thông tin chi tiết và tình trạng vận hành
                    </SheetDescription>
                  </div>
                  {getTrangThaiBadge(suCoCount)}
                </div>
                
                <div className="flex flex-wrap items-center gap-x-8 gap-y-1.5 text-muted-foreground/80 font-bold ml-1">
                  <div className="flex items-center gap-2 text-sm max-w-[600px]">
                    <MapPin className="h-4 w-4 text-primary/60 shrink-0" />
                    <span className="truncate">{formatAddress(toaNha.diaChi)}</span>
                  </div>
                </div>
              </div>

              <div className="hidden lg:flex items-center gap-10 shrink-0 pr-4">
                 <div className="text-right">
                    <p className="text-[11px] text-muted-foreground uppercase font-black tracking-[0.2em] mb-1 opacity-60">Tổng số phòng</p>
                    <p className="text-3xl font-black text-primary drop-shadow-sm">{toaNha.tongSoPhong}</p>
                 </div>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 w-full overflow-x-hidden no-scrollbar">
            <div className="p-10 pb-16 max-w-full overflow-x-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
                
                {/* COLUMN 1 */}
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 fill-mode-both">
                   <section className="space-y-5">
                      <h3 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2.5 px-2">
                        <Info className="h-4 w-4 text-primary/60" />
                        Mô tả chung
                      </h3>
                      <div className="bg-primary/[0.01] p-7 rounded-[2.5rem] border border-primary/5 min-h-[140px] shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000" />
                        <ScrollArea className="h-full pr-4 relative z-10">
                          <p className="text-base text-foreground/70 leading-relaxed font-bold italic opacity-90">
                            {toaNha.moTa ? `"${toaNha.moTa}"` : "Một tòa nhà khang trang, an toàn và hiện đại..."}
                          </p>
                        </ScrollArea>
                      </div>
                   </section>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-emerald-500/[0.05] p-5 rounded-[2rem] border border-emerald-500/10 shadow-inner-sm">
                        <p className="text-[10px] text-emerald-600 uppercase font-black tracking-widest mb-1.5 opacity-60">Phòng trống</p>
                        <p className="text-2xl font-black text-emerald-600">{(toaNha as any).phongTrong || 0}</p>
                      </div>
                      <div className="bg-indigo-500/[0.05] p-5 rounded-[2rem] border border-indigo-500/10 shadow-inner-sm">
                        <p className="text-[10px] text-indigo-600 uppercase font-black tracking-widest mb-1.5 opacity-60">Đang thuê</p>
                        <p className="text-2xl font-black text-indigo-600">{(toaNha as any).phongDangThue || 0}</p>
                      </div>
                   </div>

                   <Card className="rounded-[2rem] border-primary/5 bg-primary/[0.02] shadow-none">
                      <CardContent className="p-6 space-y-4">
                        <div className="flex items-center gap-4 text-[11px]">
                          <div className="bg-background/50 p-2 rounded-xl border border-primary/5 shadow-sm">
                            <Clock className="h-4 w-4 text-primary/60" />
                          </div>
                          <span className="text-muted-foreground font-black uppercase tracking-wider opacity-60">Ngày tạo</span>
                          <span className="font-black text-foreground ml-auto">{formatDate(toaNha.ngayTao)}</span>
                        </div>
                        <Separator className="bg-primary/5 shadow-sm" />
                        <div className="flex items-center gap-4 text-[11px]">
                          <div className="bg-background/50 p-2 rounded-xl border border-primary/5 shadow-sm">
                            <History className="h-4 w-4 text-primary/60" />
                          </div>
                          <span className="text-muted-foreground font-black uppercase tracking-wider opacity-60">Cập nhật cuối</span>
                          <span className="font-black text-foreground ml-auto">{formatDate(toaNha.ngayCapNhat)}</span>
                        </div>
                      </CardContent>
                   </Card>
                </div>

                {/* COLUMN 2 */}
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both">
                   <section className="space-y-5">
                      <h3 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2.5 px-2">
                        <Sparkles className="h-4 w-4 text-primary/60" />
                        Tiện ích dùng chung
                      </h3>
                      <div className="flex flex-wrap gap-2.5 p-1">
                        {toaNha.tienNghiChung && toaNha.tienNghiChung.length > 0 ? (
                          toaNha.tienNghiChung.map((item) => (
                            <Badge key={item} variant="secondary" className="px-4 py-2 rounded-2xl bg-white text-foreground/80 border border-primary/5 shadow-sm font-black text-[11px] uppercase tracking-widest hover:bg-primary/5 hover:text-primary transition-all duration-300">
                              {getTienNghiLabel(item)}
                            </Badge>
                          ))
                        ) : (
                          <div className="bg-primary/[0.02] border border-dashed border-primary/10 px-6 py-3 rounded-2xl text-xs font-black text-primary/20 uppercase tracking-widest">Tiện ích cơ bản</div>
                        )}
                      </div>
                   </section>

                   <section className="space-y-5">
                      <h3 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2.5 px-2">
                        <AlertCircle className="h-4 w-4 text-primary/60" />
                        Phòng bảo trì & Sự cố
                      </h3>
                      <div className="bg-red-500/[0.02] p-6 rounded-[2.5rem] border border-red-500/10 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-black text-foreground/70">Phòng đang bảo trì</p>
                          <p className="text-2xl font-black text-red-500">{(toaNha as any).phongBaoTri || 0}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-foreground/70">Sự cố đang xử lý</p>
                          <p className="text-2xl font-black text-red-500">{suCoCount}</p>
                        </div>
                      </div>
                   </section>
                </div>

              </div>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
