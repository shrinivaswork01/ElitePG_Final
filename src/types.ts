/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'super' | 'admin' | 'partner' | 'manager' | 'caretaker' | 'tenant' | 'cleaner' | 'security' | 'none' | (string & {});

export type AppFeature = 'tenants' | 'rooms' | 'payments' | 'complaints' | 'kyc' | 'employees' | 'broadcast' | 'analytics' | 'whatsapp' | 'reports' | 'multi-branch' | 'expenses' | 'tasks';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;         // Monthly price (e.g. 499)
  annualPrice: number;   // Annual total price (e.g. 4999)
  features: AppFeature[];
  maxTenants: number;
  maxRooms: number;
  maxBranches: number;
  razorpayMonthlyPlanId?: string; // Razorpay plan ID for monthly billing
  razorpayAnnualPlanId?: string;  // Razorpay plan ID for annual billing
}

export interface PGBranch {
  id: string;
  name: string; // PG Name
  branchName: string; // PG Branch
  address: string; // PG Address
  phone: string; // Contact
  createdAt: string;
  planId: string;
  subscriptionStatus: 'active' | 'expired' | 'trial';
  subscriptionEndDate: string;
  razorpayCustomerId?: string;
  razorpaySubscriptionId?: string;
  officialSignatureUrl?: string; // New: Official signature for all receipts
}

export interface RolePermissions {
  role: UserRole;
  visibleTabs: string[]; // Array of hrefs from navigation
}

export interface User {
  id: string;
  username: string;
  role: UserRole;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  seenAnnouncements?: string[]; // Array of announcement IDs
  isAuthorized: boolean;
  requiresPasswordChange?: boolean;
  password?: string;
  branchId?: string; // ACTIVE branch (runtime selection)
  branchIds?: string[]; // ALL branches this user owns/manages
  provider?: 'local' | 'google';
  google_id?: string;
  signatureUrl?: string;
  permissions?: string[]; // Array of allowed routing tabs (PBAC)
}

export interface UserInvite {
  id: string;
  inviteCode: string;
  email?: string;
  branchId: string;
  role: UserRole;
  status: 'pending' | 'accepted';
  createdAt: string;
}

export type KYCStatus = 'unsubmitted' | 'pending' | 'verified' | 'rejected';

export interface KYCData {
  id: string;
  tenantId?: string;
  employeeId?: string;
  documentType: string;
  documentUrl: string;
  status: KYCStatus;
  submittedAt: string;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  branchId: string;
}

export type TenantStatus = 'active' | 'vacating' | 'vacated' | 'blacklisted' | 'onboarding';

export interface Tenant {
  id: string;
  userId?: string; // Link to User if they have login access
  name: string;
  email: string;
  phone: string;
  roomId: string;
  bedNumber: number;
  rentAmount: number;
  depositAmount: number;
  tokenAmount?: number;
  tokenStatus?: 'paid' | 'pending' | 'refunded';
  depositStatus?: 'paid' | 'pending' | 'refunded';
  depositRefundDate?: string;
  joiningDate: string;
  paymentDueDate: number; // Day of month (1-31)
  status: TenantStatus;
  kycStatus: KYCStatus;
  rentAgreementUrl?: string;
  signatureUrl?: string;
  inviteCode?: string;
  branchId: string;
  isAcUser?: boolean; // Whether tenant uses AC (for electricity split)
  vacatingDate?: string;
  exitDate?: string;
  vacatingStatus: 'active' | 'notice_given' | 'vacated';
  depositBalance?: number; // Running deposit balance (decreases with adjustments)
  moveInDate?: string; // Physical move-in date (vs joiningDate = booking date)
  depositLogs?: {
    id: string;
    type: 'deposit' | 'token';
    amount: number;
    status: 'paid' | 'refunded' | 'pending';
    date: string;
    note?: string;
  }[];
}

export interface MeterGroup {
  id: string;
  name: string;
  floor: number;
  branchId: string;
  createdAt: string;
}

export interface Room {
  id: string;
  roomNumber: string;
  floor: number;
  totalBeds: number;
  occupiedBeds: number;
  type: 'AC' | 'Non-AC';
  price: number;
  branchId: string;
  description?: string;
  amenities?: string[];
  meterGroupId?: string; // Links room to a MeterGroup (Flat)
  meterGroup?: MeterGroup; // Embedded optional joined object
}

