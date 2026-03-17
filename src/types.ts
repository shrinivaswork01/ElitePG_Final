/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'super' | 'admin' | 'manager' | 'caretaker' | 'tenant' | 'cleaner' | 'security' | 'none' | (string & {});

export type AppFeature = 'tenants' | 'rooms' | 'payments' | 'complaints' | 'kyc' | 'employees' | 'broadcast' | 'analytics' | 'whatsapp' | 'reports' | 'multi-branch';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;         // Monthly price (e.g. 499)
  annualPrice: number;   // Annual total price (e.g. 4999)
  features: AppFeature[];
  maxTenants: number;
  maxRooms: number;
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
  branchId?: string; // Optional for super admin, required for others
  provider?: 'local' | 'google';
  google_id?: string;
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

export type TenantStatus = 'active' | 'vacating' | 'vacated' | 'blacklisted';

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
  joiningDate: string;
  paymentDueDate: number; // Day of month (1-31)
  status: TenantStatus;
  kycStatus: KYCStatus;
  rentAgreementUrl?: string;
  branchId: string;
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
}

export interface Payment {
  id: string;
  tenantId: string;
  amount: number;
  lateFee: number;
  totalAmount: number;
  paymentDate: string;
  month: string; // e.g., "2024-03"
  status: 'paid' | 'pending';
  method: 'Online' | 'Cash' | 'Offline';
  transactionId?: string;
  receiptUrl?: string;
  branchId: string;
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
  branchId: string;
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
}
