'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';


import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Home,
  MapPin,
  Users,
  Square,
  DollarSign,
  Phone,
  Eye,
  ArrowLeft,
  Star,
  ZoomIn,
  User,
  Building2
} from 'lucide-react';
import { Phong, ToaNha } from '@/types';
import { toast } from 'sonner';
import Link from 'next/link';
import { ImageCarousel } from '@/components/ui/image-carousel';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { ChatBot } from '@/components/chat/ChatBot';

function XemPhongContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get('roomId');

  const [phongList, setPhongList] = useState<Phong[]>([]);
  const [toaNhaList, setToaNhaList] = useState<ToaNha[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedToaNha, setSelectedToaNha] = useState('all');
  const [selectedSort, setSelectedSort] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedPhong, setSelectedPhong] = useState<Phong | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Derive unique cities, districts and amenities
  const cities = Array.from(new Set(toaNhaList.map(t => t.diaChi?.thanhPho).filter(Boolean))).sort();
  const districts = Array.from(new Set(
    toaNhaList
      .filter(t => selectedCity === 'all' || t.diaChi?.thanhPho === selectedCity)
      .map(t => t.diaChi?.quan)
      .filter(Boolean)
  )).sort();

  const tienNghiMap: Record<string, string> = {
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

  const formatAmenity = (val: string) => {
    if (!val) return '';
    const lowerVal = val.toLowerCase();

    // Check direct match
    if (tienNghiMap[val]) return tienNghiMap[val];

    // Check lowercase match for legacy data
    const match = Object.entries(tienNghiMap).find(([k]) => k.toLowerCase() === lowerVal);
    if (match) return match[1];

    return val;
  };

  const allAmenities = Array.from(new Set(phongList.flatMap(p => p.tienNghi?.map(formatAmenity) || []))).sort();

  // Filter buildings dropdown based on location
  const filteredToaNhaList = toaNhaList.filter(t => {
    const matchesCity = selectedCity === 'all' || t.diaChi?.thanhPho === selectedCity;
    const matchesDistrict = selectedDistrict === 'all' || t.diaChi?.quan === selectedDistrict;
    return matchesCity && matchesDistrict;
  });

  useEffect(() => {
    fetchPhong();
    fetchToaNha();
  }, []);

  // Sync selected room with URL
  useEffect(() => {
    if (phongList.length === 0) return;

    if (roomId) {
      const room = phongList.find(p => p._id === roomId);
      if (room) {
        setSelectedPhong(room);
        setShowDetails(true);
        setSelectedImageIndex(0);
      } else {
        setShowDetails(false);
        setSelectedPhong(null);
      }
    } else {
      setShowDetails(false);
      setSelectedPhong(null);
    }
  }, [roomId, phongList]);

  // Initial search param sync
  useEffect(() => {
    const phongParam = searchParams.get('phong');
    if (phongParam) {
      setSearchTerm(phongParam);
    }
  }, [searchParams]);

  const fetchPhong = async () => {
    try {
      const params = new URLSearchParams();
      params.append('limit', '100');
      if (selectedToaNha && selectedToaNha !== 'all') params.append('toaNha', selectedToaNha);
      // We don't filter by trangThai here as the public API is restricted to 'trong'
      // But we pass it if needed for future proofing
      if (selectedSort && selectedSort !== 'all') params.append('sort', selectedSort);

      const response = await fetch(`/api/phong-public?${params.toString()}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setPhongList(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching phong:', error);
      toast.error('Có lỗi xảy ra khi tải danh sách phòng');
    } finally {
      setLoading(false);
    }
  };

  const fetchToaNha = async () => {
    try {
      const response = await fetch('/api/toa-nha-public');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setToaNhaList(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching toa nha:', error);
    }
  };

  useEffect(() => {
    fetchPhong();
  }, [selectedToaNha, selectedSort]);

  // Auto-open phong details when phong parameter is in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const phongParam = urlParams.get('phong');
    if (phongParam && phongList.length > 0) {
      const targetPhong = phongList.find(p => p.maPhong.toLowerCase() === phongParam.toLowerCase());
      if (targetPhong) {
        setSelectedPhong(targetPhong);
        setShowDetails(true);
        setSelectedImageIndex(0);
      }
    }
  }, [phongList]);

  const capitalizeFirstLetter = (string?: string) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const filteredPhong = phongList
    .filter(phong => {
      if (!phong) return false;
      const pToaNha = typeof phong.toaNha === 'object' ? (phong.toaNha as any) : toaNhaList.find(t => t._id === phong.toaNha);

      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
        (phong.maPhong && phong.maPhong.toLowerCase().includes(searchLower)) ||
        (phong.moTa && phong.moTa.toLowerCase().includes(searchLower)) ||
        (pToaNha?.tenToaNha?.toLowerCase().includes(searchLower));

      const matchesCity = selectedCity === 'all' || pToaNha?.diaChi?.thanhPho === selectedCity;
      const matchesDistrict = selectedDistrict === 'all' || pToaNha?.diaChi?.quan === selectedDistrict;
      const matchesToaNha = selectedToaNha === 'all' || (typeof phong.toaNha === 'string' ? phong.toaNha : (phong.toaNha as any)?._id) === selectedToaNha;

      // Amenities filter (must match all selected)
      const matchesAmenities = selectedAmenities.length === 0 ||
        selectedAmenities.every(amenity =>
          phong.tienNghi?.map(formatAmenity).includes(amenity)
        );

      return !!matchesSearch && matchesCity && matchesDistrict && matchesToaNha && matchesAmenities;
    })
    .sort((a, b) => {
      if (selectedSort === 'asc') return a.giaThue - b.giaThue;
      if (selectedSort === 'desc') return b.giaThue - a.giaThue;
      return 0;
    });

  const getTrangThaiBadge = (trangThai: string) => {
    const variants = {
      trong: { variant: 'secondary' as const, label: 'Trống', color: 'text-green-600' },
      daDat: { variant: 'outline' as const, label: 'Đã đặt', color: 'text-blue-600' },
      dangThue: { variant: 'default' as const, label: 'Đang thuê', color: 'text-orange-600' },
      baoTri: { variant: 'destructive' as const, label: 'Bảo trì', color: 'text-red-600' },
    };

    const config = variants[trangThai as keyof typeof variants] || variants.trong;
    return <Badge variant={config.variant} className={config.color}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0FDFA] relative">
        <Navbar />
        {/* Polka dot background */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle, #14B8A6 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}></div>
        </div>

        <div className="relative container mx-auto px-6 py-28">
          <div className="space-y-6">
            <div className="h-10 bg-[#14B8A6]/10 rounded-xl w-64 animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-[450px] bg-white rounded-3xl shadow-sm animate-pulse border border-gray-100"></div>
              ))}
            </div>
          </div>
        </div>
        <Footer />
        <ChatBot />
      </div>
    );
  }

  if (showDetails && selectedPhong) {
    return (
      <div className="min-h-screen bg-[#F0FDFA] relative flex flex-col">
        <Navbar />
        <div className="pt-20 flex-1 relative">
          {/* Polka dot background */}
          <div className="absolute inset-0 opacity-15">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle, #6366f1 1.5px, transparent 1.5px)',
              backgroundSize: '25px 25px'
            }}></div>
          </div>

          <div className="relative container mx-auto px-4 py-2 md:py-4">
            {/* Header */}
            <div className="mb-4 md:mb-6">

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h1 className="text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-[#134E4A] via-[#14B8A6] to-[#0D9488] bg-clip-text text-transparent">
                    Phòng {selectedPhong.maPhong}
                  </h1>
                  <p className="text-xs md:text-sm text-slate-600">
                    {typeof selectedPhong.toaNha === 'object' ? capitalizeFirstLetter((selectedPhong.toaNha as any).tenToaNha) : 'N/A'} - Tầng {selectedPhong.tang}
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <div className="text-xl md:text-2xl font-bold text-[#14B8A6]">
                    {formatCurrency(selectedPhong.giaThue)}
                  </div>
                  <div className="text-xs md:text-sm text-slate-500">/ tháng</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
              {/* Thông tin chính */}
              <div className="lg:col-span-2 space-y-4 md:space-y-6">
                {/* Ảnh phòng */}
                {selectedPhong.anhPhong && selectedPhong.anhPhong.length > 0 ? (
                  <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
                    <CardHeader className="p-4 md:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <CardTitle className="text-base md:text-lg bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent">Hình ảnh phòng</CardTitle>
                        <ImageCarousel
                          images={selectedPhong.anhPhong}
                          trigger={
                            <Button variant="outline" size="sm" className="text-xs md:text-sm w-full sm:w-auto">
                              <ZoomIn className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 md:mr-2" />
                              Xem toàn màn hình
                            </Button>
                          }
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6">
                      <div className="space-y-3 md:space-y-4">
                        {/* Hình lớn */}
                        <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                          <img
                            src={selectedPhong.anhPhong[selectedImageIndex]}
                            alt={`Ảnh phòng ${selectedImageIndex + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Các hình nhỏ */}
                        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                          {selectedPhong.anhPhong.map((image, index) => (
                            <div
                              key={index}
                              className={`aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${index === selectedImageIndex
                                  ? 'border-blue-500 ring-2 ring-blue-200'
                                  : 'border-gray-200 hover:border-gray-300'
                                }`}
                              onClick={() => setSelectedImageIndex(index)}
                            >
                              <img
                                src={image}
                                alt={`Ảnh phòng ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 p-4 md:p-6">
                      <Home className="h-12 w-12 md:h-16 md:w-16 text-gray-400 mb-4" />
                      <p className="text-sm md:text-base text-gray-500">Chưa có hình ảnh phòng</p>
                    </CardContent>
                  </Card>
                )}

                {/* Mô tả */}
                {selectedPhong.moTa && (
                  <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
                    <CardHeader className="p-4 md:p-6">
                      <CardTitle className="text-base md:text-lg bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent">Mô tả</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6">
                      <p className="text-sm md:text-base text-gray-700 whitespace-pre-wrap">{capitalizeFirstLetter(selectedPhong.moTa)}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Tiện nghi */}
                {selectedPhong.tienNghi && selectedPhong.tienNghi.length > 0 && (
                  <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
                    <CardHeader className="p-4 md:p-6">
                      <CardTitle className="text-base md:text-lg bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent">Tiện nghi</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                        {selectedPhong.tienNghi.map((tienNghi) => (
                          <div key={tienNghi} className="flex items-center space-x-2">
                            <Star className="h-3 w-3 md:h-4 md:w-4 text-[#14B8A6] fill-[#14B8A6] flex-shrink-0" />
                            <span className="text-xs md:text-sm truncate">{formatAmenity(tienNghi)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Thông tin chi tiết */}
              <div className="space-y-4 md:space-y-6">
                <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
                  <CardHeader className="p-4 md:p-6">
                    <CardTitle className="text-base md:text-lg bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent">Thông tin phòng</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6">
                    <div className="flex items-center justify-between text-xs md:text-sm">
                      <span className="text-gray-600">Số phòng:</span>
                      <span className="font-medium">{selectedPhong.maPhong}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs md:text-sm">
                      <span className="text-gray-600">Tòa nhà:</span>
                      <span className="font-medium truncate ml-2">
                        {typeof selectedPhong.toaNha === 'object' ? capitalizeFirstLetter((selectedPhong.toaNha as any).tenToaNha) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs md:text-sm">
                      <span className="text-gray-600">Tầng:</span>
                      <span className="font-medium">{selectedPhong.tang}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs md:text-sm">
                      <span className="text-gray-600">Diện tích:</span>
                      <span className="font-medium">{selectedPhong.dienTich} m²</span>
                    </div>
                    <div className="flex items-center justify-between text-xs md:text-sm">
                      <span className="text-gray-600">Số người tối đa:</span>
                      <span className="font-medium">{selectedPhong.soNguoiToiDa} người</span>
                    </div>
                    <div className="flex items-center justify-between text-xs md:text-sm">
                      <span className="text-gray-600">Trạng thái:</span>
                      {getTrangThaiBadge(selectedPhong.trangThai)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-50/80 to-green-100/80 backdrop-blur-sm">
                  <CardHeader className="p-4 md:p-6">
                    <CardTitle className="text-base md:text-lg bg-gradient-to-r from-emerald-700 to-green-600 bg-clip-text text-transparent">Giá thuê</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6">
                    <div className="flex items-center justify-between">
                      <span className="text-xs md:text-sm text-gray-600">Giá thuê:</span>
                      <span className="font-bold text-base md:text-lg text-green-600">
                        {formatCurrency(selectedPhong.giaThue)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs md:text-sm text-gray-600">Tiền cọc:</span>
                      <span className="text-sm md:text-base font-medium">
                        {formatCurrency(selectedPhong.tienCoc)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {selectedPhong.trangThai === 'trong' && (
                  <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50/80 to-emerald-100/80 backdrop-blur-sm overflow-hidden group/contact">
                    <CardHeader className="p-4 md:p-6 pb-2">
                      <CardTitle className="text-base md:text-lg bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent">Liên hệ thuê phòng</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4 md:p-6 pt-2">
                      <p className="text-xs md:text-sm text-slate-600">
                        Phòng này hiện đang trống. Vui lòng liên hệ với chủ nhà để được tư vấn và xem phòng trực tiếp.
                      </p>

                      {typeof selectedPhong.toaNha === 'object' && (selectedPhong.toaNha as any).chuSoHuu && (
                        <div className="p-3 bg-white/60 backdrop-blur-md rounded-xl border border-emerald-100 shadow-sm transition-all duration-300 group-hover/contact:shadow-md group-hover/contact:bg-white/80">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
                              {((selectedPhong.toaNha as any).chuSoHuu as any).anhDaiDien ? (
                                <img
                                  src={((selectedPhong.toaNha as any).chuSoHuu as any).anhDaiDien}
                                  className="w-full h-full object-cover rounded-full"
                                  alt="Chủ nhà"
                                />
                              ) : (
                                <User className="h-5 w-5" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 leading-tight mb-0.5">Chủ nhà</p>
                              <p className="text-sm font-bold text-slate-800 truncate">
                                {((selectedPhong.toaNha as any).chuSoHuu as any).ten}
                              </p>
                              <p className="text-xs font-semibold text-emerald-700">
                                {((selectedPhong.toaNha as any).chuSoHuu as any).soDienThoai}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-3">
                        <Button
                          className="w-full bg-[#14B8A6] hover:bg-[#0D9488] border-0 shadow-lg hover:shadow-xl transition-all duration-300 font-bold h-11"
                          size="default"
                          onClick={() => {
                            const phone = ((selectedPhong.toaNha as any).chuSoHuu as any).soDienThoai?.replace(/\s/g, '');
                            window.location.href = `tel:${phone}`;
                          }}
                        >
                          <Phone className="h-4 w-4 mr-2" />
                          GỌI ĐIỆN NGAY
                        </Button>

                        <Button
                          className="w-full bg-[#0068ff] hover:bg-[#0052cc] border-0 shadow-lg hover:shadow-xl transition-all duration-300 font-bold h-11 text-white"
                          size="default"
                          onClick={() => {
                            const phone = ((selectedPhong.toaNha as any).chuSoHuu as any).soDienThoai?.replace(/\s/g, '');
                            window.open(`https://zalo.me/${phone}`, '_blank');
                          }}
                        >
                          <div className="mr-2 flex items-center justify-center w-5 h-5 bg-white rounded-full">
                            <span className="text-[#0068ff] text-[10px] font-black">Z</span>
                          </div>
                          NHẮN TIN ZALO
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedPhong.trangThai === 'dangThue' && (
                  <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-50/80 to-amber-100/80 backdrop-blur-sm">
                    <CardHeader className="p-4 md:p-6">
                      <CardTitle className="text-base md:text-lg bg-gradient-to-r from-orange-700 to-amber-600 bg-clip-text text-transparent">Trạng thái phòng</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span className="text-sm md:text-base font-medium text-orange-600">Đang cho thuê</span>
                      </div>
                      <p className="text-xs md:text-sm text-gray-600">
                        Phòng này hiện đang được cho thuê. Bạn có thể xem thông tin chi tiết và hình ảnh phòng.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {selectedPhong.trangThai === 'daDat' && (
                  <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50/80 to-sky-100/80 backdrop-blur-sm">
                    <CardHeader className="p-4 md:p-6">
                      <CardTitle className="text-base md:text-lg bg-gradient-to-r from-blue-700 to-sky-600 bg-clip-text text-transparent">Trạng thái phòng</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm md:text-base font-medium text-blue-600">Đã được đặt</span>
                      </div>
                      <p className="text-xs md:text-sm text-gray-600">
                        Phòng này đã được đặt trước. Bạn có thể xem thông tin chi tiết và hình ảnh phòng.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {selectedPhong.trangThai === 'baoTri' && (
                  <Card className="border-0 shadow-xl bg-gradient-to-br from-red-50/80 to-rose-100/80 backdrop-blur-sm">
                    <CardHeader className="p-4 md:p-6">
                      <CardTitle className="text-base md:text-lg bg-gradient-to-r from-red-700 to-rose-600 bg-clip-text text-transparent">Trạng thái phòng</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-sm md:text-base font-medium text-red-600">Đang bảo trì</span>
                      </div>
                      <p className="text-xs md:text-sm text-gray-600">
                        Phòng này hiện đang được bảo trì và chưa thể cho thuê.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
          <Footer showContactInfo={false} />
          <ChatBot />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0FDFA] relative flex flex-col">
      <Navbar />
      <div className="pt-20 flex-1 relative">
        {/* Polka dot background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle, #14B8A6 2px, transparent 2px)',
            backgroundSize: '30px 30px'
          }}></div>
        </div>

        <div className="relative container mx-auto px-6 pt-3 pb-8">
          {/* Header */}
          <div className="mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-4">
              <div>
                <h1 className="text-3xl md:text-5xl font-black font-cinzel text-[#134E4A] leading-tight uppercase mb-2">
                  Danh sách phòng <span className="text-[#14B8A6]">cho thuê</span>
                </h1>
                <p className="text-lg font-josefin text-gray-500">Tìm kiếm không gian sống lý tưởng phù hợp với nhu cầu của bạn</p>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="relative">
            <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-md rounded-3xl overflow-hidden border-t-4 border-[#14B8A6]">
              <div className="p-6 md:p-8">
                {/* Amenities Filter (Now at the top) */}
                {allAmenities.length > 0 && (
                  <div className="mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                      <label className="block text-sm font-black font-josefin text-[#134E4A] uppercase tracking-widest">Tiện ích phòng</label>
                      {selectedAmenities.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedAmenities([])}
                          className="text-xs text-[#14B8A6] hover:text-[#134E4A] font-bold"
                        >
                          Xóa bộ lọc tiện ích
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {allAmenities.map(amenity => (
                        <Badge
                          key={amenity}
                          variant={selectedAmenities.includes(amenity) ? 'default' : 'outline'}
                          className={`cursor-pointer h-10 px-5 rounded-xl text-sm font-medium transition-all duration-300 border shadow-sm flex items-center gap-2 ${selectedAmenities.includes(amenity)
                              ? 'bg-[#14B8A6] text-white border-[#14B8A6] scale-105'
                              : 'bg-white/50 text-gray-500 border-gray-100 hover:border-[#14B8A6] hover:text-[#14B8A6] hover:bg-[#F0FDFA]'
                            }`}
                          onClick={() => {
                            setSelectedAmenities(prev =>
                              prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
                            );
                          }}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${selectedAmenities.includes(amenity) ? 'bg-white animate-pulse' : 'bg-gray-300'}`}></div>
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 ${allAmenities.length > 0 ? 'pt-8 border-t border-gray-100' : ''}`}>
                  {/* City filter */}
                  <div className="space-y-3">
                    <label className="block text-sm font-black font-josefin text-[#134E4A] uppercase tracking-widest">Thành phố</label>
                    <Select value={selectedCity} onValueChange={(val) => {
                      setSelectedCity(val);
                      setSelectedDistrict('all');
                      setSelectedToaNha('all');
                    }}>
                      <SelectTrigger className="h-14 bg-gray-50/50 border-gray-100 rounded-2xl focus:ring-[#14B8A6]">
                        <SelectValue placeholder="Tỉnh/Thành phố" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                        <SelectItem value="all">Tất cả Tỉnh/TP</SelectItem>
                        {cities.map((city) => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* District filter */}
                  <div className="space-y-3">
                    <label className="block text-sm font-black font-josefin text-[#134E4A] uppercase tracking-widest">Quận/Huyện</label>
                    <Select value={selectedDistrict} onValueChange={(val) => {
                      setSelectedDistrict(val);
                      setSelectedToaNha('all');
                    }}>
                      <SelectTrigger className="h-14 bg-gray-50/50 border-gray-100 rounded-2xl focus:ring-[#14B8A6]">
                        <SelectValue placeholder="Quận/Huyện" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                        <SelectItem value="all">Tất cả Quận/Huyện</SelectItem>
                        {districts.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Building filter */}
                  <div className="space-y-3">
                    <label className="block text-sm font-black font-josefin text-[#134E4A] uppercase tracking-widest">Tòa nhà</label>
                    <Select value={selectedToaNha} onValueChange={setSelectedToaNha}>
                      <SelectTrigger className="h-14 bg-gray-50/50 border-gray-100 rounded-2xl focus:ring-[#14B8A6]">
                        <SelectValue placeholder="Tất cả tòa nhà" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                        <SelectItem value="all">Tất cả tòa nhà</SelectItem>
                        {filteredToaNhaList.map((toaNha) => (
                          <SelectItem key={toaNha._id} value={toaNha._id!}>
                            {toaNha.tenToaNha}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sort filter */}
                  <div className="space-y-3">
                    <label className="block text-sm font-black font-josefin text-[#134E4A] uppercase tracking-widest">Sắp xếp giá</label>
                    <Select value={selectedSort} onValueChange={setSelectedSort}>
                      <SelectTrigger className="h-14 bg-gray-50/50 border-gray-100 rounded-2xl focus:ring-[#14B8A6]">
                        <SelectValue placeholder="Mặc định" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                        <SelectItem value="all">Mặc định</SelectItem>
                        <SelectItem value="asc">Giá thấp đến cao</SelectItem>
                        <SelectItem value="desc">Giá cao đến thấp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Room Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mt-12 md:mt-16">
            {filteredPhong.map((phong) => (
              <Card key={phong._id} className="group overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer bg-white/90 backdrop-blur-sm hover:scale-[1.02] hover:bg-white/95 flex flex-col h-full">
                <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 relative overflow-hidden flex-shrink-0">
                  {phong.anhPhong && phong.anhPhong.length > 0 ? (
                    <>
                      <img
                        src={phong.anhPhong[0]}
                        alt={`Phòng ${phong.maPhong}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <ImageCarousel
                        images={phong.anhPhong}
                        className="opacity-0 group-hover:opacity-100 transition-all duration-300"
                      />
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Home className="h-12 w-12 md:h-16 md:w-16 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    {getTrangThaiBadge(phong.trangThai)}
                  </div>
                </div>

                <div className="flex flex-col flex-1">
                  <CardHeader className="p-4 md:p-6 pb-2">
                    <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-base md:text-lg">
                      <span className="bg-gradient-to-r from-slate-700 to-slate-600 bg-clip-text text-transparent">Phòng {phong.maPhong}</span>
                      <span className="text-base md:text-lg font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                        {formatCurrency(phong.giaThue)}
                      </span>
                    </CardTitle>
                    <CardDescription className="flex flex-wrap gap-2 md:gap-4 text-xs md:text-sm">
                      <span className="flex items-center">
                        <MapPin className="h-3 w-3 md:h-4 md:w-4 mr-1 flex-shrink-0" />
                        <span className="truncate">{typeof phong.toaNha === 'object' ? capitalizeFirstLetter((phong.toaNha as any).tenToaNha) : 'N/A'}</span>
                      </span>
                      <span className="flex items-center">
                        <Square className="h-3 w-3 md:h-4 md:w-4 mr-1 flex-shrink-0" />
                        {phong.dienTich}m²
                      </span>
                      <span className="flex items-center">
                        <Users className="h-3 w-3 md:h-4 md:w-4 mr-1 flex-shrink-0" />
                        {phong.soNguoiToiDa} người
                      </span>
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-4 md:p-6 pt-0 flex flex-col flex-1">
                    <div className="flex-1">
                      {phong.moTa && (
                        <p className="text-xs md:text-sm text-gray-600 mb-3 md:mb-4 line-clamp-2 italic">
                          {capitalizeFirstLetter(phong.moTa)}
                        </p>
                      )}

                      <div className="min-h-[32px] mb-4">
                        {phong.tienNghi && phong.tienNghi.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {phong.tienNghi.slice(0, 3).map((tienNghi) => (
                              <Badge key={tienNghi} variant="outline" className="text-[10px] md:text-xs bg-slate-50/50">
                                {formatAmenity(tienNghi)}
                              </Badge>
                            ))}
                            {phong.tienNghi.length > 3 && (
                              <Badge variant="outline" className="text-[10px] md:text-xs">
                                +{phong.tienNghi.length - 3}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <div className="h-4"></div>
                        )}
                      </div>

                      {typeof phong.toaNha === 'object' && (phong.toaNha as any).chuSoHuu && (
                        <div className="flex items-center gap-3 mb-6 p-2.5 bg-emerald-50/60 rounded-2xl border border-emerald-100/50 group/contact">
                          <div className="h-9 w-9 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 group-hover/contact:scale-110 transition-transform">
                            {((phong.toaNha as any).chuSoHuu as any).anhDaiDien ? (
                              <img
                                src={((phong.toaNha as any).chuSoHuu as any).anhDaiDien}
                                className="h-full w-full object-cover rounded-xl"
                                alt="Chu nha"
                              />
                            ) : (
                              <User className="h-5 w-5 text-emerald-600/70" />
                            )}
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-[10px] text-emerald-600 font-black uppercase tracking-[0.1em] leading-tight mb-0.5">Liên hệ chính chủ</p>
                            <p className="text-xs font-black text-slate-700 truncate">
                              {((phong.toaNha as any).chuSoHuu as any).ten} • {((phong.toaNha as any).chuSoHuu as any).soDienThoai}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <Button
                      size="sm"
                      className="w-full bg-[#134E4A] hover:bg-[#14B8A6] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 group mt-auto"
                      onClick={() => {
                        router.push(`?roomId=${phong._id}`, { scroll: false });
                        window.scrollTo(0, 0);
                      }}
                    >
                      <Eye className="h-3.5 w-3.5 md:h-4 md:w-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                      Xem chi tiết
                    </Button>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>

          {filteredPhong.length === 0 && (
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardContent className="flex flex-col items-center justify-center py-12 p-4 md:p-6">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
                  <Home className="h-10 w-10 md:h-12 md:w-12 text-indigo-500" />
                </div>
                <h3 className="text-base md:text-lg font-medium bg-gradient-to-r from-slate-700 to-slate-600 bg-clip-text text-transparent mb-2">
                  Không tìm thấy phòng nào
                </h3>
                <p className="text-xs md:text-sm text-slate-500 text-center">
                  Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <Footer showContactInfo={false} />
      <ChatBot />
    </div>
  );
}

export default function XemPhongPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F0FDFA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#14B8A6] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#134E4A] font-josefin font-bold">Đang tải dữ liệu...</p>
        </div>
      </div>
    }>
      <XemPhongContent />
    </Suspense>
  );
}
