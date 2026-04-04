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
import { Button } from "@/components/ui/button";
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
          <Badge variant="destructive" className="bg-red-500 hover:bg-red-600 shadow-sm border-0 whitespace-nowrap px-4 py-1.5 font-bold rounded-full transition-colors text-sm">
            <AlertCircle className="h-4 w-4 mr-1 inline-block" />
            Mới
          </Badge>
        );
      case 'dangXuLy':
        return (
          <Badge variant="secondary" className="bg-amber-500 hover:bg-amber-600 text-white shadow-sm border-0 whitespace-nowrap px-4 py-1.5 font-bold rounded-full transition-colors text-sm">
            <Clock className="h-4 w-4 mr-1 inline-block" />
            Đang xử lý
          </Badge>
        );
      case 'daXong':
        return (
          <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 shadow-sm border-0 whitespace-nowrap px-4 py-1.5 font-bold rounded-full transition-colors text-sm">
            <CheckCircle2 className="h-4 w-4 mr-1 inline-block" />
            Đã xong
          </Badge>
        );
      case 'daHuy':
        return (
          <Badge variant="outline" className="border-slate-400 text-slate-600 font-black whitespace-nowrap px-4 py-1.5 bg-slate-50/50 rounded-full transition-colors text-sm">
            <AlertTriangle className="h-4 w-4 mr-1 inline-block" />
            Đã hủy
          </Badge>
        );
      default:
        return <Badge variant="outline" className="whitespace-nowrap px-4 py-1.5 font-bold rounded-full uppercase tracking-widest text-sm">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'thap':
        return <Badge variant="outline" className="text-slate-500 border-slate-200">Thấp</Badge>;
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
        return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">Khác</Badge>;
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-[95vw] sm:max-w-[650px] md:max-w-[850px] p-0 flex flex-col h-[85vh] border-0 shadow-2xl overflow-hidden rounded-[2.5rem] bg-white"
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <DialogHeader className="px-6 md:px-8 py-5 md:py-6 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between shrink-0 space-y-4 sm:space-y-0 bg-white">
             <div className="flex flex-col space-y-3 overflow-hidden w-full">
                <div className="flex items-center gap-3 md:gap-4">
                  <DialogTitle className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-2 md:gap-3">
                     <Wrench className="h-7 w-7 md:h-9 md:w-9 text-primary" />
                     {suCo.tieuDe}
                  </DialogTitle>
                  {getStatusBadge(suCo.trangThai)}
                </div>
                
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-slate-500 font-bold ml-10 md:ml-12">
                  <div className="flex items-center gap-1.5 md:gap-2 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 text-xs md:text-sm">
                    <Home className="h-3.5 w-3.5 md:h-4 md:w-4 text-slate-400" />
                    Phòng {(phongObj as Phong)?.maPhong || 'N/A'}
                  </div>
                  <div className="flex items-center gap-1.5 md:gap-2 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 text-xs md:text-sm">
                    <Building2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-slate-400" />
                    {toaNhaName}
                  </div>
                  <div className="text-xs md:text-sm font-semibold ml-1 text-slate-400 border-l pl-3 border-slate-200">
                    Mã sự cố: <span className="uppercase text-slate-600">{suCo._id?.substring(0, 8)}</span>
                  </div>
                </div>
             </div>
          </DialogHeader>

          <ScrollArea className="flex-1 w-full overflow-x-hidden no-scrollbar bg-slate-50/50">
            <div className="p-6 md:p-8 pb-12 max-w-full overflow-x-hidden">
              <div className="flex flex-col gap-8 md:grid md:grid-cols-2 items-start">
                
                {/* COLUMN 1 */}
                <div className="space-y-6 md:space-y-8 w-full">
                   <div className="space-y-3.5 md:space-y-4 mt-2">
                    <div className="flex items-center justify-between px-2">
                       <h3 className="font-black text-xs md:text-sm uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2 md:gap-2.5">
                         <GalleryVerticalEnd className="h-4 w-4 md:h-5 md:w-5 text-slate-400" />
                         Ảnh hiện trường
                       </h3>
                       <Badge variant="secondary" className="rounded-full text-[10px] md:text-xs px-2.5 py-0.5 bg-slate-100 text-slate-600 font-black">
                         {suCo.anhSuCo?.length || 0}
                       </Badge>
                    </div>

                    {suCo.anhSuCo && suCo.anhSuCo.length > 0 ? (
                      <div className="relative group overflow-hidden rounded-[1.5rem] md:rounded-[2rem] border-2 border-slate-100 shadow-sm">
                        <Carousel className="w-full" opts={{ loop: true }}>
                          <CarouselContent>
                            {suCo.anhSuCo.map((img, index) => (
                              <CarouselItem key={index}>
                                <div className="p-0 bg-white">
                                  <img
                                    src={img}
                                    alt={`Sự cố ${suCo.tieuDe}`}
                                    className="w-full aspect-[4/3] md:aspect-[16/10] object-cover transition-transform duration-1000 group-hover:scale-105"
                                  />
                                </div>
                              </CarouselItem>
                            ))}
                          </CarouselContent>
                          {suCo.anhSuCo.length > 1 && (
                            <>
                              <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none z-20">
                                <CarouselPrevious className="static translate-y-0 h-8 w-8 md:h-9 md:w-9 bg-white/50 backdrop-blur-sm hover:bg-white text-slate-700 shadow-sm pointer-events-auto transition-all [&_svg]:size-3 md:[&_svg]:size-4" />
                              </div>
                              <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none z-20">
                                <CarouselNext className="static translate-y-0 h-8 w-8 md:h-9 md:w-9 bg-white/50 backdrop-blur-sm hover:bg-white text-slate-700 shadow-sm pointer-events-auto transition-all [&_svg]:size-3 md:[&_svg]:size-4" />
                              </div>
                            </>
                          )}
                        </Carousel>
                      </div>
                    ) : (
                      <div className="aspect-[4/3] md:aspect-[16/10] flex flex-col items-center justify-center bg-white rounded-[1.5rem] md:rounded-[2rem] border-2 border-dashed border-slate-200 space-y-3 shadow-sm">
                        <ImageIcon className="h-8 w-8 md:h-10 md:w-10 text-slate-300" />
                        <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">Không đính kèm ảnh</p>
                      </div>
                    )}
                   </div>

                   <section className="space-y-3.5 md:space-y-4">
                      <h3 className="font-black text-xs md:text-sm uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2 md:gap-2.5 px-2">
                        <MessageSquare className="h-4 w-4 md:h-5 md:w-5 text-slate-400" />
                        Mô tả chi tiết
                      </h3>
                      <div className="bg-white p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border-2 border-slate-100 min-h-[120px] md:min-h-[140px] shadow-sm">
                        <p className="text-base md:text-lg text-slate-700 leading-relaxed font-bold whitespace-pre-wrap">
                          "{suCo.moTa}"
                        </p>
                      </div>
                   </section>

                   <section className="space-y-3.5 md:space-y-4">
                      <h3 className="font-black text-xs md:text-sm uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2 md:gap-2.5 px-2">
                        <ClipboardList className="h-4 w-4 md:h-5 md:w-5 text-slate-400" />
                        Ghi chú xử lý
                      </h3>
                      <div className="bg-amber-50 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border-2 border-amber-100/50 min-h-[100px] md:min-h-[120px] shadow-sm">
                        <p className="text-sm md:text-base text-amber-800/80 leading-relaxed font-bold italic whitespace-pre-wrap">
                          {suCo.ghiChuXuLy || "Chưa có ghi chú xử lý nào..."}
                        </p>
                      </div>
                   </section>
                </div>

                {/* COLUMN 2 */}
                <div className="space-y-6 md:space-y-8 w-full mt-2 lg:mt-0">
                   <div className="grid grid-cols-2 gap-3 mb-2">
                     <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center flex flex-col items-center justify-center">
                        <p className="text-[10px] sm:text-xs text-slate-400 uppercase font-black tracking-widest mb-2">Ưu tiên</p>
                        <div>{getPriorityBadge(suCo.mucDoUuTien)}</div>
                     </div>
                     <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center flex flex-col items-center justify-center">
                        <p className="text-[10px] sm:text-xs text-slate-400 uppercase font-black tracking-widest mb-2">Phân loại</p>
                        <div>{getLoaiSuCoBadge(suCo.loaiSuCo)}</div>
                     </div>
                   </div>

                   <section className="space-y-3.5 md:space-y-4">
                      <h3 className="font-black text-xs md:text-sm uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2 md:gap-2.5 px-2">
                        <User className="h-4 w-4 md:h-5 md:w-5 text-slate-400" />
                        Người báo cáo
                      </h3>
                      
                      {hasReporter ? (
                        <div className="bg-white border-2 border-slate-100 rounded-[1.5rem] md:rounded-[2rem] overflow-hidden p-5 md:p-6 hover:border-indigo-100 transition-colors shadow-sm group">
                          <div className="flex items-center gap-4 md:gap-5">
                             <div className="bg-indigo-50 p-2.5 md:p-3 rounded-[1rem] md:rounded-2xl border border-indigo-100 shrink-0 group-hover:scale-110 transition-transform duration-300">
                               <Users className="h-5 w-5 md:h-6 md:w-6 text-indigo-500" />
                             </div>
                             <div className="overflow-hidden">
                               <h4 className="text-lg md:text-xl font-black text-slate-700 truncate">{khachThueInfo.hoTen}</h4>
                               <a href={`tel:${khachThueInfo.soDienThoai}`} className="text-xs md:text-sm font-bold text-slate-500 flex items-center gap-1.5 mt-1 hover:text-primary transition-all">
                                 <Phone className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                 {khachThueInfo.soDienThoai}
                               </a>
                             </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-6 md:py-8 bg-slate-100/50 rounded-[1.5rem] md:rounded-[2rem] border-2 border-dashed border-slate-200 space-y-3 md:space-y-4 text-center px-4 md:px-6">
                           <AlertCircle className="h-6 w-6 md:h-8 md:w-8 text-slate-300" />
                           <p className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-wider">
                             Báo cáo bởi Quản trị viên
                           </p>
                        </div>
                      )}
                   </section>

                   <section className="space-y-3.5 md:space-y-4">
                      <h3 className="font-black text-xs md:text-sm uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2 md:gap-2.5 px-2">
                        <History className="h-4 w-4 md:h-5 md:w-5 text-slate-400" />
                        Tiến độ xử lý
                      </h3>
                      
                      <div className="bg-white p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border-2 border-slate-100 shadow-sm">
                        <div className="space-y-4 md:space-y-5 relative ml-2 md:ml-3 py-1 md:py-2">
                           {/* Dòng timeline dọc */}
                           <div className="absolute left-[2.5px] top-2 bottom-2 w-0.5 bg-slate-100" />
                           
                           <div className="relative pl-7 md:pl-8">
                              <div className="absolute left-[-2px] top-1.5 h-3 w-3 md:h-3.5 md:w-3.5 rounded-full bg-slate-300 ring-4 ring-slate-100" />
                              <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Ngày báo cáo</p>
                              <p className="text-sm md:text-base font-black text-slate-700">{formatDate(suCo.ngayBaoCao)}</p>
                           </div>

                           {suCo.ngayXuLy && (
                             <div className="relative pl-7 md:pl-8">
                                <div className="absolute left-[-2px] top-1.5 h-3 w-3 md:h-3.5 md:w-3.5 rounded-full bg-amber-400 ring-4 ring-amber-50" />
                                <p className="text-[10px] md:text-xs text-amber-500 font-bold uppercase tracking-wider mb-1">Bắt đầu xử lý</p>
                                <p className="text-sm md:text-base font-black text-slate-700">{formatDate(suCo.ngayXuLy)}</p>
                             </div>
                           )}

                           {suCo.ngayHoanThanh && (
                             <div className="relative pl-7 md:pl-8">
                                <div className="absolute left-[-2px] top-1.5 h-3 w-3 md:h-3.5 md:w-3.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />
                                <p className="text-[10px] md:text-xs text-emerald-600 font-bold uppercase tracking-wider mb-1">Hoàn thành</p>
                                <p className="text-sm md:text-base font-black text-emerald-700">{formatDate(suCo.ngayHoanThanh)}</p>
                             </div>
                           )}

                           <div className="relative pl-7 md:pl-8">
                              <div className="absolute left-[-2px] top-1.5 h-3 w-3 md:h-3.5 md:w-3.5 rounded-full bg-blue-400 ring-4 ring-blue-50" />
                              <p className="text-[10px] md:text-xs text-blue-500 font-bold uppercase tracking-wider mb-1">Cập nhật cuối</p>
                              <p className="text-sm md:text-base font-black text-slate-700">{formatDate(suCo.ngayCapNhat)}</p>
                           </div>
                        </div>
                      </div>
                   </section>
                </div>

              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="p-4 md:p-5 border-t bg-white flex justify-end gap-3 shrink-0">
           <Button variant="outline" onClick={onClose} className="rounded-xl px-6 md:px-8 font-bold text-slate-600 text-sm md:text-base h-10 md:h-11">
             Đóng
           </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
