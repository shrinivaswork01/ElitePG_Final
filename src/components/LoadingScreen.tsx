import React from 'react';
import { motion } from 'motion/react';
import { Building2 } from 'lucide-react';

export const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#F8F9FA] dark:bg-[#0a0a0a] transition-colors duration-500">
      <div className="relative">
        {/* Animated background rings */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 bg-indigo-500 rounded-full blur-3xl -m-20"
        />
        
        {/* Logo container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative flex flex-col items-center"
        >
          <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-600/40 mb-8 relative group overflow-hidden">
             <motion.div
               animate={{
                 rotate: [0, 360],
               }}
               transition={{
                 duration: 10,
                 repeat: Infinity,
                 ease: "linear"
               }}
               className="absolute inset-0 bg-gradient-to-br from-indigo-400/20 to-transparent"
             />
             <Building2 className="w-10 h-10 relative z-10" />
          </div>
          
          <div className="text-center">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-2">
              Elite<span className="text-indigo-600">PG</span>
            </h1>
            <div className="flex items-center gap-1.5 justify-center">
              <motion.span
                animate={{
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                className="w-1.5 h-1.5 bg-indigo-600 rounded-full"
              />
              <motion.span
                animate={{
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                className="w-1.5 h-1.5 bg-indigo-600 rounded-full"
              />
              <motion.span
                animate={{
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                className="w-1.5 h-1.5 bg-indigo-600 rounded-full"
              />
            </div>
          </div>
        </motion.div>
      </div>
      
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-12 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]"
      >
        Stabilizing Systems
      </motion.p>
    </div>
  );
};
