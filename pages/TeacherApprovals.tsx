
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  UserCheck, 
  CheckCircle, 
  XCircle, 
  Video, 
  FileText, 
  Image as ImageIcon,
  Loader2, 
  Phone,
  Mail,
  Building,
  Calendar,
  AlertTriangle,
  X,
  Copy,
  ShieldCheck,
  Eye,
  ArrowRight
} from 'lucide-react';
import bcrypt from 'bcryptjs';
import { useNavigate } from 'react-router-dom';

interface TeacherApp {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  institution_name: string;
  institution_address: string;
  subject_specialization: string;
  experience_years: number;
  profile_photo_path: string;
  id_card_path: string;
  verification_video_path: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

const TeacherApprovals = () => {
  const navigate = useNavigate();
  const [apps, setApps] = useState<TeacherApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<TeacherApp | null>(null);
  
  // Signed URLs for secure viewing
  const [signedUrls, setSignedUrls] = useState<{
    profile: string | null;
    idcard: string | null;
    video: string | null;
  }>({ profile: null, idcard: null, video: null });

  const [actionLoading, setActionLoading] = useState(false);

  // Modal States
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [createdUserCreds, setCreatedUserCreds] = useState({email: '', password: ''});

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('teacher_applications')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (data) setApps(data);
    setLoading(false);
  };

  const loadSignedUrls = async (app: TeacherApp) => {
    const { data: profile } = await supabase.storage.from('teacher-verification-docs').createSignedUrl(app.profile_photo_path, 3600);
    const { data: idcard } = await supabase.storage.from('teacher-verification-docs').createSignedUrl(app.id_card_path, 3600);
    const { data: video } = await supabase.storage.from('teacher-verification-docs').createSignedUrl(app.verification_video_path, 3600);

    setSignedUrls({
      profile: profile?.signedUrl || null,
      idcard: idcard?.signedUrl || null,
      video: video?.signedUrl || null,
    });
  };

  const handleSelect = (app: TeacherApp) => {
    setSelectedApp(app);
    loadSignedUrls(app);
  };

  // --- SAFETY CHECK ---
  // This prevents the "Foreign Key Violation" error.
  // It ensures the ID in localStorage actually exists in public.users before we try to use it in an UPDATE query.
  const getVerifiedAdminId = async () => {
    const adminStr = localStorage.getItem('qb_user');
    const adminSession = adminStr ? JSON.parse(adminStr) : null;

    if (!adminSession?.id) {
        alert("Session invalid. Please log in again.");
        navigate('/login');
        return null;
    }

    // Double check DB
    const { data: adminCheck } = await supabase.from('users').select('id').eq('id', adminSession.id).single();
    
    if (!adminCheck) {
        alert("Session Expired: Your admin account was not found in the database (it may have been reset). Please log out and log in again.");
        localStorage.removeItem('qb_user');
        navigate('/login');
        return null;
    }
    return adminCheck.id;
  };

