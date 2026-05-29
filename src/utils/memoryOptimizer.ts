export const memoryOptimizer = {
  cleanup() {
    if (typeof window !== 'undefined' && window.gc) {
      window.gc();
    }
  },

  schedulePeriodicCleanup(intervalMs: number = 5 * 60 * 1000) {
    return setInterval(() => {
      this.cleanup();
    }, intervalMs);
  },

  cleanupOnLowMemory() {
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      const usedMemoryPercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

      if (usedMemoryPercent > 80) {
        console.warn('High memory usage detected, triggering cleanup');
        this.cleanup();
        return true;
      }
    }
    return false;
  }
};
