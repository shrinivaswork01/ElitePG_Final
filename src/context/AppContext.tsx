import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { Tenant, Room, Payment, Complaint, Employee, KYCData, Announcement, SalaryPayment, Task, PGConfig, PGBranch, RolePermissions, SubscriptionPlan, AppFeature, KYCStatus } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface AppContextType {
  tenants: Tenant[];
  rooms: Room[];
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

  // Actions
  addTenant: (tenant: Omit<Tenant, 'id' | 'branchId'>, kycDoc?: { type: string, url: string }, rentAgreementDoc?: { url: string }) => Promise<void>;
  updateTenant: (id: string, updates: Partial<Tenant>, kycDoc?: { type: string, url: string }, rentAgreementDoc?: { url: string }) => Promise<void>;
  deleteTenant: (id: string) => Promise<void>;

  addRoom: (room: Omit<Room, 'id' | 'branchId'>) => Promise<void>;
  updateRoom: (id: string, updates: Partial<Room>) => Promise<void>;
  deleteRoom: (id: string) => Promise<void>;

  addPayment: (payment: Omit<Payment, 'id' | 'branchId'>) => Promise<void>;
  updatePayment: (id: string, updates: Partial<Payment>) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;

  addComplaint: (complaint: Omit<Complaint, 'id' | 'branchId'>) => Promise<void>;
  updateComplaint: (id: string, updates: Partial<Complaint>) => Promise<void>;
  deleteComplaint: (id: string) => Promise<void>;

  addEmployee: (employee: Omit<Employee, 'id' | 'kycStatus' | 'branchId'>, kycDoc?: { type: string, url: string }) => Promise<void>;
  updateEmployee: (id: string, updates: Partial<Employee>, kycDoc?: { type: string, url: string }) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;

  updateKYC: (id: string, updates: Partial<KYCData>) => Promise<void>;

  addAnnouncement: (announcement: Omit<Announcement, 'id' | 'branchId'>) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;

  addSalaryPayment: (payment: Omit<SalaryPayment, 'id' | 'branchId'>) => Promise<void>;
  updateSalaryPayment: (id: string, updates: Partial<SalaryPayment>) => Promise<void>;

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
  updateBranchSubscription: (branchId: string, planId: string, status: 'active' | 'expired' | 'trial', endDate: string) => Promise<void>;
  checkFeatureAccess: (feature: AppFeature) => boolean;

  // Stats
  getStats: () => {
    totalTenants: number;
    verifiedTenants: number;
    pendingKYC: number;
    vacantBeds: number;
    monthlyRevenue: number;
    openComplaints: number;
    revenueHistory: { name: string, revenue: number }[];
    occupancyByFloor: { name: string, occupied: number, total: number }[];
  };
  currentBranch: PGBranch | undefined;
  currentPlan: SubscriptionPlan | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  const [data, setData] = useState<any>({
    tenants: [],
    rooms: [],
    payments: [],
    complaints: [],
    employees: [],
    kycs: [],
    announcements: [],
    salaryPayments: [],
    tasks: [],
    pgConfigs: [],
    branches: [],
    subscriptionPlans: []
  });

  const fetchData = useCallback(async () => {
    // We only fetch data if user is logged in
    if (!user) return;

    try {
      const [
        { data: branches },
        { data: plans },
        { data: tenants },
        { data: rooms },
        { data: payments },
        { data: complaints },
        { data: employees },
        { data: kycs },
        { data: announcements },
        { data: salaryPayments },
        { data: tasks },
        { data: pgConfigs }
      ] = await Promise.all([
        supabase.from('pg_branches').select('*'),
        supabase.from('subscription_plans').select('*'),
        supabase.from('tenants').select('*'),
        supabase.from('rooms').select('*'),
        supabase.from('payments').select('*'),
        supabase.from('complaints').select('*'),
        supabase.from('employees').select('*'),
        supabase.from('kyc_documents').select('*'),
        supabase.from('announcements').select('*'),
        supabase.from('salary_payments').select('*'),
        supabase.from('tasks').select('*'),
        supabase.from('pg_configs').select('*')
      ]);

      setData({
        branches: (branches || []).map(b => ({
          id: b.id, name: b.name, branchName: b.branch_name, address: b.address, phone: b.phone,
          planId: b.plan_id, subscriptionStatus: b.subscription_status, subscriptionEndDate: b.subscription_end_date, createdAt: b.created_at
        })),
        subscriptionPlans: (plans || []).map(p => ({
          id: p.id, name: p.name, price: p.price, features: p.features, maxTenants: p.max_tenants, maxRooms: p.max_rooms, billingCycle: p.billing_cycle
        })),
        tenants: (tenants || []).map(t => ({
          id: t.id, userId: t.user_id, name: t.name, email: t.email, phone: t.phone, roomId: t.room_id, bedNumber: t.bed_number, rentAmount: t.rent_amount, depositAmount: t.deposit_amount, joiningDate: t.joining_date, paymentDueDate: t.payment_due_date, status: t.status, kycStatus: t.kyc_status, rentAgreementUrl: t.rent_agreement_url, branchId: t.branch_id
        })),
        rooms: (rooms || []).map(r => ({
          id: r.id, roomNumber: r.room_number, floor: r.floor, totalBeds: r.total_beds, occupiedBeds: r.occupied_beds, type: r.type, price: r.price, branchId: r.branch_id
        })),
        payments: (payments || []).map(p => ({
          id: p.id, tenantId: p.tenant_id, amount: p.amount, lateFee: p.late_fee, totalAmount: p.total_amount, paymentDate: p.payment_date, month: p.month, status: p.status, method: p.method, transactionId: p.transaction_id, receiptUrl: p.receipt_url, branchId: p.branch_id
        })),
        complaints: (complaints || []).map(c => ({
          id: c.id, tenantId: c.tenant_id, title: c.title, description: c.description, category: c.category, priority: c.priority, status: c.status, assignedTo: c.assigned_to, resolvedAt: c.resolved_at, branchId: c.branch_id, createdAt: c.created_at
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
          id: t.id, employeeId: t.employee_id, title: t.title, description: t.description, status: t.status, priority: t.priority, dueDate: t.due_date, completedAt: t.completed_at, branchId: t.branch_id, createdAt: t.created_at
        })),
        pgConfigs: (pgConfigs || []).map(c => ({
          branchId: c.branch_id, rules: c.rules, rolePermissions: c.role_permissions, bannerUrl: c.banner_url
        }))
      });
    } catch (e) {
      console.error(e);
    }
  }, [user]);

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
      tenants: [], rooms: [], payments: [], complaints: [], employees: [], kycs: [], announcements: [], salaryPayments: [], tasks: [], pgConfig: null, subscriptionPlans: [], branches: []
    };

    if (user.role === 'super') return {
      ...data,
      pgConfig: data.pgConfigs[0] || null,
      subscriptionPlans: data.subscriptionPlans,
      branches: data.branches
    };

    const branchId = user.branchId;
    const branch = data.branches.find((b: PGBranch) => b.id === branchId);
    const plan = data.subscriptionPlans.find((p: SubscriptionPlan) => p.id === branch?.planId);

    return {
      tenants: data.tenants.filter((t: Tenant) => t.branchId === branchId),
      rooms: data.rooms.filter((r: Room) => r.branchId === branchId),
      payments: data.payments.filter((p: Payment) => p.branchId === branchId),
      complaints: data.complaints.filter((c: Complaint) => c.branchId === branchId),
      employees: data.employees.filter((e: Employee) => e.branchId === branchId),
      kycs: data.kycs.filter((k: KYCData) => k.branchId === branchId),
      announcements: data.announcements.filter((a: Announcement) => a.branchId === branchId),
      salaryPayments: data.salaryPayments.filter((p: SalaryPayment) => p.branchId === branchId),
      tasks: data.tasks.filter((t: Task) => t.branchId === branchId),
      pgConfig: data.pgConfigs.find((c: PGConfig) => c.branchId === branchId) || null,
      subscriptionPlans: data.subscriptionPlans,
      branches: data.branches,
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

  const addTenant = async (tenant: Omit<Tenant, 'id' | 'branchId'>, kycDoc?: { type: string, url: string }, rentAgreementDoc?: { url: string }) => {
    const branchId = user?.branchId || data.branches[0]?.id;
    if (!branchId) return;
    const kycStatus: KYCStatus = kycDoc ? 'pending' : 'unsubmitted';

    const dbPayload = {
      name: tenant.name, email: tenant.email, phone: tenant.phone, room_id: tenant.roomId, bed_number: tenant.bedNumber,
      rent_amount: tenant.rentAmount, deposit_amount: tenant.depositAmount, joining_date: tenant.joiningDate,
      payment_due_date: tenant.paymentDueDate, status: tenant.status, kyc_status: kycStatus,
      rent_agreement_url: rentAgreementDoc?.url || null, branch_id: branchId, user_id: tenant.userId || null
    };

    const { data: createdTenant, error } = await supabase.from('tenants').insert(dbPayload).select().single();
    if (error) { toast.error(error.message); return; }

    // Optimistically add new tenant to local state immediately
    const newTenant: Tenant = {
      ...tenant, id: createdTenant.id, branchId, kycStatus, userId: tenant.userId || undefined
    };
    applyOptimistic(prev => ({ ...prev, tenants: [...prev.tenants, newTenant] }));

    if (createdTenant && kycDoc) {
      await supabase.from('kyc_documents').insert({
        tenant_id: createdTenant.id, document_type: kycDoc.type, document_url: kycDoc.url, status: 'pending', branch_id: branchId
      });
    }
    toast.success('Tenant added successfully');
  };

  const updateTenant = async (id: string, updates: Partial<Tenant>, kycDoc?: { type: string, url: string }, rentAgreementDoc?: { url: string }) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.roomId !== undefined) dbUpdates.room_id = updates.roomId;
    if (updates.bedNumber !== undefined) dbUpdates.bed_number = updates.bedNumber;
    if (updates.rentAmount !== undefined) dbUpdates.rent_amount = updates.rentAmount;
    if (updates.depositAmount !== undefined) dbUpdates.deposit_amount = updates.depositAmount;
    if (updates.joiningDate !== undefined) dbUpdates.joining_date = updates.joiningDate;
    if (updates.paymentDueDate !== undefined) dbUpdates.payment_due_date = updates.paymentDueDate;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.kycStatus !== undefined) dbUpdates.kyc_status = updates.kycStatus;
    if (updates.userId !== undefined) dbUpdates.user_id = updates.userId;
    if (rentAgreementDoc) dbUpdates.rent_agreement_url = rentAgreementDoc.url;
    if (kycDoc) dbUpdates.kyc_status = 'pending';

    await refetch(supabase.from('tenants').update(dbUpdates).eq('id', id), 'Tenant updated successfully');
    if (kycDoc) {
      const tenant = data.tenants.find((t: any) => t.id === id);
      await refetch(supabase.from('kyc_documents').insert({
        tenant_id: id, document_type: kycDoc.type, document_url: kycDoc.url, status: 'pending', branch_id: tenant?.branchId
      }));
    }
  };

  const deleteTenant = async (id: string) => {
    // Optimistically remove from local state immediately for instant UI feedback
    applyOptimistic(prev => ({
      ...prev,
      tenants: prev.tenants.filter((t: any) => t.id !== id),
      payments: prev.payments.filter((p: any) => p.tenantId !== id),
      complaints: prev.complaints.filter((c: any) => c.tenantId !== id),
      kycs: prev.kycs.filter((k: any) => k.tenantId !== id)
    }));
    toast.success('Tenant deleted successfully');
    // Cascade-delete related records in background
    await supabase.from('payments').delete().eq('tenant_id', id);
    await supabase.from('complaints').delete().eq('tenant_id', id);
    await supabase.from('kyc_documents').delete().eq('tenant_id', id);
    const { error } = await supabase.from('tenants').delete().eq('id', id);
    if (error) { toast.error(`Delete failed: ${error.message}`); fetchData(); }
  };

  const addRoom = async (room: Omit<Room, 'id' | 'branchId'>) => {
    if (!user?.branchId) return;
    await refetch(supabase.from('rooms').insert({
      room_number: room.roomNumber, floor: room.floor, total_beds: room.totalBeds, occupied_beds: room.occupiedBeds,
      type: room.type, price: room.price, branch_id: user.branchId
    }), 'Room added successfully');
  };

  const updateRoom = async (id: string, updates: Partial<Room>) => {
    const dbUpdates: any = {};
    if (updates.roomNumber !== undefined) dbUpdates.room_number = updates.roomNumber;
    if (updates.floor !== undefined) dbUpdates.floor = updates.floor;
    if (updates.totalBeds !== undefined) dbUpdates.total_beds = updates.totalBeds;
    if (updates.occupiedBeds !== undefined) dbUpdates.occupied_beds = updates.occupiedBeds;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    await refetch(supabase.from('rooms').update(dbUpdates).eq('id', id), 'Room updated successfully');
  };

  const deleteRoom = async (id: string) => { await refetch(supabase.from('rooms').delete().eq('id', id), 'Room deleted'); };

  const addPayment = async (payment: Omit<Payment, 'id' | 'branchId'>) => {
    if (!user?.branchId) return;
    await refetch(supabase.from('payments').insert({
      tenant_id: payment.tenantId, amount: payment.amount, late_fee: payment.lateFee, total_amount: payment.totalAmount,
      payment_date: payment.paymentDate, month: payment.month, status: payment.status, method: payment.method,
      transaction_id: payment.transactionId || null, receipt_url: payment.receiptUrl || null, branch_id: user.branchId
    }), 'Payment recorded');
  };

  const updatePayment = async (id: string, updates: Partial<Payment>) => {
    const dbUpdates: any = {};
    if (updates.tenantId !== undefined) dbUpdates.tenant_id = updates.tenantId;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.lateFee !== undefined) dbUpdates.late_fee = updates.lateFee;
    if (updates.totalAmount !== undefined) dbUpdates.total_amount = updates.totalAmount;
    if (updates.paymentDate !== undefined) dbUpdates.payment_date = updates.paymentDate;
    if (updates.month !== undefined) dbUpdates.month = updates.month;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.method !== undefined) dbUpdates.method = updates.method;
    if (updates.transactionId !== undefined) dbUpdates.transaction_id = updates.transactionId;
    if (updates.receiptUrl !== undefined) dbUpdates.receipt_url = updates.receiptUrl;
    await refetch(supabase.from('payments').update(dbUpdates).eq('id', id), 'Payment updated');
  };

  const deletePayment = async (id: string) => { await refetch(supabase.from('payments').delete().eq('id', id), 'Payment deleted'); };

  const addComplaint = async (complaint: Omit<Complaint, 'id' | 'branchId'>) => {
    if (!user?.branchId) return;
    await refetch(supabase.from('complaints').insert({
      tenant_id: complaint.tenantId, title: complaint.title, description: complaint.description, category: complaint.category,
      priority: complaint.priority, status: complaint.status, assigned_to: complaint.assignedTo || null, branch_id: user.branchId
    }), 'Complaint registered');
  };

  const updateComplaint = async (id: string, updates: Partial<Complaint>) => {
    const dbUpdates: any = {};
    if (updates.tenantId !== undefined) dbUpdates.tenant_id = updates.tenantId;
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.assignedTo !== undefined) dbUpdates.assigned_to = updates.assignedTo;
    if (updates.resolvedAt !== undefined) dbUpdates.resolved_at = updates.resolvedAt;
    await refetch(supabase.from('complaints').update(dbUpdates).eq('id', id), 'Complaint updated');
  };

  const deleteComplaint = async (id: string) => { await refetch(supabase.from('complaints').delete().eq('id', id), 'Complaint deleted'); };

  const addEmployee = async (employee: Omit<Employee, 'id' | 'kycStatus' | 'branchId'>, kycDoc?: { type: string, url: string }) => {
    if (!user?.branchId) return;
    const kycStatus = kycDoc ? 'pending' : 'unsubmitted';
    const { data: createdEm, error } = await supabase.from('employees').insert({
      user_id: employee.userId || null, name: employee.name, role: employee.role, email: employee.email, phone: employee.phone,
      salary: employee.salary, joining_date: employee.joiningDate, kyc_status: kycStatus, branch_id: user.branchId
    }).select().single();
    if (error) { toast.error(error.message); return; }
    if (createdEm && kycDoc) {
      await supabase.from('kyc_documents').insert({
        employee_id: createdEm.id, document_type: kycDoc.type, document_url: kycDoc.url, status: 'pending', branch_id: user.branchId
      });
    }
    toast.success('Employee added successfully');
    await fetchData();
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>, kycDoc?: { type: string, url: string }) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.salary !== undefined) dbUpdates.salary = updates.salary;
    if (updates.joiningDate !== undefined) dbUpdates.joining_date = updates.joiningDate;
    if (updates.kycStatus !== undefined) dbUpdates.kyc_status = updates.kycStatus;
    if (updates.userId !== undefined) dbUpdates.user_id = updates.userId;
    if (kycDoc) dbUpdates.kyc_status = 'pending';

    await refetch(supabase.from('employees').update(dbUpdates).eq('id', id), 'Employee updated successfully');
    if (kycDoc) {
      const e = data.employees.find((e: any) => e.id === id);
      await refetch(supabase.from('kyc_documents').insert({
        employee_id: id, document_type: kycDoc.type, document_url: kycDoc.url, status: 'pending', branch_id: e?.branchId || user?.branchId
      }));
    }
  };

  const deleteEmployee = async (id: string) => {
    // Optimistically remove from local state immediately
    applyOptimistic(prev => ({
      ...prev,
      employees: prev.employees.filter((e: any) => e.id !== id),
      kycs: prev.kycs.filter((k: any) => k.employeeId !== id),
      salaryPayments: prev.salaryPayments.filter((s: any) => s.employeeId !== id),
      tasks: prev.tasks.filter((t: any) => t.employeeId !== id)
    }));
    toast.success('Employee deleted successfully');
    // Cascade-delete related records in background
    await supabase.from('kyc_documents').delete().eq('employee_id', id);
    await supabase.from('salary_payments').delete().eq('employee_id', id);
    await supabase.from('tasks').delete().eq('employee_id', id);
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) { toast.error(`Delete failed: ${error.message}`); fetchData(); }
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

  const addAnnouncement = async (announcement: Omit<Announcement, 'id' | 'branchId'>) => {
    if (!user?.branchId) return;
    await refetch(supabase.from('announcements').insert({
      title: announcement.title, content: announcement.content, target: announcement.target,
      created_by: announcement.createdBy, branch_id: user.branchId
    }), 'Announcement published');
  };

  const deleteAnnouncement = async (id: string) => { await refetch(supabase.from('announcements').delete().eq('id', id), 'Announcement deleted'); };

  const addSalaryPayment = async (payment: Omit<SalaryPayment, 'id' | 'branchId'>) => {
    if (!user?.branchId) return;
    await refetch(supabase.from('salary_payments').insert({
      employee_id: payment.employeeId, amount: payment.amount, month: payment.month, payment_date: payment.paymentDate,
      status: payment.status, method: payment.method, transaction_id: payment.transactionId || null, branch_id: user.branchId
    }), 'Salary payment recorded');
  };

  const updateSalaryPayment = async (id: string, updates: Partial<SalaryPayment>) => {
    const dbUpdates: any = {};
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.month !== undefined) dbUpdates.month = updates.month;
    if (updates.paymentDate !== undefined) dbUpdates.payment_date = updates.paymentDate;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.method !== undefined) dbUpdates.method = updates.method;
    if (updates.transactionId !== undefined) dbUpdates.transaction_id = updates.transactionId;
    await refetch(supabase.from('salary_payments').update(dbUpdates).eq('id', id), 'Salary payment updated');
  };

  const addTask = async (task: Omit<Task, 'id' | 'branchId'>) => {
    if (!user?.branchId) return;
    await refetch(supabase.from('tasks').insert({
      employee_id: task.employeeId, title: task.title, description: task.description, status: task.status,
      priority: task.priority, due_date: task.dueDate, completed_at: task.completedAt || null, branch_id: user.branchId
    }), 'Task assigned');
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const dbUpdates: any = {};
    if (updates.employeeId !== undefined) dbUpdates.employee_id = updates.employeeId;
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
    if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;
    await refetch(supabase.from('tasks').update(dbUpdates).eq('id', id), 'Task updated');
  };

  const deleteTask = async (id: string) => { await refetch(supabase.from('tasks').delete().eq('id', id), 'Task deleted'); };

  const updatePGConfig = async (updates: Partial<PGConfig>) => {
    if (!user?.branchId) return;
    const dbUpdates: any = {};
    if (updates.rules !== undefined) dbUpdates.rules = updates.rules;
    if (updates.rolePermissions !== undefined) dbUpdates.role_permissions = updates.rolePermissions;

    // Check if PG Config already exists
    const existing = data.pgConfigs.find((c: any) => c.branchId === user.branchId);
    if (existing) {
      await refetch(supabase.from('pg_configs').update(dbUpdates).eq('branch_id', user.branchId), 'Settings updated');
    } else {
      await refetch(supabase.from('pg_configs').insert({ ...dbUpdates, branch_id: user.branchId }), 'Settings initialized');
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
    await refetch(supabase.from('pg_branches').update(dbUpdates).eq('id', id), 'Branch updated');
  };

  const deleteBranch = async (id: string) => { await refetch(supabase.from('pg_branches').delete().eq('id', id), 'Branch removed'); };

  const addSubscriptionPlan = async (plan: Omit<SubscriptionPlan, 'id'>) => {
    await refetch(supabase.from('subscription_plans').insert({
      name: plan.name, price: plan.price, features: plan.features, max_tenants: plan.maxTenants,
      max_rooms: plan.maxRooms, billing_cycle: plan.billingCycle
    }), 'Plan created');
  };

  const updateSubscriptionPlan = async (id: string, updates: Partial<SubscriptionPlan>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.features !== undefined) dbUpdates.features = updates.features;
    if (updates.maxTenants !== undefined) dbUpdates.max_tenants = updates.maxTenants;
    if (updates.maxRooms !== undefined) dbUpdates.max_rooms = updates.maxRooms;
    if (updates.billingCycle !== undefined) dbUpdates.billing_cycle = updates.billingCycle;
    await refetch(supabase.from('subscription_plans').update(dbUpdates).eq('id', id), 'Plan updated');
  };

  const deleteSubscriptionPlan = async (id: string) => { await refetch(supabase.from('subscription_plans').delete().eq('id', id), 'Plan deleted'); };

  const updateBranchSubscription = async (branchId: string, planId: string, status: 'active' | 'expired' | 'trial', endDate: string) => {
    await refetch(supabase.from('pg_branches').update({
      plan_id: planId, subscription_status: status, subscription_end_date: endDate
    }).eq('id', branchId), 'Subscription updated');
  };

  const getStats = () => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const payments = filteredData.payments;
    const rooms = filteredData.rooms;
    const tenants = filteredData.tenants;
    const kycs = filteredData.kycs;
    const complaints = filteredData.complaints;

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
      const monthStr = d.toISOString().substring(0, 7); // YYYY-MM

      const monthRev = payments
        .filter((p: Payment) => p.month === monthStr && p.status === 'paid')
        .reduce((sum: number, p: Payment) => sum + p.totalAmount, 0);

      revenueHistory.push({ name: monthStr, revenue: monthRev });
    }

    const floors = [...new Set(rooms.map((r: Room) => r.floor))].sort();
    const occupancyByFloor = rooms.length > 0 && floors.length > 0 ? floors.map(floor => {
      const floorRooms = rooms.filter((r: Room) => r.floor === floor);

      const floorRoomIds = floorRooms.map((r: Room) => r.id);
      const occupied = tenants.filter((t: Tenant) =>
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
      revenueHistory,
      occupancyByFloor
    };
  };

  return (
    <AppContext.Provider value={{
      ...filteredData,
      addTenant, updateTenant, deleteTenant,
      addRoom, updateRoom, deleteRoom,
      addPayment, updatePayment, deletePayment,
      addComplaint, updateComplaint, deleteComplaint,
      addEmployee, updateEmployee, deleteEmployee,
      updateKYC,
      addAnnouncement, deleteAnnouncement,
      addSalaryPayment, updateSalaryPayment,
      addTask, updateTask, deleteTask,
      updatePGConfig,
      addBranch, updateBranch, deleteBranch,
      addSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan,
      updateBranchSubscription,
      checkFeatureAccess,
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
