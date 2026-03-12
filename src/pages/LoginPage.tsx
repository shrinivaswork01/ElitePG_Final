import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  Quote,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Google SVG Icon for premium Look
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [regData, setRegData] = useState({
    username: '',
    name: '',
    email: '',
    role: 'tenant' as any,
    password: ''
  });
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [setupInstructions, setSetupInstructions] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const { login, register, loginWithGoogle, setGoogleUserPassword, user, isAuthenticated, googleAuthStatus, clearGoogleAuthStatus } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    try {
      const { supabase } = await import('../lib/supabase');
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Password reset email sent! Check your inbox.', { duration: 6000 });
        setShowForgotPassword(false);
        setForgotEmail('');
      }
    } catch {
      toast.error('Failed to send reset email. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Watch for Google auth result after OAuth redirect
  React.useEffect(() => {
    if (googleAuthStatus === 'user_not_found') {
      // On sign-in mode: user doesn't have an account → switch to sign-up
      setIsRegistering(true);
      setError('No account found. Please create an account first.');
      clearGoogleAuthStatus();
    } else if (googleAuthStatus === 'user_already_exists') {
      // On sign-up mode: user already has an account → switch to sign-in
      setIsRegistering(false);
      setError('An account with this Google email already exists. Please sign in.');
      clearGoogleAuthStatus();
    }
  }, [googleAuthStatus]);

  React.useEffect(() => {
    if (isAuthenticated && user) {
      const fromPath = (location.state as any)?.from?.pathname;
      const from = fromPath && fromPath !== '/login' ? fromPath : '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, user, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isRegistering) {
        const result = await register({
          username: regData.username,
          name: regData.name,
          email: regData.email,
          role: regData.role
        }, regData.password);

        if (result?.success) {
          toast.success('Registration successful! Please wait for an admin to authorize your account.', {
            duration: 6000,
          });
          setIsRegistering(false);
          setUsername(regData.username); // Pre-fill for login
        } else if (result?.existingUser) {
          const msg = result.message || 'Account already exists. Please login.';
          setError(msg);
          toast.error(msg);
        } else {
          const msg = result?.message || 'Registration failed. Please try again.';
          setError(msg);
          toast.error(msg);
        }
      } else {
        const result = await login(username, password);
        if (result.success) {
          toast.success('Signed in successfully!');
          const fromPath = (location.state as any)?.from?.pathname;
          const from = fromPath && fromPath !== '/profile' ? fromPath : '/';
          navigate(from, { replace: true });
        } else if (result.needsPasswordSetup) {
          setError('');
          setSetupInstructions(result.message || '');
          setIsSettingPassword(true);
          toast.loading('Action required: Set your password.', { duration: 3000 });
        } else {
          const msg = result.message || 'Invalid username or password';
          setError(msg);
          toast.error(msg);
        }
      }
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await setGoogleUserPassword(username, newPassword);
      if (result.success) {
        toast.success('Password set successfully!');
        // Automatically log in after setting password
        const loginResult = await login(username, newPassword);
        if (loginResult.success) {
          toast.success('Logged in successfully!');
          const fromPath = (location.state as any)?.from?.pathname;
          const from = fromPath && fromPath !== '/login' ? fromPath : '/';
          navigate(from, { replace: true });
        } else {
          console.warn('Auto-login failed after password setup:', loginResult.message);
          setIsSettingPassword(false);
          setPassword(newPassword);
          toast('Please sign in with your new password.');
        }
      } else {
        const msg = result.message || 'Failed to set password.';
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      toast.error('Something went wrong.');
      setError('Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Immersive Background Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-pink-600/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-600/20 blur-[120px] rounded-full animate-pulse delay-700" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-indigo-600/10 blur-[150px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-6xl glass-card rounded-[40px] shadow-2xl overflow-hidden flex flex-col lg:flex-row relative z-10"
      >
        {/* Left Side: Login Form */}
        <div className="w-full lg:w-[45%] p-6 sm:p-12 lg:p-16 flex flex-col">
          <div className="mb-10 sm:mb-12">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight font-display">
                Elite<span className="text-indigo-500">PG</span>
              </h1>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight">
              {isRegistering ? 'Create Account' : (isSettingPassword ? 'Set Password' : 'Welcome back')}
            </h2>
            <p className="text-gray-400 font-medium text-sm sm:text-base">
              {isSettingPassword ? (setupInstructions || 'Create a password for your account') : (isRegistering ? 'Join the ElitePG community' : 'Please Enter your Account details')}
            </p>
          </div>

          <form onSubmit={isSettingPassword ? handleSetPassword : handleSubmit} className="space-y-6 sm:space-y-8 flex-1">
            {isSettingPassword ? (
              <div className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Account Email</label>
                  <input
                    type="text"
                    disabled
                    value={username}
                    className="w-full bg-black/20 border border-white/5 rounded-2xl py-3.5 sm:py-4 px-6 text-gray-500 cursor-not-allowed transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 sm:py-4 px-6 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 inner-shadow-dark transition-all"
                    minLength={6}
                  />
                  <p className="text-[10px] text-gray-500 ml-1">This will enable email/password login for your account in the future.</p>
                </div>
              </div>
            ) : isRegistering ? (
              <div className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={regData.name}
                    onChange={(e) => setRegData({ ...regData, name: e.target.value })}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 sm:py-4 px-6 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 inner-shadow-dark transition-all"
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Username / Email</label>
                  <input
                    type="text"
                    required
                    value={regData.username}
                    onChange={(e) => setRegData({ ...regData, username: e.target.value, email: e.target.value })}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 sm:py-4 px-6 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 inner-shadow-dark transition-all"
                    placeholder="johndoe@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Password</label>
                  <input
                    type="password"
                    required
                    value={regData.password}
                    onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 sm:py-4 px-6 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 inner-shadow-dark transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Email / Username</label>
                  <div className="relative group">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Johndoe@gmail.com"
                      className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 sm:py-4 px-6 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 inner-shadow-dark transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Password</label>
                  <div className="relative group">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 sm:py-4 px-6 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 inner-shadow-dark transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end text-sm">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-indigo-400 hover:text-white underline underline-offset-4 transition-colors"
              >
                Forgot Password?
              </button>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4"
              >
                <p className="text-rose-400 text-sm font-bold text-center">{error}</p>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90 text-white font-bold py-4 sm:py-5 rounded-3xl transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50 text-lg"
            >
              {isLoading ? 'Processing...' : (isSettingPassword ? 'Save Password' : (isRegistering ? 'Create Account' : 'Sign in'))}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  if (isSettingPassword) {
                    setIsSettingPassword(false);
                  } else {
                    setIsRegistering(!isRegistering);
                  }
                  setError('');
                }}
                className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
              >
                {isSettingPassword ? 'Back to Sign in' : (isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Sign up")}
              </button>
            </div>
          </form>

          <div className="mt-10 sm:mt-12 flex flex-col items-center gap-6">
            <div className="flex items-center gap-4 w-full">
              <div className="h-px flex-1 bg-white/5" />
              <span className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.3em] whitespace-nowrap">Or continue with</span>
              <div className="h-px flex-1 bg-white/5" />
            </div>

            <button
              type="button"
              onClick={() => loginWithGoogle(isRegistering ? 'signup' : 'login')}
              className="w-full h-12 sm:h-14 rounded-3xl bg-white flex items-center justify-center gap-3 hover:bg-gray-50 transition-all shadow-lg active:scale-[0.98] font-semibold text-gray-900"
            >
              <GoogleIcon />
              {isRegistering ? 'Sign up with Google' : 'Continue with Google'}
            </button>
          </div>
        </div>

        {/* Right Side: Marketing/Testimonial */}
        <div className="hidden lg:flex w-[55%] bg-black/40 relative p-16 flex-col justify-between border-l border-white/5 overflow-hidden">
          {/* Decorative Star/Geometric Shape */}
          <div className="absolute top-1/2 right-[-10%] -translate-y-1/2 w-[500px] h-[500px] opacity-20 pointer-events-none">
            <svg viewBox="0 0 200 200" className="w-full h-full text-indigo-500 animate-[spin_60s_linear_infinite]">
              <path fill="currentColor" d="M100 0 L110 90 L200 100 L110 110 L100 200 L90 110 L0 100 L90 90 Z" />
            </svg>
          </div>

          <div className="relative z-10">
            <h2 className="text-6xl font-bold text-white mb-12 leading-[1.1] tracking-tight">
              What's our <br /> Residents Said.
            </h2>
            <Quote className="w-12 h-12 text-white/20 mb-8" />
            <p className="text-2xl text-gray-300 font-medium leading-relaxed mb-12 max-w-lg">
              "Finding a safe and premium PG was never this easy. The ElitePG portal makes everything seamless from KYC to payments."
            </p>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xl font-bold text-white">Anil Kumar</h4>
                <p className="text-gray-500 font-medium">Resident at BKC Mumbai</p>
              </div>
              <div className="flex gap-3">
                <button className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center hover:bg-indigo-500/20 transition-all">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center hover:bg-emerald-500/20 transition-all">
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Floating Feature Card */}
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="self-end bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl relative z-10"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4 leading-tight">
              Get your right room and right place stay now
            </h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Be among the first residents to experience the easiest way to manage your stay.
            </p>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-3">
                {[1, 2, 3].map((i) => (
                  <img
                    key={i}
                    src={`https://picsum.photos/seed/${i + 10}/100/100`}
                    className="w-10 h-10 rounded-full border-2 border-white object-cover"
                    alt="User"
                  />
                ))}
                <div className="w-10 h-10 rounded-full bg-black text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                  +12
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotPassword && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
              onClick={() => setShowForgotPassword(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[#111111] rounded-3xl p-8 border border-white/10 shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center">
                  <Lock className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Forgot Password?</h3>
                  <p className="text-sm text-gray-400">We'll send a reset link to your email</p>
                </div>
              </div>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-3.5 px-5 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="flex-1 py-3 rounded-2xl bg-white/5 text-gray-300 font-semibold hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
