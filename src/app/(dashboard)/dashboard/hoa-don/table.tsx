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
  CircleCheck,
  Camera,
  Copy,
  Search,
  MessageCircle,
  AlertCircle,
  Mail,
  Ban
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
import { Checkbox } from "@/components/ui/checkbox"
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
import type { HoaDon, Phong, KhachThue } from '@/types'

// Helper functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount)
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'daThanhToan':
      return (
        <Badge variant="default" className="gap-1">
          <CircleCheck className="h-3 w-3" />
          Đã thanh toán
        </Badge>
      )
    case 'daThanhToanMotPhan':
      return (
        <Badge variant="secondary" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Thanh toán một phần
        </Badge>
      )
    case 'chuaThanhToan':
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Chưa thanh toán
        </Badge>
      )
    case 'choDuyet':
      return (
        <Badge variant="outline" className="gap-1 border-yellow-200 bg-yellow-100 text-yellow-800">
          <CircleCheck className="h-3 w-3" />
          Chờ duyệt
        </Badge>
      )
    case 'quaHan':
      return (
        <Badge variant="outline" className="gap-1 border-orange-600 text-orange-600">
          <Calendar className="h-3 w-3" />
          Quá hạn
        </Badge>
      )
    case 'tuChoi':
      return (
        <Badge variant="destructive" className="gap-1 bg-red-600">
          <AlertCircle className="h-3 w-3" />
          Từ chối
        </Badge>
      )
    case 'daHuy':
      return (
        <Badge variant="secondary" className="gap-1 bg-gray-500 text-white hover:bg-gray-600">
          <Ban className="h-3 w-3" />
          Đã hủy
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

const isOverdue = (hanThanhToan: Date | string) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = new Date(hanThanhToan)
  dueDate.setHours(0, 0, 0, 0)
  return dueDate < today
}

type HoaDonTableProps = {
  phongList: Phong[]
  khachThueList: KhachThue[]
  onView: (hoaDon: HoaDon) => void
  onEdit: (hoaDon: HoaDon) => void
  onDelete: (id: string) => void
  onDownload: (hoaDon: HoaDon) => void
  onScreenshot: (hoaDon: HoaDon) => void
  onShare: (hoaDon: HoaDon) => void
  onPayment: (hoaDon: HoaDon) => void
  onDeleteMultiple?: (ids: string[]) => void
  onSendEmail?: (hoaDon: HoaDon) => void
  onSendEmailMultiple?: (ids: string[]) => void

  canEdit?: boolean
  canDelete?: boolean
}

const generateZaloDeepLink = (hoaDon: HoaDon) => {
  const khachThue = hoaDon.khachThue as any;
  const phong = hoaDon.phong as any;
  const phone = khachThue?.soDienThoai || '';
  const message = `Xin chào ${khachThue?.hoTen || 'bạn'}, đây là thông báo thanh toán hóa đơn tháng ${hoaDon.thang}/${hoaDon.nam} cho phòng ${phong?.maPhong || ''}. Số tiền cần thanh toán: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(hoaDon.conLai)}. Trân trọng!`;
  return `https://zalo.me/${phone}?text=${encodeURIComponent(message)}`;
}

const getPhongName = (phong: string | { maPhong: string }, phongList: Phong[]) => {
  if (typeof phong === 'object' && phong?.maPhong) {
    return phong.maPhong
  }
  const phongObj = phongList.find(p => p._id === phong)
  return phongObj?.maPhong || 'N/A'
}

const getKhachThueName = (khachThue: string | { hoTen?: string; ten?: string; name?: string }, khachThueList: KhachThue[]) => {
  if (typeof khachThue === 'object' && khachThue) {
    return khachThue.hoTen || khachThue.ten || khachThue.name || 'Khách thuê';
  }
  const khachThueObj = khachThueList.find(k => k._id === khachThue)
  return khachThueObj?.hoTen || 'N/A'
}

