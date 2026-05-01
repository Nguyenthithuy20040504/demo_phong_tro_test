"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, MoreHorizontal, Eye, Download, Edit, Trash2, Trash, CreditCard, Camera, Copy } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DeleteConfirmPopover } from "@/components/ui/delete-confirm-popover"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { HoaDon, Phong, KhachThue } from "@/types"

// Helper functions
const getPhongName = (phongId: string, phongList: Phong[]) => {
  const phong = phongList.find(p => p._id === phongId);
  return phong?.maPhong || 'Không xác định';
};

const getKhachThueName = (khachThueId: string, khachThueList: KhachThue[]) => {
  const khachThue = khachThueList.find(k => k._id === khachThueId);
  return khachThue?.hoTen || 'Không xác định';
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'chuaThanhToan':
      return <Badge variant="destructive">Chưa thanh toán</Badge>;
    case 'daThanhToanMotPhan':
      return <Badge variant="secondary">Thanh toán một phần</Badge>;
    case 'daThanhToan':
      return <Badge variant="default">Đã thanh toán</Badge>;
    case 'quaHan':
      return <Badge variant="outline">Quá hạn</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

interface HoaDonDataTableProps {
  data: HoaDon[];
  phongList: Phong[];
  khachThueList: KhachThue[];
  onView: (hoaDon: HoaDon) => void;
  onDownload: (hoaDon: HoaDon) => void;
  onScreenshot?: (hoaDon: HoaDon) => void;
  onShare?: (hoaDon: HoaDon) => void;
  onEdit: (hoaDon: HoaDon) => void;
  onDelete: (id: string) => void;
  onDeleteMultiple: (ids: string[]) => void;
  onPayment?: (hoaDon: HoaDon) => void;
}

export function createColumns(
  phongList: Phong[],
  khachThueList: KhachThue[],
  onView: (hoaDon: HoaDon) => void,
  onDownload: (hoaDon: HoaDon) => void,
  onScreenshot: (hoaDon: HoaDon) => void,
  onEdit: (hoaDon: HoaDon) => void,
  onDelete: (id: string) => void,
  onShare?: (hoaDon: HoaDon) => void,
  onPayment?: (hoaDon: HoaDon) => void
): ColumnDef<HoaDon>[] {
  return [
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
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "maHoaDon",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Mã hóa đơn
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("maHoaDon")}</div>
      ),
    },
    {
      accessorKey: "phong",
      header: "Phòng",
      cell: ({ row }) => {
        const hoaDon = row.original;
        // Ưu tiên lấy từ populated data, nếu không có thì fallback
        const phongData = hoaDon.phong as any;
        const phongName = (phongData && typeof phongData === 'object' && phongData.maPhong) ? 
                         phongData.maPhong :
                         (typeof hoaDon.phong === 'string' ? getPhongName(hoaDon.phong, phongList) : 'N/A');
        
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {phongName}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "khachThue",
      header: "Khách thuê",
      cell: ({ row }) => {
        const hoaDon = row.original;
        // Ưu tiên lấy từ populated data, nếu không có thì fallback
        const khachThueData = hoaDon.khachThue as any;
        const khachThueName = (khachThueData && typeof khachThueData === 'object' && khachThueData.hoTen) ? 
                             khachThueData.hoTen :
                             (typeof hoaDon.khachThue === 'string' ? getKhachThueName(hoaDon.khachThue, khachThueList) : 'N/A');
        
        return (
          <div className="text-sm">
            {khachThueName}
          </div>
        );
      },
    },
    {
      accessorKey: "thang",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Tháng/Năm
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const thang = row.getValue("thang") as number;
        const nam = row.original.nam;
        return <div className="text-sm font-medium">{thang}/{nam}</div>;
      },
    },
    {
      accessorKey: "tongTien",
      header: () => <div className="text-right">Tổng tiền</div>,
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("tongTien"));
        return <div className="text-right font-medium">{formatCurrency(amount)}</div>;
      },
    },
    {
      accessorKey: "daThanhToan",
      header: () => <div className="text-right">Đã thanh toán</div>,
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("daThanhToan"));
        return (
          <div className="text-right">
            <span className="text-green-600 font-medium">{formatCurrency(amount)}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "conLai",
      header: () => <div className="text-right">Còn lại</div>,
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("conLai"));
        return (
          <div className="text-right">
            <span className={amount > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
              {formatCurrency(amount)}
            </span>
          </div>
        );
      },
    },
    {
      id: "chiSoDienNuoc",
      header: "Chỉ số điện nước",
      cell: ({ row }) => {
        const hoaDon = row.original;
        const chiSoDienBanDau = hoaDon.chiSoDienBanDau || 0;
        const chiSoDienCuoiKy = hoaDon.chiSoDienCuoiKy || 0;
        const soDien = hoaDon.soDien || 0;
        const chiSoNuocBanDau = hoaDon.chiSoNuocBanDau || 0;
        const chiSoNuocCuoiKy = hoaDon.chiSoNuocCuoiKy || 0;
        const soNuoc = hoaDon.soNuoc || 0;
        
        return (
          <div className="text-xs space-y-1">
            <div className="font-medium text-blue-600">⚡ Điện:</div>
            <div className="ml-2">
              <div>Ban đầu: {chiSoDienBanDau} kWh</div>
              <div>Cuối kỳ: {chiSoDienCuoiKy} kWh</div>
              <div className="font-medium">Sử dụng: {soDien} kWh</div>
            </div>
            <div className="font-medium text-cyan-600">💧 Nước:</div>
            <div className="ml-2">
              <div>Ban đầu: {chiSoNuocBanDau} m³</div>
              <div>Cuối kỳ: {chiSoNuocCuoiKy} m³</div>
              <div className="font-medium">Sử dụng: {soNuoc} m³</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "trangThai",
      header: "Trạng thái",
      cell: ({ row }) => {
        return getStatusBadge(row.getValue("trangThai"));
      },
    },
    {
      accessorKey: "hanThanhToan",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Hạn thanh toán
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = new Date(row.getValue("hanThanhToan"));
        const isOverdue = date < new Date();
        return (
          <div className={`text-sm ${isOverdue ? 'text-red-600' : ''}`}>
            {date.toLocaleDateString('vi-VN')}
          </div>
        );
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const hoaDon = row.original;

        return (
          <div className="flex justify-end gap-1">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onView(hoaDon)}
              className="h-8 w-8 p-0"
              title="Xem chi tiết"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onDownload(hoaDon)}
              className="h-8 w-8 p-0"
              title="Tải xuống HTML"
            >
              <Download className="h-4 w-4" />
            </Button>
            {onScreenshot && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onScreenshot(hoaDon)}
                className="h-8 w-8 p-0"
                title="Chụp ảnh & Xuất PDF"
              >
                <Camera className="h-4 w-4" />
              </Button>
            )}
            {onShare && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onShare(hoaDon)}
                className="h-8 w-8 p-0"
                title="Copy link cho khách hàng"
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onEdit(hoaDon)}
              className="h-8 w-8 p-0"
              title="Chỉnh sửa"
            >
              <Edit className="h-4 w-4" />
            </Button>
            {hoaDon.conLai > 0 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onPayment && onPayment(hoaDon)}
                className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                title="Tạo thanh toán"
              >
                <CreditCard className="h-4 w-4" />
              </Button>
            )}
            <DeleteConfirmPopover
              onConfirm={() => onDelete(hoaDon._id!)}
              title="Xóa hóa đơn"
              description={`Bạn có chắc chắn muốn xóa hóa đơn ${hoaDon.maHoaDon}? Tất cả dữ liệu liên quan sẽ bị mất và không thể khôi phục.`}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            />
          </div>
        );
      },
    },
  ];
}

