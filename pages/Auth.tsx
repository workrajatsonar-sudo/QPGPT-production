
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Lock, Loader2, Zap, AlertCircle, User
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import bcrypt from 'bcryptjs';

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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
      
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .or(`email.eq.${cleanInput},username.eq.${cleanInput}`)
        .maybeSingle();

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

      if (!isValid) throw new Error("Invalid credentials");

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

  return (
    <div className="min-h-screen w-full bg-page flex items-center justify-center p-4 relative overflow-hidden">
      {/* Abstract Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-card border border-glass rounded-2xl shadow-glass overflow-hidden backdrop-blur-xl transition-all duration-300">
          
          {/* Header */}
          <div className="p-8 pb-4 text-center">
            <div className="w-12 h-12 bg-brand/10 text-brand rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-brand/20">
              <Zap className="w-6 h-6 fill-current" />
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
