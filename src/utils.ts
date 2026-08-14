import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function hexToRgba(hexStr: string, opacity: number) {
  if (!hexStr) return `rgba(79, 70, 229, ${opacity})`;
  if (hexStr.startsWith('rgb')) return hexStr;
  const hex = hexStr.replace('#', '');
  let r = 0, g = 0, b = 0;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  } else {
    return hexStr;
  }
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export const ROOM_CATEGORIES = [
  { id: 'master_bedroom', label: 'Master Bedroom', icon: '👑', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400' },
  { id: 'hall', label: 'Hall / Living Room', icon: '🛋️', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400' },
  { id: 'bedroom', label: 'Bedroom', icon: '🛏️', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:bg-indigo-500/20 dark:text-indigo-400' },
  { id: 'balcony_room', label: 'Balcony Room', icon: '🌅', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400' },
  { id: 'guest_room', label: 'Guest Room', icon: '🚪', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-400' },
];

export function getRoomCategoryMeta(category?: string) {
  if (!category) return null;
  const cat = ROOM_CATEGORIES.find(c => c.id === category || c.label.toLowerCase() === category.toLowerCase());
  if (cat) return cat;
  return { id: category, label: category, icon: '🏷️', color: 'bg-gray-500/10 text-gray-600 border-gray-500/20 dark:bg-gray-500/20 dark:text-gray-400' };
}

