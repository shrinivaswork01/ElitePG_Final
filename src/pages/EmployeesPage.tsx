import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Employee, Task, SalaryPayment, KYCData } from '../types';
import { Navigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
  Plus,
  UserCog,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Trash2,
  Edit2,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  History,
  ClipboardList,
  Shield,
  UserPlus,
  Users,
  X,
  Upload,
  FileText,
  MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EmployeeMobileList } from '../components/EmployeeMobileList';
import { cn } from '../utils';
import toast from 'react-hot-toast';

export const EmployeesPage = () => {
  const { user, users, register, authorizeUser, updateUser } = useAuth();
  const {
    employees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    salaryPayments,
    addSalaryPayment,
    updateSalaryPayment,
    deleteSalaryPayment,
    tasks,
    addTask,
    updateTask,
    deleteTask,
    kycs,
    updateKYC,
    pgConfig,
    updatePGConfig
  } = useApp();

  if (user?.role === 'tenant') {
    return <Navigate to="/" replace />;
  }
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMobileActionsOpen, setIsMobileActionsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'salaries'>('list');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [salarySearchTerm, setSalarySearchTerm] = useState('');
  const [kycToReject, setKycToReject] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [salaryToDelete, setSalaryToDelete] = useState<SalaryPayment | null>(null);
  const [isRolesModalOpen, setIsRolesModalOpen] = useState(false);
  const [isVisibilityModalOpen, setIsVisibilityModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  // Task Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskFormData, setTaskFormData] = useState<Omit<Task, 'id' | 'branchId'>>({
    employeeId: '',
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    dueDate: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString().split('T')[0]
  });

  // Salary Modal State
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [salaryFormData, setSalaryFormData] = useState<Omit<SalaryPayment, 'id' | 'branchId'>>({
    employeeId: '',
    amount: 0,
    month: format(new Date(), 'yyyy-MM'),
    paymentDate: new Date().toISOString().split('T')[0],
    status: 'paid',
    method: 'UPI'
  });

  const [formData, setFormData] = useState<Omit<Employee, 'id' | 'branchId'>>({
    name: '',
    role: 'none',
    email: '',
    phone: '',
    salary: 0,
    joiningDate: new Date().toISOString().split('T')[0],
    kycStatus: 'unsubmitted'
  });

  const [kycFile, setKycFile] = useState<{ type: string, file?: File, url?: string, fileName: string }>({
    type: 'Aadhar Card',
    fileName: ''
  });

  const handleEditClick = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData(employee);
    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingEmployee(null);
    setFormData({
      name: '',
      role: 'none',
      email: '',
      phone: '',
      salary: 0,
      joiningDate: new Date().toISOString().split('T')[0],
      kycStatus: 'unsubmitted'
    });
    setKycFile({
      type: 'Aadhar Card',
      fileName: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const kycData = kycFile.url || kycFile.file ? { type: kycFile.type, file: kycFile.file, url: kycFile.url } : undefined;
    let success = false;

    if (editingEmployee) {
      success = await updateEmployee(editingEmployee.id, formData, kycData);
      if (success && editingEmployee.userId) {
        updateUser(editingEmployee.userId, { name: formData.name, email: formData.email, phone: formData.phone });
      }
    } else {
      success = await addEmployee(formData, kycData);
    }

    if (success) {
      handleCloseModal();
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    // Delete all references first
    const employeeTasks = tasks.filter(t => t.employeeId === employeeId);
    for (const task of employeeTasks) {
      await deleteTask(task.id);
    }

    const employeeSalaries = salaryPayments.filter(s => s.employeeId === employeeId);
    for (const salary of employeeSalaries) {
      await deleteSalaryPayment(salary.id);
    }

    // Finally delete the employee
    await deleteEmployee(employeeId);
    setEmployeeToDelete(null);
    toast.success('Employee and all related data deleted successfully');
  };

  const handleBulkDeleteEmployees = async (ids: string[]) => {
    if (!window.confirm(`Are you sure you want to delete ${ids.length} employees and all their related data?`)) return;
    
    let count = 0;
    for (const id of ids) {
      await handleDeleteEmployee(id);
      count++;
    }
    toast.success(`${count} employees deleted successfully`);
  };


  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    addTask(taskFormData);
    setIsTaskModalOpen(false);
  };

  const handleAddSalary = (e: React.FormEvent) => {
    e.preventDefault();

    const employee = employees.find(emp => emp.id === salaryFormData.employeeId);

    // For cash payments, record directly
    if (salaryFormData.method === 'Cash') {
      addSalaryPayment({
        ...salaryFormData,
        status: 'paid',
        transactionId: `cash-${Date.now()}`
      });
      setIsSalaryModalOpen(false);
      toast.success('Cash salary payment recorded successfully');
      return;
    }

    // For UPI / Bank Transfer payments, launch a direct UPI deep intent
    const upiId = employee?.phone ? `${employee.phone.replace(/\D/g, '').slice(-10)}@ybl` : 'merchant@upi';
    const encodedName = encodeURIComponent(employee?.name || 'Employee');
    const uUrl = `upi://pay?pa=${upiId}&pn=${encodedName}&am=${salaryFormData.amount}&cu=INR&tn=Salary Payment - ${salaryFormData.month}`;
    
    // Attempt to open the UPI app natively on the user's mobile device
    window.location.href = uUrl;

    // Record the payment
    addSalaryPayment({
      ...salaryFormData,
      status: 'paid',
      transactionId: `upi-${Date.now()}`
    });
    
    setIsSalaryModalOpen(false);
    toast.success('UPI intent launched. Recorded salary payment successfully.');
  };


  const handleKYCAction = (kycId: string, action: 'verify' | 'reject', reason?: string) => {
    if (action === 'verify') {
      const kyc = kycs.find(k => k.id === kycId);
      if (kyc) {
        const employee = employees.find(e => e.id === kyc.employeeId);
        if (employee?.userId) {
          authorizeUser(employee.userId);
        }
      }
      updateKYC(kycId, {
        status: 'verified',
        verifiedBy: user?.name,
        verifiedAt: new Date().toISOString().split('T')[0]
      });
    } else {
      updateKYC(kycId, {
        status: 'rejected',
        rejectionReason: reason
      });
    }
  };

  const filteredEmployees = employees.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.role.toLowerCase().includes(searchTerm.toLowerCase());

    if (user?.role === 'admin') return matchesSearch;

    // Staff see only themselves
    return matchesSearch && (e.userId === user?.id || e.email === user?.email);
  });

  const filteredSalaries = salaryPayments
    .filter(p => {
      const employee = employees.find(e => e.id === p.employeeId);
      const matchesSearch = employee?.name.toLowerCase().includes(salarySearchTerm.toLowerCase()) ||
        p.month.toLowerCase().includes(salarySearchTerm.toLowerCase()) ||
        p.method.toLowerCase().includes(salarySearchTerm.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Employees</h2>
          <p className="text-gray-500 dark:text-gray-400">Manage your staff and payroll.</p>
        </div>
        {user?.role === 'admin' && (
          <>
            <div className="hidden md:flex gap-2">
              <button
                onClick={() => setActiveTab(activeTab === 'list' ? 'salaries' : 'list')}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-white/10 transition-all"
              >
                {activeTab === 'list' ? <History className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                {activeTab === 'list' ? 'Salary History' : 'Staff List'}
              </button>
              <button
                onClick={() => setIsRolesModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-white/10 transition-all"
              >
                <Shield className="w-5 h-5 text-indigo-500" />
                Manage Roles
              </button>
              <button
                onClick={() => setIsVisibilityModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-white/10 transition-all"
              >
                <UserCog className="w-5 h-5 text-amber-500" />
                Role Visibility
              </button>
              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-white/10 transition-all"
              >
                <ClipboardList className="w-5 h-5 text-indigo-500" />
                Add Task
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
              >
                <Plus className="w-5 h-5" />
                Add Employee
              </button>
            </div>
            
            {/* Mobile Actions Trigger */}
            <div className="md:hidden flex gap-2">
              <button
                onClick={() => setIsMobileActionsOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-white/10 transition-all"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </>
        )}
      </div>

      {activeTab === 'list' ? (
        <>
          <div className="bg-white dark:bg-[#111111] p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
              />
            </div>
            <button className="p-2.5 bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors w-fit">
              <Filter className="w-5 h-5" />
            </button>
          </div>

          <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmployees.map((employee) => (
              <motion.div
                key={employee.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden group hover:shadow-md transition-all"
              >
                <div className="p-6">
                  <div 
                    className="flex items-start justify-between mb-6 cursor-pointer"
                    onClick={() => setSelectedEmployee(employee)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center font-bold text-xl">
                        {employee.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{employee.name}</h3>
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                          {employee.role}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleEditClick(employee)}
                        className="p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEmployee(employee.id)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                        <Mail className="w-4 h-4" />
                        {employee.email}
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase",
                        employee.kycStatus === 'verified' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600" :
                          employee.kycStatus === 'pending' ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600" :
                            "bg-gray-100 dark:bg-white/5 text-gray-500"
                      )}>
                        KYC: {employee.kycStatus}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                      <Phone className="w-4 h-4" />
                      {employee.phone}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      Joined {employee.joiningDate}
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-50 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Monthly Salary</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">₹{employee.salary.toLocaleString()}</p>
                    </div>
                    <button
                      onClick={() => {
                        setSalaryFormData({ ...salaryFormData, employeeId: employee.id, amount: employee.salary });
                        setIsSalaryModalOpen(true);
                      }}
                      className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 transition-colors"
                      title="Pay Salary"
                    >
                      <DollarSign className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="block md:hidden">
            <EmployeeMobileList
              employees={filteredEmployees}
              onTap={(e) => setSelectedEmployee(e)}
              onEdit={handleEditClick}
              onSalary={(e) => {
                setSalaryFormData({ ...salaryFormData, employeeId: e.id, amount: e.salary });
                setIsSalaryModalOpen(true);
              }}
              onDelete={(e) => {
                if(window.confirm(`Are you sure you want to delete ${e.name}?`)) {
                   handleDeleteEmployee(e.id);
                }
              }}
              onBulkDelete={handleBulkDeleteEmployees}
            />
          </div>

        </>
      ) : (
        <div className="bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 flex-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white whitespace-nowrap">Salary Payment History</h3>
              <div className="relative flex-1 w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, month, or method..."
                  value={salarySearchTerm}
                  onChange={(e) => setSalarySearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Payroll</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">₹{salaryPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Month</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Method</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {filteredSalaries.map((payment) => {
                  const employee = employees.find(e => e.id === payment.employeeId);
                  return (
                    <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center font-bold text-xs text-gray-900 dark:text-white">
                            {employee?.name?.charAt(0) || '?'}
                          </div>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{employee?.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{format(parseISO(payment.month + '-01'), 'MMMM yyyy')}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">₹{payment.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{payment.paymentDate}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{payment.method}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSalaryToDelete(payment)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-red-400 hover:text-red-600 transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {salaryPayments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 italic">No salary payments recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col md:hidden border-t border-gray-100 dark:border-white/5 divide-y divide-gray-50 dark:divide-white/5">
            {filteredSalaries.map((payment) => {
              const employee = employees.find(e => e.id === payment.employeeId);
              return (
                <div key={payment.id} className="p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 shrink-0 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center font-bold text-xs text-gray-900 dark:text-white">
                        {employee?.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white block truncate max-w-[140px]">{employee?.name}</span>
                        <span className="text-[10px] text-gray-500">{format(parseISO(payment.month + '-01'), 'MMM yyyy')} • {payment.paymentDate}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                       <span className="text-sm font-bold text-gray-900 dark:text-white block">₹{payment.amount.toLocaleString()}</span>
                       <span className="px-2 py-0.5 mt-1 inline-block bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded text-[9px] font-bold uppercase tracking-wider">{payment.status}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 mt-1 border-t border-dashed border-gray-100 dark:border-white/10">
                     <span className="text-xs text-gray-500 font-medium capitalize">Method: {payment.method}</span>
                     <button
                       onClick={() => setSalaryToDelete(payment)}
                       className="p-1.5 rounded-lg text-red-400 hover:text-red-600 bg-red-50 dark:bg-red-500/10 transition-colors"
                     >
                       <Trash2 className="w-3.5 h-3.5" />
                     </button>
                  </div>
                </div>
              );
            })}
            {salaryPayments.length === 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 italic text-sm">No salary payments recorded yet.</div>
            )}
          </div>
        </div>
      )}

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
              className="relative w-full max-w-md bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto border border-white/5"
            >
              <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white dark:bg-[#111111] z-10">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                </h3>
                <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                  <Plus className="w-6 h-6 rotate-45 text-gray-400" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
                <div className="space-y-4">
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
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Role</label>
                    <select
                      required
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                    >
                      <option value="none">No role</option>
                      <option value="manager">Manager</option>
                      <option value="caretaker">Caretaker</option>
                      <option value="cleaner">Cleaner</option>
                      <option value="security">Security</option>
                      {pgConfig?.customRoles?.map(role => (
                        <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Email</label>
                      <input
                        required
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Phone</label>
                      <input
                        required
                        type="tel"
                        pattern="[0-9]{10}"
                        maxLength={10}
                        title="Please enter a valid 10-digit mobile number"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Monthly Salary (₹)</label>
                    <input
                      required
                      type="number"
                      value={formData.salary}
                      onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">KYC Document</label>
                    <div className="grid grid-cols-2 gap-4">
                      <select
                        value={kycFile.type}
                        onChange={(e) => setKycFile({ ...kycFile, type: e.target.value })}
                        className="px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                      >
                        <option value="Aadhar Card">Aadhar Card</option>
                        <option value="PAN Card">PAN Card</option>
                        <option value="Voter ID">Voter ID</option>
                      </select>
                      <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-all">
                        <Upload className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-500 truncate max-w-[100px]">
                          {kycFile.fileName || 'Upload'}
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*,.pdf"
                          onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 1.5 * 1024 * 1024) {
                                  toast.error('File size too large! Please upload a file smaller than 1.5MB.');
                                  return;
                                }
                                setKycFile({ ...kycFile, file, fileName: file.name, url: URL.createObjectURL(file) });
                              }
                          }}
                        />
                      </label>
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
                    className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                    style={{ backgroundColor: pgConfig?.primaryColor }}
                  >
                    {editingEmployee ? 'Update Employee' : 'Add Employee'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Employee Details Modal */}
      <AnimatePresence>
        {selectedEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEmployee(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-white/5"
            >
              <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-white dark:bg-[#111111] sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-bold text-xl">
                    {selectedEmployee.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedEmployee.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{selectedEmployee.role}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedEmployee(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                  <Plus className="w-6 h-6 rotate-45 text-gray-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tasks Completed</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {tasks.filter(t => t.employeeId === selectedEmployee.id && t.status === 'completed').length}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Pending Tasks</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {tasks.filter(t => t.employeeId === selectedEmployee.id && t.status !== 'completed').length}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Paid</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      ₹{salaryPayments.filter(p => p.employeeId === selectedEmployee.id).reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Tasks Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-indigo-600" />
                        Tasks
                      </h4>
                      <button
                        onClick={() => {
                          setTaskFormData({ ...taskFormData, employeeId: selectedEmployee.id });
                          setIsTaskModalOpen(true);
                        }}
                        className="text-sm font-bold text-indigo-600 hover:underline"
                      >
                        Assign Task
                      </button>
                    </div>
                    <div className="space-y-3">
                      {tasks.filter(t => t.employeeId === selectedEmployee.id).map(task => (
                        <div key={task.id} className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-bold text-gray-900 dark:text-white">{task.title}</h5>
                            <span className={cn(
                              "px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase",
                              task.status === 'completed' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600" : "bg-amber-50 dark:bg-amber-500/10 text-amber-600"
                            )}>
                              {task.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{task.description}</p>
                          <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase">
                            <span>Due: {task.dueDate}</span>
                            <div className="flex gap-2">
                              {task.status !== 'completed' && (
                                <button
                                  onClick={() => updateTask(task.id, { status: 'completed' })}
                                  className="text-emerald-600 hover:underline"
                                >
                                  Mark Done
                                </button>
                              )}
                              <button
                                onClick={() => deleteTask(task.id)}
                                className="text-rose-600 hover:underline"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {tasks.filter(t => t.employeeId === selectedEmployee.id).length === 0 && (
                        <p className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm italic">No tasks assigned.</p>
                      )}
                    </div>
                  </div>

                  {/* Salary History Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <History className="w-5 h-5 text-emerald-600" />
                        Salary History
                      </h4>
                      <button
                        onClick={() => {
                          setSalaryFormData({ ...salaryFormData, employeeId: selectedEmployee.id });
                          setIsSalaryModalOpen(true);
                        }}
                        className="text-sm font-bold text-emerald-600 hover:underline"
                      >
                        Record Payment
                      </button>
                    </div>
                    <div className="space-y-3">
                      {salaryPayments.filter(p => p.employeeId === selectedEmployee.id).map(payment => (
                        <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{format(parseISO(payment.month + '-01'), 'MMMM yyyy')}</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">Paid on {payment.paymentDate} via {payment.method}</p>
                          </div>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">₹{payment.amount.toLocaleString()}</p>
                        </div>
                      ))}
                      {salaryPayments.filter(p => p.employeeId === selectedEmployee.id).length === 0 && (
                        <p className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm italic">No payment history found.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* KYC Section */}
                <div className="space-y-4 pt-8 border-t border-gray-100 dark:border-white/5">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-amber-600" />
                    KYC Verification
                  </h4>
                  {kycs.find(k => k.employeeId === selectedEmployee.id) ? (
                    <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/5">
                      {(() => {
                        const kyc = kycs.find(k => k.employeeId === selectedEmployee.id)!;
                        return (
                          <div className="flex flex-col sm:flex-row gap-6">
                            <div className="w-full sm:w-48 h-32 bg-white dark:bg-[#111111] rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10">
                              <img src={kyc.documentUrl} alt="KYC" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                            <div className="flex-1 space-y-4">
                              <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">{kyc.documentType}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">Status: {kyc.status}</p>
                              </div>
                              {kyc.status === 'pending' && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleKYCAction(kyc.id, 'verify')}
                                    className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all"
                                  >
                                    Verify Document
                                  </button>
                                  <button
                                    onClick={() => {
                                      setKycToReject(kyc.id);
                                      setRejectionReason('');
                                    }}
                                    className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 transition-all"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="p-12 text-center bg-gray-50 dark:bg-white/5 rounded-3xl border border-dashed border-gray-200 dark:border-white/10">
                      <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No KYC documents uploaded yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Salary Delete Confirmation Modal */}
      <AnimatePresence>
        {salaryToDelete && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSalaryToDelete(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white dark:bg-[#111111] rounded-3xl shadow-2xl w-full max-w-sm p-8 border border-gray-100 dark:border-white/10"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Delete Salary Record?</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Are you sure you want to delete this salary record for <span className="font-bold text-gray-900 dark:text-white">{employees.find(e => e.id === salaryToDelete.employeeId)?.name}</span>?
                  </p>
                </div>
                <div className="flex gap-3 w-full mt-2">
                  <button
                    onClick={() => setSalaryToDelete(null)}
                    className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { deleteSalaryPayment(salaryToDelete.id); setSalaryToDelete(null); }}
                    className="flex-1 py-3 rounded-2xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                  >
                    Yes, Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {employeeToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setEmployeeToDelete(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white dark:bg-[#111111] rounded-3xl shadow-2xl w-full max-w-md p-8 border border-gray-100 dark:border-white/10"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Delete Employee?</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Are you sure you want to delete <span className="font-bold text-gray-900 dark:text-white">{employeeToDelete.name}</span>?<br />
                    This will permanently remove their tasks, salary records, and KYC documents.
                  </p>
                </div>
                <div className="flex gap-3 w-full mt-2">
                  <button
                    onClick={() => setEmployeeToDelete(null)}
                    className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { deleteEmployee(employeeToDelete.id); setEmployeeToDelete(null); }}
                    className="flex-1 py-3 rounded-2xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                  >
                    Yes, Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Task Assignment Modal */}
      <AnimatePresence>
        {isTaskModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTaskModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden border border-white/5"
            >
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Assign New Task</h3>
                <button onClick={() => setIsTaskModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                  <Plus className="w-6 h-6 rotate-45 text-gray-400" />
                </button>
              </div>
              <form onSubmit={handleAddTask} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Assign To</label>
                  <select
                    required
                    value={taskFormData.employeeId}
                    onChange={(e) => setTaskFormData({ ...taskFormData, employeeId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                  >
                    <option value="">Select Employee</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Task Title</label>
                  <input
                    required
                    type="text"
                    value={taskFormData.title}
                    onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                    placeholder="e.g., Clean Floor 2"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Description</label>
                  <textarea
                    required
                    value={taskFormData.description}
                    onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white min-h-[100px]"
                    placeholder="Describe the task details..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Priority</label>
                    <select
                      value={taskFormData.priority}
                      onChange={(e) => setTaskFormData({ ...taskFormData, priority: e.target.value as any })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Due Date</label>
                    <input
                      required
                      type="date"
                      value={taskFormData.dueDate}
                      onChange={(e) => setTaskFormData({ ...taskFormData, dueDate: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all mt-4">
                  Assign Task
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Salary Payment Modal */}
      <AnimatePresence>
        {isSalaryModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSalaryModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden border border-white/5"
            >
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Record Salary Payment</h3>
                <button onClick={() => setIsSalaryModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                  <Plus className="w-6 h-6 rotate-45 text-gray-400" />
                </button>
              </div>
              <form onSubmit={handleAddSalary} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Amount (₹)</label>
                    <input
                      required
                      type="number"
                      value={salaryFormData.amount}
                      onChange={(e) => setSalaryFormData({ ...salaryFormData, amount: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Month</label>
                    <input
                      required
                      type="month"
                      value={salaryFormData.month}
                      onChange={(e) => setSalaryFormData({ ...salaryFormData, month: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Payment Date</label>
                    <input
                      required
                      type="date"
                      value={salaryFormData.paymentDate}
                      onChange={(e) => setSalaryFormData({ ...salaryFormData, paymentDate: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Method</label>
                    <select
                      value={salaryFormData.method}
                      onChange={(e) => setSalaryFormData({ ...salaryFormData, method: e.target.value as any })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all mt-4">
                  {salaryFormData.method === 'Cash' ? 'Record Cash Payment' : 'Pay via UPI →'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {kycToReject && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setKycToReject(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden border border-white/5 p-6 sm:p-8"
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Reject KYC Document</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Reason for Rejection</label>
                  <textarea
                    required
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="E.g. Document is blurry, incorrect document type, etc."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border-none rounded-2xl focus:ring-2 focus:ring-rose-500/20 text-gray-900 dark:text-white resize-none"
                    rows={4}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setKycToReject(null)}
                    className="flex-1 px-4 py-3 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 font-bold rounded-2xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!rejectionReason.trim()}
                    onClick={() => {
                      handleKYCAction(kycToReject, 'reject', rejectionReason);
                      setKycToReject(null);
                    }}
                    className="flex-1 px-4 py-3 bg-rose-600 text-white font-bold rounded-2xl shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition-all disabled:opacity-50"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Manage Roles Modal */}
      <AnimatePresence>
        {isRolesModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRolesModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#111111] shadow-2xl overflow-hidden border border-white/5 flex flex-col max-h-[85vh] mt-auto md:mt-0 rounded-t-3xl md:rounded-3xl"
            >
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white dark:bg-[#111111] z-10 shrink-0">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Manage Custom Roles</h3>
                <button onClick={() => setIsRolesModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              <div className="p-6 space-y-6 overflow-y-auto">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="New role name..."
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    className="flex-1 px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={() => {
                      const trimmed = newRoleName.trim().toLowerCase();
                      if (!trimmed) return;
                      if (['admin', 'manager', 'caretaker', 'security', 'cleaner'].includes(trimmed) || pgConfig?.customRoles?.includes(trimmed)) {
                        toast.error('Role already exists or is reserved');
                        return;
                      }
                      updatePGConfig({ customRoles: [...(pgConfig?.customRoles || []), trimmed] });
                      setNewRoleName('');
                      toast.success('Role added');
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all"
                    style={{ backgroundColor: pgConfig?.primaryColor }}
                  >
                    Add
                  </button>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {(pgConfig?.customRoles || []).map(role => (
                    <div key={role} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 group">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{role}</span>
                      <button
                        onClick={() => {
                          updatePGConfig({ customRoles: pgConfig?.customRoles?.filter(r => r !== role) });
                          toast.success('Role removed');
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {(pgConfig?.customRoles || []).length === 0 && (
                    <p className="text-center py-8 text-gray-500 text-sm italic">No custom roles created yet.</p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Role Visibility Modal */}
      <AnimatePresence>
        {isVisibilityModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsVisibilityModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white dark:bg-[#111111] shadow-2xl overflow-hidden border border-white/5 flex flex-col max-h-[85vh] mt-auto md:mt-0 rounded-t-3xl md:rounded-3xl"
            >
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white dark:bg-[#111111] z-10 shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Role Visibility Settings</h3>
                  <p className="text-sm text-gray-500">Control which tabs are visible for each employee role.</p>
                </div>
                <button onClick={() => setIsVisibilityModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              <div className="p-6 overflow-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-white/5">Tab Name</th>
                      {[
                        'manager',
                        'caretaker',
                        'cleaner',
                        'security',
                        ...(pgConfig?.customRoles || [])
                      ].map(role => (
                        <th key={role} className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-white/5 text-center truncate max-w-[120px]">
                          {role}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                    {[
                      { name: 'Dashboard', href: '/' },
                      { name: 'Tenants', href: '/tenants' },
                      { name: 'Rooms', href: '/rooms' },
                      { name: 'Payments', href: '/payments' },
                      { name: 'Complaints', href: '/complaints' },
                      { name: 'KYC Verification', href: '/kyc' },
                      { name: 'Employees', href: '/employees' },
                      { name: 'Reports', href: '/reports' },
                      { name: 'Broadcast', href: '/broadcast' },
                      { name: 'Tasks', href: '/tasks' },
                      { name: 'Help & Support', href: '/help' }
                    ].map(tab => (
                      <tr key={tab.href} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="p-4">
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{tab.name}</span>
                        </td>
                        {[
                          'manager',
                          'caretaker',
                          'cleaner',
                          'security',
                          ...(pgConfig?.customRoles || [])
                        ].map(role => {
                          const rolePerm = pgConfig?.rolePermissions?.find(p => p.role === role);
                          const isVisible = tab.href === '/' || (rolePerm ? rolePerm.visibleTabs.includes(tab.href) : true);
                          const isDashboard = tab.href === '/';

                          return (
                            <td key={role} className="p-4 text-center">
                              <button
                                disabled={isDashboard}
                                onClick={() => {
                                  const permissions = [...(pgConfig?.rolePermissions || [])];
                                  const index = permissions.findIndex(p => p.role === role);
                                  
                                  if (index >= 0) {
                                    const hasTab = permissions[index].visibleTabs.includes(tab.href);
                                    permissions[index] = {
                                      ...permissions[index],
                                      visibleTabs: hasTab 
                                        ? permissions[index].visibleTabs.filter(t => t !== tab.href)
                                        : [...permissions[index].visibleTabs, tab.href]
                                    };
                                  } else {
                                    permissions.push({
                                      role,
                                      visibleTabs: ['/', tab.href]
                                    });
                                  }
                                  
                                  updatePGConfig({ rolePermissions: permissions });
                                }}
                                className={cn(
                                  "w-10 h-6 rounded-full relative transition-all duration-300",
                                  isVisible ? "bg-indigo-600" : "bg-gray-200 dark:bg-white/10",
                                  isDashboard && "opacity-50 cursor-not-allowed"
                                )}
                                style={isVisible && !isDashboard ? { backgroundColor: pgConfig?.primaryColor } : {}}
                              >
                                <motion.div
                                  animate={{ x: isVisible ? 18 : 4 }}
                                  className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                                />
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-6 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/5 flex justify-end">
                <button
                  onClick={() => setIsVisibilityModalOpen(false)}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                  style={{ backgroundColor: pgConfig?.primaryColor }}
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* FAB for Mobile */}
      {user?.role === 'admin' && (
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-2xl flex items-center justify-center z-40 hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      {/* Mobile Actions Bottom Sheet */}
      <AnimatePresence>
        {isMobileActionsOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex items-end justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileActionsOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden border border-white/5"
            >
              <div className="p-4 border-b border-gray-100 dark:border-white/5 flex flex-col gap-2">
                <div className="w-12 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full mx-auto mb-2" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white px-2">Quick Actions</h3>
              </div>
              <div className="p-4 space-y-2">
                <button
                  onClick={() => { setIsMobileActionsOpen(false); setActiveTab(activeTab === 'list' ? 'salaries' : 'list'); }}
                  className="w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-2xl text-left border border-gray-100 dark:border-white/5 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    {activeTab === 'list' ? <History className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                  </div>
                  <div>
                    <span className="font-bold text-gray-900 dark:text-white block">{activeTab === 'list' ? 'Salary History' : 'Staff List'}</span>
                    <span className="text-xs text-gray-500 truncate">Toggle between staff and salaries</span>
                  </div>
                </button>
                <button
                  onClick={() => { setIsMobileActionsOpen(false); setIsRolesModalOpen(true); }}
                  className="w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-2xl text-left border border-gray-100 dark:border-white/5 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-gray-900 dark:text-white block">Manage Roles</span>
                    <span className="text-xs text-gray-500 truncate">Create or delete custom roles</span>
                  </div>
                </button>
                <button
                  onClick={() => { setIsMobileActionsOpen(false); setIsVisibilityModalOpen(true); }}
                  className="w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-2xl text-left border border-gray-100 dark:border-white/5 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <UserCog className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-gray-900 dark:text-white block">Role Visibility</span>
                    <span className="text-xs text-gray-500 truncate">Configure tab access per role</span>
                  </div>
                </button>
                <button
                  onClick={() => { setIsMobileActionsOpen(false); setIsTaskModalOpen(true); }}
                  className="w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-2xl text-left border border-gray-100 dark:border-white/5 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-gray-900 dark:text-white block">Add Task</span>
                    <span className="text-xs text-gray-500 truncate">Assign tasks to staff members</span>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
