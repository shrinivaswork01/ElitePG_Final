import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../utils';
import { Building2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FloorOccupancyProps {
  data: { name: string; occupied: number; total: number }[];
  primaryColor?: string;
}

export const FloorOccupancy: React.FC<FloorOccupancyProps> = ({ data, primaryColor = '#4F46E5' }) => {
  const navigate = useNavigate();
  return (
    <div className="bg-white dark:bg-[#0d0d0d] p-6 sm:p-8 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm h-full flex flex-col relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 blur-[100px] rounded-full" />
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Occupancy Visualization</span>
          </div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white">Floor-wise Status</h3>
        </div>
        <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-full uppercase tracking-widest">
          {data.reduce((sum, item) => sum + item.occupied, 0)} Total Occupied
        </div>
      </div>

      <div className="flex-1 space-y-7">
        {data.map((item, index) => {
          const occupancyPercentage = item.total === 0 ? 0 : Math.round((item.occupied / item.total) * 100);
          
          return (
            <motion.div 
              key={item.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group cursor-pointer"
              onClick={() => navigate('/rooms', { state: { selectedFloor: item.name.match(/\d+/)?.[0] || item.name } })}
            >
              <div className="flex justify-between items-end mb-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-indigo-500 transition-colors">
                     <span className="text-xs font-black">{item.name.match(/\d+/)?.[0] || '0'}</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{item.name}</p>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tighter">{item.occupied} of {item.total} beds filled</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded-lg inline-block mb-1",
                    occupancyPercentage > 90 
                      ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400" 
                      : occupancyPercentage > 70 
                        ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400" 
                        : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  )}>
                    {occupancyPercentage}%
                  </span>
                </div>
              </div>
              
              <div className="h-3 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden p-0.5 border border-gray-100/50 dark:border-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${occupancyPercentage}%` }}
                  transition={{ duration: 1.5, ease: "circOut", delay: 0.3 + index * 0.1 }}
                  className="h-full rounded-full transition-all relative"
                  style={{ 
                    background: `linear-gradient(to right, ${primaryColor}, #8B5CF6)`,
                    boxShadow: `0 0 15px ${primaryColor}40`
                  }}
                >
                  <div className="absolute inset-x-0 top-0 h-1/2 bg-white/20" />
                </motion.div>
              </div>
            </motion.div>
          );
        })}

        {data.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-gray-100 dark:border-white/5 rounded-3xl">
            <Users className="w-8 h-8 text-gray-300 dark:text-gray-700 mb-2" />
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500">No rooms configured yet</p>
          </div>
        )}
      </div>
    </div>
  );
};
