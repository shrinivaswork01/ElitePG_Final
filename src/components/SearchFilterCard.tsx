import React from 'react';
import { Search, Filter, FileSpreadsheet } from 'lucide-react';
import { cn } from '../utils';
import { FilterChips, FilterChipItem } from './FilterChips';

export interface SearchFilterCardProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  /** Optional dropdowns or action controls placed on the right of the Filter Bar */
  rightElements?: React.ReactNode;

  /** Helper for Export Excel button inside the Search card */
  onExportExcel?: () => void;
  exportLabel?: string;

  /** Optional mobile filter trigger button */
  showMobileFilterButton?: boolean;
  onMobileFilterClick?: () => void;

  /** Optional Filter Chips rendered in the Top Filter Bar */
  chips?: FilterChipItem[];
  activeChipId?: string;
  onChipChange?: (id: string) => void;
  chipSize?: 'sm' | 'md';

  primaryColor?: string;
  className?: string;

  /** Optional extra content rendered inside the filter bar or search card */
  children?: React.ReactNode;
}

export const SearchFilterCard: React.FC<SearchFilterCardProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  rightElements,
  onExportExcel,
  exportLabel = 'Export Excel',
  showMobileFilterButton,
  onMobileFilterClick,
  chips,
  activeChipId,
  onChipChange,
  chipSize = 'md',
  primaryColor,
  className,
  children
}) => {
  const hasFilterBar = (chips && chips.length > 0) || rightElements || children;

  return (
    <div className={cn("space-y-4 w-full", className)}>
      {/* 1. Standalone Top Filter Bar (Filter Chips on left, Dropdowns on right) */}
      {hasFilterBar && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
          {/* Left: Filter Chips */}
          {chips && chips.length > 0 && activeChipId !== undefined && onChipChange && (
            <div className="flex-1 min-w-0">
              <FilterChips
                items={chips}
                activeId={activeChipId}
                onChange={onChipChange}
                primaryColor={primaryColor}
                size={chipSize}
              />
            </div>
          )}

          {/* Right: Dropdowns / Custom controls */}
          {rightElements && (
            <div className="flex items-center gap-2 shrink-0 justify-end w-full sm:w-auto">
              {rightElements}
            </div>
          )}

          {children}
        </div>
      )}

      {/* 2. Bottom Search Card Container (Search Input on left, Export Excel on right) */}
      <div className="bg-white dark:bg-[#111111] p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm flex flex-col sm:flex-row items-center gap-4">
        {searchValue !== undefined && onSearchChange && (
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-transparent rounded-xl text-sm text-gray-900 dark:text-white outline-none input-focus-glow"
            />
          </div>
        )}

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
          {showMobileFilterButton && (
            <button
              type="button"
              onClick={onMobileFilterClick}
              className="p-2.5 bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors shrink-0 sm:hidden"
            >
              <Filter className="w-5 h-5" />
            </button>
          )}

          {onExportExcel && (
            <button
              type="button"
              onClick={onExportExcel}
              className="btn-hover flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-white rounded-2xl text-sm font-black shrink-0"
              style={{ background: primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' }}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="whitespace-nowrap">{exportLabel}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
