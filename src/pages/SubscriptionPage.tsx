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
  const [activeBilling, setActiveBilling] = useState<'monthly' | 'annual'>('monthly');
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
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      toast.error('Razorpay SDK failed to load. Check your internet connection.');
      setIsProcessing(false);
      return;
    }

    const razorpayPlanId = activeBilling === 'annual' ? plan.razorpayAnnualPlanId : plan.razorpayMonthlyPlanId;
    const useSubscriptionFlow = !!razorpayPlanId && !!supabaseUrl;

    console.log('Subscription Flow Check:', { 
      activeBilling, 
      razorpayPlanId, 
      supabaseUrl: !!supabaseUrl, 
      useSubscriptionFlow 
    });

    if (useSubscriptionFlow) {
      // ── RECURRING SUBSCRIPTION FLOW ──
      console.log('Initiating Recurring Subscription flow...');
      // Call Edge Function to create a Razorpay subscription
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/create-razorpay-subscription`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            razorpayPlanId,
            customerName: user.name,
            customerEmail: user.email,
            totalCount: activeBilling === 'annual' ? 12 : 120, // 1y annual or 10y monthly
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.subscriptionId) {
          console.error('Edge Function Error:', data);
          const errorMsg = data.error || 'Failed to create subscription.';
          if (errorMsg.includes('invalid') || errorMsg.includes('found')) {
            toast.error(`Invalid Razorpay Plan ID. Please verify the IDs in Super Admin → Subscriptions for this plan.`, { duration: 6000 });
          } else {
            toast.error(errorMsg);
          }
          setIsProcessing(false);
          return;
        }

        console.log('Subscription created successfully:', data.subscriptionId);

        // Open Razorpay checkout with subscription_id (not amount)
        const options = {
          key: razorpayKey,
          subscription_id: data.subscriptionId,
          name: 'ElitePG',
          description: `${plan.name} Plan — ${activeBilling === 'annual' ? 'Annual' : 'Monthly'} Subscription`,
          image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=150&h=150',
          handler: function (response: any) {
            // Store the Razorpay subscription ID in the branch
            const months = activeBilling === 'annual' ? 12 : 1;
            const endDate = format(addMonths(new Date(), months), 'yyyy-MM-dd');
            updateBranchSubscription(currentBranch.id, plan.id, 'active', endDate, undefined, response.razorpay_subscription_id);
            setIsProcessing(false);
            toast.success(`🎉 ${plan.name} subscription activated! Auto-renews ${activeBilling}.`);
          },
          prefill: { name: user.name || 'Admin', email: user.email || '', contact: '' },
          notes: { plan_id: plan.id, branch_id: currentBranch.id },
          theme: { color: '#4F46E5' },
          modal: {
            ondismiss: () => { setIsProcessing(false); toast('Payment cancelled.', { icon: 'ℹ️' }); },
          },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', (r: any) => { setIsProcessing(false); toast.error(`Payment failed: ${r.error.description}`); });
        rzp.open();
      } catch (err: any) {
        toast.error('Failed to connect to subscription service.');
        console.error(err);
        setIsProcessing(false);
      }
    } else {
      // ── ONE-TIME PAYMENT FALLBACK ──
      // Used when no Razorpay plan ID is configured yet
      const amount = activeBilling === 'annual' ? plan.annualPrice : plan.price;
      const options = {
        key: razorpayKey,
        amount: amount * 100,
        currency: 'INR',
        name: 'ElitePG',
        description: `${plan.name} Plan (${activeBilling}) — One-time`,
        image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=150&h=150',
        handler: function (response: any) {
          const months = activeBilling === 'annual' ? 12 : 1;
          const endDate = format(addMonths(new Date(), months), 'yyyy-MM-dd');
          // Save payment ID as customer ID in fallback mode for tracking
          updateBranchSubscription(currentBranch.id, plan.id, 'active', endDate, response.razorpay_payment_id);
          setIsProcessing(false);
          toast.success(`🎉 Plan upgraded to ${plan.name}! ID: ${response.razorpay_payment_id}`);
        },
        prefill: { name: user.name || 'Admin', email: user.email || '', contact: '' },
        notes: { plan_id: plan.id, branch_id: currentBranch.id },
        theme: { color: '#4F46E5' },
        modal: {
          ondismiss: () => { setIsProcessing(false); toast('Payment cancelled.', { icon: 'ℹ️' }); },
        },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (r: any) => { setIsProcessing(false); toast.error(`Payment failed: ${r.error.description}`); });
      rzp.open();
    }
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
        <div className="pt-8 border-t border-gray-100 dark:border-white/5 mt-8">
          <div className="flex flex-col items-center justify-center mb-12">
            <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-6">Choose Your Plan</h3>
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-white/5 p-1.5 rounded-full relative">
              <button
                onClick={() => setActiveBilling('monthly')}
                className={cn(
                  "relative z-10 px-8 py-2.5 rounded-full text-sm font-bold transition-all duration-300",
                  activeBilling === 'monthly'
                    ? "text-gray-900 dark:text-gray-900"
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                Monthly
                {activeBilling === 'monthly' && (
                  <motion.div layoutId="billingToggle" className="absolute inset-0 bg-white rounded-full -z-10 shadow-sm" />
                )}
              </button>
              <button
                onClick={() => setActiveBilling('annual')}
                className={cn(
                  "relative z-10 px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2",
                  activeBilling === 'annual'
                    ? "text-gray-900 dark:text-gray-900"
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                Annual 
                <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full leading-none tracking-widest whitespace-nowrap shadow-sm shadow-rose-500/20">25% OFF</span>
                {activeBilling === 'annual' && (
                  <motion.div layoutId="billingToggle" className="absolute inset-0 bg-white rounded-full -z-10 shadow-sm" />
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[...subscriptionPlans]
              .sort((a, b) => a.price - b.price)
              .map((plan, i) => {
              const isCurrent = plan.id === currentPlan?.id;
              
              // Apply dynamic styling simulating the requested design
              const isPopular = i === 1; // 2nd plan is popular
              const isBestValue = i === 2; // 3rd plan is Elite
              
              let cardClasses = "bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20";
              let titleColor = "text-gray-900 dark:text-white";
              let priceColor = "text-gray-900 dark:text-white";
              let buttonClasses = "bg-white text-gray-900 hover:bg-gray-100 border border-gray-200";
              let badgeText = null;
              let badgeClasses = "";

              if (isPopular) {
                cardClasses = "bg-white dark:bg-[#1a2310] border-[#cdff00] ring-1 ring-[#cdff00]";
                buttonClasses = "bg-[#cdff00] text-black hover:bg-[#b5e000] border-transparent shadow-[#cdff00]/20";
                badgeText = "◆ MOST POPULAR";
                badgeClasses = "bg-[#cdff00] text-black";
              } else if (isBestValue) {
                cardClasses = "bg-white dark:bg-[#2a0e1c] border-[#ff0066] ring-1 ring-[#ff0066]";
                buttonClasses = "bg-[#ff0066] text-white hover:bg-[#e0005a] border-transparent shadow-[#ff0066]/20";
                badgeText = "✦ BEST VALUE";
                badgeClasses = "bg-[#ff0066] text-white";
              }

              if (isCurrent) {
                cardClasses += " opacity-50";
                buttonClasses = "bg-gray-100 dark:bg-white/5 text-gray-400 border-transparent cursor-not-allowed";
              }

              return (
                <div
                  key={plan.id}
                  className={cn(
                    "p-8 rounded-[32px] border-2 transition-all flex flex-col relative pt-12",
                    cardClasses
                  )}
                >
                  {badgeText && (
                    <div className={cn("absolute top-0 left-0 right-0 py-2 text-center text-[10px] font-black uppercase tracking-widest rounded-t-[30px]", badgeClasses)}>
                      {badgeText}
                    </div>
                  )}

                  <h4 className={cn("text-2xl font-black mb-2", titleColor)}>{plan.name}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 font-medium">For managing PG branches efficiently</p>
                  
                  <div className="flex items-baseline gap-1 mb-2">
                    {activeBilling === 'annual' && plan.annualPrice > 0 && (
                       <span className="text-xl font-bold text-gray-400 line-through mr-2">
                         ₹{Math.round((plan.price * 12) / 12)}
                       </span>
                    )}
                    <span className={cn("text-5xl font-black tracking-tight", priceColor)}>
                      ₹{activeBilling === 'annual' && plan.annualPrice > 0 ? Math.round(plan.annualPrice / 12) : plan.price}
                    </span>
                    <span className="text-sm font-medium text-gray-500">/month</span>
                  </div>
                  {activeBilling === 'annual' && plan.annualPrice > 0 && (
                    <p className="text-xs text-gray-500 mb-6 font-medium">Billed ₹{plan.annualPrice} for 12 months</p>
                  )}
                  {(activeBilling === 'monthly' || !plan.annualPrice) && (
                    <p className="text-xs text-gray-500 mb-6 font-medium">Billed monthly</p>
                  )}

                  <button
                    onClick={() => {
                      if (currentBranch && !isCurrent) {
                        setSelectedPlan(plan);
                        handleDirectUpgrade(plan);
                      }
                    }}
                    disabled={isProcessing || isCurrent}
                    className={cn(
                      "w-full py-4 rounded-2xl text-sm font-black transition-all shadow-sm mb-8",
                      buttonClasses
                    )}
                  >
                    {isCurrent ? 'Current Plan' : 'Select Plan'}
                  </button>

                  <div className="space-y-4 mb-4 flex-1">
                    <div className="flex items-start gap-3 text-sm font-bold text-gray-700 dark:text-gray-300">
                      <Check className="w-5 h-5 text-gray-400 shrink-0" />
                      <div>
                        {plan.maxTenants >= 9999 ? 'Unlimited' : `${plan.maxTenants}`} Tenants Limit
                      </div>
                    </div>
                    <div className="flex items-start gap-3 text-sm font-bold text-gray-700 dark:text-gray-300">
                      <Check className="w-5 h-5 text-gray-400 shrink-0" />
                      <div>
                        {plan.maxRooms >= 9999 ? 'Unlimited' : `${plan.maxRooms}`} Rooms Limit
                      </div>
                    </div>
                    <div className="pt-6 mt-6 border-t border-gray-100 dark:border-white/10">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Features Included</p>
                      <ul className="space-y-3">
                        {(expandedPlanId === plan.id ? plan.features : plan.features.slice(0, 5)).map(f => (
                          <li key={f} className="flex items-center gap-3 text-xs font-bold text-gray-600 dark:text-gray-400">
                             <Check className="w-3.5 h-3.5 text-gray-400" />
                             <span className="uppercase tracking-wider">{f}</span>
                          </li>
                        ))}
                      </ul>
                      {plan.features.length > 5 && expandedPlanId !== plan.id && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedPlanId(plan.id); }}
                          className="mt-4 text-xs font-bold text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 transition-colors"
                        >
                          + View All {plan.features.length} Features
                        </button>
                      )}
                      {expandedPlanId === plan.id && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedPlanId(null); }}
                          className="mt-4 text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        >
                          Show Less
                        </button>
                      )}
                    </div>
                  </div>
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
