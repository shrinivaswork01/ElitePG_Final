import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Phone, MessageCircle, Copy, User, ShieldCheck, Mail, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'motion/react';

export const HelpSupportPage = () => {
  const { user, users } = useAuth();
  const { branches, employees, currentBranch } = useApp();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/91${cleanPhone.slice(-10)}`, '_blank');
  };

  const renderContactCard = (title: string, name: string, phone: string, email?: string, role?: string) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-[#111111] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center font-bold text-xl">
            {name.charAt(0)}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize">{name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{title}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {phone && (
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-2xl text-sm">
            <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
              <Phone className="w-4 h-4 text-gray-400" />
              <span className="font-medium">{phone}</span>
            </div>
            <div className="flex gap-1">
              <button 
                onClick={() => handleCopy(phone)}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg text-gray-500 transition-colors"
                title="Copy"
              >
                <Copy className="w-4 h-4" />
              </button>
              <a 
                href={`tel:${phone}`}
                className="p-1.5 hover:bg-indigo-100 dark:hover:bg-indigo-500/10 rounded-lg text-indigo-600 transition-colors"
                title="Call"
              >
                <Phone className="w-4 h-4" />
              </a>
              <button 
                onClick={() => handleWhatsApp(phone)}
                className="p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-500/10 rounded-lg text-emerald-600 transition-colors"
                title="WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        {email && (
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-2xl text-sm">
            <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="font-medium truncate max-w-[180px]">{email}</span>
            </div>
            <button 
              onClick={() => handleCopy(email)}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg text-gray-500 transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );

  const renderContent = () => {
    if (user?.role === 'tenant') {
      const branchAdmin = currentBranch;
      const branchStaff = employees.filter(e => ['manager', 'caretaker'].includes(e.role));

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branchAdmin && renderContactCard('PG Admin', branchAdmin.name, branchAdmin.phone, '', 'admin')}
          {branchStaff.map(staff => renderContactCard(staff.role, staff.name, staff.phone, staff.email, staff.role))}
          {branchStaff.length === 0 && !branchAdmin && (
            <p className="col-span-full text-center py-12 text-gray-500 italic text-sm">No contact details found for your branch.</p>
          )}
        </div>
      );
    }

    if (user?.role === 'admin') {
      // Show Super Admin details
      const superAdmin = users.find(u => u.role === 'super');
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {superAdmin ? (
            renderContactCard('Super Admin / Support', superAdmin.name, superAdmin.phone || '9999999999', superAdmin.email)
          ) : (
            renderContactCard('ElitePG Support', 'Technical Support', '9876543210', 'support@elitepg.com')
          )}
        </div>
      );
    }

    // Employees see their branch admin
    const branchAdmin = currentBranch;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branchAdmin ? (
          renderContactCard('Your Admin', branchAdmin.name, branchAdmin.phone)
        ) : (
          <p className="col-span-full text-center py-12 text-gray-500 italic text-sm">No branch admin contact found.</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Help & Support</h2>
        <p className="text-gray-500 dark:text-gray-400">Reach out to the relevant contact for assistance.</p>
      </div>

      {renderContent()}

      <div className="mt-12 p-8 bg-indigo-600 rounded-[2rem] text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-indigo-600/20">
        <div className="space-y-4 text-center md:text-left">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Safe & Secure PG Management</h3>
            <p className="text-white/80 text-sm max-w-md">Your data is fully encrypted and protected. For technical issues, please contact our 24/7 service desk.</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="p-4 bg-white/10 rounded-2xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">Response Time</p>
            <p className="font-bold text-lg">{"< 2 hours"}</p>
          </div>
          <div className="p-4 bg-white/10 rounded-2xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">Service Availability</p>
            <p className="font-bold text-lg">24 / 7</p>
          </div>
        </div>
      </div>
    </div>
  );
};

