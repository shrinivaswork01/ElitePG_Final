import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { Tenant, Room, Payment, Complaint, Employee, KYCData, Announcement, SalaryPayment, Task, PGConfig, PGBranch, RolePermissions, SubscriptionPlan, AppFeature, KYCStatus, UserInvite, MeterGroup } from '../types';
import { uploadToSupabase, deleteFromSupabase } from '../utils/storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface AppContextType {
  tenants: Tenant[];
  rooms: Room[];
  meterGroups: MeterGroup[];
  payments: Payment[];
  complaints: Complaint[];
  employees: Employee[];
  kycs: KYCData[];
  announcements: Announcement[];
  salaryPayments: SalaryPayment[];
  tasks: Task[];
  pgConfig: PGConfig | null;
  branches: PGBranch[];
  subscriptionPlans: SubscriptionPlan[];
  userInvites: UserInvite[];
  superSignatureUrl: string | null;

  // Actions
  addTenant: (tenant: Omit<Tenant, 'id' | 'branchId'>, kycDoc?: { type: string, file?: File, url?: string }, rentAgreementDoc?: { file?: File, url?: string }) => Promise<void>;
  updateTenant: (id: string, updates: Partial<Tenant>, kycDoc?: { type: string, file?: File, url?: string }, rentAgreementDoc?: { file?: File, url?: string }) => Promise<void>;
  deleteTenant: (id: string) => Promise<void>;
  requestVacating: (tenantId: string) => Promise<void>;
  completeCheckout: (tenantId: string) => Promise<void>;

  addRoom: (room: Omit<Room, 'id' | 'branchId'>) => Promise<void>;
  updateRoom: (id: string, updates: Partial<Room>) => Promise<void>;
  deleteRoom: (id: string) => Promise<void>;

  addMeterGroup: (meterGroup: Omit<MeterGroup, 'id' | 'branchId' | 'createdAt'>) => Promise<void>;
  updateMeterGroup: (id: string, updates: Partial<MeterGroup>) => Promise<void>;
  deleteMeterGroup: (id: string) => Promise<void>;

  addPayment: (payment: Omit<Payment, 'id' | 'branchId'>) => Promise<void>;
  updatePayment: (id: string, updates: Partial<Payment>) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;

  addComplaint: (complaint: Omit<Complaint, 'id' | 'branchId'>) => Promise<void>;
  updateComplaint: (id: string, updates: Partial<Complaint>) => Promise<void>;
  deleteComplaint: (id: string) => Promise<void>;

  addEmployee: (employee: Omit<Employee, 'id' | 'kycStatus' | 'branchId'>, kycDoc?: { type: string, file?: File, url?: string }) => Promise<boolean>;
  updateEmployee: (id: string, updates: Partial<Employee>, kycDoc?: { type: string, file?: File, url?: string }) => Promise<boolean>;
  deleteEmployee: (id: string) => Promise<void>;

  updateKYC: (id: string, updates: Partial<KYCData>) => Promise<void>;
  deleteKYC: (id: string) => Promise<void>;
  uploadVerifiedKYC: (tenantId: string, docType: string, fileOrUrl: File | string) => Promise<void>;

  addAnnouncement: (announcement: Omit<Announcement, 'id' | 'branchId'>) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;

  addSalaryPayment: (payment: Omit<SalaryPayment, 'id' | 'branchId'>) => Promise<void>;
  updateSalaryPayment: (id: string, updates: Partial<SalaryPayment>) => Promise<void>;
  deleteSalaryPayment: (id: string) => Promise<void>;

  addTask: (task: Omit<Task, 'id' | 'branchId'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  updatePGConfig: (updates: Partial<PGConfig>) => Promise<void>;

  addBranch: (branch: Omit<PGBranch, 'id' | 'createdAt' | 'planId' | 'subscriptionStatus' | 'subscriptionEndDate'>) => Promise<void>;
  updateBranch: (id: string, updates: Partial<PGBranch>) => Promise<void>;
  deleteBranch: (id: string) => Promise<void>;

  addSubscriptionPlan: (plan: Omit<SubscriptionPlan, 'id'>) => Promise<void>;
  updateSubscriptionPlan: (id: string, updates: Partial<SubscriptionPlan>) => Promise<void>;
  deleteSubscriptionPlan: (id: string) => Promise<void>;
  updateBranchSubscription: (branchId: string, planId: string, status: 'active' | 'expired' | 'trial', endDate: string, razorpayCustomerId?: string, razorpaySubscriptionId?: string) => Promise<void>;
  checkFeatureAccess: (feature: AppFeature) => boolean;
  fetchData: () => Promise<void>;

  // Stats
    getStats: () => {
    totalTenants: number;
    verifiedTenants: number;
    pendingKYC: number;
    vacantBeds: number;
    monthlyRevenue: number;
    openComplaints: number;
    totalTasks: number;
    pendingTasks: number;
    revenueHistory: { name: string, revenue: number }[];
    occupancyByFloor: { name: string, occupied: number, total: number }[];
  };
  currentBranch: PGBranch | undefined;
  currentPlan: SubscriptionPlan | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { register, user } = useAuth();

  const [data, setData] = useState<any>(() => {
    const cached = localStorage.getItem('elite_pg_cached_data');
    const defaults = {
      tenants: [],
      rooms: [],
      meterGroups: [],
      payments: [],
      complaints: [],
      employees: [],
      kycs: [],
      announcements: [],
      salaryPayments: [],
      tasks: [],
      pgConfigs: [],
      branches: [],
      subscriptionPlans: [],
      userInvites: [],
      superSignatureUrl: null
    };

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Merge with defaults to ensure all keys like meterGroups exist
        return { ...defaults, ...parsed };
      } catch (e) {
        console.error('Failed to parse cached data', e);
      }
    }
    return defaults;
  });

  const userId = user?.id;
  const userRole = user?.role;
  const userBranchId = user?.branchId;

  const fetchData = useCallback(async () => {
    // We only fetch data if user is logged in
    if (!userId) {
      setData({ tenants: [], rooms: [], payments: [], complaints: [], employees: [], kycs: [], announcements: [], salaryPayments: [], tasks: [], pgConfigs: [], branches: [], subscriptionPlans: [], userInvites: [], superSignatureUrl: null });
      localStorage.removeItem('elite_pg_cached_data');
      return;
    }

    try {
      const isSuper = userRole === 'super';
      const isTenant = userRole === 'tenant';
      const branchId = userBranchId;
      const branchFilter = isSuper ? {} : { branch_id: branchId };

      let activeTenantId = null;
      if (isTenant) {
        const { data: tenant } = await supabase.from('tenants').select('id').eq('user_id', userId).maybeSingle();
        activeTenantId = tenant?.id;
      }

      const tenantFilter = isTenant ? { user_id: userId } : branchFilter;
      const paymentFilter = isTenant ? { tenant_id: activeTenantId } : branchFilter;
      const complaintFilter = isTenant ? { tenant_id: activeTenantId } : branchFilter;
      const kycFilter = isTenant ? { tenant_id: activeTenantId } : branchFilter;

      const [
        { data: branches },
        { data: plans },
        { data: tenants },
        { data: rooms },
        { data: meterGroups },
        { data: payments },
        { data: complaints },
        { data: employees },
        { data: kycs },
        { data: announcements },
        { data: salaryPayments },
        { data: tasks },
        { data: pgConfigs },
        { data: userInvites },
        { data: superUserSignature }
      ] = await Promise.all([
        supabase.from('pg_branches').select('*').match(isSuper ? {} : { id: branchId }),
        supabase.from('subscription_plans').select('*'),
        supabase.from('tenants').select('*, users(is_authorized)').match(tenantFilter),
        supabase.from('rooms').select('*, meter_groups(id, name, floor, branch_id, created_at)').match(branchFilter),
        supabase.from('meter_groups').select('*').match(branchFilter),
        supabase.from('payments').select('*').match(paymentFilter),
        supabase.from('complaints').select('*').match(complaintFilter),
        supabase.from('employees').select('*').match(branchFilter),
        supabase.from('kyc_documents').select('*').match(kycFilter),
        supabase.from('announcements').select('*').match(branchFilter),
        supabase.from('salary_payments').select('*').match(branchFilter),
        supabase.from('tasks').select('*').match(branchFilter),
        supabase.from('pg_configs').select('*').match(branchFilter),
        supabase.from('user_invites').select('*').match(branchFilter),
        supabase.from('users').select('signature_url').eq('role', 'super').maybeSingle()
      ]);

      const newData = {
        branches: (branches || []).map(b => ({
          id: b.id, name: b.name, branchName: b.branch_name, address: b.address, phone: b.phone,
          planId: b.plan_id, subscriptionStatus: b.subscription_status, subscriptionEndDate: b.subscription_end_date, createdAt: b.created_at,
          razorpayCustomerId: b.razorpay_customer_id,
          razorpaySubscriptionId: b.razorpay_subscription_id,
          officialSignatureUrl: b.official_signature_url
        })),
        subscriptionPlans: (plans || []).map(p => ({
          id: p.id, name: p.name, price: p.price, annualPrice: p.annual_price || 0, features: p.features,
          maxTenants: p.max_tenants, maxRooms: p.max_rooms,
          razorpayMonthlyPlanId: p.razorpay_plan_id, razorpayAnnualPlanId: p.razorpay_annual_plan_id
        })),
        tenants: (tenants || []).map(t => ({
          id: t.id, userId: t.user_id, name: t.name, email: t.email, phone: t.phone, roomId: t.room_id, bedNumber: t.bed_number, rentAmount: t.rent_amount, depositAmount: t.deposit_amount, joiningDate: t.joining_date, paymentDueDate: t.payment_due_date, status: t.status, kycStatus: t.kyc_status, rentAgreementUrl: t.rent_agreement_url, inviteCode: t.invite_code, branchId: t.branch_id,
          isAuthorized: t.users?.is_authorized ?? true,
          vacatingDate: t.vacating_date,
          exitDate: t.exit_date,
          vacatingStatus: t.vacating_status || 'active'
        })),
        rooms: (rooms || []).map(r => ({
          id: r.id, roomNumber: r.room_number, floor: r.floor, totalBeds: r.total_beds, occupiedBeds: r.occupied_beds, type: r.type, price: r.price, branchId: r.branch_id,
          amenities: r.amenities || [],
          meterGroupId: r.meter_group_id,
          meterGroup: r.meter_groups ? {
            id: r.meter_groups.id, name: r.meter_groups.name, floor: r.meter_groups.floor, branchId: r.meter_groups.branch_id, createdAt: r.meter_groups.created_at
          } : undefined
        })),
        meterGroups: (meterGroups || []).map(m => ({
          id: m.id, name: m.name, floor: m.floor, branchId: m.branch_id, createdAt: m.created_at
        })),
        payments: (payments || []).map(p => ({
          id: p.id, tenantId: p.tenant_id, amount: p.amount, lateFee: p.late_fee, totalAmount: p.total_amount, paymentType: p.payment_type || 'rent', paymentDate: p.payment_date, month: p.month, status: p.status, method: p.method, transactionId: p.transaction_id, receiptUrl: p.receipt_url, branchId: p.branch_id,
          electricityAmount: p.electricity_amount, electricityBillId: p.electricity_bill_id, baseShare: p.base_share, acShare: p.ac_share, unitsConsumed: p.units_consumed, costPerUnit: p.cost_per_unit, actualBillUrl: p.actual_bill_file_url, acBillUrl: p.ac_bill_file_url,
          proofUrl: p.proof_url, createdBy: p.created_by
        })),
        complaints: (complaints || []).map(c => ({
          id: c.id, tenantId: c.tenant_id, title: c.title, description: c.description, category: c.category, priority: c.priority, status: c.status, assignedTo: c.assigned_to, resolvedAt: c.resolved_at, branchId: c.branch_id, createdAt: c.created_at,
          images: c.images, resolutionComment: c.resolution_comment, resolutionImages: c.resolution_images
        })),
        employees: (employees || []).map(e => ({
          id: e.id, userId: e.user_id, name: e.name, role: e.role, email: e.email, phone: e.phone, salary: e.salary, joiningDate: e.joining_date, kycStatus: e.kyc_status, branchId: e.branch_id
        })),
        kycs: (kycs || []).map(k => ({
          id: k.id, tenantId: k.tenant_id, employeeId: k.employee_id, documentType: k.document_type, documentUrl: k.document_url, status: k.status, submittedAt: k.submitted_at, verifiedBy: k.verified_by, verifiedAt: k.verified_at, rejectionReason: k.rejection_reason, branchId: k.branch_id
        })),
        announcements: (announcements || []).map(a => ({
          id: a.id, title: a.title, content: a.content, target: a.target, createdBy: a.created_by, branchId: a.branch_id, createdAt: a.created_at
        })),
        salaryPayments: (salaryPayments || []).map(s => ({
          id: s.id, employeeId: s.employee_id, amount: s.amount, month: s.month, paymentDate: s.payment_date, status: s.status, method: s.method, transactionId: s.transaction_id, branchId: s.branch_id
        })),
        tasks: (tasks || []).map(t => ({
          id: t.id, employeeId: t.employee_id, title: t.title, description: t.description, status: t.status, priority: t.priority, dueDate: t.due_date, completedAt: t.completed_at, branchId: t.branch_id, createdAt: t.created_at,
          completionComment: t.completion_comment, completionImages: t.completion_images
        })),
        pgConfigs: (pgConfigs || []).map(c => ({
          branchId: c.branch_id, rules: c.rules, rolePermissions: c.role_permissions, bannerUrl: c.banner_url,
          complaintCategories: c.complaint_categories || ['Plumbing', 'Electrical', 'Internet', 'Cleaning', 'Other'],
          customRoles: c.custom_roles || [],
          logoUrl: c.logo_url,
          pgName: c.pg_name,
          primaryColor: c.primary_color,
          theme: c.theme,
          defaultPaymentDueDate: c.default_payment_due_date || 1,
          defaultLateFeeDay: c.default_late_fee_day || 5,
          lateFeeAmount: c.late_fee_amount || 50
        })),
        userInvites: (userInvites || []).map(i => ({
          id: i.id, inviteCode: i.invite_code, email: i.email, branchId: i.branch_id, role: i.role as any, status: i.status as any, createdAt: i.created_at
        })),
        superSignatureUrl: superUserSignature?.signature_url || null
      };
      
      setData(newData);
      localStorage.setItem('elite_pg_cached_data', JSON.stringify(newData));
    } catch (e) {
      console.error(e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, userRole, userBranchId]);

  useEffect(() => {
    fetchData();

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    // Subscribe to realtime database changes so any actions by other admins cleanly sync UI cross-tabs
    const subscription = supabase
      .channel('public-schema-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        () => {
          // Debounce: cancel any pending fetch triggered by a previous event
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            fetchData();
          }, 800);
        }
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(subscription);
    };
  }, [fetchData]);

  // Filtered data based on branchId
  const filteredData = useMemo(() => {
    if (!user) return {
      tenants: [], rooms: [], meterGroups: [], payments: [], complaints: [], employees: [], kycs: [], announcements: [], salaryPayments: [], tasks: [], pgConfig: null, subscriptionPlans: [], branches: [], userInvites: []
    };

    if (user.role === 'super') return {
      ...data,
      pgConfig: (data.pgConfigs || [])[0] || null,
      subscriptionPlans: data.subscriptionPlans || [],
      branches: data.branches || []
    };

    const branchId = user.branchId;
    const branch = (data.branches || []).find((b: PGBranch) => b.id === branchId);
    const plan = (data.subscriptionPlans || []).find((p: SubscriptionPlan) => p.id === branch?.planId);

    return {
      tenants: (data.tenants || []).filter((t: Tenant) => t.branchId === branchId),
      rooms: (data.rooms || []).filter((r: Room) => r.branchId === branchId),
      meterGroups: (data.meterGroups || []).filter((m: MeterGroup) => m.branchId === branchId),
      payments: (data.payments || []).filter((p: Payment) => p.branchId === branchId),
      complaints: (data.complaints || []).filter((c: Complaint) => c.branchId === branchId),
      employees: (data.employees || []).filter((e: Employee) => e.branchId === branchId),
      kycs: (data.kycs || []).filter((k: KYCData) => k.branchId === branchId),
      announcements: (data.announcements || []).filter((a: Announcement) => a.branchId === branchId),
      salaryPayments: (data.salaryPayments || []).filter((p: SalaryPayment) => p.branchId === branchId),
      tasks: (data.tasks || []).filter((t: Task) => t.branchId === branchId),
      pgConfig: (data.pgConfigs || []).find((c: PGConfig) => c.branchId === branchId) || null,
      subscriptionPlans: data.subscriptionPlans || [],
      branches: data.branches || [],
      userInvites: data.userInvites || [],
      currentBranch: branch,
      currentPlan: plan
    };
  }, [data, user]);

  const checkFeatureAccess = (feature: AppFeature) => {
    if (user?.role === 'super') return true;

    // Implicit core modules strictly required for any PG to function
    if (['tenants', 'rooms', 'payments', 'complaints'].includes(feature)) return true;

    if (!user?.branchId) return false;
    const branch = data.branches.find((b: PGBranch) => b.id === user.branchId);
    if (!branch || (branch.subscriptionStatus !== 'active' && branch.subscriptionStatus !== 'trial')) return false;
    const plan = data.subscriptionPlans.find((p: SubscriptionPlan) => p.id === branch.planId);
    return plan?.features.includes(feature) || false;
  };

  // Optimistic state updater - applies changes to local state immediately,
  // then schedules a background re-sync after 2s to reconcile with server.
  const applyOptimistic = (updateFn: (prev: any) => any) => {
    setData(prev => updateFn(prev));
    // Background re-sync after a delay to ensure consistency
    setTimeout(() => fetchData(), 2000);
  };

  // Generic helper for non-optimistic operations (complex operations)
  const refetch = async (op: PromiseLike<any>, successMsg?: string) => {
    const { error } = await op;
    if (error) {
      console.error('Supabase Error:', error);
      toast.error(error.message);
      return false;
    }
    if (successMsg) toast.success(successMsg);
    // Short delay then background re-sync
    setTimeout(() => fetchData(), 500);
    return true;
  };

  const addTenant = async (tenant: Omit<Tenant, 'id' | 'branchId'> & { branchId?: string }, kycDoc?: { type: string, file?: File, url?: string }, rentAgreementDoc?: { file?: File, url?: string }) => {
    const branchId = tenant.branchId || filteredData.currentBranch?.id || user?.branchId || data.branches[0]?.id;
    if (!branchId) return;
    const isAdmin = ['super', 'admin', 'manager'].includes(user?.role || '');
    const kycStatus: KYCStatus = kycDoc ? (isAdmin ? 'verified' : 'pending') : 'unsubmitted';

    const room = data.rooms.find(r => r.id === tenant.roomId);
    const isAcUser = room?.type === 'AC';

    const username = tenant.email.split('@')[0] || `tenant${Date.now()}`;
    const regResult = await register({
      username,
      name: tenant.name,
      email: tenant.email,
      role: 'tenant',
      branchId,
      requiresPasswordChange: true
    }, '123456');

    if (!regResult.success && !regResult.existingUser) {
      toast.error(`Failed to create tenant login: ${regResult.message}`);
      return;
    }

    let newUserId = regResult.user?.id || (regResult as any).existingUserId || (regResult as any).id;

    // If user already existed, look up their ID from DB
    if (regResult.existingUser && !newUserId) {
      const { data: existingUser } = await supabase.from('users')
        .select('id')
        .ilike('email', tenant.email)
        .maybeSingle();
      newUserId = existingUser?.id || null;
    }

    const { data: createdTenant, error } = await supabase.from('tenants').insert({
      name: tenant.name, email: tenant.email, phone: tenant.phone, room_id: tenant.roomId, bed_number: tenant.bedNumber,
      rent_amount: tenant.rentAmount, deposit_amount: tenant.depositAmount, joining_date: tenant.joiningDate,
      payment_due_date: tenant.paymentDueDate, status: tenant.status, kyc_status: kycStatus,
      branch_id: branchId, user_id: newUserId || null, invite_code: (tenant as any).inviteCode || null,
      is_ac_user: isAcUser
    }).select().single();
    if (error) { toast.error(error.message); return; }

    let finalRentAgreementUrl = null;
    let finalKycUrl = null;

    if (createdTenant) {
      if (rentAgreementDoc?.file) {
        try {
          finalRentAgreementUrl = await uploadToSupabase('agreements', `tenant_${createdTenant.id}/${Date.now()}_${rentAgreementDoc.file.name}`, rentAgreementDoc.file);
          await supabase.from('tenants').update({ rent_agreement_url: finalRentAgreementUrl }).eq('id', createdTenant.id);
        } catch (err) {
          toast.error('Failed to upload Rent Agreement. Please ensure the "agreements" bucket exists open to public.');
        }
      } else if (rentAgreementDoc?.url) {
        finalRentAgreementUrl = rentAgreementDoc.url;
        await supabase.from('tenants').update({ rent_agreement_url: finalRentAgreementUrl }).eq('id', createdTenant.id);
      }

      if (kycDoc?.file) {
        try {
          finalKycUrl = await uploadToSupabase('kyc-docs', `tenant_${createdTenant.id}/${Date.now()}_${kycDoc.file.name}`, kycDoc.file);
        } catch (err) {
          toast.error('Failed to upload KYC Document. Please ensure the "kyc-docs" bucket exists open to public.');
        }
      } else if (kycDoc?.url) {
         finalKycUrl = kycDoc.url;
      }
    }

    // Optimistically add new tenant to local state immediately
    const newTenant: Tenant = {
      ...tenant, id: createdTenant.id, branchId, kycStatus, userId: tenant.userId || undefined,
      rentAgreementUrl: finalRentAgreementUrl || undefined,
      isAcUser: (createdTenant as any).is_ac_user || false
    };
    applyOptimistic(prev => ({ ...prev, tenants: [...prev.tenants, newTenant] }));

    if (createdTenant && kycDoc && finalKycUrl) {
      if (isAdmin) {
        await supabase.from('kyc_documents').insert({
          tenant_id: createdTenant.id, document_type: kycDoc.type, document_url: finalKycUrl, status: 'verified', branch_id: branchId, verified_by: user?.id, verified_at: new Date().toISOString().split('T')[0]
        });
      } else {
        await supabase.from('kyc_documents').insert({
          tenant_id: createdTenant.id, document_type: kycDoc.type, document_url: finalKycUrl, status: 'pending', branch_id: branchId
        });
      }
    }
    toast.success('Tenant added successfully');
    setTimeout(() => fetchData(), 1000);
  };

  const updateTenant = async (id: string, updates: Partial<Tenant>, kycDoc?: { type: string, file?: File, url?: string }, rentAgreementDoc?: { file?: File, url?: string }) => {
    const isAdmin = ['super', 'admin', 'manager'].includes(user?.role || '');
    const newKycStatus = kycDoc ? (isAdmin ? 'verified' : 'pending') : undefined;

    let finalRentAgreementUrl = rentAgreementDoc?.url;
    let finalKycUrl = kycDoc?.url;

    if (rentAgreementDoc?.file) {
      try {
        finalRentAgreementUrl = await uploadToSupabase('agreements', `tenant_${id}/${Date.now()}_${rentAgreementDoc.file.name}`, rentAgreementDoc.file);
      } catch (err) {
        toast.error('Failed to upload Rent Agreement.');
      }
    }
    if (kycDoc?.file) {
      try {
        finalKycUrl = await uploadToSupabase('kyc-docs', `tenant_${id}/${Date.now()}_${kycDoc.file.name}`, kycDoc.file);
      } catch (err) {
        toast.error('Failed to upload KYC Document.');
      }
    }

    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.roomId !== undefined) {
      dbUpdates.room_id = updates.roomId;
      const room = data.rooms.find(r => r.id === updates.roomId);
      dbUpdates.is_ac_user = room?.type === 'AC';
    }
    if (updates.bedNumber !== undefined) dbUpdates.bed_number = updates.bedNumber;
    if (updates.rentAmount !== undefined) dbUpdates.rent_amount = updates.rentAmount;
    if (updates.isAcUser !== undefined && updates.roomId === undefined) dbUpdates.is_ac_user = updates.isAcUser;
    if (updates.depositAmount !== undefined) dbUpdates.deposit_amount = updates.depositAmount;
    if (updates.joiningDate !== undefined) dbUpdates.joining_date = updates.joiningDate;
    if (updates.paymentDueDate !== undefined) dbUpdates.payment_due_date = updates.paymentDueDate;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.kycStatus !== undefined) dbUpdates.kyc_status = updates.kycStatus;
    if (updates.userId !== undefined) dbUpdates.user_id = updates.userId;
    if ((updates as any).inviteCode !== undefined) dbUpdates.invite_code = (updates as any).inviteCode;
    if (updates.signatureUrl !== undefined) dbUpdates.signature_url = updates.signatureUrl;
    if (updates.rentAgreementUrl !== undefined) dbUpdates.rent_agreement_url = updates.rentAgreementUrl;
    if (updates.vacatingDate !== undefined) dbUpdates.vacating_date = updates.vacatingDate;
    if (updates.exitDate !== undefined) dbUpdates.exit_date = updates.exitDate;
    if (updates.vacatingStatus !== undefined) dbUpdates.vacating_status = updates.vacatingStatus;
    if (finalRentAgreementUrl !== undefined) dbUpdates.rent_agreement_url = finalRentAgreementUrl;
    if (kycDoc) dbUpdates.kyc_status = newKycStatus;

    // Optimistically update local state immediately so rent/fields reflect instantly
    if (Object.keys(updates).length > 0 || finalRentAgreementUrl || kycDoc) {
      applyOptimistic(prev => ({
        ...prev,
        tenants: prev.tenants.map((t: any) =>
          t.id === id ? { 
            ...t, 
            ...updates, 
            ...(finalRentAgreementUrl ? { rentAgreementUrl: finalRentAgreementUrl, rent_agreement_url: finalRentAgreementUrl } : {}), 
            ...(kycDoc ? { kycStatus: newKycStatus, kyc_status: newKycStatus } : {}),
            ...(updates.kycStatus ? { kyc_status: updates.kycStatus } : {}),
            ...(updates.status ? { status: updates.status } : {})
          } : t
        )
      }));
    }

    const { error } = await supabase.from('tenants').update(dbUpdates).eq('id', id);
    if (error) { toast.error(error.message); fetchData(); return; }
    if (!kycDoc) toast.success('Tenant updated successfully');

    if (kycDoc && finalKycUrl) {
      const tenant = data.tenants.find((t: any) => t.id === id);
      const existingKYC = data.kycs.find((k: any) => k.tenantId === id);
      if (existingKYC) {
        await supabase.from('kyc_documents').delete().eq('id', existingKYC.id);
        if (existingKYC.documentUrl && existingKYC.documentUrl.includes('kyc-docs')) {
           await deleteFromSupabase('kyc-docs', existingKYC.documentUrl);
        }
      }
      const { error: kycError } = await supabase.from('kyc_documents').insert({
        tenant_id: id, document_type: kycDoc.type, document_url: finalKycUrl, status: newKycStatus, branch_id: tenant?.branchId,
        ...(isAdmin ? { verified_by: user?.id, verified_at: new Date().toISOString().split('T')[0] } : {})
      });
      if (kycError) { toast.error(kycError.message); }
      else { toast.success(isAdmin ? 'KYC verified and uploaded!' : 'KYC submitted for verification!'); }
      setTimeout(() => fetchData(), 500);
    }
  };

  const deleteTenant = async (id: string) => {
    const targetTenant = data.tenants.find((t: any) => t.id === id);
    const existingKYC = data.kycs.find((k: any) => k.tenantId === id);

    // Optimistically remove from local state immediately for instant UI feedback
    applyOptimistic(prev => ({
      ...prev,
      tenants: prev.tenants.filter((t: any) => t.id !== id),
      payments: prev.payments.filter((p: any) => p.tenantId !== id),
      complaints: prev.complaints.filter((c: any) => c.tenantId !== id),
      kycs: prev.kycs.filter((k: any) => k.tenantId !== id)
    }));
    toast.success('Tenant deleted successfully');
    
    // Cleanup Supabase Storage files
    try {
      if (targetTenant?.rentAgreementUrl?.includes('agreements')) {
        await deleteFromSupabase('agreements', targetTenant.rentAgreementUrl);
      }
      if (existingKYC?.documentUrl?.includes('kyc-docs')) {
        await deleteFromSupabase('kyc-docs', existingKYC.documentUrl);
      }
    } catch(e) { console.error('Error cleaning up storage files', e); }

    // Cascade-delete related records in background
    const { data: tenantComplaints } = await supabase.from('complaints').select('id').eq('tenant_id', id);
    if (tenantComplaints && tenantComplaints.length > 0) {
      const complaintIds = tenantComplaints.map((c: any) => c.id);
      await supabase.from('tasks').delete().in('complaint_id', complaintIds);
    }
    await supabase.from('complaints').delete().eq('tenant_id', id);
    await supabase.from('payments').delete().eq('tenant_id', id);
    await supabase.from('kycs').delete().eq('tenant_id', id);
    await supabase.from('kyc_documents').delete().eq('tenant_id', id);
    
    // Delete tenant record FIRST
    const { error } = await supabase.from('tenants').delete().eq('id', id);
    if (error) { 
      console.error('Failed to delete tenant:', error);
      toast.error(`Delete failed: ${error.message}`); 
      fetchData(); 
      return;
    }
    
    // Delete user record LAST (since tenants.user_id references users.id)
    if (targetTenant?.userId) {
      await supabase.from('users').delete().eq('id', targetTenant.userId);
    }
  };

  const requestVacating = async (tenantId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const exitDate = new Date();
    exitDate.setDate(exitDate.getDate() + 30);
    const exitDateStr = exitDate.toISOString().split('T')[0];

    await updateTenant(tenantId, {
      vacatingDate: today,
      exitDate: exitDateStr,
      vacatingStatus: 'notice_given',
      status: 'vacating'
    });
    toast.success(`Vacating request submitted. Exit date: ${exitDateStr}`);
  };

  const completeCheckout = async (tenantId: string) => {
    const tenant = data.tenants.find((t: any) => t.id === tenantId);
    if (!tenant) return;

    // 1. Mark as vacated
    await updateTenant(tenantId, {
      status: 'vacated',
      vacatingStatus: 'vacated',
      roomId: null as any // Using any to allow nulling out if types are strict
    });

    // 2. Update room occupancy if tracked manually
    if (tenant.roomId) {
      const room = data.rooms.find((r: any) => r.id === tenant.roomId);
      if (room) {
        await updateRoom(room.id, { occupiedBeds: Math.max(0, (room.occupiedBeds || 0) - 1) });
      }
    }

    toast.success('Checkout completed. Bed allocation freed.');
  };

  const addRoom = async (room: Omit<Room, 'id' | 'branchId'> & { branchId?: string }) => {
    const targetBranch = room.branchId || filteredData.currentBranch?.id || user?.branchId;
    if (!targetBranch) { toast.error("No active branch selected."); return; }
    applyOptimistic(prev => ({ ...prev, rooms: [...prev.rooms, { ...room, id: `temp-${Date.now()}`, branchId: targetBranch }] }));
    await refetch(supabase.from('rooms').insert({
      room_number: room.roomNumber, floor: room.floor, total_beds: room.totalBeds, occupied_beds: room.occupiedBeds,
      type: room.type, price: room.price, branch_id: targetBranch, meter_group_id: room.meterGroupId || null,
      amenities: room.amenities || []
    }), 'Room added successfully');
  };

  const updateRoom = async (id: string, updates: Partial<Room>) => {
    applyOptimistic(prev => ({ ...prev, rooms: prev.rooms.map((r: any) => r.id === id ? { ...r, ...updates } : r) }));
    
    // If room type changes, update all tenants in this room
    if (updates.type !== undefined) {
      const isAcRoom = updates.type === 'AC';
      const tenantsToUpdate = data.tenants.filter(t => t.roomId === id);
      
      if (tenantsToUpdate.length > 0) {
        // Background DB update
        supabase.from('tenants').update({ is_ac_user: isAcRoom }).eq('room_id', id).then(({ error }) => {
          if (error) console.error('Failed to sync tenant AC status:', error);
        });
        
        // Optimistic local update
        applyOptimistic(prev => ({
          ...prev,
          tenants: prev.tenants.map((t: any) => t.roomId === id ? { ...t, isAcUser: isAcRoom } : t)
        }));
      }
    }

    const dbUpdates: any = {};
    if (updates.roomNumber !== undefined) dbUpdates.room_number = updates.roomNumber;
    if (updates.floor !== undefined) dbUpdates.floor = updates.floor;
    if (updates.totalBeds !== undefined) dbUpdates.total_beds = updates.totalBeds;
    if (updates.occupiedBeds !== undefined) dbUpdates.occupied_beds = updates.occupiedBeds;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.meterGroupId !== undefined) dbUpdates.meter_group_id = updates.meterGroupId;
    if (updates.amenities !== undefined) dbUpdates.amenities = updates.amenities;
    await refetch(supabase.from('rooms').update(dbUpdates).eq('id', id), 'Room updated successfully');
  };

  const deleteRoom = async (id: string) => { 
    // Unassign tenants from this room first
    const tenantsInRoom = data.tenants.filter((t: any) => t.roomId === id);
    if (tenantsInRoom.length > 0) {
      applyOptimistic(prev => ({
        ...prev,
        tenants: prev.tenants.map((t: any) => t.roomId === id ? { ...t, roomId: null } : t)
      }));
      await supabase.from('tenants').update({ room_id: null }).eq('room_id', id);
    }

    applyOptimistic(prev => ({ ...prev, rooms: prev.rooms.filter((r: any) => r.id !== id) }));
    await refetch(supabase.from('rooms').delete().eq('id', id), 'Room deleted'); 
  };

  const addMeterGroup = async (meterGroup: Omit<MeterGroup, 'id' | 'branchId' | 'createdAt'> & { branchId?: string }) => {
    const targetBranch = meterGroup.branchId || filteredData.currentBranch?.id || user?.branchId;
    if (!targetBranch) { toast.error("No active branch selected."); return; }
    applyOptimistic(prev => ({ ...prev, meterGroups: [...prev.meterGroups, { ...meterGroup, id: `temp-${Date.now()}`, branchId: targetBranch, createdAt: new Date().toISOString() }] }));
    await refetch(supabase.from('meter_groups').insert({
      name: meterGroup.name, floor: meterGroup.floor, branch_id: targetBranch
    }), 'Flat / Meter Group created');
  };

  const updateMeterGroup = async (id: string, updates: Partial<MeterGroup>) => {
    applyOptimistic(prev => ({ ...prev, meterGroups: prev.meterGroups.map((m: any) => m.id === id ? { ...m, ...updates } : m) }));
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.floor !== undefined) dbUpdates.floor = updates.floor;
    await refetch(supabase.from('meter_groups').update(dbUpdates).eq('id', id), 'Flat / Meter Group updated');
  };

  const deleteMeterGroup = async (id: string) => { 
    // Cascade delete electricity bills and readings for this flat
    const { data: bills } = await supabase.from('electricity_bills').select('id').eq('meter_group_id', id);
    if (bills && bills.length > 0) {
      const billIds = bills.map((b: any) => b.id);
      
      // Nullify references in payments first so we don't violate payments fk constraint
      await supabase.from('payments').update({ electricity_bill_id: null }).in('electricity_bill_id', billIds);
      
      // Clear out the readings
      await supabase.from('room_ac_readings').delete().in('electricity_bill_id', billIds);
    }
    
    // Now electricity bills can safely be deleted
    await supabase.from('electricity_bills').delete().eq('meter_group_id', id);

    // Unassign rooms from this meter group
    const roomsInGroup = data.rooms.filter((r: any) => r.meterGroupId === id);
    if (roomsInGroup.length > 0) {
      applyOptimistic(prev => ({
        ...prev,
        rooms: prev.rooms.map((r: any) => r.meterGroupId === id ? { ...r, meterGroupId: null } : r)
      }));
      await supabase.from('rooms').update({ meter_group_id: null }).eq('meter_group_id', id);
    }

    applyOptimistic(prev => ({ ...prev, meterGroups: prev.meterGroups.filter((m: any) => m.id !== id) }));
    await refetch(supabase.from('meter_groups').delete().eq('id', id), 'Flat deleted'); 
  };

  const addPayment = async (payment: Omit<Payment, 'id' | 'branchId'> & { branchId?: string }) => {
    const targetBranch = payment.branchId || filteredData.currentBranch?.id || user?.branchId;
    if (!targetBranch) { toast.error("No active branch selected."); return; }
    applyOptimistic(prev => ({ ...prev, payments: [...prev.payments, { ...payment, id: `temp-${Date.now()}`, branchId: targetBranch, createdBy: user?.id || '' }] }));
    await refetch(supabase.from('payments').insert({
      tenant_id: payment.tenantId, amount: payment.amount, late_fee: payment.lateFee, total_amount: payment.totalAmount,
      payment_type: payment.paymentType || 'rent',
      payment_date: payment.paymentDate, month: payment.month, status: payment.status, method: payment.method,
      transaction_id: payment.transactionId || null, receipt_url: payment.receiptUrl || null, branch_id: targetBranch,
      electricity_amount: payment.electricityAmount || 0,
      electricity_bill_id: payment.electricityBillId || null,
      base_share: payment.baseShare || 0,
      ac_share: payment.acShare || 0,
      units_consumed: payment.unitsConsumed || 0,
      cost_per_unit: payment.costPerUnit || 0,
      actual_bill_file_url: payment.actualBillUrl || null,
      ac_bill_file_url: payment.acBillUrl || null
    }), 'Payment recorded');
  };

  const updatePayment = async (id: string, updates: Partial<Payment>) => {
    applyOptimistic(prev => ({ ...prev, payments: prev.payments.map((p: any) => p.id === id ? { ...p, ...updates } : p) }));
    const dbUpdates: any = {};
    if (updates.tenantId !== undefined) dbUpdates.tenant_id = updates.tenantId;
    if (updates.paymentType !== undefined) dbUpdates.payment_type = updates.paymentType;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.lateFee !== undefined) dbUpdates.late_fee = updates.lateFee;
    if (updates.totalAmount !== undefined) dbUpdates.total_amount = updates.totalAmount;
    if (updates.paymentDate !== undefined) dbUpdates.payment_date = updates.paymentDate;
    if (updates.month !== undefined) dbUpdates.month = updates.month;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.method !== undefined) dbUpdates.method = updates.method;
    if (updates.transactionId !== undefined) dbUpdates.transaction_id = updates.transactionId;
    if (updates.receiptUrl !== undefined) dbUpdates.receipt_url = updates.receiptUrl;
    if (updates.electricityAmount !== undefined) dbUpdates.electricity_amount = updates.electricityAmount;
    if (updates.electricityBillId !== undefined) dbUpdates.electricity_bill_id = updates.electricityBillId;
    if (updates.baseShare !== undefined) dbUpdates.base_share = updates.baseShare;
    if (updates.acShare !== undefined) dbUpdates.ac_share = updates.acShare;
    if (updates.unitsConsumed !== undefined) dbUpdates.units_consumed = updates.unitsConsumed;
    if (updates.costPerUnit !== undefined) dbUpdates.cost_per_unit = updates.costPerUnit;
    if (updates.actualBillUrl !== undefined) dbUpdates.actual_bill_file_url = updates.actualBillUrl;
    if (updates.acBillUrl !== undefined) dbUpdates.ac_bill_file_url = updates.acBillUrl;
    await refetch(supabase.from('payments').update(dbUpdates).eq('id', id), 'Payment updated');
  };

  const deletePayment = async (id: string) => { 
    applyOptimistic(prev => ({ ...prev, payments: prev.payments.filter((p: any) => p.id !== id) }));
    await refetch(supabase.from('payments').delete().eq('id', id), 'Payment deleted'); 
  };

  const addComplaint = async (complaint: Omit<Complaint, 'id' | 'branchId'> & { branchId?: string }) => {
    const targetBranch = complaint.branchId || filteredData.currentBranch?.id || user?.branchId;
    if (!targetBranch) { toast.error("No active branch selected."); return; }
    applyOptimistic(prev => ({ ...prev, complaints: [...prev.complaints, { ...complaint, id: `temp-${Date.now()}`, branchId: targetBranch, createdAt: new Date().toISOString() }] }));
    await refetch(supabase.from('complaints').insert({
      tenant_id: complaint.tenantId, title: complaint.title, description: complaint.description, category: complaint.category,
      priority: complaint.priority, status: complaint.status, assigned_to: complaint.assignedTo || null, branch_id: targetBranch,
      images: complaint.images || []
    }), 'Complaint registered');
  };

  const updateComplaint = async (id: string, updates: Partial<Complaint>) => {
    applyOptimistic(prev => ({ ...prev, complaints: prev.complaints.map((c: any) => c.id === id ? { ...c, ...updates } : c) }));
    const dbUpdates: any = {};
    if (updates.tenantId !== undefined) dbUpdates.tenant_id = updates.tenantId;
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.assignedTo !== undefined) dbUpdates.assigned_to = updates.assignedTo;
    if (updates.resolvedAt !== undefined) dbUpdates.resolved_at = updates.resolvedAt;
    if (updates.images !== undefined) dbUpdates.images = updates.images;
    if (updates.resolutionComment !== undefined) dbUpdates.resolution_comment = updates.resolutionComment;
    if (updates.resolutionImages !== undefined) dbUpdates.resolution_images = updates.resolutionImages;
    await refetch(supabase.from('complaints').update(dbUpdates).eq('id', id), 'Complaint updated');
  };

  const deleteComplaint = async (id: string) => { 
    applyOptimistic(prev => ({ ...prev, complaints: prev.complaints.filter((c: any) => c.id !== id) }));
    await refetch(supabase.from('complaints').delete().eq('id', id), 'Complaint deleted'); 
  };

  const addEmployee = async (employee: Omit<Employee, 'id' | 'kycStatus' | 'branchId'>, kycDoc?: { type: string, file?: File, url?: string }) => {
    const targetBranch = filteredData.currentBranch?.id || user?.branchId;
    if (!targetBranch) { toast.error("No active branch selected."); return false; }
    
    const isAdmin = ['super', 'admin', 'manager'].includes(user?.role || '');
    const kycStatus = kycDoc ? (isAdmin ? 'verified' : 'pending') : 'unsubmitted';
    const tempId = `temp-${Date.now()}`;
    
    // 1. First, check for existing email/username in the same branch
    const username = employee.email.split('@')[0] || `emp${Date.now()}`;
    
    // Check local data first for speed
    const isDuplicate = data.employees.some(e => 
      e.email.toLowerCase() === employee.email.toLowerCase() || 
      (e as any).username?.toLowerCase() === username.toLowerCase()
    );

    if (isDuplicate) {
      toast.error('Email or Username already exists in this branch.');
      return false;
    }

    const defaultPassword = '123456';
    const regResult = await register({
      username,
      name: employee.name,
      email: employee.email,
      role: employee.role as any,
      phone: employee.phone,
      branchId: targetBranch,
      requiresPasswordChange: true
    }, defaultPassword);

    if (!regResult.success && !regResult.existingUser) {
      toast.error(`Failed to create employee login: ${regResult.message}`);
      return false;
    }

    const userId = regResult.user?.id || (regResult as any).existingUserId;

    // 2. Insert into employees table
    applyOptimistic(prev => ({ ...prev, employees: [...prev.employees, { ...employee, id: tempId, branchId: targetBranch, kycStatus, userId }] }));
    
    const { data: createdEm, error } = await supabase.from('employees').insert({
      user_id: userId || null, name: employee.name, role: employee.role, email: employee.email, phone: employee.phone,
      salary: employee.salary, joining_date: employee.joiningDate, kyc_status: kycStatus, branch_id: targetBranch
    }).select().single();
    
    if (error) { 
      toast.error(error.message); 
      return false; 
    }

    if (createdEm && kycDoc) {
      let finalKycUrl = kycDoc.url || '';
      if (kycDoc.file) {
        try {
          finalKycUrl = await uploadToSupabase('kyc-docs', `employee_${createdEm.id}/${Date.now()}_${kycDoc.file.name}`, kycDoc.file);
        } catch (err) {
          toast.error('Failed to upload Employee KYC Document. Please assure buckets exist.');
        }
      }
      if (finalKycUrl) {
        await supabase.from('kyc_documents').insert({
          employee_id: createdEm.id, document_type: kycDoc.type, document_url: finalKycUrl, status: kycStatus, branch_id: targetBranch,
          ...(isAdmin ? { verified_by: user?.name, verified_at: new Date().toISOString().split('T')[0] } : {})
        });
      }
    }
    
    toast.success('Employee added and login created (Default Pass: 123456)');
    setTimeout(() => fetchData(), 500);
    return true;
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>, kycDoc?: { type: string, file?: File, url?: string }) => {
    const isAdmin = ['super', 'admin', 'manager'].includes(user?.role || '');
    const newKycStatus = kycDoc ? (isAdmin ? 'verified' : 'pending') : undefined;

    let finalKycUrl = kycDoc?.url;
    if (kycDoc?.file) {
      try {
        finalKycUrl = await uploadToSupabase('kyc-docs', `employee_${id}/${Date.now()}_${kycDoc.file.name}`, kycDoc.file);
      } catch (err) {
        toast.error('Failed to update Employee KYC Document.');
      }
    }

    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.salary !== undefined) dbUpdates.salary = updates.salary;
    if (updates.joiningDate !== undefined) dbUpdates.joining_date = updates.joiningDate;
    if (updates.kycStatus !== undefined) dbUpdates.kyc_status = updates.kycStatus;
    if (updates.userId !== undefined) dbUpdates.user_id = updates.userId;
    if (kycDoc) dbUpdates.kyc_status = newKycStatus;

    // Optimistically update local state immediately
    if (Object.keys(updates).length > 0 || kycDoc) {
      applyOptimistic(prev => ({
        ...prev,
        employees: prev.employees.map((e: any) => e.id === id ? { ...e, ...updates, ...(kycDoc ? { kycStatus: newKycStatus } : {}) } : e)
      }));
    }

    const { error } = await supabase.from('employees').update(dbUpdates).eq('id', id);
    if (error) { toast.error(error.message); fetchData(); return false; }

    if (kycDoc && finalKycUrl) {
      const eObj = data.employees.find((e: any) => e.id === id);
      const existingKYC = data.kycs.find((k: any) => k.employeeId === id);
      if (existingKYC) {
        await supabase.from('kyc_documents').delete().eq('id', existingKYC.id);
        if (existingKYC.documentUrl?.includes('kyc-docs')) {
          await deleteFromSupabase('kyc-docs', existingKYC.documentUrl);
        }
      }
      const { error: kycError } = await supabase.from('kyc_documents').insert({
        employee_id: id, document_type: kycDoc.type, document_url: finalKycUrl, status: newKycStatus, branch_id: eObj?.branchId || user?.branchId,
        ...(isAdmin ? { verified_by: user?.name, verified_at: new Date().toISOString().split('T')[0] } : {})
      });
      if (kycError) { toast.error(kycError.message); }
      else { toast.success(isAdmin ? 'KYC verified and uploaded!' : 'KYC submitted for verification!'); }
    } else {
      toast.success('Employee updated successfully');
    }

    fetchData();
    return true;
  };

  const deleteEmployee = async (id: string) => {
    // If it's a temporary ID, just remove from local state and skip DB
    if (id.startsWith('temp-')) {
       applyOptimistic(prev => ({
        ...prev,
        employees: prev.employees.filter((e: any) => e.id !== id)
      }));
      return;
    }

    const targetEmployee = data.employees.find((e: any) => e.id === id);
    const existingKYC = data.kycs.find((k: any) => k.employeeId === id);
    
    // Optimistically remove from local state immediately
    applyOptimistic(prev => ({
      ...prev,
      employees: prev.employees.filter((e: any) => e.id !== id),
      kycs: prev.kycs.filter((k: any) => k.employeeId !== id),
      salaryPayments: prev.salaryPayments.filter((s: any) => s.employeeId !== id),
      tasks: prev.tasks.filter((t: any) => t.employeeId !== id)
    }));

    try {
      // 1. Cascade-delete related records in SQL directly or here
      await supabase.from('kyc_documents').delete().eq('employee_id', id);
      await supabase.from('salary_payments').delete().eq('employee_id', id);
      await supabase.from('tasks').delete().eq('employee_id', id);

      if (existingKYC?.documentUrl?.includes('kyc-docs')) {
        await deleteFromSupabase('kyc-docs', existingKYC.documentUrl);
      }
      
      // 2. Delete the employee record
      const { error: empError } = await supabase.from('employees').delete().eq('id', id);
      if (empError) throw empError;

      // 3. Finally delete the user account if linked
      if (targetEmployee?.userId) {
        await supabase.from('users').delete().eq('id', targetEmployee.userId);
      }
      
      toast.success('Employee and associated data deleted securely');
    } catch (error: any) {
      console.error('Delete failed:', error);
      toast.error(`Delete failed: ${error.message}`);
      fetchData(); // Revert state
    }
  };

  const updateKYC = async (id: string, updates: Partial<KYCData>) => {
    const dbUpdates: any = {};
    if (updates.documentType !== undefined) dbUpdates.document_type = updates.documentType;
    if (updates.documentUrl !== undefined) dbUpdates.document_url = updates.documentUrl;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.verifiedBy !== undefined) dbUpdates.verified_by = updates.verifiedBy;
    if (updates.verifiedAt !== undefined) dbUpdates.verified_at = updates.verifiedAt;
    if (updates.rejectionReason !== undefined) dbUpdates.rejection_reason = updates.rejectionReason;

    const kyc = data.kycs.find((k: any) => k.id === id);
    await refetch(supabase.from('kyc_documents').update(dbUpdates).eq('id', id), `KYC ${updates.status || 'updated'}`);

    // Also sync the tenant or employee status
    if (kyc && updates.status) {
      if (kyc.tenantId) await supabase.from('tenants').update({ kyc_status: updates.status }).eq('id', kyc.tenantId);
      if (kyc.employeeId) await supabase.from('employees').update({ kyc_status: updates.status }).eq('id', kyc.employeeId);
      await fetchData();
    }
  };

  const deleteKYC = async (id: string) => {
    const kyc = data.kycs.find((k: any) => k.id === id);
    await refetch(supabase.from('kyc_documents').delete().eq('id', id), 'KYC document deleted');
    if (kyc) {
      if (kyc.tenantId) await supabase.from('tenants').update({ kyc_status: 'unsubmitted' }).eq('id', kyc.tenantId);
      if (kyc.employeeId) await supabase.from('employees').update({ kyc_status: 'unsubmitted' }).eq('id', kyc.employeeId);
      await fetchData();
    }
  };

  const uploadVerifiedKYC = async (tenantId: string, docType: string, fileOrUrl: File | string) => {
    const tenant = data.tenants.find((t: any) => t.id === tenantId);
    if (!tenant) return;
    
    let docUrl = typeof fileOrUrl === 'string' ? fileOrUrl : '';
    if (typeof fileOrUrl !== 'string') {
      docUrl = await uploadToSupabase('kyc-docs', `tenant_${tenantId}/${Date.now()}_${fileOrUrl.name}`, fileOrUrl);
    }

    // Remove existing KYC for this tenant if any
    const existingKYC = data.kycs.find((k: any) => k.tenantId === tenantId);
    if (existingKYC) {
      await supabase.from('kyc_documents').delete().eq('id', existingKYC.id);
      if (existingKYC.documentUrl?.includes('kyc-docs')) {
        await deleteFromSupabase('kyc-docs', existingKYC.documentUrl);
      }
    }
    // Insert a new, pre-verified KYC document
    await refetch(supabase.from('kyc_documents').insert({ tenant_id: tenantId, document_type: docType, document_url: docUrl, status: 'verified', branch_id: user?.branchId, verified_by: user?.id, verified_at: new Date().toISOString() }), 'KYC document uploaded');
    // Update tenant's kyc_status to verified
    await supabase.from('tenants').update({ kyc_status: 'verified' }).eq('id', tenantId);
    toast.success('KYC document uploaded and verified successfully!');
    await fetchData();
  };

  const addAnnouncement = async (announcement: Omit<Announcement, 'id' | 'branchId'> & { branchId?: string }) => {
    const targetBranch = announcement.branchId || filteredData.currentBranch?.id || user?.branchId;
    if (!targetBranch) { toast.error("No active branch selected."); return; }
    applyOptimistic(prev => ({ ...prev, announcements: [...prev.announcements, { ...announcement, id: `temp-${Date.now()}`, branchId: targetBranch, createdAt: new Date().toISOString() }] }));
    await refetch(supabase.from('announcements').insert({
      title: announcement.title, content: announcement.content, target: announcement.target,
      created_by: announcement.createdBy, branch_id: targetBranch
    }), 'Announcement published');
  };

  const deleteAnnouncement = async (id: string) => { 
    applyOptimistic(prev => ({ ...prev, announcements: prev.announcements.filter((a: any) => a.id !== id) }));
    await refetch(supabase.from('announcements').delete().eq('id', id), 'Announcement deleted'); 
  };

  const addSalaryPayment = async (payment: Omit<SalaryPayment, 'id' | 'branchId'> & { branchId?: string }) => {
    const targetBranch = payment.branchId || filteredData.currentBranch?.id || user?.branchId;
    if (!targetBranch) { toast.error("No active branch selected."); return; }
    applyOptimistic(prev => ({ ...prev, salaryPayments: [...prev.salaryPayments, { ...payment, id: `temp-${Date.now()}`, branchId: targetBranch }] }));
    await refetch(supabase.from('salary_payments').insert({
      employee_id: payment.employeeId, amount: payment.amount, month: payment.month, payment_date: payment.paymentDate,
      status: payment.status, method: payment.method, transaction_id: payment.transactionId || null, branch_id: targetBranch
    }), 'Salary payment recorded');
  };

  const updateSalaryPayment = async (id: string, updates: Partial<SalaryPayment>) => {
    applyOptimistic(prev => ({ ...prev, salaryPayments: prev.salaryPayments.map((s: any) => s.id === id ? { ...s, ...updates } : s) }));
    const dbUpdates: any = {};
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.month !== undefined) dbUpdates.month = updates.month;
    if (updates.paymentDate !== undefined) dbUpdates.payment_date = updates.paymentDate;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.method !== undefined) dbUpdates.method = updates.method;
    if (updates.transactionId !== undefined) dbUpdates.transaction_id = updates.transactionId;
    await refetch(supabase.from('salary_payments').update(dbUpdates).eq('id', id), 'Salary record updated');
  };

  const deleteSalaryPayment = async (id: string) => {
    applyOptimistic(prev => ({ ...prev, salaryPayments: prev.salaryPayments.filter((s: any) => s.id !== id) }));
    await refetch(supabase.from('salary_payments').delete().eq('id', id), 'Salary record deleted');
  };

  const addTask = async (task: Omit<Task, 'id' | 'branchId'>) => {
    const branchId = user?.branchId || data.branches[0]?.id;
    if (!branchId) return;
    applyOptimistic(prev => ({ 
      ...prev, 
      tasks: [...prev.tasks, { ...task, id: `temp-${Date.now()}`, branchId, createdAt: new Date().toISOString() }] 
    }));
    await refetch(supabase.from('tasks').insert({
      employee_id: task.employeeId,
      complaint_id: task.complaintId || null,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      due_date: task.dueDate,
      completed_at: task.completedAt || null,
      branch_id: branchId
    }), 'Task assigned');
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    applyOptimistic(prev => ({ ...prev, tasks: prev.tasks.map((t: any) => t.id === id ? { ...t, ...updates } : t) }));
    const dbUpdates: any = {};
    if (updates.employeeId !== undefined) dbUpdates.employee_id = updates.employeeId;
    if (updates.complaintId !== undefined) dbUpdates.complaint_id = updates.complaintId;
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
    if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;
    if (updates.completionComment !== undefined) dbUpdates.completion_comment = updates.completionComment;
    if (updates.completionImages !== undefined) dbUpdates.completion_images = updates.completionImages;
    
    await refetch(supabase.from('tasks').update(dbUpdates).eq('id', id), 'Task updated');

    // Auto-resolve linked complaint when task is completed
    if (updates.status === 'completed') {
      const task = data.tasks.find((t: any) => t.id === id);
      const complaintIdOfTask = updates.complaintId || task?.complaintId;
      if (complaintIdOfTask) {
        await updateComplaint(complaintIdOfTask, { 
          status: 'resolved', 
          resolvedAt: new Date().toISOString() 
        });
        toast.success('Linked complaint marked as resolved!');
      }
    }
  };

  const deleteTask = async (id: string) => { 
    applyOptimistic(prev => ({ ...prev, tasks: prev.tasks.filter((t: any) => t.id !== id) }));
    await refetch(supabase.from('tasks').delete().eq('id', id), 'Task deleted'); 
  };

  const updatePGConfig = async (updates: Partial<PGConfig>) => {
    const targetBranch = filteredData.currentBranch?.id || user?.branchId;
    if (!targetBranch) { toast.error("No active branch selected."); return; }
    const dbUpdates: any = {};
    if (updates.rules !== undefined) dbUpdates.rules = updates.rules;
    if (updates.rolePermissions !== undefined) dbUpdates.role_permissions = updates.rolePermissions;
    if (updates.complaintCategories !== undefined) dbUpdates.complaint_categories = updates.complaintCategories;
    if (updates.customRoles !== undefined) dbUpdates.custom_roles = updates.customRoles;
    if (updates.logoUrl !== undefined) dbUpdates.logo_url = updates.logoUrl;
    if (updates.pgName !== undefined) dbUpdates.pg_name = updates.pgName;
    if (updates.primaryColor !== undefined) dbUpdates.primary_color = updates.primaryColor;
    if (updates.theme !== undefined) dbUpdates.theme = updates.theme;
    if (updates.defaultPaymentDueDate !== undefined) dbUpdates.default_payment_due_date = updates.defaultPaymentDueDate;
    if (updates.defaultLateFeeDay !== undefined) dbUpdates.default_late_fee_day = updates.defaultLateFeeDay;
    if (updates.lateFeeAmount !== undefined) dbUpdates.late_fee_amount = updates.lateFeeAmount;

    // Optimistically update PG config to prevent UI lagging on changes
    applyOptimistic(prev => {
      const existing = prev.pgConfigs.find((c: any) => c.branchId === targetBranch);
      if (existing) {
        return {
          ...prev,
          pgConfigs: prev.pgConfigs.map((c: any) => c.branchId === targetBranch ? { ...c, ...updates } : c)
        };
      } else {
        return {
          ...prev,
          pgConfigs: [...prev.pgConfigs, { 
            branchId: targetBranch, 
            rules: updates.rules || [], 
            rolePermissions: updates.rolePermissions || [], 
            complaintCategories: updates.complaintCategories || [], 
            customRoles: updates.customRoles || [],
            logoUrl: updates.logoUrl,
            pgName: updates.pgName,
            primaryColor: updates.primaryColor,
            theme: updates.theme as any,
            defaultPaymentDueDate: updates.defaultPaymentDueDate,
            defaultLateFeeDay: updates.defaultLateFeeDay,
            lateFeeAmount: updates.lateFeeAmount
          }]
        };
      }
    });

    try {
      // Check if PG Config already exists
      const existing = data.pgConfigs.find((c: any) => c.branchId === targetBranch);
      if (existing) {
        const { error } = await supabase.from('pg_configs').update(dbUpdates).eq('branch_id', targetBranch);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pg_configs').insert({ ...dbUpdates, branch_id: targetBranch });
        if (error) throw error;
      }
      toast.success('Settings saved successfully');
      setTimeout(() => fetchData(), 500);
    } catch (error: any) {
      console.error('Failed to update PG Config:', error);
      toast.error(`Update failed: ${error.message}. Ensure database columns are updated.`);
      throw error;
    }
  };

  const addBranch = async (branch: Omit<PGBranch, 'id' | 'createdAt' | 'planId' | 'subscriptionStatus' | 'subscriptionEndDate'>) => {
    const { data: bData, error } = await supabase.from('pg_branches').insert({
      name: branch.name, branch_name: branch.branchName, address: branch.address, phone: branch.phone,
      plan_id: null, subscription_status: 'trial', subscription_end_date: null
    }).select().single();
    if (error) { toast.error(error.message); return; }
    if (bData) {
      // Create initial config
      await supabase.from('pg_configs').insert({ branch_id: bData.id, rules: [], role_permissions: [] });
      
      // Auto-generate a random 8-character invite code for this branch
      const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      await supabase.from('user_invites').insert({
        invite_code: randomCode,
        branch_id: bData.id,
        role: 'tenant',
        status: 'pending'
      });
      
      toast.success('Branch added successfully');
      await fetchData();
    }
  };

  const updateBranch = async (id: string, updates: Partial<PGBranch>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.branchName !== undefined) dbUpdates.branch_name = updates.branchName;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.officialSignatureUrl !== undefined) dbUpdates.official_signature_url = updates.officialSignatureUrl;
    await refetch(supabase.from('pg_branches').update(dbUpdates).eq('id', id), 'Branch updated');
  };

  const deleteBranch = async (id: string) => { await refetch(supabase.from('pg_branches').delete().eq('id', id), 'Branch removed'); };

  const addSubscriptionPlan = async (plan: Omit<SubscriptionPlan, 'id'>) => {
    await refetch(supabase.from('subscription_plans').insert({
      name: plan.name, price: plan.price, annual_price: plan.annualPrice, features: plan.features,
      max_tenants: plan.maxTenants, max_rooms: plan.maxRooms,
      razorpay_plan_id: plan.razorpayMonthlyPlanId, razorpay_annual_plan_id: plan.razorpayAnnualPlanId
    }), 'Plan created');
  };

  const updateSubscriptionPlan = async (id: string, updates: Partial<SubscriptionPlan>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.features !== undefined) dbUpdates.features = updates.features;
    if (updates.maxTenants !== undefined) dbUpdates.max_tenants = updates.maxTenants;
    if (updates.maxRooms !== undefined) dbUpdates.max_rooms = updates.maxRooms;
    if (updates.annualPrice !== undefined) dbUpdates.annual_price = updates.annualPrice;
    if (updates.razorpayMonthlyPlanId !== undefined) dbUpdates.razorpay_plan_id = updates.razorpayMonthlyPlanId;
    if (updates.razorpayAnnualPlanId !== undefined) dbUpdates.razorpay_annual_plan_id = updates.razorpayAnnualPlanId;
    await refetch(supabase.from('subscription_plans').update(dbUpdates).eq('id', id), 'Plan updated');
  };

  const deleteSubscriptionPlan = async (id: string) => { await refetch(supabase.from('subscription_plans').delete().eq('id', id), 'Plan deleted'); };

  const updateBranchSubscription = async (
    branchId: string, 
    planId: string, 
    status: 'active' | 'expired' | 'trial', 
    endDate: string,
    razorpayCustomerId?: string,
    razorpaySubscriptionId?: string
  ) => {
    const updates: any = {
      plan_id: planId,
      subscription_status: status,
      subscription_end_date: endDate
    };

    if (razorpayCustomerId) updates.razorpay_customer_id = razorpayCustomerId;
    if (razorpaySubscriptionId) updates.razorpay_subscription_id = razorpaySubscriptionId;

    await refetch(supabase.from('pg_branches').update(updates).eq('id', branchId), 'Subscription updated');
  };

  const computedStats = useMemo(() => {
    const currentMonth = format(new Date(), 'yyyy-MM');
    const payments = filteredData.payments || [];
    const rooms = filteredData.rooms || [];
    const tenants = filteredData.tenants || [];
    const kycs = filteredData.kycs || [];
    const complaints = filteredData.complaints || [];

    const monthlyRevenue = payments
      .filter((p: Payment) => p.month === currentMonth && p.status === 'paid')
      .reduce((sum: number, p: Payment) => sum + p.totalAmount, 0);

    const totalActiveTenants = tenants.filter((t: Tenant) => t.status === 'active').length;
    let globalTotalBeds = 0;
    rooms.forEach((r: Room) => {
      globalTotalBeds += r.totalBeds;
    });

    const vacantBedsRaw = globalTotalBeds - totalActiveTenants;
    const vacantBeds = vacantBedsRaw > 0 ? vacantBedsRaw : 0;

    // Generate a 6-month trailing history to allow Recharts to draw an Area curve
    const revenueHistory = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStr = format(d, 'yyyy-MM');

      const monthRev = payments
        .filter((p: Payment) => p.month === monthStr && p.status === 'paid')
        .reduce((sum: number, p: Payment) => sum + p.totalAmount, 0);

      revenueHistory.push({ name: monthStr, revenue: monthRev });
    }

    const floors = [...new Set((rooms || []).map((r: Room) => r.floor))].sort();
    const occupancyByFloor = (rooms || []).length > 0 && floors.length > 0 ? floors.map((floor) => {
      const floorRooms = (rooms || []).filter((r: Room) => r.floor === floor);

      const floorRoomIds = floorRooms.map((r: Room) => r.id);
      const occupied = (tenants || []).filter((t: Tenant) =>
        t.status === 'active' && floorRoomIds.includes(t.roomId)
      ).length;

      const total = floorRooms.reduce((sum: number, r: Room) => sum + r.totalBeds, 0);
      return { name: `Floor ${floor}`, occupied, total };
    }) : [{ name: 'Ground Floor', occupied: 0, total: 20 }]; // Synthetic payload prevents Recharts crash when entirely empty

    return {
      totalTenants: tenants.length,
      verifiedTenants: tenants.filter((t: Tenant) => t.kycStatus === 'verified').length,
      pendingKYC: kycs.filter((k: KYCData) => k.status === 'pending').length,
      vacantBeds,
      monthlyRevenue,
      openComplaints: complaints.filter((c: Complaint) => c.status !== 'resolved').length,
      totalTasks: (filteredData.tasks || []).length,
      pendingTasks: (filteredData.tasks || []).filter((t: Task) => t.status === 'pending').length,
      revenueHistory,
      occupancyByFloor
    };
  }, [filteredData]);

  const getStats = useCallback(() => computedStats, [computedStats]);

  return (
    <AppContext.Provider value={{
      ...filteredData,
      addTenant, updateTenant, deleteTenant,
      requestVacating, completeCheckout,
      addRoom, updateRoom, deleteRoom,
      addMeterGroup, updateMeterGroup, deleteMeterGroup,
      addPayment, updatePayment, deletePayment,
      addComplaint, updateComplaint, deleteComplaint,
      addEmployee, updateEmployee, deleteEmployee,
      updateKYC, deleteKYC, uploadVerifiedKYC,
      addAnnouncement, deleteAnnouncement,
      addSalaryPayment,
      updateSalaryPayment,
      deleteSalaryPayment,
      addTask, updateTask, deleteTask,
      updatePGConfig,
      addBranch, updateBranch, deleteBranch,
      addSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan,
      updateBranchSubscription,
      checkFeatureAccess,
      fetchData,
      getStats
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
