
import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  BookOpen, 
  ArrowLeft, 
  ArrowRight, 
  Loader2, 
  Zap, 
  AlertCircle,
  Check,
  ChevronLeft
} from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { signUpStudent } from '../lib/auth';

const Signup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine current step based on URL
  const isStudentSignup = location.pathname === '/signup/student';
  const isRoleSelection = !isStudentSignup;

  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    username: '',
    password: '',
    confirm_password: '',
    // Student Specific
    grade_year: '',
    level_of_study: '',
    course_stream: '',
    subjects_of_interest: '', // Comma separated for input
    exam_type: '',
  });

  // Handle OAuth redirect - pre-fill email (must be after formData state)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const oauthEmail = params.get('email');
    const isOAuth = params.get('oauth') === 'true';
    if (oauthEmail && isOAuth) {
      setFormData(prev => ({ ...prev, email: oauthEmail }));
    }
  }, [location.search]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (formData.password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
    }
    if (formData.password !== formData.confirm_password) {
        setError("Passwords do not match.");
        return;
    }
    if (!formData.username || !formData.email || !formData.full_name) {
        setError("Please fill in all required fields.");
        return;
    }

    setLoading(true);

    try {
        const result = await signUpStudent({
          full_name: formData.full_name,
          email: formData.email,
          username: formData.username,
          password: formData.password,
          grade_year: formData.grade_year,
          level_of_study: formData.level_of_study,
          course_stream: formData.course_stream,
          exam_type: formData.exam_type,
          subjects_of_interest: formData.subjects_of_interest
            .split(',')
            .map(s => s.trim())
            .filter(Boolean),
        });

        if (result.needsEmailVerification) {
          navigate('/login', {
            replace: true,
            state: { message: 'Account created. Please verify your email before signing in.' }
          });
          return;
        }

        navigate(`/dashboard/${result.profile.role || 'student'}`);
    } catch (err: any) {
        setError(err.message || "Registration failed. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  // --- RENDERERS ---

  const renderRoleSelection = () => (
    <div className="space-y-8 animate-in fade-in zoom-in duration-300">
       <div className="text-center space-y-2">
           <h2 className="text-2xl font-bold text-txt">Create your account</h2>
           <p className="text-muted">Tell us who you are to get a personalized experience</p>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <button 
             onClick={() => navigate('/signup/student')}
             className="relative group p-8 rounded-2xl border-2 border-border hover:border-brand/50 bg-card hover:bg-brand/5 transition-all text-left flex flex-col gap-4 overflow-hidden"
           >
              <div className="p-4 bg-blue-100 text-blue-600 rounded-2xl w-fit group-hover:scale-110 transition-transform duration-300">
                  <GraduationCap className="w-8 h-8" />
              </div>
              <div className="space-y-1 z-10">
                  <h3 className="text-xl font-bold text-txt group-hover:text-brand transition-colors">Student</h3>
                  <p className="text-sm text-muted">I want to practice questions, take quizzes, and generate papers for my studies.</p>
              </div>
              <div className="mt-4 flex items-center text-sm font-bold text-brand opacity-0 group-hover:opacity-100 transition-opacity -translate-x-4 group-hover:translate-x-0">
                  Continue as Student <ArrowRight className="w-4 h-4 ml-2" />
              </div>
           </button>

           <button 
             onClick={() => navigate('/apply-teacher')}
             className="relative group p-8 rounded-2xl border-2 border-border hover:border-purple-500/50 bg-card hover:bg-purple-500/5 transition-all text-left flex flex-col gap-4 overflow-hidden"
           >
              <div className="p-4 bg-purple-100 text-purple-600 rounded-2xl w-fit group-hover:scale-110 transition-transform duration-300">
                  <BookOpen className="w-8 h-8" />
              </div>
              <div className="space-y-1 z-10">
                  <h3 className="text-xl font-bold text-txt group-hover:text-purple-600 transition-colors">Teacher</h3>
                  <p className="text-sm text-muted">Apply for a verified teacher account to contribute resources.</p>
              </div>
               <div className="mt-4 flex items-center text-sm font-bold text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-4 group-hover:translate-x-0">
                  Apply Now <ArrowRight className="w-4 h-4 ml-2" />
              </div>
           </button>
       </div>
    </div>
  );

  const renderStudentForm = () => (
      <form onSubmit={handleSignup} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
          <div className="flex items-center gap-2 mb-6">
              <Link to="/signup" className="p-2 hover:bg-muted/10 rounded-full transition-colors text-muted hover:text-txt">
                  <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                  <h2 className="text-xl font-bold text-txt">Student Registration</h2>
                  <p className="text-xs text-muted">Create your learning profile</p>
              </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1.5">
                 <label className="text-xs font-bold text-muted uppercase">Full Name *</label>
                 <input required type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand" placeholder="John Doe" />
             </div>
             <div className="space-y-1.5">
                 <label className="text-xs font-bold text-muted uppercase">Username *</label>
                 <input required type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand" placeholder="john.d" />
             </div>
          </div>

          <div className="space-y-1.5">
             <label className="text-xs font-bold text-muted uppercase">Email Address *</label>
             <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand" placeholder="john@school.edu" />
          </div>

          {/* Academic Info */}
          <div className="p-5 bg-muted/5 rounded-xl border border-border space-y-4">
              <h3 className="text-sm font-bold text-txt flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-brand" /> Academic Details
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted uppercase">Level of Study</label>
                    <select required value={formData.level_of_study} onChange={e => setFormData({...formData, level_of_study: e.target.value})} className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-brand">
                        <option value="">Select Level...</option>
                        <option value="School">School (K-12)</option>
                        <option value="College">College / University</option>
                        <option value="Competitive">Competitive Exams</option>
                    </select>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted uppercase">Class / Grade</label>
                    <select required value={formData.grade_year} onChange={e => setFormData({...formData, grade_year: e.target.value})} className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-brand">
                        <option value="">Select...</option>
                        <option value="Class 8">Class 8</option>
                        <option value="Class 9">Class 9</option>
                        <option value="Class 10">Class 10</option>
                        <option value="Class 11">Class 11</option>
                        <option value="Class 12">Class 12</option>
                        <option value="Undergraduate">Undergraduate</option>
                    </select>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted uppercase">Stream</label>
                    <select value={formData.course_stream} onChange={e => setFormData({...formData, course_stream: e.target.value})} className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-brand">
                        <option value="">Select...</option>
                        <option value="Science">Science (PCM/PCB)</option>
                        <option value="Commerce">Commerce</option>
                        <option value="Arts">Arts / Humanities</option>
                        <option value="General">General</option>
                    </select>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted uppercase">Target Exam</label>
                    <input type="text" placeholder="e.g. CBSE, JEE" value={formData.exam_type} onChange={e => setFormData({...formData, exam_type: e.target.value})} className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-brand" />
                 </div>
              </div>
              
              <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted uppercase">Subjects of Interest</label>
                  <input type="text" placeholder="Math, Physics, History (comma separated)" value={formData.subjects_of_interest} onChange={e => setFormData({...formData, subjects_of_interest: e.target.value})} className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-brand" />
              </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1.5">
                 <label className="text-xs font-bold text-muted uppercase">Password *</label>
                 <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-brand" />
             </div>
             <div className="space-y-1.5">
                 <label className="text-xs font-bold text-muted uppercase">Confirm *</label>
                 <input required type="password" value={formData.confirm_password} onChange={e => setFormData({...formData, confirm_password: e.target.value})} className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-brand" />
             </div>
          </div>

          <button type="submit" disabled={loading}
              className="w-full py-4 bg-brand text-inv font-bold rounded-xl hover:bg-brand-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand/20 disabled:opacity-70 disabled:pointer-events-none"
          >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              Complete Registration
          </button>
      </form>
  );

  return (
    <div className="min-h-screen w-full bg-page flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] pointer-events-none transition-colors duration-700 bg-brand/10`} />
      <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] pointer-events-none transition-colors duration-700 bg-purple-500/10`} />

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

      <div className={`w-full relative z-10 transition-all duration-500 ${isRoleSelection ? 'max-w-4xl' : 'max-w-xl'}`}>
        <div className="bg-card border border-glass rounded-3xl shadow-glass overflow-hidden backdrop-blur-xl">
          
          {/* Top Logo Area */}
          <div className="p-8 pb-0 text-center">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-border transition-colors duration-500 bg-brand/10 text-brand`}>
              <Zap className="w-6 h-6 fill-current" />
            </div>
          </div>

          <div className="px-8 pb-10">
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-600 text-sm animate-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {isRoleSelection && renderRoleSelection()}
            {isStudentSignup && renderStudentForm()}
          </div>

          <div className="px-8 py-6 border-t border-border bg-muted/5 text-center">
            <p className="text-sm text-muted">
              Already have an account?
              <Link to="/login" className={`ml-2 font-bold hover:underline text-brand`}>
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
