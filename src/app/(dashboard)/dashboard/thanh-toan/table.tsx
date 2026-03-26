"use client"

import * as React from "react"
import {
  Edit,
  Trash2,
  Download,
  Eye,
  Calendar,
  CreditCard,
  MoreVertical,
  Columns,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Receipt,
  Building2,
  Search,
  Users,
  Home,
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
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import type { ThanhToan, HoaDon } from '@/types'

// Type cho ThanhToan đã được populate
type ThanhToanPopulated = Omit<ThanhToan, 'hoaDon'> & {
  hoaDon: string | HoaDon
}

// Helper functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount)
}

const getMethodBadge = (method: string) => {
  switch (method) {
    case 'tienMat':
      return (
        <Badge variant="default" className="gap-1">
          <CreditCard className="h-3 w-3" />
          Tiền mặt
        </Badge>
      )
    case 'chuyenKhoan':
      return (
        <Badge variant="secondary" className="gap-1">
          <Building2 className="h-3 w-3" />
          Chuyển khoản
        </Badge>
      )
    case 'viDienTu':
      return (
        <Badge variant="outline" className="gap-1">
          <CreditCard className="h-3 w-3" />
          Ví điện tử
        </Badge>
      )
    default:
      return <Badge variant="outline">{method}</Badge>
  }
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'daDuyet':
      return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none">Đã duyệt</Badge>
    case 'choDuyet':
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-none">Chờ duyệt</Badge>
    case 'tuChoi':
      return <Badge variant="destructive">Từ chối</Badge>
    default:
      return null
  }
}

type ThanhToanTableProps = {
  hoaDonList: HoaDon[]
  onView?: (thanhToan: ThanhToanPopulated) => void
  onEdit: (thanhToan: ThanhToanPopulated) => void
  onDelete: (id: string) => void
  onDownload?: (thanhToan: ThanhToanPopulated) => void
  onUpdateStatus?: (id: string, action: 'duyet' | 'tuChoi') => void
}

const getHoaDonInfo = (hoaDon: string | HoaDon, hoaDonList: HoaDon[]) => {
  if (typeof hoaDon === 'object' && hoaDon?.maHoaDon) {
    return hoaDon.maHoaDon
  }
  if (typeof hoaDon === 'string') {
    const hoaDonItem = hoaDonList.find(h => h._id === hoaDon)
    return hoaDonItem?.maHoaDon || 'N/A'
  }
  return 'N/A'
}

