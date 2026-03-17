"use client"

import * as React from "react"
import {
  Edit,
  Trash2,
  Eye,
  Calendar,
  MoreVertical,
  Columns,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleCheck,
  AlertCircle,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  Search,
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
import type { SuCo, Phong, KhachThue } from '@/types'

// Helper functions
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'moi':
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Mới
        </Badge>
      )
    case 'dangXuLy':
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          Đang xử lý
        </Badge>
      )
    case 'daXong':
      return (
        <Badge variant="default" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Đã xong
        </Badge>
      )
    case 'daHuy':
      return (
        <Badge variant="outline" className="gap-1">
          <XCircle className="h-3 w-3" />
          Đã hủy
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

const getTypeBadge = (type: string) => {
  switch (type) {
    case 'dienNuoc':
      return <Badge variant="secondary">Điện nước</Badge>
    case 'noiThat':
      return <Badge variant="outline">Nội thất</Badge>
    case 'vesinh':
      return <Badge variant="outline">Vệ sinh</Badge>
    case 'anNinh':
      return <Badge variant="outline">An ninh</Badge>
    case 'khac':
      return <Badge variant="outline">Khác</Badge>
    default:
      return <Badge variant="outline">{type}</Badge>
  }
}

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'thap':
      return <Badge variant="outline" className="border-gray-400 text-gray-700">Thấp</Badge>
    case 'trungBinh':
      return <Badge variant="secondary">Trung bình</Badge>
    case 'cao':
      return <Badge variant="destructive">Cao</Badge>
    case 'khancap':
      return (
        <Badge variant="destructive" className="bg-red-600">
          <AlertCircle className="h-3 w-3 mr-1" />
          Khẩn cấp
        </Badge>
      )
    default:
      return <Badge variant="outline">{priority}</Badge>
  }
}

type SuCoTableProps = {
  phongList: Phong[]
  khachThueList: KhachThue[]
  onView?: (suCo: SuCo) => void
  onEdit: (suCo: SuCo) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, newStatus: string) => void
}

const getPhongName = (phong: string | { maPhong: string }, phongList: Phong[]) => {
  if (typeof phong === 'string') {
    const phongObj = phongList.find(p => p._id === phong)
    return phongObj?.maPhong || 'N/A'
  }
  return phong?.maPhong || 'N/A'
}

const getKhachThueName = (khachThue: string | { hoTen: string }, khachThueList: KhachThue[]) => {
  if (typeof khachThue === 'string') {
    const khachThueObj = khachThueList.find(k => k._id === khachThue)
    return khachThueObj?.hoTen || 'N/A'
  }
  return khachThue?.hoTen || 'N/A'
}

