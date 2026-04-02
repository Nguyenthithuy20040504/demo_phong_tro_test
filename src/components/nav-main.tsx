"use client"

import * as React from "react"
import { ChevronRight, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { mutate } from "swr"
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
  const { isMobile, state } = useSidebar()
  const [openDropdown, setOpenDropdown] = React.useState<string | null>(null)

  // Hàm prefetch dữ liệu cho SWR
  const prefetchData = (url: string) => {
    if (!url || url === '#' || url.startsWith('http')) return;
    
    // Chỉ prefetch các trang có dữ liệu nặng
    const dataRoutes: Record<string, string> = {
      '/dashboard/khach-thue': '/api/khach-thue?limit=100',
      '/dashboard/hop-dong': '/api/hop-dong?limit=100',
      '/dashboard/phong': '/api/phong?limit=100',
      '/dashboard/toa-nha': '/api/toa-nha?limit=100',
    };

    const apiUrl = dataRoutes[url];
    if (apiUrl) {
      // Gọi mutate để fetch và lưu vào cache SWR toàn cục
      mutate(apiUrl, fetch(apiUrl).then(res => res.json()), { revalidate: false });
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