const createColumns = (props: ThanhToanTableProps & { setThanhToanToDelete: (t: ThanhToanPopulated) => void; setIsDeleteDialogOpen: (o: boolean) => void }): ColumnDef<ThanhToanPopulated>[] => [
  {
    accessorKey: "hoaDon",
    header: "Hóa đơn",
    cell: ({ row }) => {
      const hoaDonInfo = typeof row.original.hoaDon === 'object' ? row.original.hoaDon : null;
      return (
        <div className="min-w-32">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {getHoaDonInfo(row.original.hoaDon, props.hoaDonList)}
            </span>
          </div>
          {hoaDonInfo && (
            <div className="text-xs text-muted-foreground mt-1 ml-6">
              Tháng {hoaDonInfo.thang}/{hoaDonInfo.nam}
            </div>
          )}
        </div>
      );
    },
    enableHiding: false,
  },
  {
    accessorKey: "phong",
    header: "Phòng",
    cell: ({ row }) => {
      const hoaDonInfo = typeof row.original.hoaDon === 'object' ? row.original.hoaDon : null;
      const phongInfo = hoaDonInfo && typeof hoaDonInfo.phong === 'object' ? (hoaDonInfo.phong as any) : null;
      return (
        <div className="flex items-center gap-2 min-w-24">
          <Home className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {phongInfo?.maPhong || 'N/A'}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "khachThue",
    header: "Người đại diện",
    cell: ({ row }) => {
      const hoaDonInfo = typeof row.original.hoaDon === 'object' ? row.original.hoaDon : null;
      const khachThueInfo = hoaDonInfo && typeof hoaDonInfo.khachThue === 'object' ? (hoaDonInfo.khachThue as any) : null;
      return (
        <div className="flex items-center gap-2 min-w-32">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {khachThueInfo?.hoTen || 'N/A'}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "soTien",
    header: () => <div className="text-right">Số tiền</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {formatCurrency(row.original.soTien)}
      </div>
    ),
  },
  {
    accessorKey: "phuongThuc",
    header: "Phương thức",
    cell: ({ row }) => getMethodBadge(row.original.phuongThuc),
  },
  {
    accessorKey: "thongTinChuyenKhoan",
    header: "Thông tin giao dịch",
    cell: ({ row }) => {
      const tt = row.original.thongTinChuyenKhoan
      if (!tt) return <span className="text-muted-foreground">-</span>
      return (
        <div className="min-w-32">
          <div className="text-sm font-medium">{tt.nganHang}</div>
          <div className="text-xs text-muted-foreground">{tt.soGiaoDich}</div>
        </div>
      )
    },
  },
  {
    accessorKey: "ngayThanhToan",
    header: "Ngày thanh toán",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">
          {new Date(row.original.ngayThanhToan).toLocaleDateString('vi-VN')}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "trangThai",
    header: "Trạng thái",
    cell: ({ row }) => getStatusBadge(row.original.trangThai || 'daDuyet'),
  },
  {
    accessorKey: "ghiChu",
    header: "Ghi chú",
    cell: ({ row }) => (
      <div className="max-w-xs truncate text-sm">
        {row.original.ghiChu || '-'}
      </div>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
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
          {row.original.anhBienLai && props.onDownload && (
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              props.onDownload!(row.original);
            }}>
              <Download className="mr-2 h-4 w-4" />
              Tải biên lai
            </DropdownMenuItem>
          )}

          {row.original.trangThai === 'choDuyet' && props.onUpdateStatus && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-emerald-600 focus:text-emerald-600 font-medium"
                onClick={(e) => {
                  e.stopPropagation();
                  props.onUpdateStatus!(row.original._id!, 'duyet');
                }}
              >
                Duyệt biên lai
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-orange-600 focus:text-orange-600 font-medium"
                onClick={(e) => {
                  e.stopPropagation();
                  props.onUpdateStatus!(row.original._id!, 'tuChoi');
                }}
              >
                Từ chối
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              props.setThanhToanToDelete(row.original);
              props.setIsDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Xóa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    enableHiding: false,
  },
]

type ThanhToanDataTableProps = ThanhToanTableProps & {
  data: ThanhToanPopulated[]
  searchTerm?: string
  onSearchChange?: (value: string) => void
  methodFilter?: string
  onMethodChange?: (value: string) => void
  dateFilter?: string
  onDateChange?: (value: string) => void
  startDate?: string
  onStartDateChange?: (value: string) => void
  endDate?: string
  onEndDateChange?: (value: string) => void
}

export function ThanhToanDataTable(props: ThanhToanDataTableProps) {
  const { 
    data: initialData, 
    searchTerm, 
    onSearchChange, 
    methodFilter, 
    onMethodChange, 
    dateFilter, 
    onDateChange,
    startDate,
    onStartDateChange,
    endDate,
    onEndDateChange,
    ...tableProps 
  } = props
  const [data, setData] = React.useState(() => initialData)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [thanhToanToDelete, setThanhToanToDelete] = React.useState<ThanhToanPopulated | null>(null);
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
  
  const columns = React.useMemo(() => createColumns({
    ...tableProps,
    setThanhToanToDelete,
    setIsDeleteDialogOpen
  }), [tableProps])

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
        {/* Tìm kiếm và Bộ lọc bên trái */}
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
          <div className="flex-1 sm:max-w-xs">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm ghi chú, giao dịch..."
                value={searchTerm || ''}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={methodFilter} onValueChange={onMethodChange}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Phương thức" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="tienMat">Tiền mặt</SelectItem>
              <SelectItem value="chuyenKhoan">Chuyển khoản</SelectItem>
              <SelectItem value="viDienTu">Ví điện tử</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={onDateChange}>
            <SelectTrigger className="w-full sm:w-[130px]">
              <SelectValue placeholder="Thời gian" />
            </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="today">Hôm nay</SelectItem>
                <SelectItem value="week">Tuần này</SelectItem>
                <SelectItem value="month">Tháng này</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 border rounded-md px-2 h-10 bg-background min-w-[320px]">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] text-muted-foreground font-black uppercase shrink-0">Từ</span>
                <Input 
                  type="date" 
                  value={startDate || ''} 
                  onChange={(e) => onStartDateChange?.(e.target.value)} 
                  className="h-7 text-xs border-none p-0 focus-visible:ring-0 w-28 shrink-0" 
                />
              </div>
              <div className="h-4 w-px bg-border shrink-0" />
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] text-muted-foreground font-black uppercase shrink-0">Đến</span>
                <Input 
                  type="date" 
                  value={endDate || ''} 
                  onChange={(e) => onEndDateChange?.(e.target.value)} 
                  className="h-7 text-xs border-none p-0 focus-visible:ring-0 w-28 shrink-0" 
                />
              </div>
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
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
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

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa giao dịch thanh toán cho hóa đơn <strong>{getHoaDonInfo(thanhToanToDelete?.hoaDon || '', props.hoaDonList)}</strong>? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (thanhToanToDelete) {
                  tableProps.onDelete(thanhToanToDelete._id!);
                  setIsDeleteDialogOpen(false);
                  setThanhToanToDelete(null);
                }
              }}
            >
              Xác nhận xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
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

