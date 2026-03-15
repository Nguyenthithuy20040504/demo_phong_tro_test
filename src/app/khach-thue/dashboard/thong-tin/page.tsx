import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  User, Mail, Phone, MapPin, Briefcase, Calendar, 
  ShieldCheck, BadgeCheck, Loader2, Home, FileText, 
  Smartphone, Camera, Lock, PlusCircle, Clock, CheckCircle2,
  XCircle, AlertCircle, Trash2, Edit
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
  
  // Form states
  const [editForm, setEditForm] = useState({ hoTen: '', soDienThoai: '' });
  const [passForm, setPassForm] = useState({ matKhauCu: '', matKhauMoi: '', matKhauMoiInit: '' });
  const [docRequest, setDocRequest] = useState({ tieuDe: '', moTa: '', images: [] as string[] });
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
        setProfile(result.data.khachThue);
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
          phong: profile?.hopDongHienTai?.phong?._id || profile?._id, // Fallback nếu không có phòng
          tieuDe: docRequest.tieuDe,
          moTa: docRequest.moTa,
          anhSuCo: docRequest.images,
          loaiSuCo: 'hoSo',
          mucDoUuTien: 'trungBinh'
        })
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Yêu cầu đã được gửi tới chủ nhà');
        setDocRequest({ tieuDe: '', moTa: '', images: [] });
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
                  <div className="space-y-4">
                    <div className="p-4 bg-primary/5 rounded-2xl flex items-center gap-3">
                      <Home className="size-5 text-primary" />
                      <div>
                        <p className="text-sm font-bold">Phòng {profile.hopDongHienTai.phong.maPhong}</p>
                        <p className="text-[10px] text-gray-500 uppercase">{profile.hopDongHienTai.phong.toaNha.tenToaNha}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full rounded-xl py-5 border-gray-100 hover:bg-gray-50 text-sm">
                      <FileText className="size-4 mr-2 text-gray-400" />
                      Tải PDF Hợp đồng
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400 italic text-sm">Chưa có hợp đồng hoạt động</div>
                )}
              </CardContent>
            </Card>

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
                      <div className="space-y-2">
                        <Label>Ảnh minh họa / Tài liệu đính kèm</Label>
                        <SuCoImageUpload 
                          images={docRequest.images} 
                          onImagesChange={(imgs) => setDocRequest(p => ({...p, images: imgs}))} 
                          maxImages={3}
                        />
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
