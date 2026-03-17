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
  Users,
  Info,
  Image as ImageIcon,
  User,
  Phone,
  Layers,
  AlertCircle,
  CheckCircle2,
  Clock,
  History,
  GalleryVerticalEnd,
  Wrench,
  AlertTriangle,
  Calendar,
  MessageSquare,
  ClipboardList
} from "lucide-react";
import type { SuCo, Phong, ToaNha, KhachThue } from '@/types';
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface SuCoDetailDialogProps {
  suCo: SuCo | null;
  isOpen: boolean;
  onClose: () => void;
  phongList: Phong[];
  toaNhaList: ToaNha[];
}

export function SuCoDetailDialog({ suCo, isOpen, onClose, phongList, toaNhaList }: SuCoDetailDialogProps) {
  if (!suCo) return null;

  const phongObj = typeof suCo.phong === 'object' ? suCo.phong : phongList.find(p => p._id === suCo.phong);
  const toaNhaId = phongObj ? (typeof (phongObj as any).toaNha === 'object' ? (phongObj as any).toaNha._id : (phongObj as any).toaNha) : null;
  const toaNhaObj = toaNhaList.find(t => t._id === toaNhaId);
  const toaNhaName = toaNhaObj?.tenToaNha || 'N/A';
  
  const khachThueInfo = (suCo.khachThue as any);
  const hasReporter = !!khachThueInfo;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'moi':
        return (
          <Badge variant="destructive" className="bg-red-500 hover:bg-red-600 shadow-sm border-0 whitespace-nowrap px-4 py-1.5 font-bold rounded-full transition-colors">
            <AlertCircle className="h-3.5 w-3.5 mr-1" />
            Mới
          </Badge>
        );
      case 'dangXuLy':
        return (
          <Badge variant="secondary" className="bg-amber-500 hover:bg-amber-600 text-white shadow-sm border-0 whitespace-nowrap px-4 py-1.5 font-bold rounded-full transition-colors">
            <Clock className="h-3.5 w-3.5 mr-1" />
            Đang xử lý
          </Badge>
        );
      case 'daXong':
        return (
          <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 shadow-sm border-0 whitespace-nowrap px-4 py-1.5 font-bold rounded-full transition-colors">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            Đã xong
          </Badge>
        );
      case 'daHuy':
        return (
          <Badge variant="outline" className="border-gray-400 text-gray-600 font-black whitespace-nowrap px-4 py-1.5 bg-gray-50/50 rounded-full transition-colors">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            Đã hủy
          </Badge>
        );
      default:
        return <Badge variant="outline" className="whitespace-nowrap px-4 py-1.5 font-bold rounded-full uppercase tracking-widest">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'thap':
        return <Badge variant="outline" className="text-gray-500 border-gray-200">Thấp</Badge>;
      case 'trungBinh':
        return <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-100">Trung bình</Badge>;
      case 'cao':
        return <Badge variant="destructive" className="bg-orange-50 text-orange-600 border-orange-100">Cao</Badge>;
      case 'khancap':
        return <Badge variant="destructive" className="bg-red-50 text-red-600 border-red-100 animate-pulse">Khẩn cấp</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getLoaiSuCoBadge = (type: string) => {
    switch (type) {
      case 'dienNuoc':
        return <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">Điện nước</Badge>;
      case 'noiThat':
        return <Badge variant="outline" className="bg-stone-50 text-stone-700 border-stone-200">Nội thất</Badge>;
      case 'vesinh':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Vệ sinh</Badge>;
      case 'anNinh':
        return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">An ninh</Badge>;
      case 'khac':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Khác</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
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
                     <Wrench className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <SheetTitle className="text-4xl font-black tracking-tight text-foreground leading-none mb-1">
                      {suCo.tieuDe}
                    </SheetTitle>
                    <SheetDescription className="text-muted-foreground font-semibold flex items-center gap-2">
                       Mã sự cố: {suCo._id?.substring(0, 8).toUpperCase()}
                    </SheetDescription>
                  </div>
                  {getStatusBadge(suCo.trangThai)}
                </div>
                
                <div className="flex flex-wrap items-center gap-x-8 gap-y-1.5 text-muted-foreground/80 font-bold ml-1">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/[0.03] border border-primary/[0.05]">
                    <Home className="h-4 w-4 text-primary/60" />
                    Phòng {(phongObj as Phong)?.maPhong || 'N/A'}
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/[0.03] border border-primary/[0.05]">
                    <Building2 className="h-4 w-4 text-primary/60" />
                    {toaNhaName}
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/[0.03] border border-primary/[0.05]">
                    <Calendar className="h-4 w-4 text-primary/60" />
                    {formatDate(suCo.ngayBaoCao)}
                  </div>
                </div>
              </div>

              <div className="hidden lg:flex items-center gap-10 shrink-0 pr-4">
                 <div className="text-right">
                    <p className="text-[11px] text-muted-foreground uppercase font-black tracking-[0.2em] mb-1 opacity-60">Mức độ ưu tiên</p>
                    <div>{getPriorityBadge(suCo.mucDoUuTien)}</div>
                 </div>
                 <div className="w-[1px] h-14 bg-primary/10 rotate-12" />
                 <div className="text-right">
                    <p className="text-[11px] text-muted-foreground uppercase font-black tracking-[0.2em] mb-1 opacity-60">Loại sự cố</p>
                    <div>{getLoaiSuCoBadge(suCo.loaiSuCo)}</div>
                 </div>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 w-full overflow-x-hidden no-scrollbar">
            <div className="p-10 pb-16 max-w-full overflow-x-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                
                {/* COLUMN 1: Visuals & Reporter Info (4/12) */}
                <div className="lg:col-span-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 fill-mode-both">
                   <div className="space-y-5">
                    <div className="flex items-center justify-between px-2">
                       <h3 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2.5">
                         <GalleryVerticalEnd className="h-4 w-4 text-primary/60" />
                         Ảnh hiện trường
                       </h3>
                       <Badge variant="secondary" className="rounded-full text-[10px] px-2.5 py-0.5 bg-primary/5 text-primary/70 border-0 font-black">
                         {suCo.anhSuCo?.length || 0}
                       </Badge>
                    </div>

                    {suCo.anhSuCo && suCo.anhSuCo.length > 0 ? (
                      <div className="relative group overflow-hidden rounded-[2.5rem]">
                        <Carousel className="w-full" opts={{ loop: true }}>
                          <CarouselContent>
                            {suCo.anhSuCo.map((img, index) => (
                              <CarouselItem key={index}>
                                <div className="p-0">
                                  <Card className="overflow-hidden border-0 shadow-none bg-transparent rounded-none">
                                    <img
                                      src={img}
                                      alt={`Sự cố ${suCo.tieuDe}`}
                                      className="w-full aspect-[4/3] object-cover transition-transform duration-1000 group-hover:scale-105"
                                    />
                                  </Card>
                                </div>
                              </CarouselItem>
                            ))}
                          </CarouselContent>
                          {suCo.anhSuCo.length > 1 && (
                            <>
                              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none z-20">
                                <CarouselPrevious className="static translate-y-0 h-11 w-11 bg-white/30 backdrop-blur-sm hover:bg-white/60 text-white/90 hover:text-white border border-white/20 shadow-lg pointer-events-auto opacity-85 hover:opacity-100 transition-all flex items-center justify-center [&_svg]:size-5" />
                              </div>
                              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none z-20">
                                <CarouselNext className="static translate-y-0 h-11 w-11 bg-white/30 backdrop-blur-sm hover:bg-white/60 text-white/90 hover:text-white border border-white/20 shadow-lg pointer-events-auto opacity-85 hover:opacity-100 transition-all flex items-center justify-center [&_svg]:size-5" />
                              </div>
                            </>
                          )}
                        </Carousel>
                      </div>
                    ) : (
                      <div className="aspect-[4/3] flex flex-col items-center justify-center bg-primary/[0.02] rounded-[2.5rem] border-2 border-dashed border-primary/10 space-y-4">
                        <ImageIcon className="h-12 w-12 text-primary/10" />
                        <p className="text-[11px] font-black text-primary/30 uppercase tracking-widest">Không có ảnh đính kèm</p>
                      </div>
                    )}
                   </div>

                   <section className="space-y-5">
                      <h3 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2.5 px-2">
                        <User className="h-4 w-4 text-primary/60" />
                        Người báo cáo
                      </h3>
                      
                      {hasReporter ? (
                        <Card className="border-0 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] bg-gradient-to-br from-indigo-500/[0.08] to-emerald-500/[0.03] rounded-[2.5rem] overflow-hidden p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-500 group">
                          <div className="flex items-center gap-5">
                             <div className="bg-white p-3 rounded-2xl shadow-sm shrink-0 group-hover:rotate-12 transition-transform duration-500">
                               <Users className="h-6 w-6 text-indigo-500/80" />
                             </div>
                             <div className="overflow-hidden">
                               <h4 className="text-2xl font-black text-foreground truncate drop-shadow-sm">{khachThueInfo.hoTen}</h4>
                               <a href={`tel:${khachThueInfo.soDienThoai}`} className="text-xs font-black text-primary/80 flex items-center gap-1.5 mt-1 hover:text-primary hover:translate-x-1 transition-all">
                                 <Phone className="h-3.5 w-3.5" />
                                 {khachThueInfo.soDienThoai}
                               </a>
                             </div>
                          </div>
                        </Card>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 bg-primary/[0.01] rounded-[2.5rem] border-2 border-dashed border-primary/10 space-y-4 text-center p-8 group overflow-hidden relative">
                           <div className="absolute inset-0 bg-primary/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                           <AlertCircle className="h-10 w-10 text-primary/10 relative z-10" />
                           <p className="text-[11px] font-black text-primary/40 uppercase tracking-[0.2em] relative z-10">
                             Báo cáo bởi hệ thống / Quản trị viên
                           </p>
                        </div>
                      )}
                   </section>
                </div>

                {/* COLUMN 2: Description & Content (5/12) */}
                <div className="lg:col-span-5 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both">
                   <section className="space-y-5">
                      <h3 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2.5 px-2">
                        <MessageSquare className="h-4 w-4 text-primary/60" />
                        Mô tả chi tiết sự cố
                      </h3>
                      <div className="bg-primary/[0.01] p-7 rounded-[2.5rem] border border-primary/5 min-h-[160px] shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000" />
                        <ScrollArea className="h-full pr-4 relative z-10">
                          <p className="text-lg text-foreground/70 leading-relaxed font-bold opacity-90">
                            {suCo.moTa}
                          </p>
                        </ScrollArea>
                      </div>
                   </section>

                   <section className="space-y-5">
                      <h3 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2.5 px-2">
                        <ClipboardList className="h-4 w-4 text-primary/60" />
                        Ghi chú xử lý
                      </h3>
                      <div className="bg-amber-500/[0.03] p-7 rounded-[2.5rem] border border-amber-500/10 min-h-[120px] shadow-sm relative overflow-hidden group">
                        <ScrollArea className="h-full pr-4 relative z-10">
                          <p className="text-sm text-amber-900/70 leading-relaxed font-bold italic">
                            {suCo.ghiChuXuLy || "Chưa có ghi chú xử lý nào được cập nhật..."}
                          </p>
                        </ScrollArea>
                      </div>
                   </section>
                </div>

                {/* COLUMN 3: Processing Timeline (3/12) */}
                <div className="lg:col-span-3 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
                   <section className="space-y-5">
                      <h3 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2.5 px-2">
                        <History className="h-4 w-4 text-primary/60" />
                        Mốc thời gian
                      </h3>
                      
                      <div className="space-y-4 relative ml-3">
                         <div className="absolute left-[-13px] top-2 bottom-2 w-0.5 bg-primary/10" />
                         
                         <div className="relative pl-6">
                            <div className="absolute left-[-19px] top-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-primary/10" />
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60 mb-0.5">Ngày báo cáo</p>
                            <p className="text-sm font-black text-foreground">{formatDate(suCo.ngayBaoCao)}</p>
                         </div>

                         {suCo.ngayXuLy && (
                           <div className="relative pl-6">
                              <div className="absolute left-[-19px] top-1.5 h-3 w-3 rounded-full bg-amber-500 ring-4 ring-amber-500/10" />
                              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60 mb-0.5">Bắt đầu xử lý</p>
                              <p className="text-sm font-black text-foreground">{formatDate(suCo.ngayXuLy)}</p>
                           </div>
                         )}

                         {suCo.ngayHoanThanh && (
                           <div className="relative pl-6">
                              <div className="absolute left-[-19px] top-1.5 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/10" />
                              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60 mb-0.5">Hoàn thành</p>
                              <p className="text-sm font-black text-foreground">{formatDate(suCo.ngayHoanThanh)}</p>
                           </div>
                         )}

                         <div className="relative pl-6">
                            <div className="absolute left-[-19px] top-1.5 h-3 w-3 rounded-full bg-gray-300 ring-4 ring-gray-100" />
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60 mb-0.5">Cập nhật cuối</p>
                            <p className="text-sm font-black text-foreground">{formatDate(suCo.ngayCapNhat)}</p>
                         </div>
                      </div>
                   </section>

                   {/* Assignee section removed as per user request */}
                </div>

              </div>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