export function HoaDonDataTable({
  data,
  phongList,
  khachThueList,
  onView,
  onDownload,
  onScreenshot,
  onShare,
  onEdit,
  onDelete,
  onDeleteMultiple,
  onPayment,
}: HoaDonDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  const columns = React.useMemo(
    () => createColumns(phongList, khachThueList, onView, onDownload, onScreenshot || (() => {}), onEdit, onDelete, onShare, onPayment),
    [phongList, khachThueList, onView, onDownload, onScreenshot, onEdit, onDelete, onShare, onPayment]
  );

  const table = useReactTable({ autoResetPageIndex: false,
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  const handleDeleteSelected = () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const selectedIds = selectedRows.map(row => row.original._id).filter(Boolean) as string[];
    
    if (selectedIds.length > 0) {
      onDeleteMultiple(selectedIds);
      setRowSelection({});
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Lọc theo mã hóa đơn..."
            value={(table.getColumn("maHoaDon")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("maHoaDon")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
          {table.getFilteredSelectedRowModel().rows.length > 0 && (() => {
            const selectedCount = table.getFilteredSelectedRowModel().rows.length;
            return (
              <DeleteConfirmPopover
                onConfirm={handleDeleteSelected}
                title="Xóa nhiều hóa đơn"
                description={`Bạn có chắc chắn muốn xóa ${selectedCount} hóa đơn đã chọn? Tất cả dữ liệu liên quan sẽ bị mất và không thể khôi phục.`}
                buttonVariant="destructive"
                buttonSize="sm"
                iconOnly={false}
                className="h-8"
              >
                <Trash className="mr-2 h-4 w-4" />
                Xóa ({selectedCount})
              </DeleteConfirmPopover>
            );
          })()}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              Cột <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
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
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
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
                  Không có hóa đơn nào.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} trong{" "}
          {table.getFilteredRowModel().rows.length} hàng được chọn.
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Hàng mỗi trang</p>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value))
              }}
              className="h-8 rounded border border-input bg-background px-2 text-sm"
            >
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Trang {table.getState().pagination.pageIndex + 1} trong{" "}
            {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="h-8 w-8 p-0"
            >
              <span className="sr-only">Trang đầu</span>
              ⟪
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Sau
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="h-8 w-8 p-0"
            >
              <span className="sr-only">Trang cuối</span>
              ⟫
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

