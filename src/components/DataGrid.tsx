import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Hash, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { cn } from '../utils';

// Core component types
export interface ColumnDef<T> {
  header: React.ReactNode;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
  sortable?: boolean; // Enable sorting on this column
  sortFn?: (a: T, b: T, direction: 'asc' | 'desc') => number; // Custom sort function
}

export interface SortState {
  column: string | null;
  direction: 'asc' | 'desc';
}

export interface DataGridProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  isLoading: boolean;
  keyExtractor: (item: T) => string;
  
  // Pagination
  page: number;
  limit: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  
  // UI Customizations
  onRowClick?: (item: T) => void;
  emptyStateMessage?: string;
  compact?: boolean;
}

const DataGridComponent = <T,>({
  columns,
  data,
  isLoading,
  keyExtractor,
  page,
  limit,
  totalCount,
  onPageChange,
  onLimitChange,
  onRowClick,
  emptyStateMessage = "No records found",
  compact = false
}: DataGridProps<T>) => {
  const totalPages = Math.ceil(totalCount / limit) || 1;

  // --- Sorting State ---
  const [sort, setSort] = useState<SortState>({ column: null, direction: 'asc' });

  const handleSort = (col: ColumnDef<T>) => {
    if (!col.sortable) return;
    const key = String(col.accessorKey || col.header);
    setSort(prev => ({
      column: key,
      direction: prev.column === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Client-side sort the current page data
  const sortedData = useMemo(() => {
    if (!sort.column) return data;

    const activeCol = columns.find(
      c => String(c.accessorKey || c.header) === sort.column
    );
    if (!activeCol) return data;

    return [...data].sort((a, b) => {
      // Use custom sort function if provided
      if (activeCol.sortFn) return activeCol.sortFn(a, b, sort.direction);

      const key = activeCol.accessorKey;
      if (!key) return 0;

      const valA = a[key];
      const valB = b[key];

      // Handle null/undefined
      if (valA == null && valB == null) return 0;
      if (valA == null) return sort.direction === 'asc' ? -1 : 1;
      if (valB == null) return sort.direction === 'asc' ? 1 : -1;

      // Numeric comparison
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sort.direction === 'asc' ? valA - valB : valB - valA;
      }

      // String comparison (case-insensitive)
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      const cmp = strA.localeCompare(strB);
      return sort.direction === 'asc' ? cmp : -cmp;
    });
  }, [data, sort, columns]);

  const renderSortIcon = (col: ColumnDef<T>) => {
    if (!col.sortable) return null;
    const key = String(col.accessorKey || col.header);
    const isActive = sort.column === key;

    if (!isActive) {
      return <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-60 transition-opacity" />;
    }
    return sort.direction === 'asc'
      ? <ArrowUp className="w-3 h-3 text-indigo-500" />
      : <ArrowDown className="w-3 h-3 text-indigo-500" />;
  };

  // Render Skeletons when loading
  const renderSkeletons = () => {
    return Array.from({ length: Math.min(limit, 5) }).map((_, i) => (
      <tr key={`skeleton-${i}`} className="border-b border-gray-50 dark:border-white/5 last:border-0 hover:bg-transparent">
        {columns.map((col, j) => (
          <td key={`skel-td-${j}`} className={cn("px-4 py-4", compact && "py-3", col.className)}>
            <div className="h-4 bg-gray-200 dark:bg-white/5 rounded-md w-2/3 animate-pulse"></div>
          </td>
        ))}
      </tr>
    ));
  };

  return (
    <div className="bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
              {columns.map((col, i) => (
                <th
                  key={i}
                  onClick={() => handleSort(col)}
                  className={cn(
                    "px-4 sm:px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider group",
                    compact && "py-3",
                    col.sortable && "cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors",
                    col.className
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {renderSortIcon(col)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-white/5">
            {isLoading ? (
              renderSkeletons()
            ) : sortedData.length > 0 ? (
              sortedData.map((row) => (
                <tr 
                  key={keyExtractor(row)} 
                  onClick={() => onRowClick && onRowClick(row)}
                  className={cn(
                    "hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {columns.map((col, i) => (
                    <td key={i} className={cn("px-4 sm:px-6 py-4", compact && "py-3", col.className)}>
                      {col.cell ? col.cell(row) : (col.accessorKey && row[col.accessorKey] as any)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Hash className="w-8 h-8 opacity-20" />
                    <p>{emptyStateMessage}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50 dark:bg-[#1a1a1a]/50">
        <div className="flex flex-wrap items-center gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing <span className="font-medium text-gray-900 dark:text-white">{totalCount === 0 ? 0 : Math.min((page - 1) * limit + 1, totalCount)}</span> to <span className="font-medium text-gray-900 dark:text-white">{Math.min(page * limit, totalCount)}</span> of <span className="font-medium text-gray-900 dark:text-white">{totalCount}</span> results
          </p>
          {onLimitChange && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="text-xs">Show</span>
              <select
                value={limit}
                onChange={(e) => onLimitChange(Number(e.target.value))}
                className="px-2.5 py-1 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-250 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                <option value={10}>10 rows</option>
                <option value={20}>20 rows</option>
                <option value={50}>50 rows</option>
              </select>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1 || isLoading}
            className="p-2 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center px-3 text-sm font-medium text-gray-700 dark:text-gray-300">
            Page {page} of {totalPages}
          </div>

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages || isLoading || totalCount === 0}
            className="p-2 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const DataGrid = React.memo(DataGridComponent) as <T>(props: DataGridProps<T>) => React.ReactElement;
