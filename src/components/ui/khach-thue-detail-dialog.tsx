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
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  CreditCard,
  Briefcase,
  Clock,
  History,
  Home,
  ShieldCheck,
  Building2,
  Info,
} from "lucide-react";
import type { KhachThue } from '@/types';
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface KhachThueDetailDialogProps {
  khachThue: KhachThue | null;
  isOpen: boolean;
  onClose: () => void;
}

export function KhachThueDetailDialog({ khachThue, isOpen, onClose }: KhachThueDetailDialogProps) {
  if (!khachThue) return null;

  const formatDate = (date?: Date | string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const getTrangThaiBadge = (status: string) => {
    switch (status) {
      case 'dangThue':
        return (
          <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 shadow-sm border-0 whitespace-nowrap px-4 py-1.5 font-bold rounded-full transition-colors">
            <ShieldCheck className="h-3.5 w-3.5 mr-1" />
            Đang thuê
          </Badge>
        );
      case 'daTraPhong':
        return (
          <Badge variant="secondary" className="bg-gray-500 text-white hover:bg-gray-600 shadow-sm border-0 whitespace-nowrap px-4 py-1.5 font-bold rounded-full transition-colors">
            Đã trả phòng
          </Badge>
        );
      case 'chuaThue':
        return (
          <Badge variant="outline" className="border-orange-500 text-orange-600 shadow-sm border whitespace-nowrap px-4 py-1.5 font-bold rounded-full transition-colors">
            Chưa thuê
          </Badge>
        );
      default:
        return <Badge variant="outline" className="rounded-full px-4 py-1.5 font-bold">{status}</Badge>;
    }
  };

  const hopDong = khachThue.hopDongHienTai;
  const phong = hopDong?.phong;
  const toaNha = phong?.toaNha;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        className="w-[98vw] lg:max-w-4xl p-0 flex flex-col h-[90vh] my-auto mr-4 lg:mr-6 rounded-[3rem] border-0 shadow-[0_0_50px_-12px_rgba(0,0,0,0.15)] overflow-hidden bg-background/80 backdrop-blur-3xl transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
      >
        <div className="flex flex-col h-full overflow-hidden">
          <SheetHeader className="px-10 py-8 border-b bg-gradient-to-br from-primary/[0.03] via-transparent to-primary/[0.03] shrink-0 space-y-0 text-left">
             <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2 overflow-hidden">
                <div className="flex items-center gap-5">
                  <div className="bg-primary/10 p-3 rounded-[1.25rem] shadow-sm transform -rotate-2 hover:rotate-0 transition-all duration-500">
                     <User className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <SheetTitle className="text-4xl font-black tracking-tight text-foreground leading-none mb-1">
                      {khachThue.hoTen}
                    </SheetTitle>
                    <SheetDescription className="text-muted-foreground font-semibold flex items-center gap-2">
                       Hồ sơ khách thuê & Thông tin cư trú
                    </SheetDescription>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-x-8 gap-y-1.5 text-muted-foreground/80 font-bold ml-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-primary/60 shrink-0" />
                    <span>{khachThue.soDienThoai}</span>
                  </div>
                  {khachThue.email && (
                    <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-primary/60 shrink-0" />
                        <span>{khachThue.email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-6 shrink-0">
                 {getTrangThaiBadge(khachThue.trangThai)}
                 <div className="hidden lg:block text-right">
                    <p className="text-[11px] text-muted-foreground uppercase font-black tracking-[0.2em] mb-1 opacity-60">Giới tính</p>
                    <p className="text-xl font-black text-primary capitalize">{khachThue.gioiTinh === 'nam' ? 'Nam' : khachThue.gioiTinh === 'nu' ? 'Nữ' : 'Khác'}</p>
                 </div>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 w-full overflow-x-hidden no-scrollbar">
            <div className="p-10 pb-16 max-w-full overflow-x-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start text-left">
                
                {/* COLUMN 1: Personal Info */}
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 fill-mode-both">
                   <section className="space-y-5">
                      <h3 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2.5 px-2">
                        <CreditCard className="h-4 w-4 text-primary/60" />
                        Định danh & Cơ bản
                      </h3>
                      
                      <div className="grid grid-cols-1 gap-4">
                        <Card className="rounded-[2rem] border-primary/5 bg-primary/[0.02] shadow-none overflow-hidden">
                          <CardContent className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="bg-white p-2 rounded-xl shadow-sm border border-primary/5">
                                  <CreditCard className="h-4 w-4 text-primary" />
                                </div>
                                <span className="text-sm font-bold text-muted-foreground">Số CCCD</span>
                              </div>
                              <span className="font-black text-foreground tracking-wider">{khachThue.cccd}</span>
                            </div>
                            
                            <Separator className="bg-primary/5" />
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="bg-white p-2 rounded-xl shadow-sm border border-primary/5">
                                  <Calendar className="h-4 w-4 text-primary" />
                                </div>
                                <span className="text-sm font-bold text-muted-foreground">Ngày sinh</span>
                              </div>
                              <span className="font-black text-foreground">{formatDate(khachThue.ngaySinh)}</span>
                            </div>

                            <Separator className="bg-primary/5" />

                            <div className="flex items-start gap-3">
                                <MapPin className="h-4 w-4 text-primary/60 mt-1 shrink-0" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Quê quán (Theo CCCD)</span>
                                    <span className="text-sm font-bold text-foreground leading-snug">{khachThue.queQuan}</span>
                                </div>
                            </div>
                          </CardContent>
                        </Card>

                        <div className="bg-indigo-500/[0.03] p-6 rounded-[2.5rem] border border-indigo-500/10 flex items-center gap-5">
                            <div className="bg-white p-3 rounded-2xl shadow-sm border border-indigo-500/10">
                                <Briefcase className="h-5 w-5 text-indigo-500" />
                            </div>
                            <div>
                                <p className="text-[10px] text-indigo-600 uppercase font-black tracking-widest mb-0.5 opacity-60">Công việc / Nghề nghiệp</p>
                                <p className="text-lg font-black text-foreground">{khachThue.ngheNghiep || 'Thông tin chưa cập nhật'}</p>
                            </div>
                        </div>
                      </div>
                   </section>

                   <section className="space-y-4">
                      <h3 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2.5 px-2">
                        <Home className="h-4 w-4 text-primary/60" />
                        Lịch sử cư trú & Hợp đồng
                      </h3>
                      
                      <div className="space-y-4">
                        {khachThue.tatCaHopDong && khachThue.tatCaHopDong.length > 0 ? (
                          khachThue.tatCaHopDong.map((hd) => (
                            <div key={hd._id} className="bg-background border border-primary/5 rounded-[2rem] p-5 shadow-sm hover:border-primary/20 transition-all group">
                              <div className="flex items-center gap-5">
                                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner-sm shrink-0 ${
                                  hd.trangThai === 'hoatDong' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-gray-100 text-gray-400'
                                }`}>
                                    {hd.phong?.maPhong || '??'}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Mã HĐ: {hd.maHopDong}</p>
                                        <Badge variant="outline" className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                            hd.trangThai === 'hoatDong' ? 'border-emerald-500 text-emerald-600' : 
                                            hd.trangThai === 'hetHan' ? 'border-orange-500 text-orange-600' : 'border-gray-400 text-gray-400'
                                        }`}>
                                            {hd.trangThai === 'hoatDong' ? 'Đang hiệu lực' : hd.trangThai === 'hetHan' ? 'Hết hạn' : 'Đã hủy'}
                                        </Badge>
                                    </div>
                                    <h4 className="text-base font-black text-foreground truncate">{hd.phong?.toaNha?.tenToaNha || 'N/A'}</h4>
                                    <div className="flex items-center gap-4 mt-1">
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                                            <Calendar className="h-3 w-3" />
                                            <span>{formatDate(hd.ngayBatDau)} - {formatDate(hd.ngayKetThuc)}</span>
                                        </div>
                                    </div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="bg-background border border-primary/5 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center">
                            <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <Home className="h-7 w-7 text-gray-300" />
                            </div>
                            <p className="text-sm font-bold text-gray-500 max-w-[200px]">Người này hiện chưa có lịch sử cư trú nào</p>
                          </div>
                        )}
                      </div>
                   </section>
                </div>

                {/* COLUMN 2: Documents & System */}
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both">
                   <section className="space-y-5">
                      <h3 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2.5 px-2">
                        <Info className="h-4 w-4 text-primary/60" />
                        Hình ảnh CCCD
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { label: 'Mặt trước', src: khachThue.anhCCCD?.matTruoc },
                          { label: 'Mặt sau', src: khachThue.anhCCCD?.matSau }
                        ].map((img, idx) => (
                          <div key={idx} className="space-y-2">
                             <p className="text-[10px] text-center font-black uppercase tracking-wider text-muted-foreground opacity-60">{img.label}</p>
                             <div className="aspect-[1.6/1] bg-primary/[0.02] border border-dashed border-primary/10 rounded-2xl overflow-hidden flex items-center justify-center group relative">
                                {img.src ? (
                                  <img 
                                    src={img.src} 
                                    alt={img.label} 
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                  />
                                ) : (
                                  <span className="text-[10px] font-black uppercase text-primary/30">Chưa tải lên</span>
                                )}
                             </div>
                          </div>
                        ))}
                      </div>
                   </section>

                   <Card className="rounded-[2rem] border-primary/5 bg-primary/[0.02] shadow-none">
                      <CardContent className="p-6 space-y-4">
                        <div className="flex items-center gap-4 text-[11px]">
                          <div className="bg-background/50 p-2 rounded-xl border border-primary/5 shadow-sm">
                            <Clock className="h-4 w-4 text-primary/60" />
                          </div>
                          <span className="text-muted-foreground font-black uppercase tracking-wider opacity-60">Hồ sơ tạo lúc</span>
                          <span className="font-black text-foreground ml-auto">{formatDate(khachThue.ngayTao)}</span>
                        </div>
                        <Separator className="bg-primary/5 shadow-sm" />
                        <div className="flex items-center gap-4 text-[11px]">
                          <div className="bg-background/50 p-2 rounded-xl border border-primary/5 shadow-sm">
                            <History className="h-4 w-4 text-primary/60" />
                          </div>
                          <span className="text-muted-foreground font-black uppercase tracking-wider opacity-60">Lần cuối cập nhật</span>
                          <span className="font-black text-foreground ml-auto">{formatDate(khachThue.ngayCapNhat)}</span>
                        </div>
                      </CardContent>
                   </Card>
                </div>

              </div>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
