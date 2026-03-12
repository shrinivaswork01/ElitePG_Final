import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Zap, Check, Star, CreditCard, ShieldCheck, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { SubscriptionPlan } from '../types';
import { format, addMonths } from 'date-fns';
import toast from 'react-hot-toast';
import { loadRazorpayScript } from '../utils/razorpay';

export const SubscriptionPage = () => {
  const { subscriptionPlans, currentBranch, currentPlan, updateBranchSubscription } = useApp();
  const { user } = useAuth();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-gray-500">You do not have permission to access this page.</p>
      </div>
    );
  }

  const handleDirectUpgrade = async (plan: SubscriptionPlan) => {
    if (!currentBranch || !user) return;

    setIsProcessing(true);

    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY || 'rzp_test_SPuhgTcTc6kl88';

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      toast.error('Razorpay SDK failed to load. Check your internet connection.');
      setIsProcessing(false);
      return;
    }

    const options = {
      key: razorpayKey,
      amount: plan.price * 100, // in paise
      currency: 'INR',
      name: 'ElitePG',
      description: `Upgrade to ${plan.name} Plan`,
      image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=150&h=150',
      handler: function (response: any) {
        const nextMonth = format(addMonths(new Date(), 1), 'yyyy-MM-dd');
        updateBranchSubscription(currentBranch.id, plan.id, 'active', nextMonth);
        setIsProcessing(false);
        toast.success(`🎉 Plan upgraded to ${plan.name}! Transaction ID: ${response.razorpay_payment_id}`);
      },
      prefill: {
        name: user.name || 'Admin',
        email: user.email || '',
        contact: '',
      },
      notes: {
        plan_id: plan.id,
        branch_id: currentBranch.id,
      },
      theme: { color: '#4F46E5' },
      modal: {
        ondismiss: () => {
          setIsProcessing(false);
          toast('Payment cancelled.', { icon: 'ℹ️' });
        },
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.on('payment.failed', (response: any) => {
      setIsProcessing(false);
      toast.error(`Payment failed: ${response.error.description}`);
    });
    rzp.open();
  };

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Subscription Plan</h2>
        <p className="text-gray-500 dark:text-gray-400">Manage your branch subscription and features.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Current Plan Card */}
        <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-10">
            <Zap className="w-48 h-48" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <Star className="w-6 h-6 fill-white" />
              </div>
              <div>
                <p className="text-indigo-100 text-sm font-bold uppercase tracking-widest">Current Plan</p>
                <h3 className="text-3xl font-black tracking-tight">{currentPlan?.name}</h3>
              </div>
              {currentBranch?.subscriptionStatus === 'trial' && (
                <span className="ml-auto px-4 py-1 bg-white/20 rounded-full text-xs font-black uppercase tracking-widest">
                  Free Trial
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mb-1">Status</p>
                <p className="text-xl font-bold capitalize">{currentBranch?.subscriptionStatus}</p>
              </div>
              <div>
                <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mb-1">Renews On</p>
                <p className="text-xl font-bold">{currentBranch?.subscriptionEndDate}</p>
              </div>
              <div>
                <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mb-1">Price</p>
                <p className="text-xl font-bold">₹{currentPlan?.price}/mo</p>
              </div>
            </div>
          </div>
        </div>

        {/* Available Plans */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Available Plans</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {subscriptionPlans.map((plan) => {
              const isCurrent = plan.id === currentPlan?.id;
              return (
                <div
                  key={plan.id}
                  className={cn(
                    "bg-white dark:bg-[#111111] p-6 rounded-3xl border transition-all flex flex-col",
                    isCurrent
                      ? "border-indigo-600 ring-2 ring-indigo-600/20"
                      : "border-gray-200 dark:border-white/5 hover:border-indigo-500/50"
                  )}
                >
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{plan.name}</h4>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-2xl font-black text-gray-900 dark:text-white">₹{plan.price}</span>
                    <span className="text-xs text-gray-500">/mo</span>
                  </div>

                  <div className="space-y-3 mb-8 flex-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400">
                      <Check className="w-3 h-3 text-green-500" />
                      {plan.maxTenants >= 9999 ? 'Unlimited' : `${plan.maxTenants}`} Tenants
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400">
                      <Check className="w-3 h-3 text-green-500" />
                      {plan.maxRooms >= 9999 ? 'Unlimited' : `${plan.maxRooms}`} Rooms
                    </div>
                    <div className="pt-2 border-t border-gray-100 dark:border-white/5">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Features</p>
                      <div className="flex flex-wrap gap-1">
                        {(expandedPlanId === plan.id ? plan.features : plan.features.slice(0, 4)).map(f => (
                          <span key={f} className="px-1.5 py-0.5 bg-gray-100 dark:bg-white/5 rounded text-[9px] font-bold text-gray-500 uppercase">
                            {f}
                          </span>
                        ))}
                        {plan.features.length > 4 && expandedPlanId !== plan.id && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setExpandedPlanId(plan.id); }}
                            className="text-[9px] font-bold text-indigo-500 hover:text-indigo-600 transition-colors"
                          >
                            +{plan.features.length - 4} more
                          </button>
                        )}
                        {expandedPlanId === plan.id && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setExpandedPlanId(null); }}
                            className="text-[9px] font-bold text-gray-400 hover:text-gray-500 transition-colors"
                          >
                            Hide
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (currentBranch) {
                        setSelectedPlan(plan);
                        if (isCurrent) {
                          setIsPaymentModalOpen(true);
                        } else {
                          handleDirectUpgrade(plan);
                        }
                      }
                    }}
                    disabled={isProcessing}
                    className={cn(
                      "w-full py-3 rounded-2xl text-sm font-black transition-all",
                      isCurrent
                        ? "bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10"
                        : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20"
                    )}
                  >
                    {isCurrent ? 'View Details' : 'Upgrade Now'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {isPaymentModalOpen && selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isProcessing && setIsPaymentModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden border border-white/5"
            >
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedPlan.id === currentPlan?.id ? 'Plan Details' : 'Secure Payment'}
                </h3>
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  disabled={isProcessing}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors disabled:opacity-50"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="p-8 space-y-8">
                <div className="bg-indigo-50 dark:bg-indigo-500/10 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-bold text-indigo-900 dark:text-indigo-100">Plan Upgrade</span>
                    <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-full">{selectedPlan.name}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-gray-500 dark:text-gray-400 text-sm">Amount to pay</span>
                    <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">₹{selectedPlan.price}</span>
                  </div>
                </div>

                {selectedPlan.id !== currentPlan?.id && (
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center gap-4">
                      <div className="w-10 h-10 bg-white dark:bg-white/10 rounded-xl flex items-center justify-center shadow-sm">
                        <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">Card Payment</p>
                        <p className="text-[10px] text-gray-500">Visa, Mastercard, Amex</p>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center gap-4 opacity-50">
                      <div className="w-10 h-10 bg-white dark:bg-white/10 rounded-xl flex items-center justify-center shadow-sm">
                        <Zap className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">UPI Payment</p>
                        <p className="text-[10px] text-gray-500">Google Pay, PhonePe, Paytm</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-gray-500 justify-center">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Subscription Verified & Active
                </div>

                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="w-full py-4 bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white rounded-2xl font-black hover:bg-gray-200 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  Close Details
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
