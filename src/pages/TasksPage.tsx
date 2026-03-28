import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Task } from '../types';
import { 
  ClipboardList, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Search, 
  X, 
  Plus, 
  MessageSquare, 
  Edit2, 
  Trash2, 
  User as UserIcon,
  Calendar,
  CheckCircle2,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';
import { format, parseISO } from 'date-fns';
import { ImageUpload } from '../components/ImageUpload';
import toast from 'react-hot-toast';

export const TasksPage = () => {
  const { user } = useAuth();
  const { tasks, addTask, updateTask, deleteTask, employees, pgConfig, updateComplaint } = useApp();
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Management State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<Omit<Task, 'id' | 'branchId'>>({
    employeeId: '',
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    dueDate: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  });

  // Completion State
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [completionComment, setCompletionComment] = useState('');
  const [completionImages, setCompletionImages] = useState<string[]>([]);

  // Image Viewer State
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const isAdminOrManager = ['admin', 'manager', 'super'].includes(user?.role || '');
  const currentUserEmployee = employees.find(e => e.userId === user?.id);
  
  const displayTasks = isAdminOrManager 
    ? tasks 
    : tasks.filter(t => t.employeeId === (currentUserEmployee?.id || ''));
  
  const filteredTasks = displayTasks.filter(t => {
    const matchesFilter = filter === 'all' ? true : t.status === filter;
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleEditClick = (task: Task) => {
    setEditingTask(task);
    setFormData({
      employeeId: task.employeeId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      createdAt: task.createdAt
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
    setFormData({
      employeeId: '',
      title: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      dueDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTask) {
      await updateTask(editingTask.id, formData);
      toast.success('Task updated successfully');
    } else {
      await addTask(formData);
      toast.success('Task assigned successfully');
    }
    handleCloseModal();
  };

  const handleDownload = () => {
    const data = filteredTasks.map(t => {
      const employee = employees.find(e => e.id === t.employeeId);
      return {
        Title: t.title,
        Description: t.description,
        Status: t.status,
        Priority: t.priority,
        Employee: employee?.name,
        DueDate: t.dueDate,
        CreatedAt: t.createdAt
      };
    });
    const csvContent = "data:text/csv;charset=utf-8,"
      + ["Title,Description,Status,Priority,Employee,DueDate,CreatedAt", ...data.map(r => Object.values(r).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ElitePG_Tasks.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isAdminOrManager ? 'Task Management' : 'My Tasks'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            {isAdminOrManager ? 'Assign and track staff tasks.' : 'View and manage your assigned tasks.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdminOrManager && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
              style={{ backgroundColor: pgConfig?.primaryColor }}
            >
              <Plus className="w-5 h-5" />
              Assign Task
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-[#111111] p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
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

      <div className="flex gap-2 overflow-x-auto pb-2">
        <div className="flex gap-2 flex-1">
          {(['all', 'pending', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold capitalize whitespace-nowrap transition-all",
                filter === f 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                  : "bg-white dark:bg-[#111111] text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5"
              )}
              style={filter === f ? { backgroundColor: pgConfig?.primaryColor } : {}}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={handleDownload}
          className="p-2.5 bg-white dark:bg-[#111111] text-gray-500 dark:text-gray-400 rounded-xl border border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors shrink-0"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredTasks.map((task) => {
          const assignedEmployee = employees.find(e => e.id === task.employeeId);
          return (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "bg-white dark:bg-[#111111] p-4 sm:p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all",
                task.status === 'completed' && "opacity-75"
              )}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-start gap-4 flex-1">
                  <div className={cn(
                    "p-3 rounded-2xl shrink-0",
                    task.status === 'completed' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  )}>
                    {task.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={cn(
                        "px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                        getPriorityColor(task.priority)
                      )}>
                        {task.priority} Priority
                      </span>
                      <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        Due: {format(parseISO(task.dueDate), 'dd MMM yyyy')}
                      </span>
                    </div>
                    <h3 className={cn("text-lg font-bold text-gray-900 dark:text-white truncate", task.status === 'completed' && "line-through text-gray-400")}>
                      {task.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{task.description}</p>
                    
                    {isAdminOrManager && (
                      <div className="flex items-center gap-2 mt-4">
                        <UserIcon className="w-3 h-3 text-gray-400" />
                        <select
                          value={task.employeeId}
                          onChange={(e) => updateTask(task.id, { employeeId: e.target.value })}
                          className="bg-transparent text-[10px] font-bold text-gray-400 uppercase tracking-wider border-none focus:ring-0 p-0 cursor-pointer hover:text-indigo-600 transition-colors"
                        >
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 sm:justify-end">
                  <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                    {task.status === 'pending' ? (
                      (isAdminOrManager || task.employeeId === currentUserEmployee?.id) && (
                        <button
                          onClick={() => setCompletingTask(task)}
                          className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex-1 sm:flex-none"
                          style={{ backgroundColor: pgConfig?.primaryColor }}
                        >
                          Mark Completed
                        </button>
                      )
                    ) : (
                      (isAdminOrManager || task.employeeId === currentUserEmployee?.id) && (
                        <button
                          onClick={() => updateTask(task.id, { status: 'pending' })}
                          className="px-4 py-2 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 text-xs font-bold rounded-xl hover:bg-gray-200 transition-all flex-1 sm:flex-none"
                        >
                          Reopen Task
                        </button>
                      )
                    )}

                    <div className="flex items-center gap-1">
                      {isAdminOrManager && (
                        <>
                          <button
                            onClick={() => handleEditClick(task)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-gray-400 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {task.status === 'completed' && (task.completionComment || (task.completionImages && task.completionImages.length > 0)) && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 flex flex-col sm:flex-row gap-4">
                  {task.completionComment && (
                    <div className="flex-1 p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                        <MessageSquare className="w-3 h-3" />
                        Completion Note
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{task.completionComment}</p>
                    </div>
                  )}
                  {task.completionImages && task.completionImages.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 max-w-full sm:max-w-xs">
                      {task.completionImages.map((img, i) => (
                        <button 
                          key={i} 
                          onClick={() => setViewingImage(img)}
                          className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-white/10 overflow-hidden shrink-0 border border-white/5 hover:opacity-80 transition-opacity cursor-pointer focus:outline-none"
                        >
                          <img src={img} alt="task proof" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Admin Task Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden border border-white/5"
            >
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingTask ? 'Edit Task' : 'Assign New Task'}
                </h3>
                <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Task Title</label>
                    <input
                      required
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="What needs to be done?"
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Assign To</label>
                    <select
                      required
                      value={formData.employeeId}
                      onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                    >
                      <option value="">Select Employee</option>
                      {employees.map(e => (
                        <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Due Date</label>
                    <input
                      required
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Add more details about the task..."
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white resize-none"
                      rows={4}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all font-outfit"
                  style={{ backgroundColor: pgConfig?.primaryColor }}
                >
                  {editingTask ? 'Update Task' : 'Assign Task'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                alt="Proof" 
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
