import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Lock, Loader2, Zap, AlertCircle, User, ChevronLeft
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import logo from '../components/assets/QPGPT-fevicon.png';
import bcrypt from 'bcryptjs';

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  
  // --- Login State ---
  const [loginInput, setLoginInput] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const cleanInput = loginInput.trim().replace(/["']/g, ''); 
      
      // 1. Fetch User
      console.log('Attempting login with:', cleanInput);
      console.log('Supabase URL:', 'https://ojvqdxtyvbzyartmyxuq.supabase.co');
      
      // First try checking email
      let { data: user, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('email', cleanInput)
        .maybeSingle();

      // If not found by email, try checking username
      if (!user && !fetchError) {
          const result = await supabase
            .from('users')
            .select('*')
            .eq('username', cleanInput)
            .maybeSingle();
          user = result.data;
          fetchError = result.error;
      }

      console.log('Login response:', { user, error: fetchError });
      if (fetchError) throw fetchError;
      if (!user) throw new Error("Invalid credentials");
      if (user.status === 'disabled') throw new Error("Account has been disabled. Contact support.");

      // 2. Compare Password
      // Try direct comparison first (for legacy/seed users), then bcrypt
      let isValid = user.password === loginPassword;
      if (!isValid) {
          try { isValid = await bcrypt.compare(loginPassword, user.password); } catch {}
      }

      if (!isValid) throw new Error("Invalid credentials (password wrong)");

      // 3. Session Success
      completeSession(user);

    } catch (err: any) {
      console.error('Full error object:', err);
      console.error('Error type:', err.constructor.name);
      console.error('Error message:', err.message);
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const completeSession = (user: any) => {
      // Remove password from local storage object
      const safeUser = { ...user, password: '' };
      localStorage.setItem('qb_user', JSON.stringify(safeUser));
      // Mock token for API simulation
      localStorage.setItem('qb_session_token', `mock_token_${Date.now()}`);

      window.dispatchEvent(new Event('auth-change'));

      // Redirect based on role
      navigate(`/dashboard/${user.role || 'student'}`);
  };

  const handleGoogleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleLoading(true);
    setError(null);

    try {
      // Clear any existing session first to ensure clean slate
      await supabase.auth.signOut();

      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/#/auth-callback`
        }
      });

      if (authError) throw authError;

      // Supabase will auto-redirect via the browser to Google
      // After Google auth, it redirects back to redirectTo with the session in the URL hash
      console.log('Google OAuth initiated, redirecting...');

    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setError(err.message || 'Google sign-in failed');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-page flex items-center justify-center p-4 relative overflow-hidden">
      {/* Abstract Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Back to Home Button */}
      <div className="absolute top-8 left-8 z-50">
        <Link 
          to="/" 
          className="flex items-center gap-2 px-4 py-2 bg-card/50 backdrop-blur-md border border-border rounded-full text-sm font-semibold text-txt hover:bg-card hover:scale-105 transition-all shadow-glass group"
        >
          <ChevronLeft className="w-4 h-4 text-muted group-hover:text-brand transition-colors" />
          Go back to home
        </Link>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-card border border-glass rounded-2xl shadow-glass overflow-hidden backdrop-blur-xl transition-all duration-300">
          
          {/* Header */}
          <div className="p-8 pb-4 text-center">
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center p-3 mx-auto mb-4 shadow-md border border-border/50">
              <img src={logo} alt="QPGPT Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-txt tracking-tight">
              Welcome back
            </h1>
            <p className="text-muted text-sm mt-2">Enter your credentials to access your account</p>
          </div>

          <div className="px-8 pb-8">
            {error && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-600 text-sm animate-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-300">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted uppercase tracking-wider">Email or Username</label>
                    <div className="relative">
                        <User className="absolute left-3.5 top-3 w-4 h-4 text-muted" />
                        <input type="text" required value={loginInput} onChange={e => setLoginInput(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-input border border-border rounded-xl text-txt placeholder:text-muted/50 focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all outline-none"
                        placeholder="student@example.com"
                        />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted uppercase tracking-wider">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3.5 top-3 w-4 h-4 text-muted" />
                        <input type="password" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-input border border-border rounded-xl text-txt placeholder:text-muted/50 focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all outline-none"
                        placeholder="••••••••"
                        />
                    </div>
                </div>
                <button type="submit" disabled={loading}
                    className="w-full py-3 bg-brand text-inv font-bold rounded-xl hover:bg-brand-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand/20 disabled:opacity-70 disabled:pointer-events-none mt-2"
                >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Sign In
                </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="px-2 bg-card text-muted">or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:pointer-events-none"
            >
              {googleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              {googleLoading ? 'Signing in...' : 'Continue with Google'}
            </button>
          </div>

          <div className="px-8 py-6 border-t border-border bg-muted/5 text-center transition-colors">
            <p className="text-sm text-muted">
              Don't have an account?
              <Link to="/signup" className="ml-2 font-semibold text-brand hover:underline">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
