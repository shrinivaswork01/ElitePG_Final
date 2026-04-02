import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Copy, Check, MessageSquare, Share2, ExternalLink } from 'lucide-react';
import { cn } from '../utils';
import toast from 'react-hot-toast';

interface InviteCodeCardProps {
  inviteCode: string;
  branchName?: string;
  variant?: 'default' | 'compact';
  className?: string;
}

export const InviteCodeCard: React.FC<InviteCodeCardProps> = ({ 
  inviteCode, 
  branchName, 
  variant = 'default',
  className 
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const signupUrl = `${window.location.origin}/signup?code=${inviteCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopiedCode(true);
    toast.success('Invite code copied!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(signupUrl);
    setCopiedLink(true);
    toast.success('Signup link copied!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const msg = `Hi! Please use this link to sign up for our PG${branchName ? ` (${branchName})` : ''}:\n${signupUrl}\n\nOr use invite code: *${inviteCode}*`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (variant === 'compact') {
    return (
      <div className={cn(
        "group relative glass-card p-5 rounded-3xl border border-gray-100 dark:border-white/5 transition-all hover:shadow-xl hover:shadow-indigo-500/5",
        className
      )}>
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400 group-hover:scale-110 group-hover:rotate-3 transition-all shadow-sm">
            <Share2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-0.5">Quick Invite</p>
            <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tighter truncate">{inviteCode}</h3>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4">
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 py-2.5 px-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all active:scale-95 border border-indigo-100 dark:border-indigo-500/20"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
            Copy Link
          </button>
          <button
            onClick={handleShareWhatsApp}
            className="flex items-center justify-center gap-2 py-2.5 px-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all active:scale-95 border border-emerald-100 dark:border-emerald-500/20"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            WhatsApp
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-gradient-to-br from-indigo-50/50 via-white to-white dark:from-indigo-500/5 dark:via-[#111111] dark:to-[#111111] rounded-3xl border border-indigo-100/50 dark:border-white/5 shadow-sm p-6 sm:p-8 space-y-6 relative overflow-hidden",
        className
      )}
    >
      <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
        <Share2 className="w-32 h-32 text-indigo-600" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20">
            <Share2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Tenant Invite Portal</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Share this code with new members to join your branch.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-white dark:bg-white/5 rounded-2xl border border-indigo-100 dark:border-white/10 shadow-inner group/code hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all">
          <code className="text-2xl sm:text-3xl font-black tracking-[0.2em] text-indigo-600 dark:text-indigo-400 font-mono">
            {inviteCode}
          </code>
          <button
            onClick={handleCopyCode}
            className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all"
          >
            {copiedCode ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
        <button
          onClick={handleCopyLink}
          className="flex items-center justify-center gap-3 py-4 px-6 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 group"
        >
          {copiedLink ? <Check className="w-5 h-5" /> : <ExternalLink className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
          Copy Signup Link
        </button>
        <button
          onClick={handleShareWhatsApp}
          className="flex items-center justify-center gap-3 py-4 px-6 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-2xl font-black text-sm hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all border border-emerald-100 dark:border-emerald-500/20 active:scale-95"
        >
          <MessageSquare className="w-5 h-5" />
          Share via WhatsApp
        </button>
      </div>

      <div className="pt-2">
        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-bold text-center">
          New tenants can use this code directly in the signup page
        </p>
      </div>
    </motion.div>
  );
};
