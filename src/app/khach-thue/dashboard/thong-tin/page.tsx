'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Mail, Phone, MapPin, Briefcase, Calendar, ShieldCheck, BadgeCheck, Loader2, Home, FileText, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

export default function ThongTinKhachThuePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Thông tin cá nhân - Khách thuê';
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/khach-thue/me');
      const result = await response.json();
      if (result.success) {
        setProfile(result.data);
      } else {
        toast.error('Không thể tải thông tin hồ sơ');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
        <p className="text-sm text-muted-foreground animate-pulse">Đang tải hồ sơ của bạn...</p>
      </div>
    );
  }

  const formatDate = (date: string | Date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('vi-VN');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Cột trái: Avatar và tóm tắt */}
        <div className="w-full md:w-1/3 space-y-6">
          <Card className="border-none shadow-premium bg-white/80 backdrop-blur-xl rounded-[2.5rem] overflow-hidden group">
            <CardContent className="pt-10 pb-8 flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="size-32 rounded-[2rem] bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-2xl group-hover:scale-105 transition-transform duration-500">
                  <User className="size-16" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-xl shadow-lg border-4 border-white">
                  <BadgeCheck className="size-5" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{profile?.hoTen}</h2>
              <p className="text-sm font-medium text-primary bg-primary/5 px-4 py-1 rounded-full">{profile?.ngheNghiep || 'Khách thuê'}</p>
              
              <div className="mt-8 pt-8 border-t border-gray-100 w-full space-y-4">
                <div className="flex items-center justify-between text-sm px-2">
                  <span className="text-gray-400">Trạng thái</span>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-none shrink-0">Đang thuê</Badge>
                </div>
                <div className="flex items-center justify-between text-sm px-2">
                  <span className="text-gray-400">Tham gia từ</span>
                  <span className="font-bold text-gray-700">{formatDate(profile?.createdAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-premium bg-gradient-to-br from-indigo-600 to-primary rounded-[2rem] overflow-hidden text-white">
            <CardContent className="p-8">
              <div className="bg-white/20 size-12 rounded-xl flex items-center justify-center mb-4">
                <ShieldCheck className="size-6 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">Tài khoản đã xác minh</h3>
              <p className="text-sm text-white/80 leading-relaxed">
                Thông tin định danh của bạn đã được quản lý xác nhận dựa trên CCCD cung cấp trong hợp đồng.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Cột phải: Chi tiết và Hợp đồng */}
        <div className="flex-1 space-y-6 w-full">
          <Card className="border-none shadow-premium bg-white rounded-[2rem] overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-xl font-bold text-gray-900">Thông tin chi tiết</CardTitle>
              <CardDescription>Các thông tin cá nhân cơ bản của bạn</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-4 group">
                    <div className="size-10 rounded-xl bg-secondary/30 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                      <Smartphone className="size-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">Số điện thoại</p>
                      <p className="text-sm font-bold text-gray-700">{profile?.soDienThoai}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 group">
                    <div className="size-10 rounded-xl bg-secondary/30 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                      <Mail className="size-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">Email liên hệ</p>
                      <p className="text-sm font-bold text-gray-700">{profile?.email || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 group">
                    <div className="size-10 rounded-xl bg-secondary/30 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                      <BadgeCheck className="size-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">Số CCCD</p>
                      <p className="text-sm font-bold text-gray-700">{profile?.cccd || '••••••••••••'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-4 group">
                    <div className="size-10 rounded-xl bg-secondary/30 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                      <Calendar className="size-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">Ngày sinh</p>
                      <p className="text-sm font-bold text-gray-700">{formatDate(profile?.ngaySinh)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 group">
                    <div className="size-10 rounded-xl bg-secondary/30 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                      <MapPin className="size-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">Quê quán</p>
                      <p className="text-sm font-bold text-gray-700">{profile?.queQuan}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 group">
                    <div className="size-10 rounded-xl bg-secondary/30 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                      <User className="size-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">Giới tính</p>
                      <p className="text-sm font-bold text-gray-700 capitalize">{profile?.gioiTinh === 'nam' ? 'Nam' : profile?.gioiTinh === 'nu' ? 'Nữ' : 'Khác'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {profile?.hopDongHienTai && (
            <Card className="border-none shadow-premium bg-white rounded-[2rem] overflow-hidden">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-xl font-bold text-gray-900 border-l-4 border-primary pl-4">Hợp đồng thuê hiện tại</CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-4">
                <div className="p-6 bg-primary/5 rounded-[1.5rem] border border-primary/10 mb-6">
                  <div className="flex items-start gap-4">
                    <div className="size-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary shrink-0">
                      <Home className="size-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900">Phòng {profile.hopDongHienTai.phong.maPhong}</h4>
                      <p className="text-sm text-gray-500">{profile.hopDongHienTai.phong.toaNha.tenToaNha}</p>
                    </div>
                    <Badge className="bg-emerald-500 text-white border-none py-1 px-3">Hoạt động</Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <FileText className="size-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-600">Xem văn bản hợp đồng kỹ thuật số</span>
                  </div>
                  <Button variant="outline" className="rounded-xl bg-white border-gray-200">
                    Tải về PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" className="h-12 px-8 rounded-2xl border-gray-200 font-bold">
              Yêu cầu cập nhật
            </Button>
            <Button className="h-12 px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all font-bold">
              Đổi mật khẩu
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
