"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import {
  Building2,
  Receipt,
  AlertTriangle,
  Settings,
  Shield,
  Building,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession()
  
  const navMain = React.useMemo(() => {
    const baseItems = [
      {
        title: "TỔNG QUAN",
        url: "/dashboard",
        icon: Building2,
        isActive: true,
        items: [],
      },
      {
        title: "QUẢN LÝ CƠ BẢN",
        url: "#",
        icon: Building,
        items: [
          { title: "Tòa nhà", url: "/dashboard/toa-nha" },
          { title: "Phòng", url: "/dashboard/phong" },
          { title: "Khách thuê", url: "/dashboard/khach-thue" },
        ],
      },
      {
        title: "TÀI CHÍNH",
        url: "#",
        icon: Receipt,
        items: [
          { title: "Hợp đồng", url: "/dashboard/hop-dong" },
          { title: "Hóa đơn", url: "/dashboard/hoa-don" },
          { title: "Thanh toán", url: "/dashboard/thanh-toan" },
        ],
      },
      {
        title: "VẬN HÀNH",
        url: "#",
        icon: AlertTriangle,
        items: [
          { title: "Sự cố", url: "/dashboard/su-co" },
          { title: "Xem Web", url: "/dashboard/xem-web" },
          { title: "Thông báo Zalo", url: "/dashboard/thong-bao-zalo" },
        ],
      },
      {
        title: "HỆ THỐNG",
        url: "#",
        icon: Settings,
        items: [
          { title: "Hồ sơ", url: "/dashboard/ho-so" },
          { title: "Cài đặt", url: "/dashboard/cai-dat" },
        ],
      },
    ]

    if (session?.user?.role === 'admin' || session?.user?.role === 'chuNha') {
      baseItems.push({
        title: "QUẢN TRỊ",
        url: "#",
        icon: Shield,
        items: [
          { title: "Quản lý tài khoản", url: "/dashboard/quan-ly-tai-khoan" },
        ],
      })
    }

    return baseItems
  }, [session?.user?.role])

  const userData = React.useMemo(() => ({
    name: session?.user?.name || "User",
    email: session?.user?.email || "user@example.com",
    avatar: session?.user?.avatar || "/avatars/default.jpg",
  }), [session])

  return (
    <Sidebar collapsible="icon" {...props} className="border-r border-border/40">
      <SidebarHeader className="p-6">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent">
              <a href="/dashboard" className="flex items-center gap-3 group">
                <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground">
                  <Building2 className="size-5" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-heading font-bold text-lg text-foreground tracking-tight">Phòng trọ</span>
                  <span className="truncate text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground/60">Quản lý <span className="text-primary italic">Editorial</span></span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent className="px-3">
        <NavMain items={navMain} />
      </SidebarContent>
      
      <SidebarFooter className="p-4 hairline-t border-border/30">
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
