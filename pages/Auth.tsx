import React, { useState } from 'react';
import {
  Lock, Loader2, AlertCircle, User, ChevronLeft
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import logo from '../components/assets/QPGPT-fevicon.png';
import { signInWithIdentifier } from '../lib/auth';

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
      const user = await signInWithIdentifier(loginInput, loginPassword);
      navigate(`/dashboard/${user.role || 'student'}`);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
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

            <div className="mt-6 rounded-xl border border-border bg-muted/5 px-4 py-3 text-sm text-muted">
              Google sign-in is temporarily disabled. Use your username/email and password to log in.
            </div>
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
