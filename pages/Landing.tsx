
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Lock, 
  Zap, 
  GraduationCap, 
  ArrowRight, 
  Star, 
  Sun, 
  Moon, 
  Monitor, 
  X, 
  Loader2,
  BrainCircuit,
  FileText,
  CheckCircle,
  Sparkles,
  BarChart2,
  Layout,
  Trophy,
  Users,
  Search,
  Globe
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';

const Landing = () => {
  const navigate = useNavigate();
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const [theme, setTheme] = useState('white');
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'white';
    setTheme(currentTheme);
  }, []);

  const cycleTheme = () => {
    const themes = ['white', 'black', 'space'];
    const nextIndex = (themes.indexOf(theme) + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('qb_theme', nextTheme);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
        const cleanInput = loginInput.trim().replace(/["']/g, ''); 
        const { data: user, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .or(`email.ilike."${cleanInput}",username.ilike."${cleanInput}"`)
          .maybeSingle();

        if (fetchError || !user) throw new Error("Invalid credentials");
        if (user.status === 'disabled') throw new Error("Account disabled.");

        let isValidPassword = false;
        if (user.password === password.trim()) isValidPassword = true;
        else { try { isValidPassword = await bcrypt.compare(password.trim(), user.password); } catch {} }

        if (!isValidPassword) throw new Error("Invalid credentials");
        if (user.role?.toLowerCase() !== 'admin') throw new Error("Access denied: Not an admin");

        const sessionUser = { ...user, role: 'admin', password: '' };
        localStorage.setItem('qb_user', JSON.stringify(sessionUser));
        localStorage.setItem('qb_session_token', `mock_token_${Date.now()}`);
        window.dispatchEvent(new Event('auth-change'));
        navigate('/dashboard/admin');
    } catch (err: any) {
        setLoading(false);
        setError(err.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-page font-sans text-txt transition-colors duration-300 selection:bg-brand selection:text-white overflow-hidden">
        {/* Header */}
        <header className="fixed top-0 w-full bg-header backdrop-blur-md z-50 border-b border-glass transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand text-white rounded-xl flex items-center justify-center shadow-lg shadow-brand/30">
                        <Zap className="w-6 h-6 fill-current" />
                    </div>
                    <span className="text-xl font-extrabold tracking-tight">QPGPT</span>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={cycleTheme} className="p-2.5 text-muted hover:text-txt hover:bg-card rounded-full transition-all">
                      {theme === 'white' && <Sun className="w-5 h-5" />}
                      {theme === 'black' && <Moon className="w-5 h-5" />}
                      {theme === 'space' && <Monitor className="w-5 h-5" />}
                    </button>
                    <button onClick={() => setIsAdminDialogOpen(true)} className="hidden md:flex text-sm font-medium text-muted hover:text-txt items-center gap-2">
                        <Lock className="w-4 h-4" /> Admin
                    </button>
                    <button onClick={() => navigate('/signup')} className="hidden sm:block text-sm font-bold text-brand hover:text-brand-hover transition-colors">
                        Sign Up
                    </button>
                    <button onClick={() => navigate('/login')} className="bg-txt text-inv px-6 py-2.5 rounded-full text-sm font-bold hover:scale-105 transition-transform shadow-lg">
                        Login
                    </button>
                </div>
            </div>
        </header>

        {/* Hero Section */}
        <section className="relative pt-32 pb-16 lg:pt-48 lg:pb-24 px-6 overflow-hidden">
            {/* Background Atmosphere */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                 <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand/10 rounded-full blur-[100px] animate-pulse-slow"></div>
                 <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px]"></div>
            </div>

            <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center text-center">
                
                {/* Text Content */}
                <div className="max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand/5 border border-brand/20 text-brand text-sm font-bold tracking-wide mb-8 animate-in fade-in slide-in-from-bottom-4">
                        <Star className="w-4 h-4 fill-current" />
                        <span>The #1 AI Learning Platform</span>
                    </div>
                    
                    <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-txt leading-[1.1] mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
                        Transform your <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand via-purple-500 to-pink-500">Notes into A+ Grades</span>
                    </h1>
                    
                    <p className="text-xl text-muted leading-relaxed mb-10 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
                        Upload your syllabus, and let the <b>QPGPT Engine</b> generate tailored quizzes, summaries, and practice papers instantly.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-4 justify-center animate-in fade-in slide-in-from-bottom-10 duration-1000">
                        <button onClick={() => navigate('/signup')} className="w-full sm:w-auto px-8 py-4 bg-brand text-white rounded-2xl font-bold text-lg hover:bg-brand-hover hover:scale-105 transition-all shadow-xl shadow-brand/25 flex items-center justify-center gap-2">
                            Start Learning Free <ArrowRight className="w-5 h-5" />
                        </button>
                        <button onClick={() => navigate('/questions')} className="w-full sm:w-auto px-8 py-4 bg-card text-txt border border-border rounded-2xl font-bold text-lg hover:border-brand/30 transition-all shadow-sm">
                            Browse Library
                        </button>
                    </div>

                    <div className="mt-8 flex items-center justify-center gap-4 text-sm text-muted font-medium">
                        <div className="flex -space-x-2">
                            {[1,2,3].map(i => (
                                <div key={i} className="w-8 h-8 rounded-full border-2 border-page bg-gray-200">
                                   <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i+50}`} alt="User" className="w-full h-full rounded-full" />
                                </div>
                            ))}
                        </div>
                        <p>Join 10,000+ students on QPGPT.</p>
                    </div>
                </div>
            </div>
        </section>

        {/* Stats Strip */}
        <div className="border-y border-border bg-card/50 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="text-center">
                    <p className="text-4xl font-extrabold text-txt mb-1">10k+</p>
                    <p className="text-sm font-bold text-muted uppercase tracking-wider">Papers</p>
                </div>
                <div className="text-center">
                    <p className="text-4xl font-extrabold text-brand mb-1">50+</p>
                    <p className="text-sm font-bold text-muted uppercase tracking-wider">Subjects</p>
                </div>
                <div className="text-center">
                    <p className="text-4xl font-extrabold text-txt mb-1">99%</p>
                    <p className="text-sm font-bold text-muted uppercase tracking-wider">Satisfaction</p>
                </div>
                <div className="text-center">
                    <p className="text-4xl font-extrabold text-purple-600 mb-1">24/7</p>
                    <p className="text-sm font-bold text-muted uppercase tracking-wider">AI Support</p>
                </div>
            </div>
        </div>

        {/* Tools Showcase (Bento Grid) */}
        <section className="py-24 px-6 relative bg-page">
            <div className="max-w-7xl mx-auto">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-5xl font-extrabold text-txt mb-4">Powerful Tools for <span className="text-brand">Modern Learning</span></h2>
                    <p className="text-lg text-muted">Everything you need to excel in your studies, from AI-generated quizzes to a vast repository of past papers.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(250px,auto)]">
                    
                    {/* Tool 1: Paper Generator (Large Card) */}
                    <div className="md:col-span-2 bg-card rounded-3xl border border-glass shadow-glass p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-brand/10 transition-colors"></div>
                        <div className="flex-1 space-y-4 relative z-10">
                            <div className="w-12 h-12 bg-brand/10 text-brand rounded-2xl flex items-center justify-center">
                                <FileText className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-bold text-txt">AI Paper Generator</h3>
                            <p className="text-muted leading-relaxed">
                                Create professional, exam-ready question papers in seconds. Just paste your notes or upload a PDF chapter, and QPGPT will format a strict academic paper for you.
                            </p>
                            <button onClick={() => navigate('/generate')} className="text-sm font-bold text-brand hover:underline flex items-center gap-1">
                                Try Generator <ArrowRight className="w-4 h-4"/>
                            </button>
                        </div>
                        <div className="w-full md:w-1/2 h-48 bg-page rounded-xl border border-border p-4 shadow-inner relative opacity-90 group-hover:scale-105 transition-transform duration-500">
                             {/* Mock UI */}
                             <div className="w-full h-2 bg-muted/20 rounded mb-2"></div>
                             <div className="w-2/3 h-2 bg-muted/20 rounded mb-6"></div>
                             <div className="space-y-3">
                                 <div className="flex gap-2">
                                     <div className="w-4 h-4 rounded bg-brand/20"></div>
                                     <div className="flex-1 h-2 bg-muted/10 rounded mt-1"></div>
                                 </div>
                                 <div className="flex gap-2">
                                     <div className="w-4 h-4 rounded bg-brand/20"></div>
                                     <div className="flex-1 h-2 bg-muted/10 rounded mt-1"></div>
                                 </div>
                             </div>
                             <div className="absolute bottom-4 right-4 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow-lg">Ready to Print</div>
                        </div>
                    </div>

                    {/* Tool 2: QPGPT (Tall Card) */}
                    <div className="md:row-span-2 bg-gradient-to-b from-indigo-900 to-purple-900 text-white rounded-3xl p-8 flex flex-col relative overflow-hidden shadow-xl">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md">
                            <BotIcon className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Meet QPGPT</h3>
                        <p className="text-indigo-200 mb-8">Your personal AI study companion. Ask deep questions, get simple answers.</p>
                        
                        <div className="mt-auto bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 space-y-3">
                             <div className="bg-indigo-600/50 p-3 rounded-xl rounded-tr-none text-xs">
                                 Can you explain Quantum Physics?
                             </div>
                             <div className="bg-white/10 p-3 rounded-xl rounded-tl-none text-xs text-indigo-100">
                                 Sure! Imagine a cat in a box...
                             </div>
                        </div>
                         <button onClick={() => navigate('/qpgpt')} className="mt-6 w-full py-3 bg-white text-indigo-900 font-bold rounded-xl hover:bg-indigo-50 transition-colors">
                            Start Chat
                        </button>
                    </div>

                    {/* Tool 3: Quizlein (Standard Card) */}
                    <div className="bg-card rounded-3xl border border-glass shadow-glass p-8 flex flex-col justify-between group hover:border-orange-200 transition-colors">
                        <div>
                            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-6">
                                <Trophy className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-txt mb-2">Quizlein Game</h3>
                            <p className="text-muted text-sm">Gamify your revision. Turn any text into a live interactive quiz and earn badges.</p>
                        </div>
                        <div className="flex items-center gap-2 mt-6">
                             <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                             <span className="text-xs font-bold text-muted uppercase">Live Mode</span>
                             <button onClick={() => navigate('/quiz-game')} className="ml-auto text-orange-600 font-bold text-sm hover:underline">Play Now</button>
                        </div>
                    </div>

                     {/* Tool 4: Library (Standard Card) */}
                     <div className="bg-card rounded-3xl border border-glass shadow-glass p-8 flex flex-col justify-between group hover:border-blue-200 transition-colors">
                        <div>
                            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                                <Search className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-txt mb-2">Global Library</h3>
                            <p className="text-muted text-sm">Access 10,000+ past year papers and notes shared by top students and teachers.</p>
                        </div>
                        <div className="mt-4 flex -space-x-2 overflow-hidden">
                            {[1,2,3,4].map(i => (
                                <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-200">
                                     <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i*10}`} alt="" className="h-full w-full rounded-full" />
                                </div>
                            ))}
                            <div className="h-8 w-8 rounded-full ring-2 ring-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-muted">+9k</div>
                        </div>
                    </div>

                </div>
            </div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-border bg-card">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                 <div className="flex items-center gap-2 font-bold text-txt">
                    <div className="w-6 h-6 bg-brand rounded-md"></div>
                    QPGPT
                 </div>
                 <div className="text-sm text-muted">
                    © 2024 QPGPT. Built for excellence.
                 </div>
                 <div className="flex gap-6 text-sm font-medium text-muted">
                    <a href="#" className="hover:text-brand">Privacy</a>
                    <a href="#" className="hover:text-brand">Terms</a>
                    <a href="#" className="hover:text-brand">Contact</a>
                 </div>
            </div>
        </footer>

        {/* Admin Login Modal */}
        {isAdminDialogOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-card rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-border animate-in fade-in zoom-in duration-200">
                    <div className="p-6 border-b border-border flex justify-between items-center bg-muted/5">
                        <h3 className="text-lg font-bold text-txt">Admin Portal</h3>
                        <button onClick={() => setIsAdminDialogOpen(false)} className="text-muted hover:text-txt"><X className="w-5 h-5" /></button>
                    </div>
                    <form onSubmit={handleAdminLogin} className="p-8 space-y-5">
                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 text-sm rounded-xl flex items-center gap-3">
                                <X className="w-4 h-4" /> {error}
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Credentials</label>
                            <input type="text" value={loginInput} onChange={e => setLoginInput(e.target.value)} className="w-full px-4 py-3 bg-input border border-border rounded-xl text-txt focus:ring-2 focus:ring-brand outline-none" placeholder="Username / Email" />
                        </div>
                        <div>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-input border border-border rounded-xl text-txt focus:ring-2 focus:ring-brand outline-none" placeholder="Password" />
                        </div>
                        <button type="submit" disabled={loading} className="w-full py-3 bg-brand text-white font-bold rounded-xl hover:bg-brand-hover transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-70">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Secure Access'}
                        </button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

// Simple Icon component for QPGPT section
const BotIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
        <path d="M19 11v2a2 2 0 1 1-4 0v-2a2 2 0 1 0-4 0v2a2 2 0 1 1-4 0v-2" />
        <rect x="2" y="11" width="20" height="8" rx="2" />
    </svg>
);

export default Landing;
