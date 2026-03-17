'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Wrench, MessageSquare, Clock, Plus, Loader2, CheckCircle2, Calendar, AlertCircle, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { SuCo } from '@/types';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SuCoImageUpload } from '@/components/ui/su-co-image-upload';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

export default function SuCoKhachThuePage() {
  const [suCos, setSuCos] = useState<SuCo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSuCo, setSelectedSuCo] = useState<SuCo | null>(null);
  
  const [formData, setFormData] = useState({
    tieuDe: '',
    moTa: '',
    loaiSuCo: 'dienNuoc',
    mucDoUuTien: 'trungBinh',
    phong: ''
  });
  const [images, setImages] = useState<string[]>([]);
  
  // Dữ liệu phòng/toà nhà đang thuê
  const [myRooms, setMyRooms] = useState<Array<{phongId: string; maPhong: string; toaNhaId: string; tenToaNha: string}>>([]);
  const [selectedToaNha, setSelectedToaNha] = useState('');
  const [filteredRooms, setFilteredRooms] = useState<Array<{phongId: string; maPhong: string; toaNhaId: string; tenToaNha: string}>>([]);

  useEffect(() => {
    document.title = 'Báo cáo Sự cố - Khách thuê';
    fetchSuCos();
    fetchMyRooms();
  }, []);

  const fetchSuCos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/su-co');
      const result = await response.json();
      if (result.success) {
        setSuCos(result.data || []);
      } else {
        toast.error('Không thể tải danh sách sự cố');
      }
    } catch (error) {
      console.error('Error fetching issues:', error);
      toast.error('Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyRooms = async () => {
    try {
      const res = await fetch('/api/hop-dong?trangThai=hoatDong&limit=50');
      const data = await res.json();
      if (data.success && data.data) {
        const rooms: Array<{phongId: string; maPhong: string; toaNhaId: string; tenToaNha: string}> = [];
        for (const hd of data.data) {
          const phong = hd.phong;
          if (phong && typeof phong === 'object' && (phong as any).maPhong) {
            const toaNha = (phong as any).toaNha;
            const toaNhaId = typeof toaNha === 'object' ? toaNha._id : toaNha;
            const tenToaNha = typeof toaNha === 'object' ? toaNha.tenToaNha : 'Tòa nhà';
            rooms.push({
              phongId: (phong as any)._id,
              maPhong: (phong as any).maPhong,
              toaNhaId: toaNhaId || '',
              tenToaNha: tenToaNha || ''
            });
          }
        }
        setMyRooms(rooms);
        const uniqueToaNhas = [...new Set(rooms.map(r => r.toaNhaId))];
        if (uniqueToaNhas.length === 1) {
          setSelectedToaNha(uniqueToaNhas[0]);
          setFilteredRooms(rooms);
          if (rooms.length === 1) {
            setFormData(prev => ({ ...prev, phong: rooms[0].phongId }));
          }
        }
      }
    } catch (e) {
      console.error('Error fetching rooms:', e);
    }
  };

  const handleReportIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tieuDe || !formData.moTa) {
      toast.error('Vui lòng điền đầy đủ tiêu đề và mô tả');
      return;
    }
    if (!formData.phong) {
      toast.error('Vui lòng chọn phòng xảy ra sự cố');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        anhSuCo: images
      };
      const response = await fetch('/api/su-co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      if (response.ok && result.success) {
        toast.success('Báo cáo sự cố thành công');
        setIsDialogOpen(false);
        setFormData({ tieuDe: '', moTa: '', loaiSuCo: 'dienNuoc', mucDoUuTien: 'trungBinh', phong: formData.phong });
        setImages([]);
        fetchSuCos();
      } else {
        toast.error(result.message || 'Gửi báo cáo thất bại');
      }
    } catch (error) {
      console.error('Error reporting issue:', error);
      toast.error('Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'moi':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Mới</Badge>;
      case 'dangXuLy':
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">Đang xử lý</Badge>;
      case 'daXong':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Đã xong</Badge>;
      case 'daHuy':
        return <Badge variant="outline" className="opacity-60">Đã hủy</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'khancap':
        return <Badge variant="destructive" className="animate-pulse">Khẩn cấp</Badge>;
      case 'cao':
        return <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 border-rose-500/20">Cao</Badge>;
      case 'trungBinh':
        return <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">Trung bình</Badge>;
      case 'thap':
        return <Badge className="bg-slate-500/10 text-slate-600 border-slate-500/20">Thấp</Badge>;
      default:
        return null;
    }
  };

  const getLoaiSuCoText = (type: string) => {
    switch (type) {
      case 'dienNuoc': return 'Điện nước';
      case 'noiThat': return 'Nội thất';
      case 'vesinh': return 'Vệ sinh';
      case 'anNinh': return 'An ninh';
      default: return 'Khác';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
        <p className="text-sm text-muted-foreground">Đang tải danh sách sự cố...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Báo cáo sự cố</h1>
          <p className="text-gray-500">Quản lý và theo dõi các yêu cầu hỗ trợ sửa chữa · Click vào hàng để xem chi tiết</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl shadow-lg hover:shadow-xl transition-all h-11 px-6">
              <Plus className="h-4 w-4 mr-2" />
              Báo cáo sự cố mới
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] md:w-full max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Báo cáo sự cố mới</DialogTitle>
              <DialogDescription>
                Nhập thông tin sự cố mới để chúng tôi hỗ trợ nhanh nhất.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleReportIssue} className="space-y-3 md:space-y-4 py-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-2">
                  <Label className="text-xs md:text-sm">Tòa nhà</Label>
                  <Select 
                    value={selectedToaNha} 
                    onValueChange={(val) => {
                      setSelectedToaNha(val);
                      setFilteredRooms(myRooms.filter(r => r.toaNhaId === val));
                      setFormData(prev => ({ ...prev, phong: '' }));
                    }}
                  >
                    <SelectTrigger className="text-sm border-gray-200">
                      <SelectValue placeholder="Chọn tòa nhà" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...new Map(myRooms.map(r => [r.toaNhaId, r])).values()].map(r => (
                        <SelectItem key={r.toaNhaId} value={r.toaNhaId}>{r.tenToaNha}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs md:text-sm">Phòng</Label>
                  <Select 
                    value={formData.phong} 
                    onValueChange={(val) => setFormData(prev => ({ ...prev, phong: val }))}
                    disabled={!selectedToaNha}
                  >
                    <SelectTrigger className="text-sm border-gray-200">
                      <SelectValue placeholder={selectedToaNha ? "Chọn phòng" : "Chọn tòa nhà trước"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredRooms.map(r => (
                        <SelectItem key={r.phongId} value={r.phongId}>{r.maPhong}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tieuDe" className="text-xs md:text-sm">Tiêu đề</Label>
                <Input 
                  id="tieuDe" 
                  placeholder="Nhập tiêu đề sự cố" 
                  className="text-sm border-gray-200 focus:border-primary/50 transition-colors"
                  value={formData.tieuDe}
                  onChange={(e) => setFormData({...formData, tieuDe: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="moTa" className="text-xs md:text-sm">Mô tả chi tiết</Label>
                <Textarea 
                  id="moTa" 
                  placeholder="Mô tả chi tiết về sự cố..." 
                  className="min-h-[100px] text-sm border-gray-200 focus:border-primary/50 transition-colors resize-none"
                  value={formData.moTa}
                  onChange={(e) => setFormData({...formData, moTa: e.target.value})}
                  required
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="loaiSuCo" className="text-xs md:text-sm">Loại sự cố</Label>
                  <Select 
                    value={formData.loaiSuCo} 
                    onValueChange={(val) => setFormData({...formData, loaiSuCo: val})}
                  >
                    <SelectTrigger className="text-sm border-gray-200">
                      <SelectValue placeholder="Chọn loại sự cố" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dienNuoc">Điện & Nước</SelectItem>
                      <SelectItem value="noiThat">Nội thất</SelectItem>
                      <SelectItem value="vesinh">Vệ sinh</SelectItem>
                      <SelectItem value="anNinh">An ninh</SelectItem>
                      <SelectItem value="khac">Khác</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mucDoUuTien" className="text-xs md:text-sm">Mức độ ưu tiên</Label>
                  <Select 
                    value={formData.mucDoUuTien} 
                    onValueChange={(val) => setFormData({...formData, mucDoUuTien: val})}
                  >
                    <SelectTrigger className="text-sm border-gray-200">
                      <SelectValue placeholder="Chọn mức độ ưu tiên" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="thap">Thấp</SelectItem>
                      <SelectItem value="trungBinh">Trung bình</SelectItem>
                      <SelectItem value="cao">Cao</SelectItem>
                      <SelectItem value="khancap">Khẩn cấp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <SuCoImageUpload
                images={images}
                onImagesChange={setImages}
                maxImages={5}
              />

              <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto h-10">Hủy</Button>
                <Button type="submit" disabled={submitting} size="sm" className="w-full sm:w-auto h-10">
                  {submitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                  Báo cáo
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {suCos.length === 0 ? (
        <Card className="border-none shadow-sm bg-white/60 rounded-2xl overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center py-24 text-center px-4">
            <div className="bg-primary/5 p-10 rounded-full mb-8 relative">
              <CheckCircle2 className="h-16 w-16 text-primary/40" />
              <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping opacity-20" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 tracking-tight">Phòng bạn đang rất tốt!</h2>
            <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
              Hệ thống không ghi nhận bất kỳ sự cố nào từ phía bạn. Phòng trọ của bạn đang trong trạng thái hoàn hảo.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                    <TableHead className="font-semibold text-gray-700">Tiêu đề</TableHead>
                    <TableHead className="font-semibold text-gray-700">Tòa / Phòng</TableHead>
                    <TableHead className="font-semibold text-gray-700">Loại</TableHead>
                    <TableHead className="font-semibold text-gray-700">Ưu tiên</TableHead>
                    <TableHead className="font-semibold text-gray-700">Ngày báo cáo</TableHead>
                    <TableHead className="font-semibold text-gray-700">Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suCos.map((sc) => (
                    <TableRow 
                      key={sc._id} 
                      className="hover:bg-primary/5 transition-colors cursor-pointer"
                      onClick={() => setSelectedSuCo(sc)}
                    >
                      <TableCell>
                        <div className="max-w-[220px]">
                          <div className="font-semibold text-gray-900 truncate">{sc.tieuDe}</div>
                          <div className="text-xs text-gray-400 truncate mt-0.5 italic">{sc.moTa}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="text-gray-700 font-medium">{(sc.phong as any)?.toaNha?.tenToaNha || 'N/A'}</div>
                          <div className="text-xs text-gray-400">{(sc.phong as any)?.maPhong || ''}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{getLoaiSuCoText(sc.loaiSuCo)}</span>
                      </TableCell>
                      <TableCell>{getPriorityBadge(sc.mucDoUuTien)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-gray-500">
                          <Calendar className="size-3.5" />
                          {new Date(sc.ngayBaoCao).toLocaleDateString('vi-VN')}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(sc.trangThai)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog chi tiết sự cố */}
      <Dialog open={!!selectedSuCo} onOpenChange={(open) => !open && setSelectedSuCo(null)}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedSuCo && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                    <AlertCircle className="size-5" />
                  </div>
                  <div>
                    <div className="text-lg font-bold">{selectedSuCo.tieuDe}</div>
                    <div className="text-sm text-gray-500 font-normal">
                      Mã sự cố: <span className="font-mono">{selectedSuCo._id?.toString().slice(-8).toUpperCase()}</span>
                    </div>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Thông tin chung</Label>
                    <div className="mt-2 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Trạng thái</span>
                        {getStatusBadge(selectedSuCo.trangThai)}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Ưu tiên</span>
                        {getPriorityBadge(selectedSuCo.mucDoUuTien)}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Loại</span>
                        <Badge variant="outline">{getLoaiSuCoText(selectedSuCo.loaiSuCo)}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Ngày báo</span>
                        <span className="font-medium">{new Date(selectedSuCo.ngayBaoCao).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Vị trí</Label>
                    <div className="mt-3 space-y-3">
                      <div className="flex gap-3">
                        <MapPin className="size-4 text-gray-400 mt-0.5" />
                        <div className="text-sm">
                          <div className="font-semibold text-gray-700">{(selectedSuCo.phong as any)?.toaNha?.tenToaNha || 'N/A'}</div>
                          <div className="text-gray-500">Phòng {(selectedSuCo.phong as any)?.maPhong || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Mô tả chi tiết</Label>
                    <div className="mt-2 p-3 bg-gray-50 rounded-xl text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                      {selectedSuCo.moTa}
                    </div>
                  </div>

                  {selectedSuCo.anhSuCo && selectedSuCo.anhSuCo.length > 0 && (
                    <div>
                      <Label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Hình ảnh hiện trường</Label>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {selectedSuCo.anhSuCo.map((img, i) => (
                          <div key={i} className="aspect-square rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                            <img src={img} alt={`Sự cố ${i}`} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500 cursor-zoom-in" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedSuCo.ngayXuLy && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-3">
                      <CheckCircle2 className="size-4 text-emerald-600" />
                      <div className="text-xs text-emerald-800">
                        <span className="font-semibold">Hoàn thành: </span>
                        {new Date(selectedSuCo.ngayXuLy).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button variant="outline" className="w-full" onClick={() => setSelectedSuCo(null)}>Đóng</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Quy trình xử lý */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {[
          { icon: MessageSquare, title: '1. Gửi Yêu Cầu', desc: 'Mô tả chi tiết và đính kèm ảnh chụp sự cố' },
          { icon: Clock, title: '2. Chờ Xác Nhận', desc: 'Yêu cầu sẽ được tiếp nhận và sắp xếp lịch xử lý' },
          { icon: Wrench, title: '3. Xử Lý Xong', desc: 'Đội ngũ kỹ thuật khắc phục và đóng sự cố' }
        ].map((step, i) => (
          <Card key={i} className="bg-white/40 border-none shadow-sm backdrop-blur-sm rounded-[2rem] overflow-hidden group hover:bg-white transition-all transform hover:-translate-y-1">
            <CardContent className="p-8 text-center">
              <div className="mx-auto w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                <step.icon className="h-7 w-7" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed px-2">{step.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
