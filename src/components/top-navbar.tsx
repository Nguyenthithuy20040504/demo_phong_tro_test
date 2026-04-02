'use client';

import * as React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
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
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState, useEffect } from "react";

export function TopNavbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [toaNhaList, setToaNhaList] = useState<any[]>([]);
  const [selectedToaNha, setSelectedToaNha] = useState<string>('all');

  const isAdmin = (session?.user as any)?.role === 'admin';
  const isChuNha = (session?.user as any)?.role === 'chuNha';
  const isNhanVien = (session?.user as any)?.role === 'nhanVien';

  useEffect(() => {
    const fetchBuildings = async () => {
      try {
        const res = await fetch('/api/toa-nha?limit=100');
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
  }, []);

  const handleBuildingChange = (val: string) => {
    setSelectedToaNha(val);
    localStorage.setItem('selected_building_id', val);
    // Dispatch event to notify other components (like Dashboard page)
    window.dispatchEvent(new Event('buildingChange'));
  };

  const navItems = React.useMemo(() => {
    const items: any[] = [];

    // Dashboard link
    items.push({ title: "Trang chủ", url: "/dashboard", icon: Building2 });

    // Quản lý cơ bản
    items.push({
      title: "Quản lý cơ bản",
      icon: Building,
      items: [
        { title: "Phòng", url: "/dashboard/phong" },
        ...(!isAdmin ? [{ title: "Khách thuê", url: "/dashboard/khach-thue" }] : []),
      ],
    });

    // Tài chính
    items.push({
      title: "Tài chính",
      icon: Receipt,
      items: [
        ...(!isAdmin ? [{ title: "Hợp đồng", url: "/dashboard/hop-dong" }] : []),
        { title: "Hóa đơn", url: "/dashboard/hoa-don" },
        { title: "Thanh toán", url: "/dashboard/thanh-toan" },
      ],
    });

    // Vận hành
    items.push({
      title: "Vận hành",
      icon: TriangleAlert,
      items: [
        { title: "Sự cố", url: "/dashboard/su-co" },
        { title: "Thông báo", url: "/dashboard/thong-bao" },
      ],
    });

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
        <header className="h-16 bg-[#006050] text-white flex items-center px-4 md:px-8 justify-between border-b border-white/5">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <Home className="size-6 text-white" />
              <span className="text-xl font-bold tracking-tight text-white hidden sm:inline-block">Quản lý nhà trọ</span>
            </Link>
          </div>

          <div className="flex items-center gap-4 md:gap-6 lg:gap-8">
            {/* Building Selector - Clean white version */}
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/dashboard/toa-nha" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <Building className="h-5 w-5 text-gray-300" />
                    <span className="hidden md:block text-sm font-medium text-white/90">Tòa nhà:</span>
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
              <Select value={selectedToaNha} onValueChange={handleBuildingChange}>
              <SelectTrigger className="h-9 min-w-[200px] bg-white border-none text-gray-900 focus:ring-0 text-sm font-medium rounded-md px-3 shadow-sm hover:bg-white/95 transition-colors">
                <SelectValue placeholder="Tất cả tòa nhà" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-gray-100 shadow-2xl">
                <SelectItem value="all">Tất cả tòa nhà</SelectItem>
                {toaNhaList.map((t) => (
                  <SelectItem key={t._id} value={t._id!}>{t.tenToaNha}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 md:gap-5">
            <NotificationBell />
            <NavUser user={userData} hideText />
          </div>
        </div>
      </header>

      {/* Secondary Header (Navigation Menu) */}
      <nav className="h-12 bg-white border-b border-gray-100 flex items-center px-4 md:px-8 space-x-1 overflow-x-auto no-scrollbar">
        {navItems.map((item, idx) => (
          <div key={idx} className="h-full flex items-center">
            {item.items ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-full px-4 rounded-none border-b-2 border-transparent data-[state=open]:border-primary data-[state=open]:bg-teal-50/50 transition-all font-medium text-gray-600 hover:text-primary">
                    <item.icon className="size-4 mr-2 opacity-70" />
                    {item.title}
                    <ChevronDown className="ml-1.5 size-3.5 opacity-50" />
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
              <Button asChild variant="ghost" size="sm" className={`h-full px-4 rounded-none border-b-2 transition-all font-medium ${pathname === item.url ? 'border-primary text-primary bg-teal-50/30' : 'border-transparent text-gray-600 hover:text-primary'}`}>
                <Link href={item.url} className="flex items-center">
                  <item.icon className="size-4 mr-2 opacity-70" />
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
