"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useCache } from '@/hooks/use-cache'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Plus, 
  Home, 
  Users,
  Eye,
  Copy,
  Image as ImageIcon,
  RefreshCw,
  Search,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Hammer
} from 'lucide-react'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PhongImageUpload } from '@/components/ui/phong-image-upload'
import { Phong, ToaNha } from '@/types'
import { PhongDataTable } from './table'
import { toast } from 'sonner'

// Animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
}

export default function PhongPage() {
  const { data: session } = useSession()
  const isNhanVien = session?.user?.role === 'nhanVien'
  const cache = useCache<{
    phongList: Phong[];
    toaNhaList: ToaNha[];
  }>({ key: 'phong-data', duration: 300000 })
  
  const [phongList, setPhongList] = useState<Phong[]>([])
  const [toaNhaList, setToaNhaList] = useState<ToaNha[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedToaNha, setSelectedToaNha] = useState('')
  const [selectedTrangThai, setSelectedTrangThai] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPhong, setEditingPhong] = useState<Phong | null>(null)
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)
  const [viewingImages, setViewingImages] = useState<string[]>([])
  const [viewingPhongName, setViewingPhongName] = useState('')
  const [isTenantsViewerOpen, setIsTenantsViewerOpen] = useState(false)
  const [viewingTenants, setViewingTenants] = useState<any[]>([])
  const [viewingTenantsPhongName, setViewingTenantsPhongName] = useState('')

  useEffect(() => {
    document.title = 'Quản lý Phòng | Impeccable'
  }, [])

  useEffect(() => {
    fetchPhong()
  }, [])

  const fetchPhong = async (forceRefresh = false) => {
    try {
      setLoading(true)
      
      if (!forceRefresh) {
        const cachedData = cache.getCache()
        if (cachedData) {
          setPhongList(cachedData.phongList || [])
          setToaNhaList(cachedData.toaNhaList || [])
          setLoading(false)
          return
        }
      }
      
      const params = new URLSearchParams()
      if (selectedToaNha && selectedToaNha !== 'all') params.append('toaNha', selectedToaNha)
      if (selectedTrangThai && selectedTrangThai !== 'all') params.append('trangThai', selectedTrangThai)
      
      const [phongRes, toaNhaRes] = await Promise.all([
        fetch(`/api/phong?${params.toString()}&limit=100`),
        fetch('/api/toa-nha')
      ])

      let pData: Phong[] = []
      let tData: ToaNha[] = []

      if (phongRes.ok) {
        const result = await phongRes.json()
        if (result.success) pData = result.data
      }

      if (toaNhaRes.ok) {
        const result = await toaNhaRes.json()
        if (result.success) tData = result.data
      }

      setPhongList(pData)
      setToaNhaList(tData)
      
      if (pData.length > 0 || tData.length > 0) {
        cache.setCache({ phongList: pData, toaNhaList: tData })
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Lỗi kết nối dữ liệu')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    cache.setIsRefreshing(true)
    await fetchPhong(true)
    cache.setIsRefreshing(false)
    toast.success('Dữ liệu hệ thống đã đồng bộ')
  }

  useEffect(() => {
    if (selectedToaNha || selectedTrangThai) fetchPhong(true)
  }, [selectedToaNha, selectedTrangThai])

  const filteredPhong = phongList.filter(phong =>
    phong.maPhong.toLowerCase().includes(searchTerm.toLowerCase()) ||
    phong.moTa?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleEdit = (phong: Phong) => {
    setEditingPhong(phong)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/phong/${id}`, { method: 'DELETE' })
      if (response.ok) {
        cache.clearCache()
        setPhongList(prev => prev.filter(phong => phong._id !== id))
        toast.success('Thực thể đã được gỡ bỏ khỏi hệ thống')
      }
    } catch (error) {
      toast.error('Thao tác thất bại')
    }
  }

  const handleViewImages = (phong: Phong) => {
    if (phong.anhPhong && phong.anhPhong.length > 0) {
      setViewingImages(phong.anhPhong)
      setViewingPhongName(phong.maPhong)
      setIsImageViewerOpen(true)
    } else {
      toast.info('Chưa có tư liệu hình ảnh')
    }
  }

  const handleViewTenants = (phong: Phong) => {
    const hopDong = (phong as any).hopDongHienTai
    if (hopDong?.khachThueId?.length > 0) {
      setViewingTenants(hopDong.khachThueId)
      setViewingTenantsPhongName(phong.maPhong)
      setIsTenantsViewerOpen(true)
    } else {
      toast.info('Không gian đang chờ vận hành')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground animate-pulse">Initializing Nodes...</span>
      </div>
    )
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-12"
    >
      {/* Editorial Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
           <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-primary/40" />
              <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-primary/60">Module Vận hành</span>
           </div>
           <h1 className="text-4xl md:text-5xl font-['Playfair_Display'] italic text-foreground tracking-tight">Kinh doanh Phòng</h1>
           <p className="text-sm text-muted-foreground max-w-md font-medium leading-relaxed">
             Hệ thống quản lý thực thể không gian, tối ưu hóa công suất và theo dõi dòng tiền thuê.
           </p>
        </div>

        <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={cache.isRefreshing}
              className="h-11 px-5 rounded-2xl bg-background/50 backdrop-blur-md border-border/40 text-[10px] font-bold uppercase tracking-widest hover:bg-secondary/40 transition-all"
            >
              <RefreshCw className={`size-3.5 mr-2 ${cache.isRefreshing ? 'animate-spin' : ''}`} />
              Đồng bộ dữ liệu
            </Button>
            
            {!isNhanVien && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                   <Button size="sm" className="h-11 px-6 rounded-2xl bg-primary shadow-premium hover:shadow-premium-hover transition-all text-[10px] font-bold uppercase tracking-widest gap-2">
                      <Plus className="size-4" />
                      Khởi tạo không gian
                   </Button>
                </DialogTrigger>
                {/* PhongForm will be updated in another chunk or assumed consistent for now */}
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-background/80 backdrop-blur-2xl border-border/40 rounded-3xl p-8 scrollbar-hide">
                  <DialogHeader className="mb-8">
                    <DialogTitle className="text-2xl font-bold italic tracking-tight font-['Playfair_Display']">
                      {editingPhong ? 'Hiệu chỉnh thực thể' : 'Khởi tạo thực thể mới'}
                    </DialogTitle>
                    <DialogDescription className="text-xs font-medium uppercase tracking-[0.2em]">
                      {editingPhong ? 'Cập nhật thông số vận hành' : 'Thiết lập thông số cho không gian kinh doanh'}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <PhongForm 
                    phong={editingPhong}
                    toaNhaList={toaNhaList}
                    onClose={() => setIsDialogOpen(false)}
                    onSuccess={() => {
                      cache.clearCache()
                      setIsDialogOpen(false)
                      fetchPhong(true)
                      toast.success(editingPhong ? 'Đã cập nhật' : 'Đã khởi tạo')
                    }}
                  />
                </DialogContent>
              </Dialog>
            )}
        </div>
      </motion.div>

      {/* Stats Section with Glassmorphism */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Tổng số nút', value: phongList.length, icon: Home, color: 'text-blue-500', bg: 'bg-blue-500/5' },
            { label: 'Sẵn sàng', value: phongList.filter(p => p.trangThai === 'trong').length, icon: Sparkles, color: 'text-emerald-500', bg: 'bg-emerald-500/5' },
            { label: 'Đang khai thác', value: phongList.filter(p => p.trangThai === 'dangThue').length, icon: ShieldCheck, color: 'text-indigo-500', bg: 'bg-indigo-500/5' },
            { label: 'Cần bảo trì', value: phongList.filter(p => p.trangThai === 'baoTri').length, icon: Hammer, color: 'text-rose-500', bg: 'bg-rose-500/5' },
          ].map((stat, i) => (
            <Card key={i} className="group relative overflow-hidden border-none bg-background/40 backdrop-blur-md rounded-3xl p-6 hover:shadow-premium transition-all duration-500">
               <div className={`absolute top-0 right-0 size-24 ${stat.bg} rounded-bl-full opacity-50 group-hover:scale-110 transition-transform duration-500`} />
               <div className="relative flex flex-col gap-4">
                  <div className={`size-10 rounded-2xl ${stat.bg} flex items-center justify-center border border-border/20`}>
                     <stat.icon className={`size-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">{stat.label}</p>
                    <p className="text-3xl font-bold tracking-tighter text-foreground">{stat.value}</p>
                  </div>
               </div>
            </Card>
          ))}
      </motion.div>

      {/* Desktop Table Container */}
      <motion.div variants={itemVariants} className="hidden md:block">
        <Card className="border-none bg-background/40 backdrop-blur-xl rounded-[2.5rem] shadow-premium-subtle overflow-hidden">
          <CardContent className="p-10">
            <PhongDataTable 
              data={filteredPhong}
              toaNhaList={toaNhaList}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onViewImages={handleViewImages}
              onViewTenants={handleViewTenants}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedToaNha={selectedToaNha}
              onToaNhaChange={setSelectedToaNha}
              selectedTrangThai={selectedTrangThai}
              onTrangThaiChange={setSelectedTrangThai}
              allToaNhaList={toaNhaList}
              canEdit={!isNhanVien}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Mobile Experience - Redesigned Editorial Cards */}
      <motion.div variants={itemVariants} className="md:hidden space-y-6">
        <div className="flex items-center justify-between px-2">
            <div className="flex flex-col">
               <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Catalog Nodes</span>
               <span className="text-lg font-bold italic font-['Playfair_Display'] tracking-tight">Thực thể hiện hữu</span>
            </div>
            <Badge variant="outline" className="h-7 rounded-full px-3 text-[10px] font-bold border-border/40">{filteredPhong.length} UNITS</Badge>
        </div>

        {/* Mobile Filter Sheet Placeholder or Simple UI */}
        <div className="space-y-4 px-2">
           <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40" />
              <Input
                placeholder="Truy vấn thực thể..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 bg-secondary/20 border-transparent rounded-[1.25rem] text-sm"
              />
           </div>
        </div>
        
        <AnimatePresence mode="popLayout">
          {filteredPhong.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 flex flex-col items-center justify-center gap-4 opacity-40">
              <Home className="size-12 stroke-[1]" />
              <p className="text-xs font-bold uppercase tracking-widest">Node not found</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 gap-4 px-2">
              {filteredPhong.map((phong) => (
                <motion.div 
                  layout
                  key={phong._id}
                  variants={itemVariants}
                  className="group relative overflow-hidden bg-background/60 backdrop-blur-xl border border-border/20 rounded-[2rem] p-5 shadow-sm active:scale-[0.98] transition-all"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="space-y-1">
                       <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">Thực thể</span>
                       <h3 className="text-xl font-bold tracking-tight italic font-['Playfair_Display'] text-foreground">{phong.maPhong}</h3>
                    </div>
                    {/* Status Dot */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10">
                        <span className={`size-1.5 rounded-full ${
                             phong.trangThai === 'trong' ? 'bg-emerald-500' : 
                             phong.trangThai === 'dangThue' ? 'bg-blue-500' : 'bg-rose-500'
                        }`} />
                        <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Status</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-8">
                     <div className="space-y-1">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 block">Tầng khai thác</span>
                        <span className="text-sm font-semibold tracking-tight">Tầng {phong.tang}</span>
                     </div>
                     <div className="space-y-1 text-right">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 block">Mật độ diện tích</span>
                        <span className="text-sm font-semibold italic text-primary">{phong.dienTich} m²</span>
                     </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-2xl mb-6">
                      <div className="space-y-0.5">
                         <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 block">Định giá định kỳ</span>
                         <span className="text-lg font-bold tracking-tighter">
                            {new Intl.NumberFormat('vi-VN').format(phong.giaThue)} ₫
                         </span>
                      </div>
                      <ArrowRight className="size-4 text-muted-foreground/20" />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      className="flex-1 h-12 rounded-2xl bg-secondary/10 hover:bg-secondary/20 text-xs font-bold uppercase tracking-widest gap-2"
                      onClick={() => handleEdit(phong)}
                    >
                      <Plus className="size-3.5" />
                      Hiệu chỉnh
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-12 rounded-2xl bg-primary/5 hover:bg-primary/10"
                      onClick={() => handleViewImages(phong)}
                    >
                      <ImageIcon className="size-4 text-primary" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Image Viewer Dialog */}
      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-5xl bg-black/90 backdrop-blur-3xl border-none rounded-[3rem] p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="flex items-center gap-3 text-white italic font-['Playfair_Display'] text-2xl">
              <ImageIcon className="h-6 w-6 text-primary" />
              Tài sản hình ảnh {viewingPhongName}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden rounded-3xl">
            {viewingImages.length > 0 && (
              <Carousel className="w-full">
                <CarouselContent>
                  {viewingImages.map((image, index) => (
                    <CarouselItem key={index}>
                      <div className="flex items-center justify-center p-2">
                        <img
                          src={image}
                          alt={`Node Capture ${index + 1}`}
                          className="max-h-[60vh] w-auto object-contain rounded-3xl shadow-premium"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="bg-white/10 border-none text-white hover:bg-white/20" />
                <CarouselNext className="bg-white/10 border-none text-white hover:bg-white/20" />
              </Carousel>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Tenants Viewer Dialog - Clean Minimalist Style */}
      <Dialog open={isTenantsViewerOpen} onOpenChange={setIsTenantsViewerOpen}>
        <DialogContent className="max-w-2xl bg-background/80 backdrop-blur-3xl border-border/40 rounded-[2.5rem] p-8">
          <DialogHeader className="mb-8">
            <DialogTitle className="flex items-center gap-3 italic font-['Playfair_Display'] text-3xl">
              <Users className="h-8 w-8 text-primary/60" />
              Chủ thể cư trú
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-60">
              Ghi danh {viewingTenants.length} thực thể đang khai thác không gian {viewingTenantsPhongName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {viewingTenants.map((tenant, index) => (
              <div key={index} className="flex items-center gap-6 p-6 rounded-[2rem] bg-secondary/10 border border-border/20 transition-all hover:bg-secondary/20">
                <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Users className="size-6 text-primary" />
                </div>
                <div className="flex-1">
                   <h3 className="text-xl font-bold tracking-tight text-foreground">{tenant.hoTen}</h3>
                   <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Phone Terminal</span>
                      <span className="text-xs font-mono font-medium text-primary">{tenant.soDienThoai}</span>
                   </div>
                </div>
                <Badge variant="outline" className="rounded-full h-8 px-4 text-[10px] font-bold opacity-40">NODE_ID_{index + 1}</Badge>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

// Form component for adding/editing phong
// Form component with Impeccable Style
function PhongForm({ 
  phong, 
  toaNhaList, 
  onClose, 
  onSuccess 
}: { 
  phong: Phong | null; 
  toaNhaList: ToaNha[]; 
  onClose: () => void; 
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState<Partial<Phong>>({
    maPhong: phong?.maPhong || '',
    toaNhaId: (phong?.toaNhaId as any)?._id || (phong?.toaNhaId as any) || '',
    tang: phong?.tang || 0,
    dienTich: phong?.dienTich || 0,
    giaThue: phong?.giaThue || 0,
    tienCoc: phong?.tienCoc || 0,
    moTa: phong?.moTa || '',
    trangThai: phong?.trangThai || 'trong',
    soNguoiToiDa: phong?.soNguoiToiDa || 2,
    tienNghi: phong?.tienNghi || [],
    anhPhong: phong?.anhPhong || [],
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const url = phong ? `/api/phong/${phong._id}` : '/api/phong'
      const method = phong ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        onSuccess()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Thao tác không thành công')
      }
    } catch (error) {
      toast.error('Lỗi kết nối máy chủ')
    } finally {
      setIsSubmitting(false)
    }
  }

  const tienNghiOptions = [
    { value: 'dieuHoa', label: 'Điều hòa' },
    { value: 'nongLanh', label: 'Nóng lạnh' },
    { value: 'giuong', label: 'Giường' },
    { value: 'tuQuanAo', label: 'Tủ quần áo' },
    { value: 'banGhe', label: 'Bàn ghế' },
    { value: 'tuLanh', label: 'Tủ lạnh' },
    { value: 'mayGiat', label: 'Máy giặt' },
    { value: 'wifi', label: 'Wifi' },
  ]

  const handleTienNghiChange = (value: string, checked: boolean) => {
    setFormData(prev => {
      const current = prev.tienNghi || []
      return {
        ...prev,
        tienNghi: checked 
          ? [...current, value] 
          : current.filter(item => item !== value)
      }
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      <Tabs defaultValue="thong-tin" className="w-full">
        <TabsList className="bg-secondary/20 p-1.5 rounded-2xl mb-8 flex w-fit gap-1">
          <TabsTrigger value="thong-tin" className="rounded-xl px-6 py-2 text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-premium transition-all">
            Thông số Node
          </TabsTrigger>
          <TabsTrigger value="anh-phong" className="rounded-xl px-6 py-2 text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-premium transition-all">
            Tư liệu Capture
          </TabsTrigger>
        </TabsList>

        <TabsContent value="thong-tin" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Mã định danh</Label>
              <Input
                placeholder="P001, RM101..."
                value={formData.maPhong}
                onChange={(e) => setFormData(prev => ({ ...prev, maPhong: e.target.value }))}
                required
                className="h-12 bg-secondary/10 border-transparent rounded-2xl focus:bg-background transition-all"
              />
            </div>
            
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Cụm Cluster</Label>
              <Select 
                value={formData.toaNhaId} 
                onValueChange={(val) => setFormData(prev => ({ ...prev, toaNhaId: val }))}
              >
                <SelectTrigger className="h-12 bg-secondary/10 border-transparent rounded-2xl focus:bg-background transition-all">
                  <SelectValue placeholder="Chọn tòa nhà" />
                </SelectTrigger>
                <SelectContent className="bg-background/80 backdrop-blur-2xl border-border/40 rounded-2xl">
                  {toaNhaList.map((toaNha) => (
                    <SelectItem key={toaNha._id} value={toaNha._id!} className="rounded-lg">
                      {toaNha.tenToaNha}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Trạng thái vận hành</Label>
              <Select 
                value={formData.trangThai} 
                onValueChange={(val: any) => setFormData(prev => ({ ...prev, trangThai: val }))}
              >
                <SelectTrigger className="h-12 bg-secondary/10 border-transparent rounded-2xl focus:bg-background transition-all">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent className="bg-background/80 backdrop-blur-2xl border-border/40 rounded-2xl">
                  <SelectItem value="trong" className="rounded-lg">Trống</SelectItem>
                  <SelectItem value="daDat" className="rounded-lg">Đã đặt</SelectItem>
                  <SelectItem value="dangThue" className="rounded-lg">Đang thuê</SelectItem>
                  <SelectItem value="baoTri" className="rounded-lg">Bảo trì</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Tầng</Label>
              <Input
                type="number"
                value={formData.tang}
                onChange={(e) => setFormData(prev => ({ ...prev, tang: parseInt(e.target.value) || 0 }))}
                className="h-12 bg-secondary/10 border-transparent rounded-2xl focus:bg-background transition-all"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Mật độ (m²)</Label>
              <Input
                type="number"
                value={formData.dienTich}
                onChange={(e) => setFormData(prev => ({ ...prev, dienTich: parseInt(e.target.value) || 0 }))}
                className="h-12 bg-secondary/10 border-transparent rounded-2xl focus:bg-background transition-all"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Công suất Max</Label>
              <Input
                type="number"
                value={formData.soNguoiToiDa}
                onChange={(e) => setFormData(prev => ({ ...prev, soNguoiToiDa: parseInt(e.target.value) || 1 }))}
                className="h-12 bg-secondary/10 border-transparent rounded-2xl focus:bg-background transition-all"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Định giá (VNĐ)</Label>
              <div className="space-y-1">
                <Input
                  type="number"
                  value={formData.giaThue}
                  onChange={(e) => setFormData(prev => ({ ...prev, giaThue: parseInt(e.target.value) || 0 }))}
                  className="h-12 bg-secondary/10 border-transparent rounded-2xl focus:bg-background transition-all font-bold text-primary"
                />
                <p className="text-[10px] font-medium text-muted-foreground ml-1">{formatCurrency(formData.giaThue || 0)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Hạ tầng Hub</Label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {tienNghiOptions.map((option) => (
                <div 
                  key={option.value} 
                  className={`relative flex items-center justify-center p-4 rounded-3xl border transition-all duration-300 cursor-pointer group ${
                    formData.tienNghi?.includes(option.value) 
                      ? 'bg-primary/5 border-primary/20 shadow-premium-subtle' 
                      : 'bg-secondary/10 border-transparent grayscale hover:grayscale-0 hover:bg-secondary/20'
                  }`}
                  onClick={() => handleTienNghiChange(option.value, !formData.tienNghi?.includes(option.value))}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${
                     formData.tienNghi?.includes(option.value) ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    {option.label}
                  </span>
                  {formData.tienNghi?.includes(option.value) && (
                    <div className="absolute top-2 right-2 size-1.5 rounded-full bg-primary" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
             <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Mô tả cấu trúc</Label>
             <Textarea
                placeholder="Thông tin chi tiết về không gian..."
                value={formData.moTa}
                onChange={(e) => setFormData(prev => ({ ...prev, moTa: e.target.value }))}
                rows={4}
                className="bg-secondary/10 border-transparent rounded-[2rem] p-6 focus:bg-background transition-all resize-none"
             />
          </div>
        </TabsContent>
        
        <TabsContent value="anh-phong" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
           <div className="bg-secondary/5 rounded-[2.5rem] p-8 border border-border/10">
              <PhongImageUpload
                images={formData.anhPhong || []}
                onImagesChange={(images: string[]) => setFormData(prev => ({ ...prev, anhPhong: images }))}
                maxImages={10}
                className="w-full"
              />
           </div>
        </TabsContent>
      </Tabs>

      <div className="flex gap-4 pt-10 border-t border-border/10">
        <Button 
          type="button" 
          variant="ghost" 
          onClick={onClose} 
          className="h-14 flex-1 rounded-2xl text-[11px] font-bold uppercase tracking-widest"
        >
          Hủy bỏ
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="h-14 flex-[2] rounded-2xl bg-primary text-[11px] font-bold uppercase tracking-widest shadow-premium hover:shadow-premium-hover transition-all"
        >
          {isSubmitting ? (
             <RefreshCw className="size-4 animate-spin" />
          ) : (
             phong ? 'Cập nhật hệ thống' : 'Triển khai Node mới'
          )}
        </Button>
      </div>
    </form>
  )
}