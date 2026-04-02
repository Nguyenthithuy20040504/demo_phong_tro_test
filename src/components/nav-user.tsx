"use client"

import { signOut } from "next-auth/react"
import {
  BadgeCheck,
  ChevronsUpDown,
  ChevronDown,
  LogOut,
  Settings,
  User,
  Shield,
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
import { useIsMobile } from "@/hooks/use-mobile"

export function NavUser({
  user,
  hideText = false,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
  hideText?: boolean
}) {
  const isMobile = useIsMobile()

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' })
  }

  // Lấy chữ cái đầu của tên để làm avatar fallback
  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2.5 p-1 rounded-full hover:bg-white/10 transition-colors text-left outline-none group">
          <Avatar className="h-8 w-8 border border-white/20 shadow-sm transition-transform group-hover:scale-105">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="bg-primary text-primary-foreground font-bold">{initials}</AvatarFallback>
          </Avatar>
          {!hideText && (
            <>
              <div className="hidden sm:flex flex-col">
                <span className="text-sm font-semibold truncate leading-none mb-1">{user.name}</span>
                <span className="text-[10px] opacity-60 truncate leading-none tracking-tight font-medium uppercase">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-1 size-3.5 opacity-50 shrink-0" />
            </>
          )}
          {hideText && <ChevronDown className="ml-1 size-3.5 opacity-50 shrink-0" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 rounded-xl shadow-2xl border-gray-100 mt-2"
        side={isMobile ? "bottom" : "bottom"}
        align="end"
        sideOffset={8}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2.5 px-3 py-3 text-left text-sm bg-gray-50/50 rounded-t-xl border-b border-gray-100">
            <Avatar className="h-10 w-10 border border-white shadow-sm">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="bg-primary text-primary-foreground font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-bold text-gray-900">{user.name}</span>
              <span className="truncate text-xs text-gray-500 font-medium">{user.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        
        <div className="p-1">
          <DropdownMenuGroup>
            <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
              <Link href="/dashboard/ho-so" className="flex items-center w-full px-2 py-2">
                <User className="mr-2 size-4 opacity-70" />
                <span>Hồ sơ cá nhân</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
              <Link href="/dashboard/cai-dat" className="flex items-center w-full px-2 py-2">
                <Settings className="mr-2 size-4 opacity-70" />
                <span>Thiết lập tài khoản</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
              <Link href="/dashboard/quan-ly-tai-khoan" className="flex items-center w-full px-2 py-2">
                <Shield className="mr-2 size-4 opacity-70" />
                <span>Quản lý tài khoản</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          
          <DropdownMenuSeparator className="my-1" />
          
          <DropdownMenuItem 
            onClick={handleLogout} 
            className="rounded-lg cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 focus:text-red-700 focus:bg-red-50 px-2 py-2"
          >
            <LogOut className="mr-2 size-4 opacity-70" />
            <span className="font-semibold">Đăng xuất</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
