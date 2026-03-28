import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Task, Complaint } from '../types';
import { 
  ClipboardList, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Search, 
  X, 
  Plus,
  MessageSquare, 
  Image as ImageIcon,
  CheckCircle2
} from 'lucide-react';
import { ImageUpload } from '../components/ImageUpload';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

export const UnifiedStaffTasksPage = () => {
  const { user } = useAuth();
  const { tasks, complaints, updateTask, updateComplaint, pgConfig } = useApp();
  const [activeTab, setActiveTab] = useState<'tasks' | 'complaints'>('tasks');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'open' | 'assigned' | 'resolved'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Task Completion State
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [completionComment, setCompletionComment] = useState('');
  const [completionImages, setCompletionImages] = useState<string[]>([]);
  
  // Complaint Resolution State
  const [completingComplaint, setCompletingComplaint] = useState<Complaint | null>(null);
  const [resolutionComment, setResolutionComment] = useState('');
  const [resolutionImages, setResolutionImages] = useState<string[]>([]);
  
  // Image Viewer State
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const employeeTasks = tasks.filter(t => t.employeeId === (user?.id || ''));
  const employeeComplaints = complaints.filter(c => c.assignedTo === (user?.id || ''));

  const filteredTasks = employeeTasks.filter(t => {
    const statusFilter = filter === 'all' ? true : t.status === filter;
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchTerm.toLowerCase());
    return statusFilter && matchesSearch;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredComplaints = employeeComplaints.filter(c => {
    const statusFilter = filter === 'all' ? true : c.status === filter;
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.description.toLowerCase().includes(searchTerm.toLowerCase());
    return statusFilter && matchesSearch;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tasks & Complaints</h2>
          <p className="text-gray-500 dark:text-gray-400">View and manage your assigned work.</p>
        </div>
        
        <div className="flex p-1 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden">
          <button
            onClick={() => { setActiveTab('tasks'); setFilter('pending'); }}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
              activeTab === 'tasks' ? "bg-indigo-600 text-white shadow-lg" : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
            )}
            style={activeTab === 'tasks' ? { backgroundColor: pgConfig?.primaryColor } : {}}
          >
            <ClipboardList className="w-4 h-4" />
            Tasks ({employeeTasks.filter(t => t.status === 'pending').length})
          </button>
          <button
            onClick={() => { setActiveTab('complaints'); setFilter('assigned'); }}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
              activeTab === 'complaints' ? "bg-indigo-600 text-white shadow-lg" : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
            )}
            style={activeTab === 'complaints' ? { backgroundColor: pgConfig?.primaryColor } : {}}
          >
            <MessageSquare className="w-4 h-4" />
            Complaints ({employeeComplaints.filter(c => c.status === 'assigned').length})
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/5 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          {activeTab === 'tasks' ? (
            (['pending', 'completed', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap",
                  filter === f 
                    ? "bg-indigo-600/10 text-indigo-600 dark:text-indigo-400" 
                    : "bg-white dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-white/5"
                )}
              >
                {f}
              </button>
            ))
          ) : (
            (['assigned', 'resolved', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap",
                  filter === f 
                    ? "bg-indigo-600/10 text-indigo-600 dark:text-indigo-400" 
                    : "bg-white dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-white/5"
                )}
              >
                {f}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeTab === 'tasks' ? (
          filteredTasks.map((task) => (
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
                    className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all font-outfit"
                    style={{ backgroundColor: pgConfig?.primaryColor }}
                  >
                    Mark as Completed
                  </button>
                ) : (
                  <div className="text-center py-2 text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                    Task Completed
                  </div>
                )}
              </div>
            </motion.div>
          ))
        ) : (
          filteredComplaints.map((complaint) => (
            <motion.div
              key={complaint.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden flex flex-col transition-all",
                complaint.status === 'resolved' && "opacity-75 grayscale-[0.5]"
              )}
            >
              <div className="p-6 flex-1 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className={cn("px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase", getPriorityColor(complaint.priority))}>
                    {complaint.priority} Priority
                  </div>
                  {complaint.status === 'resolved' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Clock className="w-5 h-5 text-amber-500" />
                  )}
                </div>
                
                <div>
                  <h3 className={cn("text-lg font-bold text-gray-900 dark:text-white", complaint.status === 'resolved' && "line-through text-gray-400")}>
                    {complaint.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-3">
                    {complaint.description}
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2">
                  <MessageSquare className="w-4 h-4" />
                  Category: {complaint.category}
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/5 space-y-3">
                {complaint.status === 'assigned' ? (
                  <button
                    onClick={() => setCompletingComplaint(complaint)}
                    className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                    style={{ backgroundColor: pgConfig?.primaryColor }}
                  >
                    Mark Resolved
                  </button>
                ) : (
                  <div className="text-center py-2 text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                    Complaint Resolved
                  </div>
                )}
              </div>
              
              {complaint.status === 'resolved' && (complaint.resolutionComment || (complaint.resolutionImages && complaint.resolutionImages.length > 0)) && (
                <div className="p-4 border-t border-gray-100 dark:border-white/5 flex flex-col sm:flex-row gap-4">
                  {complaint.resolutionComment && (
                    <div className="flex-1 p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                        <MessageSquare className="w-3 h-3" />
                        Resolution Note
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{complaint.resolutionComment}</p>
                    </div>
                  )}
                  {complaint.resolutionImages && complaint.resolutionImages.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 max-w-full sm:max-w-xs">
                      {complaint.resolutionImages.map((img, i) => (
                        <button 
                          key={i} 
                          onClick={() => setViewingImage(img)}
                          className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-white/10 overflow-hidden shrink-0 border border-white/5 hover:opacity-80 transition-opacity cursor-pointer focus:outline-none"
                        >
                          <img src={img} alt="resolution proof" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Task Completion Modal (Same as in TasksPage) */}
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

                <div className="space-y-4 text-left">
                  <ImageUpload 
                    images={completionImages} 
                    onChange={setCompletionImages} 
                    maxImages={3}
                    label="Attach Images / Proof"
                  />
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
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all font-outfit"
                  style={{ backgroundColor: pgConfig?.primaryColor }}
                >
                  Verify & Complete Task
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Complaint Resolution Modal */}
      <AnimatePresence>
        {completingComplaint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCompletingComplaint(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden border border-white/5"
            >
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Resolve Complaint</h3>
                <button onClick={() => setCompletingComplaint(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center block">Add Resolution Comment</label>
                  <textarea
                    value={resolutionComment}
                    onChange={(e) => setResolutionComment(e.target.value)}
                    placeholder="Describe how it was resolved..."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white resize-none"
                    rows={4}
                  />
                </div>

                <div className="space-y-4 text-left">
                  <ImageUpload 
                    images={resolutionImages} 
                    onChange={setResolutionImages} 
                    maxImages={3}
                    label="Attach Images / Proof"
                  />
                </div>

                <button
                  onClick={() => {
                    updateComplaint(completingComplaint.id, {
                      status: 'resolved',
                      resolvedAt: new Date().toISOString().split('T')[0],
                      resolutionComment,
                      resolutionImages
                    });

                    setCompletingComplaint(null);
                    setResolutionComment('');
                    setResolutionImages([]);
                    toast.success('Complaint marked as resolved!');
                  }}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all font-outfit"
                  style={{ backgroundColor: pgConfig?.primaryColor }}
                >
                  Verify & Resolve
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Viewer Modal */}
      <AnimatePresence>
        {viewingImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingImage(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl max-h-[90vh] flex flex-col items-center justify-center"
            >
              <button 
                onClick={() => setViewingImage(null)} 
                className="absolute -top-12 right-0 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <img 
                src={viewingImage} 
                alt="Enlarged view" 
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
