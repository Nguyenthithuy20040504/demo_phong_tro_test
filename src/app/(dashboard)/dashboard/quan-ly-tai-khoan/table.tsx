"use client"

import * as React from "react"
import {
  Edit,
  Eye,
  Mail,
  Phone,
  Calendar,
  Shield,
  MoreVertical,
  Columns,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  UserCheck,
  UserX,
  Search,
  RefreshCw,
  Clock,
  LockKeyhole
} from "lucide-react"
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  Row,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface User {
  _id: string
  name?: string
  ten?: string
  email: string
  phone?: string
  soDienThoai?: string
  role?: string
  vaiTro?: string
  avatar?: string
  anhDaiDien?: string
  createdAt?: string
  ngayTao?: string
  lastLogin?: string
  isActive?: boolean
  trangThai?: string
  goiDichVu?: string
  ngayHetHan?: string
  nguoiTao?: any
}

// Helper functions
const getUserName = (user: User) => user.name || user.ten || 'Không có tên'
const getUserPhone = (user: User) => user.phone || user.soDienThoai || ''
const getUserRole = (user: User) => user.role || user.vaiTro || 'nhanVien'
const getUserAvatar = (user: User) => user.avatar || user.anhDaiDien || ''
const getUserIsActive = (user: User) => user.isActive !== undefined ? user.isActive : (user.trangThai === 'hoatDong')

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const getRoleBadge = (role: string) => {
  switch (role) {
    case 'admin':
      return (
        <Badge variant="destructive" className="gap-1">
          <Shield className="h-3 w-3" />
          Quản trị viên
        </Badge>
      )
    case 'chuNha':
      return (
        <Badge variant="default" className="gap-1">
          Chủ nhà
        </Badge>
      )
    case 'nhanVien':
      return (
        <Badge variant="secondary" className="gap-1">
          Nhân viên
        </Badge>
      )
    default:
      return <Badge variant="outline">Người dùng</Badge>
  }
}

const getPlanBadge = (plan: string) => {
  switch (plan) {
    case 'mienPhi':
      return <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">Miễn phí</Badge>
    case 'coBan':
      return <Badge variant="default" className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-50">Cơ bản</Badge>
    case 'chuyenNghiep':
      return <Badge variant="default" className="bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-50">Chuyên nghiệp</Badge>
    default:
      return <Badge variant="outline">Miễn phí</Badge>
  }
}

type UserTableProps = {
  onView?: (user: User) => void
  onEdit: (user: User) => void
  onDelete: (id: string) => void
  onToggleStatus: (user: User) => void
  onResetPassword: (user: User) => void
  currentUserId?: string
}