const createColumns = (props: HoaDonTableProps & { setHoaDonToDelete: (h: HoaDon) => void; setIsDeleteDialogOpen: (o: boolean) => void }): ColumnDef<HoaDon>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          disabled={row.original.trangThai === 'daThanhToan'}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "maHoaDon",
    header: "Mã hóa đơn",
    cell: ({ row }) => {
      return <HoaDonCellViewer hoaDon={row.original} onView={props.onView} />
    },
    enableHiding: false,
  },
  {
    accessorKey: "ngayTao",
    header: "Ngày tạo hóa đơn",
    cell: ({ row }) => {
      const date = new Date(row.original.ngayTao);
      return (
        <div className="text-sm font-medium">
          <div className="text-gray-900">
            {date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-xs text-gray-500">
            {date.toLocaleDateString('vi-VN')}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "phong",
    header: "Phòng",
    cell: ({ row }) => (
      <div className="min-w-24">
        <div className="font-medium">{getPhongName(row.original.phong, props.phongList)}</div>
      </div>
    ),
  },
  {
    accessorKey: "khachThue",
    header: "Khách thuê",
    cell: ({ row }) => (
      <div className="min-w-32">
        <div className="font-medium">
          {getKhachThueName(row.original.khachThue, props.khachThueList)}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "thang",
    header: "Tháng/Năm",
    cell: ({ row }) => (
      <div className="text-sm font-medium">
        {row.original.thang}/{row.original.nam}
      </div>
    ),
  },
  {
    accessorKey: "hanThanhToan",
    header: "Hạn thanh toán",
    cell: ({ row }) => {
      const isPaid = row.original.trangThai === 'daThanhToan'
      const isLate = !isPaid && isOverdue(row.original.hanThanhToan)
      return (
        <div className="text-sm">
          <div className={isLate ? 'text-orange-600 font-medium' : ''}>
            {new Date(row.original.hanThanhToan).toLocaleDateString('vi-VN')}
          </div>
          {isLate && (
            <div className="text-xs text-orange-600">Quá hạn</div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "ngayGuiEmailNhacNoCuoi",
    header: "Lần nhắc cuối",
    cell: ({ row }) => {
      if (!row.original.ngayGuiEmailNhacNoCuoi) {
        return <div className="text-xs text-muted-foreground italic">Chưa gửi</div>;
      }
      return (
        <div className="text-sm">
          <div>{new Date(row.original.ngayGuiEmailNhacNoCuoi).toLocaleDateString('vi-VN')}</div>
          <div className="text-xs text-muted-foreground">
            {new Date(row.original.ngayGuiEmailNhacNoCuoi).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} 
            ({row.original.lanGuiEmailNhacNo || 0} lần)
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "trangThai",
    header: "Trạng thái",
    cell: ({ row }) => getStatusBadge(row.original.trangThai),
  },
  {
    accessorKey: "tongTien",
    header: () => <div className="text-right">Tổng tiền</div>,
    cell: ({ row }) => (
      <div className="text-right">
        <div className="font-medium">{formatCurrency(row.original.tongTien)}</div>
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
          <DropdownMenuItem onClick={(e) => {
            e.stopPropagation();
            props.onView(row.original);
          }}>
            <Eye className="mr-2 h-4 w-4" />
            Xem chi tiết
          </DropdownMenuItem>
          {row.original.trangThai !== 'choDuyet' && row.original.trangThai !== 'daThanhToan' && row.original.trangThai !== 'daHuy' && (
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              props.onEdit(row.original);
            }}>
              <Edit className="mr-2 h-4 w-4" />
              Chỉnh sửa
            </DropdownMenuItem>
          )}
          {row.original.conLai > 0 && (
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              props.onPayment(row.original);
            }}>
              <CreditCard className="mr-2 h-4 w-4" />
              Thanh toán
            </DropdownMenuItem>
          )}
          <DropdownMenuItem 
            onClick={(e) => {
              e.stopPropagation();
              window.open(generateZaloDeepLink(row.original), '_blank');
            }}
            className="text-[#0068FF] font-medium"
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Nhắn qua Zalo
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => {
            e.stopPropagation();
            props.onSendEmail?.(row.original);
          }}>
            <Mail className="mr-2 h-4 w-4" />
            Gửi Email Nhắc Nợ
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={(e) => {
            e.stopPropagation();
            props.onShare(row.original);
          }}>
            <Copy className="mr-2 h-4 w-4" />
            Sao chép link
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => {
            e.stopPropagation();
            props.onScreenshot(row.original);
          }}>
            <Camera className="mr-2 h-4 w-4" />
            Xuất PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => {
            e.stopPropagation();
            props.onDownload(row.original);
          }}>
            <Download className="mr-2 h-4 w-4" />
            Tải HTML
          </DropdownMenuItem>
          {props.canDelete !== false && row.original.trangThai !== 'daHuy' && row.original.trangThai !== 'daThanhToan' && (
            <DropdownMenuSeparator />
          )}
          {props.canDelete !== false && row.original.trangThai !== 'daHuy' && row.original.trangThai !== 'daThanhToan' && (
            <DropdownMenuItem 
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                props.setHoaDonToDelete(row.original);
                props.setIsDeleteDialogOpen(true);
              }}
            >
              <Ban className="mr-2 h-4 w-4" />
              Hủy hóa đơn
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    enableHiding: false,
  },
]

function HoaDonTableRow({ row, onView }: { row: Row<HoaDon>; onView?: () => void }) {
  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      className={onView ? "cursor-pointer" : undefined}
      onClick={onView}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}

type HoaDonDataTableProps = HoaDonTableProps & {
  data: HoaDon[]
  searchTerm?: string
  onSearchChange?: (value: string) => void
  statusFilter?: string
  onStatusChange?: (value: string) => void
  monthFilter?: string
  onMonthChange?: (value: string) => void
  yearFilter?: string
  onYearChange?: (value: string) => void
  getMonthOptions?: () => number[]
  getYearOptions?: () => number[]
}

export function HoaDonDataTable(props: HoaDonDataTableProps) {
  const { data: initialData, onDeleteMultiple, searchTerm, onSearchChange, statusFilter, onStatusChange, monthFilter, onMonthChange, yearFilter, onYearChange, getMonthOptions, getYearOptions, ...tableProps } = props
  const [data, setData] = React.useState(() => initialData)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [hoaDonToDelete, setHoaDonToDelete] = React.useState<HoaDon | null>(null);
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
    setHoaDonToDelete,
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

  const handleBulkDelete = () => {
    const selectedIds = table.getFilteredSelectedRowModel().rows.map(row => row.original._id!);
    if (selectedIds.length > 0 && onDeleteMultiple) {
      onDeleteMultiple(selectedIds);
      setRowSelection({}); // Clear selection after deletion
    }
  };

  const handleBulkSendEmail = () => {
    const selectedIds = table.getFilteredSelectedRowModel().rows.map(row => row.original._id!);
    if (selectedIds.length > 0 && props.onSendEmailMultiple) {
      props.onSendEmailMultiple(selectedIds);
      setRowSelection({});
    }
  };


  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Tìm kiếm và Bộ lọc bên trái */}
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
          <div className="flex-1 sm:max-w-xs">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm mã HĐ, phòng, tên khách..."
                value={searchTerm || ''}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value=" active" className="text-teal-600 font-medium">Đang hoạt động</SelectItem>
              <SelectItem value="chuaThanhToan">Chưa thanh toán</SelectItem>
              <SelectItem value="daThanhToanMotPhan">Một phần</SelectItem>
              <SelectItem value="daThanhToan">Đã thanh toán</SelectItem>
              <SelectItem value="choDuyet">Chờ duyệt</SelectItem>
              <SelectItem value="quaHan">Quá hạn</SelectItem>
              <SelectItem value="daHuy">Đã hủy</SelectItem>
              <SelectItem value="tuChoi">Từ chối</SelectItem>
            </SelectContent>
          </Select>
          <Select value={monthFilter} onValueChange={onMonthChange}>
            <SelectTrigger className="w-full sm:w-[130px]">
              <SelectValue placeholder="Tháng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả tháng</SelectItem>
              {getMonthOptions?.().map((month) => (
                <SelectItem key={month} value={month.toString()}>
                  Tháng {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={yearFilter} onValueChange={onYearChange}>
            <SelectTrigger className="w-full sm:w-[120px]">
              <SelectValue placeholder="Năm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả năm</SelectItem>
              {getYearOptions?.().map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  Năm {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tùy chỉnh cột bên phải */}
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <>
              {props.onSendEmailMultiple && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleBulkSendEmail}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Gửi {selectedCount} Email
                </Button>
              )}

              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleBulkDelete}
              >
                <Ban className="mr-2 h-4 w-4" />
                Hủy {selectedCount}
              </Button>
            </>
          )}
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
                <HoaDonTableRow 
                  key={row.id} 
                  row={row} 
                  onView={() => props.onView(row.original)}
                />
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
            <DialogTitle>Xác nhận hủy hóa đơn</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn hủy hóa đơn <strong>{hoaDonToDelete?.maHoaDon}</strong>? Hành động này sẽ thay đổi trạng thái thành "Đã hủy".
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
                if (hoaDonToDelete) {
                  tableProps.onDelete(hoaDonToDelete._id!);
                  setIsDeleteDialogOpen(false);
                  setHoaDonToDelete(null);
                }
              }}
            >
              Xác nhận hủy
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

// Cell viewer component for hoa don details
function HoaDonCellViewer({ 
  hoaDon, 
  onView 
}: { 
  hoaDon: HoaDon
  onView: (hoaDon: HoaDon) => void
}) {
  return (
    <Button 
      variant="link" 
      className="text-foreground w-fit px-0 text-left font-medium"
      onClick={(e) => {
        e.stopPropagation();
        onView(hoaDon);
      }}
    >
      {hoaDon.maHoaDon}
    </Button>
  )
}

