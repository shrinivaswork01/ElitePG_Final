import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { Shield, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export const UpdatePasswordPage = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we actually have a session from the recovery link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Invalid or expired recovery link. Please try resetting your password again.');
        navigate('/login', { replace: true });
      }
    };
    checkSession();
  }, [navigate]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      toast.error('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      
      if (updateError) {
        throw updateError;
      }
      
      // Also update the custom users table if needed to sync password status
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('users').update({ 
          password: newPassword,
          requires_password_change: false 
        }).eq('id', user.id);
      }

      toast.success('Password updated successfully! You can now use your new password.');
      navigate('/login', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please try again.');
      toast.error('Failed to update password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-pink-600/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-indigo-600/10 blur-[150px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-md bg-[#111111] rounded-[32px] p-8 lg:p-10 border border-white/10 shadow-2xl z-10"
      >
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 mb-4">
            <Lock className="w-7 h-7 text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Set New Password</h2>
          <p className="text-sm text-gray-400 font-medium">Please enter your new strong password</p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">New Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 px-5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
              minLength={6}
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Confirm Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className={`w-full bg-black/40 border rounded-2xl py-3.5 px-5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${
                confirmPassword && confirmPassword !== newPassword ? 'border-rose-500/50' : 'border-white/5'
              }`}
              minLength={6}
            />
            {confirmPassword && confirmPassword !== newPassword && (
              <p className="text-[10px] text-rose-400 ml-1 font-semibold mt-1">Passwords do not match</p>
            )}
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
              <p className="text-rose-400 text-xs font-bold text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90 text-white font-bold py-3.5 mt-4 rounded-2xl transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50 text-sm"
          >
            {isLoading ? 'Updating Password...' : 'Reset Password'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
