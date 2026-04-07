import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '../utils';
import { motion, AnimatePresence } from 'motion/react';

interface Option {
  id: string;
  label: string;
  subLabel?: string;
}

interface MultiSelectProps {
  options: Option[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  className?: string;
}

export const MultiSelect = ({
  options,
  selectedIds,
  onChange,
  placeholder = 'Select options...',
  className
}: MultiSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(i => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    onChange(options.map(o => o.id));
  };

  const deselectAll = () => {
    onChange([]);
  };

  const selectedOptions = options.filter(o => selectedIds.includes(o.id));

  return (
    <div className={cn("relative w-full sm:w-64", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-2xl text-sm font-bold transition-all hover:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm",
          isOpen && "border-indigo-500 ring-2 ring-indigo-500/20"
        )}
      >
        <div className="flex-1 flex flex-wrap gap-1 items-center overflow-hidden">
          {selectedOptions.length === 0 ? (
            <span className="text-gray-400 font-medium">{placeholder}</span>
          ) : selectedOptions.length === options.length ? (
            <span className="text-indigo-600 dark:text-indigo-400">All Selected</span>
          ) : (
            <div className="flex gap-1 overflow-hidden truncate">
               <span className="text-indigo-600 dark:text-indigo-400 truncate">
                 {selectedOptions[0].label}
               </span>
               {selectedOptions.length > 1 && (
                 <span className="bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded-lg text-[10px] text-indigo-600 dark:text-indigo-400 shrink-0">
                   +{selectedOptions.length - 1}
                 </span>
               )}
            </div>
          )}
        </div>
        <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute z-50 mt-2 w-full min-w-[240px] bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-[2rem] shadow-2xl overflow-hidden backdrop-blur-md"
          >
            <div className="p-3 border-b border-gray-100 dark:border-white/5 flex justify-between gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="flex-1 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all border border-transparent hover:border-indigo-100 dark:hover:border-indigo-500/20"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={deselectAll}
                className="flex-1 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 transition-all border border-transparent hover:border-rose-100 dark:hover:border-rose-500/20"
              >
                Clear
              </button>
            </div>
            
            <div className="max-h-[300px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {options.map((option) => {
                const isSelected = selectedIds.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleOption(option.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-2xl transition-all text-left group",
                      isSelected 
                        ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400" 
                        : "hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400"
                    )}
                  >
                    <div>
                      <p className="text-sm font-bold uppercase tracking-tight">{option.label}</p>
                      {option.subLabel && <p className="text-[10px] font-medium opacity-60">{option.subLabel}</p>}
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform">
                        <Check className="w-3 h-3 stroke-[3px]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