  const handleApprove = async () => {
    if (!selectedApp) return;
    
    // 0. Validate Session
    const adminId = await getVerifiedAdminId();
    if (!adminId) return;

    setActionLoading(true);
    try {
      // 1. Prepare Credentials
      const defaultPassword = "Teacher@" + Math.floor(1000 + Math.random() * 9000);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(defaultPassword, salt);

      // 2. Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', selectedApp.email)
        .maybeSingle();

      if (existingUser) {
        // UPDATE existing user: Upgrade role and reset password so admin can share it
        const { error: updateError } = await supabase
          .from('users')
          .update({
            role: 'teacher',
            status: 'active', // Ensure account is enabled
            password: hashedPassword, // Reset password
            full_name: selectedApp.full_name // Update name if needed
          })
          .eq('id', existingUser.id);

        if (updateError) throw new Error("Failed to upgrade existing user: " + updateError.message);
      } else {
        // INSERT new user
        const { error: userError } = await supabase.from('users').insert({
          full_name: selectedApp.full_name,
          display_name: selectedApp.full_name,
          email: selectedApp.email,
          username: selectedApp.email.split('@')[0] + '_' + Math.floor(Math.random()*10000), 
          password: hashedPassword,
          role: 'teacher',
          status: 'active',
          level_of_study: 'School', 
          subjects_of_interest: selectedApp.subject_specialization.split(',')
        });

        if (userError) throw new Error("Failed to create user account: " + userError.message);
      }

      // 3. Update Application Status
      const { error: appError } = await supabase.from('teacher_applications').update({
        status: 'approved',
        reviewed_by: adminId, // Using verified ID
        reviewed_at: new Date().toISOString()
      }).eq('id', selectedApp.id);

      if (appError) throw new Error("Failed to update application status: " + appError.message);

      // 4. Log Admin Action
      await supabase.from('admin_logs').insert({
        admin_id: adminId,
        action_type: 'approve',
        target_type: 'teacher_application',
        target_id: selectedApp.id,
        details: `Approved teacher: ${selectedApp.full_name}`
      });

      setCreatedUserCreds({ email: selectedApp.email, password: defaultPassword });
      setSuccessModalOpen(true);

      setApps(prev => prev.filter(a => a.id !== selectedApp.id));
      setSelectedApp(null);

    } catch (err: any) {
      console.error(err);
      alert("Error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp || !rejectionReason.trim()) return;

    // 0. Validate Session
    const adminId = await getVerifiedAdminId();
    if (!adminId) return;

    setActionLoading(true);
    try {
      const { error } = await supabase.from('teacher_applications').update({
        status: 'rejected',
        rejection_reason: rejectionReason,
        reviewed_by: adminId, // Using verified ID
        reviewed_at: new Date().toISOString()
      }).eq('id', selectedApp.id);

      if (error) throw error;

      // Log
      await supabase.from('admin_logs').insert({
        admin_id: adminId,
        action_type: 'reject',
        target_type: 'teacher_application',
        target_id: selectedApp.id,
        details: `Rejected: ${rejectionReason}`
      });

      setApps(prev => prev.filter(a => a.id !== selectedApp.id));
      setSelectedApp(null);
      setRejectModalOpen(false);
      setRejectionReason("");

    } catch (err: any) {
      console.error(err);
      alert("Error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  return (
    <div className="flex h-full bg-page overflow-hidden">
      
      {/* List Sidebar */}
      <div className="w-1/3 min-w-[320px] bg-card border-r border-border flex flex-col">
         <div className="p-6 border-b border-border">
            <h2 className="text-xl font-bold text-txt flex items-center gap-2">
               <UserCheck className="w-6 h-6 text-blue-600" /> Teacher Requests
            </h2>
            <p className="text-xs text-muted mt-1">{apps.length} pending applications</p>
         </div>
         <div className="flex-1 overflow-y-auto">
            {loading ? (
               <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-muted" /></div>
            ) : apps.length === 0 ? (
               <div className="p-8 text-center text-muted">No pending requests</div>
            ) : (
               <div className="divide-y divide-border">
                  {apps.map(app => (
                     <div 
                        key={app.id} 
                        onClick={() => handleSelect(app)}
                        className={`p-4 cursor-pointer hover:bg-page transition-colors ${selectedApp?.id === app.id ? 'bg-blue-50/50 dark:bg-blue-900/20 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}`}
                     >
                        <h3 className="font-bold text-txt text-sm">{app.full_name}</h3>
                        <p className="text-xs text-muted truncate">{app.email}</p>
                        <div className="flex items-center gap-2 mt-2 text-[10px] text-muted font-medium">
                           <span className="bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{app.institution_name}</span>
                           <span>•</span>
                           <span>{new Date(app.created_at).toLocaleDateString()}</span>
                        </div>
                     </div>
                  ))}
               </div>
            )}
         </div>
      </div>

      {/* Detail View */}
      <div className="flex-1 overflow-y-auto bg-page p-8">
         {selectedApp ? (
            <div className="max-w-3xl mx-auto space-y-6">
               
               {/* Header Info */}
               <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                     <div>
                        <h1 className="text-2xl font-bold text-txt">{selectedApp.full_name}</h1>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted">
                           <span className="flex items-center gap-1"><Mail className="w-4 h-4"/> {selectedApp.email}</span>
                           <span className="flex items-center gap-1"><Phone className="w-4 h-4"/> {selectedApp.phone}</span>
                        </div>
                     </div>
                     <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold uppercase border border-yellow-200">
                        Pending Review
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 text-sm">
                     <div>
                        <p className="text-xs text-muted uppercase font-bold mb-1">Institution</p>
                        <div className="flex items-start gap-2">
                           <Building className="w-4 h-4 text-muted mt-0.5" />
                           <div>
                              <p className="font-semibold text-txt">{selectedApp.institution_name}</p>
                              <p className="text-muted text-xs">{selectedApp.institution_address}</p>
                           </div>
                        </div>
                     </div>
                     <div>
                        <p className="text-xs text-muted uppercase font-bold mb-1">Experience</p>
                        <div className="flex items-start gap-2">
                           <Calendar className="w-4 h-4 text-muted mt-0.5" />
                           <div>
                              <p className="font-semibold text-txt">{selectedApp.experience_years} Years</p>
                              <p className="text-muted text-xs">Specialization: {selectedApp.subject_specialization}</p>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Proof Documents */}
               <div className="grid grid-cols-2 gap-6">
                  {/* Photo */}
                  <div className="bg-card p-4 rounded-xl border border-border">
                     <h4 className="font-bold text-sm text-txt mb-3 flex items-center gap-2"><ImageIcon className="w-4 h-4"/> Profile Photo</h4>
                     <div className="aspect-square bg-muted/10 rounded-lg overflow-hidden flex items-center justify-center border border-border group relative">
                        {signedUrls.profile ? (
                           <>
                              <img src={signedUrls.profile} alt="Profile" className="w-full h-full object-cover" />
                              <a href={signedUrls.profile} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-bold">
                                 <Eye className="w-6 h-6" />
                              </a>
                           </>
                        ) : <Loader2 className="animate-spin text-muted" />}
                     </div>
                  </div>
                  
                  {/* ID Card */}
                  <div className="bg-card p-4 rounded-xl border border-border">
                     <h4 className="font-bold text-sm text-txt mb-3 flex items-center gap-2"><FileText className="w-4 h-4"/> ID Card</h4>
                     <div className="aspect-video bg-muted/10 rounded-lg overflow-hidden flex items-center justify-center border border-border group relative">
                        {signedUrls.idcard ? (
                           <>
                              <img src={signedUrls.idcard} alt="ID Card" className="w-full h-full object-contain" />
                              <a href={signedUrls.idcard} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-bold">
                                 <Eye className="w-6 h-6" />
                              </a>
                           </>
                        ) : <Loader2 className="animate-spin text-muted" />}
                     </div>
                  </div>
               </div>

               {/* Video */}
               <div className="bg-card p-6 rounded-xl border border-border">
                  <h4 className="font-bold text-sm text-txt mb-3 flex items-center gap-2"><Video className="w-4 h-4"/> Verification Video</h4>
                  <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                     {signedUrls.video ? (
                        <video controls className="w-full h-full">
                           <source src={signedUrls.video} type="video/mp4" />
                           Your browser does not support the video tag.
                        </video>
                     ) : <Loader2 className="animate-spin text-white" />}
                  </div>
               </div>

               {/* Actions */}
               <div className="flex gap-4 pt-4 border-t border-border">
                  <button 
                     onClick={() => setRejectModalOpen(true)}
                     disabled={actionLoading}
                     className="flex-1 py-3 bg-white dark:bg-zinc-900 border border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                     <XCircle className="w-5 h-5" /> Reject Application
                  </button>
                  <button 
                     onClick={handleApprove}
                     disabled={actionLoading}
                     className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-green-600/20"
                  >
                     {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                     Approve & Create Account
                  </button>
               </div>

            </div>
         ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted opacity-60">
               <AlertTriangle className="w-16 h-16 mb-4" />
               <p className="text-lg font-medium">Select an application to review</p>
            </div>
         )}
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-card w-full max-w-md rounded-2xl p-6 shadow-2xl border border-border">
               <h3 className="text-lg font-bold text-txt mb-2">Reject Application</h3>
               <p className="text-sm text-muted mb-4">Please provide a reason for rejection. This will be sent to the applicant.</p>
               <textarea 
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Reason for rejection (e.g. ID card unclear, video missing audio...)"
                  className="w-full h-32 p-3 rounded-xl bg-input border border-border text-sm outline-none focus:ring-2 focus:ring-red-500 mb-4 resize-none"
               />
               <div className="flex gap-3">
                  <button onClick={() => setRejectModalOpen(false)} className="flex-1 py-2.5 bg-muted/10 text-muted font-bold rounded-lg hover:bg-muted/20">Cancel</button>
                  <button onClick={handleReject} disabled={actionLoading || !rejectionReason.trim()} className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
                     {actionLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Confirm Rejection"}
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Success Modal */}
      {successModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-card w-full max-w-md rounded-2xl p-8 shadow-2xl border border-border text-center">
               <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-green-200">
                  <ShieldCheck className="w-8 h-8" />
               </div>
               <h3 className="text-xl font-bold text-txt mb-2">Teacher Account Created!</h3>
               <p className="text-sm text-muted mb-6">The application has been approved and a new teacher account is active. Share these temporary credentials securely.</p>
               
               <div className="bg-muted/10 rounded-xl p-4 mb-6 border border-border text-left space-y-3">
                  <div>
                     <p className="text-xs text-muted uppercase font-bold mb-1">Email</p>
                     <div className="flex items-center justify-between">
                        <code className="text-sm font-mono text-txt">{createdUserCreds.email}</code>
                        <button onClick={() => copyToClipboard(createdUserCreds.email)} className="text-muted hover:text-brand"><Copy className="w-4 h-4"/></button>
                     </div>
                  </div>
                  <div>
                     <p className="text-xs text-muted uppercase font-bold mb-1">Temporary Password</p>
                     <div className="flex items-center justify-between">
                        <code className="text-sm font-mono text-txt bg-white dark:bg-zinc-800 px-2 py-1 rounded border border-border">{createdUserCreds.password}</code>
                        <button onClick={() => copyToClipboard(createdUserCreds.password)} className="text-muted hover:text-brand"><Copy className="w-4 h-4"/></button>
                     </div>
                  </div>
               </div>

               <button onClick={() => setSuccessModalOpen(false)} className="w-full py-3 bg-brand text-inv font-bold rounded-xl hover:bg-brand-hover shadow-lg shadow-brand/20">
                  Done
               </button>
            </div>
         </div>
      )}

    </div>
  );
};

export default TeacherApprovals;
