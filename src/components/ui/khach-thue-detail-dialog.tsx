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
import { Button } from "@/components/ui/button";

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
          <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 shadow-sm border-0 whitespace-nowrap px-4 py-1.5 font-bold rounded-full transition-colors leading-none text-sm">
            <ShieldCheck className="h-4 w-4 mr-1 inline-block" />
            Đang thuê
          </Badge>
        );
      case 'daTraPhong':
        return (
          <Badge variant="secondary" className="bg-gray-500 text-white hover:bg-gray-600 shadow-sm border-0 whitespace-nowrap px-4 py-1.5 font-bold rounded-full transition-colors leading-none text-sm">
            Đã trả phòng
          </Badge>
        );
      case 'chuaThue':
        return (
          <Badge variant="outline" className="border-orange-500 text-orange-600 shadow-sm border whitespace-nowrap px-4 py-1.5 font-bold rounded-full transition-colors bg-orange-50/50 leading-none text-sm">
            Chưa thuê
          </Badge>
        );
      default:
        return <Badge variant="outline" className="rounded-full px-4 py-1.5 font-bold leading-none text-sm">{status}</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-[95vw] sm:max-w-[550px] md:max-w-[650px] p-0 flex flex-col h-[85vh] border-0 shadow-2xl overflow-hidden rounded-[2.5rem]"
      >
        {/* Header */}
        <DialogHeader className="px-8 py-6 border-b flex flex-row items-center justify-between shrink-0 space-y-0 bg-white">
          <div className="flex items-center gap-4">
            <DialogTitle className="text-3xl font-black text-slate-800 flex items-center gap-3">
              <User className="h-9 w-9 text-primary" />
              {khachThue.hoTen}
            </DialogTitle>
            {getTrangThaiBadge(khachThue.trangThai)}
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50/30 custom-scrollbar">
          <div className="p-8 space-y-8">
            {/* Short contacts */}
            <div className="flex flex-wrap items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 text-base font-bold text-slate-700">
                <Phone className="h-5 w-5 text-primary/60 shrink-0" />
                <span>{khachThue.soDienThoai}</span>
              </div>
              {khachThue.email && (
                <>
                  <Separator orientation="vertical" className="h-5 bg-slate-200" />
                  <div className="flex items-center gap-2 text-base font-bold text-slate-700">
                    <Mail className="h-5 w-5 text-primary/60 shrink-0" />
                    <span>{khachThue.email}</span>
                  </div>
                </>
              )}
              <Separator orientation="vertical" className="h-5 bg-slate-200 hidden sm:block" />
              <div className="flex items-center gap-2 text-base font-black text-primary capitalize hidden sm:flex">
                <span>Giới tính: {khachThue.gioiTinh === 'nam' ? 'Nam' : khachThue.gioiTinh === 'nu' ? 'Nữ' : 'Khác'}</span>
              </div>
            </div>

            <div className="flex flex-col gap-8 items-start text-left">
              {/* Personal Info */}
              <div className="space-y-6 w-full">
                <section className="space-y-4">
                  <h3 className="font-black text-sm uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2.5 px-2">
                    <CreditCard className="h-5 w-5 text-slate-400" />
                    Định danh & Cơ bản
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <Card className="rounded-[2rem] border-slate-100 bg-white shadow-sm overflow-hidden border-2">
                      <CardContent className="p-6 space-y-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <CreditCard className="h-5 w-5 text-slate-500" />
                            </div>
                            <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Số CCCD</span>
                          </div>
                          <span className="font-black text-lg text-slate-700 tracking-wider bg-slate-50 px-4 py-1.5 rounded-xl border border-slate-100">{khachThue.cccd}</span>
                        </div>
                        
                        <Separator className="bg-slate-100" />
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <Calendar className="h-5 w-5 text-slate-500" />
                            </div>
                            <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Ngày sinh</span>
                          </div>
                          <span className="font-black text-lg text-slate-700">{formatDate(khachThue.ngaySinh)}</span>
                        </div>

                        <Separator className="bg-slate-100" />

                        <div className="flex items-start gap-3">
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 shrink-0">
                                <MapPin className="h-5 w-5 text-slate-500" />
                            </div>
                            <div className="flex flex-col mt-0.5">
                                <span className="text-xs text-slate-400 font-black uppercase tracking-wider mb-1">Quê quán (Theo CCCD)</span>
                                <span className="text-base font-bold text-slate-700 leading-snug">{khachThue.queQuan}</span>
                            </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="bg-indigo-50 p-6 rounded-[2.5rem] border border-indigo-100 flex items-center gap-5">
                        <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-indigo-50">
                            <Briefcase className="h-6 w-6 text-indigo-500" />
                        </div>
                        <div>
                            <p className="text-xs text-indigo-400 uppercase font-black tracking-widest mb-1">Công việc / Nghề nghiệp</p>
                            <p className="text-xl font-black text-indigo-700">{khachThue.ngheNghiep || 'Thông tin chưa cập nhật'}</p>
                        </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="font-black text-sm uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2.5 px-2">
                    <Home className="h-5 w-5 text-slate-400" />
                    Lịch sử cư trú & Hợp đồng
                  </h3>
                  
                  <div className="space-y-4">
                    {khachThue.tatCaHopDong && khachThue.tatCaHopDong.length > 0 ? (
                      khachThue.tatCaHopDong.map((hd) => (
                        <div key={hd._id} className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 shadow-sm hover:border-slate-200 transition-all">
                          <div className="flex items-center gap-6">
                            <div className={`h-16 w-16 rounded-2xl flex items-center justify-center font-black text-2xl shrink-0 ${
                              hd.trangThai === 'hoatDong' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100'
                            }`}>
                                {hd.phongInfo?.maPhong || '??'}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <div className="flex items-center justify-between mb-1.5">
                                    <p className="text-xs text-slate-400 uppercase font-black tracking-widest">Mã HĐ: {hd.maHopDong}</p>
                                    <Badge variant="outline" className={`text-xs font-black uppercase px-3 py-1 rounded-lg ${
                                        hd.trangThai === 'hoatDong' ? 'border-emerald-200 text-emerald-600 bg-emerald-50/50' : 
                                        hd.trangThai === 'hetHan' ? 'border-orange-200 text-orange-600 bg-orange-50/50' : 'border-slate-200 text-slate-400 bg-slate-50'
                                    }`}>
                                        {hd.trangThai === 'hoatDong' ? 'Đang hiệu lực' : hd.trangThai === 'hetHan' ? 'Hết hạn' : 'Đã hủy'}
                                    </Badge>
                                </div>
                                <h4 className="text-base font-black text-slate-700 truncate">{hd.phongInfo?.toaNhaInfo?.tenToaNha || hd.phongInfo?.toaNha?.tenToaNha || 'Không rõ Tòa nhà'}</h4>
                                <div className="flex items-center gap-4 mt-2">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                        <Calendar className="h-4 w-4" />
                                        <span>{formatDate(hd.ngayBatDau)} - {formatDate(hd.ngayKetThuc)}</span>
                                    </div>
                                </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-slate-50/80 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center">
                        <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100">
                            <Home className="h-7 w-7 text-slate-300" />
                        </div>
                        <p className="text-base font-bold text-slate-500 max-w-[250px]">Người này hiện chưa có lịch sử cư trú nào</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* Documents & System */}
              <div className="space-y-6 w-full">
                <section className="space-y-4">
                  <h3 className="font-black text-sm uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2.5 px-2">
                    <Info className="h-5 w-5 text-slate-400" />
                    Hình ảnh CCCD
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-5">
                    {[
                      { label: 'Mặt trước', src: khachThue.anhCCCD?.matTruoc },
                      { label: 'Mặt sau', src: khachThue.anhCCCD?.matSau }
                    ].map((img, idx) => (
                      <div key={idx} className="space-y-2.5">
                          <p className="text-xs text-center font-black uppercase tracking-wider text-slate-400">{img.label}</p>
                          <div className="aspect-[1.6/1] bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden flex items-center justify-center group relative">
                            {img.src ? (
                              <img 
                                src={img.src} 
                                alt={img.label} 
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                              />
                            ) : (
                              <span className="text-xs font-black uppercase text-slate-300">Chưa tải lên</span>
                            )}
                          </div>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                    <p className="text-xs font-black text-blue-400 uppercase tracking-tight flex items-center gap-1.5 mb-2">
                      <Clock className="h-4 w-4" />
                      Hồ sơ tạo lúc
                    </p>
                    <p className="text-base font-black text-blue-600 truncate">{formatDate(khachThue.ngayTao)}</p>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-tight flex items-center gap-1.5 mb-2">
                      <History className="h-4 w-4" />
                      Cập nhật cuối
                    </p>
                    <p className="text-base font-black text-slate-600">{formatDate(khachThue.ngayCapNhat)}</p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-5 border-t bg-white flex justify-end gap-3 shrink-0">
           <Button variant="outline" onClick={onClose} className="rounded-xl px-8 font-bold text-slate-600 text-base h-11">
             Đóng
           </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
