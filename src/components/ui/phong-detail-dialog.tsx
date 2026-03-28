'use client';

import * as React from "react";
import * as ReactDOM from "react-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  Building2,
  Users,
  CreditCard,
  Image as ImageIcon,
  User,
  Phone,
  Layers,
  Ban,
  MapPin,
  Mail,
  FileText,
  Plus,
  Minus,
  Maximize,
  X as CloseIcon,
  Clock,
} from "lucide-react";
import type { Phong, ToaNha } from '@/types';
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PhongDetailDialogProps {
  phong: Phong | null;
  isOpen: boolean;
  onClose: () => void;
  toaNhaList: ToaNha[];
  onEdit?: (phong: Phong) => void;
}

export function PhongDetailDialog({ phong, isOpen, onClose, toaNhaList, onEdit }: PhongDetailDialogProps) {
  const [viewingImage, setViewingImage] = React.useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = React.useState(1);
  const [dragPos, setDragPos] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [hasMoved, setHasMoved] = React.useState(false);
  const dragStartRef = React.useRef({ x: 0, y: 0 });

  // Lock body scroll when lightbox is open
  React.useEffect(() => {
    if (viewingImage) {
      document.body.style.overflow = 'hidden';
      document.body.style.pointerEvents = 'none'; // block ALL underlying interactions
    } else {
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
      setZoomLevel(1);
      setDragPos({ x: 0, y: 0 });
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.pointerEvents = '';
    };
  }, [viewingImage]);

  // Wheel zoom - global, capture phase, non-passive
  React.useEffect(() => {
    if (!viewingImage) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setZoomLevel(prev => {
        const factor = 1.15;
        const next = e.deltaY < 0 ? prev * factor : prev / factor;
        const clamped = Math.min(Math.max(next, 0.3), 12);
        // Auto-reset position when zoom returns to original size
        if (clamped <= 1) {
          setDragPos({ x: 0, y: 0 });
        }
        return clamped;
      });
    };
    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    return () => window.removeEventListener('wheel', onWheel, { capture: true } as EventListenerOptions);
  }, [viewingImage]);

  // ESC key - capture phase to intercept before Dialog
  React.useEffect(() => {
    if (!viewingImage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        setViewingImage(null);
      }
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [viewingImage]);

  // Global mouse drag for panning (only when zoomed in)
  React.useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      e.preventDefault();
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        setHasMoved(true);
      }
      setDragPos(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    };
    const onUp = () => {
      setTimeout(() => setIsDragging(false), 10);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging]);

  const startDrag = (e: React.MouseEvent) => {
    if (zoomLevel <= 1) return; // only drag when zoomed in
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setHasMoved(false);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const closeLightbox = () => setViewingImage(null);

  const adjustZoom = (type: 'in' | 'out') => {
    setZoomLevel(prev => {
      const step = type === 'in' ? 1.5 : 1 / 1.5;
      const next = Math.min(Math.max(prev * step, 0.3), 12);
      // Auto-reset position when zoom returns to original size
      if (next <= 1) {
        setDragPos({ x: 0, y: 0 });
      }
      return next;
    });
  };




  if (!phong) return null;

  const capitalizeFirstLetter = (string?: string) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const toaNhaObj = typeof phong.toaNha === 'object' ? phong.toaNha : toaNhaList.find(t => t._id === phong.toaNha);
  const toaNhaName = capitalizeFirstLetter((toaNhaObj as ToaNha)?.tenToaNha) || 'N/A';
  
  const formatAddress = (diaChi?: any) => {
    if (!diaChi) return 'N/A';
    const { soNha, duong, phuong, quan, thanhPho } = diaChi;
    return [soNha, duong, phuong, quan, thanhPho].filter(Boolean).join(', ');
  };

  const getTrangThaiBadge = (status: string) => {
    switch (status) {
      case 'trong':
        return (
          <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 shadow-sm border-0 whitespace-nowrap px-4 py-1.5 font-bold rounded-full transition-colors leading-none">
            Trống
          </Badge>
        );
      case 'dangThue':
        return (
          <Badge variant="secondary" className="bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm border-0 whitespace-nowrap px-4 py-1.5 font-bold rounded-full transition-colors leading-none">
            Đang thuê
          </Badge>
        );
      case 'daDat':
        return (
          <Badge variant="outline" className="border-amber-400 text-amber-600 font-black whitespace-nowrap px-4 py-1.5 bg-amber-50/50 rounded-full transition-colors leading-none">
            Đã đặt
          </Badge>
        );
      case 'baoTri':
        return (
          <Badge variant="destructive" className="bg-red-400 hover:bg-red-500 shadow-sm border-0 whitespace-nowrap px-4 py-1.5 font-bold rounded-full transition-colors leading-none">
            Bảo trì
          </Badge>
        );
      default:
        return <Badge variant="outline" className="whitespace-nowrap px-4 py-1.5 font-bold rounded-full uppercase tracking-widest leading-none">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const tienNghiLabels: Record<string, string> = {
    'dieuHoa': 'Điều hòa',
    'nongLanh': 'Nóng lạnh',
    'tuLanh': 'Tủ lạnh',
    'giuong': 'Giường',
    'tuQuanAo': 'Tủ quần áo',
    'banGhe': 'Bàn ghế',
    'wifi': 'WiFi',
    'mayGiat': 'Máy giặt',
    'bep': 'Bếp',
    'banlamviec': 'Bàn làm việc',
    'ghe': 'Ghế',
    'tivi': 'TV',
    'phongtam': 'Phòng tắm',
    'bancong': 'Ban công',
  };

  const getTienNghiLabel = (item: string) => {
    if (!item) return '';
    const lowerItem = item.toLowerCase();
    const labelValues = Object.values(tienNghiLabels);
    if (labelValues.some(l => l.toLowerCase() === lowerItem)) {
      const exactMatch = labelValues.find(l => l.toLowerCase() === lowerItem);
      return exactMatch || item;
    }
    if (tienNghiLabels[item]) return tienNghiLabels[item];
    const match = Object.entries(tienNghiLabels).find(([k]) => k.toLowerCase() === lowerItem);
    if (match) return match[1];
    return item;
  };

  return (
    <React.Fragment>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className="max-w-[95vw] md:max-w-[750px] lg:max-w-[900px] p-0 flex flex-col h-[90vh] border-0 shadow-2xl overflow-hidden rounded-[2.5rem]"
          onInteractOutside={(e) => {
            // Prevent Radix Dialog from closing when lightbox is open
            if (viewingImage) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (viewingImage) e.preventDefault();
          }}
        >
          {/* Header */}
          <DialogHeader className="px-8 py-5 border-b flex flex-row items-center justify-between shrink-0 space-y-0 bg-white">
            <div className="flex items-center gap-4">
              <DialogTitle className="text-3xl font-black text-slate-800">
                Phòng {phong.maPhong}
              </DialogTitle>
              {phong.trangThai === 'dangThue' ? (
                <Badge className="bg-amber-100 text-amber-600 hover:bg-amber-100 border-0 rounded-full px-4 py-1.5 text-[11px] font-black">
                  Trễ tiền
                </Badge>
              ) : (
                getTrangThaiBadge(phong.trangThai)
              )}
            </div>
          </DialogHeader>

          {/* Body */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50/30 custom-scrollbar">
            <div className="p-8 space-y-8">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-5">
                <div className="bg-slate-100/50 p-4 rounded-xl flex items-center gap-3 border border-slate-100">
                  <div className="bg-slate-200/50 p-2 rounded-lg">
                    <Building2 className="h-5 w-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Tòa nhà</p>
                    <p className="text-sm font-bold text-slate-700">{toaNhaName}</p>
                  </div>
                </div>
                <div className="bg-slate-100/50 p-4 rounded-xl flex items-center gap-3 border border-slate-100">
                  <div className="bg-orange-100/50 p-2 rounded-lg">
                    <Home className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Tầng</p>
                    <p className="text-sm font-bold text-slate-700">Tầng {phong.tang}</p>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="bg-slate-100/50 p-4 rounded-xl flex items-center gap-3 border border-slate-100">
                <div className="bg-slate-200/50 p-2 rounded-lg">
                  <MapPin className="h-5 w-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Địa chỉ</p>
                  <p className="text-sm font-bold text-slate-700 truncate">
                    {toaNhaObj ? formatAddress((toaNhaObj as ToaNha).diaChi) : 'Đang cập nhật...'}
                  </p>
                </div>
              </div>

              {/* Main cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border-2 border-emerald-100 shadow-sm">
                  <p className="text-[11px] font-black text-emerald-500/70 uppercase tracking-widest mb-1">Giá thuê tháng</p>
                  <p className="text-2xl font-black text-emerald-600">{formatCurrency(phong.giaThue)}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border-2 border-blue-100 shadow-sm">
                  <p className="text-[11px] font-black text-blue-500/70 uppercase tracking-widest mb-1">Diện tích</p>
                  <p className="text-2xl font-black text-blue-600">{phong.dienTich} m²</p>
                </div>
              </div>

              {/* Gallery */}
              <div className="space-y-3">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Thư viện ảnh
                </h3>
                <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                  {phong.anhPhong && phong.anhPhong.length > 0 ? (
                    phong.anhPhong.map((img, index) => (
                      <div 
                        key={index} 
                        className="flex-none w-1/2 md:w-56 aspect-video rounded-2xl overflow-hidden border border-slate-200 cursor-zoom-in hover:border-indigo-400 transition-colors group relative"
                        onClick={() => setViewingImage(img)}
                      >
                        <img src={img} alt="Ảnh phòng" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Maximize className="h-6 w-6 text-white drop-shadow-md" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="w-full h-32 flex flex-col items-center justify-center bg-slate-100 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
                      <ImageIcon className="h-8 w-8 mb-2 opacity-20" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Không có ảnh</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {phong.moTa && (
                <div className="space-y-3">
                  <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Mô tả chi tiết
                  </h3>
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line italic">
                      "{phong.moTa}"
                    </p>
                  </div>
                </div>
              )}

              {/* Amenities */}
              <div className="space-y-3">
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Danh sách tiện nghi
                </h3>
                <div className="flex flex-wrap gap-2">
                  {phong.tienNghi && phong.tienNghi.length > 0 ? (
                    phong.tienNghi.map((item) => (
                      <Badge key={item} variant="outline" className="px-4 py-1.5 rounded-full text-[11px] font-semibold text-slate-600 border-slate-200 bg-white">
                        {getTienNghiLabel(item)}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">Dữ liệu tiện nghi đang cập nhật...</span>
                  )}
                </div>
              </div>

              {/* Secondary stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                  <p className="text-[10px] font-black text-orange-400 uppercase tracking-tight flex items-center gap-1 mb-1">
                    <CreditCard className="h-3 w-3" />
                    Tiền cọc
                  </p>
                  <p className="text-sm font-black text-orange-600 truncate">{formatCurrency(phong.tienCoc)}</p>
                </div>
                <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                  <p className="text-[10px] font-black text-purple-400 uppercase tracking-tight flex items-center gap-1 mb-1">
                    <Users className="h-3 w-3" />
                    Số người
                  </p>
                  <p className="text-sm font-black text-purple-600">{phong.soNguoiToiDa} người</p>
                </div>
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-tight flex items-center gap-1 mb-1">
                    <Clock className="h-3 w-3" />
                    Ngày tạo HĐ
                  </p>
                  <p className="text-sm font-black text-blue-600 truncate">
                    {phong.ngayTao ? new Date(phong.ngayTao).toLocaleDateString('vi-VN') : 'N/A'}
                  </p>
                </div>
              </div>

              <Separator className="bg-slate-200/60" />

              {/* Landlord & Resident info would go here (omitted for brevity in this clean version, but keep the space) */}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-white flex justify-end gap-3 shrink-0">
             <Button variant="outline" onClick={onClose} className="rounded-lg px-6 font-bold text-slate-600">
               Đóng
             </Button>
             {onEdit && (
               <Button 
                 onClick={() => onEdit(phong)} 
                 className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-6 font-bold"
               >
                 Chỉnh sửa
               </Button>
             )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox rendered via Portal to completely isolate from Dialog */}
      {viewingImage && ReactDOM.createPortal(
        <div
          style={{ pointerEvents: 'auto' }}
          className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300 overflow-hidden"
          onMouseDown={(e) => {
            // ALWAYS stop propagation to prevent Radix Dialog from closing
            e.stopPropagation();
          }}
          onClick={(e) => {
            // Close when clicking directly on the overlay background
            if (e.target === e.currentTarget && !hasMoved) {
              closeLightbox();
            }
          }}
        >
          {/* Close button */}
          <div className="absolute top-6 right-6 z-[999999]">
            <button
              onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
              className="group bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-full p-3 border border-white/10 text-white/70 hover:text-white transition-all shadow-2xl active:scale-95"
            >
              <CloseIcon className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>

          {/* Controls */}
          <div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[999999] flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-500"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-2xl">
              <button
                onClick={() => adjustZoom('out')}
                className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="w-px h-5 self-center bg-white/10" />
              <button
                onClick={() => { setZoomLevel(1); setDragPos({ x: 0, y: 0 }); }}
                className="px-3 text-[10px] font-bold text-white/50 hover:text-white transition-colors tracking-widest"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <div className="w-px h-5 self-center bg-white/10" />
              <button
                onClick={() => adjustZoom('in')}
                className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Image */}
          <div
            className="w-full h-full flex items-center justify-center p-8 md:p-16 overflow-hidden"
            onClick={(e) => {
              // Click on empty space around the image closes lightbox
              if (e.target === e.currentTarget && !hasMoved) {
                closeLightbox();
              }
            }}
          >
            <img
              src={viewingImage}
              alt="Lightbox View"
              draggable={false}
              className={cn(
                "max-w-[70%] max-h-[60vh] object-contain select-none will-change-transform rounded-2xl",
                isDragging ? "transition-none" : "transition-transform duration-200 ease-out",
                zoomLevel > 1 ? "shadow-[0_0_80px_rgba(0,0,0,0.5)]" : "shadow-[0_30px_80px_rgba(0,0,0,0.4)]"
              )}
              style={{
                transform: `scale(${zoomLevel}) translate(${dragPos.x / zoomLevel}px, ${dragPos.y / zoomLevel}px)`,
                cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                startDrag(e);
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (hasMoved) return;
                if (zoomLevel > 1) {
                  setZoomLevel(1);
                  setDragPos({ x: 0, y: 0 });
                } else {
                  setZoomLevel(2.5);
                }
              }}
            />
          </div>
        </div>,
        document.body
      )}
    </React.Fragment>
  );
}