const createColumns = (props: SuCoTableProps & { setSuCoToDelete: (s: SuCo) => void; setIsDeleteDialogOpen: (o: boolean) => void }): ColumnDef<SuCo>[] => [
  {
    accessorKey: "tieuDe",
    header: "Tiêu đề",
    cell: ({ row }) => (
      <div className="min-w-48">
        <div className="font-medium">{row.original.tieuDe}</div>
        <div className="text-sm text-muted-foreground truncate max-w-xs">
          {row.original.moTa}
        </div>
      </div>
    ),
    enableHiding: false,
  },
  {
    accessorKey: "phong",
    header: "Phòng",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">
          {getPhongName(row.original.phong, props.phongList)}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "khachThue",
    header: "Khách thuê",
    cell: ({ row }) => {
      const khachThue = row.original.khachThue as (string | KhachThue)
      return (
        <div className="min-w-32">
          <div className="font-medium">
            {getKhachThueName(khachThue, props.khachThueList)}
          </div>
          {typeof khachThue === 'object' && khachThue !== null && 'soDienThoai' in khachThue && (
            <div className="text-xs text-muted-foreground">
              {khachThue.soDienThoai}
            </div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "loaiSuCo",
    header: "Loại",
    cell: ({ row }) => getTypeBadge(row.original.loaiSuCo),
  },
  {
    accessorKey: "mucDoUuTien",
    header: "Mức độ",
    cell: ({ row }) => getPriorityBadge(row.original.mucDoUuTien),
  },
  {
    accessorKey: "trangThai",
    header: "Trạng thái",
    cell: ({ row }) => {
      const suCo = row.original
      return (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {getStatusBadge(suCo.trangThai)}
          {suCo.trangThai === 'moi' && (
            <Select
              value={suCo.trangThai}
              onValueChange={(value) => props.onStatusChange(suCo._id!, value)}
            >
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dangXuLy">Xử lý</SelectItem>
                <SelectItem value="daHuy">Hủy</SelectItem>
              </SelectContent>
            </Select>
          )}
          {suCo.trangThai === 'dangXuLy' && (
            <Select
              value={suCo.trangThai}
              onValueChange={(value) => props.onStatusChange(suCo._id!, value)}
            >
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daXong">Hoàn thành</SelectItem>
                <SelectItem value="daHuy">Hủy</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "ngayBaoCao",
    header: "Ngày báo cáo",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">
          {new Date(row.original.ngayBaoCao).toLocaleDateString('vi-VN')}
        </span>
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
            props.onEdit(row.original);
          }}>
            <Edit className="mr-2 h-4 w-4" />
            Chỉnh sửa
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              props.setSuCoToDelete(row.original);
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

function SuCoTableRow({ row, onView }: { row: Row<SuCo>, onView?: (suCo: SuCo) => void }) {
  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      onClick={() => onView?.(row.original)}
      className="cursor-pointer hover:bg-muted/50 transition-colors"
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}

type SuCoDataTableProps = SuCoTableProps & {
  data: SuCo[]
  searchTerm?: string
  onSearchChange?: (value: string) => void
  statusFilter?: string
  onStatusFilterChange?: (value: string) => void
  typeFilter?: string
  onTypeChange?: (value: string) => void
  priorityFilter?: string
  onPriorityChange?: (value: string) => void
}

export function SuCoDataTable(props: SuCoDataTableProps) {
  const { data: initialData, searchTerm, onSearchChange, statusFilter, onStatusFilterChange, typeFilter, onTypeChange, priorityFilter, onPriorityChange, ...tableProps } = props
  const [data, setData] = React.useState(() => initialData)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [suCoToDelete, setSuCoToDelete] = React.useState<SuCo | null>(null);
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
    setSuCoToDelete,
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
                placeholder="Tìm kiếm tiêu đề, mô tả..."
                value={searchTerm || ''}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-full sm:w-[130px]">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="moi">Mới</SelectItem>
              <SelectItem value="dangXuLy">Đang xử lý</SelectItem>
              <SelectItem value="daXong">Đã xong</SelectItem>
              <SelectItem value="daHuy">Đã hủy</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={onTypeChange}>
            <SelectTrigger className="w-full sm:w-[130px]">
              <SelectValue placeholder="Loại" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="dienNuoc">Điện nước</SelectItem>
              <SelectItem value="noiThat">Nội thất</SelectItem>
              <SelectItem value="vesinh">Vệ sinh</SelectItem>
              <SelectItem value="anNinh">An ninh</SelectItem>
              <SelectItem value="khac">Khác</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={onPriorityChange}>
            <SelectTrigger className="w-full sm:w-[130px]">
              <SelectValue placeholder="Ưu tiên" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="thap">Thấp</SelectItem>
              <SelectItem value="trungBinh">Trung bình</SelectItem>
              <SelectItem value="cao">Cao</SelectItem>
              <SelectItem value="khancap">Khẩn cấp</SelectItem>
            </SelectContent>
          </Select>
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
                <SuCoTableRow key={row.id} row={row} onView={tableProps.onView} />
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
              Bạn có chắc chắn muốn xóa sự cố <strong>{suCoToDelete?.tieuDe}</strong>? Hành động này không thể hoàn tác.
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
                if (suCoToDelete) {
                  tableProps.onDelete(suCoToDelete._id!);
                  setIsDeleteDialogOpen(false);
                  setSuCoToDelete(null);
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

