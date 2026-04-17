'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  User, Mail, Phone, MapPin, Briefcase, Calendar, 
  ShieldCheck, BadgeCheck, Loader2, Home, FileText, 
  Smartphone, Camera, Lock, PlusCircle, Clock, CheckCircle2,
  XCircle, AlertCircle, Trash2, Edit, Printer, Download, Eye, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
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
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Breadcrumb - Consistent with Invoice Page */}
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-1">
        <Link 
          href="/khach-thue/dashboard" 
          className="flex items-center gap-1.5 text-gray-400 hover:text-primary transition-colors"
        >
          <Home className="size-3" />
          Trang Chủ
        </Link>
        <ChevronRight className="size-3 text-gray-300" />
        <span className="text-primary/80">Cá nhân</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-stretch relative">
        {/* Row 1: Profile & Information Alignment */}
        <div className="lg:col-span-1">
          <Card className="border-2 border-gray-100 shadow-premium bg-white/80 backdrop-blur-xl rounded-[2.5rem] overflow-hidden group h-full">
            <CardContent className="pt-8 pb-6 flex flex-col items-center text-center px-6">
              <div className="relative mb-6">
                <div className="size-28 rounded-[2rem] bg-gradient-to-br from-primary via-primary/80 to-indigo-600 flex items-center justify-center text-white shadow-2xl group-hover:scale-105 transition-all duration-500 overflow-hidden border-4 border-white">
                  {profile?.anhDaiDien ? (
                    <img src={profile.anhDaiDien} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="size-12" />
                  )}
                  <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity backdrop-blur-sm">
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
                          const imgUrl = resData.data.secure_url;
                          const updateRes = await fetch('/api/auth/khach-thue/me', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ anhDaiDien: imgUrl })
                          });
                          const updateData = await updateRes.json();
                          if (updateData.success) {
                            fetchProfile();
                            toast.dismiss();
                            toast.success('Đã cập nhật ảnh đại diện');
                          } else {
                            toast.dismiss();
                            toast.error(updateData.message || 'Lỗi khi lưu ảnh đại diện');
                          }
                        } else {
                          toast.dismiss();
                          toast.error(resData.message || 'Lỗi khi tải ảnh lên');
                        }
                      } catch (err) {
                        toast.dismiss();
                        toast.error('Lỗi khi tải ảnh');
                      }
                    }} />
                  </label>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-2 rounded-2xl shadow-xl border-4 border-white animate-in zoom-in-0 duration-500">
                  <BadgeCheck className="size-5" />
                </div>
              </div>

              <h2 className="text-xl font-semibold text-gray-900 mb-1 tracking-tight">{profile?.hoTen}</h2>
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/10">
                {profile?.ngheNghiep || 'Cư dân PiRoom'}
              </div>
              
              <div className="mt-6 pt-6 border-t-2 border-gray-50 w-full space-y-4">
                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider px-2">
                  <span className="text-gray-400">Tình trạng</span>
                  <span className="text-emerald-500 flex items-center gap-1.5">
                    <div className="size-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    Đang thuê
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider px-2">
                  <span className="text-gray-400">ID Hệ thống</span>
                  <span className="text-gray-600 font-mono tracking-normal lowercase">{profile?._id?.substring(0, 8)}...</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card className="border-2 border-gray-100 shadow-premium bg-white rounded-[2.5rem] overflow-hidden h-full">
            <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between border-b border-gray-50 mb-4">
              <div>
                <CardTitle className="text-xl font-black text-gray-900 tracking-tight">Thông tin cá nhân</CardTitle>
                <CardDescription className="text-xs font-medium text-gray-400">Quản lý các thông tin liên lạc và định danh chính chủ</CardDescription>
              </div>
              <Dialog open={openEditProfile} onOpenChange={setOpenEditProfile}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="size-11 p-0 rounded-2xl border-gray-100 hover:border-primary/30 hover:bg-primary/5 transition-all group">
                    <Edit className="size-5 text-gray-400 group-hover:text-primary transition-colors" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md rounded-[2.5rem] border-2">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-black">Cập nhật hồ sơ</DialogTitle>
                    <DialogDescription className="font-medium">Chỉnh sửa thông tin cơ bản để hệ thống cập nhật chính xác nhất</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleUpdateProfile} className="space-y-5 py-6">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">Họ và tên</Label>
                      <Input 
                        value={editForm.hoTen} 
                        onChange={(e) => setEditForm(prev => ({ ...prev, hoTen: e.target.value }))}
                        className="h-12 rounded-2xl border-gray-100 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">Số điện thoại</Label>
                      <Input 
                        value={editForm.soDienThoai} 
                        onChange={(e) => setEditForm(prev => ({ ...prev, soDienThoai: e.target.value }))}
                        className="h-12 rounded-2xl border-gray-100 focus:ring-primary/20"
                      />
                    </div>
                    <Button type="submit" disabled={submitting} className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase text-[11px] tracking-widest shadow-lg shadow-primary/20">
                      {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                      Cập nhật ngay
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-6 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { icon: Smartphone, label: 'Số điện thoại', value: profile?.soDienThoai, color: 'emerald' },
                  { icon: Mail, label: 'Email liên hệ', value: profile?.email || 'N/A', color: 'blue' },
                  { icon: BadgeCheck, label: 'Số CCCD', value: profile?.cccd || '••••••••••••', color: 'indigo' },
                  { icon: Calendar, label: 'Ngày sinh', value: formatDate(profile?.ngaySinh), color: 'amber' },
                  { icon: MapPin, label: 'Quê quán', value: profile?.queQuan, color: 'rose' },
                  { icon: User, label: 'Giới tính', value: profile?.gioiTinh === 'nam' ? 'Nam' : profile?.gioiTinh === 'nu' ? 'Nữ' : 'Khác', color: 'cyan' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-5 group">
                    <div className="size-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-all shadow-sm border border-transparent group-hover:border-primary/10">
                      <item.icon className="size-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 mb-1 leading-none">{item.label}</p>
                      <p className="text-[14px] font-semibold text-gray-800 tracking-tight">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Secondary Content */}
        <div className="lg:col-span-1">
          <Card className="border-2 border-primary shadow-premium bg-gradient-to-br from-indigo-700 via-primary to-primary rounded-[2.5rem] overflow-hidden text-white relative group h-full">
            <div className="absolute top-0 right-0 size-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-white/20 transition-all duration-700" />
            <CardContent className="p-8 relative z-10">
              <div className="bg-white/20 size-12 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-xl border border-white/30 shadow-2xl group-hover:rotate-12 transition-transform duration-500">
                <ShieldCheck className="size-6 text-white" />
              </div>
              <h3 className="font-black text-xl mb-3 tracking-tight">Hồ sơ đã xác minh</h3>
              <p className="text-sm text-white/80 leading-relaxed font-medium">
                Thông tin của bạn đã được đối chiếu trực tiếp với hệ thống quản lý và cơ sở dữ liệu PiRoom.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 flex flex-col gap-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Hợp đồng */}
            <Card className="border-2 border-gray-100 shadow-premium bg-white rounded-[2.5rem] overflow-hidden flex flex-col justify-between">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-xl font-black text-gray-900 tracking-tight">Hợp đồng hiện tại</CardTitle>
                <CardDescription className="text-xs font-medium text-gray-400">Trạng thái cư trú hợp pháp tại PiRoom</CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8 pt-2">
                {profile?.hopDongHienTai ? (
                  <div className="space-y-5">
                    <div className="p-6 bg-primary/5 rounded-[1.5rem] flex items-center gap-5 border border-primary/10">
                      <div className="size-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary">
                        <Home className="size-6" />
                      </div>
                      <div>
                        <p className="text-lg font-black text-gray-900 tracking-tight leading-none mb-1">Phòng {profile.hopDongHienTai.phong.maPhong}</p>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">{profile.hopDongHienTai.phong.toaNha.tenToaNha}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        variant="outline" 
                        className="h-12 rounded-2xl border-gray-200 hover:border-primary/30 hover:bg-primary/5 text-[11px] font-black uppercase tracking-widest text-primary transition-all grow"
                        onClick={() => setOpenContractDoc(true)}
                      >
                        <Eye className="size-4 mr-2" />
                        Chi tiết
                      </Button>
                      {profile.hopDongHienTai.fileHopDong && (
                        <Button 
                          variant="outline" 
                          className="h-12 rounded-2xl border-gray-200 hover:border-gray-900 hover:bg-gray-50 text-[11px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-900 transition-all grow"
                          onClick={() => window.open(profile.hopDongHienTai.fileHopDong, '_blank')}
                        >
                          <Download className="size-4 mr-2" />
                          Tải PDF
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-300">
                    <BadgeCheck className="size-12 opacity-20 mb-3" />
                    <p className="text-sm font-medium italic">Chưa có hợp đồng nào được ký kết</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bảo mật */}
            <Card className="border-2 border-gray-100 shadow-premium bg-white rounded-[2.5rem] overflow-hidden flex flex-col justify-between">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-xl font-black text-gray-900 tracking-tight">Bảo mật & Hỗ trợ</CardTitle>
                <CardDescription className="text-xs font-medium text-gray-400">Kiểm soát an toàn tài khoản và định danh</CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8 pt-2 space-y-4">
                <Dialog open={openChangePassword} onOpenChange={setOpenChangePassword}>
                  <DialogTrigger asChild>
                    <Button className="w-full h-12 rounded-2xl bg-gray-900 hover:bg-black font-black uppercase text-[11px] tracking-widest shadow-xl shadow-gray-200 transition-all hover:-translate-y-0.5">
                      <Lock className="size-4 mr-2 text-indigo-400" />
                      Đổi mật khẩu bảo mật
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md rounded-[2.5rem] border-2">
                    <DialogHeader>
                    <DialogTitle className="text-xl font-black">Thay đổi mật khẩu</DialogTitle>
                    <DialogDescription className="font-medium">Giúp tài khoản của bạn an toàn hơn với mật khẩu mạnh</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleChangePassword} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">Mật khẩu hiện tại</Label>
                      <Input type="password" value={passForm.matKhauCu} onChange={e => setPassForm(p => ({...p, matKhauCu: e.target.value}))} className="h-12 rounded-2xl border-gray-100" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">Mật khẩu mới</Label>
                      <Input type="password" value={passForm.matKhauMoiInit} onChange={e => setPassForm(p => ({...p, matKhauMoiInit: e.target.value}))} className="h-12 rounded-2xl border-gray-100" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">Xác nhận mật khẩu mới</Label>
                      <Input type="password" value={passForm.matKhauMoi} onChange={e => setPassForm(p => ({...p, matKhauMoi: e.target.value}))} className="h-12 rounded-2xl border-gray-100" />
                    </div>
                    <Button type="submit" disabled={submitting} className="w-full h-12 rounded-2xl bg-gray-900 hover:bg-black font-black uppercase text-[11px] tracking-widest mt-2">
                      {submitting ? 'Đanh xử lý...' : 'Cập nhật mật khẩu'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={openRequestDocs} onOpenChange={setOpenRequestDocs}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full h-12 rounded-2xl border-primary/20 text-primary hover:bg-primary/5 font-black uppercase text-[11px] tracking-widest transition-all">
                    <PlusCircle className="size-4 mr-2" />
                    Yêu cầu bổ sung hồ sơ
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg rounded-[2.5rem] max-h-[90vh] overflow-y-auto border-2 border-primary/20">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-black">Yêu cầu bổ sung tài liệu</DialogTitle>
                    <DialogDescription className="font-medium">Hồ sơ sẽ được gửi trực tiếp tới chủ nhà để phê duyệt</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleRequestDoc} className="space-y-5 py-4">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">Loại tài liệu / Tiêu đề</Label>
                      <Input 
                        placeholder="VD: Cập nhật CCCD mới..." 
                        value={docRequest.tieuDe} 
                        onChange={e => setDocRequest(p => ({...p, tieuDe: e.target.value}))}
                        className="h-12 rounded-2xl border-gray-100"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">Chi tiết yêu cầu</Label>
                      <Textarea 
                        placeholder="Mô tả cụ thể về tài liệu..." 
                        value={docRequest.moTa}
                        onChange={e => setDocRequest(p => ({...p, moTa: e.target.value}))}
                        className="rounded-2xl min-h-[120px] border-gray-100"
                        required
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">Ảnh Căn cước công dân (Nếu có)</Label>
                      <div className="grid grid-cols-2 gap-4">
                        {['anhMatTruoc', 'anhMatSau'].map((side) => (
                          <div key={side} className="space-y-2">
                            <p className="text-[9px] font-black text-gray-400 uppercase text-center tracking-tighter">
                              {side === 'anhMatTruoc' ? 'Mặt trước' : 'Mặt sau'}
                            </p>
                            <div className="relative aspect-[3/2] rounded-2xl border-2 border-dashed border-gray-100 bg-gray-50/50 flex flex-col items-center justify-center overflow-hidden group/img">
                              {(docRequest as any)[side] ? (
                                <>
                                  <img src={(docRequest as any)[side]} className="w-full h-full object-cover" />
                                  <button 
                                    type="button"
                                    onClick={() => setDocRequest(p => ({...p, [side]: ''}))}
                                    className="absolute top-2 right-2 size-7 rounded-2xl bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-all shadow-lg"
                                  >
                                    <Trash2 className="size-4" />
                                  </button>
                                </>
                              ) : (
                                <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full hover:bg-gray-100/50 transition-colors">
                                  <Camera className="size-6 text-gray-300 mb-2" />
                                  <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Tải lên</span>
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
                                        setDocRequest(p => ({...p, [side]: data.data.url}));
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
                        ))}
                      </div>
                    </div>
                    <Button type="submit" disabled={submitting} className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase text-[11px] tracking-widest shadow-lg shadow-primary/20">
                      {submitting ? 'Đang gửi...' : 'Xác nhận gửi yêu cầu'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
        </div>

        {/* Row 3: History Alignment (Full Width) */}
        <div className="lg:col-span-4">
          <Card className="border-2 border-gray-100 shadow-premium bg-white rounded-[2rem] overflow-hidden min-h-[150px]">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-xl font-black text-gray-900 tracking-tight">Lịch sử yêu cầu hồ sơ</CardTitle>
              <CardDescription className="text-xs font-medium text-gray-400">Theo dõi tiến độ xử lý hồ sơ từ Ban quản lý PiRoom</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {requests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {requests.map((req) => (
                    <motion.div 
                      key={req._id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 border-2 border-gray-50 rounded-[1.5rem] bg-gray-50/30 hover:bg-white hover:shadow-xl hover:border-primary/10 transition-all group relative overflow-hidden"
                    >
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {getStatusBadge(req.trangThai)}
                            <div className="flex items-center gap-1 text-[10px] font-black text-gray-300 uppercase tracking-widest">
                              <Clock className="size-3" />
                              {formatDate(req.ngayBaoCao)}
                            </div>
                          </div>
                          {req.trangThai === 'moi' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDeleteRequest(req._id)}
                              className="size-7 p-0 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                        <h4 className="font-black text-gray-900 tracking-tight mb-2 line-clamp-1">{req.tieuDe}</h4>
                        <p className="text-sm text-gray-500 font-medium line-clamp-1 mb-3 leading-relaxed">{req.moTa}</p>
                        
                        {(req.anhSuCo && req.anhSuCo.length > 0) || req.ghiChuXuLy ? (
                          <div className="flex flex-wrap gap-4 items-end mt-2">
                            {req.anhSuCo && req.anhSuCo.length > 0 && (
                              <div className="flex -space-x-3 overflow-hidden">
                                {req.anhSuCo.map((img: string, i: number) => (
                                  <div key={i} className="size-8 rounded-xl overflow-hidden border-2 border-white shadow-sm ring-1 ring-gray-100">
                                    <img src={img} className="w-full h-full object-cover" />
                                  </div>
                                ))}
                              </div>
                            )}

                            {req.ghiChuXuLy && (
                              <div className="flex-1 p-3 bg-amber-50/50 rounded-xl border border-amber-100/50">
                                <p className="text-[8px] font-black text-amber-800 uppercase tracking-widest mb-1">Cố vấn phản hồi</p>
                                <p className="text-[11px] text-amber-700 font-medium italic">"{req.ghiChuXuLy}"</p>
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50/50 rounded-[2rem] border-2 border-dashed border-gray-100">
                  <div className="size-14 rounded-[1.2rem] bg-white shadow-sm flex items-center justify-center mb-4 text-gray-200">
                    <FileText className="size-7" />
                  </div>
                  <h4 className="text-base font-black text-gray-400 tracking-tight">Ký ức vẫn còn trống...</h4>
                  <p className="text-xs text-gray-400/80 mt-1 font-medium max-w-[280px] px-4">Hãy gửi yêu cầu cập nhật đầu tiên để tối ưu hóa hồ sơ cư dân của bạn.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Contract Dialog (Main document view) */}
      {profile?.hopDongHienTai && (
        <Dialog open={openContractDoc} onOpenChange={setOpenContractDoc}>
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto rounded-[2.5rem] p-0 border-2 shadow-2xl">
            <DialogHeader className="p-8 pb-0 flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight">Văn bản Hợp đồng</DialogTitle>
                <DialogDescription className="font-bold text-primary tracking-widest uppercase text-[10px]">Mã lưu trữ: {profile.hopDongHienTai.maHopDong}</DialogDescription>
              </div>
            </DialogHeader>
            
            <div className="px-8 md:px-12 pb-10 mt-6">
              <div className="bg-white border-2 border-gray-100 rounded-[2rem] shadow-sm p-8 md:p-14 space-y-8" id="contract-doc">
                {/* NATIONAL HEADER */}
                <div className="text-center space-y-1">
                  <p className="text-base font-black uppercase tracking-widest">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                  <p className="text-base font-bold">Độc lập – Tự do – Hạnh phúc</p>
                  <div className="flex items-center justify-center py-2">
                    <div className="w-24 h-[1.5px] bg-gray-900"></div>
                  </div>
                </div>

                <div className="text-center space-y-2 pt-4">
                  <h2 className="text-2xl font-black uppercase tracking-tight">HỢP ĐỒNG THUÊ PHÒNG TRỌ</h2>
                  <p className="text-sm text-gray-500 font-mono italic">Số: {profile.hopDongHienTai.maHopDong}</p>
                </div>

                {/* Căn cứ */}
                <div className="text-[11px] leading-relaxed space-y-1 pt-2 font-medium text-gray-500 italic">
                  <p>- Căn cứ Bộ luật Dân sự số 91/2015/QH13;</p>
                  <p>- Căn cứ Luật Nhà ở số 65/2014/QH13;</p>
                  <p>- Căn cứ nhu cầu và khả năng thực tế của hai bên;</p>
                  <p className="mt-2 text-gray-900 not-italic">Hôm nay, ngày <strong>{new Date(profile.hopDongHienTai.ngayBatDau).toLocaleDateString('vi-VN')}</strong>, tại <strong>{profile.hopDongHienTai.phong?.toaNha?.diaChi ? `${profile.hopDongHienTai.phong.toaNha.diaChi.soNha} ${profile.hopDongHienTai.phong.toaNha.diaChi.duong}, ${profile.hopDongHienTai.phong.toaNha.diaChi.phuong}, ${profile.hopDongHienTai.phong.toaNha.diaChi.quan}, ${profile.hopDongHienTai.phong.toaNha.diaChi.thanhPho}` : profile.hopDongHienTai.phong?.toaNha?.tenToaNha || 'PiRoom Facility'}</strong>.</p>
                </div>

                {/* BÊN A */}
                <div className="bg-primary/5 border border-primary/20 rounded-[1.5rem] p-6 space-y-3">
                  <h3 className="font-black text-sm uppercase text-primary tracking-widest">BÊN A (Bên cho thuê):</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm">
                    <div><span className="text-gray-400 font-black uppercase text-[9px] tracking-widest">Chủ sở hữu:</span> <strong className="ml-2">{profile.hopDongHienTai.phong?.toaNha?.chuSoHuu?.hoTen || 'Đại diện PiRoom'}</strong></div>
                    <div><span className="text-gray-400 font-black uppercase text-[9px] tracking-widest">Hotline:</span> <strong className="ml-2">{profile.hopDongHienTai.phong?.toaNha?.chuSoHuu?.soDienThoai || 'N/A'}</strong></div>
                  </div>
                </div>

                {/* BÊN B */}
                <div className="bg-gray-50 border border-gray-100 rounded-[1.5rem] p-6 space-y-3">
                  <h3 className="font-black text-sm uppercase text-gray-900 tracking-widest">BÊN B (Bên thuê):</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm">
                    <div><span className="text-gray-400 font-black uppercase text-[9px] tracking-widest">Khách thuê:</span> <strong className="ml-2">{profile.hoTen}</strong></div>
                    <div><span className="text-gray-400 font-black uppercase text-[9px] tracking-widest">Điện thoại:</span> <strong className="ml-2">{profile.soDienThoai}</strong></div>
                    <div><span className="text-gray-400 font-black uppercase text-[9px] tracking-widest">CCCD:</span> <strong className="ml-2 font-mono">{profile.cccd || '••••••••••••'}</strong></div>
                  </div>
                </div>

                {/* ĐIỀU 1: ĐỐI TƯỢNG HỢP ĐỒNG */}
                <div className="space-y-3">
                  <h3 className="font-black text-[12px] uppercase tracking-widest border-l-4 border-gray-900 pl-3">Điều 1: Đối tượng hợp đồng</h3>
                  <div className="text-sm leading-relaxed text-gray-600">
                    <p>Bên A đồng ý cho Bên B thuê phòng trọ số <strong>{profile.hopDongHienTai.phong?.maPhong}</strong> tại tầng <strong>{profile.hopDongHienTai.phong?.tang}</strong>, 
                    diện tích <strong>{profile.hopDongHienTai.phong?.dienTich}m²</strong>.</p>
                  </div>
                </div>

                {/* ĐIỀU 2: THỜI HẠN */}
                <div className="space-y-3">
                  <h3 className="font-black text-[12px] uppercase tracking-widest border-l-4 border-gray-900 pl-3">Điều 2: Thời hạn thuê</h3>
                  <div className="text-sm leading-relaxed text-gray-600">
                    <p>Từ ngày <strong>{formatDate(profile.hopDongHienTai.ngayBatDau)}</strong> đến ngày <strong>{formatDate(profile.hopDongHienTai.ngayKetThuc)}</strong>.</p>
                  </div>
                </div>

                {/* ĐIỀU 3: GIÁ THUÊ & THANH TOÁN */}
                <div className="space-y-3">
                  <h3 className="font-black text-[12px] uppercase tracking-widest border-l-4 border-gray-900 pl-3">Điều 3: Giá thuê & Thanh toán</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">Giá thuê phòng/tháng</p>
                      <p className="text-xl font-black text-primary">{(profile.hopDongHienTai.giaThue || 0).toLocaleString('vi-VN')} VNĐ</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">Tiền đặt cọc</p>
                      <p className="text-xl font-black text-gray-900">{(profile.hopDongHienTai.tienCoc || 0).toLocaleString('vi-VN')} VNĐ</p>
                    </div>
                  </div>
                </div>

                {/* ĐIỀU 4: NỘI QUY CHUNG */}
                <div className="space-y-3">
                  <h3 className="font-black text-[12px] uppercase tracking-widest border-l-4 border-gray-900 pl-3">Điều 4: Quy định sử dụng</h3>
                  <div className="text-[11px] leading-relaxed text-gray-500 space-y-2">
                    <p>1. Bên B có trách nhiệm bảo quản tài sản trong phòng và khu vực dùng chung.</p>
                    <p>2. Không gây ồn ào, làm phiền các cư dân khác trong tòa nhà.</p>
                    <p>3. Tuyệt đối tuân thủ quy định về PCCC và an ninh trật tự.</p>
                  </div>
                </div>

                {/* Chữ ký */}
                <div className="grid grid-cols-2 gap-12 pt-12 border-t border-gray-100 mt-12">
                  <div className="text-center space-y-4">
                    <p className="font-black text-[10px] uppercase tracking-widest text-gray-400">Đại diện Bên A</p>
                    <div className="h-24"></div>
                    <p className="font-black text-gray-900">{profile.hopDongHienTai.phong?.toaNha?.chuSoHuu?.hoTen || 'PiRoom Admin'}</p>
                  </div>
                  <div className="text-center space-y-4">
                    <p className="font-black text-[10px] uppercase tracking-widest text-gray-400">Đại diện Bên B</p>
                    <div className="h-24"></div>
                    <p className="font-black text-gray-900">{profile.hoTen}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-8 justify-end">
                <Button
                  variant="outline"
                  className="h-12 px-6 rounded-2xl border-gray-200 hover:bg-gray-50 font-black uppercase text-[11px] tracking-widest"
                  onClick={() => window.print()}
                >
                  <Printer className="size-4 mr-2" />
                  In văn bản
                </Button>
                <Button 
                  className="h-12 px-8 rounded-2xl bg-gray-900 hover:bg-black font-black uppercase text-[11px] tracking-widest" 
                  onClick={() => setOpenContractDoc(false)}
                >
                  Đóng tài liệu
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
