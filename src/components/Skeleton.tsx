import React from 'react';
import { cn } from '../utils';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div className={cn("animate-pulse bg-gray-200 dark:bg-white/5 rounded-xl", className)} />
  );
};

export const CardSkeleton = () => (
  <div className="bg-white dark:bg-[#111111] p-6 rounded-2xl border border-gray-100 dark:border-white/5 space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="w-10 h-10 rounded-lg" />
      <Skeleton className="w-16 h-4" />
    </div>
    <div className="space-y-2">
      <Skeleton className="w-24 h-6" />
      <Skeleton className="w-32 h-4" />
    </div>
  </div>
);

export const StatsSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    <CardSkeleton />
    <CardSkeleton />
    <CardSkeleton />
    <CardSkeleton />
  </div>
);

export const ChartSkeleton = () => (
    <div className="bg-white dark:bg-[#111111] p-6 rounded-2xl border border-gray-100 dark:border-white/5 h-[400px] flex flex-col">
        <Skeleton className="w-48 h-6 mb-6" />
        <Skeleton className="flex-1 w-full" />
    </div>
);
