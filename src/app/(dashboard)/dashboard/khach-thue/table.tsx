"use client"

import * as React from "react"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  Edit,
  Trash2,
  Eye,
  Phone,
  Mail,
  MapPin,
  GripVertical,
  MoreVertical,
  Columns,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  User,
  Users,
  CreditCard,
  Calendar,
  Search,
  Home,
  Building2,
  Key,
  Check,
  X,
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import type { KhachThue } from '@/types'

/**
 * Editorial Status Indicator - Refined Glassmorphism Badge
 */
const StatusIndicator = ({ status }: { status: string }) => {
  const configs: Record<string, { label: string, color: string, dot: string }> = {
    dangThue: { label: 'Đang thuê', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', dot: 'bg-blue-500' },
    daTraPhong: { label: 'Đã trả', color: 'bg-slate-500/10 text-slate-500 border-slate-500/20', dot: 'bg-slate-400' },
    chuaThue: { label: 'Chờ xử lý', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', dot: 'bg-amber-500' },
  }

  const config = configs[status] || { label: status, color: 'bg-gray-500/10 text-gray-500 border-gray-500/20', dot: 'bg-gray-400' }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${config.color} backdrop-blur-sm transition-all duration-300`}>
      <span className={`size-1.5 rounded-full ${config.dot} animate-pulse`} />
      <span className="text-[10px] font-bold uppercase tracking-widest">{config.label}</span>
    </div>
  )
}

// Create a separate component for the drag handle
function DragHandle({ id }: { id: string }) {
  const { attributes, listeners } = useSortable({
    id,
  })

  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="text-muted-foreground/30 size-7 hover:bg-transparent hover:text-primary transition-colors"
    >
      <GripVertical className="size-3.5" />
      <span className="sr-only">Kéo để sắp xếp</span>
    </Button>
  )
}

type KhachThueTableProps = {
  onView?: (khachThue: KhachThue) => void
  onEdit: (khachThue: KhachThue) => void
  onDelete: (id: string) => void
  actionLoading: string | null
}

const createColumns = (props: KhachThueTableProps): ColumnDef<KhachThue>[] => [
  {
    id: "drag",
    header: () => null,
    cell: ({ row }) => <DragHandle id={row.original._id!} />,
    enableHiding: false,
  },
  {
    accessorKey: "hoTen",
    header: "Khách thuê",
    cell: ({ row }) => (
      <div className="flex items-center gap-3 py-1">
        <div className="size-10 rounded-xl bg-gradient-to-br from-primary/10 to-transparent flex items-center justify-center border border-primary/5">
          <User className="size-4 text-primary/60" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold tracking-tight text-foreground/90">{row.original.hoTen}</span>
          <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground/40">{row.original.gioiTinh}</span>
        </div>
      </div>
    ),
    enableHiding: false,
    enableSorting: true,
  },
  {
    accessorKey: "soDienThoai",
    header: "Liên hệ",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
           <div className="size-1.5 rounded-full bg-emerald-500/40" />
           <span className="text-sm font-mono font-medium tracking-tight whitespace-nowrap">{row.original.soDienThoai}</span>
        </div>
        {row.original.email && (
           <span className="text-[10px] text-muted-foreground/60 pl-3.5 max-w-[150px] truncate">{row.original.email}</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "cccd",
    header: "Định danh",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <div className="flex items-center gap-2 group">
          <CreditCard className="size-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
          <span className="font-mono text-sm tracking-tighter font-semibold opacity-70">{row.original.cccd}</span>
        </div>
        <span className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest pl-5 mt-0.5">National ID</span>
      </div>
    ),
  },
  {
    accessorKey: "phongDangThue",
    header: "Phòng đang thuê",
    cell: ({ row }) => {
      const khachThue = row.original as any;
      const hopDong = khachThue.hopDongHienTai;
      
      if (!hopDong || !hopDong.phong) {
        return (
          <div className="flex items-center gap-2 text-muted-foreground/30 italic">
            <Home className="size-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Chưa có phòng</span>
          </div>
        );
      }
      
      const phong = hopDong.phong;
      const toaNha = phong.toaNha;
      
      return (
        <div className="relative group">
           <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-emerald-500/5 flex items-center justify-center border border-emerald-500/10 group-hover:bg-emerald-500/10 transition-colors">
                 <Home className="size-3.5 text-emerald-600/60" />
              </div>
              <div className="flex flex-col">
                 <span className="text-sm font-bold tracking-tight text-emerald-600/80">{phong.maPhong}</span>
                 {toaNha && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 truncate max-w-[120px]">
                       {toaNha.tenToaNha}
                    </span>
                 )}
              </div>
           </div>
        </div>
      );
    },
  },
  {
    accessorKey: "matKhau",
    header: "Tài khoản",
    cell: ({ row }) => {
      const khachThue = row.original as any;
      const hasPassword = !!khachThue.matKhau;
      
      return (
        <div className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-lg border transition-all duration-300 ${
           hasPassword ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-slate-500/5 border-slate-500/10 opacity-30'
        }`}>
           <Key className={`size-3 ${hasPassword ? 'text-emerald-500' : 'text-slate-500'}`} />
           <span className={`text-[9px] font-bold uppercase tracking-widest ${hasPassword ? 'text-emerald-600' : 'text-slate-500'}`}>
              {hasPassword ? 'Có mật khẩu' : 'Chưa có'}
           </span>
        </div>
      );
    },
  },
  {
    accessorKey: "trangThai",
    header: "Trạng thái",
    cell: ({ row }) => <StatusIndicator status={row.original.trangThai} />,
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="size-8 rounded-xl hover:bg-secondary/40 text-muted-foreground/40 hover:text-foreground transition-all"
            size="icon"
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 p-2 bg-background/80 backdrop-blur-2xl border-border/40 rounded-2xl shadow-premium">
          {props.onView && (
            <DropdownMenuItem 
              onClick={() => props.onView!(row.original)}
              className="rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest gap-3 focus:bg-primary/5 focus:text-primary transition-all"
            >
              <Eye className="size-4" />
              Chi tiết khách thuê
            </DropdownMenuItem>
          )}
          <DropdownMenuItem 
            onClick={() => props.onEdit(row.original)}
            className="rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest gap-3 focus:bg-primary/5 focus:text-primary transition-all"
          >
            <Edit className="size-4" />
            Sửa thông tin
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-border/10 my-1" />
          <DropdownMenuItem 
            className="rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest gap-3 text-rose-500 focus:bg-rose-500/5 focus:text-rose-600 transition-all"
            onClick={() => props.onDelete(row.original._id!)}
            disabled={props.actionLoading === `delete-${row.original._id}`}
          >
            <Trash2 className="size-4" />
            Xóa khách thuê
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    enableHiding: false,
  },
]

