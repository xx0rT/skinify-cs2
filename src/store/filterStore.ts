import { create } from 'zustand';

interface FilterState {
  selectedCategory: string | null;
  selectedWeapon: string | null;
  priceRange: [number, number];
  searchQuery: string;
  setSelectedCategory: (category: string | null) => void;
  setSelectedWeapon: (weapon: string | null) => void;
  setPriceRange: (range: [number, number]) => void;
  setSearchQuery: (query: string) => void;
  clearFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  selectedCategory: null,
  selectedWeapon: null,
  priceRange: [0, 100000],
  searchQuery: '',
  
  setSelectedCategory: (category) => set({ 
    selectedCategory: category,
    selectedWeapon: null // Clear weapon when category changes
  }),
  
  setSelectedWeapon: (weapon) => set({ selectedWeapon: weapon }),
  
  setPriceRange: (range) => set({ priceRange: range }),
  
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  clearFilters: () => set({
    selectedCategory: null,
    selectedWeapon: null,
    priceRange: [0, 100000],
    searchQuery: ''
  })
}));