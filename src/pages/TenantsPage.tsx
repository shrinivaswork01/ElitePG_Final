import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Tenant, TenantStatus } from '../types';
import { Navigate, useLocation } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
  Search,
  Plus,
  Filter,
  Download,
  Shield,
  Trash2,
  Edit2,
  Upload,
  FileText,
  History,
  FileCheck,
  MessageCircle,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePaginatedData } from '../hooks/usePaginatedData';
import { DataGrid, ColumnDef } from '../components/DataGrid';
import { DropdownMenu, DropdownItem } from '../components/DropdownMenu';
import { TenantDetailPanel } from '../components/TenantDetailPanel';
import { TenantMobileList } from '../components/TenantMobileList';
import { cn } from '../utils';
import toast from 'react-hot-toast';

export const TenantsPage = () => {
  const { user, users, register, updateUser, authorizeUser } = useAuth();
  const location = useLocation();
  const { tenants, rooms, addTenant, updateTenant, deleteTenant, checkFeatureAccess, currentPlan, uploadVerifiedKYC, kycs, userInvites } = useApp();
  const canSendWhatsApp = checkFeatureAccess('whatsapp');

  const currentTenantsCount = tenants.length;
  const isAtLimit = currentPlan && currentTenantsCount >= currentPlan.maxTenants;
  const isNearLimit = currentPlan && currentTenantsCount >= currentPlan.maxTenants * 0.8;

  useEffect(() => {
    if (location.state?.openAddModal) {
      setIsAddModalOpen(true);
      // Clear state to prevent reopening on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  if (user?.role === 'tenant') {
    return <Navigate to="/" replace />;
  }
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [filterStatus, setFilterStatus] = useState<TenantStatus | 'all'>('all');
  const [viewingPayments, setViewingPayments] = useState<Tenant | null>(null);
  const [viewingAgreement, setViewingAgreement] = useState<Tenant | null>(null);
  const [tenantForLogin, setTenantForLogin] = useState<Tenant | null>(null);
  const [createUsername, setCreateUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [kycUploadTenant, setKycUploadTenant] = useState<Tenant | null>(null);
  const [menuTenant, setMenuTenant] = useState<Tenant | null>(null);
  const [adminKycFile, setAdminKycFile] = useState<{ type: string; url: string; fileName: string } | null>(null);
  const [adminKycType, setAdminKycType] = useState('Aadhar Card');
  const [detailTenant, setDetailTenant] = useState<any | null>(null);
  const { payments } = useApp();

  // Server-side paginated hook — fetches ONLY 10 records at a time
  const { data: paginatedTenants, totalCount, isLoading, page, setPage, limit, refetch } = usePaginatedData<any>({
    table: 'tenants',
    select: '*, rooms!tenants_room_id_fkey(room_number)',
    ilikeFilters: searchTerm ? { name: searchTerm, email: searchTerm } : undefined,
    filters: filterStatus !== 'all' ? { status: filterStatus } : undefined
  });

  const columns: ColumnDef<any>[] = [
    {
      header: 'Tenant',
      accessorKey: 'name',
      cell: (t) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black text-base shadow-lg shadow-indigo-500/20 uppercase shrink-0">
            {t.name?.charAt(0) || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{t.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{t.email}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Room',
      accessorKey: 'room_id',
      cell: (t) => {
        const roomNumber = t.rooms?.room_number;
        return (
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Room {roomNumber || 'N/A'}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Bed {t.bed_number}</span>
          </div>
        );
      }
    },
    {
      header: 'KYC',
      accessorKey: 'kyc_status',
      className: 'hidden sm:table-cell',
      cell: (t) => {
        const s = t.kyc_status;
        const map: Record<string, string> = {
          verified: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
          pending: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
          unsubmitted: 'bg-gray-100 dark:bg-white/5 text-gray-400',
          rejected: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
        };
        return (
          <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold', map[s] || map.unsubmitted)}>
            <Shield className="w-3 h-3" />
            {s?.charAt(0).toUpperCase() + s?.slice(1)}
          </span>
        );
      }
    },
    {
      header: 'Rent',
      accessorKey: 'rent_amount',
      className: 'hidden md:table-cell',
      cell: (t) => (
        <div>
          <p className="text-sm font-bold text-gray-900 dark:text-white">₹{Number(t.rent_amount).toLocaleString()}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Due {t.payment_due_date}th</p>
        </div>
      )
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (t) => {
        const map: Record<string, string> = {
          active: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
          vacating: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
          vacated: 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400',
          blacklisted: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
        };
        return (
          <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider', map[t.status] || map.vacated)}>
            {t.status}
          </span>
        );
      }
    },
    {
      header: '',
      accessorKey: 'id',
      className: 'w-[60px]',
      cell: (t) => (
        <div className="flex justify-end">
          <DropdownMenu>
            {/* Edit first */}
            {['admin', 'manager', 'receptionist', 'caretaker'].includes(user?.role || '') && (
              <DropdownItem icon={<Edit2 className="w-4 h-4" />} label="Edit Tenant" onClick={() => handleEditClick(t)} />
            )}
            <DropdownItem icon={<History className="w-4 h-4" />} label="Payment History" onClick={() => setViewingPayments(t)} />
            {(t.rent_agreement_url || t.rentAgreementUrl) && (
              <DropdownItem icon={<FileCheck className="w-4 h-4" />} label="View Agreement" onClick={() => setViewingAgreement(t)} />
            )}
            {canSendWhatsApp && (
              <DropdownItem icon={<MessageCircle className="w-4 h-4" />} label="WhatsApp Reminder" onClick={() => handleSendWhatsAppReminder(t)} />
            )}
            {['admin', 'manager', 'receptionist'].includes(user?.role || '') && (
              <DropdownItem icon={<Shield className="w-4 h-4" />} label="Upload KYC" onClick={() => { setKycUploadTenant(t); setAdminKycFile(null); setAdminKycType('Aadhar Card'); }} />
            )}
            {['admin', 'manager'].includes(user?.role || '') && (
              <DropdownItem icon={<Trash2 className="w-4 h-4" />} label="Delete Tenant" onClick={() => setTenantToDelete(t)} danger />
            )}
          </DropdownMenu>
        </div>
      )
    }
  ];


  const handleDownload = () => {
    const csvRows = paginatedTenants.map((t: any) => ({
      Name: t.name,
      Email: t.email,
      Phone: t.phone,
      Room: t.rooms?.room_number || 'N/A',
      Bed: t.bed_number,
      Rent: t.rent_amount,
      KYC: t.kyc_status,
      Status: t.status
    }));
    const csvContent = "data:text/csv;charset=utf-8,"
      + ["Name,Email,Phone,Room,Bed,Rent,KYC,Status", ...csvRows.map((r: any) => Object.values(r).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ElitePG_Tenants.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [formData, setFormData] = useState<Omit<Tenant, 'id' | 'branchId'>>({
    name: '',
    email: '',
    phone: '',
    roomId: '',
    bedNumber: 1,
    rentAmount: 0,
    depositAmount: 0,
    joiningDate: new Date().toISOString().split('T')[0],
    paymentDueDate: 5,
    status: 'active',
    kycStatus: 'unsubmitted',
    inviteCode: ''
  });

  // Effect to set default invite code when modal opens
  useEffect(() => {
    if (isAddModalOpen && !editingTenant) {
      const branchInvite = userInvites.find(i => i.branchId === user?.branchId && i.role === 'tenant' && i.status === 'pending');
      if (branchInvite) {
        setFormData(prev => ({ ...prev, inviteCode: branchInvite.inviteCode }));
      }
    }
  }, [isAddModalOpen, editingTenant, userInvites, user?.branchId]);

  const [kycDoc, setKycDoc] = useState<{ type: string, url: string, fileName: string }>({
    type: 'Aadhar Card',
    url: '',
    fileName: ''
  });

  const [rentAgreement, setRentAgreement] = useState<{ url: string, fileName: string }>({
    url: '',
    fileName: ''
  });

  const handleSendWhatsAppReminder = (tenant: Tenant) => {
    const message = `*Rent Reminder*\n\nHi ${tenant.name}, this is a friendly reminder that your rent of ₹${tenant.rentAmount} is due. Please ignore if already paid.`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${tenant.phone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleEditClick = (tenant: any) => {
    // Normalize data from DB (snake_case) or context (camelCase) to the form's camelCase shape
    const normalized = {
      name: tenant.name || '',
      email: tenant.email || '',
      phone: tenant.phone || '',
      roomId: tenant.roomId || tenant.room_id || '',
      bedNumber: tenant.bedNumber ?? tenant.bed_number ?? 1,
      rentAmount: tenant.rentAmount ?? tenant.rent_amount ?? 0,
      depositAmount: tenant.depositAmount ?? tenant.deposit_amount ?? 0,
      joiningDate: tenant.joiningDate || tenant.joining_date || new Date().toISOString().split('T')[0],
      paymentDueDate: tenant.paymentDueDate ?? tenant.payment_due_date ?? 5,
      status: tenant.status || 'active',
      kycStatus: tenant.kycStatus || tenant.kyc_status || 'unsubmitted',
      userId: tenant.userId || tenant.user_id || undefined,
      rentAgreementUrl: tenant.rentAgreementUrl || tenant.rent_agreement_url || undefined,
    };
    // Auto-fill branch invite code
    const branchInvite = userInvites.find(i => i.branchId === user?.branchId && i.role === 'tenant' && i.status === 'pending');
    setEditingTenant({ ...tenant, id: tenant.id, branchId: tenant.branchId || tenant.branch_id });
    setFormData({ ...normalized, inviteCode: branchInvite?.inviteCode || tenant.invite_code || tenant.inviteCode || '' });
    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingTenant(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      roomId: '',
      bedNumber: 1,
      rentAmount: 0,
      depositAmount: 0,
      joiningDate: new Date().toISOString().split('T')[0],
      paymentDueDate: 5,
      status: 'active',
      kycStatus: 'unsubmitted'
    });
    setKycDoc({ type: 'Aadhar Card', url: '', fileName: '' });
    setRentAgreement({ url: '', fileName: '' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        toast.error('File size too large! Please upload a file smaller than 1.5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setKycDoc({
          ...kycDoc,
          url: reader.result as string,
          fileName: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAgreementChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        toast.error('File size too large! Please upload a file smaller than 1.5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setRentAgreement({
          url: reader.result as string,
          fileName: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateLogin = async () => {
    if (!tenantForLogin) return;
    const finalUsername = createUsername || tenantForLogin.email;

    const existingUser = users.find(u => u.username === finalUsername || u.email === tenantForLogin.email);
    if (existingUser) {
      toast.error('User login already exists for this email or username.');
      setTenantForLogin(null);
      setCreateUsername('');
      return;
    }

    const result = await register({
      username: finalUsername,
      name: tenantForLogin.name,
      email: tenantForLogin.email,
      role: 'tenant',
      phone: tenantForLogin.phone,
      branchId: tenantForLogin.branchId
    }, loginPassword || undefined);

    if (result.success && result.user) {
      await updateTenant(tenantForLogin.id, { userId: result.user.id });
      if (!loginPassword) {
        toast.success('Login account created with default password "123456". Tenant will be prompted to set their own password on first login.');
      } else {
        toast.success('Login created successfully. The tenant must be authorized by an admin before logging in.');
      }
      setTenantForLogin(null);
      setCreateUsername('');
      setLoginPassword('');
    } else {
      toast.error(result.message || 'Failed to create login.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.roomId) {
      toast.error('Please select a room for the tenant.');
      return;
    }

    const room = rooms.find(r => r.id === formData.roomId);
    if (room) {
      const activeOccupants = tenants.filter(t => t.roomId === formData.roomId && t.status === 'active' && t.id !== editingTenant?.id).length;
      if (activeOccupants >= room.totalBeds) {
        toast.error(`Cannot assign tenant. Room ${room.roomNumber} is currently at maximum capacity (${room.totalBeds} beds).`);
        return;
      }
    }

    if (formData.name && formData.roomId) {
      if (editingTenant) {
        updateTenant(
          editingTenant.id,
          formData,
          kycDoc.url ? { type: kycDoc.type, url: kycDoc.url } : undefined,
          rentAgreement.url ? { url: rentAgreement.url } : undefined
        );
        if (editingTenant.userId) {
          updateUser(editingTenant.userId, { name: formData.name, email: formData.email, phone: formData.phone });
        }
      } else {
        addTenant(
          formData as Omit<Tenant, 'id'>,
          kycDoc.url ? { type: kycDoc.type, url: kycDoc.url } : undefined,
          rentAgreement.url ? { url: rentAgreement.url } : undefined
        );
      }
      handleCloseModal();
    }
  };

  const handleBulkDelete = (ids: string[]) => {
    if (window.confirm(`Are you sure you want to delete ${ids.length} selected tenants?`)) {
      ids.forEach(id => deleteTenant(id));
      refetch();
      toast.success(`${ids.length} tenants deleted.`);
    }
  };

  const handleBulkWhatsApp = (ids: string[]) => {
    const selectedTenants = paginatedTenants.filter((t: any) => ids.includes(t.id));
    if (selectedTenants.length > 0) {
      toast('Bulk WhatsApp info: Currently Web only supports opening one chat. Opening first.', { icon: 'ℹ️' });
      handleSendWhatsAppReminder(selectedTenants[0]);
    }
  };

  const handleShareDetails = (ids: string[]) => {
    const selectedTenants = paginatedTenants.filter((t: any) => ids.includes(t.id));
    const details = selectedTenants.map((t: any) => `${t.name} (Room ${t.rooms?.room_number || 'N/A'})\nPhone: ${t.phone}\nRent: ₹${t.rent_amount || t.rentAmount}\nStatus: ${t.status}`).join('\n\n');
    if (navigator.share) {
      navigator.share({
        title: 'Tenant Details',
        text: details
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(details);
      toast.success('Details copied to clipboard');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tenants</h2>
          <p className="text-gray-500 dark:text-gray-400">Manage your residents and their details.</p>
        </div>
        {['admin', 'manager', 'receptionist', 'caretaker'].includes(user?.role || '') && (
          <button
            onClick={() => {
              if (isAtLimit) {
                toast.error(`Limit reached! Your current plan (${currentPlan?.name}) allows only ${currentPlan?.maxTenants} tenants. Please upgrade your plan.`);
                return;
              }
              setIsAddModalOpen(true);
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all",
              isAtLimit && "opacity-50 cursor-not-allowed"
            )}
          >
            <Plus className="w-5 h-5" />
            Add Tenant
          </button>
        )}
      </div>

      {isNearLimit && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "p-4 rounded-2xl flex items-center justify-between gap-4 border",
            isAtLimit
              ? "bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20 text-rose-700 dark:text-rose-400"
              : "bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 text-amber-700 dark:text-amber-400"
          )}
        >
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5" />
            <p className="text-sm font-bold">
              {isAtLimit
                ? `Limit Reached: You have reached the maximum of ${currentPlan?.maxTenants} tenants for the ${currentPlan?.name} plan.`
                : `Approaching Limit: You have used ${currentTenantsCount}/${currentPlan?.maxTenants} tenant slots.`}
            </p>
          </div>
          <button
            onClick={() => window.location.href = '/subscription'}
            className={cn(
              "px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              isAtLimit
                ? "bg-rose-600 text-white hover:bg-rose-700"
                : "bg-amber-600 text-white hover:bg-amber-700"
            )}
          >
            Upgrade Plan
          </button>
        </motion.div>
      )}

      <div className="bg-white dark:bg-[#111111] p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm px-4 py-2.5 focus:ring-2 focus:ring-indigo-500/20 whitespace-nowrap text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="vacating">Vacating</option>
            <option value="vacated">Vacated</option>
            <option value="blacklisted">Blacklisted</option>
          </select>
          <button className="p-2.5 bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors shrink-0">
            <Filter className="w-5 h-5" />
          </button>
          <button
            onClick={handleDownload}
            className="p-2.5 bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors shrink-0"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="hidden md:block">
        <DataGrid 
          columns={columns}
          data={paginatedTenants}
          isLoading={isLoading}
          keyExtractor={(t: any) => t.id}
          totalCount={totalCount}
          page={page}
          onPageChange={setPage}
          limit={limit}
          emptyStateMessage="No tenants found matching your criteria"
          onRowClick={(t) => setDetailTenant(t)}
        />
      </div>

      <div className="block md:hidden">
        <TenantMobileList
          tenants={paginatedTenants}
          onManage={(t) => setDetailTenant(t)}
          onEdit={handleEditClick}
          onPaymentHistory={(t) => setViewingPayments(t)}
          onViewAgreement={(t) => setViewingAgreement(t)}
          onWhatsAppReminder={handleSendWhatsAppReminder}
          onDelete={(t) => setTenantToDelete(t)}
          onBulkDelete={handleBulkDelete}
          onBulkWhatsApp={handleBulkWhatsApp}
          onShareDetails={handleShareDetails}
        />
      </div>

      {/* Tenant Detail Panel */}
      <TenantDetailPanel
        tenant={detailTenant}
        onClose={() => setDetailTenant(null)}
        onEdit={handleEditClick}
        onDelete={(t) => setTenantToDelete(t)}
        onViewAgreement={(t) => setViewingAgreement(t)}
        onViewPayments={(t) => setViewingPayments(t)}
        onAuthorize={async (uid) => {
          await authorizeUser(uid);
          toast.success('Tenant login authorized successfully!');
          setDetailTenant(null);
        }}
        canEdit={['admin', 'manager', 'receptionist', 'caretaker'].includes(user?.role || '')}
        canDelete={['admin', 'manager'].includes(user?.role || '')}
      />

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
              className="relative w-full max-w-2xl bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto border border-white/5"
            >
              <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white dark:bg-[#111111] z-10">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingTenant ? 'Edit Tenant' : 'Add New Tenant'}
                </h3>
                <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                  <Plus className="w-6 h-6 rotate-45 text-gray-400" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Full Name</label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Email Address</label>
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Phone Number</label>
                    <input
                      required
                      type="tel"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      title="Please enter a valid 10-digit mobile number"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                      placeholder="9876543210"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Branch Invite Code</label>
                    <input
                      readOnly
                      type="text"
                      value={(formData as any).inviteCode || ''}
                      className="w-full px-4 py-2.5 bg-gray-100 dark:bg-white/10 border-none rounded-xl text-gray-500 dark:text-gray-400 cursor-not-allowed font-medium"
                      placeholder="No active invite code"
                    />
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 italic">This code is autofilled based on your branch settings.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Select Room</label>
                    <select
                      required
                      value={formData.roomId}
                      onChange={(e) => {
                        const room = rooms.find(r => r.id === e.target.value);
                        setFormData({ ...formData, roomId: e.target.value, rentAmount: room?.price || 0 });
                      }}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                    >
                      <option value="">Choose a room</option>
                      {rooms.length === 0 ? (
                        <option value="" disabled>No rooms available. Please add rooms first.</option>
                      ) : (
                        rooms.filter(room => {
                          if (editingTenant && editingTenant.roomId === room.id) return true;
                          const activeOccupancy = tenants.filter(t => t.roomId === room.id && t.status === 'active').length;
                          return activeOccupancy < room.totalBeds;
                        }).map(room => {
                          const activeOccupancy = tenants.filter(t => t.roomId === room.id && t.status === 'active').length;
                          return (
                            <option key={room.id} value={room.id}>
                              Room {room.roomNumber} ({room.type}) - {room.totalBeds - activeOccupancy} beds left
                            </option>
                          );
                        })
                      )}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Bed Number</label>
                    <select
                      required
                      value={formData.bedNumber}
                      onChange={(e) => setFormData({ ...formData, bedNumber: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                    >
                      {(() => {
                        const room = rooms.find(r => r.id === formData.roomId);
                        if (!room) return <option value="">Select room first</option>;
                        const beds = Array.from({ length: room.totalBeds }, (_, i) => i + 1);
                        return beds.map(bed => {
                          const isOccupied = tenants.some(t => 
                            t.roomId === room.id && 
                            t.bedNumber === bed && 
                            t.status === 'active' &&
                            t.id !== editingTenant?.id
                          );
                          return (
                            <option key={bed} value={bed} disabled={isOccupied}>
                              Bed {bed} {isOccupied ? '(Occupied)' : ''}
                            </option>
                          );
                        });
                      })()}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Rent Amount (₹)</label>
                    <input
                      required
                      type="number"
                      value={formData.rentAmount}
                      onChange={(e) => setFormData({ ...formData, rentAmount: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Deposit Amount (₹)</label>
                    <input
                      required
                      type="number"
                      value={formData.depositAmount}
                      onChange={(e) => setFormData({ ...formData, depositAmount: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                    />
                  </div>
                  {checkFeatureAccess('kyc') && (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Identity Verification</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select
                          value={kycDoc.type}
                          onChange={(e) => setKycDoc({ ...kycDoc, type: e.target.value })}
                          className="px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                        >
                          <option value="Aadhar Card">Aadhar Card</option>
                          <option value="PAN Card">PAN Card</option>
                          <option value="Voter ID">Voter ID</option>
                        </select>
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleFileChange}
                            className="hidden"
                            id="kyc-upload"
                          />
                          <label
                            htmlFor="kyc-upload"
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
                          >
                            <Upload className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                              {kycDoc.fileName || (editingTenant?.kycStatus === 'verified' ? 'Update Document' : 'Upload Document')}
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Rent Agreement</label>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={handleAgreementChange}
                        className="hidden"
                        id="agreement-upload"
                      />
                      <label
                        htmlFor="agreement-upload"
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
                      >
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {rentAgreement.fileName || (editingTenant?.rentAgreementUrl ? 'Update Agreement' : 'Upload Agreement')}
                        </span>
                      </label>
                    </div>
                  </div>
                  {editingTenant && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Status</label>
                      <div className="flex flex-wrap gap-2">
                        {['active', 'vacating', 'vacated', 'blacklisted'].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setFormData({ ...formData, status: s as any })}
                            className={cn(
                              "flex-1 py-2.5 rounded-xl text-[10px] font-bold transition-all",
                              formData.status === s
                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                                : "bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                            )}
                          >
                            {s?.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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
                    {editingTenant ? 'Update Tenant' : 'Add Tenant'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment History Modal */}
      <AnimatePresence>
        {viewingPayments && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingPayments(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col border border-white/5"
            >
              <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-white dark:bg-[#111111]">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Payment History</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{viewingPayments.name}</p>
                </div>
                <button onClick={() => setViewingPayments(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                  <Plus className="w-6 h-6 rotate-45 text-gray-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 sm:p-8">
                <div className="space-y-4">
                  {payments
                    .filter(p => p.tenantId === viewingPayments.id)
                    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                    .map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5"
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center",
                            payment.status === 'paid' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600" : "bg-amber-50 dark:bg-amber-500/10 text-amber-600"
                          )}>
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{format(parseISO(payment.month + '-01'), 'MMMM yyyy')}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Paid on {payment.paymentDate}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">₹{payment.totalAmount.toLocaleString()}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{payment.method}</p>
                        </div>
                      </div>
                    ))}
                  {payments.filter(p => p.tenantId === viewingPayments.id).length === 0 && (
                    <div className="text-center py-12">
                      <History className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No payment history found for this tenant.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Login Modal */}
      <AnimatePresence>
        {tenantForLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTenantForLogin(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden border border-white/5"
            >
              <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-white dark:bg-[#111111]">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create Login</h3>
                <button onClick={() => setTenantForLogin(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                  <Plus className="w-6 h-6 rotate-45 text-gray-400" />
                </button>
              </div>
              <div className="p-6 sm:p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Username / Email</label>
                  <input
                    type="text"
                    readOnly
                    value={tenantForLogin.email}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-gray-500 dark:text-gray-400"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Set Password (Optional)</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                    placeholder="Leave blank for tenant to set"
                  />
                  <p className="text-[10px] text-gray-500">If left blank, the tenant must set their password during their first login.</p>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setTenantForLogin(null)}
                    className="px-6 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateLogin}
                    className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                  >
                    Create Login
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rent Agreement Modal */}
      <AnimatePresence>
        {viewingAgreement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingAgreement(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-white/5"
            >
              <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-white dark:bg-[#111111]">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Rent Agreement</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{viewingAgreement.name}</p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={viewingAgreement.rentAgreementUrl}
                    download={`Agreement_${viewingAgreement.name}.pdf`}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors text-gray-400"
                  >
                    <Download className="w-6 h-6" />
                  </a>
                  <button onClick={() => setViewingAgreement(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                    <Plus className="w-6 h-6 rotate-45 text-gray-400" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden p-4 sm:p-8 bg-gray-100 dark:bg-black/20">
                {viewingAgreement.rentAgreementUrl?.startsWith('data:application/pdf') ? (
                  <iframe
                    src={viewingAgreement.rentAgreementUrl}
                    className="w-full h-full rounded-xl border-none"
                    title="Rent Agreement PDF"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center overflow-auto">
                    <img
                      src={viewingAgreement.rentAgreementUrl}
                      alt="Rent Agreement"
                      className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
