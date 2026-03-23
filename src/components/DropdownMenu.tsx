import React, { useState, useEffect, useRef } from 'react';
import { MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';

interface DropdownMenuProps {
  buttonContent?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  menuClassName?: string;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  buttonContent = <MoreVertical className="w-4 h-4" />,
  children,
  className,
  menuClassName,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      // Detect if we're in the bottom 40% of the viewport — open upward
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 200);
    }
    setIsOpen(prev => !prev);
  };

  return (
    <div className={cn("relative inline-block text-left", className)} ref={menuRef}>
      <button
        ref={buttonRef}
        onClick={(e) => { e.stopPropagation(); handleToggle(); }}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 dark:text-gray-400 transition-colors"
      >
        {buttonContent}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: openUpward ? 10 : -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: openUpward ? 10 : -10 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute right-0 z-[999] w-52 rounded-xl bg-white dark:bg-[#1a1a1a] shadow-xl ring-1 ring-black/5 border border-gray-100 dark:border-white/10 focus:outline-none",
              openUpward ? "bottom-full mb-2 origin-bottom-right" : "top-full mt-2 origin-top-right",
              menuClassName
            )}
            onClick={() => setIsOpen(false)}
          >
            <div className="py-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const DropdownItem = ({
  icon,
  label,
  onClick,
  className,
  danger = false
}: {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
  danger?: boolean;
}) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className={cn(
      "w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors",
      danger
        ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5",
      className
    )}
  >
    {icon && <span className="shrink-0 opacity-75">{icon}</span>}
    {label}
  </button>
);
