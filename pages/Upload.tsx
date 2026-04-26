
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getCachedProfile } from '../lib/auth';
import { Standard, Subject, Medium, Chapter, AppSettings, UserProfile } from '../types';
import { Upload as UploadIcon, FileText, X, Loader2, CheckCircle, AlertTriangle, Shield, Eye, EyeOff, FolderTree } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UploadPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Metadata State
  const [standards, setStandards] = useState<Standard[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [mediums, setMediums] = useState<Medium[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  
  // Selection State for dependent dropdowns
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    standard_id: '',
    subject_id: '',
    chapter_id: '',
    medium_id: '',
    year: new Date().getFullYear(),
    type: 'practice',
    visibility: 'public',
    file_type: 'pdf'
  });

  useEffect(() => {
    // 1. Auth & Role Check
    const parsedUser = getCachedProfile();
    if (!parsedUser) {
      navigate('/login');
      return;
    }
    setUser(parsedUser);

    if (parsedUser.role === 'student') {
      alert("Students are not authorized to upload files.");
      navigate('/dashboard/student');
      return;
    }

    // 2. Fetch Initial Data
    const fetchData = async () => {
      const [std, med, set] = await Promise.all([
         supabase.from('standards').select('*').order('name'),
         supabase.from('mediums').select('*').order('name'),
         supabase.from('app_settings').select('*').single()
      ]);
      
      if (std.data) setStandards(std.data);
      if (med.data) setMediums(med.data);
      if (set.data) setSettings(set.data);
    };
    fetchData();
  }, [navigate]);

  // Fetch Subjects when Standard changes
  useEffect(() => {
    if (!formData.standard_id) {
      setSubjects([]);
      return;
    }
    const fetchSubjects = async () => {
      const { data } = await supabase
        .from('subjects')
        .select('*')
        .eq('standard_id', formData.standard_id)
        .order('name');
      setSubjects(data || []);
      // Reset subject and chapter if standard changes
      setFormData(prev => ({ ...prev, subject_id: '', chapter_id: '' }));
    };
    fetchSubjects();
  }, [formData.standard_id]);

  // Fetch Chapters when Subject changes
  useEffect(() => {
    if (!formData.subject_id) {
      setChapters([]);
      return;
    }
    const fetchChapters = async () => {
      const { data } = await supabase
        .from('chapters')
        .select('*')
        .eq('subject_id', formData.subject_id)
        .order('name');
      setChapters(data || []);
      setFormData(prev => ({ ...prev, chapter_id: '' }));
    };
    fetchChapters();
  }, [formData.subject_id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      
      // Settings Validation
      if (settings) {
          // Size Check
          const sizeMB = file.size / 1024 / 1024;
          if (settings.max_pdf_size_mb && sizeMB > settings.max_pdf_size_mb) {
             alert(`File is too large. Max allowed size is ${settings.max_pdf_size_mb} MB.`);
             return;
          }
          
          // Type Check
          const allowed = settings.allowed_file_types || ['pdf', 'docx'];
          if (!allowed.includes(ext)) {
              alert(`File type .${ext} is not allowed. Supported types: ${allowed.join(', ')}`);
              return;
          }
      }
      
      setSelectedFile(file);
      // Auto detect file type for dropdown
      if (['pdf', 'docx', 'xlsx', 'zip', 'txt', 'jpg'].includes(ext)) {
          setFormData(prev => ({ ...prev, file_type: ext }));
      }
      // Auto-fill title if empty
      if (!formData.title) {
         setFormData(prev => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, "") }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !user) return;
    
    setLoading(true);
    let uploadedPath = '';

    try {
      const isAdmin = user.role === 'admin';

      // 1. Upload file to 'question-files' Storage
      const fileExt = selectedFile.name.split('.').pop();
      // Naming convention: uploaded/{timestamp}_{random}.{ext}
      const randomString = Math.random().toString(36).substring(2, 10);
      const fileName = `${Date.now()}_${randomString}.${fileExt}`;
      uploadedPath = `uploaded/${fileName}`; 

      const { error: uploadError } = await supabase.storage
        .from('question-files')
        .upload(uploadedPath, selectedFile);

      if (uploadError) {
        if (uploadError.message.includes("row-level security")) {
           throw new Error("Storage upload failed: RLS Policy Error. Please run the updated schema.sql in your Supabase SQL Editor to enable storage uploads.");
        }
        throw new Error("Storage upload failed: " + uploadError.message);
      }

      // 2. Determine Status & Visibility
      // Admin: Can choose, defaults to approved/public
      // Teacher: Forced to pending/private
      const finalStatus = isAdmin ? 'approved' : 'pending';
      const finalVisibility = isAdmin ? formData.visibility : 'private';

      // 3. Insert metadata into Database
      const { error: dbError } = await supabase.from('files').insert({
        title: formData.title,
        description: formData.description,
        file_path: uploadedPath,
        file_type: formData.file_type,
        size_kb: Math.round(selectedFile.size / 1024),
        uploaded_by: user.id,
        
        // Metadata
        standard_id: formData.standard_id || null,
        subject_id: formData.subject_id || null,
        chapter_id: formData.chapter_id || null,
        medium_id: formData.medium_id || null,
        year: formData.year ? parseInt(formData.year.toString()) : null,
        type: formData.type,
        
        // Access Control
        visibility: finalVisibility, 
        approval_status: finalStatus
      });

      if (dbError) {
        // ROLLBACK: Delete the file we just uploaded
        await supabase.storage.from('question-files').remove([uploadedPath]);
        throw dbError;
      }

      // 4. Notify Admins (if not uploaded by Admin)
      if (!isAdmin) {
          const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin');
          if (admins && admins.length > 0) {
              const notifications = admins.map(admin => ({
                  user_id: admin.id,
                  title: 'New Content Approval',
                  message: `${user.full_name} uploaded "${formData.title}" for ${formData.type}.`,
                  type: 'info',
                  link: '/approvals'
              }));
              await supabase.from('notifications').insert(notifications);
          }
      }

      // Success
      const successMessage = isAdmin 
        ? "File uploaded and published successfully!" 
        : "File uploaded! It is now pending admin approval.";
      
      alert(successMessage);
      navigate('/dashboard/' + user.role);

    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to upload file");
      
      // Double check cleanup if something crashed before DB insert but after upload
      if (uploadedPath && err.message.includes("Database")) {
         await supabase.storage.from('question-files').remove([uploadedPath]);
      }
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="p-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-txt flex items-center gap-2">
            <UploadIcon className="w-6 h-6 text-brand" /> Upload Resources
          </h1>
          <p className="text-muted mt-1">Add new study materials to the Question Bank.</p>
        </div>
        {isAdmin && (
           <div className="px-3 py-1 bg-brand/10 text-brand rounded-full text-xs font-bold flex items-center gap-2 border border-brand/20">
              <Shield className="w-3 h-3" /> Admin Mode
           </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: File Upload */}
        <div className="lg:col-span-1 space-y-6">
           <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${selectedFile ? 'border-brand bg-brand/5' : 'border-border hover:border-brand/50 hover:bg-card'}`}>
              <input 
                type="file" 
                id="file-upload" 
                className="hidden" 
                onChange={handleFileChange} 
                accept={settings?.allowed_file_types?.map(t => `.${t}`).join(',') || ".pdf,.docx"} 
              />
              
              {selectedFile ? (
                <div className="relative">
                   <div className="w-16 h-16 bg-white rounded-xl shadow-sm mx-auto mb-3 flex items-center justify-center text-brand">
                      <FileText className="w-8 h-8" />
                   </div>
                   <p className="font-bold text-txt text-sm truncate px-2">{selectedFile.name}</p>
                   <p className="text-xs text-muted mb-4">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                   <button 
                     type="button" 
                     onClick={() => setSelectedFile(null)}
                     className="text-xs text-red-500 hover:underline font-medium"
                   >
                     Remove File
                   </button>
                </div>
              ) : (
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center py-8">
                   <div className="p-4 bg-page rounded-full mb-4">
                     <UploadIcon className="w-8 h-8 text-muted" />
                   </div>
                   <span className="text-brand font-bold text-sm">Click to upload</span>
                   <span className="text-xs text-muted mt-1 max-w-[200px]">
                      {settings ? settings.allowed_file_types?.join(', ').toUpperCase() : 'PDF, DOCX'} up to {settings?.max_pdf_size_mb || 50}MB
                   </span>
                </label>
              )}
           </div>

           {/* Guidelines */}
           <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <h3 className="font-bold text-txt text-sm mb-3 flex items-center gap-2">
                 <AlertTriangle className="w-4 h-4 text-orange-500" /> Upload Rules
              </h3>
              <ul className="text-xs text-muted space-y-2 list-disc pl-4">
                 <li>Ensure files are clear and legible.</li>
                 <li>Correctly tag the Standard and Subject.</li>
                 <li>Do not upload copyrighted material.</li>
                 {!isAdmin && <li>Your file will be <b>private</b> until approved by an admin.</li>}
              </ul>
           </div>
        </div>

        {/* Right Col: Metadata Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 bg-card rounded-xl border border-border shadow-sm p-6 space-y-6">
           <div className="space-y-4">
              <h3 className="font-bold text-txt text-sm uppercase tracking-wide border-b border-border pb-2 flex items-center gap-2">
                 <FileText className="w-4 h-4" /> File Details
              </h3>
              
              <div>
                 <label className="block text-sm font-medium text-txt mb-1.5">Title <span className="text-red-500">*</span></label>
                 <input 
                    type="text" required
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="e.g. Class 10 Science Mid-Term Paper 2024"
                    className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
                 />
              </div>

              <div>
                 <label className="block text-sm font-medium text-txt mb-1.5">Description</label>
                 <textarea 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Provide a brief summary of the content..."
                    rows={3}
                    className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all resize-none"
                 />
              </div>
           </div>

           <div className="space-y-4">
              <h3 className="font-bold text-txt text-sm uppercase tracking-wide border-b border-border pb-2 flex items-center gap-2 mt-2">
                 <FolderTree className="w-4 h-4" /> Taxonomy & Categorization
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-semibold text-muted mb-1.5 uppercase">Medium <span className="text-red-500">*</span></label>
                    <select 
                       required
                       value={formData.medium_id}
                       onChange={e => setFormData({...formData, medium_id: e.target.value})}
                       className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-brand/20 outline-none"
                    >
                       <option value="">Select Medium</option>
                       {mediums.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                 </div>

                 <div>
                    <label className="block text-xs font-semibold text-muted mb-1.5 uppercase">Standard <span className="text-red-500">*</span></label>
                    <select 
                       required
                       value={formData.standard_id}
                       onChange={e => setFormData({...formData, standard_id: e.target.value})}
                       className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-brand/20 outline-none"
                    >
                       <option value="">Select Standard</option>
                       {standards.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                 </div>

                 <div>
                    <label className="block text-xs font-semibold text-muted mb-1.5 uppercase">Subject <span className="text-red-500">*</span></label>
                    <select 
                       required
                       disabled={!formData.standard_id}
                       value={formData.subject_id}
                       onChange={e => setFormData({...formData, subject_id: e.target.value})}
                       className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-brand/20 outline-none disabled:opacity-50"
                    >
                       <option value="">{formData.standard_id ? 'Select Subject' : 'Select Standard First'}</option>
                       {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                 </div>

                 <div>
                    <label className="block text-xs font-semibold text-muted mb-1.5 uppercase">Chapter (Optional)</label>
                    <select 
                       disabled={!formData.subject_id}
                       value={formData.chapter_id}
                       onChange={e => setFormData({...formData, chapter_id: e.target.value})}
                       className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-brand/20 outline-none disabled:opacity-50"
                    >
                       <option value="">{formData.subject_id ? 'Select Chapter' : 'Select Subject First'}</option>
                       {chapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                 </div>

                 <div>
                    <label className="block text-xs font-semibold text-muted mb-1.5 uppercase">Exam Type <span className="text-red-500">*</span></label>
                    <select 
                       required
                       value={formData.type}
                       onChange={e => setFormData({...formData, type: e.target.value})}
                       className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-brand/20 outline-none"
                    >
                       <option value="practice">Practice Paper</option>
                       <option value="mid-term">Mid-Term Exam</option>
                       <option value="final">Final Exam</option>
                       <option value="quiz">Quiz / Worksheet</option>
                       <option value="other">Other</option>
                    </select>
                 </div>

                 <div>
                    <label className="block text-xs font-semibold text-muted mb-1.5 uppercase">Academic Year</label>
                    <input 
                       type="number"
                       min="2000" max="2100"
                       value={formData.year}
                       onChange={e => setFormData({...formData, year: parseInt(e.target.value)})}
                       className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-brand/20 outline-none"
                    />
                 </div>
              </div>
           </div>

           {/* Access Control - Only for Admin */}
           {isAdmin ? (
               <div className="p-4 bg-muted/5 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                     <label className="text-sm font-bold text-txt flex items-center gap-2">
                        {formData.visibility === 'public' ? <Eye className="w-4 h-4"/> : <EyeOff className="w-4 h-4"/>}
                        Visibility
                     </label>
                     <select 
                        value={formData.visibility}
                        onChange={e => setFormData({...formData, visibility: e.target.value})}
                        className="text-xs bg-input border border-border rounded px-2 py-1 outline-none"
                     >
                        <option value="public">Public (Visible to All)</option>
                        <option value="private">Private (Hidden)</option>
                        <option value="teacher">Teachers Only</option>
                     </select>
                  </div>
                  <p className="text-xs text-muted">
                     As an admin, you can publish this file immediately. {formData.visibility === 'public' ? 'Users will be able to see this file instantly.' : 'This file will be hidden from students.'}
                  </p>
               </div>
           ) : (
               <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100 flex gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div className="text-xs text-blue-800">
                     <p className="font-semibold">Approval Required</p>
                     <p>Since you are a teacher, this upload will be marked as <b>pending</b> and <b>private</b> until an administrator reviews and approves it.</p>
                  </div>
               </div>
           )}

           <div className="pt-4 flex justify-end gap-3">
              <button 
                 type="button"
                 onClick={() => navigate(-1)}
                 className="px-5 py-2.5 text-muted hover:text-txt font-medium transition-colors"
              >
                 Cancel
              </button>
              <button 
                 type="submit"
                 disabled={loading || !selectedFile}
                 className="px-6 py-2.5 bg-brand text-inv rounded-lg font-bold shadow-lg shadow-brand/20 hover:bg-brand-hover hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
              >
                 {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadIcon className="w-5 h-5" />}
                 {loading ? 'Uploading...' : 'Upload File'}
              </button>
           </div>
        </form>
      </div>
    </div>
  );
};

export default UploadPage;
