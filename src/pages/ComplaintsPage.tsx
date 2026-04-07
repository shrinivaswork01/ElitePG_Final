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
  User as UserIcon, 
  Search, 
  Filter, 
  Download, 
  Edit2, 
  Trash2,
  Calendar,
  Building2,
  Phone,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import toast from 'react-hot-toast';
import { ImageUpload } from '../components/ImageUpload';
import { format, parseISO } from 'date-fns';

export const ComplaintsPage = () => {
  const { complaints, tenants, rooms, employees, addComplaint, updateComplaint, deleteComplaint, pgConfig, updatePGConfig, addTask } = useApp();
  const { user } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState<Complaint | null>(null);
  const [filterStatus, setFilterStatus] = useState<ComplaintStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // Resolution State
  const [completingComplaint, setCompletingComplaint] = useState<Complaint | null>(null);
  const [resolutionComment, setResolutionComment] = useState('');
  const [resolutionImages, setResolutionImages] = useState<string[]>([]);

  const currentUserEmployee = employees.find(e => e.userId === user?.id);

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
      if (user?.role === 'tenant') {
        const tenant = tenants.find(t => t.userId === user?.id || (t.email && user?.email && t.email.toLowerCase() === user.email.toLowerCase()));
        if (tenant) {
          addComplaint({
            ...formData as Omit<Complaint, 'id'>,
            tenantId: tenant.id,
          });
        } else {
          import('react-hot-toast').then(m => m.default.error("Could not find your tenant profile. Please ask an admin to link your account."));
        }
      } else {
        if (!formData.tenantId) {
          import('react-hot-toast').then(m => m.default.error("Please select a tenant."));
          return;
        }
        addComplaint(formData as Omit<Complaint, 'id'>);
      }
    }
    handleCloseModal();
  };

  const filteredComplaints = complaints.filter(c => {
    const tenant = tenants.find(t => t.id === c.tenantId);
    const employee = employees.find(e => e.userId === user?.id);
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    
    // Visibility: Admin/Manager see all, Tenant sees their own, Staff see assigned to them
    const isAdminOrManager = ['admin', 'manager', 'super'].includes(user?.role || '');
    const isOwner = tenant?.userId === user?.id;
    const isAssigned = employee && c.assignedTo === employee.id;
    
    return matchesSearch && matchesStatus && (isAdminOrManager || isOwner || isAssigned);
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
    const complaint = complaints.find(c => c.id === id);
    if (!complaint) return;
    
    updateComplaint(id, { assignedTo: employeeId, status: 'assigned' });
    toast.success('Complaint assigned to employee');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Complaints</h2>
          <p className="text-gray-500 dark:text-gray-400">Track and resolve resident issues.</p>
        </div>
        {['admin', 'manager', 'tenant'].includes(user?.role || '') && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl font-semibold shadow-lg transition-all"
            style={{ background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)', boxShadow: `0 10px 15px -3px ${pgConfig?.primaryColor}20` }}
          >
            <Plus className="w-5 h-5" />
            Raise Complaint
          </button>
        )}
        {['admin', 'manager'].includes(user?.role || '') && (
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-white dark:hover:text-black focus:text-black transition-all"
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
                  ? "text-white shadow-lg"
                  : "bg-white dark:bg-[#111111] text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5"
              )}
              style={filterStatus === status ? { background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)', boxShadow: `0 10px 15px -3px ${pgConfig?.primaryColor}20` } : {}}
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
              className={cn(
                "bg-white dark:bg-[#111111] p-4 sm:p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all",
                complaint.status === 'resolved' && "opacity-75"
              )}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-start gap-4 flex-1">
                  <div className={cn(
                    "p-3 rounded-2xl shrink-0",
                    complaint.status === 'resolved' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                    complaint.status === 'assigned' ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  )}>
                    {complaint.status === 'resolved' ? <CheckCircle2 className="w-6 h-6" /> :
                     complaint.status === 'assigned' ? <Clock className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={cn(
                        "px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                        complaint.priority === 'high' ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400" :
                        complaint.priority === 'medium' ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      )}>
                        {complaint.priority} Priority
                      </span>
                      <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        {complaint.category} • {format(parseISO(complaint.createdAt), 'dd MMM yyyy')}
                      </span>
                    </div>
                    <h3 className={cn("text-lg font-bold text-gray-900 dark:text-white truncate", complaint.status === 'resolved' && "line-through text-gray-400")}>
                      {complaint.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{complaint.description}</p>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-[10px] sm:text-xs font-medium text-gray-400 dark:text-gray-500">
                      <span className="flex items-center gap-1">
                        <UserIcon className="w-3 h-3" />
                        {tenant?.name || 'Unknown Tenant'} (Room {room?.roomNumber || 'N/A'})
                      </span>
                      {tenant?.phone && (
                        <span className="flex items-center gap-1 text-indigo-500">
                          <Phone className="w-3 h-3" />
                          {tenant.phone}
                        </span>
                      )}
                    </div>
                    
                    {user?.role === 'admin' || user?.role === 'partner' || user?.role === 'manager' ? (
                      <div className="flex items-center gap-2 mt-4">
                        <UserIcon className="w-3 h-3 text-gray-400" />
                        <select
                          value={complaint.assignedTo || ''}
                          onChange={(e) => handleAssign(complaint.id, e.target.value)}
                          className="bg-transparent text-[10px] font-bold text-gray-400 uppercase tracking-wider border-none focus:ring-0 p-0 cursor-pointer hover:text-indigo-600 transition-colors"
                        >
                          <option value="">Unassigned</option>
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                          ))}
                        </select>
                      </div>
                    ) : assignedEmployee ? (
                      <div className="flex items-center gap-2 mt-4">
                        <UserIcon className="w-3 h-3 text-gray-400" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Assigned to: {assignedEmployee.name}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 sm:justify-end">
                  <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                    {complaint.status !== 'resolved' && (user?.role === 'admin' || user?.role === 'partner' || user?.role === 'manager' || user?.role === 'caretaker' || (currentUserEmployee?.id && complaint.assignedTo === currentUserEmployee.id)) && (
                      <button
                        onClick={() => setCompletingComplaint(complaint)}
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

              {/* Bottom section: attached images and/or resolution details */}
              {((complaint.images && complaint.images.length > 0) || (complaint.status === 'resolved' && (complaint.resolutionComment || (complaint.resolutionImages && complaint.resolutionImages.length > 0)))) && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 flex flex-col sm:flex-row gap-4">
                  {/* Left: notes/comments */}
                  <div className="flex-1 flex flex-col gap-3">
                    {complaint.status === 'resolved' && complaint.resolutionComment && (
                      <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                          <MessageSquare className="w-3 h-3" />
                          Resolution Note
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{complaint.resolutionComment}</p>
                      </div>
                    )}
                  </div>

                  {/* Right: images (attached + resolution proof) */}
                  <div className="flex flex-col gap-2 sm:max-w-xs">
                    {complaint.images && complaint.images.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Attached</p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {complaint.images.map((img, i) => (
                            <button
                              key={i}
                              onClick={() => setViewingImage(img)}
                              className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-white/10 overflow-hidden shrink-0 border border-white/5 hover:opacity-80 transition-opacity cursor-pointer focus:outline-none"
                            >
                              <img src={img} alt="attachment" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {complaint.status === 'resolved' && complaint.resolutionImages && complaint.resolutionImages.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Resolution Proof</p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
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
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}
        {filteredComplaints.length === 0 && (
          <div className="p-12 text-center bg-white dark:bg-[#111111] rounded-3xl border border-dashed border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400">
            No complaints found
          </div>
        )}
      </div>

      {/* Raise / Edit Complaint Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
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
              className="relative w-full max-w-lg bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden border border-white/5 max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between shrink-0">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingComplaint ? 'Edit Complaint' : 'Raise Complaint'}
                </h3>
                <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-6">
                <form id="complaintForm" onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Complaint Title</label>
                      <input
                        required
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Brief title of the issue"
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                      />
                    </div>
                    
                    {(user?.role === 'admin' || user?.role === 'partner' || user?.role === 'manager' || user?.role === 'caretaker') && !editingComplaint && (
                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Reporting For Tenant</label>
                        <select
                          required
                          value={formData.tenantId}
                          onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                        >
                          <option value="">Select Tenant</option>
                          {tenants.map(t => {
                            const room = rooms.find(r => r.id === t.roomId);
                            return (
                              <option key={t.id} value={t.id}>{t.name} (Room {room?.roomNumber || 'N/A'})</option>
                            );
                          })}
                        </select>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Category</label>
                      <select
                        required
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                      >
                        {(pgConfig?.complaintCategories || ['Plumbing', 'Electrical', 'Internet', 'Cleaning', 'Other']).map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
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

                    {editingComplaint && (user?.role === 'admin' || user?.role === 'partner' || user?.role === 'manager') && (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Assigned To</label>
                          <select
                            value={formData.assignedTo || ''}
                            onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                          >
                            <option value="">Unassigned</option>
                            {employees.map(e => (
                              <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Status</label>
                          <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                          >
                            <option value="open">Open</option>
                            <option value="assigned">Assigned</option>
                            <option value="resolved">Resolved</option>
                          </select>
                        </div>
                      </>
                    )}

                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Description</label>
                      <textarea
                        required
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Describe the issue in detail..."
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white resize-none"
                        rows={4}
                      />
                    </div>
                    
                    <div className="sm:col-span-2 space-y-2">
                      <ImageUpload 
                        images={formData.images || []} 
                        onChange={(imgs) => setFormData({ ...formData, images: imgs })} 
                        maxImages={3}
                        label="Attach Photos (Optional)"
                      />
                    </div>
                  </div>
                </form>
              </div>
              <div className="p-6 border-t border-gray-100 dark:border-white/5 shrink-0 bg-gray-50 dark:bg-white/5">
                <button
                  type="submit"
                  form="complaintForm"
                  className="w-full py-4 text-white rounded-2xl font-bold shadow-lg transition-all font-outfit"
                  style={{ background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)', boxShadow: `0 10px 15px -3px ${pgConfig?.primaryColor}20` }}
                >
                  {editingComplaint ? 'Update Complaint' : 'Submit Complaint'}
                </button>
              </div>
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
                      className="px-4 py-2.5 text-white rounded-xl text-sm font-bold shadow-lg transition-all"
                      style={{ background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)', boxShadow: `0 10px 15px -3px ${pgConfig?.primaryColor}20` }}
                    >
                      Add
                    </button>
                </div>
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
                        resolutionComment,
                        resolutionImages
                      });

                      setCompletingComplaint(null);
                      setResolutionComment('');
                      setResolutionImages([]);
                      toast.success('Complaint marked as resolved!');
                    }}
                    className="w-full py-4 text-white rounded-2xl font-bold shadow-lg transition-all font-outfit"
                    style={{ background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)', boxShadow: `0 10px 15px -3px ${pgConfig?.primaryColor}20` }}
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

