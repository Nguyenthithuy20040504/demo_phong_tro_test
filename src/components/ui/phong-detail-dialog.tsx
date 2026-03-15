'use client';

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  LayoutDashboard
} from "lucide-react";
import type { Phong, ToaNha } from '@/types';
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface PhongDetailDialogProps {
  phong: Phong | null;
  isOpen: boolean;
  onClose: () => void;
  toaNhaList: ToaNha[];
}

export function PhongDetailDialog({ phong, isOpen, onClose, toaNhaList }: PhongDetailDialogProps) {
  if (!phong) return null;

  const toaNhaObj = typeof phong.toaNha === 'object' ? phong.toaNha : toaNhaList.find(t => t._id === phong.toaNha);
  const toaNhaName = (toaNhaObj as ToaNha)?.tenToaNha || 'N/A';
  
  const formatAddress = (diaChi?: any) => {
    if (!diaChi) return 'N/A';
    const { soNha, duong, phuong, quan, thanhPho } = diaChi;
    return [soNha, duong, phuong, quan, thanhPho].filter(Boolean).join(', ');
  };

  const getTrangThaiBadge = (status: string) => {
    switch (status) {
      case 'trong':
        return (
          <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 shadow-sm border-0 whitespace-nowrap px-4 py-1.5 font-bold rounded-full transition-colors">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            Trống
          </Badge>
        );
      case 'dangThue':
        return (
          <Badge variant="secondary" className="bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm border-0 whitespace-nowrap px-4 py-1.5 font-bold rounded-full transition-colors">
            <Home className="h-3.5 w-3.5 mr-1" />
            Đang thuê
          </Badge>
        );
      case 'daDat':
        return (
          <Badge variant="outline" className="border-amber-400 text-amber-600 font-black whitespace-nowrap px-4 py-1.5 bg-amber-50/50 rounded-full transition-colors">
            <AlertCircle className="h-3.5 w-3.5 mr-1" />
            Đã đặt
          </Badge>
        );
      case 'baoTri':
        return (
          <Badge variant="destructive" className="bg-red-400 hover:bg-red-500 shadow-sm border-0 whitespace-nowrap px-4 py-1.5 font-bold rounded-full transition-colors">
            <Ban className="h-3.5 w-3.5 mr-1" />
            Bảo trì
          </Badge>
        );
      default:
        return <Badge variant="outline" className="whitespace-nowrap px-4 py-1.5 font-bold rounded-full uppercase tracking-widest">{status}</Badge>;
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
    dieuHoa: 'Điều hòa',
    nongLanh: 'Nóng lạnh',
    tuLanh: 'Tủ lạnh',
    giuong: 'Giường',
    tuQuanAo: 'Tủ quần áo',
    banGhe: 'Bàn ghế',
    wifi: 'WiFi',
    mayGiat: 'Máy giặt',
    bep: 'Bếp',
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        className="w-[98vw] lg:max-w-6xl p-0 flex flex-col h-[96vh] my-auto mr-4 lg:mr-6 rounded-[3rem] border-0 shadow-[0_0_50px_-12px_rgba(0,0,0,0.15)] overflow-hidden bg-background/80 backdrop-blur-3xl transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Panoramic Top Header */}
          <SheetHeader className="px-10 py-8 border-b bg-gradient-to-br from-primary/[0.03] via-transparent to-primary/[0.03] shrink-0 space-y-0">
             <div className="flex items-center justify-between gap-8">
              <div className="space-y-2 overflow-hidden">
                <div className="flex items-center gap-5">
                  <div className="bg-primary/10 p-3 rounded-[1.25rem] shadow-sm transform -rotate-2 hover:rotate-0 transition-all duration-500">
                     <LayoutDashboard className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <SheetTitle className="text-4xl font-black tracking-tight text-foreground leading-none mb-1">
                      Phòng {phong.maPhong}
                    </SheetTitle>
                    <SheetDescription className="text-muted-foreground font-semibold flex items-center gap-2">
                       Chi tiết cấu hình và trạng thái hiện tại
                    </SheetDescription>
                  </div>
                  {getTrangThaiBadge(phong.trangThai)}
                </div>
                
                <div className="flex flex-wrap items-center gap-x-8 gap-y-1.5 text-muted-foreground/80 font-bold ml-1">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/[0.03] border border-primary/[0.05]">
                    <Building2 className="h-4 w-4 text-primary/60" />
                    {toaNhaName}
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/[0.03] border border-primary/[0.05]">
                    <Layers className="h-4 w-4 text-primary/60" />
                    Tầng {phong.tang}
                  </div>
                  {toaNhaObj && (
                    <div className="flex items-center gap-2 text-sm max-w-[400px]">
                      <MapPin className="h-4 w-4 text-primary/60 shrink-0" />
                      <span className="truncate">{formatAddress((toaNhaObj as ToaNha).diaChi)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="hidden lg:flex items-center gap-10 shrink-0 pr-4">
                 <div className="text-right">
                    <p className="text-[11px] text-muted-foreground uppercase font-black tracking-[0.2em] mb-1 opacity-60">Giá thuê tháng</p>
                    <p className="text-3xl font-black text-primary drop-shadow-sm">{formatCurrency(phong.giaThue)}</p>
                 </div>
                 <div className="w-[1px] h-14 bg-primary/10 rotate-12" />
                 <div className="text-right">
                    <p className="text-[11px] text-muted-foreground uppercase font-black tracking-[0.2em] mb-1 opacity-60">Diện tích</p>
                    <p className="text-3xl font-black text-foreground drop-shadow-sm">{phong.dienTich} m²</p>
                 </div>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 w-full overflow-x-hidden no-scrollbar">
            <div className="p-10 pb-16 max-w-full overflow-x-hidden">
              {/* Desktop Panoramic Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                
                {/* COLUMN 1: Visuals & Core Specs (4/12) */}
                <div className="lg:col-span-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 fill-mode-both">
                   <div className="space-y-5">
                    <div className="flex items-center justify-between px-2">
                       <h3 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2.5">
                         <GalleryVerticalEnd className="h-4 w-4 text-primary/60" />
                         Thư viện ảnh
                       </h3>
                       <Badge variant="secondary" className="rounded-full text-[10px] px-2.5 py-0.5 bg-primary/5 text-primary/70 border-0 font-black">
                         {phong.anhPhong?.length || 0}
                       </Badge>
                    </div>

                    {phong.anhPhong && phong.anhPhong.length > 0 ? (
                      <div className="relative group overflow-hidden rounded-[2.5rem]">
                        <Carousel className="w-full" opts={{ loop: true }}>
                          <CarouselContent>
                            {phong.anhPhong.map((img, index) => (
                              <CarouselItem key={index}>
                                <div className="p-0">
                                  <Card className="overflow-hidden border-0 shadow-none bg-transparent rounded-none">
                                    <img
                                      src={img}
                                      alt={`Phòng ${phong.maPhong}`}
                                      className="w-full aspect-[4/3] object-cover transition-transform duration-1000 group-hover:scale-105"
                                    />
                                  </Card>
                                </div>
                              </CarouselItem>
                            ))}
                          </CarouselContent>
                          {phong.anhPhong.length > 1 && (
                            <>
                              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none z-20">
                                <CarouselPrevious className="static translate-y-0 h-11 w-11 bg-white/30 backdrop-blur-sm hover:bg-white/60 text-white/90 hover:text-white border border-white/20 shadow-lg pointer-events-auto opacity-85 hover:opacity-100 transition-all flex items-center justify-center [&_svg]:size-5" />
                              </div>
                              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none z-20">
                                <CarouselNext className="static translate-y-0 h-11 w-11 bg-white/30 backdrop-blur-sm hover:bg-white/60 text-white/90 hover:text-white border border-white/20 shadow-lg pointer-events-auto opacity-85 hover:opacity-100 transition-all flex items-center justify-center [&_svg]:size-5" />
                              </div>
                              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2.5">
                                {phong.anhPhong.map((_, i) => (
                                  <div key={i} className="w-2.5 h-2.5 rounded-full bg-white shadow-lg border-2 border-primary/20" />
                                ))}
                              </div>
                            </>
                          )}
                        </Carousel>
                      </div>
                    ) : (
                      <div className="aspect-[4/3] flex flex-col items-center justify-center bg-primary/[0.02] rounded-[2.5rem] border-2 border-dashed border-primary/10 space-y-4">
                        <ImageIcon className="h-12 w-12 text-primary/10" />
                        <p className="text-[11px] font-black text-primary/30 uppercase tracking-widest">Không có dữ liệu ảnh</p>
                      </div>
                    )}
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-primary/[0.03] p-5 rounded-[2rem] border border-primary/5 shadow-inner-sm">
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1.5 opacity-60">Tiền cọc</p>
                        <p className="text-xl font-black text-amber-600/90 truncate">{formatCurrency(phong.tienCoc)}</p>
                      </div>
                      <div className="bg-primary/[0.03] p-5 rounded-[2rem] border border-primary/5 shadow-inner-sm">
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1.5 opacity-60">Giới hạn</p>
                        <p className="text-xl font-black text-indigo-600/90">{phong.soNguoiToiDa} người</p>
                      </div>
                   </div>

                   <Card className="rounded-[2rem] border-primary/5 bg-primary/[0.02] shadow-none">
                      <CardContent className="p-6 space-y-4">
                        <div className="flex items-center gap-4 text-[11px]">
                          <div className="bg-background/50 p-2 rounded-xl border border-primary/5 shadow-sm">
                            <Clock className="h-4 w-4 text-primary/60" />
                          </div>
                          <span className="text-muted-foreground font-black uppercase tracking-wider opacity-60">Ngày tạo hồ sơ</span>
                          <span className="font-black text-foreground ml-auto">{formatDate(phong.ngayTao)}</span>
                        </div>
                        <Separator className="bg-primary/5 shadow-sm" />
                        <div className="flex items-center gap-4 text-[11px]">
                          <div className="bg-background/50 p-2 rounded-xl border border-primary/5 shadow-sm">
                            <History className="h-4 w-4 text-primary/60" />
                          </div>
                          <span className="text-muted-foreground font-black uppercase tracking-wider opacity-60">Cập nhật cuối</span>
                          <span className="font-black text-foreground ml-auto">{formatDate(phong.ngayCapNhat)}</span>
                        </div>
                      </CardContent>
                   </Card>
                </div>

                {/* COLUMN 2: Description & Amenities (4/12) */}
                <div className="lg:col-span-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both">
                   <section className="space-y-5">
                      <h3 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2.5 px-2">
                        <Info className="h-4 w-4 text-primary/60" />
                        Mô tả không gian
                      </h3>
                      <div className="bg-primary/[0.01] p-7 rounded-[2.5rem] border border-primary/5 h-[200px] lg:h-[260px] shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000" />
                        <ScrollArea className="h-full pr-4 relative z-10">
                          <p className="text-base text-foreground/70 leading-relaxed font-bold italic opacity-90">
                            {phong.moTa ? `"${phong.moTa}"` : "Căn phòng yên tĩnh, sạch sẽ, đang chờ đón bạn đến trải nghiệm..."}
                          </p>
                        </ScrollArea>
                      </div>
                   </section>

                   <section className="space-y-5">
                      <h3 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2.5 px-2">
                        <Layers className="h-4 w-4 text-primary/60" />
                        Danh sách tiện nghi
                      </h3>
                      <div className="flex flex-wrap gap-2.5 p-1">
                        {phong.tienNghi && phong.tienNghi.length > 0 ? (
                          phong.tienNghi.map((item) => (
                            <Badge key={item} variant="secondary" className="px-4 py-2 rounded-2xl bg-white text-foreground/80 border border-primary/5 shadow-sm font-black text-[10px] md:text-[11px] uppercase tracking-widest hover:bg-primary/5 hover:text-primary transition-all duration-300">
                              <Sparkles className="h-3 w-3 mr-2 text-primary/40" />
                              {tienNghiLabels[item] || item}
                            </Badge>
                          ))
                        ) : (
                          <div className="bg-primary/[0.02] border border-dashed border-primary/10 px-6 py-3 rounded-2xl text-xs font-black text-primary/20 uppercase tracking-widest">Trang bị tiêu chuẩn</div>
                        )}
                      </div>
                   </section>
                </div>

                {/* COLUMN 3: Building & Tenants (4/12) */}
                <div className="lg:col-span-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
                   <section className="space-y-5">
                      <h3 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2.5 px-2">
                        <Users className="h-4 w-4 text-primary/60" />
                        Thông tin cư trú
                      </h3>
                      
                      {phong.hopDongHienTai ? (
                        <div className="space-y-5">
                          <Card className="border-0 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] bg-gradient-to-br from-indigo-500/[0.08] to-emerald-500/[0.03] rounded-[2.5rem] overflow-hidden p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-500 group">
                            <div className="flex items-center gap-5">
                               <div className="bg-white p-3 rounded-2xl shadow-sm shrink-0 group-hover:rotate-12 transition-transform duration-500">
                                 <User className="h-6 w-6 text-indigo-500/80" />
                               </div>
                               <div className="overflow-hidden">
                                 <p className="text-[10px] text-indigo-600/50 uppercase font-black tracking-widest mb-0.5">Người đại diện</p>
                                 <h4 className="text-2xl font-black text-foreground truncate drop-shadow-sm">{phong.hopDongHienTai.nguoiDaiDien.hoTen}</h4>
                                 <a href={`tel:${phong.hopDongHienTai.nguoiDaiDien.soDienThoai}`} className="text-xs font-black text-primary/80 flex items-center gap-1.5 mt-1 hover:text-primary hover:translate-x-1 transition-all">
                                   <Phone className="h-3.5 w-3.5" />
                                   {phong.hopDongHienTai.nguoiDaiDien.soDienThoai}
                                 </a>
                               </div>
                            </div>
                          </Card>

                          {phong.hopDongHienTai.khachThueId.length > 1 && (
                            <div className="space-y-4">
                              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground px-4 opacity-60">Danh sách thành viên ({phong.hopDongHienTai.khachThueId.length - 1})</p>
                              <div className="grid grid-cols-1 gap-3 max-h-[160px] lg:max-h-[220px] overflow-y-auto pr-3 no-scrollbar py-1">
                                {phong.hopDongHienTai.khachThueId
                                  .filter(k => k._id !== phong.hopDongHienTai?.nguoiDaiDien._id)
                                  .map((khach) => (
                                    <div key={khach._id} className="bg-white/40 rounded-[1.5rem] p-4 border border-primary/5 flex items-center gap-4 hover:shadow-md hover:bg-white transition-all duration-300">
                                      <div className="bg-primary/[0.03] p-2 rounded-xl shrink-0">
                                        <User className="h-4 w-4 text-primary/40" />
                                      </div>
                                      <div className="overflow-hidden">
                                        <p className="font-black text-sm text-foreground/80 truncate leading-tight">{khach.hoTen}</p>
                                        <p className="text-[10px] text-muted-foreground font-bold mt-0.5">{khach.soDienThoai}</p>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-14 bg-primary/[0.01] rounded-[2.5rem] border-2 border-dashed border-primary/10 space-y-4 text-center p-8 group overflow-hidden relative">
                           <div className="absolute inset-0 bg-primary/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                           <Users className="h-10 w-10 text-primary/10 relative z-10" />
                           <p className="text-[11px] font-black text-primary/40 uppercase tracking-[0.2em] relative z-10">
                             Hiện đang trống • Sẵn sàng đón khách
                           </p>
                        </div>
                      )}
                   </section>

                   <section className="space-y-5">
                      <h3 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2.5 px-2">
                        <Building2 className="h-4 w-4 text-primary/60" />
                        Tiêu chuẩn tòa nhà
                      </h3>
                      <div className="bg-primary/[0.03] p-7 rounded-[2.5rem] border border-primary/5 shadow-inner-sm">
                        <div className="flex flex-wrap gap-2.5">
                           {(toaNhaObj as ToaNha)?.tienNghiChung?.map((item, id) => (
                              <div key={id} className="bg-white border-primary/5 border px-4 py-2 rounded-2xl text-[10px] font-black text-foreground/60 flex items-center gap-2 shadow-sm hover:scale-105 transition-transform">
                                <Sparkles className="h-3 w-3 text-amber-400 opacity-60" />
                                {item}
                              </div>
                           ))}
                           {(!toaNhaObj || !(toaNhaObj as ToaNha)?.tienNghiChung?.length) && (
                              <div className="bg-background/40 border border-dashed border-primary/10 px-5 py-3 rounded-2xl text-[10px] font-black text-primary/20 uppercase italic tracking-widest">Toán nhà cơ bản</div>
                           )}
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