export interface Payment {
  id: string;
  tenantId: string;
  amount: number;
  lateFee: number;
  totalAmount: number;
  paymentType: 'rent' | 'electricity' | 'token' | 'deposit' | 'adjust';
  paymentDate: string;
  month: string; // e.g., "2024-03"
  status: 'paid' | 'pending';
  method: 'Online' | 'Cash' | 'Offline';
  transactionId?: string;
  receiptUrl?: string;
  branchId: string;
  createdBy?: string; // User ID
  electricityAmount?: number; // Per-tenant electricity share
  electricityBillId?: string; // FK to electricity_bills
  proofUrl?: string; // Tenant uploaded payment proof (screenshot)
  // New Persistence Fields
  baseShare?: number;
  acShare?: number;
  unitsConsumed?: number;
  costPerUnit?: number;
  actualBillUrl?: string;
  acBillUrl?: string;
  category?: 'rent' | 'electricity' | 'deposit' | 'token' | 'adjust' | 'share_payout' | 'other';
  referenceId?: string; // e.g. Tenant ID or Expense ID for context
}

export interface ElectricityBill {
  id: string;
  meterGroupId: string; // The primary link now
  branchId: string;
  month: string; // e.g., '2026-03'
  totalAmount: number;
  actualAmount: number; // Legacy: base bill amount. New: same as totalAmount
  acAmount: number; // Legacy: manual AC amount. New: computed from readings
  totalUnits?: number; // NEW: total meter units for unit-based billing
  acBillUrl?: string;
  actualBillUrl?: string;
  acReading?: number; // Legacy field
  acReadingUrl?: string; // Legacy field
  createdAt: string;
  roomId?: string; // Kept for legacy compatibility
}

export interface RoomAcReading {
  id?: string;
  roomId: string;
  roomNumber?: string; // For display
  electricityBillId?: string;
  branchId: string;
  month: string;
  previousReading: number;
  currentReading: number;
  unitsConsumed?: number; // Computed: current - previous
}

export interface ElectricityShare {
  tenantId: string;
  tenantName: string;
  roomId?: string;
  roomNumber?: string;
  roomType?: 'AC' | 'Non-AC';
  baseShare: number;
  acShare: number;
  total: number;
  isAcUser: boolean;
  unitsConsumed?: number; // AC units for this tenant's room
  costPerUnit?: number;
}

export interface SalaryPayment {
  id: string;
  employeeId: string;
  amount: number;
  month: string;
  paymentDate: string;
  status: 'paid' | 'pending';
  method: 'Bank Transfer' | 'Cash' | 'UPI';
  transactionId?: string;
  branchId: string;
}

export interface Task {
  id: string;
  employeeId: string;
  complaintId?: string; // Link to complaint
  title: string;
  description: string;
  status: 'pending' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  createdAt: string;
  completedAt?: string;
  completionComment?: string;
  completionImages?: string[];
  branchId: string;
}


export type ComplaintStatus = 'open' | 'assigned' | 'resolved';
export type ComplaintPriority = 'low' | 'medium' | 'high';

export interface Complaint {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  category: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  createdAt: string;
  assignedTo?: string; // Employee ID
  resolvedAt?: string;
  images?: string[];
  branchId: string;
  resolutionComment?: string;
  resolutionImages?: string[];
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  target: 'all' | 'active' | 'vacating';
  createdAt: string;
  createdBy: string;
  branchId: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  salary: number;
  joiningDate: string;
  userId?: string;
  kycStatus: KYCStatus;
  branchId: string;
  signatureUrl?: string;
}

export interface PGConfig {
  rules: string[];
  rolePermissions: RolePermissions[];
  branchId: string;
  complaintCategories: string[];
  customRoles?: string[];
  logoUrl?: string;
  pgName?: string;
  primaryColor?: string;
  theme?: 'light' | 'dark' | 'system';
  defaultPaymentDueDate?: number;
  defaultLateFeeDay?: number;
  lateFeeAmount?: number;
  razorpayKeyId?: string;
}

// === Financial Management Types ===

export type ExpenseCategory = 'apex' | 'capital' | 'operational' | 'maintenance' | 'salary' | 'utility' | 'other';
export type ExpenseStatus = 'saved' | 'pending' | 'approved' | 'rejected';

export interface Expense {
  id: string;
  branchId: string;
  category: ExpenseCategory;
  title: string;
  description?: string;
  amount: number;
  date: string;
  receiptUrl?: string;
  createdBy: string;
  approvedBy?: string[];
  rejectedBy?: string[];
  status: ExpenseStatus;
  month: string;
  editedBy?: string;
  editedAt?: string;
  createdAt: string;
}

export interface Partner {
  id: string;
  userId: string;
  branchIds: string[];
  sharePercentage: number;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
}

export interface PartnerShare {
  id: string;
  userId: string;
  branchId: string;
  ratio: number;
  effectiveFrom: string; // YYYY-MM
  createdAt: string;
}

export interface ProfitDistribution {
  id: string;
  branchId: string;
  month: string;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  distributions: {
    partnerId: string;
    partnerName: string;
    sharePercentage: number;
    amount: number;
  }[];
  createdAt: string;
}
