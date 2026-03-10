import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Announcement, Tenant } from '../types';
import { WHATSAPP_GROUP_URL } from '../constants';
import {
  Send,
  Users,
  MessageSquare,
  Plus,
  Trash2,
  Megaphone,
  CheckCircle2,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { Navigate } from 'react-router-dom';

export const BroadcastPage = () => {
  const { user } = useAuth();
  const { tenants, announcements, addAnnouncement, deleteAnnouncement } = useApp();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<Announcement, 'id' | 'branchId'>>({
    title: '',
    content: '',
    target: 'all',
    createdAt: new Date().toISOString().split('T')[0],
    createdBy: user?.id || 'Admin'
  });

  const [quickBroadcast, setQuickBroadcast] = useState({
    tenantId: '',
    message: ''
  });

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addAnnouncement(formData);

    // Automatically trigger WhatsApp share for new announcements
    const message = `*${formData.title}*\n\n${formData.content}`;
    sendWhatsApp(null, message);

    setIsAddModalOpen(false);
    setFormData({
      title: '',
      content: '',
      target: 'all',
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: user?.id || 'Admin'
    });
  };

  const sendWhatsApp = (phone: string | null, message: string) => {
    let whatsappUrl = '';
    const encodedMessage = encodeURIComponent(message);

    if (!phone) {
      // Use the WhatsApp global forwarder intent instead of the group link to manually preserve the explicit message body
      whatsappUrl = `https://api.whatsapp.com/send?text=${encodedMessage}`;
    } else {
      // Clean phone number and ensure it has a country code (defaulting to 91 for India if 10 digits)
      let cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length === 10) {
        cleanPhone = '91' + cleanPhone;
      }
      whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    }

    const link = document.createElement('a');
    link.href = whatsappUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBroadcast = (announcement: Announcement) => {
    const message = `*${announcement.title}*\n\n${announcement.content}`;
    sendWhatsApp(null, message);
  };

  const handleQuickBroadcast = () => {
    if (quickBroadcast.tenantId === 'all') {
      sendWhatsApp(null, quickBroadcast.message);
      setQuickBroadcast({ tenantId: '', message: '' });
      return;
    }

    const tenant = tenants.find(t => t.id === quickBroadcast.tenantId);
    if (!tenant || !quickBroadcast.message) {
      alert('Please select a tenant or "All Tenants" and enter a message.');
      return;
    }
    sendWhatsApp(tenant.phone, quickBroadcast.message);
    setQuickBroadcast({ tenantId: '', message: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Broadcast & Announcements</h2>
          <p className="text-gray-500 dark:text-gray-400">Send updates and manage property-wide notifications.</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
        >
          <Plus className="w-5 h-5" />
          New Announcement
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-indigo-600" />
            Recent Announcements
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {announcements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((announcement) => (
              <motion.div
                key={announcement.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-[#111111] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider mb-2 inline-block",
                      announcement.target === 'all' ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" :
                        announcement.target === 'active' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                          "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    )}>
                      Target: {announcement.target}
                    </span>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">{announcement.title}</h4>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Posted on {announcement.createdAt} by {announcement.createdBy}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBroadcast(announcement);
                      }}
                      className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                      title="Broadcast via WhatsApp"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteAnnouncement(announcement.id)}
                      className="p-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {announcement.content}
                </p>
              </motion.div>
            ))}
            {announcements.length === 0 && (
              <div className="p-12 text-center bg-gray-50 dark:bg-white/5 rounded-3xl border-2 border-dashed border-gray-200 dark:border-white/10">
                <Megaphone className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">No announcements yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-[#111111] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Quick Broadcast
            </h3>
            <div className="space-y-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Send a quick WhatsApp message to a specific tenant or group.
              </p>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Tenant</label>
                <select
                  value={quickBroadcast.tenantId}
                  onChange={(e) => setQuickBroadcast({ ...quickBroadcast, tenantId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Choose tenant...</option>
                  <option value="all">All Tenants (WhatsApp Group)</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.phone})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Message</label>
                <textarea
                  value={quickBroadcast.message}
                  onChange={(e) => setQuickBroadcast({ ...quickBroadcast, message: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 min-h-[100px]"
                  placeholder="Type your message here..."
                />
              </div>
              <button
                onClick={handleQuickBroadcast}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-5 h-5" />
                Send via WhatsApp
              </button>
            </div>
          </div>

          <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-600/20">
            <h4 className="font-bold mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Pro Tip
            </h4>
            <p className="text-sm text-indigo-100 leading-relaxed">
              Use WhatsApp formatting like *bold* or _italic_ to make your announcements stand out.
            </p>
          </div>
        </div>
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
              className="relative w-full max-w-md bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden border border-white/5"
            >
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">New Announcement</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                  <Plus className="w-6 h-6 rotate-45 text-gray-400" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Title</label>
                  <input
                    required
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                    placeholder="e.g. Maintenance Notice"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Target Audience</label>
                  <select
                    value={formData.target}
                    onChange={(e) => setFormData({ ...formData, target: e.target.value as any })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Tenants</option>
                    <option value="active">Active Tenants Only</option>
                    <option value="vacating">Vacating Tenants Only</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Content</label>
                  <textarea
                    required
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white min-h-[150px]"
                    placeholder="Describe the announcement..."
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-6 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                  >
                    Post Announcement
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
