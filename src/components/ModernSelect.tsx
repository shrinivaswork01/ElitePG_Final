import React, { useState } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import { cn } from '../utils';

interface ModernSelectOption {
  value: string;
  label: string;
}

interface ModernSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: ModernSelectOption[];
  placeholder?: string;
  className?: string;
  searchPlaceholder?: string;
  showSearch?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export const ModernSelect: React.FC<ModernSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className,
  searchPlaceholder = 'Search...',
  showSearch,
  disabled = false,
  style
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Resolve current active option
  const selectedOpt = options.find(o => o.value === value) || options[0];

  // Auto-enable search if there are more than 8 options and showSearch is not explicitly false
  const shouldShowSearch = showSearch !== undefined ? showSearch : options.length > 8;

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full" style={style}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-left text-gray-900 dark:text-white flex items-center justify-between shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
      >
        <span className="truncate">{selectedOpt?.label || placeholder}</span>
        <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2" />
      </button>

      {/* Outside click blocker */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}

      {/* Dropdown Menu Card */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden flex flex-col min-w-[200px]">
          {/* Optional Search Bar */}
          {shouldShowSearch && (
            <div className="relative p-2 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-[#202020] border border-gray-200 dark:border-white/10 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Options Container */}
          <div className="max-h-60 overflow-y-auto divide-y divide-gray-50 dark:divide-white/[0.02]">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={cn(
                    "w-full px-4 py-2.5 text-left text-xs transition-colors flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5",
                    value === opt.value
                      ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold"
                      : "text-gray-700 dark:text-gray-300"
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {value === opt.value && (
                    <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 ml-2" />
                  )}
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-xs text-gray-400 text-center">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
