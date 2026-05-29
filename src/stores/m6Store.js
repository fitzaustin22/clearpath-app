import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Empty foundation scaffold (Phase 0a). Tool slices + actions accrue per build phase.
export const useM6Store = create(
  persist(
    () => ({}),
    {
      name: 'clearpath-m6',
      storage: createJSONStorage(() => localStorage),
      version: 0,
    },
  ),
);

export default useM6Store;
