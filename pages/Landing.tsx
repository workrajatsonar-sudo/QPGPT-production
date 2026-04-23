import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Lock,
  Zap,
  ArrowRight,
  Sun,
  Moon,
  Monitor,
  X,
  Loader2,
  FileText,
  CheckCircle,
  Users,
  Search,
  Play,
  Sparkles,
  User,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import logo from "../components/assets/1QPGPT-fevicon.png";
import favicon from "../components/assets/QPGPT-fevicon.png";
import bcrypt from "bcryptjs";

const Landing = () => {
  const navigate = useNavigate();
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const [theme, setTheme] = useState("white");
  const [loginInput, setLoginInput] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "white";
    setTheme(currentTheme);

    // Set favicon
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = favicon;
  }, []);

  const cycleTheme = () => {
    const themes = ["white", "black", "space"];
    const nextIndex = (themes.indexOf(theme) + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("qb_theme", nextTheme);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const cleanInput = loginInput.trim().replace(/["']/g, "");

      let { data: user, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("email", cleanInput)
        .maybeSingle();

      if (!user && !fetchError) {
        const result = await supabase
          .from("users")
          .select("*")
          .eq("username", cleanInput)
          .maybeSingle();
        user = result.data;
        fetchError = result.error;
      }

      if (fetchError || !user) throw new Error("Invalid credentials (no user found)");

      if (user.status === "disabled") throw new Error("Account disabled.");

      let isValidPassword = false;
      if (user.password === password.trim()) {
        isValidPassword = true;
      } else {
        try {
          isValidPassword = await bcrypt.compare(password.trim(), user.password);
        } catch (e) { /* ignore */ }
      }

      if (!isValidPassword) throw new Error("Incorrect Password. Please double check what you typed.");

      if (!user.role || !user.role.toLowerCase().includes("admin")) {
        throw new Error(`Access denied: Not an admin. Current role is: ${user.role}`);
      }

      const sessionUser = { ...user, role: "admin", password: "" };
      localStorage.setItem("qb_user", JSON.stringify(sessionUser));
      localStorage.setItem("qb_session_token", `mock_token_${Date.now()}`);
      window.dispatchEvent(new Event("auth-change"));
      navigate("/dashboard/admin");
    } catch (err: any) {
      setLoading(false);
      setError(err.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-page font-sans text-txt transition-colors duration-300 selection:bg-brand selection:text-white relative overflow-hidden">
      {/* Abstract Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-brand/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] right-[10%] w-[30vw] h-[30vw] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="fixed top-0 w-full bg-page/60 backdrop-blur-xl z-50 border-b border-border/40 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand to-purple-600 flex items-center justify-center shadow-lg shadow-brand/25 group-hover:scale-105 transition-transform duration-300">
              <img src={logo} alt="QPGPT Logo" className="w-8 h-8 object-contain" />
            </div>
            <span className="text-xl font-black text-txt tracking-tighter">QPGPT</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={cycleTheme}
              className="p-2.5 text-muted hover:text-txt hover:bg-card/80 rounded-xl transition-all border border-transparent hover:border-border/50 hover:shadow-sm"
              title="Toggle Theme"
            >
              {theme === "white" && <Sun className="w-5 h-5" />}
              {theme === "black" && <Moon className="w-5 h-5" />}
              {theme === "space" && <Monitor className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setIsAdminDialogOpen(true)}
              className="hidden sm:flex text-sm font-semibold text-muted hover:text-txt items-center gap-2 px-4 py-2 rounded-xl hover:bg-card/80 transition-all border border-transparent hover:border-border/50"
            >
              <Lock className="w-4 h-4" /> Admin
            </button>
            <button
              onClick={() => navigate("/login")}
              className="text-sm font-bold text-txt px-5 py-2.5 rounded-xl hover:bg-card/80 transition-all border border-border/50 shadow-sm hover:shadow"
            >
              Log in
            </button>
            <button
              onClick={() => navigate("/signup")}
              className="bg-txt text-page text-sm font-bold px-6 py-2.5 rounded-xl hover:scale-105 transition-transform shadow-lg shadow-txt/10 flex items-center gap-2 group"
            >
              Get started <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-40 pb-24 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl mx-auto text-center relative z-10 flex flex-col items-center">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-brand bg-brand/10 border border-brand/20 px-4 py-2 rounded-full mb-8 backdrop-blur-md animate-in slide-in-from-bottom-4 duration-700">
              <Sparkles className="w-4 h-4" />
              Next-Gen AI Study Assistant
            </div>

            <h1 className="text-5xl lg:text-7xl font-black text-txt leading-[1.1] mb-6 tracking-tight animate-in slide-in-from-bottom-6 duration-700 delay-100">
              Your notes deserve better than <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand via-purple-500 to-brand bg-[length:200%_auto] animate-gradient">cramming.</span>
            </h1>

            <p className="text-lg lg:text-xl text-muted leading-relaxed mb-10 max-w-2xl font-medium animate-in slide-in-from-bottom-8 duration-700 delay-200">
              Upload any syllabus or notes. QPGPT turns them into custom quizzes,
              past papers, and AI explanations — in seconds, not hours.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-10 justify-center animate-in slide-in-from-bottom-10 duration-700 delay-300">
              <button
                onClick={() => navigate("/signup")}
                className="px-8 py-4 bg-gradient-to-r from-brand to-purple-600 text-white rounded-2xl font-bold text-lg hover:shadow-xl hover:shadow-brand/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
              >
                Start learning for free <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => navigate("/questions")}
                className="px-8 py-4 bg-card/50 backdrop-blur-md border border-border text-txt rounded-2xl font-bold text-lg hover:bg-card hover:border-brand/30 hover:shadow-lg transition-all"
              >
                Browse questions
              </button>
            </div>

            <div className="flex items-center justify-center gap-4 text-sm font-medium text-muted animate-in slide-in-from-bottom-12 duration-700 delay-500">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-brand/20 to-purple-500/20 border-2 border-page flex items-center justify-center backdrop-blur-sm">
                    <User className="w-3 h-3 text-brand" />
                  </div>
                ))}
              </div>
              <p>Join 10,000+ top students</p>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof - Minimalist Logos */}
      <section className="py-10 border-y border-border/40 bg-card/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-xs font-bold text-muted/60 text-center mb-6 uppercase tracking-widest">Trusted by students worldwide</p>
          <div className="flex flex-wrap items-center justify-center gap-12 text-muted/40 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            {['MIT', 'Stanford', 'Oxford', 'Cambridge', 'Harvard'].map((uni) => (
              <span key={uni} className="text-xl md:text-2xl font-black tracking-tighter hover:text-brand transition-colors cursor-default">{uni}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features - Premium Cards */}
      <section className="py-32 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-black text-txt mb-6 tracking-tight">An ecosystem built for <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-purple-500">mastery.</span></h2>
            <p className="text-xl text-muted max-w-2xl mx-auto">More than just flashcards. We provide the complete suite to dissect, understand, and conquer your exams.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Generator */}
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-3xl p-8 hover:-translate-y-2 hover:shadow-2xl hover:shadow-brand/10 transition-all duration-300 group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full blur-3xl group-hover:bg-brand/20 transition-colors" />
              <div className="w-14 h-14 bg-gradient-to-br from-brand/20 to-brand/5 text-brand rounded-2xl flex items-center justify-center mb-6 border border-brand/10 group-hover:scale-110 transition-transform">
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-txt mb-3">Question Generator</h3>
              <p className="text-muted leading-relaxed mb-8">
                Paste your notes or upload a PDF. Get exam-ready questions with proper formatting, marks distribution, and answer keys in an instant.
              </p>
              <button
                onClick={() => navigate("/generate")}
                className="text-brand font-bold flex items-center gap-2 group-hover:gap-3 transition-all"
              >
                Try Generator <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {/* QPGPT Chat */}
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-3xl p-8 hover:-translate-y-2 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-colors" />
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500/20 to-purple-500/5 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mb-6 border border-purple-500/10 group-hover:scale-110 transition-transform">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-txt mb-3">QPGPT Assistant</h3>
              <p className="text-muted leading-relaxed mb-8">
                Stuck on a complex concept? Ask our specialized AI anything. Get crystal-clear explanations with examples drawn directly from your syllabus.
              </p>
              <button
                onClick={() => navigate("/qpgpt")}
                className="text-purple-600 dark:text-purple-400 font-bold flex items-center gap-2 group-hover:gap-3 transition-all"
              >
                Chat with AI <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {/* Quiz Game */}
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-3xl p-8 hover:-translate-y-2 hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-300 group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl group-hover:bg-orange-500/20 transition-colors" />
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500/20 to-orange-500/5 text-orange-600 dark:text-orange-400 rounded-2xl flex items-center justify-center mb-6 border border-orange-500/10 group-hover:scale-110 transition-transform">
                <Play className="w-7 h-7 ml-1" />
              </div>
              <h3 className="text-2xl font-bold text-txt mb-3">Multiplayer Quiz</h3>
              <p className="text-muted leading-relaxed mb-8">
                Turn any boring topic into a highly competitive multiplayer quiz game. Compete with friends, track your scores, and make learning addictive.
              </p>
              <button
                onClick={() => navigate("/quiz-game")}
                className="text-orange-600 dark:text-orange-400 font-bold flex items-center gap-2 group-hover:gap-3 transition-all"
              >
                Start Playing <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Huge CTA Section */}
      <section className="py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="relative rounded-[3rem] overflow-hidden bg-txt text-page py-24 px-8 text-center shadow-2xl">
            {/* Fancy Background inside CTA */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand via-transparent to-transparent blur-2xl" />
            
            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-4xl lg:text-6xl font-black mb-6 tracking-tight">
                Stop studying hard.<br />Start studying smart.
              </h2>
              <p className="text-xl opacity-80 mb-10 font-medium">
                Join the platform that is changing how top-tier students prepare for their most important exams.
              </p>
              <button
                onClick={() => navigate("/signup")}
                className="px-10 py-5 bg-brand text-white rounded-full font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-brand/30 flex items-center gap-3 mx-auto group"
              >
                Create your free account
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </button>
              <p className="mt-6 text-sm opacity-60 font-medium">Takes 30 seconds • No credit card required</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/40 bg-page/80 backdrop-blur-md relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="w-8 h-8 rounded-xl bg-txt flex items-center justify-center shadow-md">
                <img src={logo} alt="QPGPT" className="w-6 h-6 object-contain" />
              </div>
              <span className="font-black text-xl tracking-tighter text-txt">QPGPT</span>
            </div>
            <div className="flex gap-8 text-sm font-semibold text-muted">
              <a href="#/privacy" className="hover:text-brand transition-colors">Privacy Policy</a>
              <a href="#/terms" className="hover:text-brand transition-colors">Terms of Service</a>
              <a href="#/contact" className="hover:text-brand transition-colors">Contact Support</a>
            </div>
            <p className="text-sm font-medium text-muted/60">© {new Date().getFullYear()} QPGPT. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Admin Login Modal */}
      {isAdminDialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/20 w-full max-w-sm border border-white/10 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border/50 flex justify-between items-center bg-muted/5">
              <h3 className="font-black text-xl text-txt flex items-center gap-2">
                <Lock className="w-5 h-5 text-brand" /> Admin Access
              </h3>
              <button onClick={() => setIsAdminDialogOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-input/50 text-muted hover:text-txt hover:bg-input transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAdminLogin} className="p-6 space-y-5">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2">
                  <X className="w-5 h-5 shrink-0" /> {error}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted uppercase tracking-wider">Identifier</label>
                <input
                  type="text"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  className="w-full px-5 py-3.5 bg-input/50 border border-border rounded-2xl text-txt font-medium focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition-all"
                  placeholder="Email or username"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted uppercase tracking-wider">Secret Key</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 py-3.5 bg-input/50 border border-border rounded-2xl text-txt font-medium focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-txt text-page font-black rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2 shadow-lg shadow-txt/10"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Authenticate"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Landing;