function DraggableRow({ row }: { row: Row<KhachThue> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original._id!,
  })

  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      className={`group relative z-0 transition-all duration-300 border-b border-border/5 hover:bg-secondary/10 data-[dragging=true]:z-10 data-[dragging=true]:opacity-50 data-[dragging=true]:scale-[1.01] data-[dragging=true]:shadow-premium`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id} className="py-4">
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}

type KhachThueDataTableProps = KhachThueTableProps & {
  data: KhachThue[]
  searchTerm?: string
  onSearchChange?: (value: string) => void
  selectedTrangThai?: string
  onTrangThaiChange?: (value: string) => void
}

export function KhachThueDataTable(props: KhachThueDataTableProps) {
  const { data: initialData, searchTerm, onSearchChange, selectedTrangThai, onTrangThaiChange, ...tableProps } = props
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
  
  const sortableId = React.useId()
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {})
  )

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data?.map(({ _id }) => _id!) || [],
    [data]
  )

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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      setData((data) => {
        const oldIndex = dataIds.indexOf(active.id)
        const newIndex = dataIds.indexOf(over.id)
        return arrayMove(data, oldIndex, newIndex)
      })
    }
  }

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-2">
        <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
          <div className="relative group flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Tìm kiếm khách thuê..."
              value={searchTerm || ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="pl-12 h-12 bg-secondary/20 border-transparent rounded-2xl focus:bg-background focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-[10px] placeholder:font-bold placeholder:uppercase placeholder:tracking-widest"
            />
          </div>
          <Select value={selectedTrangThai} onValueChange={onTrangThaiChange}>
            <SelectTrigger className="w-full sm:w-[200px] h-12 bg-secondary/20 border-transparent rounded-2xl transition-all font-bold text-[10px] uppercase tracking-widest">
              <SelectValue placeholder="Tất cả trạng thái" />
            </SelectTrigger>
            <SelectContent className="bg-background/80 backdrop-blur-2xl border-border/40 rounded-2xl">
              <SelectItem value="all" className="rounded-lg text-[10px] font-bold uppercase tracking-widest">Tất cả trạng thái</SelectItem>
              <SelectItem value="dangThue" className="rounded-lg text-[10px] font-bold uppercase tracking-widest">Đang khai thác</SelectItem>
              <SelectItem value="daTraPhong" className="rounded-lg text-[10px] font-bold uppercase tracking-widest">Đã trả phòng</SelectItem>
              <SelectItem value="chuaThue" className="rounded-lg text-[10px] font-bold uppercase tracking-widest">Chờ xử lý</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-11 px-5 rounded-2xl bg-secondary/10 border-transparent text-[10px] font-bold uppercase tracking-widest hover:bg-secondary/30 transition-all"
              >
                <Columns className="mr-2.5 h-3.5 w-3.5 opacity-40" />
                Cột hiển thị
                <ChevronDown className="ml-2.5 h-3.5 w-3.5 opacity-20" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2 bg-background/80 backdrop-blur-2xl border-border/40 rounded-2xl shadow-premium">
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
                      className="rounded-xl px-4 py-3 text-[10px] font-bold uppercase tracking-widest gap-3 transition-all"
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
      
      <div className="overflow-hidden rounded-[2rem] border border-border/40 bg-background/20">
        <DndContext
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
          sensors={sensors}
          id={sortableId}
        >
          <Table>
            <TableHeader className="bg-secondary/10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-b border-border/5 hover:bg-transparent">
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} className="h-14 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 px-6">
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
                <SortableContext
                  items={dataIds}
                  strategy={verticalListSortingStrategy}
                >
                  {table.getRowModel().rows.map((row) => (
                    <DraggableRow key={row.id} row={row} />
                  ))}
                </SortableContext>
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-40 text-center"
                  >
                    <div className="flex flex-col items-center justify-center gap-3 opacity-20">
                       <Users className="size-10 stroke-[1]" />
                       <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Không có dữ liệu</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>
      
      <div className="flex items-center justify-between px-6 pt-4">
        <div className="hidden lg:flex flex-col">
           <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1">Tổng cộng</span>
           <span className="text-xs font-bold font-mono opacity-60">
              {table.getFilteredRowModel().rows.length} NGƯỜI
           </span>
        </div>

        <div className="flex items-center gap-8">
          <div className="hidden items-center gap-4 lg:flex">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 whitespace-nowrap">Số dòng/trang</span>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value))
              }}
            >
              <SelectTrigger className="h-9 w-16 bg-secondary/10 border-transparent rounded-xl text-[10px] font-bold font-mono">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent className="bg-background/80 backdrop-blur-2xl border-border/40 rounded-xl min-w-[80px]">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`} className="text-[10px] font-bold font-mono">
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 bg-secondary/10 h-9 px-4 rounded-xl border border-border/5">
              Trang {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="size-9 rounded-xl border-transparent bg-secondary/10 hover:bg-secondary/30 transition-all p-0"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="size-9 rounded-xl border-transparent bg-secondary/10 hover:bg-secondary/30 transition-all p-0"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

