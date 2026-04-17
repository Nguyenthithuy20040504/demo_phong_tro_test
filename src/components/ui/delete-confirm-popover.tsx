'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Trash2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeleteConfirmPopoverProps {
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  buttonVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
  iconOnly?: boolean;
  children?: React.ReactNode;
}

export function DeleteConfirmPopover({
  onConfirm,
  title = 'Xác nhận xóa',
  description = 'Bạn có chắc chắn muốn xóa mục này? Hành động này không thể hoàn tác.',
  disabled = false,
  loading = false,
  className,
  buttonVariant = 'destructive',
  buttonSize = 'icon',
  iconOnly = true,
  children,
}: DeleteConfirmPopoverProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      await onConfirm();
      setOpen(false);
    } catch (error) {
      console.error('Lỗi khi xóa:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={buttonVariant}
          size={buttonSize}
          disabled={disabled || loading || isDeleting}
          className={cn(
            iconOnly && 'h-8 w-8 p-0',
            className
          )}
        >
          {loading || isDeleting ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : children ? (
            children
          ) : (
            <>
              <Trash2 className="h-4 w-4" />
              {!iconOnly && <span className="ml-2">Xóa</span>}
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-white p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            
            <div className="space-y-2">
              <DialogTitle className="text-xl font-bold text-gray-900">
                {title}
              </DialogTitle>
              <DialogDescription className="text-gray-500 leading-relaxed">
                {description}
              </DialogDescription>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isDeleting}
              className="flex-1 h-12 rounded-xl font-semibold border-gray-200 hover:bg-gray-50"
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isDeleting}
              className="flex-1 h-12 rounded-xl font-semibold shadow-lg shadow-red-100"
            >
              {isDeleting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  Đang xử lý...
                </>
              ) : (
                'Xác nhận xóa'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
