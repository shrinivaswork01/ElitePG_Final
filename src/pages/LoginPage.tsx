import React, { useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  Lock,
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

interface LoginPageProps {
  isSignUp?: boolean;
}

export const LoginPage = ({ isSignUp = false }: LoginPageProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(isSignUp);
  const [regData, setRegData] = useState({
    username: '',
    name: '',
    email: '',
    role: 'tenant' as any,
    password: ''
  });
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [setupUserId, setSetupUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupInstructions, setSetupInstructions] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const { login, register, loginWithGoogle, setGoogleUserPassword, user, isAuthenticated, googleAuthStatus, clearGoogleAuthStatus } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [inviteCode, setInviteCode] = useState(searchParams.get('invite') || '');

  // Pre-switch to registration mode if there's an invite link
  React.useEffect(() => {
    if (searchParams.get('invite') && !isRegistering) {
      setIsRegistering(true);
    }
  }, [searchParams]);

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
      setIsRegistering(true);
      setError('No account found. Please create an account first.');
      clearGoogleAuthStatus();
    } else if (googleAuthStatus === 'user_already_exists') {
      setIsRegistering(false);
      setError('An account with this Google email already exists. Please sign in.');
      clearGoogleAuthStatus();
    }

    // Check for error fragments from Supabase (e.g. #error=unsupported_provider)
    const hash = window.location.hash;
    if (hash && hash.includes('error=')) {
      const params = new URLSearchParams(hash.substring(1));
      const errorMsg = params.get('error_description') || params.get('error') || 'Authentication failed';
      
      if (errorMsg.includes('not enabled')) {
        toast.error('Google Sign-in is not enabled in the Supabase dashboard. Please contact admin.');
        setError('Google Sign-in is not enabled. Please use your username and password.');
      } else {
        toast.error(errorMsg.replace(/\+/g, ' '));
        setError(errorMsg.replace(/\+/g, ' '));
      }
      
      // Clear hash to prevent repeated toasts
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, [googleAuthStatus, clearGoogleAuthStatus]);

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
        if (!inviteCode) {
           setError('An invite code is required to register.');
           setIsLoading(false);
           return;
        }

        const trimmedRegData = {
          ...regData,
          username: regData.username.trim(),
          email: regData.email.trim()
        };

        const result = await register({
          username: trimmedRegData.username,
          name: trimmedRegData.name,
          email: trimmedRegData.email,
          role: trimmedRegData.role,
          inviteCode: inviteCode
        } as any, trimmedRegData.password);

        if (result?.success) {
          toast.success('Registration successful!', { duration: 6000 });
          setIsRegistering(false);
          setUsername(trimmedRegData.username);
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
        const trimmedUsername = username.trim();
        const result = await login(trimmedUsername, password);
        if (result.success) {
          toast.success('Signed in successfully!');
          const fromPath = (location.state as any)?.from?.pathname;
          const from = fromPath && fromPath !== '/profile' ? fromPath : '/';
          navigate(from, { replace: true });
        } else if (result.needsPasswordSetup) {
          setError('');
          setSetupInstructions(result.message || '');
          setSetupUserId(result.userId || null);
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
      const result = await setGoogleUserPassword(setupUserId || username, newPassword);
      if (result.success) {
        toast.success('Password set successfully!');
        const loginResult = await login(username, newPassword);
        if (loginResult.success) {
          toast.success('Logged in successfully!');
          const fromPath = (location.state as any)?.from?.pathname;
          const from = fromPath && fromPath !== '/login' ? fromPath : '/';
          navigate(from, { replace: true });
        } else {
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
    <div className="h-screen w-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-pink-600/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-600/20 blur-[120px] rounded-full animate-pulse delay-700" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-indigo-600/10 blur-[150px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-5xl h-[95vh] max-h-[850px] lg:h-[90vh] scale-90 lg:scale-[0.95] origin-center glass-card rounded-[32px] lg:rounded-[40px] shadow-2xl overflow-hidden flex flex-col lg:flex-row relative z-10"
      >
        <div className="w-full lg:w-[45%] p-6 lg:p-8 flex flex-col justify-center overflow-hidden">
          <div className="mb-4 lg:mb-6 shrink-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10 shrink-0">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight font-display">
                Elite<span className="text-indigo-500">PG</span>
              </h1>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1 tracking-tight">
              {isSettingPassword ? 'Set Password' : (isRegistering ? 'Create Account' : 'Welcome back')}
            </h2>
            <p className="text-gray-400 font-medium text-xs">
              {isSettingPassword ? (setupInstructions || 'Create a password for your account') : (isRegistering ? 'Join the ElitePG community' : 'Please Enter your Account details')}
            </p>
          </div>

          <form onSubmit={isSettingPassword ? handleSetPassword : handleSubmit} className="space-y-4 shrink-0">
            {isSettingPassword ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                  <Shield className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-indigo-300 leading-relaxed">
                    For your security, you need to set a new password before continuing. Choose a strong password with at least 6 characters.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Account Email</label>
                  <input
                    type="text"
                    disabled
                    value={username}
                    className="w-full bg-black/20 border border-white/5 rounded-2xl py-3 px-5 text-base text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-3 px-5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-sans"
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
                    className={`w-full bg-black/40 border rounded-2xl py-3 px-5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-sans ${
                      confirmPassword && confirmPassword !== newPassword ? 'border-rose-500/50' : 'border-white/5'
                    }`}
                    minLength={6}
                  />
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-[10px] text-rose-400 ml-1 font-semibold">Passwords do not match</p>
                  )}
                </div>
              </div>
            ) : isRegistering ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={regData.name}
                    onChange={(e) => setRegData({ ...regData, name: e.target.value })}
                    className="w-full bg-black/40 border border-white/5 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Invite Code <span className="text-[8px] opacity-70">(Required)</span></label>
                  <input
                    type="text"
                    required
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className="w-full bg-black/40 border border-white/5 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all uppercase tracking-wider font-mono font-bold"
                    placeholder="ENTER CODE"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email / Username</label>
                  <input
                    type="text"
                    required
                    value={regData.username}
                    onChange={(e) => setRegData({ ...regData, username: e.target.value, email: e.target.value })}
                    className="w-full bg-black/40 border border-white/5 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                    placeholder="johndoe@example.com"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Password</label>
                  <input
                    type="password"
                    required
                    value={regData.password}
                    onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                    className="w-full bg-black/40 border border-white/5 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email / Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Johndoe@gmail.com"
                    className="w-full bg-black/40 border border-white/5 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black/40 border border-white/5 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                    required
                  />
                </div>
              </div>
            )}

            {!isSettingPassword && !isRegistering && (
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-indigo-400 hover:text-white text-xs underline underline-offset-4 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
            )}

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                <p className="text-rose-400 text-xs font-bold text-center">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90 text-white font-bold py-3 mt-2 rounded-2xl transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50 text-sm"
            >
              {isLoading ? 'Processing...' : (isSettingPassword ? 'Save Password' : (isRegistering ? 'Create Account' : 'Sign in'))}
            </button>

            <div className="text-center pt-1">
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
                className="text-gray-400 hover:text-white text-xs font-medium transition-colors"
              >
                {isSettingPassword ? 'Back to Sign in' : (isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Sign up")}
              </button>
            </div>
          </form>

          <div className="mt-4 lg:mt-6 flex flex-col items-center gap-3 shrink-0 pb-4">
            <div className="flex items-center gap-4 w-full">
              <div className="h-px flex-1 bg-white/5" />
              <span className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.3em] whitespace-nowrap">Or continue with</span>
              <div className="h-px flex-1 bg-white/5" />
            </div>

            <button
              type="button"
              onClick={() => {
                if (inviteCode) {
                  sessionStorage.setItem('elitepg_invite_code', inviteCode);
                }
                loginWithGoogle(isRegistering ? 'signup' : 'login');
              }}
              className="w-full h-12 rounded-2xl bg-white flex items-center justify-center gap-3 hover:bg-gray-50 transition-all shadow-lg active:scale-[0.98] font-semibold text-gray-900 text-sm"
            >
              <GoogleIcon />
              {isRegistering ? 'Sign up with Google' : 'Continue with Google'}
            </button>
          </div>
        </div>

        <div className="hidden lg:flex w-[55%] bg-black/40 relative p-12 flex-col justify-between border-l border-white/5 overflow-hidden">
          <div className="absolute top-1/2 right-[-10%] -translate-y-1/2 w-[400px] h-[400px] opacity-20 pointer-events-none">
            <svg viewBox="0 0 200 200" className="w-full h-full text-indigo-500 animate-[spin_60s_linear_infinite]">
              <path fill="currentColor" d="M100 0 L110 90 L200 100 L110 110 L100 200 L90 110 L0 100 L90 90 Z" />
            </svg>
          </div>

          <div className="relative z-10 flex-1 flex flex-col justify-center">
            <h2 className="text-4xl font-bold text-white mb-6 leading-[1.1] tracking-tight">
              What's our <br /> Residents Said.
            </h2>
            <Quote className="w-8 h-8 text-white/20 mb-4" />
            <p className="text-lg text-gray-300 font-medium leading-relaxed mb-6 max-w-lg">
              "Finding a safe and premium PG was never this easy. The ElitePG portal makes everything seamless from KYC to payments."
            </p>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-bold text-white">Anil Kumar</h4>
                <p className="text-sm text-gray-500 font-medium">Resident at BKC Mumbai</p>
              </div>
              <div className="flex gap-3">
                <button className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center hover:bg-indigo-500/20 transition-all">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center hover:bg-emerald-500/20 transition-all">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="self-end bg-white rounded-[24px] p-6 w-full max-w-[320px] shadow-2xl relative z-10 mr-4 mb-4"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">
              Get your right room and right place stay now
            </h3>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
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

