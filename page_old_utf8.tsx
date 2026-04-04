'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { useCache } from '@/hooks/use-cache';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Search, 
  Edit, 
  Home, 
  Users,
  Eye,
  Copy,
  Image,
  RefreshCw,
  Trash2,
  CheckCircle2,
  DollarSign,
  Wrench,
  AlertTriangle,
  MapPin,
  Building2,
  Layers,
  Newspaper,
  Send,
} from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Phong, ToaNha } from '@/types';
import { PhongImageUpload } from '@/components/ui/phong-image-upload';
import { DeleteConfirmPopover } from '@/components/ui/delete-confirm-popover';
import { toast } from 'sonner';
import { PhongDetailDialog } from '@/components/ui/phong-detail-dialog';

// =====================================================
// ROOM MAP TYPES
// =====================================================
interface EnrichedPhong extends Phong {
  hoaDonMoiNhat?: {
    trangThai: string;
    thang: number;
    nam: number;
    tongTien: number;
    conLai: number;
  } | null;
  suCoMoi?: number;
  trangThaiTongHop?: 'trong' | 'daThanhToan' | 'treTien' | 'suCo';
  hopDongHienTai?: any;
}

// =====================================================
// STATUS HELPERS
// =====================================================
const STATUS_CONFIG = {
  trong: {
    label: 'Trß╗æng',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-500',
    dot: 'bg-gray-300',
    icon: null,
    hoverBg: 'hover:bg-gray-100',
  },
  daThanhToan: {
    label: '─É├ú thanh to├ín',
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    text: 'text-emerald-700',
    dot: 'bg-emerald-400',
    icon: CheckCircle2,
    hoverBg: 'hover:bg-emerald-100',
  },
  treTien: {
    label: 'Trß╗à tiß╗ün',
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    text: 'text-amber-700',
    dot: 'bg-amber-400',
    icon: DollarSign,
    hoverBg: 'hover:bg-amber-100',
  },
  suCo: {
    label: 'Sß╗▒ cß╗æ / Bß║úo tr├¼',
    bg: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-red-700',
    dot: 'bg-red-400',
    icon: Wrench,
    hoverBg: 'hover:bg-red-100',
  },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

function getStatusConfig(status: string): typeof STATUS_CONFIG[StatusKey] {
  return STATUS_CONFIG[status as StatusKey] || STATUS_CONFIG.trong;
}

function getTenantName(phong: EnrichedPhong): string {
  const hd = phong.hopDongHienTai;
  if (!hd) return '';
  if (hd.nguoiDaiDien?.hoTen) return hd.nguoiDaiDien.hoTen;
  if (hd.khachThueId?.length > 0 && hd.khachThueId[0]?.hoTen) return hd.khachThueId[0].hoTen;
  return '';
}

// =====================================================
// ROOM CARD COMPONENT
// =====================================================
function RoomCard({ 
  phong,
  onClick,
  onEdit,
  onGeneratePost,
}: { 
  phong: EnrichedPhong;
  onClick: () => void;
  onEdit: (e: React.MouseEvent, phong: EnrichedPhong) => void;
  onGeneratePost: (e: React.MouseEvent, phong: EnrichedPhong) => void;
}) {
  const status = getStatusConfig(phong.trangThaiTongHop || 'trong');
  const StatusIcon = status.icon;
  const tenantName = getTenantName(phong);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative w-full rounded-xl border-2 p-3 md:p-4
        transition-all duration-200 ease-out cursor-pointer
        ${status.bg} ${status.border} ${status.hoverBg}
        hover:shadow-lg hover:-translate-y-0.5
        focus:outline-none focus:ring-2 focus:ring-primary/40
        text-left group
      `}
    >
      {/* Action buttons */}
      <div className="absolute -top-1.5 -left-1.5 flex gap-1.5 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300">
        {/* Edit button */}
        <div 
          onClick={(e) => onEdit(e, phong)}
          className="h-8 w-8 bg-indigo-500 rounded-lg shadow-lg flex items-center justify-center text-white hover:scale-110 hover:bg-indigo-600 transition-all duration-300"
          title="Chß╗ënh sß╗¡a th├┤ng tin ph├▓ng"
        >
          <Edit className="h-4 w-4" />
        </div>
        
        {/* Sell/Rent out button (only for empty rooms) */}
        {(phong.trangThaiTongHop || 'trong') === 'trong' && (
          <div 
            onClick={(e) => onGeneratePost(e, phong)}
            className="h-8 w-8 bg-emerald-500 rounded-lg shadow-lg flex items-center justify-center text-white hover:scale-110 hover:bg-emerald-600 transition-all duration-300"
            title="Tß║ío b├ái ─æ─âng cho thu├¬ ph├▓ng"
          >
            <Newspaper className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* Sß╗▒ cß╗æ badge */}
      {(phong.suCoMoi ?? 0) > 0 && phong.trangThaiTongHop !== 'suCo' && (
        <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm">
          !
        </span>
      )}

      {/* Header: M├ú ph├▓ng + info */}
      <div className="flex items-start justify-between mb-2">
        <span className="text-base md:text-lg font-bold text-gray-900">{phong.maPhong}</span>
        <span className="text-[10px] md:text-xs text-gray-400 text-right leading-tight">
          Tß║ºng {phong.tang} ΓÇó {phong.dienTich}m┬▓
        </span>
      </div>

      {/* Center icon */}
      <div className="flex items-center justify-center py-2 md:py-3">
        {StatusIcon ? (
          <StatusIcon className={`h-6 w-6 md:h-8 md:w-8 ${status.text} transition-transform group-hover:scale-110`} />
        ) : (
          <Home className="h-6 w-6 md:h-8 md:w-8 text-gray-300" />
        )}
      </div>

      {/* Status text */}
      <div className="text-center">
        <p className={`text-xs md:text-sm font-semibold ${status.text}`}>
          {status.label}
        </p>
        {tenantName && (
          <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 truncate" title={tenantName}>
            {tenantName}
          </p>
        )}
      </div>
    </button>
  );
}


// =====================================================
// FLOOR SECTION
// =====================================================
function FloorSection({
  tang,
  rooms,
  onRoomClick,
  onEditClick,
  onGeneratePostClick,
}: {
  tang: number;
  rooms: EnrichedPhong[];
  onRoomClick: (phong: EnrichedPhong) => void;
  onEditClick: (e: React.MouseEvent, phong: EnrichedPhong) => void;
  onGeneratePostClick: (e: React.MouseEvent, phong: EnrichedPhong) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-lg">
          <Layers className="h-4 w-4 text-gray-500" />
          <span className="font-bold text-sm text-gray-700">Tß║ºng {tang}</span>
        </div>
        <span className="text-xs text-gray-400">{rooms.length} ph├▓ng</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-3">
        {rooms
          .sort((a, b) => a.maPhong.localeCompare(b.maPhong, 'vi', { numeric: true }))
          .map((phong) => (
            <RoomCard
              key={phong._id}
              phong={phong}
              onClick={() => onRoomClick(phong)}
              onEdit={onEditClick}
              onGeneratePost={onGeneratePostClick}
            />
          ))}
      </div>
    </div>
  );
}

// =====================================================
// MAIN PAGE
// =====================================================
export default function PhongPage() {
  const { data: session } = useSession();
  const isNhanVien = session?.user?.role === 'nhanVien';
  
  const cache = useCache<{
    phongList: EnrichedPhong[];
    toaNhaList: ToaNha[];
  }>({ key: 'phong-data', duration: 300000 });
  
  const [phongList, setPhongList] = useState<EnrichedPhong[]>([]);
  const [toaNhaList, setToaNhaList] = useState<ToaNha[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedToaNhaTab, setSelectedToaNhaTab] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPhong, setEditingPhong] = useState<Phong | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImages, setViewingImages] = useState<string[]>([]);
  const [viewingPhongName, setViewingPhongName] = useState('');
  const [isTenantsViewerOpen, setIsTenantsViewerOpen] = useState(false);
  const [viewingTenants, setViewingTenants] = useState<any[]>([]);
  const [viewingTenantsPhongName, setViewingTenantsPhongName] = useState('');
  const [viewingDetailPhong, setViewingDetailPhong] = useState<Phong | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // States for Auto Post Generator
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [isGeneratingPost, setIsGeneratingPost] = useState(false);
  const [generatedPostContent, setGeneratedPostContent] = useState('');
  const [generatingForPhong, setGeneratingForPhong] = useState<string>('');
  const [generatingPhongImages, setGeneratingPhongImages] = useState<string[]>([]);
  const [isPostingToFacebook, setIsPostingToFacebook] = useState(false);

  useEffect(() => {
    document.title = 'Quß║ún l├╜ Ph├▓ng';
  }, []);

  useEffect(() => {
    // Nß║┐u cache bß╗ï x├│a (do trang kh├íc thao t├íc), force refresh
    const cachedData = cache.getCache();
    fetchPhong(!cachedData);
  }, []);

  // Tß╗▒ ─æß╗Öng refetch khi chuyß╗ân trang hoß║╖c quay lß║íi tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Nß║┐u cache ─æ├ú bß╗ï x├│a (tß╗½ trang kh├íc), tß╗▒ ─æß╗Öng fetch lß║íi
        const cachedData = cache.getCache();
        if (!cachedData) {
          fetchPhong(true);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const fetchPhong = async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      if (!forceRefresh) {
        const cachedData = cache.getCache();
        if (cachedData) {
          setPhongList(cachedData.phongList || []);
          setToaNhaList(cachedData.toaNhaList || []);
          if (!selectedToaNhaTab && cachedData.toaNhaList?.length > 0) {
            setSelectedToaNhaTab(cachedData.toaNhaList[0]._id!);
          }
          setLoading(false);
          return;
        }
      }
      
      const [phongRes, toaNhaRes] = await Promise.all([
        fetch(`/api/phong?limit=500`),
        fetch('/api/toa-nha')
      ]);

      let phongData: EnrichedPhong[] = [];
      let toaNhaData: ToaNha[] = [];

      if (phongRes.ok) {
        const result = await phongRes.json();
        if (result.success) phongData = result.data;
      }
      
      if (toaNhaRes.ok) {
        const result = await toaNhaRes.json();
        if (result.success) toaNhaData = result.data;
      }
      
      setPhongList(phongData);
      setToaNhaList(toaNhaData);
      
      if (!selectedToaNhaTab && toaNhaData.length > 0) {
        setSelectedToaNhaTab(toaNhaData[0]._id!);
      }
      
      if (phongData.length > 0 || toaNhaData.length > 0) {
        cache.setCache({
          phongList: phongData,
          toaNhaList: toaNhaData,
        });
      }
    } catch (error) {
      console.error('Error fetching phong:', error);
      toast.error('Kh├┤ng thß╗â kß║┐t nß╗æi vß╗¢i m├íy chß╗º. Vui l├▓ng kiß╗âm tra lß║íi mß║íng!');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    cache.setIsRefreshing(true);
    await fetchPhong(true);
    cache.setIsRefreshing(false);
    toast.success('Dß╗» liß╗çu ─æ├ú ─æ╞░ß╗úc cß║¡p nhß║¡t mß╗¢i nhß║Ñt!');
  };

  // =====================================================
  // COMPUTED DATA
  // =====================================================

  // Ph├▓ng theo t├▓a nh├á ─æang chß╗ìn
  const phongInSelectedBuilding = useMemo(() => {
    if (!selectedToaNhaTab) return phongList;
    return phongList.filter(p => {
      const toaNhaId = typeof p.toaNha === 'object' ? (p.toaNha as any)?._id : p.toaNha;
      return toaNhaId?.toString() === selectedToaNhaTab;
    });
  }, [phongList, selectedToaNhaTab]);

  // T├¼m kiß║┐m
  const filteredPhong = useMemo(() => {
    if (!searchTerm.trim()) return phongInSelectedBuilding;
    const term = searchTerm.toLowerCase();
    return phongInSelectedBuilding.filter(p => {
      const tenantName = getTenantName(p).toLowerCase();
      return (
        p.maPhong.toLowerCase().includes(term) ||
        tenantName.includes(term) ||
        (p.moTa || '').toLowerCase().includes(term)
      );
    });
  }, [phongInSelectedBuilding, searchTerm]);

  // Nh├│m theo tß║ºng (sß║»p xß║┐p tß╗½ cao ΓåÆ thß║Ñp)
  const floorGroups = useMemo(() => {
    const groups: Record<number, EnrichedPhong[]> = {};
    filteredPhong.forEach(p => {
      const tang = p.tang || 0;
      if (!groups[tang]) groups[tang] = [];
      groups[tang].push(p);
    });
    return Object.entries(groups)
      .map(([tang, rooms]) => ({ tang: parseInt(tang), rooms }))
      .sort((a, b) => a.tang - b.tang); // Tß║ºng thß║Ñp nhß║Ñt ß╗ƒ tr├¬n
  }, [filteredPhong]);

  // Stats cho t├▓a nh├á ─æang chß╗ìn
  const stats = useMemo(() => {
    const rooms = phongInSelectedBuilding;
    return {
      total: rooms.length,
      trong: rooms.filter(p => (p.trangThaiTongHop || 'trong') === 'trong').length,
      treTien: rooms.filter(p => p.trangThaiTongHop === 'treTien').length,
    };
  }, [phongInSelectedBuilding]);

  // =====================================================
  // HANDLERS
  // =====================================================
  const handleGeneratePost = async (phong: EnrichedPhong) => {
    setIsPostDialogOpen(true);
    setIsGeneratingPost(true);
    setGeneratedPostContent('');
    setGeneratingForPhong(phong.maPhong);
    setGeneratingPhongImages(phong.anhPhong || []);

    try {
      const response = await fetch('/api/phong/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phongId: phong._id }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setGeneratedPostContent(data.content);
      } else {
        toast.error(data.message || 'Lß╗ùi khi tß║ío b├ái ─æ─âng');
        setIsPostDialogOpen(false);
      }
    } catch (error) {
      console.error('Lß╗ùi khi gß╗ìi API tß║ío b├ái:', error);
      toast.error('Lß╗ùi kß║┐t nß╗æi ─æß║┐n m├íy chß╗º AI');
      setIsPostDialogOpen(false);
    } finally {
      setIsGeneratingPost(false);
    }
  };

  const handleEdit = (phong: Phong) => {
    setEditingPhong(phong);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/phong/${id}`, { method: 'DELETE' });
      const result = await response.json();
      
      if (response.ok && result.success) {
        cache.clearCache();
        setPhongList(prev => prev.filter(phong => phong._id !== id));
        toast.success('─É├ú x├│a ph├▓ng th├ánh c├┤ng!');
      } else {
        const msg = (result.message || '').toLowerCase();
        if (msg.includes('hop dong') || msg.includes('hß╗úp ─æß╗ông') || msg.includes('khach thue')) {
          toast.error('Ph├▓ng n├áy ─æang c├│ ng╞░ß╗¥i thu├¬ hoß║╖c hß╗úp ─æß╗ông c├▓n hß║ín. H├úy kß║┐t th├║c hß╗úp ─æß╗ông tr╞░ß╗¢c khi x├│a nh├⌐!');
        } else {
          toast.error(result.message || 'C├│ lß╗ùi xß║úy ra khi x├│a ph├▓ng. Vui l├▓ng thß╗¡ lß║íi!');
        }
      }
    } catch (error) {
      console.error('Error deleting phong:', error);
      toast.error('Mß║Ñt kß║┐t nß╗æi vß╗¢i m├íy chß╗º. Vui l├▓ng thß╗¡ lß║íi sau!');
    }
  };

  const handleViewImages = (phong: Phong) => {
    if (phong.anhPhong && phong.anhPhong.length > 0) {
      setViewingImages(phong.anhPhong);
      setViewingPhongName(phong.maPhong);
      setIsImageViewerOpen(true);
    } else {
      toast.info('Ph├▓ng n├áy hiß╗çn ch╞░a c├│ ß║únh n├áo ─æß╗â hiß╗ân thß╗ï.');
    }
  };

  const handleViewDetail = async (phong: Phong) => {
    setViewingDetailPhong(phong); // Show immediately with basic data
    setIsDetailDialogOpen(true);
    try {
      const res = await fetch(`/api/phong/${phong._id}`);
      const result = await res.json();
      if (result.success && result.data) {
        setViewingDetailPhong(result.data);
      }
    } catch (e) {
      console.error('Error fetching room detail:', e);
    }
  };

  const handleViewTenants = (phong: Phong) => {
    const phongData = phong as any;
    const hopDong = phongData.hopDongHienTai;
    
    if (hopDong && hopDong.khachThueId && hopDong.khachThueId.length > 0) {
      setViewingTenants(hopDong.khachThueId);
      setViewingTenantsPhongName(phong.maPhong);
      setIsTenantsViewerOpen(true);
    } else {
      toast.info('Ph├▓ng n├áy hiß╗çn ─æang trß╗æng, ch╞░a c├│ th├┤ng tin ng╞░ß╗¥i thu├¬.');
    }
  };

  // T├¼m t├▓a nh├á hiß╗çn tß║íi
  const currentToaNha = toaNhaList.find(t => t._id === selectedToaNhaTab);
  const getToaNhaAddress = (t: ToaNha) => {
    if (!t.diaChi) return '';
    const d = t.diaChi;
    return [d.soNha, d.duong, d.phuong, d.quan, d.thanhPho].filter(Boolean).join(', ');
  };

  // =====================================================
  // LOADING SKELETON  
  // =====================================================
  if (loading && phongList.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="flex gap-2">
          {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-200 rounded-lg w-32 animate-pulse"></div>)}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse"></div>)}
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
            <div key={i} className="h-36 bg-gray-200 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="space-y-4 md:space-y-5">
      {/* ===== HEADER ===== */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">Quß║ún l├╜ ph├▓ng</h1>
          <p className="text-xs md:text-sm text-gray-500">S╞í ─æß╗ô trß╗▒c quan theo tß║ºng t├▓a nh├á</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button 
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={cache.isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${cache.isRefreshing ? 'animate-spin' : ''}`} />
            {cache.isRefreshing ? '─Éang tß║úi...' : 'L├ám mß╗¢i'}
          </Button>
     
          {!isNhanVien && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => setEditingPhong(null)} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Th├¬m ph├▓ng
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto w-[95vw] md:w-full">
                <DialogHeader>
                  <DialogTitle className="text-base md:text-lg">
                    {editingPhong ? 'Cß║¡p nhß║¡t th├┤ng tin ph├▓ng' : 'Th├¬m ph├▓ng mß╗¢i'}
                  </DialogTitle>
                  <DialogDescription className="text-xs md:text-sm">
                    {editingPhong ? 'Thay ─æß╗òi c├íc chi tiß║┐t cß╗ºa ph├▓ng hiß╗çn tß║íi' : 'Nhß║¡p th├┤ng tin cho ph├▓ng mß╗¢i ─æß╗â ─æ╞░a v├áo quß║ún l├╜'}
                  </DialogDescription>
                </DialogHeader>
                
                <PhongForm 
                  phong={editingPhong}
                  toaNhaList={toaNhaList}
                  onClose={() => setIsDialogOpen(false)}
                  onSuccess={() => {
                    cache.clearCache();
                    setIsDialogOpen(false);
                    fetchPhong(true);
                    toast.success(editingPhong ? '─É├ú l╞░u c├íc thay ─æß╗òi cß╗ºa ph├▓ng th├ánh c├┤ng!' : '─É├ú th├¬m ph├▓ng mß╗¢i v├áo danh s├ích!');
                  }}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* ===== BUILDING TABS ===== */}
      {toaNhaList.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {toaNhaList.map((toaNha) => {
            const isActive = selectedToaNhaTab === toaNha._id;
            const roomCount = phongList.filter(p => {
              const tId = typeof p.toaNha === 'object' ? (p.toaNha as any)?._id : p.toaNha;
              return tId?.toString() === toaNha._id;
            }).length;

            return (
              <button
                key={toaNha._id}
                onClick={() => setSelectedToaNhaTab(toaNha._id!)}
                className={`
                  flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 
                  transition-all duration-200 text-left min-w-0
                  ${isActive 
                    ? 'bg-primary text-white border-primary shadow-md shadow-primary/20' 
                    : 'bg-white border-gray-200 hover:border-primary/40 hover:bg-primary/5 text-gray-700'
                  }
                `}
              >
                <Building2 className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate max-w-[160px]">{toaNha.tenToaNha}</div>
                  <div className={`text-[10px] truncate max-w-[160px] flex items-center gap-1 ${isActive ? 'text-white/80' : 'text-gray-400'}`}>
                    <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                    {getToaNhaAddress(toaNha).substring(0, 40) || 'Ch╞░a c├│ ─æß╗ïa chß╗ë'}
                  </div>
                </div>
                <Badge 
                  variant="secondary" 
                  className={`ml-1 text-[10px] px-1.5 py-0 h-5 ${isActive ? 'bg-white/20 text-white border-white/30' : 'bg-gray-100 text-gray-500'}`}
                >
                  {roomCount}
                </Badge>
              </button>
            );
          })}
        </div>
      )}

      {/* ===== STATS BAR ===== */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <Card className="p-3 md:p-4 border-l-4 border-l-blue-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider">Tß╗òng sß╗æ ph├▓ng</p>
              <p className="text-lg md:text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="h-9 w-9 md:h-10 md:w-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Home className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
            </div>
          </div>
        </Card>

        <Card className="p-3 md:p-4 border-l-4 border-l-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider">Ph├▓ng trß╗æng</p>
              <p className="text-lg md:text-2xl font-bold text-gray-600">{stats.trong}</p>
            </div>
            <div className="h-9 w-9 md:h-10 md:w-10 rounded-xl bg-gray-100 flex items-center justify-center">
              <Home className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
            </div>
          </div>
        </Card>

        <Card className="p-3 md:p-4 border-l-4 border-l-amber-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider">Trß╗à tiß╗ün</p>
              <p className="text-lg md:text-2xl font-bold text-amber-600">{stats.treTien}</p>
            </div>
            <div className="h-9 w-9 md:h-10 md:w-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-amber-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* ===== SEARCH ===== */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="T├¼m kiß║┐m theo m├ú ph├▓ng, t├¬n ng╞░ß╗¥i thu├¬..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 text-sm bg-white"
        />
      </div>

      {/* ===== FLOOR SECTIONS ===== */}
      <div className={`space-y-6 transition-opacity duration-300 ${loading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        {loading && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground animate-pulse py-2">
            <RefreshCw className="h-3 w-3 animate-spin" />
            ─Éang cß║¡p nhß║¡t...
          </div>
        )}

        {floorGroups.length === 0 ? (
          <Card className="p-8 md:p-12 text-center">
            <Home className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {searchTerm ? 'Kh├┤ng t├¼m thß║Ñy ph├▓ng n├áo' : 'Ch╞░a c├│ ph├▓ng n├áo'}
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              {searchTerm 
                ? 'Thß╗¡ thay ─æß╗òi tß╗½ kh├│a t├¼m kiß║┐m hoß║╖c chß╗ìn t├▓a nh├á kh├íc.'
                : currentToaNha 
                  ? `T├▓a nh├á "${currentToaNha.tenToaNha}" ch╞░a c├│ ph├▓ng. Bß║Ñm "Th├¬m ph├▓ng" ─æß╗â bß║»t ─æß║ºu.`
                  : 'H├úy tß║ío t├▓a nh├á tr╞░ß╗¢c, sau ─æ├│ th├¬m ph├▓ng v├áo.'
              }
            </p>
          </Card>
        ) : (
          floorGroups.map(({ tang, rooms }) => (
            <FloorSection
              key={tang}
              tang={tang}
              rooms={rooms}
              onRoomClick={handleViewDetail}
              onEditClick={(e, p) => {
                e.stopPropagation();
                handleEdit(p);
              }}
              onGeneratePostClick={(e, p) => {
                e.stopPropagation();
                handleGeneratePost(p);
              }}
            />
          ))
        )}
      </div>

      {/* ===== IMAGE VIEWER DIALOG ===== */}
      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden w-[95vw] md:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
              <Image className="h-4 w-4 md:h-5 md:w-5" />
              H├¼nh ß║únh ph├▓ng: {viewingPhongName}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            {viewingImages.length > 0 && (
              <Carousel className="w-full">
                <CarouselContent>
                  {viewingImages.map((image, index) => (
                    <CarouselItem key={index}>
                      <div className="flex items-center justify-center p-1 md:p-2">
                        <img
                          src={image}
                          alt={`ß║ónh ${index + 1} cß╗ºa ph├▓ng ${viewingPhongName}`}
                          className="max-h-[50vh] md:max-h-[60vh] w-auto object-contain rounded-lg"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {viewingImages.length > 1 && (
                  <>
                    <CarouselPrevious className="hidden md:flex" />
                    <CarouselNext className="hidden md:flex" />
                  </>
                )}
              </Carousel>
            )}
          </div>
          
          <DialogFooter>
            <div className="text-xs md:text-sm text-gray-600">
              C├│ tß║Ñt cß║ú {viewingImages.length} ß║únh {viewingImages.length > 1 && '- Bß║ín c├│ thß╗â vuß╗æt ─æß╗â xem th├¬m nh├⌐!'}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== TENANTS VIEWER DIALOG ===== */}
      <Dialog open={isTenantsViewerOpen} onOpenChange={setIsTenantsViewerOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto w-[95vw] md:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
              <Users className="h-4 w-4 md:h-5 md:w-5" />
              Danh s├ích ng╞░ß╗¥i thu├¬ - Ph├▓ng {viewingTenantsPhongName}
            </DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Hiß╗çn c├│ {viewingTenants.length} ng╞░ß╗¥i ─æang sinh sß╗æng tß║íi ph├▓ng n├áy
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 md:space-y-4 py-2 md:py-4">
            {viewingTenants.map((tenant, index) => (
              <Card key={tenant._id || index} className="overflow-hidden">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-start gap-3 md:gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <Users className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1 md:mb-2">
                        <h3 className="text-base md:text-lg font-semibold text-gray-900">
                          {tenant.hoTen}
                        </h3>
                        <Badge variant="outline" className="ml-2 text-xs">
                          Th├ánh vi├¬n {index + 1}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-gray-600">Sß╗æ ─æiß╗çn thoß║íi:</span>
                          <span className="text-gray-900">{tenant.soDienThoai}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTenantsViewerOpen(false)} className="text-sm">
              ─É├│ng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* ===== ROOM DETAIL DIALOG ===== */}
      <PhongDetailDialog
        phong={viewingDetailPhong}
        isOpen={isDetailDialogOpen}
        onClose={() => setIsDetailDialogOpen(false)}
        toaNhaList={toaNhaList}
        onEdit={(phong) => {
          setIsDetailDialogOpen(false);
          handleEdit(phong);
        }}
      />

      {/* ===== AUTO POST DIALOG ===== */}
      <Dialog open={isPostDialogOpen} onOpenChange={(open) => {
        if (!isGeneratingPost) setIsPostDialogOpen(open);
      }}>
        <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col w-[95vw] md:w-full overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
              <Newspaper className="h-5 w-5 text-emerald-600" />
              Tß║ío b├ái ─æ─âng cho thu├¬ khu vß╗▒c - Ph├▓ng {generatingForPhong}
            </DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Hß╗ç thß╗æng sß╗¡ dß╗Ñng trß╗ú l├╜ AI kß║┐t hß╗úp th├┤ng tin ph├▓ng ─æß╗â tß╗▒ ─æß╗Öng viß║┐t nß╗Öi dung quß║úng c├ío.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2 pr-1">
            {isGeneratingPost ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <RefreshCw className="h-10 w-10 text-emerald-500 animate-spin" />
                <p className="text-sm font-medium text-gray-500 animate-pulse">
                  AI ─æang t╞░ duy v├á viß║┐t b├ái. Qu├í tr├¼nh n├áy c├│ thß╗â tß╗æn 5-10 gi├óy...
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs md:text-sm text-gray-500 font-medium">
                  Nß╗Öi dung b├ái viß║┐t:
                </p>
                <Textarea 
                  className="min-h-[400px] lg:min-h-[500px] text-sm leading-relaxed whitespace-pre-wrap font-sans resize-none rounded-xl border-gray-200 focus:ring-emerald-500 p-4"
                  value={generatedPostContent}
                  onChange={(e) => setGeneratedPostContent(e.target.value)}
                />

                {generatingPhongImages.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs md:text-sm text-gray-500 font-medium flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      H├¼nh ß║únh ph├▓ng ({generatingPhongImages.length} ß║únh):
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide py-1">
                      {generatingPhongImages.map((src, i) => (
                        <div key={i} className="flex-shrink-0 relative">
                          <img 
                            src={src} 
                            alt={`ß║ónh ph├▓ng ${i + 1}`} 
                            className="h-20 w-auto md:h-28 rounded-md border border-gray-200 object-cover shadow-sm" 
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 flex sm:justify-end gap-2 flex-col sm:flex-row">
            <Button 
              variant="outline" 
              onClick={() => setIsPostDialogOpen(false)}
              className="w-full sm:w-auto text-sm"
              disabled={isGeneratingPost}
            >
              Hß╗ºy bß╗Å
            </Button>
            <Button 
              onClick={async () => {
                if (!generatedPostContent) return;
                setIsPostingToFacebook(true);
                try {
                  const res = await fetch('/api/facebook/post', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      message: generatedPostContent,
                      images: generatingPhongImages,
                    })
                  });
                  const data = await res.json();
                  
                  if (res.ok && data.success) {
                    toast.success('─É─âng b├ái th├ánh c├┤ng!', {
                      description: (
                        <div className="flex flex-col gap-1 mt-1">
                          <span>B├ái ─æ─âng ho├án chß╗ënh ─æ├ú c├│ mß║╖t tr├¬n Fanpage.</span>
                          {data.postUrl && (
                            <a 
                              href={data.postUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline font-medium"
                            >
                              ≡ƒæë Xem b├ái viß║┐t tß║íi ─æ├óy
                            </a>
                          )}
                        </div>
                      ),
                      duration: 8000,
                    });
                    setIsPostDialogOpen(false);
                  } else {
                    toast.error(data.message || 'Lß╗ùi tß╗½ chß╗æi ─æ─âng tß╗½ Facebook');
                  }
                } catch (err) {
                  toast.error('Lß╗ùi khi li├¬n kß║┐t m├íy chß╗º nß╗Öi dung Facebook');
                } finally {
                  setIsPostingToFacebook(false);
                }
              }}
              className="w-full sm:w-auto text-sm bg-[#1877F2] hover:bg-blue-600 text-white border-transparent shadow-md"
              disabled={isGeneratingPost || !generatedPostContent || isPostingToFacebook}
            >
              {isPostingToFacebook ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ─Éang xß╗¡ l├╜ xuß║Ñt bß║ún l├¬n Fanpage...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  ─É─âng ngay l├¬n Fanpage (Facebook)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =====================================================
// PHONG FORM (GIß╗« NGUY├èN 100%)
// =====================================================
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
  const getToaNhaId = (toaNha: any) => {
    if (typeof toaNha === 'object' && toaNha !== null) return toaNha._id || '';
    return toaNha || '';
  };

  const [formData, setFormData] = useState({
    maPhong: phong?.maPhong || '',
    toaNha: phong?.toaNha ? getToaNhaId(phong.toaNha) : '',
    tang: phong?.tang || 1,
    dienTich: phong?.dienTich || 0,
    giaThue: phong?.giaThue || 0,
    tienCoc: phong?.tienCoc || 0,
    moTa: phong?.moTa || '',
    anhPhong: phong?.anhPhong || [],
    tienNghi: phong?.tienNghi || [],
    soNguoiToiDa: phong?.soNguoiToiDa || 2,
    trangThai: phong?.trangThai || 'trong',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = phong ? `/api/phong/${phong._id}` : '/api/phong';
      const method = phong ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          onSuccess();
        } else {
          toast.error(result.message || 'Rß║Ñt tiß║┐c, ─æ├ú c├│ lß╗ùi xß║úy ra. Bß║ín kiß╗âm tra lß║íi th├┤ng tin nh├⌐!');
        }
      } else {
        const error = await response.json();
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('duplicate') || msg.includes('exists')) {
            toast.error('M├ú ph├▓ng n├áy ─æ├ú tß╗ôn tß║íi trong t├▓a nh├á rß╗ôi. H├úy chß╗ìn m├ú kh├íc nh├⌐!');
        } else {
            toast.error(error.message || 'Kh├┤ng thß╗â l╞░u th├┤ng tin. Vui l├▓ng thß╗¡ lß║íi sau!');
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Mß║Ñt kß║┐t nß╗æi vß╗¢i m├íy chß╗º. Kiß╗âm tra lß║íi mß║íng nh├⌐!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTienNghiChange = (tienNghi: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      tienNghi: checked 
        ? [...prev.tienNghi, tienNghi]
        : prev.tienNghi.filter(t => t !== tienNghi)
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const tienNghiOptions = [
    { value: 'dieuHoa', label: '─Éiß╗üu h├▓a' },
    { value: 'nongLanh', label: 'N├│ng lß║ính' },
    { value: 'tuLanh', label: 'Tß╗º lß║ính' },
    { value: 'giuong', label: 'Gi╞░ß╗¥ng' },
    { value: 'tuQuanAo', label: 'Tß╗º quß║ºn ├ío' },
    { value: 'banGhe', label: 'B├án ghß║┐' },
    { value: 'wifi', label: 'WiFi' },
    { value: 'mayGiat', label: 'M├íy giß║╖t' },
    { value: 'bep', label: 'Bß║┐p' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
      <Tabs defaultValue="thong-tin" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="thong-tin" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            Th├┤ng tin c╞í bß║ún
          </TabsTrigger>
          <TabsTrigger value="anh-phong" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            H├¼nh ß║únh ph├▓ng
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="thong-tin" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          <div className="space-y-2">
              <Label htmlFor="maPhong" className="text-sm">M├ú ph├▓ng</Label>
              <Input
                id="maPhong"
                value={formData.maPhong}
                onChange={(e) => setFormData(prev => ({ ...prev, maPhong: e.target.value.toUpperCase() }))}
                placeholder="VD: 101, 202, A103..."
                required
                className="text-sm"
              />
              <p className="text-[10px] text-muted-foreground">
                Sß╗¡ dß╗Ñng sß╗æ tß║ºng l├ám tiß╗ün tß╗æ (VD: Tß║ºng 1 l├á 101, 102...) ─æß╗â dß╗à quß║ún l├╜.
              </p>
            </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-2">
              <Label htmlFor="toaNha" className="text-sm">T├▓a nh├á</Label>
              <Select value={formData.toaNha} onValueChange={(value) => setFormData(prev => ({ ...prev, toaNha: value }))}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Chß╗ìn t├▓a nh├á" />
                </SelectTrigger>
                <SelectContent>
                  {toaNhaList.map((toaNha) => (
                    <SelectItem key={toaNha._id} value={toaNha._id!} className="text-sm">
                      {toaNha.tenToaNha}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trangThai" className="text-sm">Trß║íng th├íi</Label>
              <Select value={formData.trangThai} onValueChange={(value) => setFormData(prev => ({ ...prev, trangThai: value as any }))}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Chß╗ìn trß║íng th├íi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trong" className="text-sm">Trß╗æng</SelectItem>
                  <SelectItem value="daDat" className="text-sm">─É├ú ─æß║╖t</SelectItem>
                  <SelectItem value="dangThue" className="text-sm">─Éang thu├¬</SelectItem>
                  <SelectItem value="baoTri" className="text-sm">Bß║úo tr├¼</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <div className="space-y-2">
              <Label htmlFor="tang" className="text-sm">Tß║ºng</Label>
              <Input
                id="tang"
                type="number"
                min="0"
                value={formData.tang || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, tang: parseInt(e.target.value) || 0 }))}
                required
                className="text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dienTich" className="text-sm">Diß╗çn t├¡ch (m┬▓)</Label>
              <Input
                id="dienTich"
                type="number"
                min="1"
                value={formData.dienTich || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, dienTich: parseInt(e.target.value) || 0 }))}
                required
                className="text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="soNguoiToiDa" className="text-sm">Sß╗æ ng╞░ß╗¥i tß╗æi ─æa</Label>
              <Input
                id="soNguoiToiDa"
                type="number"
                min="1"
                max="10"
                value={formData.soNguoiToiDa || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, soNguoiToiDa: parseInt(e.target.value) || 1 }))}
                required
                className="text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-2">
              <Label htmlFor="giaThue" className="text-sm">Gi├í thu├¬ (VN─É)</Label>
              <Input
                id="giaThue"
                type="number"
                min="0"
                value={formData.giaThue || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, giaThue: parseInt(e.target.value) || 0 }))}
                required
                className="text-sm"
              />
              <span className="text-[10px] md:text-xs text-gray-500 font-medium">
                {formatCurrency(formData.giaThue)} / th├íng
              </span>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tienCoc" className="text-sm">Tiß╗ün cß╗ìc (VN─É)</Label>
              <Input
                id="tienCoc"
                type="number"
                min="0"
                value={formData.tienCoc || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, tienCoc: parseInt(e.target.value) || 0 }))}
                required
                className="text-sm"
              />
              <span className="text-[10px] md:text-xs text-gray-500 font-medium">
                {formatCurrency(formData.tienCoc)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="moTa" className="text-sm">M├┤ tß║ú ph├▓ng</Label>
            <Textarea
              id="moTa"
              value={formData.moTa}
              onChange={(e) => setFormData(prev => ({ ...prev, moTa: e.target.value }))}
              rows={3}
              placeholder="Th├¬m m├┤ tß║ú vß╗ü tiß╗çn ├¡ch, view, hoß║╖c l╞░u ├╜ ─æß║╖c biß╗çt..."
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Tiß╗çn nghi c├│ sß║╡n</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
              {tienNghiOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={option.value}
                    checked={formData.tienNghi.includes(option.value)}
                    onChange={(e) => handleTienNghiChange(option.value, e.target.checked)}
                    className="rounded border-gray-300 h-4 w-4"
                  />
                  <Label htmlFor={option.value} className="text-sm font-normal cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="anh-phong" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          <div className="space-y-3 md:space-y-4">
            <div>
              <h3 className="text-base md:text-lg font-medium mb-1">Quß║ún l├╜ h├¼nh ß║únh</h3>
              <p className="text-xs text-gray-600">
                H├úy tß║úi l├¬n nhß╗»ng tß║Ñm h├¼nh ─æß║╣p nhß║Ñt ─æß╗â thu h├║t kh├ích thu├¬ nh├⌐! (Tß╗æi ─æa 10 ß║únh)
              </p>
            </div>
            
            <PhongImageUpload
              images={formData.anhPhong}
              onImagesChange={(images: string[]) => setFormData(prev => ({ ...prev, anhPhong: images }))}
              maxImages={10}
              className="w-full"
            />
          </div>
        </TabsContent>
      </Tabs>

      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onClose} className="text-sm">
          Hß╗ºy bß╗Å
        </Button>
        <Button type="submit" disabled={isSubmitting} className="text-sm">
          {isSubmitting ? '─Éang l╞░u...' : (phong ? 'L╞░u cß║¡p nhß║¡t' : 'Th├¬m ph├▓ng mß╗¢i')}
        </Button>
      </DialogFooter>
    </form>
  );
}

