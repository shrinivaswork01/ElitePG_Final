import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Task } from '../types';
import { ClipboardList, CheckCircle, Clock, AlertCircle, Filter, Search, X, Plus, Upload, MessageSquare, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

export const TasksPage = () => {
  const { user } = useAuth();
  const { tasks, updateTask, pgConfig } = useApp();
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [completionComment, setCompletionComment] = useState('');
  const [completionImages, setCompletionImages] = useState<string[]>([]);
  const [imageInput, setImageInput] = useState('');

  const employeeTasks = tasks.filter(t => t.employeeId === (user?.id || ''));
  
  const filteredTasks = employeeTasks.filter(t => {
    const matchesFilter = filter === 'all' ? true : t.status === filter;
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  }).sort((a, b) => {
    if (a.status === 'pending' && b.status === 'completed') return -1;
    if (a.status === 'completed' && b.status === 'pending') return 1;
    return b.dueDate.localeCompare(a.dueDate);
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-rose-500 bg-rose-500/10';
      case 'medium': return 'text-amber-500 bg-amber-500/10';
      case 'low': return 'text-emerald-500 bg-emerald-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Tasks</h2>
          <p className="text-gray-500 dark:text-gray-400">View and manage your assigned tasks.</p>
        </div>
        <div className="flex gap-2 p-1 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
          {(['pending', 'completed', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all",
                filter === f 
                  ? "bg-indigo-600 text-white shadow-sm" 
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
              )}
              style={filter === f ? { backgroundColor: pgConfig?.primaryColor } : {}}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-[#111111] p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTasks.map((task) => (
          <motion.div
            key={task.id}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden flex flex-col transition-all",
              task.status === 'completed' && "opacity-75 grayscale-[0.5]"
            )}
          >
            <div className="p-6 flex-1 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className={cn("px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase", getPriorityColor(task.priority))}>
                  {task.priority} Priority
                </div>
                {task.status === 'completed' ? (
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Clock className="w-5 h-5 text-amber-500" />
                )}
              </div>
              
              <div>
                <h3 className={cn("text-lg font-bold text-gray-900 dark:text-white", task.status === 'completed' && "line-through text-gray-400")}>
                  {task.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-3">
                  {task.description}
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2">
                <AlertCircle className="w-4 h-4" />
                Due: {format(parseISO(task.dueDate), 'dd MMM yyyy')}
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/5 space-y-3">
              {task.status === 'pending' ? (
                <button
                  onClick={() => setCompletingTask(task)}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                  style={{ backgroundColor: pgConfig?.primaryColor }}
                >
                  Mark as Completed
                </button>
              ) : (
                <>
                  {task.completionComment && (
                    <div className="p-3 bg-gray-100 dark:bg-white/5 rounded-xl text-xs text-gray-600 dark:text-gray-400">
                      <p className="font-bold flex items-center gap-2 mb-1">
                        <MessageSquare className="w-3 h-3" />
                        Completion Note:
                      </p>
                      {task.completionComment}
                    </div>
                  )}
                  {task.completionImages && task.completionImages.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {task.completionImages.map((img, i) => (
                        <div key={i} className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-white/10 overflow-hidden shrink-0 border border-white/5">
                          <img src={img} alt="task proof" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => updateTask(task.id, { status: 'pending' })}
                    className="w-full py-2 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold hover:bg-gray-300 dark:hover:bg-white/20 transition-all"
                  >
                    Reopen Task
                  </button>
                </>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Task Completion Modal */}
      <AnimatePresence>
        {completingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCompletingTask(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden border border-white/5"
            >
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Complete Task</h3>
                <button onClick={() => setCompletingTask(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center block">Add Completion Comment</label>
                  <textarea
                    value={completionComment}
                    onChange={(e) => setCompletionComment(e.target.value)}
                    placeholder="Describe what was done..."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white resize-none"
                    rows={4}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center block">Attach Images / Proof URLs</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="Paste image URL..."
                      value={imageInput}
                      onChange={(e) => setImageInput(e.target.value)}
                      className="flex-1 px-4 py-2 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                    />
                    <button
                      onClick={() => {
                        if (imageInput) {
                          setCompletionImages([...completionImages, imageInput]);
                          setImageInput('');
                        }
                      }}
                      className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all"
                      style={{ backgroundColor: pgConfig?.primaryColor }}
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {completionImages.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {completionImages.map((img, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/5">
                          <img src={img} alt="proof" className="w-full h-full object-cover" />
                          <button
                            onClick={() => setCompletionImages(completionImages.filter((_, idx) => idx !== i))}
                            className="absolute top-0 right-0 p-1 bg-black/60 text-white hover:bg-red-600 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    updateTask(completingTask.id, {
                      status: 'completed',
                      completedAt: new Date().toISOString().split('T')[0],
                      completionComment,
                      completionImages
                    });
                    setCompletingTask(null);
                    setCompletionComment('');
                    setCompletionImages([]);
                    toast.success('Task marked as completed!');
                  }}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                  style={{ backgroundColor: pgConfig?.primaryColor }}
                >
                  Verify & Complete Task
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
