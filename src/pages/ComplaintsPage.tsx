import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Complaint, ComplaintPriority, ComplaintStatus } from '../types';
import {
  Plus,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  Search,
  Filter,
  Download,
  MoreVertical,
  ChevronRight,
  Edit2,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';

export const ComplaintsPage = () => {
  const { complaints, tenants, rooms, employees, addComplaint, updateComplaint, deleteComplaint, pgConfig, updatePGConfig } = useApp();
  const { user } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState<Complaint | null>(null);
  const [filterStatus, setFilterStatus] = useState<ComplaintStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  const [formData, setFormData] = useState<Omit<Complaint, 'id' | 'branchId'>>({
    tenantId: '',
    title: '',
    description: '',
    category: 'Other',
    priority: 'medium',
    status: 'open',
    createdAt: new Date().toISOString().split('T')[0]
  });

  const handleEditClick = (complaint: Complaint) => {
    setEditingComplaint(complaint);
    setFormData(complaint);
    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingComplaint(null);
    setFormData({
      tenantId: '',
      title: '',
      description: '',
      category: 'Other',
      priority: 'medium',
      status: 'open',
      createdAt: new Date().toISOString().split('T')[0]
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingComplaint) {
      updateComplaint(editingComplaint.id, formData);
    } else {
      const tenant = tenants.find(t => t.userId === user?.id);
      if (tenant) {
        addComplaint({
          ...formData as Omit<Complaint, 'id'>,
          tenantId: tenant.id,
        });
      }
    }
    handleCloseModal();
  };

  const filteredComplaints = complaints.filter(c => {
    const tenant = tenants.find(t => t.id === c.tenantId);
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    const isOwner = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'caretaker' || tenant?.userId === user?.id;
    return matchesSearch && matchesStatus && isOwner;
  });

  const handleDownload = () => {
    const data = filteredComplaints.map(c => {
      const tenant = tenants.find(t => t.id === c.tenantId);
      return {
        Title: c.title,
        Category: c.category,
        Status: c.status,
        Priority: c.priority,
        Tenant: tenant?.name,
        Date: c.createdAt
      };
    });
    const csvContent = "data:text/csv;charset=utf-8,"
      + ["Title,Category,Status,Priority,Tenant,Date", ...data.map(r => Object.values(r).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ElitePG_Complaints.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStatusUpdate = (id: string, status: ComplaintStatus) => {
    updateComplaint(id, { status });
  };

  const handleAssign = (id: string, employeeId: string) => {
    updateComplaint(id, { assignedTo: employeeId, status: 'assigned' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Complaints</h2>
          <p className="text-gray-500 dark:text-gray-400">Track and resolve resident issues.</p>
        </div>
        {user?.role === 'tenant' && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
          >
            <Plus className="w-5 h-5" />
            Raise Complaint
          </button>
        )}
        {user?.role === 'admin' && (
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 rounded-xl font-semibold hover:bg-gray-50 transition-all"
          >
            <Edit2 className="w-5 h-5" />
            Manage Categories
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-[#111111] p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search complaints..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <div className="flex gap-2 flex-1">
          {['all', 'open', 'assigned', 'resolved'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status as any)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all",
                filterStatus === status
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "bg-white dark:bg-[#111111] text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5"
              )}
            >
              {status?.charAt(0).toUpperCase() + status?.slice(1)}
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
        {filteredComplaints.map((complaint) => {
          const tenant = tenants.find(t => t.id === complaint.tenantId);
          const room = rooms.find(r => r.id === tenant?.roomId);
          const assignedEmployee = employees.find(e => e.id === complaint.assignedTo);

          return (
            <motion.div
              key={complaint.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-[#111111] p-4 sm:p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className={cn(
                    "p-2.5 sm:p-3 rounded-2xl shrink-0",
                    complaint.status === 'resolved' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                      complaint.status === 'assigned' ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  )}>
                    {complaint.status === 'resolved' ? <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" /> :
                      complaint.status === 'assigned' ? <Clock className="w-5 h-5 sm:w-6 sm:h-6" /> : <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={cn(
                        "px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                        complaint.priority === 'high' ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400" :
                          complaint.priority === 'medium' ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      )}>
                        {complaint.priority}
                      </span>
                      <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{complaint.category}</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">{complaint.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 sm:line-clamp-none">{complaint.description}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-[10px] sm:text-xs font-medium text-gray-400 dark:text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {tenant?.name} (Room {room?.roomNumber || 'N/A'})
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {complaint.createdAt}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 sm:justify-end">
                  {assignedEmployee ? (
                    <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 w-full sm:w-auto">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                        {assignedEmployee.name?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Assigned To</p>
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{assignedEmployee.name}</p>
                      </div>
                    </div>
                  ) : (
                    (user?.role === 'admin' || user?.role === 'manager') && (
                      <select
                        onChange={(e) => handleAssign(complaint.id, e.target.value)}
                        className="bg-gray-50 dark:bg-white/5 border-none rounded-xl text-xs font-bold px-4 py-2.5 focus:ring-2 focus:ring-indigo-500/20 w-full sm:w-auto text-gray-900 dark:text-white"
                      >
                        <option value="">Assign Employee</option>
                        {employees.map(e => (
                          <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                        ))}
                      </select>
                    )
                  )}

                  <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                    {complaint.status !== 'resolved' && (user?.role === 'admin' || user?.role === 'manager' || user?.role === 'caretaker') && (
                      <button
                        onClick={() => handleStatusUpdate(complaint.id, 'resolved')}
                        className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex-1 sm:flex-none"
                      >
                        Mark Resolved
                      </button>
                    )}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditClick(complaint)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-gray-400 dark:text-gray-500 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteComplaint(complaint.id)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
        {filteredComplaints.length === 0 && (
          <div className="p-12 text-center bg-white dark:bg-[#111111] rounded-3xl border border-dashed border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400">
            No complaints found
          </div>
        )}
      </div>

      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto border border-white/5"
            >
              <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white dark:bg-[#111111] z-10">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingComplaint ? 'Edit Complaint' : 'Raise Complaint'}
                </h3>
                <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                  <Plus className="w-6 h-6 rotate-45 text-gray-400" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Title</label>
                    <input
                      required
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                      placeholder="Brief title of the issue"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Category</label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                    >
                      {(pgConfig?.complaintCategories || ['Plumbing', 'Electrical', 'Internet', 'Cleaning', 'Other']).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Priority</label>
                    <div className="flex gap-2">
                      {['low', 'medium', 'high'].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setFormData({ ...formData, priority: p as any })}
                          className={cn(
                            "flex-1 py-2.5 rounded-xl text-xs font-bold transition-all",
                            formData.priority === p
                              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                              : "bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                          )}
                        >
                          {p?.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {editingComplaint && (user?.role === 'admin' || user?.role === 'manager') && (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Assigned To</label>
                      <select
                        value={formData.assignedTo || ''}
                        onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value, status: e.target.value ? 'assigned' : 'open' })}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                      >
                        <option value="">Unassigned</option>
                        {employees.map(e => (
                          <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Description</label>
                    <textarea
                      required
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 resize-none text-gray-900 dark:text-white"
                      placeholder="Describe the issue in detail..."
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-6 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                  >
                    {editingComplaint ? 'Update Complaint' : 'Submit Complaint'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCategoryModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto border border-white/5"
            >
              <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white dark:bg-[#111111] z-10">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Manage Categories</h3>
                <button onClick={() => setIsCategoryModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                  <Plus className="w-6 h-6 rotate-45 text-gray-400" />
                </button>
              </div>
              <div className="p-6 sm:p-8 space-y-6">
                <div className="space-y-4">
                  {pgConfig?.complaintCategories.map((cat, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{cat}</span>
                      <button
                        onClick={() => {
                          const newCats = pgConfig.complaintCategories.filter((_, i) => i !== index);
                          updatePGConfig({ complaintCategories: newCats });
                        }}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="New category name"
                    className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={() => {
                      if (!newCategory.trim()) return;
                      const currentCats = pgConfig?.complaintCategories || [];
                      if (currentCats.includes(newCategory.trim())) return;
                      updatePGConfig({ complaintCategories: [...currentCats, newCategory.trim()] });
                      setNewCategory('');
                    }}
                    className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                  >
                    Add
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
