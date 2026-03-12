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
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import toast from 'react-hot-toast';

export const EmployeesPage = () => {
  const { user, users, register, authorizeUser, updateUser } = useAuth();
  const {
    employees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    tasks,
    addTask,
    updateTask,
    deleteTask,
    salaryPayments,
    addSalaryPayment,
    updateSalaryPayment,
    kycs,
    updateKYC
  } = useApp();

  if (user?.role === 'tenant') {
    return <Navigate to="/" replace />;
  }
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'salaries'>('list');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeForLogin, setEmployeeForLogin] = useState<Employee | null>(null);
  const [createUsername, setCreateUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [kycToReject, setKycToReject] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

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

  const [kycFile, setKycFile] = useState<{ type: string, url: string, fileName: string }>({
    type: 'Aadhar Card',
    url: '',
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
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: No duplicate role assignment (except for 'none')
    if (formData.role !== 'none') {
      const duplicateRole = employees.find(emp =>
        emp.role === formData.role &&
        emp.id !== editingEmployee?.id &&
        emp.branchId === (editingEmployee?.branchId || user?.branchId)
      );

      if (duplicateRole) {
        toast.error(`An employee with the role "${formData.role}" already exists in this branch. Each specialized role can only be assigned once.`);
        return;
      }
    }

    const kycData = kycFile.url ? { type: kycFile.type, url: kycFile.url } : undefined;
    if (editingEmployee) {
      updateEmployee(editingEmployee.id, formData, kycData);
      if (editingEmployee.userId) {
        updateUser(editingEmployee.userId, { name: formData.name, email: formData.email, phone: formData.phone });
      }
    } else {
      addEmployee(formData, kycData);
    }
    handleCloseModal();
  };

  const handleCreateLogin = async () => {
    if (!employeeForLogin) return;
    const finalUsername = createUsername || employeeForLogin.email;

    const existingUser = users.find(u => u.username === finalUsername || u.email === employeeForLogin.email);
    if (existingUser) {
      toast.error('User login already exists for this email or username.');
      setEmployeeForLogin(null);
      setCreateUsername('');
      return;
    }

    const result = await register({
      username: finalUsername,
      name: employeeForLogin.name,
      email: employeeForLogin.email,
      role: employeeForLogin.role,
      phone: employeeForLogin.phone,
      branchId: employeeForLogin.branchId
    }, loginPassword);

    if (result.success && result.user) {
      updateEmployee(employeeForLogin.id, { userId: result.user.id });
      toast.success('Login created successfully. The employee must be authorized by an admin before logging in.');
      setEmployeeForLogin(null);
      setCreateUsername('');
      setLoginPassword('');
    }
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Employees</h2>
          <p className="text-gray-500 dark:text-gray-400">Manage your staff and payroll.</p>
        </div>
        {user?.role === 'admin' && (
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab(activeTab === 'list' ? 'salaries' : 'list')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-white/10 transition-all"
            >
              {activeTab === 'list' ? <History className="w-5 h-5" /> : <Users className="w-5 h-5" />}
              {activeTab === 'list' ? 'Salary History' : 'Staff List'}
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
            >
              <Plus className="w-5 h-5" />
              Add Employee
            </button>
          </div>
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmployees.map((employee) => (
              <motion.div
                key={employee.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden group hover:shadow-md transition-all"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-6">
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
                    <div className="flex gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setSelectedEmployee(employee)}
                        className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400 transition-colors"
                        title="View Details"
                      >
                        <UserCog className="w-4 h-4" />
                      </button>
                      {!employee.userId && (
                        <button
                          onClick={() => setEmployeeForLogin(employee)}
                          className="p-2 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400 transition-colors"
                          title="Create Login"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEditClick(employee)}
                        className="p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEmployeeToDelete(employee)}
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
        </>
      ) : (
        <div className="bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Salary Payment History</h3>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Payroll</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">₹{salaryPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Month</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Method</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {salaryPayments.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)).map((payment) => {
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
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setKycFile({ ...kycFile, url: reader.result as string, fileName: file.name });
                              };
                              reader.readAsDataURL(file);
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

      {/* Delete Confirmation Modal */}
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

      {/* Create Login Modal */}
      <AnimatePresence>
        {employeeForLogin && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEmployeeForLogin(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden border border-white/5"
            >
              <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-white dark:bg-[#111111]">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create Employee Login</h3>
                <button onClick={() => setEmployeeForLogin(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                  <Plus className="w-6 h-6 rotate-45 text-gray-400" />
                </button>
              </div>
              <div className="p-6 sm:p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Username / Email</label>
                  <input
                    type="text"
                    readOnly
                    value={employeeForLogin.email}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-gray-500 dark:text-gray-400"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Set Password</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                    placeholder="Enter password"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setEmployeeForLogin(null)}
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
    </div>
  );
};
