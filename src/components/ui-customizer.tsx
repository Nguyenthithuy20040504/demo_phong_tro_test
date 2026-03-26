'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings, Type, Monitor, Palette } from 'lucide-react';
import { toast } from 'sonner';

export function UICustomizer() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [density, setDensity] = useState('comfortable');
  const [fontSize, setFontSize] = useState('medium');

  useEffect(() => {
    setMounted(true);
    
    // Load UI settings
    const savedUiSettings = localStorage.getItem('uiSettings');
    if (savedUiSettings) {
      try {
        const parsed = JSON.parse(savedUiSettings);
        if (parsed.density) {
          setDensity(parsed.density);
          applyDensity(parsed.density);
        }
      } catch (e) {}
    }

    // Load Font settings
    const savedFontSettings = localStorage.getItem('fontSettings');
    if (savedFontSettings) {
      try {
        const parsed = JSON.parse(savedFontSettings);
        if (parsed.fontSize) {
          setFontSize(parsed.fontSize);
          applyFontSize(parsed.fontSize);
        }
      } catch (e) {}
    }
  }, []);

  const applyDensity = (d: string) => {
    document.body.classList.remove('density-compact', 'density-comfortable', 'density-spacious');
    document.body.classList.add(`density-${d}`);
    
    const densityStyles: Record<string, Record<string, string>> = {
      'compact': {
        '--spacing-base': '0.5rem',
        '--padding-base': '0.75rem',
        '--gap-base': '0.5rem'
      },
      'comfortable': {
        '--spacing-base': '1rem',
        '--padding-base': '1rem',
        '--gap-base': '1rem'
      },
      'spacious': {
        '--spacing-base': '1.5rem',
        '--padding-base': '1.5rem',
        '--gap-base': '1.5rem'
      }
    };
    
    Object.entries(densityStyles[d]).forEach(([property, value]) => {
      document.documentElement.style.setProperty(property, value);
    });
  };

  const applyFontSize = (size: string) => {
    const fontSizeMap: Record<string, string> = {
      'small': '14px',
      'medium': '16px', 
      'large': '18px',
      'extra-large': '20px'
    };
    document.documentElement.style.setProperty('--font-size-base', fontSizeMap[size]);
  };

  const handleDensityChange = (d: string) => {
    setDensity(d);
    applyDensity(d);
    localStorage.setItem('uiSettings', JSON.stringify({ theme, density: d }));
    toast.success('Đã điều chỉnh mật độ hiển thị!');
  };

  const handleFontSizeChange = (size: string) => {
    setFontSize(size);
    applyFontSize(size);
    const savedFont = JSON.parse(localStorage.getItem('fontSettings') || '{}');
    localStorage.setItem('fontSettings', JSON.stringify({ ...savedFont, fontSize: size }));
    toast.success('Đã thay đổi cỡ chữ hệ thống!');
  };

  if (!mounted) return null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted relative">
          <Settings className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[300px] sm:w-[400px]">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Cá nhân hóa giao diện
          </SheetTitle>
          <SheetDescription>
            Tùy chỉnh trải nghiệm của bạn trên mọi thiết bị
          </SheetDescription>
        </SheetHeader>
        
        <div className="space-y-8 py-6">
          {/* Theme Section */}
          <div className="space-y-4">
            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
              <Monitor className="h-3 w-3" />
              Chế độ màu sắc
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'light', label: 'Sáng' },
                { id: 'dark', label: 'Tối' },
                { id: 'system', label: 'Auto' }
              ].map((t) => (
                <Button 
                  key={t.id}
                  variant={theme === t.id ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => setTheme(t.id)}
                  className="text-xs rounded-xl h-12 flex flex-col items-center justify-center gap-1 transition-all"
                >
                  <span className="font-semibold">{t.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Density Section */}
          <div className="space-y-4">
            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
              <Settings className="h-3 w-3" />
              Mật độ hiển thị
            </Label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'compact', label: 'Chật (Compact)', desc: 'Tiết kiệm không gian' },
                { id: 'comfortable', label: 'Thoải mái (Comfortable)', desc: 'Cân bằng, dễ nhìn' },
                { id: 'spacious', label: 'Rộng rãi (Spacious)', desc: 'Nhiều khoảng trống' }
              ].map((d) => (
                <Button
                  key={d.id}
                  variant={density === d.id ? 'secondary' : 'ghost'}
                  className={`justify-start h-auto py-3 px-4 rounded-xl border ${density === d.id ? 'border-primary bg-primary/5' : 'border-transparent'}`}
                  onClick={() => handleDensityChange(d.id)}
                >
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="text-sm font-semibold">{d.label}</span>
                    <span className="text-[10px] text-muted-foreground">{d.desc}</span>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Font Size Section */}
          <div className="space-y-4">
            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
              <Type className="h-3 w-3" />
              Cỡ chữ hệ thống
            </Label>
            <Select value={fontSize} onValueChange={handleFontSizeChange}>
              <SelectTrigger className="rounded-xl h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Nhỏ</SelectItem>
                <SelectItem value="medium">Trung bình</SelectItem>
                <SelectItem value="large">Lớn</SelectItem>
                <SelectItem value="extra-large">Rất lớn</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <p className="text-[10px] text-center text-muted-foreground">
            Cài đặt sẽ được đồng bộ trên thiết bị hiện tại của bạn.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
