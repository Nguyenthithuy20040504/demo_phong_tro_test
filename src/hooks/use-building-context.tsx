'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import type { ToaNha } from '@/types';

interface BuildingContextType {
  selectedBuildingId: string;
  setSelectedBuildingId: (id: string) => void;
  buildings: ToaNha[];
  isLoadingBuildings: boolean;
  selectedBuildingLabel: string;
  /** Helper: lọc mảng items theo tòa nhà đang chọn */
  filterByBuilding: <T>(items: T[], getToaNhaId: (item: T) => string | undefined) => T[];
}

const BuildingContext = createContext<BuildingContextType | null>(null);
const STORAGE_KEY = 'smartstay_selected_building';

export function BuildingProvider({ children }: { children: ReactNode }) {
  const [selectedBuildingId, setSelectedBuildingIdState] = useState<string>('all');
  const [buildings, setBuildings] = useState<ToaNha[]>([]);
  const [isLoadingBuildings, setIsLoadingBuildings] = useState(true);

  // Hydrate từ localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSelectedBuildingIdState(stored);
    } catch {}
  }, []);

  // Fetch danh sách tòa nhà 1 lần
  useEffect(() => {
    fetch('/api/toa-nha?limit=100')
      .then((r) => r.json())
      .then((r) => {
        if (r.success) setBuildings(r.data);
      })
      .catch(() => {})
      .finally(() => setIsLoadingBuildings(false));
  }, []);

  const setSelectedBuildingId = useCallback((id: string) => {
    setSelectedBuildingIdState(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch {}
  }, []);

  const selectedBuildingLabel = useMemo(() => {
    if (selectedBuildingId === 'all') return 'Tất cả tòa nhà';
    return buildings.find((t) => t._id === selectedBuildingId)?.tenToaNha || 'Tất cả tòa nhà';
  }, [selectedBuildingId, buildings]);

  const filterByBuilding = useCallback(
    <T,>(items: T[], getToaNhaId: (item: T) => string | undefined): T[] => {
      if (selectedBuildingId === 'all') return items;
      return items.filter((item) => getToaNhaId(item) === selectedBuildingId);
    },
    [selectedBuildingId],
  );

  const value = useMemo(
    () => ({
      selectedBuildingId,
      setSelectedBuildingId,
      buildings,
      isLoadingBuildings,
      selectedBuildingLabel,
      filterByBuilding,
    }),
    [selectedBuildingId, setSelectedBuildingId, buildings, isLoadingBuildings, selectedBuildingLabel, filterByBuilding],
  );

  return <BuildingContext.Provider value={value}>{children}</BuildingContext.Provider>;
}

export function useBuilding() {
  const context = useContext(BuildingContext);
  if (!context) throw new Error('useBuilding must be used within a BuildingProvider');
  return context;
}
