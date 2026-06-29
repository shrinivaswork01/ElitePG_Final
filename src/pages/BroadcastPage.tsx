import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Announcement, Tenant, WhatsAppTemplate, WhatsAppTemplateCategory } from '../types';
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
  ExternalLink,
  FileText,
  Edit3,
  Copy,
  Bold,
  Italic,
  Strikethrough,
  Code,
  Type,
  ChevronDown,
  X,
  Zap,
  BookTemplate,
  Tag,
  Undo2,
  Redo2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const CATEGORY_CONFIG: Record<WhatsAppTemplateCategory, { label: string, color: string, bgColor: string }> = {
  reminder: { label: 'Reminder', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-500/10' },
  notice: { label: 'Notice', color: 'text-rose-600 dark:text-rose-400', bgColor: 'bg-rose-50 dark:bg-rose-500/10' },
  greeting: { label: 'Greeting', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-500/10' },
  custom: { label: 'Custom', color: 'text-indigo-600 dark:text-indigo-400', bgColor: 'bg-indigo-50 dark:bg-indigo-500/10' },
};

const DEFAULT_TEMPLATE_CONTENTS: Record<WhatsAppTemplateCategory, { placeholder: string, autofill: string }> = {
  reminder: {
    placeholder: "*Rent Reminder*\n\nHi {{tenant_name}}, your rent of {{rent_amount}} for room {{room_number}} is due on {{due_date}}. Please pay at the earliest.",
    autofill: "*Rent Reminder*\n\nHi {{tenant_name}}, your rent of {{rent_amount}} for room {{room_number}} is due on {{due_date}}. Please pay at the earliest."
  },
  notice: {
    placeholder: "*Important Notice*\n\nDear {{tenant_name}} (Room {{room_number}}),\nThis is to notify you that there will be a scheduled maintenance in the PG on [Date]. Please plan accordingly.",
    autofill: "*Important Notice*\n\nDear {{tenant_name}} (Room {{room_number}}),\nThis is to notify you that there will be a scheduled maintenance in the PG on [Date]. Please plan accordingly."
  },
  greeting: {
    placeholder: "*Warm Greetings*\n\nDear {{tenant_name}},\nElitePG wishes you a very happy and prosperous holiday season! We are glad to have you with us.",
    autofill: "*Warm Greetings*\n\nDear {{tenant_name}},\nElitePG wishes you a very happy and prosperous holiday season! We are glad to have you with us."
  },
  custom: {
    placeholder: "*Custom Announcement*\n\nHello {{tenant_name}},\nType your custom message here...",
    autofill: "*Announcement*\n\nHello {{tenant_name}},\nThis is a custom message regarding room {{room_number}}."
  }
};

// Shared formatting utility for preview & dashboard rendering
export const renderFormatted = (text: string) => {
  if (!text) return '';
  return text
    .replace(/\*([^*]+)\*/g, '<b>$1</b>')
    .replace(/_([^_]+)_/g, '<i>$1</i>')
    .replace(/~([^~]+)~/g, '<s>$1</s>')
    .replace(/```([^`]+)```/g, '<code>$1</code>');
};

// WhatsApp-style formatting toolbar component with Undo/Redo & Font Size support
const FormatToolbar = ({ textareaRef, value, onChange, variables }: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (val: string) => void;
  variables?: { label: string, insertText: string }[];
}) => {
  const [history, setHistory] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const lastPushedValue = useRef<string>(value);

  // Debounced backup of typed text into undo history
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (value !== lastPushedValue.current) {
        setHistory(prev => [...prev, lastPushedValue.current].slice(-30));
        setRedoStack([]);
        lastPushedValue.current = value;
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [value]);

  const pushHistory = (currentVal: string) => {
    setHistory(prev => [...prev, currentVal].slice(-30));
    setRedoStack([]);
    lastPushedValue.current = currentVal;
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, value]);
    lastPushedValue.current = previous;
    onChange(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setHistory(prev => [...prev, value]);
    lastPushedValue.current = next;
    onChange(next);
  };

  const wrapSelection = (prefix: string, suffix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    pushHistory(value);
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    let newText = '';
    if (selectedText) {
      newText = value.substring(0, start) + prefix + selectedText + suffix + value.substring(end);
      onChange(newText);
      lastPushedValue.current = newText;
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, end + prefix.length);
      }, 0);
    } else {
      const placeholder = prefix + 'text' + suffix;
      newText = value.substring(0, start) + placeholder + value.substring(end);
      onChange(newText);
      lastPushedValue.current = newText;
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + 4);
      }, 0);
    }
  };

  const insertVariable = (variable: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    pushHistory(value);
    const start = textarea.selectionStart;
    const newText = value.substring(0, start) + variable + value.substring(start);
    onChange(newText);
    lastPushedValue.current = newText;
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Undo & Redo */}
        <button
          type="button"
          disabled={history.length === 0}
          onClick={handleUndo}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={redoStack.length === 0}
          onClick={handleRedo}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Redo"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-0.5" />

        {/* Text styling & size */}
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-1">Style</span>
        <button
          type="button"
          onClick={() => wrapSelection('*', '*')}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 transition-colors"
          title="Bold (*text*)"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => wrapSelection('_', '_')}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 transition-colors"
          title="Italic (_text_)"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => wrapSelection('~', '~')}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 transition-colors"
          title="Strikethrough (~text~)"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => wrapSelection('```', '```')}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 transition-colors"
          title="Monospace (```text```)"
        >
          <Code className="w-3.5 h-3.5" />
        </button>

        {variables && variables.length > 0 && (
          <>
            <div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-0.5" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-1">Variables</span>
            {variables.map(v => (
              <button
                key={v.label}
                type="button"
                onClick={() => insertVariable(v.insertText)}
                className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
              >
                {v.label}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

// WhatsApp-style message preview renderer
const WhatsAppPreview = ({ content }: { content: string }) => {
  if (!content.trim()) return null;

  return (
    <div className="mt-3">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Live Preview</p>
      <div className="bg-[#e5ddd5] dark:bg-[#0b141a] rounded-2xl p-4">
        <div className="bg-[#dcf8c6] dark:bg-[#005c4b] rounded-xl px-3 py-2 max-w-[85%] ml-auto shadow-sm">
          <p
            className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words [&_b]:font-bold [&_i]:italic [&_s]:line-through [&_code]:font-mono [&_code]:bg-black/10 [&_code]:dark:bg-white/10 [&_code]:px-1 [&_code]:rounded"
            dangerouslySetInnerHTML={{ __html: renderFormatted(content) }}
          />
          <p className="text-[10px] text-gray-500 dark:text-gray-400 text-right mt-1">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    </div>
  );
};


export const BroadcastPage = () => {
  const { user, users } = useAuth();
  const { tenants, rooms, announcements, addAnnouncement, deleteAnnouncement, whatsappTemplates, addWhatsAppTemplate, updateWhatsAppTemplate, deleteWhatsAppTemplate } = useApp();
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

  // State to hold and reset dropdown selection
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [announcementTemplateId, setAnnouncementTemplateId] = useState('');

  // Template management state
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<'all' | WhatsAppTemplateCategory>('all');
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    content: '',
    category: 'custom' as WhatsAppTemplateCategory
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const templateTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const quickBroadcastTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const announcementContentTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  if (user?.role !== 'admin' && user?.role !== 'super' && user?.role !== 'partner') {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addAnnouncement(formData);

    const message = `*${formData.title}*\n\n${formData.content}`;
    sendWhatsApp(null, message);

    setIsAddModalOpen(false);
    setAnnouncementTemplateId('');
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
      whatsappUrl = `https://api.whatsapp.com/send?text=${encodedMessage}`;
    } else {
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
    // Before sending, replace any placeholders in the message box with resolved values if a tenant is selected
    const finalMessage = resolveVariables(quickBroadcast.message, quickBroadcast.tenantId);

    if (quickBroadcast.tenantId === 'all' || quickBroadcast.tenantId === 'all_admins') {
      sendWhatsApp(null, finalMessage);
      setQuickBroadcast({ tenantId: '', message: '' });
      return;
    }

    const tenant = tenants.find(t => t.id === quickBroadcast.tenantId);
    const admin = users.find(u => u.id === quickBroadcast.tenantId);
    
    const targetPhone = tenant?.phone || admin?.phone;

    if (!targetPhone || !finalMessage) {
      toast.error('Please select a valid user and enter a message.');
      return;
    }
    
    sendWhatsApp(targetPhone, finalMessage);
    setQuickBroadcast({ tenantId: '', message: '' });
  };

  // Template CRUD handlers
  const openNewTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({ name: '', content: '', category: 'custom' });
    setIsTemplateModalOpen(true);
  };

  const openEditTemplate = (template: WhatsAppTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({ name: template.name, content: template.content, category: template.category });
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.name.trim() || !templateForm.content.trim()) {
      toast.error('Template name and content are required.');
      return;
    }

    if (editingTemplate) {
      await updateWhatsAppTemplate(editingTemplate.id, {
        name: templateForm.name,
        content: templateForm.content,
        category: templateForm.category
      });
    } else {
      await addWhatsAppTemplate({
        name: templateForm.name,
        content: templateForm.content,
        category: templateForm.category,
        createdBy: user?.id || ''
      });
    }

    setIsTemplateModalOpen(false);
    setEditingTemplate(null);
    setTemplateForm({ name: '', content: '', category: 'custom' });
  };

  const handleDeleteTemplate = async (id: string) => {
    await deleteWhatsAppTemplate(id);
    setDeleteConfirm(null);
  };

  const getFormattedDueDate = (dayNumber: number | string | undefined | null) => {
    if (!dayNumber) return '';
    const day = parseInt(String(dayNumber), 10);
    if (isNaN(day) || day < 1 || day > 31) return String(dayNumber);

    const now = new Date();
    const dd = String(day).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();

    return `${dd}-${mm}-${yyyy}`;
  };

  // Resolve variables in template content based on selected tenant
  const resolveVariables = (content: string, tenantId: string): string => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return content;

    const room = rooms.find(r => r.id === tenant.roomId);
    const resolvedDueDate = getFormattedDueDate(tenant.paymentDueDate);

    return content
      .replace(/\{\{tenant_name\}\}/g, tenant.name || '')
      .replace(/\{\{rent_amount\}\}/g, `₹${tenant.rentAmount || 0}`)
      .replace(/\{\{room_number\}\}/g, room?.roomNumber || '')
      .replace(/\{\{due_date\}\}/g, resolvedDueDate);
  };

  const useTemplate = (template: WhatsAppTemplate, targetTenantId: string = quickBroadcast.tenantId) => {
    const resolved = resolveVariables(template.content, targetTenantId);
    setQuickBroadcast(prev => ({ ...prev, message: resolved }));
    setSelectedTemplateId(template.id);
    toast.success(`Template "${template.name}" loaded`);
  };

  const handleTemplateDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    setSelectedTemplateId(templateId);
    if (templateId) {
      const selectedTemplate = whatsappTemplates.find(t => t.id === templateId);
      if (selectedTemplate) {
        useTemplate(selectedTemplate);
      }
    } else {
      setSelectedTemplateId('');
    }
  };

  // Check if a specific, individual tenant is selected
  const selectedTenant = tenants.find(t => t.id === quickBroadcast.tenantId);
  const selectedRoom = selectedTenant ? rooms.find(r => r.id === selectedTenant.roomId) : null;
  const isIndividualTenantSelected = !!selectedTenant;

  // Build variables chips for Quick Broadcast:
  // If no tenant is selected, variables are undefined (hiding the chips).
  // If a tenant is selected, clicking them inserts actual values.
  const quickBroadcastVariables = isIndividualTenantSelected ? [
    { label: 'Tenant Name', insertText: selectedTenant.name || '' },
    { label: 'Rent Amount', insertText: `₹${selectedTenant.rentAmount || 0}` },
    { label: 'Room Number', insertText: selectedRoom?.roomNumber || '' },
    { label: 'Due Date', insertText: getFormattedDueDate(selectedTenant.paymentDueDate) },
  ] : undefined;

  // Always show placeholders in Template Modal
  const modalVariables = [
    { label: 'Tenant Name', insertText: '{{tenant_name}}' },
    { label: 'Rent Amount', insertText: '{{rent_amount}}' },
    { label: 'Room Number', insertText: '{{room_number}}' },
    { label: 'Due Date', insertText: '{{due_date}}' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Broadcast & Announcements</h2>
          <p className="text-gray-500 dark:text-gray-400">Send updates and manage property-wide notifications.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsManageModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-white/10 transition-all shadow-sm"
          >
            <BookTemplate className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            Manage Templates
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
          >
            <Plus className="w-5 h-5" />
            New Announcement
          </button>
        </div>
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
                <p
                  className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap break-words [&_b]:font-bold [&_i]:italic [&_s]:line-through [&_code]:font-mono [&_code]:bg-black/10 [&_code]:dark:bg-white/10 [&_code]:px-1 [&_code]:rounded"
                  dangerouslySetInnerHTML={{ __html: renderFormatted(announcement.content) }}
                />
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
          {/* Combined Quick Broadcast & Templates Card */}
          <div className="bg-white dark:bg-[#111111] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Broadcast & Templates
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Compose messages using templates and send instantly via WhatsApp.
              </p>
            </div>

            <div className="space-y-4">
              {/* Select Recipient */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Tenant / Recipient</label>
                <select
                  value={quickBroadcast.tenantId}
                  onChange={(e) => {
                    const nextTenantId = e.target.value;
                    setQuickBroadcast(prev => {
                      // Automatically resolve placeholders in composer if switching to a specific tenant
                      const resolvedMessage = resolveVariables(prev.message, nextTenantId);
                      return {
                        ...prev,
                        tenantId: nextTenantId,
                        message: resolvedMessage
                      };
                    });
                  }}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Choose tenant...</option>
                  <option value="all">All Tenants (WhatsApp Group)</option>
                  {user?.role === 'super' && (
                    <option value="all_admins">All Admins</option>
                  )}
                  {user?.role === 'super' && users.filter(u => u.role === 'admin' || u.role === 'partner').map(admin => (
                    <option key={`admin_${admin.id}`} value={admin.id}>[Admin] {admin.name} ({admin.phone || 'No phone'})</option>
                  ))}
                  {tenants.map(t => (
                    <option key={`tenant_${t.id}`} value={t.id}>{t.name} ({t.phone})</option>
                  ))}
                </select>
              </div>

              {/* Load Template Dropdown */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Load Saved Template</label>
                <select
                  value={selectedTemplateId}
                  onChange={handleTemplateDropdownChange}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Choose a template to autofill...</option>
                  {(whatsappTemplates || []).map(t => (
                    <option key={t.id} value={t.id}>
                      [{CATEGORY_CONFIG[t.category]?.label || t.category}] {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Message Composer & Toolbar */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Message</label>
                <FormatToolbar
                  textareaRef={quickBroadcastTextareaRef}
                  value={quickBroadcast.message}
                  onChange={(val) => setQuickBroadcast({ ...quickBroadcast, message: val })}
                  variables={quickBroadcastVariables}
                />
                <textarea
                  ref={quickBroadcastTextareaRef}
                  value={quickBroadcast.message}
                  onChange={(e) => setQuickBroadcast({ ...quickBroadcast, message: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 min-h-[120px]"
                  placeholder="Type your message here..."
                />
              </div>

              {/* Live Preview (resolves placeholders to actual values in real time) */}
              {quickBroadcast.message.trim() && (
                <WhatsAppPreview content={resolveVariables(quickBroadcast.message, quickBroadcast.tenantId)} />
              )}

              {/* Action Button */}
              <button
                onClick={handleQuickBroadcast}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-5 h-5" />
                Send via WhatsApp
              </button>
            </div>
          </div>

          {/* Pro Tip Card */}
          <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-600/20">
            <h4 className="font-bold mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Pro Tip
            </h4>
            <p className="text-sm text-indigo-100 leading-relaxed">
              Use WhatsApp formatting like *bold* or _italic_ to make your announcements stand out. Templates support variables like {'{{tenant_name}}'} that auto-fill when a tenant is selected.
            </p>
          </div>
        </div>
      </div>

      {/* New Announcement Modal */}
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
              className="relative w-full max-w-lg bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden border border-white/5 max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white dark:bg-[#111111] z-10">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">New Announcement</h3>
                <button
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setAnnouncementTemplateId('');
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                >
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

                {/* Load Saved Template */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Load Saved Template</label>
                  <select
                    value={announcementTemplateId}
                    onChange={(e) => {
                      const templateId = e.target.value;
                      setAnnouncementTemplateId(templateId);
                      if (templateId) {
                        const selectedTemplate = whatsappTemplates.find(t => t.id === templateId);
                        if (selectedTemplate) {
                          setFormData(prev => ({ ...prev, content: selectedTemplate.content }));
                          toast.success(`Template "${selectedTemplate.name}" loaded`);
                        }
                      } else {
                        setFormData(prev => ({ ...prev, content: '' }));
                      }
                    }}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="">Choose a template to autofill...</option>
                    {(whatsappTemplates || []).map(t => (
                      <option key={t.id} value={t.id}>
                        [{CATEGORY_CONFIG[t.category]?.label || t.category}] {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Content with Format Toolbar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Content</label>
                    {!formData.content.trim() && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          content: "*Maintenance Notice*\n\nDear Tenants, this is to inform you that there will be a scheduled power/water maintenance on [Date] from [Start Time] to [End Time]. Inconvenience is regretted."
                        }))}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline"
                      >
                        Use Default Text
                      </button>
                    )}
                  </div>
                  <FormatToolbar
                    textareaRef={announcementContentTextareaRef}
                    value={formData.content}
                    onChange={(val) => setFormData({ ...formData, content: val })}
                  />
                  <textarea
                    ref={announcementContentTextareaRef}
                    required
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white min-h-[120px]"
                    placeholder="Describe the announcement..."
                  />
                </div>

                {/* Live Preview */}
                {formData.content.trim() && (
                  <WhatsAppPreview content={formData.content} />
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setAnnouncementTemplateId('');
                    }}
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

      {/* Manage Templates Workshop Modal */}
      <AnimatePresence>
        {isManageModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsManageModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden border border-white/5 max-h-[85vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white dark:bg-[#111111] z-10">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    Manage WhatsApp Templates
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Create and customize reusable templates for tenant messaging.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={openNewTemplate}
                    className="flex items-center gap-1 px-3 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow shadow-indigo-600/10 animate-fade-in"
                  >
                    <Plus className="w-4 h-4" />
                    Create Template
                  </button>
                  <button
                    onClick={() => setIsManageModalOpen(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Modal Body / Toolbar */}
              <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Search Bar */}
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Search templates..."
                      value={templateSearchQuery}
                      onChange={(e) => setTemplateSearchQuery(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  {/* Filter chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1 shrink-0">
                    <button
                      onClick={() => setTemplateCategoryFilter('all')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                        templateCategoryFilter === 'all'
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                      )}
                    >
                      All
                    </button>
                    {(Object.entries(CATEGORY_CONFIG) as [WhatsAppTemplateCategory, typeof CATEGORY_CONFIG[WhatsAppTemplateCategory]][]).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => setTemplateCategoryFilter(key)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                          templateCategoryFilter === key
                            ? `${config.bgColor} ${config.color} ring-1 ring-current/25`
                            : "bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                        )}
                      >
                        {config.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Templates Grid List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(whatsappTemplates || [])
                    .filter(t => {
                      const matchesSearch = t.name.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
                                           t.content.toLowerCase().includes(templateSearchQuery.toLowerCase());
                      const matchesCategory = templateCategoryFilter === 'all' || t.category === templateCategoryFilter;
                      return matchesSearch && matchesCategory;
                    })
                    .map(template => (
                      <div
                        key={template.id}
                        className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl flex flex-col justify-between gap-3 shadow-sm hover:border-gray-200 dark:hover:border-white/10 transition-colors"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className={cn(
                              "px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider",
                              CATEGORY_CONFIG[template.category]?.bgColor,
                              CATEGORY_CONFIG[template.category]?.color
                            )}>
                              {CATEGORY_CONFIG[template.category]?.label || template.category}
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                              {template.createdAt ? new Date(template.createdAt).toLocaleDateString() : ''}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-gray-955 dark:text-white">{template.name}</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 whitespace-pre-wrap break-words italic leading-relaxed bg-white dark:bg-black/10 p-2.5 rounded-xl border border-gray-100 dark:border-white/5">
                            {template.content}
                          </p>
                        </div>

                        <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/5 pt-2.5 mt-1">
                          <button
                            onClick={() => {
                              useTemplate(template);
                              setIsManageModalOpen(false);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-600/10"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            Apply
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditTemplate(template)}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Edit
                            </button>

                            {deleteConfirm === template.id ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleDeleteTemplate(template.id)}
                                  className="px-2 py-1 text-[10px] font-bold bg-rose-600 text-white rounded hover:bg-rose-700 transition-colors"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="px-2 py-1 text-[10px] font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirm(template.id)}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                  {(!whatsappTemplates || whatsappTemplates.length === 0) && (
                    <div className="col-span-full py-12 text-center">
                      <FileText className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400 font-medium">No templates saved yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Template Create/Edit Modal */}
      <AnimatePresence>
        {isTemplateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTemplateModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden border border-white/5 max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white dark:bg-[#111111] z-10">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingTemplate ? 'Edit Template' : 'New Template'}
                </h3>
                <button onClick={() => setIsTemplateModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <form onSubmit={handleSaveTemplate} className="p-6 space-y-5">
                {/* Template Name */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Template Name</label>
                  <input
                    required
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                    placeholder="e.g. Monthly Rent Reminder"
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Category</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(Object.entries(CATEGORY_CONFIG) as [WhatsAppTemplateCategory, typeof CATEGORY_CONFIG[WhatsAppTemplateCategory]][]).map(([key, config]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTemplateForm({ ...templateForm, category: key })}
                        className={cn(
                          "px-3 py-2 rounded-xl text-xs font-bold transition-all text-center",
                          templateForm.category === key
                            ? `${config.bgColor} ${config.color} ring-2 ring-current/20`
                            : "bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                        )}
                      >
                        {config.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Content with Formatting Toolbar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Message Content</label>
                    {!templateForm.content.trim() && (
                      <button
                        type="button"
                        onClick={() => setTemplateForm(prev => ({
                          ...prev,
                          content: DEFAULT_TEMPLATE_CONTENTS[templateForm.category]?.autofill
                        }))}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline"
                      >
                        Use Default Template
                      </button>
                    )}
                  </div>
                  <FormatToolbar
                    textareaRef={templateTextareaRef}
                    value={templateForm.content}
                    onChange={(val) => setTemplateForm({ ...templateForm, content: val })}
                    variables={modalVariables}
                  />
                  <textarea
                    ref={templateTextareaRef}
                    required
                    value={templateForm.content}
                    onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white min-h-[140px] font-mono text-sm"
                    placeholder={DEFAULT_TEMPLATE_CONTENTS[templateForm.category]?.placeholder}
                  />
                </div>

                {/* Live Preview */}
                <WhatsAppPreview content={templateForm.content} />

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsTemplateModalOpen(false)}
                    className="px-6 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                  >
                    {editingTemplate ? 'Update Template' : 'Save Template'}
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
