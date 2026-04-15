import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Tenant, TenantStatus } from '../types';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
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
  Calendar,
  Zap,
  CreditCard,
  Receipt,
  Clock,
  LogOut,
  CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePaginatedData } from '../hooks/usePaginatedData';
import { DataGrid, ColumnDef } from '../components/DataGrid';
import { DropdownMenu, DropdownItem } from '../components/DropdownMenu';
import { TenantDetailPanel } from '../components/TenantDetailPanel';
import { TenantMobileList } from '../components/TenantMobileList';
import { RentAgreementGeneratorModal } from '../components/RentAgreementGeneratorModal';
import { cn } from '../utils';
import { getTenantElectricityShare } from '../utils/electricityUtils';
import toast from 'react-hot-toast';

export const TenantsPage = () => {
  const navigate = useNavigate();
  const { user, users, register, updateUser, authorizeUser } = useAuth();
  const location = useLocation();
  const { tenants, rooms, branches, addTenant, updateTenant, deleteTenant, checkFeatureAccess, currentPlan, uploadVerifiedKYC, kycs, userInvites, pgConfig, requestVacating, completeCheckout } = useApp();
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
  const [isAgreementGeneratorOpen, setIsAgreementGeneratorOpen] = useState(false);
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
  const [checkoutConfirmModal, setCheckoutConfirmModal] = useState<{ isOpen: boolean, tenantId: string, tenantName: string } | null>(null);
  const [adminKycFile, setAdminKycFile] = useState<{ type: string; file?: File; url?: string; fileName: string } | null>(null);
  const [adminKycType, setAdminKycType] = useState('Aadhar Card');
  const [detailTenant, setDetailTenant] = useState<any | null>(null);
  const [tenantElectricityShare, setTenantElectricityShare] = useState<{ 
    baseShare: number; 
    acShare: number; 
    total: number; 
    month: string; 
    billUrl?: string;
    costPerUnit?: number;
    unitsConsumed?: number;
  } | null>(null);
  const { payments } = useApp();

  // Server-side paginated hook — fetches ONLY 10 records at a time
  const { data: paginatedTenants, totalCount, isLoading, page, setPage, limit, refetch } = usePaginatedData<any>({
    table: 'tenants',
    select: '*, rooms!tenants_room_id_fkey(room_number), kyc_documents!kyc_documents_tenant_id_fkey(document_url, status)',
    ilikeFilters: searchTerm ? { name: searchTerm, email: searchTerm } : undefined,
    filters: filterStatus !== 'all' ? { status: filterStatus } : undefined
  });

  const columns: ColumnDef<any>[] = React.useMemo(() => [
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
            {t.kyc_documents && t.kyc_documents.length > 0 && t.kyc_status === 'verified' && (
              <DropdownItem icon={<FileText className="w-4 h-4" />} label="View KYC" onClick={() => setViewingKyc(t)} />
            )}
            {canSendWhatsApp && (
              <DropdownItem icon={<MessageCircle className="w-4 h-4" />} label="WhatsApp Reminder" onClick={() => handleSendWhatsAppReminder(t)} />
            )}
            {['admin', 'manager', 'receptionist'].includes(user?.role || '') && t.status === 'active' && (
              <DropdownItem 
                icon={<LogOut className="w-4 h-4" />} 
                label="Request Vacate" 
                onClick={() => {
                  if (window.confirm(`Start 30-day notice for ${t.name}?`)) {
                    requestVacating(t.id);
                    refetch();
                  }
                }} 
              />
            )}
            {['admin', 'manager'].includes(user?.role || '') && t.status === 'vacating' && (
              <DropdownItem 
                icon={<CheckCircle className="w-4 h-4 text-emerald-500" />} 
                label="Confirm Checkout" 
                onClick={() => setCheckoutConfirmModal({ isOpen: true, tenantId: t.id, tenantName: t.name })} 
              />
            )}
            {['admin', 'manager'].includes(user?.role || '') && (
              <DropdownItem icon={<Trash2 className="w-4 h-4" />} label="Delete Tenant" onClick={() => setTenantToDelete(t)} danger />
            )}
          </DropdownMenu>
        </div>
      )
    }
  ], [user?.role, canSendWhatsApp, tenants]);


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
    status: 'onboarding',
    vacatingStatus: 'active',
    kycStatus: 'unsubmitted',
    inviteCode: '',
    tokenAmount: 0,
    tokenStatus: 'pending',
    depositStatus: 'pending',
    moveInDate: '',
    vacatingDate: ''
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

  const [kycDoc, setKycDoc] = useState<{ type: string, file?: File, url?: string, fileName: string }>({
    type: 'Aadhar Card',
    fileName: ''
  });

  const [rentAgreement, setRentAgreement] = useState<{ file?: File, url?: string, fileName: string }>({
    fileName: ''
  });
  const [viewingKyc, setViewingKyc] = useState<any | null>(null);

  const handleSendWhatsAppReminder = (tenant: any) => {
    const rentAmount = tenant.rent_amount ?? tenant.rentAmount;
    const message = `*Rent Reminder*\n\nHi ${tenant.name}, this is a friendly reminder that your rent of ₹${rentAmount} is due. Please ignore if already paid.`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${tenant.phone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  useEffect(() => {
    if (detailTenant) {
      const currentMonth = format(new Date(), 'yyyy-MM');
      
      // Find the room to get the meterGroupId
      const room = rooms.find(r => r.id === (detailTenant.roomId || detailTenant.room_id));
      if (!room?.meterGroupId) {
        setTenantElectricityShare(null);
        return;
      }

      // Get ALL active tenants in ALL rooms belonging to this Flat
      const flatTenants = tenants.filter(t => {
        const r = rooms.find(rm => rm.id === t.roomId || rm.id === (t as any).room_id);
        return r?.meterGroupId === room.meterGroupId && t.status === 'active';
      }).map(t => ({
        id: t.id, 
        name: t.name,
        roomId: t.roomId || (t as any).room_id || '',
        is_ac_user: rooms.find(r => r.id === (t.roomId || (t as any).room_id))?.type === 'AC' || false,
        isAcUser: rooms.find(r => r.id === (t.roomId || (t as any).room_id))?.type === 'AC' || false
      }));

      getTenantElectricityShare(room.meterGroupId, currentMonth, flatTenants, detailTenant.id, rooms)
        .then(share => {
          if (share) {
            setTenantElectricityShare({
              baseShare: share.baseShare,
              acShare: share.acShare,
              total: share.total,
              month: currentMonth,
              costPerUnit: share.costPerUnit,
              unitsConsumed: share.unitsConsumed,
            });
          } else {
            setTenantElectricityShare(null);
          }
        });
    } else {
      setTenantElectricityShare(null);
    }
  }, [detailTenant, tenants, rooms]);

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
      status: tenant.status || 'onboarding',
      vacatingStatus: tenant.vacatingStatus || tenant.vacating_status || 'active',
      kycStatus: tenant.kycStatus || tenant.kyc_status || 'unsubmitted',
      userId: tenant.userId || tenant.user_id || undefined,
      rentAgreementUrl: tenant.rentAgreementUrl || tenant.rent_agreement_url || undefined,
      tokenAmount: tenant.tokenAmount ?? tenant.token_amount ?? 0,
      tokenStatus: tenant.tokenStatus || tenant.token_status || 'pending',
      depositStatus: tenant.depositStatus || tenant.deposit_status || 'pending',
      moveInDate: tenant.moveInDate || tenant.move_in_date || '',
      vacatingDate: tenant.vacatingDate || tenant.vacating_date || '',
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
      status: 'onboarding',
      vacatingStatus: 'active',
      kycStatus: 'unsubmitted',
      isAcUser: false,
      moveInDate: ''
    });
    setKycDoc({ type: 'Aadhar Card', fileName: '' });
    setRentAgreement({ fileName: '' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        toast.error('File size too large! Please upload a file smaller than 1.5MB.');
        return;
      }
      setKycDoc({
        ...kycDoc,
        file,
        fileName: file.name,
        url: URL.createObjectURL(file)
      });
    }
  };

  const handleAgreementChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        toast.error('File size too large! Please upload a file smaller than 1.5MB.');
        return;
      }
      setRentAgreement({
        file,
        fileName: file.name,
        url: URL.createObjectURL(file)
      });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.tokenStatus === 'paid' && !formData.roomId) {
      toast.error('Please select a room for the tenant since token is paid.');
      return;
    }

    const room = rooms.find(r => r.id === formData.roomId);
    if (room) {
      // For ACTIVE, we count everyone [active, onboarding, vacating]
      // For ONBOARDING, we only count [active, onboarding] as vacating tenants will be gone by then
      const statusesToCount = formData.status === 'active' 
        ? ['active', 'onboarding', 'vacating']
        : ['active', 'onboarding'];
        
      const occupants = tenants.filter(t => 
        t.roomId === formData.roomId && 
        statusesToCount.includes(t.status) && 
        t.id !== editingTenant?.id
      ).length;

      if (occupants >= room.totalBeds) {
        toast.error(`Cannot assign tenant. Room ${room.roomNumber} is at capacity for ${formData.status.toUpperCase()} tenants.`);
        return;
      }
    }

    if (formData.roomId && formData.bedNumber) {
      const existingAssignment = tenants.find(t => 
        t.roomId === formData.roomId && 
        t.bedNumber === formData.bedNumber && 
        ['active', 'onboarding'].includes(t.status) &&
        t.id !== editingTenant?.id
      );

      if (existingAssignment) {
        toast.error(`This bed is already allocated to ${existingAssignment.name} (${existingAssignment.status})`);
        return;
      }
      
      // Check for overlap with vacating tenants
      const vacatingTenant = tenants.find(t => 
        t.roomId === formData.roomId && 
        t.bedNumber === formData.bedNumber && 
        t.status === 'vacating' &&
        t.id !== editingTenant?.id
      );

      if (vacatingTenant && vacatingTenant.vacatingDate && formData.moveInDate) {
        if (formData.moveInDate < vacatingTenant.vacatingDate) {
          toast.error(`Move-in date cannot be before bed vacating date (${vacatingTenant.vacatingDate}).`);
          return;
        }
      }
    }
    
    const finalFormData = { 
      ...formData,
      moveInDate: formData.moveInDate || null,
      vacatingDate: formData.vacatingDate || null
    };

    // Date Validations (Internal consistency for the same tenant)
    if (finalFormData.status === 'vacating' && finalFormData.moveInDate && finalFormData.vacatingDate) {
      if (finalFormData.moveInDate >= finalFormData.vacatingDate) {
        toast.error('Move-in date must be before the vacating date.');
        return;
      }
    }
    
    if (finalFormData.joiningDate && finalFormData.moveInDate) {
      if (finalFormData.joiningDate > finalFormData.moveInDate) {
        // Automaticaly align joining date with move-in date for past entries
        finalFormData.joiningDate = finalFormData.moveInDate;
      }
    }

    if (finalFormData.name && (finalFormData.roomId || finalFormData.tokenStatus === 'pending')) {
      if (editingTenant) {
        await updateTenant(
          editingTenant.id,
          finalFormData,
          kycDoc.file || kycDoc.url ? { type: kycDoc.type, file: kycDoc.file, url: kycDoc.url } : undefined,
          rentAgreement.file || rentAgreement.url ? { file: rentAgreement.file, url: rentAgreement.url } : undefined
        );
        if (editingTenant.userId) {
          updateUser(editingTenant.userId, { name: formData.name, email: formData.email, phone: formData.phone });
        }
      } else {
        await addTenant(
          finalFormData as Omit<Tenant, 'id'>,
          kycDoc.file || kycDoc.url ? { type: kycDoc.type, file: kycDoc.file, url: kycDoc.url } : undefined,
          rentAgreement.file || rentAgreement.url ? { file: rentAgreement.file, url: rentAgreement.url } : undefined
        );
      }
      handleCloseModal();
      refetch();
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    if (window.confirm(`Are you sure you want to delete ${ids.length} selected tenants?`)) {
      for (const id of ids) {
        await deleteTenant(id);
      }
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
            style={{ background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' }}
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
            onClick={() => navigate('/subscription')}
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
          refetch();
        }}
        onUpdate={refetch}
        electricityShare={tenantElectricityShare}
        canEdit={['admin', 'manager', 'receptionist', 'caretaker'].includes(user?.role || '')}
        canDelete={['admin', 'manager'].includes(user?.role || '')}
      />

      <RentAgreementGeneratorModal 
         isOpen={isAgreementGeneratorOpen}
         onClose={() => setIsAgreementGeneratorOpen(false)}
         tenant={editingTenant || undefined}
         user={user}
         branch={branches.find((b: any) => b.id === (editingTenant?.branchId || user?.branchId))}
         pgConfig={pgConfig}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {tenantToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTenantToDelete(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#111111] rounded-3xl shadow-2xl p-6 sm:p-8 text-center border border-white/5"
            >
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8 text-rose-500" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Delete Tenant?</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-gray-900 dark:text-white">{tenantToDelete.name}</span>? This action cannot be undone and will permanently erase all associated data.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setTenantToDelete(null)}
                  className="flex-1 py-4 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white rounded-2xl font-bold hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await deleteTenant(tenantToDelete.id);
                    setTenantToDelete(null);
                    refetch();
                  }}
                  className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-bold shadow-xl shadow-rose-600/20 hover:bg-rose-700 transition-all"
                >
                  Delete Tenant
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tenant Status</label>
                    <div className="flex flex-wrap gap-2">
                      {(editingTenant 
                        ? ['onboarding', 'active', 'vacating', 'vacated', 'blacklisted'] 
                        : ['onboarding', 'active']
                      ).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            const today = new Date().toISOString().split('T')[0];
                            setFormData({ 
                              ...formData, 
                              status: s as any,
                              // If switched to Active, default move-in date to today
                              moveInDate: s === 'active' ? today : formData.moveInDate 
                            });
                          }}
                          className={cn(
                            "flex-1 py-2.5 rounded-xl text-[10px] font-bold transition-all",
                            formData.status === s
                              ? "text-white shadow-lg"
                              : "bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                          )}
                          style={formData.status === s ? { background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)', boxShadow: `0 10px 15px -3px ${pgConfig?.primaryColor}20` } : {}}
                        >
                          {s?.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
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
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Deposit Amount (₹)</label>
                    <input
                      required
                      type="number"
                      value={formData.depositAmount}
                      onChange={(e) => setFormData({ ...formData, depositAmount: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Deposit Status</label>
                    <select
                      value={formData.depositStatus || 'pending'}
                      onChange={(e) => setFormData({ ...formData, depositStatus: e.target.value as any })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white capitalize"
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </div>
                  {formData.status === 'onboarding' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Token Amount (₹)</label>
                        <input
                          type="number"
                          value={formData.tokenAmount || 0}
                          onChange={(e) => setFormData({ ...formData, tokenAmount: Number(e.target.value) })}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Token Status</label>
                        <select
                          value={formData.tokenStatus || 'pending'}
                          onChange={(e) => setFormData({ ...formData, tokenStatus: e.target.value as any })}
                          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white capitalize"
                        >
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="refunded">Refunded</option>
                        </select>
                        {(() => {
                           const todayStr = new Date().toISOString().split('T')[0];
                           if (formData.status === 'onboarding' && formData.tokenStatus === 'paid' && formData.moveInDate && formData.moveInDate <= todayStr) {
                             setTimeout(() => setFormData(prev => ({ ...prev, status: 'active' })), 0);
                           }
                           return null;
                        })()}
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Select Room</label>
                    <select
                      required={formData.status === 'active' || formData.tokenStatus === 'paid'}
                      disabled={formData.status === 'onboarding' && formData.tokenStatus !== 'paid'}
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
                          const occupiedCount = tenants.filter(t => 
                            t.roomId === room.id && 
                            ['active', 'onboarding'].includes(t.status) &&
                            t.id !== editingTenant?.id
                          ).length;
                          
                          // If status is active, room must have space excluding vacating tenants
                          // If status is onboarding, room must have space counting only active/onboarding
                          return occupiedCount < room.totalBeds;
                        }).map(room => {
                          const occupants = tenants.filter(t => 
                            t.roomId === room.id && 
                            ['active', 'onboarding', 'vacating'].includes(t.status) &&
                            t.id !== editingTenant?.id
                          );
                          const occupiedCount = occupants.filter(t => ['active', 'onboarding'].includes(t.status)).length;
                          const vacatingCount = occupants.filter(t => t.status === 'vacating').length;
                          const availableBeds = room.totalBeds - occupiedCount;

                          return (
                            <option key={room.id} value={room.id}>
                              Room {room.roomNumber} ({room.type}) - {availableBeds} beds avail {vacatingCount > 0 ? `(${vacatingCount} vacating)` : ''}
                            </option>
                          );
                        })
                      )}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Bed Number</label>
                    <select
                      required={formData.status === 'active' || formData.tokenStatus === 'paid'}
                      disabled={!formData.roomId || (formData.status === 'onboarding' && formData.tokenStatus !== 'paid')}
                      value={formData.bedNumber}
                      onChange={(e) => {
                        const bed = Number(e.target.value);
                        let moveInDate = formData.moveInDate;

                        // If onboarding and selecting a vacating bed, suggest the vacating date as move-in date
                        if (formData.status === 'onboarding') {
                          const existingTenantInBed = tenants.find(t => 
                            t.roomId === formData.roomId && 
                            t.bedNumber === bed && 
                            t.status === 'vacating'
                          );
                          if (existingTenantInBed?.vacatingDate) {
                            moveInDate = existingTenantInBed.vacatingDate;
                          }
                        }

                        setFormData({ ...formData, bedNumber: bed, moveInDate });
                      }}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white disabled:opacity-50"
                    >
                      {(() => {
                        const room = rooms.find(r => r.id === formData.roomId);
                        if (!room) return <option value="">Select room first</option>;
                        const beds = Array.from({ length: room.totalBeds }, (_, i) => i + 1);
                        return beds.map(bed => {
                          const existingTenantInBed = tenants.find(t => 
                            t.roomId === room.id && 
                            t.bedNumber === bed && 
                            ['active', 'onboarding', 'vacating'].includes(t.status) &&
                            t.id !== editingTenant?.id
                          );

                          const isOccupied = existingTenantInBed && ['active', 'onboarding'].includes(existingTenantInBed.status);
                          const isVacating = existingTenantInBed && existingTenantInBed.status === 'vacating';
                          
                              // All statuses can now select vacating beds in the dropdown. 
                              // Date checks will be enforced on submission.
                              const isAllowed = true; 

                              if (!isAllowed) return null;

                          return (
                            <option key={bed} value={bed}>
                              Bed {bed} {isVacating ? '(Vacating)' : '(Vacant)'}
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
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Move-in Date</label>
                    <input
                      required
                      type="date"
                      value={(formData as any).moveInDate || ''}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        const todayStr = new Date().toISOString().split('T')[0];
                        let newStatus = formData.status;
                        
                        // Auto-activate if date is today/past and token is paid
                        if (formData.status === 'onboarding' && formData.tokenStatus === 'paid' && newDate && newDate <= todayStr) {
                          newStatus = 'active';
                        }
                        
                        setFormData({ ...formData, moveInDate: newDate, status: newStatus } as any);
                      }}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white disabled:opacity-50"
                    />
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 italic">Expected move-in date. Mandatory for both Onboarding and Active.</p>
                  </div>
                  {formData.status === 'vacating' && (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Vacating Date</label>
                      <input
                        required
                        type="date"
                        value={(formData as any).vacatingDate || ''}
                        onChange={(e) => setFormData({ ...formData, vacatingDate: e.target.value } as any)}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                      />
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 italic">Expected date of vacating. Mandatory for Vacating status.</p>
                    </div>
                  )}
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
                    <div className="flex gap-2 relative">
                      <div className="flex-1">
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
                      {editingTenant && (
                        <button
                          type="button"
                          onClick={() => setIsAgreementGeneratorOpen(true)}
                          className="px-4 py-2.5 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-colors shrink-0"
                        >
                          <FileText className="w-4 h-4" />
                          Generate
                        </button>
                      )}
                    </div>
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
                    className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                    style={{ background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' }}
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
                        className="flex flex-col p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 gap-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center",
                              payment.paymentType === 'electricity' 
                                ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600" 
                                : "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600"
                            )}>
                              {payment.paymentType === 'electricity' ? <Zap className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-gray-900 dark:text-white">
                                  {format(parseISO(payment.month + '-01'), 'MMMM yyyy')}
                                </p>
                                <span className={cn(
                                  "text-[9px] font-black px-1.5 py-0.5 rounded-lg uppercase tracking-wider",
                                  payment.paymentType === 'electricity' 
                                    ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400"
                                    : "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400"
                                )}>
                                  {payment.paymentType === 'electricity' ? 'Electricity' : 'Rent'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Paid on {payment.paymentDate}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-900 dark:text-white">₹{payment.totalAmount.toLocaleString()}</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-tighter">{payment.method}</p>
                          </div>
                        </div>

                        {payment.paymentType === 'electricity' && (
                          <div className="flex items-center gap-4 pt-3 border-t border-gray-200/50 dark:border-white/5 mt-1 text-[10px] font-bold text-gray-500 dark:text-gray-400">
                             <div className="flex items-center gap-1.5">
                               <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                               Base: ₹{(payment.baseShare || (payment as any).base_share || 0).toLocaleString()}
                             </div>
                             <div className="flex items-center gap-1.5">
                               <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                               AC: ₹{(payment.acShare || (payment as any).ac_share || 0).toLocaleString()}
                             </div>
                             {(payment.unitsConsumed || (payment as any).units_consumed) > 0 && (
                               <div className="flex items-center gap-1.5 ml-auto text-indigo-500">
                                 <Zap className="w-3 h-3" />
                                 {(payment.unitsConsumed || (payment as any).units_consumed)} Units
                               </div>
                             )}
                          </div>
                        )}
                        
                        {payment.lateFee > 0 && (
                          <div className="flex items-center gap-2 text-[10px] font-bold text-rose-500 mt-1">
                             <Clock className="w-3 h-3" />
                             Includes ₹{payment.lateFee} late fee
                          </div>
                        )}
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
                
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-700/20 p-4 rounded-xl flex gap-3 text-amber-700 dark:text-amber-400">
                  <Shield className="w-5 h-5 shrink-0" />
                  <p className="text-xs font-medium">
                    The tenant will be assigned a default password of <strong>123456</strong>. They will be forced to set a new password during their first login.
                  </p>
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
                    href={viewingAgreement.rentAgreementUrl || (viewingAgreement as any).rent_agreement_url}
                    download={`Agreement_${viewingAgreement.name}.pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
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
                {String(viewingAgreement.rentAgreementUrl || (viewingAgreement as any).rent_agreement_url)?.startsWith('data:application/pdf') || String(viewingAgreement.rentAgreementUrl || (viewingAgreement as any).rent_agreement_url)?.toLowerCase().endsWith('.pdf') ? (
                  <iframe
                    src={viewingAgreement.rentAgreementUrl || (viewingAgreement as any).rent_agreement_url}
                    className="w-full h-full rounded-xl border-none"
                    title="Rent Agreement PDF"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center overflow-auto">
                    <img
                      src={viewingAgreement.rentAgreementUrl || (viewingAgreement as any).rent_agreement_url}
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

      {/* View KYC Modal */}
      <AnimatePresence>
        {viewingKyc && viewingKyc.kyc_documents?.[0] && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingKyc(null)}
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
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Tenant KYC Document</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{viewingKyc.kyc_documents[0].document_type}</p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={viewingKyc.kyc_documents[0].document_url}
                    download={`KYC_${viewingKyc.name}.pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors text-gray-400"
                  >
                    <Download className="w-6 h-6" />
                  </a>
                  <button onClick={() => setViewingKyc(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                    <Plus className="w-6 h-6 rotate-45 text-gray-400" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden p-4 sm:p-8 bg-gray-100 dark:bg-black/20">
                {viewingKyc.kyc_documents[0].document_url?.startsWith('data:application/pdf') || viewingKyc.kyc_documents[0].document_url?.toLowerCase().endsWith('.pdf') ? (
                  <iframe
                    src={viewingKyc.kyc_documents[0].document_url}
                    className="w-full h-full rounded-xl border-none"
                    title="KYC Document PDF"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center overflow-auto">
                    <img
                      src={viewingKyc.kyc_documents[0].document_url}
                      alt="KYC Document"
                      className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Upload KYC Modal */}
      <AnimatePresence>
        {kycUploadTenant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setKycUploadTenant(null); setAdminKycFile(null); }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden border border-white/5"
            >
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Admin Upload KYC</h3>
                  <p className="text-sm text-gray-500">For {kycUploadTenant.name}</p>
                </div>
                <button onClick={() => { setKycUploadTenant(null); setAdminKycFile(null); }} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                  <Plus className="w-6 h-6 rotate-45 text-gray-400" />
                </button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (kycUploadTenant && adminKycFile?.file) {
                  await uploadVerifiedKYC(kycUploadTenant.id, adminKycType, adminKycFile.file);
                  setKycUploadTenant(null);
                  setAdminKycFile(null);
                  refetch();
                }
              }} className="p-6 space-y-6">
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Upload a valid identity document (Aadhar Card, PAN Card, etc.) to verify this tenant's identity.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <select
                      value={adminKycType}
                      onChange={(e) => setAdminKycType(e.target.value)}
                      className="px-4 py-3 bg-gray-50 dark:bg-white/5 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                    >
                      <option value="Aadhar Card">Aadhar Card</option>
                      <option value="PAN Card">PAN Card</option>
                      <option value="Voter ID">Voter ID</option>
                      <option value="Passport">Passport</option>
                      <option value="Driving License">Driving License</option>
                    </select>
                    <div className="relative">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl hover:border-indigo-500/50 transition-colors cursor-pointer bg-gray-50/50 dark:bg-white/[0.02]">
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 text-center px-2">
                          {adminKycFile ? 'Document Selected' : 'Upload New KYC'}
                        </span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                toast.error('File size must be less than 5MB');
                                return;
                              }
                              setAdminKycFile({ type: adminKycType, file, fileName: file.name, url: URL.createObjectURL(file) });
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
                {adminKycFile && (
                  <button
                    type="submit"
                    className="w-full py-4 text-white rounded-2xl font-bold shadow-lg transition-all"
                    style={{ background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)', boxShadow: `0 10px 15px -3px ${pgConfig?.primaryColor}20` }}
                  >
                    Upload & Verify Document
                  </button>
                )}
              </form>
            </motion.div>
          </div>
        )}
        {checkoutConfirmModal?.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCheckoutConfirmModal(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden border border-white/5 p-6 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
                Final Check-out
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                Finalize checkout for <span className="font-bold text-gray-900 dark:text-white">{checkoutConfirmModal.tenantName}</span>? <br/>Bed will be freed.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setCheckoutConfirmModal(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await completeCheckout(checkoutConfirmModal.tenantId);
                    setCheckoutConfirmModal(null);
                    refetch();
                  }}
                  className="flex-1 px-4 py-2.5 bg-rose-600 text-white font-bold rounded-xl shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition-all"
                >
                  Finalize
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

