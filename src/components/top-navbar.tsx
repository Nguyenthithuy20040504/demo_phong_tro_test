'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  Building2,
  Building,
  Receipt,
  AlertTriangle,
  Shield,
  Settings,
  ChevronDown,
  Home,
  User,
  LogOut,
  Bell,
  Wrench,
  FileText,
  CreditCard,
  Users,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationBell } from '@/components/ui/notification-bell';
import { cn } from '@/lib/utils';

// ─── Nav item types ───────────────────────────────────────────────────────────
interface NavChild {
  title: string;
  url: string;
  icon?: React.ElementType;
}

interface NavGroup {
  title: string;
  icon: React.ElementType;
  children: NavChild[];
  roles?: string[]; // if undefined → show for all
  hideForRoles?: string[];
}

// ─── Nav config ───────────────────────────────────────────────────────────────
const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Quản lý cơ bản',
    icon: Building,
    children: [
      { title: 'Tòa nhà', url: '/dashboard/toa-nha', icon: Building2 },
      { title: 'Phòng', url: '/dashboard/phong', icon: Home },
      { title: 'Khách thuê', url: '/dashboard/khach-thue', icon: Users },
    ],
    hideForRoles: ['admin'],
  },
  {
    title: 'Quản lý cơ bản',
    icon: Building,
    children: [
      { title: 'Tòa nhà', url: '/dashboard/toa-nha', icon: Building2 },
      { title: 'Phòng', url: '/dashboard/phong', icon: Home },
    ],
    roles: ['admin'],
  },
  {
    title: 'Tài chính',
    icon: Receipt,
    children: [
      { title: 'Hợp đồng', url: '/dashboard/hop-dong', icon: FileText },
      { title: 'Hóa đơn', url: '/dashboard/hoa-don', icon: Receipt },
      { title: 'Thanh toán', url: '/dashboard/thanh-toan', icon: CreditCard },
    ],
    hideForRoles: [],
  },
  {
    title: 'Vận hành',
    icon: Wrench,
    children: [
      { title: 'Sự cố', url: '/dashboard/su-co', icon: AlertCircle },
      { title: 'Thông báo', url: '/dashboard/thong-bao', icon: MessageSquare },
    ],
    hideForRoles: ['admin'],
  },
  {
    title: 'Dịch vụ SaaS',
    icon: Building2,
    children: [
      { title: 'Dashboard SaaS', url: '/dashboard/admin/saas-dashboard', icon: Home },
      { title: 'Quản lý Gói', url: '/dashboard/admin/quan-ly-goi', icon: Receipt },
      { title: 'Hóa đơn gia hạn', url: '/dashboard/admin/hoa-don-saas', icon: FileText },
    ],
    roles: ['admin'],
  },
  {
    title: 'Quản trị',
    icon: Shield,
    children: [
      { title: 'Quản lý tài khoản', url: '/dashboard/quan-ly-tai-khoan', icon: Users },
    ],
    roles: ['admin', 'chuNha'],
  },
  {
    title: 'Cài đặt',
    icon: Settings,
    children: [
      { title: 'Hồ sơ', url: '/dashboard/ho-so', icon: User },
      { title: 'Cài đặt', url: '/dashboard/cai-dat', icon: Settings },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function useNavGroups(role: string | undefined) {
  return React.useMemo(() => {
    return NAV_GROUPS.filter((g) => {
      if (g.roles && role && !g.roles.includes(role)) return false;
      if (g.hideForRoles && role && g.hideForRoles.includes(role)) return false;
      return true;
    });
  }, [role]);
}

// ─── Dropdown nav item ─────────────────────────────────────────────────────────
function NavDropdown({ group, pathname }: { group: NavGroup; pathname: string }) {
  const isActive = group.children.some((c) => pathname.startsWith(c.url));
  const Icon = group.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors outline-none',
            isActive
              ? 'text-white bg-white/15'
              : 'text-white/80 hover:text-white hover:bg-white/10'
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span>{group.title}</span>
          <ChevronDown className="h-3.5 w-3.5 ml-0.5 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-52 rounded-xl shadow-xl border border-gray-100 bg-white p-1"
        sideOffset={6}
      >
        {group.children.map((child) => {
          const ChildIcon = child.icon;
          const active = pathname.startsWith(child.url);
          return (
            <DropdownMenuItem key={child.url} asChild>
              <Link
                href={child.url}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer',
                  active
                    ? 'bg-teal-50 text-teal-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                {ChildIcon && <ChildIcon className="h-4 w-4 shrink-0 text-gray-400" />}
                {child.title}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── User menu ─────────────────────────────────────────────────────────────────
function UserMenu({ session }: { session: any }) {
  const name = session?.user?.name || 'User';
  const email = session?.user?.email || '';
  const avatar = session?.user?.avatar || '';
  const initials = name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/10 transition-colors outline-none">
          <Avatar className="h-8 w-8 ring-2 ring-white/30">
            <AvatarImage src={avatar} alt={name} />
            <AvatarFallback className="bg-teal-200 text-teal-800 text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <ChevronDown className="h-3.5 w-3.5 text-white/70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 rounded-xl shadow-xl border border-gray-100 bg-white p-1"
        sideOffset={8}
      >
        <DropdownMenuLabel className="px-3 py-2">
          <p className="text-sm font-semibold text-gray-800 truncate">{name}</p>
          <p className="text-xs text-gray-500 truncate">{email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/ho-so" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer">
            <User className="h-4 w-4 text-gray-400" />
            Hồ sơ
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/cai-dat" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer">
            <Settings className="h-4 w-4 text-gray-400" />
            Cài đặt
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Main TopNavbar ────────────────────────────────────────────────────────────
export function TopNavbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role as string | undefined;
  const navGroups = useNavGroups(role);
  const isDashboardHome = pathname === '/dashboard';

  return (
    <header className="sticky top-0 z-50 w-full" style={{ background: '#0D9488' }}>
      {/* Top bar */}
      <div className="flex h-14 items-center gap-4 px-4 md:px-6">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 shrink-0 mr-2"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-white text-base tracking-tight hidden sm:block">
            Quản lý nhà trọ
          </span>
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side: notification + user */}
        <div className="flex items-center gap-1">
          <div className="[&_button]:text-white [&_button:hover]:bg-white/10 [&_button]:rounded-lg">
            <NotificationBell />
          </div>
          <UserMenu session={session} />
        </div>
      </div>

      {/* Bottom nav bar */}
      <nav className="flex items-center gap-1 px-4 md:px-6 pb-0 border-t border-white/10">
        {/* Trang chủ */}
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors border-b-2 rounded-t-md',
            isDashboardHome
              ? 'text-white border-white'
              : 'text-white/70 border-transparent hover:text-white hover:border-white/40'
          )}
        >
          <Home className="h-4 w-4 shrink-0" />
          <span>Trang chủ</span>
        </Link>

        {/* Dropdown groups */}
        {navGroups.map((group) => (
          <NavGroupItem key={group.title + (group.roles?.join('') ?? '')} group={group} pathname={pathname} />
        ))}
      </nav>
    </header>
  );
}

// Separate component to handle active state for bottom border styling
function NavGroupItem({ group, pathname }: { group: NavGroup; pathname: string }) {
  const isActive = group.children.some((c) => pathname.startsWith(c.url));
  const Icon = group.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors border-b-2 rounded-t-md outline-none',
            isActive
              ? 'text-white border-white'
              : 'text-white/70 border-transparent hover:text-white hover:border-white/40'
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span>{group.title}</span>
          <ChevronDown className="h-3.5 w-3.5 ml-0.5 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-52 rounded-xl shadow-xl border border-gray-100 bg-white p-1"
        sideOffset={2}
      >
        {group.children.map((child) => {
          const ChildIcon = child.icon;
          const active = pathname.startsWith(child.url);
          return (
            <DropdownMenuItem key={child.url} asChild>
              <Link
                href={child.url}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer',
                  active
                    ? 'bg-teal-50 text-teal-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                {ChildIcon && <ChildIcon className="h-4 w-4 shrink-0 text-gray-400" />}
                {child.title}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
