import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { KYCData, KYCStatus } from '../types';
import toast from 'react-hot-toast';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  ExternalLink,
  Search,
  Filter,
  FileText,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { Navigate } from 'react-router-dom';

export const KYCPage = () => {
  const { kycs, tenants, employees, updateKYC, deleteKYC, updateTenant, updateEmployee } = useApp();
  const { user, authorizeUser } = useAuth();

  if (user?.role === 'tenant') {
    return <Navigate to="/" replace />;
  }
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<KYCStatus | 'all'>('all');
  const [personFilter, setPersonFilter] = useState<'all' | 'tenant' | 'employee'>('all');
  const [selectedKYC, setSelectedKYC] = useState<KYCData | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const filteredKYCs = kycs.filter(k => {
    const tenant = tenants.find(t => t.id === k.tenantId);
    const employee = employees.find(e => e.id === k.employeeId);
    const person = tenant || employee;

    const matchesSearch = searchTerm === '' || (
      person?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesStatus = filterStatus === 'all' || k.status === filterStatus;
    const matchesPersonType = personFilter === 'all' || 
      (personFilter === 'tenant' && !!k.tenantId) || 
      (personFilter === 'employee' && !!k.employeeId);
    return matchesSearch && matchesStatus && matchesPersonType;
  });

  // Add "virtual" KYC records for tenants/employees who are pending but have no record in kycs
  const pendingTenantsWithoutKYC = tenants.filter(t =>
    t.kycStatus === 'pending' && !kycs.some(k => k.tenantId === t.id)
  );
  const pendingEmployeesWithoutKYC = employees.filter(e =>
    e.kycStatus === 'pending' && !kycs.some(k => k.employeeId === e.id)
  );

  const allDisplayKYCs = ([
    ...filteredKYCs,
    ...pendingTenantsWithoutKYC.map(t => ({
      id: `virtual-t-${t.id}`,
      tenantId: t.id,
      employeeId: undefined,
      documentType: 'Unknown (Missing Record)',
      documentUrl: '',
      status: 'pending' as KYCStatus,
      submittedAt: 'Unknown',
      isVirtual: true
    })),
    ...pendingEmployeesWithoutKYC.map(e => ({
      id: `virtual-e-${e.id}`,
      tenantId: undefined,
      employeeId: e.id,
      documentType: 'Unknown (Missing Record)',
      documentUrl: '',
      status: 'pending' as KYCStatus,
      submittedAt: 'Unknown',
      isVirtual: true
    }))
  ] as (KYCData & { isVirtual?: boolean })[]).filter(k => {
    // Re-apply filters to virtual records
    if (k.id.startsWith('virtual-')) {
      const tenant = tenants.find(t => t.id === k.tenantId);
      const employee = employees.find(e => e.id === k.employeeId);
      const person = tenant || employee;

      const matchesSearch = searchTerm === '' || (
        person?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesStatus = filterStatus === 'all' || filterStatus === 'pending';
      const matchesPersonType = personFilter === 'all' || 
        (personFilter === 'tenant' && !!k.tenantId) || 
        (personFilter === 'employee' && !!k.employeeId);
      return matchesSearch && matchesStatus && matchesPersonType;
    }
    return true;
  });

  const handleApprove = (id: string) => {
    let personId = '';
    let isTenant = false;

    if (id.startsWith('virtual-')) {
      isTenant = id.startsWith('virtual-t-');
      personId = id.replace(isTenant ? 'virtual-t-' : 'virtual-e-', '');
    } else {
      const kyc = kycs.find(k => k.id === id);
      if (kyc) {
        personId = kyc.tenantId || kyc.employeeId || '';
        isTenant = !!kyc.tenantId;
      }
    }

    const isTenantKYC = !!kycs.find(k => k.id === id)?.tenantId || id.startsWith('virtual-t-');

    if (isTenantKYC) {
      if (!['super', 'admin', 'manager'].includes(user?.role || '')) {
        toast.error('You do not have permission to verify tenant KYC');
        return;
      }
    } else {
      if (!['super', 'admin'].includes(user?.role || '')) {
        toast.error('Only admins can verify staff KYC');
        return;
      }
    }

    if (personId) {
      const person = isTenant
        ? tenants.find(t => t.id === personId)
        : employees.find(e => e.id === personId);
      if (person?.userId) {
        authorizeUser(person.userId);
      }
    }

    updateKYC(id, {
      status: 'verified',
      verifiedBy: user?.id,
      verifiedAt: new Date().toISOString().split('T')[0]
    });
    setSelectedKYC(null);
  };

  const handleReject = (id: string) => {
    const isTenantKYC = !!kycs.find(k => k.id === id)?.tenantId;
    if (isTenantKYC) {
      if (!['super', 'admin', 'manager'].includes(user?.role || '')) {
        toast.error('You do not have permission to reject tenant KYC');
        return;
      }
    } else {
      if (!['super', 'admin'].includes(user?.role || '')) {
        toast.error('Only admins can reject staff KYC');
        return;
      }
    }

    if (!rejectionReason) return;
    updateKYC(id, {
      status: 'rejected',
      rejectionReason,
      verifiedBy: user?.id,
      verifiedAt: new Date().toISOString().split('T')[0]
    });
    setSelectedKYC(null);
    setRejectionReason('');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this KYC record?')) {
      await deleteKYC(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">KYC Verification</h2>
          <p className="text-gray-500 dark:text-gray-400">Review and verify resident identity documents.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111111] p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by tenant name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 border-r border-gray-100 dark:border-white/5 pr-4 mr-4">
          {(['all', 'tenant', 'employee'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setPersonFilter(type)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all",
                personFilter === type
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
              )}
            >
              {type === 'all' ? 'All Roles' : type.charAt(0).toUpperCase() + type.slice(1) + 's'}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          {['all', 'pending', 'verified', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status as any)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all",
                filterStatus === status
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
              )}
            >
              {status?.charAt(0).toUpperCase() + status?.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allDisplayKYCs.map((kyc) => {
          const tenant = tenants.find(t => t.id === kyc.tenantId);
          const employee = employees.find(e => e.id === kyc.employeeId);
          const person = tenant || employee;
          const role = tenant ? 'Tenant' : 'Employee';

          return (
            <motion.div
              key={kyc.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden group hover:shadow-md transition-all"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center font-bold text-gray-600 dark:text-gray-400">
                      {person?.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">{person?.name || 'Unknown Resident'}</h3>
                      <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">{role}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                    kyc.status === 'verified' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                      kyc.status === 'pending' ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  )}>
                    {kyc.status}
                  </span>
                </div>

                <div className="relative aspect-video bg-gray-100 dark:bg-white/5 rounded-2xl overflow-hidden mb-4 group-hover:ring-2 ring-indigo-500/20 transition-all">
                  {kyc.documentUrl ? (
                    kyc.documentUrl.startsWith('data:application/pdf') || kyc.documentUrl.toLowerCase().endsWith('.pdf') ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-500">
                        <FileText className="w-12 h-12 mb-2" />
                        <span className="text-xs font-bold uppercase tracking-widest">PDF Document</span>
                      </div>
                    ) : (
                      <img
                        src={kyc.documentUrl}
                        alt="KYC Document"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-500">
                      <ShieldAlert className="w-12 h-12 mb-2" />
                      <span className="text-xs font-bold uppercase tracking-widest">No Document Found</span>
                    </div>
                  )}
                  {kyc.documentUrl && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => setSelectedKYC(kyc as any)}
                        className="p-3 bg-white dark:bg-[#111111] rounded-full text-gray-900 dark:text-white shadow-xl hover:scale-110 transition-transform"
                      >
                        <Eye className="w-6 h-6" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{kyc.documentType}</span>
                  {kyc.status === 'pending' && !kyc.documentUrl && (
                    <button
                      onClick={() => {
                        if (kyc.tenantId) updateTenant(kyc.tenantId, { kycStatus: 'unsubmitted' });
                        else if (kyc.employeeId) updateEmployee(kyc.employeeId, { kycStatus: 'unsubmitted' });
                      }}
                      className="text-[10px] font-bold text-rose-500 hover:underline"
                    >
                      Reset Status
                    </button>
                  )}
                  {kyc.status === 'rejected' && (
                    <button
                      onClick={() => handleDelete(kyc.id)}
                      className="p-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
                      title="Delete Rejected KYC"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {kyc.status === 'pending' && kyc.documentUrl && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(kyc.id)}
                        className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSelectedKYC(kyc as any)}
                        className="p-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
        {allDisplayKYCs.length === 0 && (
          <div className="col-span-full p-12 text-center text-gray-500 dark:text-gray-400">No KYC requests found</div>
        )}
      </div>

      <AnimatePresence>
        {selectedKYC && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedKYC(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto border border-white/5"
            >
              <div className="flex flex-col lg:flex-row min-h-[50vh] lg:h-[80vh]">
                <div className="flex-1 bg-gray-100 dark:bg-white/5 p-4 flex flex-col items-center justify-center overflow-hidden min-h-[400px] lg:min-h-0">
                  <div className="w-full h-full flex items-center justify-center relative group/doc">
                    {selectedKYC.documentUrl.startsWith('data:application/pdf') || selectedKYC.documentUrl.toLowerCase().endsWith('.pdf') ? (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <object
                          data={selectedKYC.documentUrl}
                          type="application/pdf"
                          className="w-full h-full rounded-xl shadow-lg bg-white dark:bg-[#111111]"
                        >
                          <div className="flex flex-col items-center justify-center p-8 text-center">
                            <FileText className="w-16 h-16 text-gray-400 mb-4" />
                            <p className="text-gray-600 dark:text-gray-400 mb-4">PDF preview not available in this browser.</p>
                            <a
                              href={selectedKYC.documentUrl}
                              download="kyc_document.pdf"
                              className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold"
                            >
                              Download PDF to View
                            </a>
                          </div>
                        </object>
                      </div>
                    ) : (
                      <img
                        src={selectedKYC.documentUrl}
                        alt="Document Full View"
                        className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <a
                      href={selectedKYC.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-4 right-4 p-3 bg-white/90 dark:bg-[#111111]/90 backdrop-blur-md rounded-xl text-gray-900 dark:text-white shadow-xl opacity-0 group-hover/doc:opacity-100 transition-opacity flex items-center gap-2 text-xs font-bold"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Original
                    </a>
                  </div>
                </div>
                <div className="w-full lg:w-80 p-6 sm:p-8 flex flex-col bg-white dark:bg-[#111111]">
                  <div className="flex items-center justify-between mb-6 sm:mb-8">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Review KYC</h3>
                    <button onClick={() => setSelectedKYC(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                      <XCircle className="w-6 h-6 text-gray-400" />
                    </button>
                  </div>

                  <div className="space-y-6 flex-1">
                    <div>
                      <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Person</p>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {selectedKYC.tenantId ? tenants.find(t => t.id === selectedKYC.tenantId)?.name || 'Unknown Tenant' : employees.find(e => e.id === (selectedKYC as any).employeeId)?.name || 'Unknown Employee'}
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 capitalize">
                        {selectedKYC.tenantId ? 'Tenant Verification' : 'Employee Verification'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Document Type</p>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{selectedKYC.documentType}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Submitted On</p>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{selectedKYC.submittedAt}</p>
                    </div>

                    {selectedKYC.status === 'pending' ? (
                      <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Rejection Reason (if any)</label>
                          <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-rose-500/20 resize-none text-gray-900 dark:text-white"
                            rows={3}
                            placeholder="Why are you rejecting this?"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => handleReject(selectedKYC.id)}
                            disabled={!rejectionReason}
                            className="px-4 py-2.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-sm font-bold rounded-xl hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleApprove(selectedKYC.id)}
                            className="px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
                          >
                            Approve
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-4 border-t border-gray-100 dark:border-white/5">
                        <div className={cn(
                          "p-4 rounded-2xl flex items-center gap-3",
                          selectedKYC.status === 'verified' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400"
                        )}>
                          {selectedKYC.status === 'verified' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                          <div>
                            <p className="text-sm font-bold">Document {selectedKYC.status}</p>
                            <p className="text-xs opacity-80">By {selectedKYC.verifiedBy} on {selectedKYC.verifiedAt}</p>
                          </div>
                        </div>
                        {selectedKYC.rejectionReason && (
                          <div className="mt-4 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl">
                            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Reason</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{selectedKYC.rejectionReason}</p>
                          </div>
                        )}
                        {selectedKYC.status === 'rejected' && (
                          <button
                            onClick={() => {
                              handleDelete(selectedKYC.id);
                              setSelectedKYC(null);
                            }}
                            className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-sm font-bold rounded-xl border border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all"
                          >
                            <XCircle className="w-4 h-4" />
                            Delete Rejected Record
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

