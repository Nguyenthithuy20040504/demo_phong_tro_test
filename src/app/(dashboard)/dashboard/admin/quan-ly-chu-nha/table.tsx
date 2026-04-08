"use client"

import * as React from "react"
import {
  Edit,
  Edit2,
  Trash2,
  Eye,
  Phone,
  Mail,
  MapPin,
  MoreVertical,
  Columns,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  User,
  CreditCard,
  Calendar,
  Search,
  Home,
  Building2,
  Key,
  Check,
  X,
  UserPlus,
  Clock,
  UserX,
  UserCheck,
  LockKeyhole,
  AlertTriangle
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

export interface Landlord {
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
  isActive?: boolean
  trangThai?: string
  goiDichVu?: string
  ngayHetHan?: string
  totalBuildings?: number
  totalRooms?: number
  // Profile fields
  cccd?: string
  ngaySinh?: string | Date
  gioiTinh?: string
  queQuan?: string
  ngheNghiep?: string
  anhCCCD?: {
    matTruoc: string
    matSau: string
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

const getAccountStatusBadge = (isActive: boolean) => {
  if (isActive) {
    return (
      <Badge variant="default" className="gap-1 bg-emerald-600 hover:bg-emerald-700">
        <UserCheck className="h-3 w-3" />
        Hoạt động
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="gap-1 bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200">
      <UserX className="h-3 w-3" />
      Tạm khóa
    </Badge>
  )
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

type LandlordTableProps = {
  onView: (landlord: Landlord) => void
  onEditProfile: (landlord: Landlord) => void
  onEditPlan: (landlord: Landlord) => void
  onToggleStatus: (landlord: Landlord) => void
  onResetPassword: (landlord: Landlord) => void
  onDelete: (id: string) => void
  actionLoading: string | null
}

const createColumns = (props: LandlordTableProps & { setLandlordToDelete: (l: Landlord) => void; setIsDeleteDialogOpen: (o: boolean) => void }): ColumnDef<Landlord>[] => [
  {
    accessorKey: "name",
    header: "Chủ trọ",
    cell: ({ row }) => {
      const landlord = row.original
      const name = landlord.name || landlord.ten || 'Không có tên'
      const avatar = landlord.avatar || landlord.anhDaiDien
      
      return (
        <div className="flex items-center gap-3 min-w-48">
          <Avatar className="h-10 w-10 border shadow-sm">
            <AvatarImage src={avatar} alt={name} />
            <AvatarFallback className="bg-teal-50 text-teal-700 text-xs font-bold font-heading">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <p className="font-bold text-gray-900 leading-tight">{name}</p>
            <div className="flex items-center gap-1 mt-0.5">
               <Badge variant="outline" className="text-[10px] py-0 h-4 bg-teal-50/50 text-teal-700 border-teal-100 uppercase tracking-tighter">Chủ nhà</Badge>
               {landlord.gioiTinh && (
                 <span className="text-[10px] text-muted-foreground capitalize">• {landlord.gioiTinh}</span>
               )}
            </div>
          </div>
        </div>
      )
    },
    enableHiding: false,
  },
  {
    accessorKey: "contact",
    header: "Liên hệ",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1 min-w-40">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">{row.original.phone || row.original.soDienThoai}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Mail className="h-3.5 w-3.5 opacity-70" />
          <span className="truncate max-w-[150px]">{row.original.email}</span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "goiDichVu",
    header: "Gói dịch vụ",
    cell: ({ row }) => getPlanBadge(row.original.goiDichVu || 'mienPhi'),
  },
  {
    accessorKey: "stats",
    header: "Quy mô",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1 min-w-[100px]">
        <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md w-fit">
          <Building2 className="h-3 w-3" />
          <span>{row.original.totalBuildings || 0} tòa</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md w-fit">
          <Home className="h-3 w-3" />
          <span>{row.original.totalRooms || 0} phòng</span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "ngayHetHan",
    header: "Hết hạn",
    cell: ({ row }) => {
      const dateStr = row.original.ngayHetHan
      if (!dateStr) return <span className="text-muted-foreground text-xs">-</span>
      
      const date = new Date(dateStr)
      if (date.getFullYear() >= 2099) {
        return <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200 text-[10px] font-bold">Vĩnh viễn</Badge>
      }

      const isExpired = date < new Date()
      return (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Clock className={`h-3.5 w-3.5 ${isExpired ? 'text-red-500' : 'text-muted-foreground'}`} />
            <span className={`text-sm font-bold ${isExpired ? 'text-red-600' : 'text-gray-700'}`}>
              {date.toLocaleDateString('vi-VN')}
            </span>
          </div>
          {isExpired && <span className="text-[10px] text-red-500 font-black ml-5 uppercase tracking-tighter">Đã hết hạn</span>}
        </div>
      )
    },
  },
  {
    accessorKey: "isActive",
    header: "Trạng thái",
    cell: ({ row }) => {
      const landlord = row.original
      const isActive = landlord.isActive !== undefined ? landlord.isActive : (landlord.trangThai === 'hoatDong')
      return (
        <div 
          className="cursor-pointer transition-transform hover:scale-105 active:scale-95"
          onClick={(e) => {
            e.stopPropagation();
            props.onToggleStatus(landlord);
          }}
        >
          {getAccountStatusBadge(isActive)}
        </div>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const landlord = row.original
      const isActive = landlord.isActive !== undefined ? landlord.isActive : (landlord.trangThai === 'hoatDong')
      
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="data-[state=open]:bg-muted text-muted-foreground flex size-8 rounded-full"
              size="icon"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="size-4" />
              <span className="sr-only">Mở menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 shadow-xl border-gray-100 rounded-xl p-1.5">
            <DropdownMenuItem className="rounded-lg py-2 cursor-pointer" onClick={(e) => {
              e.stopPropagation();
              props.onView(landlord);
            }}>
              <Eye className="mr-3 h-4 w-4 opacity-70" />
              <span className="font-medium text-sm">Xem chi tiết</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem className="rounded-lg py-2 cursor-pointer" onClick={(e) => {
              e.stopPropagation();
              props.onEditProfile(landlord);
            }}>
              <Edit2 className="mr-3 h-4 w-4 opacity-70" />
              <span className="font-medium text-sm">Chỉnh sửa hồ sơ</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1" />

            <DropdownMenuItem className="rounded-lg py-2 cursor-pointer" onClick={(e) => {
              e.stopPropagation();
              props.onEditPlan(landlord);
            }}>
              <CreditCard className="mr-3 h-4 w-4 opacity-70" />
              <span className="font-medium text-sm text-teal-700">Sửa gói & Hạn dùng</span>
            </DropdownMenuItem>

            <DropdownMenuItem className="rounded-lg py-2 cursor-pointer" onClick={(e) => {
              e.stopPropagation();
              props.onToggleStatus(landlord);
            }}>
              {isActive ? (
                <>
                  <UserX className="mr-3 h-4 w-4 text-orange-500 opacity-70" />
                  <span className="font-medium text-sm text-orange-600">Khóa tài khoản</span>
                </>
              ) : (
                <>
                  <UserCheck className="mr-3 h-4 w-4 text-emerald-500 opacity-70" />
                  <span className="font-medium text-sm text-emerald-600">Mở khóa tài khoản</span>
                </>
              )}
            </DropdownMenuItem>

            <DropdownMenuItem className="rounded-lg py-2 cursor-pointer" onClick={(e) => {
              e.stopPropagation();
              props.onResetPassword(landlord);
            }}>
              <LockKeyhole className="mr-3 h-4 w-4 opacity-70" />
              <span className="font-medium text-sm">Đặt lại mật khẩu</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1" />

            <DropdownMenuItem 
              className="rounded-lg py-2 cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50" 
              onClick={(e) => {
                e.stopPropagation();
                props.setLandlordToDelete(landlord);
                props.setIsDeleteDialogOpen(true);
              }}
              disabled={props.actionLoading === `delete-${landlord._id}`}
            >
              <Trash2 className="mr-3 h-4 w-4 opacity-80" />
              <span className="font-bold text-sm">Xóa tài khoản</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
    enableHiding: false,
  },
];

function LandlordTableRow({ row, onView }: { row: Row<Landlord>; onView: (l: Landlord) => void }) {
  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      className="cursor-pointer hover:bg-teal-50/20 transition-colors group"
      onClick={() => onView(row.original)}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id} className="py-3 px-4">
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
}

type LandlordDataTableProps = LandlordTableProps & {
  data: Landlord[];
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
};

export function LandlordTable(props: LandlordDataTableProps) {
  const { data: initialData, searchTerm, onSearchChange, ...tableProps } = props;
  const [data, setData] = React.useState(() => initialData);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [landlordToDelete, setLandlordToDelete] = React.useState<Landlord | null>(null);
  
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  
  // Sync data when prop changes
  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);
  
  const columns = React.useMemo(() => createColumns({ 
    ...tableProps, 
    setLandlordToDelete, 
    setIsDeleteDialogOpen 
  }), [tableProps]);

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
    getRowId: (row) => row._id,
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
  });

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Search */}
        <div className="flex-1 w-full sm:max-w-md">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-teal-600" />
            <Input
              placeholder="Tìm tên, SĐT, Email chủ trọ..."
              value={searchTerm || ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="pl-11 h-11 rounded-2xl border-gray-100 bg-gray-50/30 focus-visible:ring-teal-500 focus-visible:bg-white transition-all shadow-input"
            />
          </div>
        </div>
        
        {/* Column Visibility */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-10 rounded-xl border-gray-200">
                <Columns className="mr-2 h-4 w-4" />
                <span className="hidden lg:inline">Tùy chỉnh cột</span>
                <span className="lg:hidden">Cột</span>
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 shadow-xl rounded-xl">
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
                      className="capitalize rounded-lg"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-xl bg-white/80 backdrop-blur-md">
        <Table>
          <TableHeader className="bg-gray-50/80 backdrop-blur-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-b-gray-100">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} colSpan={header.colSpan} className="h-12 py-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
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
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <LandlordTableRow key={row.id} row={row} onView={props.onView} />
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-gray-400 italic font-medium"
                >
                  <div className="flex flex-col items-center gap-2">
                    <AlertTriangle className="h-8 w-8 opacity-20" />
                    <span>Không có dữ liệu chủ trọ nào phù hợp</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="text-muted-foreground hidden flex-1 text-[11px] font-bold uppercase tracking-widest lg:flex">
          {selectedCount > 0 ? (
            <span className="text-teal-600 underline underline-offset-4">Đã chọn {selectedCount} hàng</span>
          ) : (
            <span>Tổng {table.getFilteredRowModel().rows.length} chủ trọ</span>
          )}
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-3 lg:flex">
            <Label htmlFor="rows-per-page" className="text-xs font-bold text-gray-500 uppercase">
              Hàng mỗi trang
            </Label>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger size="sm" className="w-20 h-9 rounded-xl font-bold" id="rows-per-page">
                <SelectValue
                  placeholder={table.getState().pagination.pageSize}
                />
              </SelectTrigger>
              <SelectContent side="top" className="rounded-xl shadow-2xl">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`} className="rounded-lg">
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-fit items-center justify-center text-xs font-black uppercase tracking-tighter text-gray-400">
            Trang {table.getState().pagination.pageIndex + 1} / {" "}
            {table.getPageCount() || 1}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
             <Button
              variant="outline"
              size="icon"
              className="size-9 rounded-xl border-gray-100 bg-white"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-9 rounded-xl border-gray-100 bg-white"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-9 rounded-xl border-gray-100 bg-white"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-9 rounded-xl border-gray-100 bg-white"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl shadow-2xl overflow-hidden border-none p-0">
          <div className="bg-red-50 p-6 flex flex-col items-center">
            <div className="bg-red-100 p-3 rounded-full mb-4">
               <Trash2 className="h-8 w-8 text-red-600" />
            </div>
            <DialogTitle className="text-xl font-bold text-red-900">Xác nhận xóa tài khoản</DialogTitle>
             <DialogDescription className="text-center text-red-700 mt-2 font-medium">
              Bạn có chắc chắn muốn xóa tài khoản chủ trọ <strong>{landlordToDelete?.name || landlordToDelete?.ten}</strong>?
              Hành động này sẽ xóa toàn bộ dữ liệu liên quan và không thể hoàn tác!
            </DialogDescription>
          </div>
          <DialogFooter className="px-6 py-4 bg-white flex flex-col sm:flex-row gap-2">
            <Button
              variant="ghost"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="flex-1 rounded-xl font-bold order-2 sm:order-1"
            >
              Hủy bỏ
            </Button>
            <Button
              variant="destructive"
              className="flex-1 rounded-xl shadow-lg shadow-red-200 font-bold order-1 sm:order-2"
              onClick={() => {
                if (landlordToDelete) {
                  tableProps.onDelete(landlordToDelete._id);
                  setIsDeleteDialogOpen(false);
                  setLandlordToDelete(null);
                }
              }}
            >
              Xác nhận xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
