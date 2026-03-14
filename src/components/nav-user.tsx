"use client"

import { signOut } from "next-auth/react"
import {
  BadgeCheck,
  ChevronsUpDown,
  LogOut,
  Settings,
  User,
} from "lucide-react"
import Link from "next/link"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const { isMobile } = useSidebar()

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/dang-nhap' })
  }

  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="h-14 transition-all duration-300 hover:bg-primary/5 data-[state=open]:bg-primary/10 rounded-xl"
            >
              <Avatar className="h-9 w-9 rounded-xl border border-border/40 shadow-sm">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight ml-2">
                <span className="truncate font-bold text-foreground/80">{user.name}</span>
                <span className="truncate text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-3 opacity-40" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-xl bg-background/80 backdrop-blur-xl border-border/40 shadow-premium p-2"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={12}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-3 px-3 py-3 text-left">
                <Avatar className="h-10 w-10 rounded-xl border border-border/20">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-xl bg-primary/5 text-primary">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold text-base">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/30 m-2" />
            <DropdownMenuGroup className="gap-1 flex flex-col">
              <DropdownMenuItem asChild className="rounded-lg py-2.5 focus:bg-primary/10 focus:text-primary transition-colors">
                <Link href="/dashboard/ho-so" className="flex items-center gap-3">
                  <User className="size-4 opacity-70" />
                  <span className="font-medium text-xs">Thông tin hồ sơ</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-lg py-2.5 focus:bg-primary/10 focus:text-primary transition-colors">
                <Link href="/dashboard/cai-dat" className="flex items-center gap-3">
                  <Settings className="size-4 opacity-70" />
                  <span className="font-medium text-xs">Cấu hình tài khoản</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-border/30 m-2" />
            <DropdownMenuItem 
              onClick={handleLogout}
              className="rounded-lg py-2.5 text-destructive focus:bg-destructive/10 focus:text-destructive transition-colors flex items-center gap-3 cursor-pointer"
            >
              <LogOut className="size-4 opacity-70" />
              <span className="font-bold text-xs uppercase tracking-widest">Đăng xuất hệ thống</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
