import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import {
  Shield,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  Quote,
  Github,
  Chrome,
  Facebook
} from 'lucide-react';

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

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isRegistering) {
        const newUser = await register({
          username: regData.username,
          name: regData.name,
          email: regData.email,
          role: regData.role
        }, regData.password);
        if (newUser) {
          alert('Registration successful! Please wait for an admin to authorize your account.');
          setIsRegistering(false);
        } else {
          setError('Registration failed. Please try again.');
        }
      } else {
        const result = await login(username, password);
        if (result.success) {
          const fromPath = (location.state as any)?.from?.pathname;
          const from = fromPath && fromPath !== '/profile' ? fromPath : '/';
          navigate(from, { replace: true });
        } else {
          setError(result.message || 'Invalid username or password');
        }
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
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
              {isRegistering ? 'Create Account' : 'Welcome back'}
            </h2>
            <p className="text-gray-400 font-medium text-sm sm:text-base">
              {isRegistering ? 'Join the ElitePG community' : 'Please Enter your Account details'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 flex-1">
            {isRegistering ? (
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
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm">
              <label className="flex items-center gap-2 text-gray-400 cursor-pointer group">
                <div className="w-4 h-4 rounded border border-white/20 flex items-center justify-center group-hover:border-white/40 transition-colors">
                  <div className="w-2 h-2 bg-white rounded-sm opacity-0 group-hover:opacity-20 transition-opacity" />
                </div>
                Keep me logged in
              </label>
              <button type="button" className="text-gray-400 hover:text-white underline underline-offset-4 transition-colors text-left">
                Forgot Password
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
              {isLoading ? 'Processing...' : (isRegistering ? 'Create Account' : 'Sign in')}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
              >
                {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </form>

          <div className="mt-10 sm:mt-12 flex flex-col items-center gap-6">
            <div className="flex items-center gap-4 w-full">
              <div className="h-px flex-1 bg-white/5" />
              <span className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.3em] whitespace-nowrap">Or continue with</span>
              <div className="h-px flex-1 bg-white/5" />
            </div>
            <div className="flex gap-4">
              {[Chrome, Github, Facebook].map((Icon, i) => (
                <button key={i} className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 transition-all shadow-lg active:scale-90">
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-900" />
                </button>
              ))}
            </div>
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
    </div>
  );
};
