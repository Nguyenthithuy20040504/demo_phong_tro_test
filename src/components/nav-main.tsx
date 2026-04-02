"use client"

import * as React from "react"
import { ChevronRight, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { isMobile, state } = useSidebar()
  const [openDropdown, setOpenDropdown] = React.useState<string | null>(null)

  // Hàm prefetch dữ liệu khi Hover
  const prefetchData = async (url: string) => {
    if (!url || url === '#' || url.startsWith('http')) return;
    
    // Ánh xạ URL sang API và Cache Key (giống useCache)
    const dataRoutes: Record<string, { api: string, cacheKey: string, limit?: string }> = {
      '/dashboard/khach-thue': { api: '/api/khach-thue?limit=500', cacheKey: 'khach-thue-data' },
      '/dashboard/hop-dong': { api: '/api/hop-dong?limit=500', cacheKey: 'hop-dong-data' },
      '/dashboard/phong': { api: '/api/phong?limit=500', cacheKey: 'phong-data' },
      '/dashboard/toa-nha': { api: '/api/toa-nha', cacheKey: 'toa-nha-data' },
      '/dashboard/hoa-don': { api: '/api/hoa-don?limit=1000', cacheKey: 'hoa-don-data' },
      '/dashboard/su-co': { api: '/api/su-co?limit=500', cacheKey: 'su-co-data' },
      '/dashboard/thanh-toan': { api: '/api/thanh-toan?limit=1000', cacheKey: 'thanh-toan-data' }
    };

    const routeInfo = dataRoutes[url];
    if (routeInfo) {
      const userId = session?.user?.id;
      const storageKey = userId ? `${userId}_${routeInfo.cacheKey}` : routeInfo.cacheKey;
      
      // Nếu đã có cache thì dĩ nhiên không tải lại, tiết kiệm băng thông
      if (sessionStorage.getItem(storageKey)) return;

      try {
        const [phongRes, toaNhaRes, khachThueRes, hopDongRes, hoaDonRes] = await Promise.all([
          fetch('/api/phong?limit=500'),
          fetch('/api/toa-nha'),
          fetch('/api/khach-thue?limit=500'),
          fetch('/api/hop-dong?limit=500'),
          fetch('/api/hoa-don?limit=1000'),
        ]);

        const phongData = phongRes.ok ? (await phongRes.json()).data : [];
        const toaNhaData = toaNhaRes.ok ? (await toaNhaRes.json()).data : [];
        const khachThueData = khachThueRes.ok ? (await khachThueRes.json()).data : [];
        const hopDongData = hopDongRes.ok ? (await hopDongRes.json()).data : [];
        const hoaDonData = hoaDonRes.ok ? (await hoaDonRes.json()).data : [];
        
        const timestamp = Date.now();
        
        // Tạo hàm helper để lưu cache
        const setCache = (key: string, dataObj: any) => {
          const cacheStorageKey = userId ? `${userId}_${key}` : key;
          if (!sessionStorage.getItem(cacheStorageKey)) {
            sessionStorage.setItem(cacheStorageKey, JSON.stringify({ timestamp, data: dataObj, userId }));
            console.log(`[Hover Prefetch] Cache populated for ${key}`);
          }
        };

        // Ghi cache cho Phòng
        setCache('phong-data', { phongList: phongData, toaNhaList: toaNhaData });
        // Ghi cache cho Khách Thuê
        setCache('khach-thue-data', { khachThueList: khachThueData, toaNhaList: toaNhaData, phongList: phongData, hopDongList: hopDongData });
        // Ghi cache cho Hợp Đồng
        setCache('hop-dong-data', { hopDongList: hopDongData, phongList: phongData, khachThueList: khachThueData, toaNhaList: toaNhaData });
        // Ghi cache cho Hóa Đơn
        setCache('hoa-don-data', { hoaDonList: hoaDonData, toaNhaList: toaNhaData, phongList: phongData, khachThueList: khachThueData });

      } catch (e) {
        // Tắt log đỏ, im lặng bỏ qua nếu hover nhanh quá
      }
    }
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Menu</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          // Khi sidebar collapsed và không phải mobile, dùng DropdownMenu
          if (state === "collapsed" && !isMobile) {
            return (
              <SidebarMenuItem key={item.title}>
                <DropdownMenu 
                  open={openDropdown === item.title}
                  onOpenChange={(open) => {
                    setOpenDropdown(open ? item.title : null)
                  }}
                >
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    >
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="min-w-48 rounded-lg"
                    side="right"
                    align="start"
                    sideOffset={4}
                    onCloseAutoFocus={(e) => e.preventDefault()}
                  >
                    <DropdownMenuLabel className="flex items-center gap-2">
                      {item.icon && <item.icon className="h-4 w-4" />}
                      {item.title}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {item.items?.map((subItem) => {
                      const isActive = pathname === subItem.url
                      return (
                        <DropdownMenuItem 
                          key={subItem.title} 
                          asChild
                          onSelect={() => {
                            setOpenDropdown(null)
                          }}
                        >
                          <Link 
                            href={subItem.url}
                            className={isActive ? "bg-sidebar-accent" : ""}
                            onMouseEnter={() => prefetchData(subItem.url)}
                          >
                            {subItem.title}
                          </Link>
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            )
          }

          // Khi sidebar expanded hoặc mobile, dùng Collapsible
          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.isActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => {
                      const isActive = pathname === subItem.url
                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild isActive={isActive}>
                            <Link 
                              href={subItem.url}
                              onMouseEnter={() => prefetchData(subItem.url)}
                            >
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
