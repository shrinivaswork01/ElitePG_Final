import React from 'react';
import { ChevronLeft, ChevronRight, Hash } from 'lucide-react';
import { cn } from '../utils';

// Core component types
export interface ColumnDef<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
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
  
  // UI Customizations
  onRowClick?: (item: T) => void;
  emptyStateMessage?: string;
  compact?: boolean;
}

export function DataGrid<T>({
  columns,
  data,
  isLoading,
  keyExtractor,
  page,
  limit,
  totalCount,
  onPageChange,
  onRowClick,
  emptyStateMessage = "No records found",
  compact = false
}: DataGridProps<T>) {
  const totalPages = Math.ceil(totalCount / limit) || 1;

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
                <th key={i} className={cn(
                  "px-4 sm:px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider",
                  compact && "py-3",
                  col.className
                )}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-white/5">
            {isLoading ? (
              renderSkeletons()
            ) : data.length > 0 ? (
              data.map((row) => (
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
      <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-[#1a1a1a]/50">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Showing <span className="font-medium text-gray-900 dark:text-white">{Math.min((page - 1) * limit + 1, totalCount)}</span> to <span className="font-medium text-gray-900 dark:text-white">{Math.min(page * limit, totalCount)}</span> of <span className="font-medium text-gray-900 dark:text-white">{totalCount}</span> results
        </p>
        
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
}
