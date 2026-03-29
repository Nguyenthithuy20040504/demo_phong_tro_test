'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  User, Mail, Phone, MapPin, Briefcase, Calendar, 
  ShieldCheck, BadgeCheck, Loader2, Home, FileText, 
  Smartphone, Camera, Lock, PlusCircle, Clock, CheckCircle2,
  XCircle, AlertCircle, Trash2, Edit, Printer, Download, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SuCoImageUpload } from '@/components/ui/su-co-image-upload';

export default function ThongTinKhachThuePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // State cho các Dialogs
  const [openEditProfile, setOpenEditProfile] = useState(false);
  const [openChangePassword, setOpenChangePassword] = useState(false);
  const [openRequestDocs, setOpenRequestDocs] = useState(false);
  const [openContractDoc, setOpenContractDoc] = useState(false);
  
  // Form states
  const [editForm, setEditForm] = useState({ hoTen: '', soDienThoai: '' });
  const [passForm, setPassForm] = useState({ matKhauCu: '', matKhauMoi: '', matKhauMoiInit: '' });
  const [docRequest, setDocRequest] = useState({ tieuDe: '', moTa: '', anhMatTruoc: '', anhMatSau: '' });
  const [submitting, setSubmitting] = useState(false);
  
  // Danh sách yêu cầu hồ sơ
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    document.title = 'Thông tin cá nhân - Khách thuê';
    fetchProfile();
    fetchRequests();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/khach-thue/me');
      const result = await response.json();
      if (result.success) {
        setProfile({
          ...result.data.khachThue,
          hopDongHienTai: result.data.hopDongHienTai
        });
        setEditForm({
          hoTen: result.data.khachThue.hoTen || '',
          soDienThoai: result.data.khachThue.soDienThoai || ''
        });
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

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/su-co?loaiSuCo=hoSo');
      const result = await response.json();
      if (result.success) {
        setRequests(result.data);
      }
    } catch (error) {
      console.error('Error fetching doc requests:', error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const response = await fetch('/api/auth/khach-thue/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Cập nhật thông tin thành công');
        fetchProfile();
        setOpenEditProfile(false);
      } else {
        toast.error(result.message || 'Cập nhật thất bại');
      }
    } catch (error) {
      toast.error('Lỗi khi gửi dữ liệu');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passForm.matKhauMoi !== passForm.matKhauMoiInit) {
      toast.error('Mật khẩu mới không khớp');
      return;
    }
    try {
      setSubmitting(true);
      const response = await fetch('/api/auth/khach-thue/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matKhauCu: passForm.matKhauCu,
          matKhauMoi: passForm.matKhauMoi
        })
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Đổi mật khẩu thành công');
        setPassForm({ matKhauCu: '', matKhauMoi: '', matKhauMoiInit: '' });
        setOpenChangePassword(false);
      } else {
        toast.error(result.message || 'Đổi mật khẩu thất bại');
      }
    } catch (error) {
      toast.error('Lỗi khi gửi dữ liệu');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const response = await fetch('/api/su-co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phong: profile?.hopDongHienTai?.phong?._id || profile?._id,
          tieuDe: docRequest.tieuDe,
          moTa: docRequest.moTa,
          anhSuCo: [docRequest.anhMatTruoc, docRequest.anhMatSau].filter(Boolean),
          loaiSuCo: 'hoSo',
          mucDoUuTien: 'trungBinh'
        })
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Yêu cầu đã được gửi tới chủ nhà');
        setDocRequest({ tieuDe: '', moTa: '', anhMatTruoc: '', anhMatSau: '' });
        fetchRequests();
        setOpenRequestDocs(false);
      } else {
        toast.error(result.message || 'Gửi yêu cầu thất bại');
      }
    } catch (error) {
      toast.error('Lỗi khi gửi dữ liệu');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa yêu cầu này?')) return;
    try {
      const response = await fetch(`/api/su-co?id=${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        toast.success('Đã xóa yêu cầu');
        fetchRequests();
      }
    } catch (error) {
      toast.error('Lỗi khi xóa');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'moi': return <Badge className="bg-blue-500/10 text-blue-600 border-none">Mới</Badge>;
      case 'dangXuLy': return <Badge className="bg-amber-500/10 text-amber-600 border-none px-2 py-0.5"><Clock className="size-3 mr-1"/> Đang xử lý</Badge>;
      case 'daXong': return <Badge className="bg-emerald-500/10 text-emerald-600 border-none"><CheckCircle2 className="size-3 mr-1"/> Đã xong</Badge>;
      case 'daHuy': return <Badge className="bg-red-500/10 text-red-600 border-none">Đã hủy</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: string | Date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('vi-VN');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Cột trái: Avatar và tóm tắt */}
        <div className="w-full lg:w-1/3 space-y-6">
          <Card className="border-none shadow-premium bg-white/80 backdrop-blur-xl rounded-[2.5rem] overflow-hidden group">
            <CardContent className="pt-10 pb-8 flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="size-32 rounded-[2.5rem] bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-2xl group-hover:scale-105 transition-all duration-500 overflow-hidden">
                  {profile?.anhDaiDien ? (
                    <img src={profile.anhDaiDien} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="size-16" />
                  )}
                  {/* Overlay upload ảnh */}
                  <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                    <Camera className="text-white size-8" />
                    <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('file', file);
                      try {
                        toast.loading('Đang tải ảnh lên...');
                        const res = await fetch('/api/upload', { method: 'POST', body: formData });
                        const resData = await res.json();
                        if (resData.success) {
                          const imgUrl = resData.data.url;
                          await fetch('/api/auth/khach-thue/me', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ anhDaiDien: imgUrl })
                          });
                          fetchProfile();
                          toast.dismiss();
                          toast.success('Đã cập nhật ảnh đại diện');
                        }
                      } catch (err) {
                        toast.dismiss();
                        toast.error('Lỗi khi tải ảnh');
                      }
                    }} />
                  </label>
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
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-none shrink-0 font-bold">Đang thuê</Badge>
                </div>
                <div className="flex items-center justify-between text-sm px-2">
                  <span className="text-gray-400">ID Hệ thống</span>
                  <span className="font-mono text-[10px] text-gray-500 uppercase">{profile?._id?.substring(0, 12)}...</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-premium bg-gradient-to-br from-indigo-600 to-primary rounded-[2rem] overflow-hidden text-white hidden md:block">
            <CardContent className="p-8">
              <div className="bg-white/20 size-12 rounded-xl flex items-center justify-center mb-4">
                <ShieldCheck className="size-6 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">Hồ sơ đã xác minh</h3>
              <p className="text-sm text-white/80 leading-relaxed">
                Các thông tin của bạn đã được đối chiếu trực tiếp với hệ thống quản lý cư dân và hợp đồng thuê phòng.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Cột phải: Chi tiết và Hợp đồng */}
        <div className="flex-1 space-y-6 w-full">
          {/* Thông tin cá nhân */}
          <Card className="border-none shadow-premium bg-white rounded-[2rem] overflow-hidden">
            <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">Thông tin cá nhân</CardTitle>
                <CardDescription>Các thông tin liên lạc và định danh</CardDescription>
              </div>
              <Dialog open={openEditProfile} onOpenChange={setOpenEditProfile}>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="size-10 p-0 rounded-full hover:bg-gray-100">
                    <Edit className="size-5 text-gray-400" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md rounded-[2rem]">
                  <DialogHeader>
                    <DialogTitle>Cập nhật hồ sơ</DialogTitle>
                    <DialogDescription>Chỉnh sửa các thông tin cơ bản của bạn</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleUpdateProfile} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Họ và tên</Label>
                      <Input 
                        id="name" 
                        value={editForm.hoTen} 
                        onChange={(e) => setEditForm(prev => ({ ...prev, hoTen: e.target.value }))}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Số điện thoại</Label>
                      <Input 
                        id="phone" 
                        value={editForm.soDienThoai} 
                        onChange={(e) => setEditForm(prev => ({ ...prev, soDienThoai: e.target.value }))}
                        className="rounded-xl"
                      />
                    </div>
                    <DialogFooter className="pt-4">
                      <Button type="submit" disabled={submitting} className="w-full rounded-xl">
                        {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                        Lưu thay đổi
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
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

          {/* Hợp đồng và Hành động */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-premium bg-white rounded-[2rem] overflow-hidden">
              <CardHeader className="p-6 pb-2">
                <CardTitle className="text-lg font-bold">Hợp đồng hiện tại</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                {profile?.hopDongHienTai ? (
                  <div className="space-y-3">
                    <div className="p-4 bg-primary/5 rounded-2xl flex items-center gap-3">
                      <Home className="size-5 text-primary" />
                      <div>
                        <p className="text-sm font-bold">Phòng {profile.hopDongHienTai.phong.maPhong}</p>
                        <p className="text-[10px] text-gray-500 uppercase">{profile.hopDongHienTai.phong.toaNha.tenToaNha}</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full rounded-xl py-5 border-primary/20 hover:bg-primary/5 text-sm text-primary font-semibold"
                      onClick={() => setOpenContractDoc(true)}
                    >
                      <Eye className="size-4 mr-2" />
                      Xem chi tiết hợp đồng
                    </Button>
                    {profile.hopDongHienTai.fileHopDong && (
                      <Button 
                        variant="ghost" 
                        className="w-full rounded-xl py-4 text-xs text-gray-500 hover:text-gray-700"
                        onClick={() => window.open(profile.hopDongHienTai.fileHopDong, '_blank')}
                      >
                        <Download className="size-3.5 mr-2" />
                        Tải bản PDF đã ký
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400 italic text-sm">Chưa có hợp đồng hoạt động</div>
                )}
              </CardContent>
            </Card>

            {/* ======= DIALOG XEM CHI TIẾT HỢP ĐỒNG - BẢN DOC ======= */}
            {profile?.hopDongHienTai && (
              <Dialog open={openContractDoc} onOpenChange={setOpenContractDoc}>
                <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto rounded-2xl p-0">
                  <DialogHeader className="p-6 pb-0 flex flex-row items-center justify-between">
                    <div>
                      <DialogTitle className="text-xl">Chi tiết Hợp đồng thuê phòng</DialogTitle>
                      <DialogDescription>Mã hợp đồng: {profile.hopDongHienTai.maHopDong}</DialogDescription>
                    </div>
                  </DialogHeader>
                  
                  {/* Contract Document Content */}
                  <div className="px-6 md:px-10 pb-8">
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 md:p-10 space-y-6" id="contract-doc">
                      {/* Header quốc hiệu */}
                      <div className="text-center space-y-1">
                        <p className="text-sm md:text-base font-bold uppercase tracking-wider">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                        <p className="text-sm md:text-base font-bold">Độc lập – Tự do – Hạnh phúc</p>
                        <div className="flex items-center justify-center">
                          <div className="w-24 h-[2px] bg-black mt-1"></div>
                        </div>
                      </div>

                      {/* Tiêu đề hợp đồng */}
                      <div className="text-center space-y-2 pt-4">
                        <h2 className="text-lg md:text-xl font-bold uppercase">HỢP ĐỒNG THUÊ PHÒNG TRỌ</h2>
                        <p className="text-sm text-gray-600 italic">Số: {profile.hopDongHienTai.maHopDong}</p>
                      </div>

                      {/* Căn cứ */}
                      <div className="text-sm leading-relaxed space-y-1 pt-2">
                        <p className="italic text-gray-600">- Căn cứ Bộ luật Dân sự số 91/2015/QH13;</p>
                        <p className="italic text-gray-600">- Căn cứ Luật Nhà ở số 65/2014/QH13;</p>
                        <p className="italic text-gray-600">- Căn cứ nhu cầu và khả năng thực tế của hai bên;</p>
                        <p className="mt-2">Hôm nay, ngày <strong>{new Date(profile.hopDongHienTai.ngayBatDau).toLocaleDateString('vi-VN')}</strong>, tại <strong>{(() => {
                          const diaChi = profile.hopDongHienTai.phong?.toaNha?.diaChi;
                          if (diaChi) {
                            return `${diaChi.soNha || ''} ${diaChi.duong || ''}, ${diaChi.phuong || ''}, ${diaChi.quan || ''}, ${diaChi.thanhPho || ''}`;
                          }
                          return profile.hopDongHienTai.phong?.toaNha?.tenToaNha || 'N/A';
                        })()}</strong>, chúng tôi gồm:</p>
                      </div>

                      {/* BÊN A */}
                      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5 space-y-2">
                        <h3 className="font-bold text-base uppercase text-blue-800">BÊN A (Bên cho thuê):</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div><span className="text-gray-500">Ông/Bà:</span> <strong>{(() => {
                            const owner = profile.hopDongHienTai.phong?.toaNha?.chuSoHuu;
                            return owner?.hoTen || owner?.ten || 'Chủ nhà';
                          })()}</strong></div>
                          <div><span className="text-gray-500">Điện thoại:</span> <strong>{profile.hopDongHienTai.phong?.toaNha?.chuSoHuu?.soDienThoai || 'N/A'}</strong></div>
                          <div className="md:col-span-2"><span className="text-gray-500">Địa chỉ cho thuê:</span> <strong>{profile.hopDongHienTai.phong?.toaNha?.tenToaNha || 'N/A'}</strong></div>
                        </div>
                      </div>

                      {/* BÊN B */}
                      <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-5 space-y-2">
                        <h3 className="font-bold text-base uppercase text-emerald-800">BÊN B (Bên thuê):</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div><span className="text-gray-500">Ông/Bà:</span> <strong>{(() => {
                            const nd = profile.hopDongHienTai.nguoiDaiDien;
                            return nd?.hoTen || profile.hoTen || 'N/A';
                          })()}</strong></div>
                          <div><span className="text-gray-500">Điện thoại:</span> <strong>{(() => {
                            const nd = profile.hopDongHienTai.nguoiDaiDien;
                            return nd?.soDienThoai || profile.soDienThoai || 'N/A';
                          })()}</strong></div>
                          <div><span className="text-gray-500">CCCD/CMND:</span> <strong>{profile.cccd || '••••••••••••'}</strong></div>
                        </div>
                        {/* Danh sách thành viên */}
                        {profile.hopDongHienTai.khachThueId && profile.hopDongHienTai.khachThueId.length > 1 && (
                          <div className="mt-3 pt-3 border-t border-emerald-200">
                            <p className="text-xs font-bold text-emerald-700 mb-2">Cùng sinh sống ({profile.hopDongHienTai.khachThueId.length} người):</p>
                            <div className="space-y-1">
                              {profile.hopDongHienTai.khachThueId.map((kt: any, i: number) => (
                                <p key={kt._id || i} className="text-xs text-gray-600">• {kt.hoTen} – {kt.soDienThoai || 'N/A'}</p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ĐIỀU 1: ĐỐI TƯỢNG HỢP ĐỒNG */}
                      <div className="space-y-2">
                        <h3 className="font-bold text-base">Điều 1: Đối tượng hợp đồng</h3>
                        <div className="text-sm leading-relaxed space-y-1">
                          <p>Bên A đồng ý cho Bên B thuê phòng trọ với các thông tin sau:</p>
                          <div className="bg-gray-50 rounded-xl p-4 mt-2 space-y-2">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                              <div><span className="text-gray-500">Phòng số:</span> <strong>{profile.hopDongHienTai.phong?.maPhong || 'N/A'}</strong></div>
                              <div><span className="text-gray-500">Tầng:</span> <strong>{profile.hopDongHienTai.phong?.tang || 'N/A'}</strong></div>
                              <div><span className="text-gray-500">Diện tích:</span> <strong>{profile.hopDongHienTai.phong?.dienTich || 'N/A'} m²</strong></div>
                              <div><span className="text-gray-500">Tòa nhà:</span> <strong>{profile.hopDongHienTai.phong?.toaNha?.tenToaNha || 'N/A'}</strong></div>
                            </div>
                            {profile.hopDongHienTai.phong?.tienNghi && profile.hopDongHienTai.phong.tienNghi.length > 0 && (
                              <div className="pt-2 border-t border-gray-200">
                                <p className="text-xs text-gray-500 mb-1">Tiện nghi đi kèm:</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {profile.hopDongHienTai.phong.tienNghi.map((tn: string, i: number) => (
                                    <span key={i} className="text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded-full">{tn}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* ĐIỀU 2: THỜI HẠN */}
                      <div className="space-y-2">
                        <h3 className="font-bold text-base">Điều 2: Thời hạn hợp đồng</h3>
                        <div className="text-sm leading-relaxed">
                          <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div><span className="text-gray-500">Ngày bắt đầu:</span> <strong>{new Date(profile.hopDongHienTai.ngayBatDau).toLocaleDateString('vi-VN')}</strong></div>
                            <div><span className="text-gray-500">Ngày kết thúc:</span> <strong>{new Date(profile.hopDongHienTai.ngayKetThuc).toLocaleDateString('vi-VN')}</strong></div>
                            <div className="md:col-span-2"><span className="text-gray-500">Thời hạn:</span> <strong>{(() => {
                              const start = new Date(profile.hopDongHienTai.ngayBatDau);
                              const end = new Date(profile.hopDongHienTai.ngayKetThuc);
                              const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
                              return months > 0 ? `${months} tháng` : `${Math.ceil((end.getTime() - start.getTime()) / (1000*60*60*24))} ngày`;
                            })()}</strong></div>
                          </div>
                        </div>
                      </div>

                      {/* ĐIỀU 3: GIÁ THUÊ VÀ THANH TOÁN */}
                      <div className="space-y-2">
                        <h3 className="font-bold text-base">Điều 3: Giá thuê và phương thức thanh toán</h3>
                        <div className="text-sm leading-relaxed space-y-3">
                          <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 space-y-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="flex justify-between md:block">
                                <span className="text-gray-500">Giá thuê phòng:</span>
                                <strong className="text-lg text-amber-700">{(profile.hopDongHienTai.giaThue || 0).toLocaleString('vi-VN')}đ/{profile.hopDongHienTai.chuKyThanhToan === 'thang' ? 'tháng' : profile.hopDongHienTai.chuKyThanhToan === 'quy' ? 'quý' : 'năm'}</strong>
                              </div>
                              <div className="flex justify-between md:block">
                                <span className="text-gray-500">Tiền đặt cọc:</span>
                                <strong>{(profile.hopDongHienTai.tienCoc || 0).toLocaleString('vi-VN')}đ</strong>
                              </div>
                            </div>
                            <div className="pt-2 border-t border-amber-200">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="flex justify-between md:block">
                                  <span className="text-gray-500">Giá điện:</span>
                                  <strong>{(profile.hopDongHienTai.giaDien || 0).toLocaleString('vi-VN')}đ/kWh</strong>
                                </div>
                                <div className="flex justify-between md:block">
                                  <span className="text-gray-500">Giá nước:</span>
                                  <strong>{(profile.hopDongHienTai.giaNuoc || 0).toLocaleString('vi-VN')}đ/m³</strong>
                                </div>
                              </div>
                            </div>
                            <div className="pt-2 border-t border-amber-200">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="flex justify-between md:block">
                                  <span className="text-gray-500">Chỉ số điện ban đầu:</span>
                                  <strong>{profile.hopDongHienTai.chiSoDienBanDau || 0} kWh</strong>
                                </div>
                                <div className="flex justify-between md:block">
                                  <span className="text-gray-500">Chỉ số nước ban đầu:</span>
                                  <strong>{profile.hopDongHienTai.chiSoNuocBanDau || 0} m³</strong>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Phí dịch vụ */}
                          {profile.hopDongHienTai.phiDichVu && profile.hopDongHienTai.phiDichVu.length > 0 && (
                            <div className="bg-gray-50 rounded-xl p-4">
                              <p className="font-semibold text-sm mb-2">Phí dịch vụ hàng tháng:</p>
                              <div className="space-y-1.5">
                                {profile.hopDongHienTai.phiDichVu.map((dv: any, i: number) => (
                                  <div key={i} className="flex justify-between text-sm">
                                    <span className="text-gray-600">• {dv.ten}</span>
                                    <strong>{(dv.gia || 0).toLocaleString('vi-VN')}đ</strong>
                                  </div>
                                ))}
                                <div className="flex justify-between text-sm font-bold pt-2 border-t border-gray-200">
                                  <span>Tổng phí dịch vụ:</span>
                                  <span className="text-primary">{profile.hopDongHienTai.phiDichVu.reduce((s: number, d: any) => s + (d.gia || 0), 0).toLocaleString('vi-VN')}đ/tháng</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Hình thức thanh toán */}
                          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                            <p className="font-semibold text-sm text-blue-800 mb-2">📌 Hình thức thanh toán:</p>
                            <ul className="text-sm space-y-1.5 text-gray-700">
                              <li>• Bên B thanh toán tiền thuê phòng vào <strong className="text-blue-700">ngày {profile.hopDongHienTai.ngayThanhToan || 'N/A'}</strong> hàng tháng.</li>
                              <li>• Chu kỳ thanh toán: <strong>{profile.hopDongHienTai.chuKyThanhToan === 'thang' ? 'Hàng tháng' : profile.hopDongHienTai.chuKyThanhToan === 'quy' ? 'Hàng quý' : 'Hàng năm'}</strong>.</li>
                              <li>• Phương thức: Tiền mặt hoặc chuyển khoản ngân hàng.</li>
                              <li>• Tiền điện, nước và phí dịch vụ được tính theo thực tế sử dụng hàng tháng và thanh toán cùng tiền thuê phòng.</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* ĐIỀU 4: NGHĨA VỤ VÀ QUYỀN HẠN BÊN A */}
                      <div className="space-y-2">
                        <h3 className="font-bold text-base">Điều 4: Nghĩa vụ và quyền hạn của Bên A</h3>
                        <div className="text-sm leading-relaxed">
                          <ul className="space-y-1.5 list-decimal pl-5">
                            <li>Giao phòng trọ cho Bên B đúng tình trạng như đã thỏa thuận.</li>
                            <li>Đảm bảo quyền sử dụng phòng trọ ổn định cho Bên B trong suốt thời hạn hợp đồng.</li>
                            <li>Bảo trì, sửa chữa phòng trọ khi có hư hỏng không do lỗi của Bên B (trừ hao mòn tự nhiên).</li>
                            <li>Cung cấp hóa đơn thanh toán tiền thuê, điện, nước đầy đủ hàng tháng.</li>
                            <li>Thông báo trước ít nhất 30 ngày nếu muốn chấm dứt hợp đồng trước thời hạn.</li>
                            <li>Không được tự ý tăng giá thuê trong thời hạn hợp đồng trừ khi có sự đồng ý bằng văn bản của Bên B.</li>
                            <li>Hoàn trả tiền đặt cọc cho Bên B khi kết thúc hợp đồng, sau khi trừ các khoản phí hư hỏng (nếu có).</li>
                          </ul>
                        </div>
                      </div>

                      {/* ĐIỀU 5: NGHĨA VỤ VÀ QUYỀN HẠN BÊN B */}
                      <div className="space-y-2">
                        <h3 className="font-bold text-base">Điều 5: Nghĩa vụ và quyền hạn của Bên B</h3>
                        <div className="text-sm leading-relaxed">
                          <ul className="space-y-1.5 list-decimal pl-5">
                            <li>Thanh toán đầy đủ và đúng hạn tiền thuê phòng, tiền điện, nước và các phí dịch vụ khác.</li>
                            <li>Giữ gìn phòng trọ sạch sẽ, không làm hư hỏng tài sản của Bên A.</li>
                            <li>Không được tự ý sửa chữa, cải tạo phòng khi chưa có sự đồng ý của Bên A.</li>
                            <li>Thực hiện đúng nội quy của tòa nhà/khu nhà trọ (giờ giấc, an ninh, vệ sinh chung).</li>
                            <li>Không được cho người khác thuê lại hoặc chuyển nhượng hợp đồng khi chưa được Bên A đồng ý.</li>
                            <li>Đăng ký tạm trú theo quy định pháp luật.</li>
                            <li>Thông báo trước ít nhất 30 ngày nếu muốn chấm dứt hợp đồng trước thời hạn.</li>
                            <li>Bồi thường thiệt hại nếu làm hư hỏng tài sản của Bên A ngoài phạm vi hao mòn tự nhiên.</li>
                          </ul>
                        </div>
                      </div>

                      {/* ĐIỀU 6: CÁC ĐIỀU KHOẢN DỊCH VỤ */}
                      <div className="space-y-2">
                        <h3 className="font-bold text-base">Điều 6: Điều khoản dịch vụ</h3>
                        <div className="text-sm leading-relaxed">
                          <ul className="space-y-1.5 list-decimal pl-5">
                            <li>Tiền điện được tính theo chỉ số công tơ thực tế với đơn giá <strong>{(profile.hopDongHienTai.giaDien || 0).toLocaleString('vi-VN')}đ/kWh</strong>.</li>
                            <li>Tiền nước được tính theo chỉ số đồng hồ thực tế với đơn giá <strong>{(profile.hopDongHienTai.giaNuoc || 0).toLocaleString('vi-VN')}đ/m³</strong>.</li>
                            {profile.hopDongHienTai.phiDichVu && profile.hopDongHienTai.phiDichVu.map((dv: any, i: number) => (
                              <li key={i}>Phí {dv.ten}: <strong>{(dv.gia || 0).toLocaleString('vi-VN')}đ/tháng</strong> (cố định).</li>
                            ))}
                            <li>Các khoản phí dịch vụ có thể được điều chỉnh khi có sự thỏa thuận bằng văn bản giữa hai bên.</li>
                          </ul>
                        </div>
                      </div>

                      {/* ĐIỀU 7: CHẤM DỨT HỢP ĐỒNG */}
                      <div className="space-y-2">
                        <h3 className="font-bold text-base">Điều 7: Chấm dứt hợp đồng</h3>
                        <div className="text-sm leading-relaxed">
                          <ul className="space-y-1.5 list-decimal pl-5">
                            <li>Hợp đồng chấm dứt khi hết thời hạn mà hai bên không gia hạn.</li>
                            <li>Hai bên có thể thỏa thuận chấm dứt hợp đồng trước thời hạn với điều kiện thông báo trước ít nhất 30 ngày.</li>
                            <li>Nếu Bên B chấm dứt hợp đồng trước thời hạn mà không có lý do chính đáng, Bên A có quyền không hoàn trả tiền cọc.</li>
                            <li>Nếu Bên A chấm dứt hợp đồng trước thời hạn mà không có lý do chính đáng, Bên A phải bồi thường cho Bên B một khoản bằng tiền cọc đã nhận.</li>
                          </ul>
                        </div>
                      </div>

                      {/* ĐIỀU 8: ĐIỀU KHOẢN BỔ SUNG (từ DB) */}
                      {profile.hopDongHienTai.dieuKhoan && (
                        <div className="space-y-2">
                          <h3 className="font-bold text-base">Điều 8: Điều khoản bổ sung</h3>
                          <div className="bg-gray-50 rounded-xl p-4 text-sm leading-relaxed whitespace-pre-line">
                            {profile.hopDongHienTai.dieuKhoan}
                          </div>
                        </div>
                      )}

                      {/* ĐIỀU KHOẢN CUỐI */}
                      <div className="space-y-2">
                        <h3 className="font-bold text-base">Điều {profile.hopDongHienTai.dieuKhoan ? '9' : '8'}: Điều khoản chung</h3>
                        <div className="text-sm leading-relaxed space-y-1.5">
                          <p>1. Hai bên cam kết thực hiện đúng và đầy đủ các điều khoản đã ghi trong hợp đồng.</p>
                          <p>2. Mọi tranh chấp phát sinh được giải quyết trên tinh thần thương lượng, hòa giải. Nếu không thỏa thuận được, sẽ được giải quyết tại cơ quan có thẩm quyền.</p>
                          <p>3. Hợp đồng được lập thành 02 (hai) bản, mỗi bên giữ 01 (một) bản, có giá trị pháp lý như nhau.</p>
                        </div>
                      </div>

                      {/* Chữ ký */}
                      <div className="grid grid-cols-2 gap-8 pt-6 border-t border-gray-200 mt-6">
                        <div className="text-center space-y-2">
                          <p className="font-bold text-sm uppercase">BÊN A</p>
                          <p className="text-xs text-gray-400 italic">(Ký và ghi rõ họ tên)</p>
                          <div className="h-20"></div>
                          <p className="font-semibold text-sm">{(() => {
                            const owner = profile.hopDongHienTai.phong?.toaNha?.chuSoHuu;
                            return owner?.hoTen || owner?.ten || '';
                          })()}</p>
                        </div>
                        <div className="text-center space-y-2">
                          <p className="font-bold text-sm uppercase">BÊN B</p>
                          <p className="text-xs text-gray-400 italic">(Ký và ghi rõ họ tên)</p>
                          <div className="h-20"></div>
                          <p className="font-semibold text-sm">{(() => {
                            const nd = profile.hopDongHienTai.nguoiDaiDien;
                            return nd?.hoTen || profile.hoTen || '';
                          })()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3 mt-6 justify-end">
                      <Button
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => {
                          const printContent = document.getElementById('contract-doc');
                          if (printContent) {
                            const printWindow = window.open('', '_blank');
                            if (printWindow) {
                              printWindow.document.write(`
                                <html><head><title>Hợp đồng ${profile.hopDongHienTai.maHopDong}</title>
                                <style>
                                  body { font-family: 'Times New Roman', serif; padding: 40px; line-height: 1.8; }
                                  * { box-sizing: border-box; }
                                  strong { font-weight: 700; }
                                  ul { padding-left: 20px; }
                                  li { margin-bottom: 4px; }
                                  @media print { body { padding: 20px; } }
                                </style></head><body>${printContent.innerHTML}</body></html>
                              `);
                              printWindow.document.close();
                              printWindow.print();
                            }
                          }
                        }}
                      >
                        <Printer className="size-4 mr-2" />
                        In hợp đồng
                      </Button>
                      <Button className="rounded-xl" onClick={() => setOpenContractDoc(false)}>
                        Đóng
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            <Card className="border-none shadow-premium bg-white rounded-[2rem] overflow-hidden">
              <CardHeader className="p-6 pb-2">
                <CardTitle className="text-lg font-bold">Bảo mật & Hỗ trợ</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-3">
                <Dialog open={openChangePassword} onOpenChange={setOpenChangePassword}>
                  <DialogTrigger asChild>
                    <Button className="w-full h-11 rounded-xl bg-gray-900 hover:bg-black font-bold text-sm">
                      <Lock className="size-4 mr-2" />
                      Đổi mật khẩu
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md rounded-[2rem]">
                    <DialogHeader>
                      <DialogTitle>Đổi mật khẩu mới</DialogTitle>
                      <DialogDescription>Giúp tài khoản của bạn an toàn hơn</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleChangePassword} className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Mật khẩu hiện tại</Label>
                        <Input type="password" value={passForm.matKhauCu} onChange={e => setPassForm(p => ({...p, matKhauCu: e.target.value}))} className="rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label>Mật khẩu mới</Label>
                        <Input type="password" value={passForm.matKhauMoiInit} onChange={e => setPassForm(p => ({...p, matKhauMoiInit: e.target.value}))} className="rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label>Xác nhận mật khẩu</Label>
                        <Input type="password" value={passForm.matKhauMoi} onChange={e => setPassForm(p => ({...p, matKhauMoi: e.target.value}))} className="rounded-xl" />
                      </div>
                      <Button type="submit" disabled={submitting} className="w-full rounded-xl h-11 mt-2">
                        Cập nhật mật khẩu
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog open={openRequestDocs} onOpenChange={setOpenRequestDocs}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full h-11 rounded-xl border-primary/20 text-primary hover:bg-primary/5 font-bold text-sm">
                      <PlusCircle className="size-4 mr-2" />
                      Yêu cầu bổ sung hồ sơ
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg rounded-[2.5rem] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Yêu cầu bổ sung tài liệu</DialogTitle>
                      <DialogDescription>Gửi yêu cầu cập nhật hồ sơ, CCCD hoặc thông tin cư dân cho chủ nhà</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleRequestDoc} className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Loại tài liệu / Tiêu đề</Label>
                        <Input 
                          placeholder="VD: Cập nhật CCCD mới, Đính kèm sổ tạm trú..." 
                          value={docRequest.tieuDe} 
                          onChange={e => setDocRequest(p => ({...p, tieuDe: e.target.value}))}
                          className="rounded-xl"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Chi tiết yêu cầu</Label>
                        <Textarea 
                          placeholder="Mô tả cụ thể về tài liệu bạn muốn bổ sung..." 
                          value={docRequest.moTa}
                          onChange={e => setDocRequest(p => ({...p, moTa: e.target.value}))}
                          className="rounded-xl min-h-[100px]"
                          required
                        />
                      </div>
                      <div className="space-y-3">
                        <Label>Ảnh Căn cước công dân (CCCD)</Label>
                        <div className="grid grid-cols-2 gap-4">
                          {/* Mặt trước */}
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase text-center">Mặt trước</p>
                            <div className="relative aspect-[3/2] rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center overflow-hidden group/img">
                              {docRequest.anhMatTruoc ? (
                                <>
                                  <img src={docRequest.anhMatTruoc} className="w-full h-full object-cover" />
                                  <button 
                                    type="button"
                                    onClick={() => setDocRequest(p => ({...p, anhMatTruoc: ''}))}
                                    className="absolute top-2 right-2 size-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                                  >
                                    <Trash2 className="size-3" />
                                  </button>
                                </>
                              ) : (
                                <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full">
                                  <Camera className="size-6 text-gray-300 mb-2" />
                                  <span className="text-[10px] text-gray-400 font-medium">Tải ảnh lên</span>
                                  <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const formData = new FormData();
                                    formData.append('file', file);
                                    try {
                                      toast.loading('Đang tải ảnh...');
                                      const res = await fetch('/api/upload', { method: 'POST', body: formData });
                                      const data = await res.json();
                                      if (data.success) {
                                        setDocRequest(p => ({...p, anhMatTruoc: data.data.url}));
                                      }
                                      toast.dismiss();
                                    } catch (err) {
                                      toast.dismiss();
                                      toast.error('Lỗi upload');
                                    }
                                  }} />
                                </label>
                              )}
                            </div>
                          </div>

                          {/* Mặt sau */}
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase text-center">Mặt sau</p>
                            <div className="relative aspect-[3/2] rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center overflow-hidden group/img">
                              {docRequest.anhMatSau ? (
                                <>
                                  <img src={docRequest.anhMatSau} className="w-full h-full object-cover" />
                                  <button 
                                    type="button"
                                    onClick={() => setDocRequest(p => ({...p, anhMatSau: ''}))}
                                    className="absolute top-2 right-2 size-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                                  >
                                    <Trash2 className="size-3" />
                                  </button>
                                </>
                              ) : (
                                <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full">
                                  <Camera className="size-6 text-gray-300 mb-2" />
                                  <span className="text-[10px] text-gray-400 font-medium">Tải ảnh lên</span>
                                  <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const formData = new FormData();
                                    formData.append('file', file);
                                    try {
                                      toast.loading('Đang tải ảnh...');
                                      const res = await fetch('/api/upload', { method: 'POST', body: formData });
                                      const data = await res.json();
                                      if (data.success) {
                                        setDocRequest(p => ({...p, anhMatSau: data.data.url}));
                                      }
                                      toast.dismiss();
                                    } catch (err) {
                                      toast.dismiss();
                                      toast.error('Lỗi upload');
                                    }
                                  }} />
                                </label>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <DialogFooter className="pt-4">
                        <Button type="submit" disabled={submitting} className="w-full rounded-xl h-12">
                          {submitting ? 'Đang gửi...' : 'Gửi yêu cầu ngay'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>

          {/* Danh sách yêu cầu đã gửi */}
          <Card className="border-none shadow-premium bg-white rounded-[2rem] overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-xl font-bold text-gray-900">Lịch sử yêu cầu hồ sơ</CardTitle>
              <CardDescription>Theo dõi các yêu cầu bổ sung tài liệu bạn đã gửi</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-4">
              {requests.length > 0 ? (
                <div className="space-y-4">
                  {requests.map((req) => (
                    <motion.div 
                      key={req._id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 border border-gray-100 rounded-2xl bg-gray-50/50 hover:bg-white hover:shadow-xl hover:border-transparent transition-all group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            {getStatusBadge(req.trangThai)}
                            <span className="text-[10px] text-gray-400">{formatDate(req.ngayBaoCao)}</span>
                          </div>
                          <h4 className="font-bold text-gray-800 line-clamp-1">{req.tieuDe}</h4>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{req.moTa}</p>
                          
                          {req.anhSuCo && req.anhSuCo.length > 0 && (
                            <div className="flex gap-2 mt-3">
                              {req.anhSuCo.map((img: string, i: number) => (
                                <div key={i} className="size-10 rounded-lg overflow-hidden border border-gray-200">
                                  <img src={img} className="w-full h-full object-cover" />
                                </div>
                              ))}
                            </div>
                          )}

                          {req.ghiChuXuLy && (
                            <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                              <p className="text-[10px] font-bold text-amber-800 uppercase mb-1">Phản hồi từ chủ nhà</p>
                              <p className="text-xs text-amber-700">{req.ghiChuXuLy}</p>
                            </div>
                          )}
                        </div>
                        {req.trangThai === 'moi' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteRequest(req._id)}
                            className="text-gray-300 hover:text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                  <div className="size-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-4 text-gray-300">
                    <AlertCircle className="size-8" />
                  </div>
                  <h4 className="font-bold text-gray-400">Chưa có yêu cầu nào</h4>
                  <p className="text-xs text-gray-400 mt-1 max-w-[200px]">Hãy gửi yêu cầu đầu tiên khi bạn muốn bổ sung thông tin cư dân.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
