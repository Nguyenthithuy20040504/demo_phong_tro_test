'use client';

import * as React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Home,
  Building2,
  Receipt,
  TriangleAlert,
  Settings,
  Shield,
  Building,
  ChevronDown,
  Bell,
  Check,
  ChevronsUpDown,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/ui/notification-bell";
import { NavUser } from "@/components/nav-user";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState, useEffect } from "react";

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function TopNavbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [toaNhaList, setToaNhaList] = useState<any[]>([]);
  const [selectedToaNha, setSelectedToaNha] = useState<string>('all');
  const [openBox, setOpenBox] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isAdmin = (session?.user as any)?.role === 'admin';
  const isChuNha = (session?.user as any)?.role === 'chuNha';
  const isNhanVien = (session?.user as any)?.role === 'nhanVien';

  // Đồng bộ từ URL param (ưu tiên hàng đầu khi click từ thông báo)
  useEffect(() => {
    const bId = searchParams.get('toaNhaId');
    if (bId) {
      setSelectedToaNha(bId);
      localStorage.setItem('selected_building_id', bId);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchBuildings = async () => {
      try {
        const res = await fetch('/api/toa-nha?limit=100', { cache: 'no-store' });
        if (res.ok) {
          const result = await res.json();
          if (result.success) setToaNhaList(result.data);
        }
      } catch (error) {
        console.error('Error fetching buildings:', error);
      }
    };
    fetchBuildings();

    // Sync with local storage if page.tsx uses it
    const cached = localStorage.getItem('selected_building_id');
    if (cached) setSelectedToaNha(cached);

    const handleSyncBuilding = () => {
      const current = localStorage.getItem('selected_building_id');
      if (current) setSelectedToaNha(current);
    };
    window.addEventListener('buildingChange', handleSyncBuilding);
    return () => window.removeEventListener('buildingChange', handleSyncBuilding);
  }, []);

  const handleBuildingChange = (val: string) => {
    setSelectedToaNha(val);
    localStorage.setItem('selected_building_id', val);
    // Dispatch event to notify other components (like Dashboard page)
    window.dispatchEvent(new Event('buildingChange'));
  };

  const navItems = React.useMemo(() => {
    const items: any[] = [];

    // Dashboard link - Admin vào SaaS Dashboard, còn lại vào Dashboard tổng quan
    items.push({ title: "Trang chủ", url: isAdmin ? "/dashboard/admin/saas-dashboard" : "/dashboard", icon: Building2 });

    // Quản lý cơ bản
    if (!isAdmin) {
      items.push({
        title: "Quản lý cơ bản",
        icon: Building,
        items: [
          { title: "Phòng", url: "/dashboard/phong" },
          { title: "Khách thuê", url: "/dashboard/khach-thue" },
        ],
      });
    }

    // Tài chính
    if (!isAdmin) {
      items.push({
        title: "Tài chính",
        icon: Receipt,
        items: [
          { title: "Hợp đồng", url: "/dashboard/hop-dong" },
          { title: "Hóa đơn", url: "/dashboard/hoa-don" },
          { title: "Hóa đơn tự động", url: "/dashboard/hoa-don/tu-dong" },
          { title: "Thanh toán", url: "/dashboard/thanh-toan" },
        ],
      });
    }

    // Vận hành
    items.push({
      title: "Vận hành",
      icon: TriangleAlert,
      items: [
        { title: "Sự cố", url: "/dashboard/su-co" },
        { title: "Thông báo", url: "/dashboard/thong-bao" },
      ],
    });

    // Dịch vụ SaaS (chỉ Admin)
    if (isAdmin) {
      items.push({
        title: "Dịch vụ SaaS",
        icon: Shield,
        items: [
          { title: "Quản lý gói", url: "/dashboard/admin/quan-ly-goi" },
          { title: "Hóa đơn SaaS", url: "/dashboard/admin/hoa-don-saas" },
        ],
      });
      items.push({
        title: "Quản lý chủ trọ",
        url: "/dashboard/admin/quan-ly-chu-nha",
        icon: Users,
      });
    }

    return items;
  }, [isAdmin, isChuNha, isNhanVien]);

  const userData = React.useMemo(() => ({
    name: session?.user?.name || "User",
    email: session?.user?.email || "user@example.com",
    avatar: (session?.user as any)?.avatar || "/avatars/default.jpg",
  }), [session]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="w-full flex flex-col sticky top-0 z-50 shadow-sm transition-all duration-300">
        {/* Primary Header (Dark Teal) */}
        <header className="h-14 md:h-16 bg-[#006050] text-white flex items-center px-3 md:px-8 justify-between border-b border-white/5">
          <div className="flex items-center gap-3 md:gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 md:gap-2.5 group">
              <Home className="size-5 md:size-6 text-white" />
              <span className="text-base md:text-xl font-bold tracking-tight text-white hidden sm:inline-block">Quản lý nhà trọ</span>
            </Link>
          </div>

          <div className="flex items-center gap-2 md:gap-6 lg:gap-8">
            {/* Building Selector - Ẩn khi admin */}
            {!isAdmin && <div className="flex items-center gap-1.5 md:gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/dashboard/toa-nha"
                    className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-md transition-all text-white shadow-sm"
                  >
                    <Building className="h-4 w-4" />
                    <span className="hidden md:block text-sm font-medium">Tòa nhà:</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  sideOffset={8}
                  className="bg-white text-[#006050] border-gray-100 shadow-xl px-3 py-1.5 rounded-lg border"
                >
                  <p className="text-xs font-bold whitespace-nowrap">Quản lý tòa nhà</p>
                </TooltipContent>
              </Tooltip>

              <Popover open={openBox} onOpenChange={(open) => {
                setOpenBox(open);
                if (!open) setSearchQuery("");
              }}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openBox}
                    className="h-8 md:h-9 min-w-[130px] md:min-w-[200px] justify-between bg-white border-none text-gray-900 focus:ring-0 text-xs md:text-sm font-medium rounded-md px-2 md:px-3 shadow-sm hover:bg-white/95 transition-colors"
                  >
                    <span className="truncate max-w-[150px]">
                      {selectedToaNha === "all"
                        ? "Tất cả tòa nhà"
                        : (toaNhaList.find((t) => (t._id === selectedToaNha || t.id === selectedToaNha))?.tenToaNha ||
                          (selectedToaNha !== 'all' ? "Tòa nhà mục tiêu..." : "Chọn tòa nhà..."))}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-0 rounded-xl" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Tìm tòa nhà..."
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>Không tìm thấy tòa nhà.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all"
                          onSelect={() => {
                            handleBuildingChange("all");
                            setOpenBox(false);
                            setSearchQuery("");
                          }}
                          className="font-medium cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedToaNha === "all" ? "opacity-100" : "opacity-0"
                            )}
                          />
                          Tất cả tòa nhà
                        </CommandItem>
                        {toaNhaList
                          .filter((t) => t.tenToaNha.toLowerCase().startsWith(searchQuery.toLowerCase()))
                          .map((t) => (
                            <CommandItem
                              key={t._id}
                              value={t._id!}
                              onSelect={() => {
                                handleBuildingChange(t._id!);
                                setOpenBox(false);
                                setSearchQuery("");
                              }}
                              className="font-medium cursor-pointer"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedToaNha === t._id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {t.tenToaNha}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>}

            <div className="flex items-center gap-2 md:gap-5">
              <NotificationBell />
              <NavUser user={userData} hideText />
            </div>
          </div>
        </header>

        {/* Secondary Header (Navigation Menu) */}
        <nav className="h-10 md:h-12 bg-white border-b border-gray-100 flex items-center px-2 md:px-8 space-x-0.5 md:space-x-1 overflow-x-auto no-scrollbar">
          {navItems.map((item, idx) => (
            <div key={idx} className="h-full flex items-center">
              {item.items ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-full px-2.5 md:px-4 rounded-none border-b-2 border-transparent data-[state=open]:border-primary data-[state=open]:bg-teal-50/50 transition-all font-medium text-xs md:text-sm text-gray-600 hover:text-primary whitespace-nowrap">
                      <item.icon className="size-3.5 md:size-4 mr-1 md:mr-2 opacity-70" />
                      {item.title}
                      <ChevronDown className="ml-1 md:ml-1.5 size-3 md:size-3.5 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[180px] rounded-xl shadow-xl border-gray-100 p-1.5">
                    {item.items.map((sub: any, sIdx: number) => (
                      <DropdownMenuItem key={sIdx} asChild className="rounded-lg cursor-pointer">
                        <Link href={sub.url} className="w-full flex items-center py-2 px-3 hover:bg-teal-50 transition-colors">
                          {sub.title}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button asChild variant="ghost" size="sm" className={`h-full px-2.5 md:px-4 rounded-none border-b-2 transition-all font-medium text-xs md:text-sm whitespace-nowrap ${pathname === item.url ? 'border-primary text-primary bg-teal-50/30' : 'border-transparent text-gray-600 hover:text-primary'}`}>
                  <Link href={item.url} className="flex items-center">
                    <item.icon className="size-3.5 md:size-4 mr-1 md:mr-2 opacity-70" />
                    {item.title}
                  </Link>
                </Button>
              )}
            </div>
          ))}
        </nav>
      </div>
    </TooltipProvider>
  );
}
