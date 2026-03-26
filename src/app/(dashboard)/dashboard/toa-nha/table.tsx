"use client"

import * as React from "react"
import {
  Edit,
  Trash2,
  Eye,
  MapPin,
  Building2,
  MoreVertical,
  Columns,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  AlertCircle,
  CheckCircle2,
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import type { ToaNha } from '@/types'
import { ToaNhaDetailDialog } from "@/components/ui/toa-nha-detail-dialog"

// Helper functions
const formatAddress = (diaChi: ToaNha['diaChi']) => {
  return `${diaChi.soNha} ${diaChi.duong}, ${diaChi.phuong}, ${diaChi.quan}, ${diaChi.thanhPho}`
}

type ToaNhaTableProps = {
  onView?: (toaNha: ToaNha) => void
  onEdit: (toaNha: ToaNha) => void
  onDelete: (id: string) => void
  canEdit?: boolean
}

const createColumns = (props: ToaNhaTableProps & { setToaNhaToDelete: (t: ToaNha) => void; setIsDeleteDialogOpen: (o: boolean) => void }): ColumnDef<ToaNha>[] => [
  {
    accessorKey: "tenToaNha",
    header: "Tòa nhà",
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5 min-w-[200px]">
        <span className="font-medium text-foreground">{row.original.tenToaNha}</span>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Building2 className="h-2.5 w-2.5" />
          Mã: {row.original._id?.slice(-6).toUpperCase()}
        </span>
      </div>
    ),
    enableHiding: false,
  },
  {
    accessorKey: "diaChi",
    header: "Địa chỉ",
    cell: ({ row }) => (
      <div className="flex items-start gap-1.5 min-w-[280px]">
        <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{formatAddress(row.original.diaChi)}</span>
      </div>
    ),
  },
  {
    accessorKey: "tongSoPhong",
    header: "Tổng phòng",
    cell: ({ row }) => (
      <div className="text-center font-medium">
        {row.original.tongSoPhong}
      </div>
    ),
  },
  {
    id: "trangThai",
    header: "Tình trạng",
    cell: ({ row }) => {
      const suCoCount = (row.original as any).suCoCount || 0
      const phongBaoTri = (row.original as any).phongBaoTri || 0
      const isDamaged = suCoCount > 0 || phongBaoTri > 0
      
      return (
        <div className="flex justify-center">
          <Badge variant={isDamaged ? "destructive" : "default"} className="gap-1">
            {isDamaged ? (
              <>
                <AlertCircle className="size-3" />
                Hỏng hóc
              </>
            ) : (
              <>
                <CheckCircle2 className="size-3" />
                Bình thường
              </>
            )}
          </Badge>
        </div>
      )
    },
  },
  {
    accessorKey: "tienNghiChung",
    header: "Tiện nghi",
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1 max-w-[180px]">
        {row.original.tienNghiChung.slice(0, 2).map((tienNghi) => (
          <Badge key={tienNghi} variant="outline" className="text-[10px] px-1 py-0">
            {tienNghi}
          </Badge>
        ))}
        {row.original.tienNghiChung.length > 2 && (
          <span className="text-[10px] text-muted-foreground">+{row.original.tienNghiChung.length - 2}</span>
        )}
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
            className="text-muted-foreground size-8"
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
          {props.canEdit !== false && (
            <>
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
                  props.setToaNhaToDelete(row.original);
                  props.setIsDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Xóa
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    enableHiding: false,
  },
];

function ToaNhaTableRow({ row, onClick }: { row: Row<ToaNha>, onClick: () => void }) {
  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      onClick={onClick}
      className="cursor-pointer hover:bg-muted/50"
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
}

type ToaNhaDataTableProps = ToaNhaTableProps & {
  data: ToaNha[]
  searchTerm?: string
  onSearchChange?: (value: string) => void
}

export function ToaNhaDataTable(props: ToaNhaDataTableProps) {
  const { data: initialData, searchTerm, onSearchChange, ...tableProps } = props
  const [data, setData] = React.useState(() => initialData)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [toaNhaToDelete, setToaNhaToDelete] = React.useState<ToaNha | null>(null);
  const [selectedToaNha, setSelectedToaNha] = React.useState<ToaNha | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
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
  
  React.useEffect(() => {
    setData(initialData)
  }, [initialData])
  
  const columns = React.useMemo(() => createColumns({
    ...tableProps,
    setToaNhaToDelete,
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
                placeholder="Tìm kiếm tòa nhà..."
                value={searchTerm || ''}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="pl-10"
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
      
      <div className="overflow-x-auto rounded-lg border bg-background shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const columnId = header.column.id;
                  const isHideOnMobile = ["diaChi", "tienNghiChung", "trangThai", "tongSoPhong"].includes(columnId);
                  const isHideOnTablet = ["tienNghiChung"].includes(columnId);

                  let className = "";
                  if (columnId === "diaChi") className = "hidden md:table-cell";
                  if (columnId === "tienNghiChung") className = "hidden xl:table-cell";
                  if (columnId === "trangThai") className = "hidden sm:table-cell";
                  if (columnId === "tongSoPhong") className = "hidden lg:table-cell";

                  return (
                    <TableHead 
                      key={header.id} 
                      colSpan={header.colSpan}
                      className={className}
                    >
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
                  onClick={() => {
                    setSelectedToaNha(row.original);
                    setIsDetailOpen(true);
                  }}
                  className="cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => {
                    const columnId = cell.column.id;
                    let className = "";
                    if (columnId === "diaChi") className = "hidden md:table-cell";
                    if (columnId === "tienNghiChung") className = "hidden xl:table-cell";
                    if (columnId === "trangThai") className = "hidden sm:table-cell";
                    if (columnId === "tongSoPhong") className = "hidden lg:table-cell";

                    return (
                      <TableCell 
                        key={cell.id}
                        className={className}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    );
                  })}
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

      <ToaNhaDetailDialog 
        toaNha={selectedToaNha}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa tòa nhà <strong>{toaNhaToDelete?.tenToaNha}</strong>? Hành động này không thể hoàn tác.
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
                if (toaNhaToDelete) {
                  tableProps.onDelete(toaNhaToDelete._id!);
                  setIsDeleteDialogOpen(false);
                  setToaNhaToDelete(null);
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
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
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

