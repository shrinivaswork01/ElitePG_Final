import React from 'react';
import { Search, Filter, FileSpreadsheet } from 'lucide-react';
import { cn } from '../utils';
import { FilterChips, FilterChipItem } from './FilterChips';

export interface SearchFilterCardProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  /** Optional dropdowns or action buttons placed on the right side of Row 1 */
  rightElements?: React.ReactNode;

  /** Quick helper for Export Excel action button */
  onExportExcel?: () => void;
  exportLabel?: string;

  /** Optional mobile filter trigger button */
  showMobileFilterButton?: boolean;
  onMobileFilterClick?: () => void;

  /** Optional Row 2 filter chips */
  chips?: FilterChipItem[];
  activeChipId?: string;
  onChipChange?: (id: string) => void;
  chipSize?: 'sm' | 'md';

  primaryColor?: string;
  className?: string;

  /** Optional extra content rendered inside the card */
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
  const hasRow1 = searchValue !== undefined || rightElements || onExportExcel || showMobileFilterButton;
  const hasRow2 = (chips && chips.length > 0) || children;

  return (
    <div className={cn("bg-white dark:bg-[#111111] p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm space-y-3", className)}>
      {/* Row 1: Search (Left) + Dropdowns / Action Buttons (Right) */}
      {hasRow1 && (
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          {searchValue !== undefined && onSearchChange && (
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white outline-none"
              />
            </div>
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
            {rightElements}

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
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-white rounded-2xl text-sm font-black transition-all shadow-lg shadow-indigo-600/20 active:scale-95 hover:opacity-90 shrink-0"
                style={{ background: primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' }}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="whitespace-nowrap">{exportLabel}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Row 2: Chips Filter / Extra Children */}
      {hasRow2 && (
        <div className={cn(hasRow1 && "pt-2 border-t border-gray-100 dark:border-white/5")}>
          {chips && chips.length > 0 && activeChipId !== undefined && onChipChange && (
            <FilterChips
              items={chips}
              activeId={activeChipId}
              onChange={onChipChange}
              primaryColor={primaryColor}
              size={chipSize}
            />
          )}
          {children}
        </div>
      )}
    </div>
  );
};
