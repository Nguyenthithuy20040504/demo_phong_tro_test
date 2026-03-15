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
  MapPin,
  Building2,
  GripVertical,
  MoreVertical,
  Columns,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import type { ToaNha } from '@/types'

// Helper functions
const formatAddress = (diaChi: ToaNha['diaChi']) => {
  return `${diaChi.soNha} ${diaChi.duong}, ${diaChi.phuong}, ${diaChi.quan}, ${diaChi.thanhPho}`
}

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
    </Button>
  )
}

type ToaNhaTableProps = {
  onView?: (toaNha: ToaNha) => void
  onEdit: (toaNha: ToaNha) => void
  onDelete: (id: string) => void
  canEdit?: boolean
}

const createColumns = (props: ToaNhaTableProps): ColumnDef<ToaNha>[] => [
  {
    id: "drag",
    header: () => null,
    cell: ({ row }) => <DragHandle id={row.original._id!} />,
    enableHiding: false,
  },
  {
    accessorKey: "tenToaNha",
    header: "Tòa nhà",
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5 min-w-[200px] py-1">
        <span className="font-bold text-foreground tracking-tight leading-none">{row.original.tenToaNha}</span>
        <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1 font-medium">
          <Building2 className="h-2.5 w-2.5" />
          MÃ CHUỖI: {row.original._id?.slice(-6).toUpperCase()}
        </span>
      </div>
    ),
    enableHiding: false,
  },
  {
    accessorKey: "diaChi",
    header: "Địa chỉ",
    cell: ({ row }) => (
      <div className="flex items-start gap-1.5 min-w-[280px] group">
        <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
        <span className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{formatAddress(row.original.diaChi)}</span>
      </div>
    ),
  },
  {
    accessorKey: "tongSoPhong",
    header: () => <div className="text-center font-bold tracking-widest uppercase text-[10px]">TỔNG PHÒNG</div>,
    cell: ({ row }) => (
      <div className="text-center font-bold text-base tracking-tighter">
        {row.original.tongSoPhong}
      </div>
    ),
  },
  {
    id: "trangThai",
    header: () => <div className="text-center font-bold tracking-widest uppercase text-[10px]">TÌNH TRẠNG</div>,
    cell: ({ row }) => {
      const phongTrong = (row.original as any).phongTrong || 0
      const total = row.original.tongSoPhong
      const dangThue = total - phongTrong > 0
      return (
        <div className="flex justify-center">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
            dangThue
              ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
              : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
          }`}>
            <span className={`size-1.5 rounded-full ${dangThue ? 'bg-blue-500' : 'bg-slate-400'}`} />
            {dangThue ? 'Đang thuê' : 'Chưa thuê'}
          </div>
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
          <Badge key={tienNghi} variant="outline" className="text-[9px] uppercase tracking-tighter px-1.5 py-0 bg-secondary/30 border-secondary/50 font-bold">
            {tienNghi}
          </Badge>
        ))}
        {row.original.tienNghiChung.length > 2 && (
          <span className="text-[10px] font-bold text-muted-foreground/40">+{row.original.tienNghiChung.length - 2}</span>
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
              className="hover:bg-primary/5 text-muted-foreground/40 transition-colors size-8 rounded-full"
              size="icon"
            >
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl bg-background/80 backdrop-blur-xl border-border/40 shadow-premium p-2">
            {props.onView && (
              <DropdownMenuItem onClick={() => props.onView!(row.original)} className="rounded-lg py-2 focus:bg-primary/10 transition-colors">
                <Eye className="mr-3 h-3.5 w-3.5 opacity-60" />
                <span className="text-xs font-medium">Chi tiết tòa nhà</span>
              </DropdownMenuItem>
            )}
            {props.canEdit !== false && (
              <>
                <DropdownMenuItem onClick={() => props.onEdit(row.original)} className="rounded-lg py-2 focus:bg-primary/10 transition-colors">
                  <Edit className="mr-3 h-3.5 w-3.5 opacity-60" />
                  <span className="text-xs font-medium">Sửa thông tin</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/30 m-2" />
                <DropdownMenuItem 
                  className="text-destructive rounded-lg py-2 focus:bg-destructive/10 focus:text-destructive transition-colors"
                  onClick={() => props.onDelete(row.original._id!)}
                >
                  <Trash2 className="mr-3 h-3.5 w-3.5 opacity-60" />
                  <span className="text-xs font-bold uppercase tracking-widest">Xóa tòa nhà</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
    ),
    enableHiding: false,
  },
]

function DraggableRow({ row }: { row: Row<ToaNha> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original._id!,
  })

  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      className={`relative z-0 group transition-colors duration-300 ${isDragging ? "opacity-50 !bg-primary/5" : "hover:bg-primary/5 border-border/20"}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id} className="py-4 border-b border-border/20">
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}

