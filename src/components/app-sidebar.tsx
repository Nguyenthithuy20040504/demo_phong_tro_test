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
import Link from "next/link"

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
  
  // Tạo navigation items dựa trên role
  const navMain = React.useMemo(() => {
    const isAdmin = session?.user?.role === 'admin'

    const baseItems = [
      {
        title: "Quản lý cơ bản",
        url: "#",
        icon: Building,
        isActive: true,
        items: [
          {
            title: "Tòa nhà",
            url: "/dashboard/toa-nha",
          },
          {
            title: "Phòng",
            url: "/dashboard/phong",
          },
          ...(!isAdmin ? [{
            title: "Khách thuê",
            url: "/dashboard/khach-thue",
          }] : []),
        ],
      },
      {
        title: "Tài chính",
        url: "#",
        icon: Receipt,
        items: [
          ...(!isAdmin ? [{
            title: "Hợp đồng",
            url: "/dashboard/hop-dong",
          }] : []),
          {
            title: "Hóa đơn",
            url: "/dashboard/hoa-don",
          },
          {
            title: "Thanh toán",
            url: "/dashboard/thanh-toan",
          },
        ],
      },
      ...(isAdmin ? [] : [{
        title: "Vận hành",
        url: "#",
        icon: AlertTriangle,
        items: [
          {
            title: "Sự cố",
            url: "/dashboard/su-co",
          },
          {
            title: "Thông báo",
            url: "/dashboard/thong-bao",
          },
        ],
      }]),
      {
        title: "Cài đặt",
        url: "#",
        icon: Settings,
        items: [
          {
            title: "Hồ sơ",
            url: "/dashboard/ho-so",
          },
          {
            title: "Cài đặt",
            url: "/dashboard/cai-dat",
          },
        ],
      },
    ]

    // Thêm mục quản lý admin nếu là admin hoặc chủ nhà
    if (isAdmin || session?.user?.role === 'chuNha') {
      baseItems.push({
        title: "Quản trị",
        url: "#",
        icon: Shield,
        items: [
          {
            title: "Quản lý tài khoản",
            url: "/dashboard/quan-ly-tai-khoan",
          },
        ],
      })
    }

    // Phần dành riêng cho Admin (Quản lý SaaS)
    if (isAdmin) {
      baseItems.push({
        title: "Dịch vụ SaaS",
        url: "#",
        icon: Building2,
        items: [
          {
            title: "Dashboard SaaS",
            url: "/dashboard/admin/saas-dashboard",
          },
          {
            title: "Quản lý Gói",
            url: "/dashboard/admin/quan-ly-goi",
          },
          {
            title: "Hóa đơn gia hạn",
            url: "/dashboard/admin/hoa-don-saas",
          },
        ],
      })
    } else if (session?.user?.role === 'chuNha') {
      baseItems.push({
        title: "Dịch vụ SaaS",
        url: "#",
        icon: Building2,
        items: [
          {
            title: "Gia hạn gói",
            url: "/dashboard/gia-han-goi",
          },
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
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Building2 className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Phòng trọ</span>
                  <span className="truncate text-xs">Quản lý</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
