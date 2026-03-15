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
  Home,
  Building2,
  GripVertical,
  MoreVertical,
  Columns,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  User,
  Search,
  LayoutDashboard,
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
import type { Phong, ToaNha } from '@/types'

// Helper functions for impeccable styling
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'decimal',
  }).format(amount) + ' ₫'
}

const getStatusBadge = (status: string) => {
  const variants: Record<string, { label: string; color: string; dot: string }> = {
    trong: { label: 'Trống', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', dot: 'bg-emerald-500' },
    dangThue: { label: 'Đang thuê', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', dot: 'bg-blue-500' },
    daDat: { label: 'Đã đặt', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', dot: 'bg-amber-500' },
    baoTri: { label: 'Bảo trì', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20', dot: 'bg-rose-500' },
  }

  const config = variants[status] || { label: status, color: 'bg-slate-500/10 text-slate-600 border-slate-500/20', dot: 'bg-slate-500' }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm ${config.color}`}>
      <span className={`size-1.5 rounded-full animate-pulse ${config.dot}`} />
      {config.label}
    </div>
  )
}

function DragHandle({ id }: { id: string }) {
  const { attributes, listeners } = useSortable({ id })
  return (
    <div
      {...attributes}
      {...listeners}
      className="p-2 cursor-grab active:cursor-grabbing text-muted-foreground/20 hover:text-primary transition-colors"
    >
      <GripVertical className="size-4" />
    </div>
  )
}

const createColumns = (props: PhongTableProps): ColumnDef<Phong>[] => [
  {
    id: "drag",
    header: () => null,
    cell: ({ row }) => <DragHandle id={row.original._id!} />,
    enableHiding: false,
  },
  {
    accessorKey: "maPhong",
    header: "SỐ PHÒNG",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
         <div className="size-8 rounded-lg bg-primary/5 flex items-center justify-center border border-primary/10">
            <Home className="size-4 text-primary" />
         </div>
         <span className="font-bold text-sm tracking-tight">{row.original.maPhong}</span>
      </div>
    ),
    enableHiding: false,
  },
  {
    accessorKey: "toaNha",
    header: "TÒA NHÀ",
    cell: ({ row }) => {
        const name = typeof row.original.toaNha === 'object' ? (row.original.toaNha as any).tenToaNha : props.toaNhaList.find(t => t._id === row.original.toaNha)?.tenToaNha;
        return (
            <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-foreground/80">{name || 'N/A'}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Tầng {row.original.tang}</span>
            </div>
        )
    },
  },
  {
    accessorKey: "dienTich",
    header: "DIỆN TÍCH",
    cell: ({ row }) => (
      <span className="text-xs font-mono font-medium text-muted-foreground">
        {row.original.dienTich} m²
      </span>
    ),
  },
  {
    accessorKey: "giaThue",
    header: "GIÁ THUÊ",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-bold text-sm text-primary">
          {formatCurrency(row.original.giaThue)}
        </span>
        <span className="text-[9px] text-muted-foreground/60 uppercase tracking-tighter">Cọc: {formatCurrency(row.original.tienCoc)}</span>
      </div>
    ),
  },
  {
    accessorKey: "trangThai",
    header: "TRẠNG THÁI",
    cell: ({ row }) => getStatusBadge(row.original.trangThai),
  },
  {
    accessorKey: "nguoiThue",
    header: "NGƯỜI THUÊ",
    cell: ({ row }) => {
      const phong = row.original as any;
      const hopDong = phong.hopDongHienTai;
      
      if (!hopDong || !hopDong.khachThueId || hopDong.khachThueId.length === 0) {
        return <span className="text-[10px] italic text-muted-foreground/40 font-medium">Chưa vận hành</span>;
      }
      
      const nguoiDaiDien = hopDong.nguoiDaiDien;
      const soLuong = hopDong.khachThueId.length;
      
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="size-5 rounded-full bg-blue-500/10 flex items-center justify-center">
                <User className="size-3 text-blue-600" />
            </div>
            <span className="text-xs font-bold text-foreground/80">{nguoiDaiDien?.hoTen || 'Khách thuê'}</span>
          </div>
          {soLuong > 1 && (
            <button 
                onClick={() => props.onViewTenants?.(row.original)}
                className="text-[9px] font-bold text-blue-500/60 uppercase tracking-widest hover:text-blue-500 transition-colors pl-7"
            >
                +{soLuong - 1} người khác
            </button>
          )}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 rounded-full hover:bg-secondary/50">
            <MoreVertical className="size-4 text-muted-foreground/40" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-background/80 backdrop-blur-xl border-border/40 p-2 rounded-2xl shadow-premium">
          <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-3 py-2">Thao tác nghiệp vụ</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => props.onEdit(row.original)} className="gap-3 px-3 py-2.5 rounded-xl cursor-pointer">
            <Edit className="size-4 text-primary/60" />
            <span className="text-xs font-semibold">Hiệu chỉnh thông tin</span>
          </DropdownMenuItem>
          {row.original.anhPhong && row.original.anhPhong.length > 0 && (
            <DropdownMenuItem onClick={() => props.onViewImages?.(row.original)} className="gap-3 px-3 py-2.5 rounded-xl cursor-pointer">
               <LayoutDashboard className="size-4 text-blue-500/60" />
               <span className="text-xs font-semibold text-blue-600">Thư viện hình ảnh</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator className="bg-border/40 my-1" />
          <DropdownMenuItem 
            onClick={() => props.onDelete(row.original._id!)} 
            className="gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-destructive focus:bg-destructive/5"
          >
            <Trash2 className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-widest">Xóa phòng</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]

type PhongTableProps = {
  toaNhaList: ToaNha[]
  onView?: (phong: Phong) => void
  onEdit: (phong: Phong) => void
  onDelete: (id: string) => void
  onViewImages?: (phong: Phong) => void
  onViewTenants?: (phong: Phong) => void
  canEdit?: boolean
}

function DraggableRow({ row }: { row: Row<Phong> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original._id!,
  })

  return (
    <TableRow
      ref={setNodeRef}
      data-state={row.getIsSelected() && "selected"}
      className={`group relative transition-all duration-300 border-b border-border/20 hover:bg-primary/[0.02] ${isDragging ? 'opacity-50 scale-[0.98] blur-[2px] z-50' : 'z-0'}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
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

type PhongDataTableProps = PhongTableProps & {
  data: Phong[]
  searchTerm?: string
  onSearchChange?: (value: string) => void
  selectedToaNha?: string
  onToaNhaChange?: (value: string) => void
  selectedTrangThai?: string
  onTrangThaiChange?: (value: string) => void
  allToaNhaList?: ToaNha[]
}

export function PhongDataTable(props: PhongDataTableProps) {
  const { 
    data: initialData, 
    searchTerm, 
    onSearchChange, 
    selectedToaNha, 
    onToaNhaChange, 
    selectedTrangThai, 
    onTrangThaiChange, 
    allToaNhaList, 
    ...tableProps 
  } = props
  
  const [data, setData] = React.useState(() => initialData)
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [sorting, setSorting] = React.useState<SortingState>([])
  
  React.useEffect(() => {
    setData(initialData)
  }, [initialData])
  
  const columns = React.useMemo(() => createColumns(tableProps), [tableProps])
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
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
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
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
    <div className="w-full space-y-8">
      <div className="flex flex-col md:flex-row items-end justify-between gap-6 pb-4 border-b border-border/20">
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div className="relative group flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Tìm kiếm mã phòng, ghi chú..."
              value={searchTerm || ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="pl-11 h-12 bg-secondary/20 border-transparent rounded-2xl focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
            />
          </div>
          
          <Select value={selectedToaNha} onValueChange={onToaNhaChange}>
            <SelectTrigger className="w-full md:w-48 h-12 rounded-2xl bg-secondary/20 border-transparent text-xs font-bold uppercase tracking-widest text-muted-foreground/80 hover:bg-secondary/40 transition-all">
               <SelectValue placeholder="Toàn bộ Tòa nhà" />
            </SelectTrigger>
            <SelectContent className="bg-background/80 backdrop-blur-xl border-border/40 rounded-2xl p-2">
              <SelectItem value="all" className="rounded-xl text-xs font-bold uppercase tracking-widest">Toàn bộ Tòa nhà</SelectItem>
              {allToaNhaList?.map((toaNha) => (
                <SelectItem key={toaNha._id} value={toaNha._id!} className="rounded-xl text-xs font-medium">
                  {toaNha.tenToaNha}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedTrangThai} onValueChange={onTrangThaiChange}>
            <SelectTrigger className="w-full md:w-40 h-12 rounded-2xl bg-secondary/20 border-transparent text-xs font-bold uppercase tracking-widest text-muted-foreground/80 hover:bg-secondary/40 transition-all">
               <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent className="bg-background/80 backdrop-blur-xl border-border/40 rounded-2xl p-2">
              <SelectItem value="all" className="rounded-xl text-xs font-bold uppercase tracking-widest">Tất cả</SelectItem>
              <SelectItem value="trong" className="rounded-xl text-xs font-bold uppercase tracking-widest text-emerald-600">Trống</SelectItem>
              <SelectItem value="daDat" className="rounded-xl text-xs font-bold uppercase tracking-widest text-amber-600">Đã đặt</SelectItem>
              <SelectItem value="dangThue" className="rounded-xl text-xs font-bold uppercase tracking-widest text-blue-600">Đang thuê</SelectItem>
              <SelectItem value="baoTri" className="rounded-xl text-xs font-bold uppercase tracking-widest text-rose-600">Bảo trì</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">Tổng số phòng: {table.getFilteredRowModel().rows.length}</span>
            <div className="h-4 w-px bg-border/40 mx-2" />
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-10 rounded-2xl bg-secondary/20 hover:bg-secondary/40">
                    <Columns className="size-4 text-muted-foreground" />
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-background/80 backdrop-blur-xl border-border/40 p-2 rounded-2xl">
                    <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-3 py-2">Cấu hình hiển thị</DropdownMenuLabel>
                    {table
                        .getAllColumns()
                        .filter(c => typeof c.accessorFn !== "undefined" && c.getCanHide())
                        .map(column => (
                            <DropdownMenuCheckboxItem
                                key={column.id}
                                className="rounded-xl capitalize text-xs font-medium px-3 py-2"
                                checked={column.getIsVisible()}
                                onCheckedChange={v => column.toggleVisibility(!!v)}
                            >
                                {column.id}
                            </DropdownMenuCheckboxItem>
                        ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
      
      <div className="relative group">
        <DndContext
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
          sensors={sensors}
        >
          <Table>
            <TableHeader className="bg-transparent border-none">
              {table.getHeaderGroups().map((group) => (
                <TableRow key={group.id} className="hover:bg-transparent border-none">
                  {group.headers.map((header) => (
                    <TableHead key={header.id} className="h-12 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className="border-none">
              {table.getRowModel().rows?.length ? (
                <SortableContext items={dataIds} strategy={verticalListSortingStrategy}>
                  {table.getRowModel().rows.map((row) => (
                    <DraggableRow key={row.id} row={row} />
                  ))}
                </SortableContext>
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-[400px] text-center">
                    <div className="flex flex-col items-center justify-center gap-4 opacity-40">
                         <div className="size-16 rounded-full bg-secondary/20 flex items-center justify-center">
                            <Home className="size-8" />
                         </div>
                         <span className="text-xs font-bold uppercase tracking-widest">Không có dữ liệu phòng</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>
      
      <div className="flex items-center justify-between pt-8">
        <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Trang {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}</span>
            <div className="flex items-center gap-1.5">
                {[10, 20, 50].map((size) => (
                    <button
                        key={size}
                        onClick={() => table.setPageSize(size)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${table.getState().pagination.pageSize === size ? 'bg-primary text-primary-foreground shadow-premium' : 'bg-secondary hover:bg-secondary/80 text-muted-foreground'}`}
                    >
                        {size}
                    </button>
                ))}
            </div>
        </div>

        <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="size-10 rounded-full border-border/40 hover:bg-primary/5 group"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-10 rounded-full border-border/40 hover:bg-primary/5 group"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Button>
        </div>
      </div>
    </div>
  )
}

