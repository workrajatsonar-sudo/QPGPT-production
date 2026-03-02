
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  BookOpen, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  ArrowLeft,
  FileText, 
  Video,
  Image as ImageIcon
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const ApplyTeacher = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    institution_name: '',
    institution_address: '',
    subject_specialization: '',
    experience_years: 0,
  });

  const [files, setFiles] = useState<{
    profile_photo: File | null;
    id_card: File | null;
    verification_video: File | null;
  }>({
    profile_photo: null,
    id_card: null,
    verification_video: null,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof typeof files) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Size checks
      if (field === 'verification_video' && file.size > 20 * 1024 * 1024) { // 20MB limit for video
         alert("Video file is too large. Max 20MB allowed.");
         return;
      }
      if ((field === 'profile_photo' || field === 'id_card') && file.size > 5 * 1024 * 1024) { // 5MB limit for images
         alert("Image file is too large. Max 5MB allowed.");
         return;
      }
      setFiles(prev => ({ ...prev, [field]: file }));
    }
  };

  const uploadFile = async (file: File, applicationId: string, type: 'profile' | 'idcard' | 'video'): Promise<string> => {
    // Sanitize filename
    const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_').toLowerCase();
    const ext = cleanName.split('.').pop();
    // Path Structure: {UUID}/{type}.{ext}
    const path = `${applicationId}/${type}.${ext}`;
    
    const { error: uploadError } = await supabase.storage
      .from('teacher-verification-docs')
      .upload(path, file);

    if (uploadError) {
        console.error(`Upload failed for ${type}:`, uploadError);
        // Add specific message for RLS
        if (uploadError.message.includes("row-level security")) {
            throw new Error(`Permission Denied: Server security policy blocked ${type} upload. Please contact support.`);
        }
        throw new Error(`Failed to upload ${type}: ${uploadError.message}`);
    }
    return path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files.profile_photo || !files.id_card || !files.verification_video) {
      setError("All files (Photo, ID Card, Video) are required for verification.");
      return;
    }

    setLoading(true);
    setError(null);

    // 1. Generate UUID for the application and folder
    const applicationId = crypto.randomUUID();

    try {
      // 2. Upload Files
      const profilePath = await uploadFile(files.profile_photo, applicationId, 'profile');
      const idPath = await uploadFile(files.id_card, applicationId, 'idcard');
      const videoPath = await uploadFile(files.verification_video, applicationId, 'video');

      // 3. Insert Database Record with PATHS
      const { error: insertError } = await supabase
        .from('teacher_applications')
        .insert({
          id: applicationId, // Use the same UUID
          ...formData,
          experience_years: Number(formData.experience_years),
          profile_photo_path: profilePath,
          id_card_path: idPath,
          verification_video_path: videoPath,
          status: 'pending'
        });

      if (insertError) throw insertError;

      setSuccess(true);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Application submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center p-6">
        <div className="bg-card max-w-md w-full p-8 rounded-2xl shadow-xl border border-border text-center animate-in fade-in zoom-in">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-txt mb-2">Application Submitted!</h2>
          <p className="text-muted mb-6">
            Thank you for applying. Our team will review your credentials and verification video. You will receive an email once your account is approved.
          </p>
          <Link to="/" className="inline-block w-full py-3 bg-brand text-inv font-bold rounded-xl hover:bg-brand-hover transition-all">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-10">
           <Link to="/signup" className="inline-flex items-center gap-2 text-sm text-muted hover:text-txt mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Signup
           </Link>
           <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-6 h-6" />
           </div>
           <h1 className="text-3xl font-bold text-txt mb-2">Teacher Verification Program</h1>
           <p className="text-muted">Join QBank Pro as a verified educator to publish content and mentor students.</p>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
           <div className="p-8 border-b border-border bg-muted/5">
              <h3 className="font-bold text-lg text-txt">Application Form</h3>
              <p className="text-sm text-muted">All fields are mandatory for identity verification.</p>
           </div>

           <form onSubmit={handleSubmit} className="p-8 space-y-8">
              {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 border border-red-100">
                   <AlertCircle className="w-5 h-5 flex-shrink-0" />
                   <span className="text-sm font-medium">{error}</span>
                </div>
              )}

              {/* Personal Info */}
              <div className="space-y-4">
                 <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Personal Information</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                       <label className="block text-sm font-medium text-txt mb-1.5">Full Name</label>
                       <input required name="full_name" type="text" value={formData.full_name} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-input border border-border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-txt mb-1.5">Email Address</label>
                       <input required name="email" type="email" value={formData.email} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-input border border-border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-txt mb-1.5">Phone Number</label>
                       <input required name="phone" type="tel" value={formData.phone} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-input border border-border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" />
                    </div>
                 </div>
              </div>

              {/* Professional Info */}
              <div className="space-y-4">
                 <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Professional Profile</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                       <label className="block text-sm font-medium text-txt mb-1.5">Institution Name</label>
                       <input required name="institution_name" type="text" placeholder="School / University / Coaching Center" value={formData.institution_name} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-input border border-border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" />
                    </div>
                    <div className="md:col-span-2">
                       <label className="block text-sm font-medium text-txt mb-1.5">Institution Address</label>
                       <input required name="institution_address" type="text" value={formData.institution_address} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-input border border-border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-txt mb-1.5">Subject Specialization</label>
                       <input required name="subject_specialization" type="text" placeholder="e.g. Physics, Math" value={formData.subject_specialization} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-input border border-border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-txt mb-1.5">Years of Experience</label>
                       <input required name="experience_years" type="number" min="0" value={formData.experience_years} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-input border border-border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" />
                    </div>
                 </div>
              </div>

              {/* Document Uploads */}
              <div className="space-y-6 pt-4 border-t border-border">
                 <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Verification Documents</h4>
                 
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Profile Photo */}
                    <div className="bg-muted/5 p-4 rounded-xl border border-dashed border-border text-center hover:border-purple-500 transition-colors">
                       <input type="file" id="photo-upload" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'profile_photo')} />
                       <label htmlFor="photo-upload" className="cursor-pointer block">
                          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-3 text-purple-600 shadow-sm">
                             <ImageIcon className="w-5 h-5" />
                          </div>
                          <span className="block text-sm font-bold text-txt">Profile Photo</span>
                          <span className="block text-xs text-muted mt-1">
                             {files.profile_photo ? files.profile_photo.name : "Click to upload"}
                          </span>
                       </label>
                    </div>

                    {/* ID Card */}
                    <div className="bg-muted/5 p-4 rounded-xl border border-dashed border-border text-center hover:border-purple-500 transition-colors">
                       <input type="file" id="id-upload" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'id_card')} />
                       <label htmlFor="id-upload" className="cursor-pointer block">
                          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-3 text-purple-600 shadow-sm">
                             <FileText className="w-5 h-5" />
                          </div>
                          <span className="block text-sm font-bold text-txt">Institutional ID</span>
                          <span className="block text-xs text-muted mt-1">
                             {files.id_card ? files.id_card.name : "Click to upload"}
                          </span>
                       </label>
                    </div>

                    {/* Verification Video */}
                    <div className="bg-muted/5 p-4 rounded-xl border border-dashed border-border text-center hover:border-purple-500 transition-colors">
                       <input type="file" id="video-upload" className="hidden" accept="video/*" onChange={(e) => handleFileChange(e, 'verification_video')} />
                       <label htmlFor="video-upload" className="cursor-pointer block">
                          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-3 text-purple-600 shadow-sm">
                             <Video className="w-5 h-5" />
                          </div>
                          <span className="block text-sm font-bold text-txt">10s Video</span>
                          <span className="block text-xs text-muted mt-1">
                             {files.verification_video ? files.verification_video.name : "Intro yourself"}
                          </span>
                       </label>
                    </div>
                 </div>
                 <p className="text-xs text-muted text-center italic">
                    * Upload a short 10-second video introducing yourself and showing your ID card. Max 20MB.
                 </p>
              </div>

              <div className="pt-6">
                 <button type="submit" disabled={loading}
                    className="w-full py-4 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 disabled:opacity-70 disabled:pointer-events-none"
                 >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                    Submit Application
                 </button>
              </div>

           </form>
        </div>
      </div>
    </div>
  );
};

export default ApplyTeacher;
