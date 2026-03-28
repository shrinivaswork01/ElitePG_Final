import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface DocumentViewerModalProps {
  url: string;
  title: string;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentViewerModal = ({ url, title, isOpen, onClose }: DocumentViewerModalProps) => {
  const [zoom, setZoom] = React.useState(1);
  const isPDF = url.toLowerCase().endsWith('.pdf') || url.includes('type=pdf');

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = title || 'document';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-5xl h-[85vh] bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/5"
          >
            {/* Header */}
            <div className="p-4 sm:px-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-white/50 dark:bg-black/20 backdrop-blur-md">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate pr-4">{title}</h3>
              <div className="flex items-center gap-2">
                {!isPDF && (
                  <div className="hidden sm:flex items-center bg-gray-100 dark:bg-white/5 rounded-xl p-1 mr-2">
                    <button onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))} className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-colors text-gray-500"><ZoomOut className="w-4 h-4" /></button>
                    <span className="px-3 text-xs font-bold text-gray-500 min-w-[60px] text-center">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(prev => Math.min(3, prev + 0.25))} className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-colors text-gray-500"><ZoomIn className="w-4 h-4" /></button>
                  </div>
                )}
                <button
                  onClick={handleDownload}
                  className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all active:scale-95"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2.5 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition-all active:scale-95"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto bg-gray-50 dark:bg-black/40 flex items-center justify-center p-4 custom-scrollbar">
              {isPDF ? (
                <iframe
                  src={`${url}#toolbar=0&navpanes=0`}
                  className="w-full h-full rounded-xl border-none"
                  title={title}
                />
              ) : (
                <div 
                  className="relative transition-transform duration-200 origin-center"
                  style={{ transform: `scale(${zoom})` }}
                >
                  <img
                    src={url}
                    alt={title}
                    className="max-w-full max-h-full rounded-xl shadow-lg border border-gray-200 dark:border-white/5"
                    draggable={false}
                  />
                </div>
              )}
            </div>
            
            {/* Footer / Mobile Zoom */}
            {!isPDF && (
              <div className="sm:hidden p-4 border-t border-gray-100 dark:border-white/5 bg-white dark:bg-black/20 flex items-center justify-center gap-4">
                <button onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))} className="p-3 bg-gray-100 dark:bg-white/5 rounded-2xl text-gray-500"><ZoomOut className="w-5 h-5" /></button>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(prev => Math.min(3, prev + 0.25))} className="p-3 bg-gray-100 dark:bg-white/5 rounded-2xl text-gray-500"><ZoomIn className="w-5 h-5" /></button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