type ToaNhaDataTableProps = ToaNhaTableProps & {
  data: ToaNha[]
  searchTerm?: string
  onSearchChange?: (value: string) => void
}

export function ToaNhaDataTable(props: ToaNhaDataTableProps) {
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
  
  React.useEffect(() => {
    setData(initialData)
  }, [initialData])
  
  const columns = React.useMemo(() => createColumns(tableProps), [tableProps])
  
  const sortableId = React.useId()
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

  const selectedCount = table.getFilteredSelectedRowModel().rows.length

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-4">
        <div className="relative w-full sm:max-w-md group">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Tìm kiếm tòa nhà..."
            value={searchTerm || ''}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-11 h-11 bg-secondary/50 border-transparent focus:border-primary/20 focus:bg-background rounded-xl transition-all"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-11 rounded-xl border-border/40 font-bold uppercase tracking-widest text-[10px]">
                <Columns className="mr-3 h-3.5 w-3.5 opacity-40" />
                Cột hiển thị
                <ChevronDown className="ml-3 h-3 size-3 opacity-20" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 rounded-xl bg-background/80 backdrop-blur-xl border-border/40 shadow-premium p-2">
              <DropdownMenuLabel className="text-[10px] font-bold tracking-widest uppercase p-3 text-muted-foreground/60">Cột dữ liệu</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/30 m-1" />
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
                      className="capitalize m-1 rounded-lg focus:bg-primary/10"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      <span className="text-xs font-medium">{column.id}</span>
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="relative">
        <DndContext
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
          sensors={sensors}
          id={sortableId}
        >
          <Table className="border-collapse border-b-0">
            <TableHeader className="bg-transparent border-b-2 border-primary/10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent border-none">
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} colSpan={header.colSpan} className="h-14 font-bold tracking-widest uppercase text-[10px] text-muted-foreground/40">
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
            <TableBody className="**:data-[slot=table-cell]:first:w-8">
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
                    className="h-40 text-center text-muted-foreground/40 italic text-sm"
                  >
                    Chưa có tòa nhà nào phù hợp.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>
      
      <div className="flex items-center justify-between px-6 py-4 bg-secondary/20 rounded-2xl">
        <div className="text-muted-foreground/60 hidden flex-1 text-[10px] font-bold tracking-widest uppercase lg:flex">
          {selectedCount > 0 ? (
            <>Đã chọn {selectedCount} / {table.getFilteredRowModel().rows.length}</>
          ) : (
            <>Tổng cộng {table.getFilteredRowModel().rows.length} tòa nhà</>
          )}
        </div>
        <div className="flex w-full items-center gap-12 lg:w-fit">
          <div className="hidden items-center gap-3 lg:flex">
            <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/40">Số dòng/trang</span>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger className="h-9 w-16 bg-background rounded-lg border-border/40 text-[10px] font-bold">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top" className="rounded-xl border-border/40 shadow-premium">
                {[10, 20, 30].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`} className="text-xs">
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
             <Button
                variant="ghost"
                size="icon"
                className="size-9 rounded-full hover:bg-primary/10 transition-colors"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="px-4 text-[11px] font-bold tracking-widest uppercase text-primary italic">
                {table.getState().pagination.pageIndex + 1} <span className="mx-2 text-muted-foreground/30">/</span> {table.getPageCount()}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 rounded-full hover:bg-primary/10 transition-colors"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