const createColumns = (props: UserTableProps): ColumnDef<User>[] => [
  {
    accessorKey: "name",
    header: "Người dùng",
    cell: ({ row }) => {
      const user = row.original
      const name = getUserName(user)
      const avatar = getUserAvatar(user)
      
      return (
        <div className="flex items-center gap-3 min-w-48">
          <Avatar className="h-9 w-9">
            <AvatarImage src={avatar} alt={name} />
            <AvatarFallback className="text-xs">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{name}</p>
          </div>
        </div>
      )
    },
    enableHiding: false,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <div className="flex items-center gap-2 min-w-48">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{row.original.email}</span>
      </div>
    ),
  },
  {
    accessorKey: "phone",
    header: "Số điện thoại",
    cell: ({ row }) => {
      const phone = getUserPhone(row.original)
      return phone ? (
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{phone}</span>
        </div>
      ) : (
        <span className="text-muted-foreground text-sm">Chưa cập nhật</span>
      )
    },
  },
  {
    accessorKey: "role",
    header: "Vai trò",
    cell: ({ row }) => getRoleBadge(getUserRole(row.original)),
  },
  {
    accessorKey: "goiDichVu",
    header: "Gói dịch vụ",
    cell: ({ row }) => {
      return getPlanBadge(row.original.goiDichVu || 'mienPhi');
    },
  },
  {
    accessorKey: "ngayHetHan",
    header: "Ngày hết hạn",
    cell: ({ row }) => {
      const role = getUserRole(row.original);
      const dateStr = row.original.ngayHetHan;
      
      // Admin và Khách thuê luôn là Không giới hạn
      if (role === 'admin' || role === 'khachThue') {
        return <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200">Không giới hạn</Badge>;
      }

      if (!dateStr) return <span className="text-muted-foreground text-sm">-</span>;
      
      const date = new Date(dateStr);
      
      // Nếu ngày quá xa (2099+) thì hiển thị Không giới hạn
      if (date.getFullYear() >= 2099) {
        return <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200">Không giới hạn</Badge>;
      }

      const isExpired = date < new Date();
      
      return (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Clock className={`h-3 w-3 ${isExpired ? 'text-red-500' : 'text-muted-foreground'}`} />
            <span className={`text-sm font-medium ${isExpired ? 'text-red-600' : ''}`}>
              {date.toLocaleDateString('vi-VN')}
            </span>
          </div>
          {isExpired && <span className="text-[10px] text-red-500 font-bold ml-5 uppercase">Đã hết hạn</span>}
        </div>
      );
    },
  },
  {
    accessorKey: "nguoiTao",
    header: "Người tạo",
    cell: ({ row }) => {
      const creator = row.original.nguoiTao;
      if (!creator) return <span className="text-muted-foreground text-sm">Hệ thống</span>;
      
      const role = creator.role || creator.vaiTro || 'admin';
      const name = creator.name || creator.ten || 'Admin';
      
      return (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{name}</span>
          <span className="text-[10px] text-muted-foreground uppercase">
            {role === 'admin' ? 'Quản trị viên' : role === 'chuNha' ? 'Chủ nhà' : 'Hệ thống'}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "isActive",
    header: "Trạng thái",
    cell: ({ row }) => {
      const isActive = getUserIsActive(row.original)
      return (
        <Badge variant={isActive ? "default" : "secondary"} className="gap-1">
          {isActive ? (
            <>
              <UserCheck className="h-3 w-3" />
              Hoạt động
            </>
          ) : (
            <>
              <UserX className="h-3 w-3" />
              Tạm khóa
            </>
          )}
        </Badge>
      )
    },
  },
  {
    accessorKey: "createdAt",
    header: "Ngày tạo",
    cell: ({ row }) => {
      const dateStr = row.original.createdAt || row.original.ngayTao;
      if (!dateStr) return <span className="text-muted-foreground text-sm">Chưa cập nhật</span>;
      
      const date = new Date(dateStr);
      return (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm font-medium">{date.toLocaleDateString('vi-VN')}</span>
          </div>
          <span className="text-[10px] text-muted-foreground ml-5">{date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "lastLogin",
    header: "Đăng nhập cuối",
    cell: ({ row }) => {
      const dateStr = row.original.lastLogin;
      if (!dateStr) return <span className="text-muted-foreground text-sm">Chưa có thông tin</span>;
      
      const date = new Date(dateStr);
      return (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm font-medium">{date.toLocaleDateString('vi-VN')}</span>
          </div>
          <span className="text-[10px] text-muted-foreground ml-5">{date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const isCurrentUser = row.original._id === props.currentUserId
      
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
              size="icon"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="size-4" />
              <span className="sr-only">Mở menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {props.onView && (
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                props.onView!(row.original);
              }}>
                <Eye className="mr-2 h-4 w-4" />
                Xem chi tiết
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              props.onEdit(row.original);
            }}>
              <Edit className="mr-2 h-4 w-4" />
              Chỉnh sửa
            </DropdownMenuItem>

            {!isCurrentUser && (
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                props.onToggleStatus(row.original);
              }}>
                {getUserIsActive(row.original) ? (
                  <>
                    <UserX className="mr-2 h-4 w-4 text-orange-500" />
                    <span className="text-orange-500">Khóa tài khoản</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="mr-2 h-4 w-4 text-emerald-500" />
                    <span className="text-emerald-500">Mở khóa tài khoản</span>
                  </>
                )}
              </DropdownMenuItem>
            )}

            {!isCurrentUser && (
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                props.onResetPassword(row.original);
              }}>
                <LockKeyhole className="mr-2 h-4 w-4" />
                Đặt lại mật khẩu
              </DropdownMenuItem>
            )}


          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
    enableHiding: false,
  },
]

function UserTableRow({ row }: { row: Row<User> }) {
  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}

type UserDataTableProps = UserTableProps & {
  data: User[]
  searchTerm?: string
  onSearchChange?: (value: string) => void
}

export function UserDataTable(props: UserDataTableProps) {
  const { data: initialData, searchTerm, onSearchChange, ...tableProps } = props
  const [data, setData] = React.useState(() => initialData)

  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  
  // Sync data when prop changes
  React.useEffect(() => {
    setData(initialData)
  }, [initialData])
  
  const columns = React.useMemo(() => createColumns(tableProps), [tableProps])

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row._id!,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  const selectedCount = table.getFilteredSelectedRowModel().rows.length

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Tìm kiếm bên trái */}
        <div className="flex-1 w-full sm:max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm theo tên, email..."
              value={searchTerm || ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tùy chỉnh cột bên phải */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns className="mr-2 h-4 w-4" />
                <span className="hidden lg:inline">Tùy chỉnh cột</span>
                <span className="lg:hidden">Cột</span>
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="**:data-[slot=table-cell]:first:w-8">
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <UserTableRow key={row.id} row={row} />
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>


      
      <div className="flex items-center justify-between px-4">
        <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
          {selectedCount > 0 ? (
            <>Đã chọn {selectedCount} trong {table.getFilteredRowModel().rows.length} hàng</>
          ) : (
            <>Hiển thị {table.getFilteredRowModel().rows.length} hàng</>
          )}
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="rows-per-page" className="text-sm font-medium">
              Số hàng mỗi trang
            </Label>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value))
              }}
            >
              <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                <SelectValue
                  placeholder={table.getState().pagination.pageSize}
                />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-fit items-center justify-center text-sm font-medium">
            Trang {table.getState().pagination.pageIndex + 1} /{" "}
            {table.getPageCount()}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Trang đầu</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Trang trước</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Trang sau</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Trang cuối</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

