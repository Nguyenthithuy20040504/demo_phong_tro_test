/**
 * Xóa tất cả dashboard cache trong sessionStorage
 * 
 * Gọi hàm này sau khi:
 * - Tạo mới/sửa/xóa hợp đồng
 * - Tạo mới/sửa/xóa hóa đơn
 * - Tạo mới/sửa/xóa phòng
 * - Tạo mới/sửa/xóa khách thuê
 * - Bất kỳ mutation nào thay đổi data dashboard
 * 
 * Cache key format: `userId_buildingId_key` (ví dụ: "abc123_all_hop-dong-data")
 */
export function clearAllDashboardCaches() {
  try {
    const allKeys = Object.keys(sessionStorage);
    const cacheKeywords = [
      'hop-dong-data',
      'hoa-don-data', 
      'phong-data',
      'khach-thue-data',
      'toa-nha-data',
      'thanh-toan-data',
      'su-co-data',
      'tai-khoan-data',
    ];
    
    allKeys.forEach(key => {
      if (cacheKeywords.some(keyword => key.includes(keyword))) {
        sessionStorage.removeItem(key);
      }
    });
    
    // Cũng xóa dashboard stats cache trong localStorage
    localStorage.removeItem('dashboard_stats_cache');
    
    console.log('[Cache] ✅ Cleared all dashboard caches');
  } catch (e) {
    console.error('[Cache] Error clearing caches:', e);
  }
}

/**
 * Dispatch event để các trang khác biết data đã thay đổi
 * Các trang đang mở sẽ tự động refresh khi nghe event này
 */
export function notifyDataChange(entity: 'hop-dong' | 'hoa-don' | 'phong' | 'khach-thue' | 'su-co') {
  clearAllDashboardCaches();
  window.dispatchEvent(new CustomEvent('dataChange', { detail: { entity } }));
}
