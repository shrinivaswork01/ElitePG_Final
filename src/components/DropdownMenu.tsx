import React, { useState, useEffect, useRef } from 'react';
import { MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
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
  const [coords, setCoords] = useState({ top: 0, bottom: 0, right: 0, width: 0 });

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      
      // Default downward. Only go upward if <250px below and >250px above
      setOpenUpward(spaceBelow < 250 && rect.top > 250);
      
      setCoords({
        top: rect.top,
        bottom: rect.bottom,
        right: window.innerWidth - rect.right,
        width: rect.width
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen && 
        buttonRef.current && !buttonRef.current.contains(event.target as Node) &&
        (!menuRef.current || !menuRef.current.contains(event.target as Node))
      ) {
        setIsOpen(false);
      }
    };
    
    // Using capturing phase for scroll to catch any scrollable parent
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(prev => !prev);
  };

  return (
    <div className={cn("relative inline-block text-left", className)}>
      <button
        ref={buttonRef}
        onClick={(e) => { e.stopPropagation(); handleToggle(); }}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 dark:text-gray-400 transition-colors"
      >
        {buttonContent}
      </button>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.95, y: openUpward ? 10 : -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: openUpward ? 10 : -10 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'fixed',
                zIndex: 40,
                right: coords.right,
                ...(openUpward ? { bottom: window.innerHeight - coords.top + 8 } : { top: coords.bottom + 8 })
              }}
              className={cn(
                "w-52 rounded-xl bg-white dark:bg-[#1a1a1a] shadow-2xl ring-1 ring-black/5 border border-gray-100 dark:border-white/10 focus:outline-none overflow-hidden",
                openUpward ? "origin-bottom-right" : "origin-top-right",
                menuClassName
              )}
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
            >
              <div className="py-1 flex flex-col">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
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
      "w-full text-left px-4 py-3 text-sm flex items-center gap-3 transition-colors min-h-[44px]",
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

