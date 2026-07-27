import React from 'react';
import { cn } from '../utils';
import { ModernSelect } from './ModernSelect';

export interface FilterChipItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface FilterChipsProps {
  items: FilterChipItem[];
  activeId: string;
  onChange: (id: string) => void;
  primaryColor?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const FilterChips: React.FC<FilterChipsProps> = ({
  items,
  activeId,
  onChange,
  primaryColor,
  className,
  size = 'md'
}) => {
  const selectOptions = items.map(item => ({
    value: item.id,
    label: item.badge !== undefined && item.badge !== null ? `${item.label} (${item.badge})` : item.label
  }));

  return (
    <div className={cn("w-full", className)}>
      {/* Mobile View: ModernSelect Custom Floating Dropdown */}
      <div className="sm:hidden w-full">
        <ModernSelect
          value={activeId}
          onChange={onChange}
          options={selectOptions}
          className="w-full h-11 font-bold text-xs"
        />
      </div>

      {/* Desktop View: Horizontal Chips */}
      <div className="hidden sm:flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5 flex-nowrap w-full">
        {items.map((item) => {
          const isActive = activeId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={cn(
                "flex items-center justify-center gap-2 transition-all border whitespace-nowrap shrink-0 cursor-pointer active:scale-95",
                size === 'sm'
                  ? "px-3 py-1.5 rounded-lg text-xs font-bold"
                  : "px-4 py-2 rounded-xl text-xs font-bold",
                isActive
                  ? "text-white border-transparent shadow-md shadow-indigo-600/20"
                  : "bg-white dark:bg-white/5 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/10"
              )}
              style={isActive ? { background: primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' } : undefined}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge !== null && (
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded-full text-[10px] font-extrabold transition-colors",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
