
import React, { useState, useEffect } from 'react';
import ConfirmModal from '../components/ConfirmModal';
import { supabase, getStorageUrl, downloadFile } from '../lib/supabase';
import { FileRecord } from '../types';
import { 
  CheckCircle, 
  XCircle, 
  Shield, 
  User, 
  Calendar, 
  AlertTriangle,
  Download,
  Filter,
  FileText,
  Wand2,
  Upload,
  Loader2,
  Globe,
  ExternalLink
} from 'lucide-react';

// Unified type for display - mapping FileRecord to simplified view
type ApprovalItem = {
  id: string;
  title: string;
  description?: string;
  author: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
  standard?: string;
  subject?: string;
  file_path: string;
  feedback?: string;
  source?: 'upload' | 'generator';
  raw: FileRecord;
};

const Approvals = () => {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Action State
  const [feedback, setFeedback] = useState('');
  const [processing, setProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    show: boolean,
    type: 'approve' | 'reject' | null
  }>({ show: false, type: null });

  useEffect(() => {
    fetchData();
    
    // Mark as seen logic when viewing pending
    if (filterStatus === 'pending') {
      markAsSeen();
    }
  }, [filterStatus]);

  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const selectedItem = items.find(i => i.id === selectedId);

  // Generate Signed URL when selection changes
  useEffect(() => {
    const generatePreview = async () => {
        if (!selectedItem) {
            setPreviewUrl(null);
            return;
        }
        setPreviewError(false);
        try {
            // Remove bucket name if present in path to avoid duplication
            let cleanPath = selectedItem.file_path.replace(/^question-files\//, '');
            
            // 1. Try to create a Signed URL (Works for Private & Public buckets)
            // Valid for 1 hour (3600 seconds)
            const { data, error } = await supabase.storage
                .from('question-files')
                .createSignedUrl(cleanPath, 3600);

            if (error || !data?.signedUrl) {
                console.warn("Signed URL generation failed, falling back to public URL", error);
                // Fallback to Public URL logic
                setPreviewUrl(getStorageUrl(selectedItem.file_path));
            } else {
                setPreviewUrl(data.signedUrl);
            }
        } catch (e) {
            console.error("Preview generation error:", e);
            setPreviewError(true);
        }
    };

    generatePreview();
  }, [selectedId]); // Run when ID changes

  const markAsSeen = async () => {
    try {
      await supabase
        .from('files')
        .update({ is_seen: true, seen_at: new Date().toISOString() })
        .eq('approval_status', 'pending')
        .eq('is_seen', false);
    } catch (e) {
      console.error("Failed to mark requests as seen", e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fix: Explicitly declare the foreign key for users (uploaded_by) to prevent PostgREST ambiguity errors
      const { data: files, error } = await supabase
        .from('files')
        .select(`*, author_data:users!uploaded_by(full_name), standards(name), subjects(name)`)
        .eq('approval_status', filterStatus)
        .order('created_at', { ascending: false });

      if (error) {
         console.error("Fetch Data Error:", error);
         throw error;
      }

      const mappedFiles: ApprovalItem[] = (files || []).map((f: any) => {
        const isGenerated = f.source === 'generator' || (f.description && f.description.includes('[AI Generated]'));
        
        return {
          id: f.id,
          title: f.title,
          description: f.description,
          author: f.author_data?.full_name || f.users?.full_name || 'Unknown',
          date: f.created_at,
          status: f.approval_status,
          standard: f.standards?.name,
          subject: f.subjects?.name,
          file_path: f.file_path,
          feedback: f.admin_feedback,
          source: isGenerated ? 'generator' : 'upload',
          raw: f
        };
      });

      setItems(mappedFiles);
    } catch (err: any) {
      console.error(err);
      if (err?.message?.includes('ambiguous') || err?.code === 'PGRST201') {
          alert("Database Join Error: Supabase requires disambiguation. The fallback has been applied.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleActionTrigger = (action: 'approve' | 'reject') => {
    if (!selectedId) return;
    if (action === 'reject' && !feedback.trim()) {
      alert("Please provide a reason for rejection.");
      return;
    }
    setConfirmAction({ show: true, type: action });
  };

  const handleAction = async () => {
    const action = confirmAction.type;
    if (!action || !selectedId) return;
    const item = items.find(i => i.id === selectedId);
    if (!item) return;

    setProcessing(true);
    try {
      const userStr = localStorage.getItem('qb_user');
      const adminId = userStr ? JSON.parse(userStr).id : null;

      if (action === 'approve') {
          // APPROVE & PUBLISH FLOW
          // 1. Update File Status to Approved + Public
          const { error: updateError } = await supabase
            .from('files')
            .update({
                approval_status: 'approved',
                visibility: 'public', // Auto-publish on approval to the "Bank"
                approved_by: adminId,
                approved_at: new Date().toISOString(),
                admin_feedback: feedback || null // Optional feedback on approval
            })
            .eq('id', selectedId);

          if (updateError) throw updateError;

          // 2. Notify Uploader
          if (item.raw.uploaded_by) {
             await supabase.from('notifications').insert({
                 user_id: item.raw.uploaded_by,
                 title: 'Content Approved',
                 message: `Your submission "${item.title}" has been approved and is now public in the Question Bank.`,
                 type: 'success',
                 link: '/questions'
             });
          }

      } else {
          // REJECTION FLOW
          const { error: updateError } = await supabase
            .from('files')
            .update({
                approval_status: 'rejected',
                admin_feedback: feedback, // Mandatory feedback
                visibility: 'private' // Keep private
            })
            .eq('id', selectedId);
            
          if (updateError) throw updateError;
          
          if (item.raw.uploaded_by) {
             await supabase.from('notifications').insert({
                 user_id: item.raw.uploaded_by,
                 title: 'Submission Returned',
                 message: `Your submission "${item.title}" was returned. Reason: ${feedback}`,
                 type: 'error',
                 link: '/upload'
             });
          }
      }

      // 3. Admin Log
      if (adminId) {
        await supabase.from('admin_logs').insert({
          admin_id: adminId,
          action_type: action,
          target_type: 'file',
          target_id: selectedId,
          details: feedback || (action === 'approve' ? 'Approved & Published' : 'Rejected')
        });
      }

      // UI Update
      setItems(prev => prev.filter(i => i.id !== selectedId));
      setSelectedId(null);
      setFeedback('');
      setConfirmAction({ show: false, type: null });

    } catch (err: any) {
      console.error(err);
      alert("Action failed: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex h-full bg-page overflow-hidden transition-colors duration-300">
      
      <ConfirmModal
        isOpen={confirmAction.show}
        onClose={() => setConfirmAction({ show: false, type: null })}
        onConfirm={handleAction}
        title={`Confirm ${confirmAction.type === 'approve' ? 'Approval' : 'Rejection'}`}
        message={`Are you sure you want to ${confirmAction.type} this submission? ${confirmAction.type === 'reject' ? 'The user will be notified of your feedback.' : ''}`}
        confirmText={confirmAction.type === 'approve' ? 'Approve' : 'Reject'}
        type={confirmAction.type === 'approve' ? 'success' : 'danger'}
      />

      {/* LEFT PANE: List View */}
      <div className="w-1/3 min-w-[320px] max-w-md border-r border-border bg-card flex flex-col h-full">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2 text-accent-text mb-1">
             <Shield className="w-5 h-5" />
             <h1 className="font-bold text-xl text-txt">Approvals</h1>
          </div>
          <p className="text-xs text-muted">Review pending submissions</p>
          
          {/* Tabs */}
          <div className="flex bg-page p-1 rounded-lg mt-4 border border-border">
            {(['pending', 'approved', 'rejected'] as const).map(status => (
              <button
                key={status}
                onClick={() => { setFilterStatus(status); setSelectedId(null); }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                  filterStatus === status 
                    ? 'bg-card text-txt shadow-sm border border-border' 
                    : 'text-muted hover:text-txt'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
             <div className="p-6 text-center text-muted text-sm flex flex-col items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading requests...
             </div>
          ) : items.length === 0 ? (
             <div className="p-8 text-center">
                <div className="w-12 h-12 bg-page rounded-full flex items-center justify-center mx-auto mb-3 border border-border">
                  <CheckCircle className="w-6 h-6 text-muted" />
                </div>
                <p className="text-muted text-sm">No {filterStatus} items found.</p>
             </div>
          ) : (
             <div className="divide-y divide-border">
               {items.map(item => (
                 <div 
                   key={item.id}
                   onClick={() => setSelectedId(item.id)}
                   className={`p-4 cursor-pointer transition-colors hover:bg-page ${selectedId === item.id ? 'bg-accent/10 border-l-4 border-accent-text' : 'border-l-4 border-transparent'}`}
                 >
                    <div className="flex justify-between items-start mb-1">
                       <span className={`text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 ${item.source === 'generator' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                         {item.source === 'generator' ? <Wand2 className="w-3 h-3" /> : <Upload className="w-3 h-3" />}
                         {item.source === 'generator' ? 'GENERATED' : 'UPLOAD'}
                       </span>
                       <span className="text-[10px] text-muted">{new Date(item.date).toLocaleDateString()}</span>
                    </div>
                    <h3 className="font-semibold text-txt text-sm line-clamp-1 mb-1">{item.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted">
                       <User className="w-3 h-3" />
                       <span>{item.author}</span>
                       <span>•</span>
                       <span>{item.standard || 'Gen'}</span>
                    </div>
                 </div>
               ))}
             </div>
          )}
        </div>
      </div>

      {/* RIGHT PANE: Detail View */}
      <div className="flex-1 bg-page h-full flex flex-col overflow-hidden">
        {selectedItem ? (
          <>
            {/* Detail Header */}
            <div className="bg-card px-8 py-6 border-b border-border flex justify-between items-start shadow-sm">
              <div>
                 <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-txt">{selectedItem.title}</h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide
                      ${selectedItem.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        selectedItem.status === 'approved' ? 'bg-green-100 text-green-800' : 
                        'bg-red-100 text-red-800'}`
                    }>
                      {selectedItem.status}
                    </span>
                 </div>
                 <div className="flex items-center gap-4 text-sm text-muted">
                    <span className="flex items-center gap-1"><User className="w-4 h-4" /> {selectedItem.author}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(selectedItem.date).toLocaleString()}</span>
                    {selectedItem.subject && <span className="bg-accent text-accent-text px-2 rounded">{selectedItem.subject}</span>}
                 </div>
              </div>
            </div>

            {/* Detail Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-8">
               <div className="max-w-4xl mx-auto space-y-6">
                 
                 {/* Metadata Card */}
                 <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                    <h3 className="font-semibold text-txt mb-4 border-b border-border pb-2">Details</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                       <div>
                         <span className="block text-muted text-xs uppercase tracking-wider mb-1">Standard</span>
                         <span className="font-medium text-txt">{selectedItem.standard || 'N/A'}</span>
                       </div>
                       <div>
                         <span className="block text-muted text-xs uppercase tracking-wider mb-1">Subject</span>
                         <span className="font-medium text-txt">{selectedItem.subject || 'N/A'}</span>
                       </div>
                       <div>
                         <span className="block text-muted text-xs uppercase tracking-wider mb-1">Origin</span>
                         <span className="font-medium text-txt capitalize">{selectedItem.source || 'Upload'}</span>
                       </div>
                       <div>
                         <span className="block text-muted text-xs uppercase tracking-wider mb-1">Description</span>
                         <span className="font-medium text-txt truncate">{selectedItem.description || '-'}</span>
                       </div>
                    </div>
                 </div>

                 {/* Content Preview */}
                 <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-border bg-page/50 flex justify-between items-center">
                       <h3 className="font-semibold text-txt">Content Preview</h3>
                       <div className="flex gap-3">
                           {previewUrl && (
                                <a 
                                    href={previewUrl} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-xs flex items-center gap-1 text-brand font-medium hover:underline"
                                >
                                    <ExternalLink className="w-3 h-3" /> Open in New Tab
                                </a>
                           )}
                           <button 
                             onClick={() => downloadFile(selectedItem.file_path)}
                             className="text-xs flex items-center gap-1 text-accent-text font-medium hover:underline bg-transparent border-none cursor-pointer"
                           >
                             <Download className="w-3 h-3" /> Download Original
                           </button>
                       </div>
                    </div>
                    
                    {previewError ? (
                        <div className="p-12 bg-red-50 flex flex-col items-center justify-center min-h-[300px] text-red-600">
                            <AlertTriangle className="w-12 h-12 mb-2" />
                            <p className="font-bold">Preview Unavailable</p>
                            <p className="text-sm mt-1">The file could not be loaded. Please try downloading it directly.</p>
                        </div>
                    ) : (selectedItem.raw.file_type === 'pdf' || selectedItem.file_path.endsWith('.pdf')) && previewUrl ? (
                         <div className="bg-muted/5 h-[600px] w-full relative">
                            <iframe 
                                src={`${previewUrl}#toolbar=0`}
                                className="w-full h-full border-none"
                                title="Document Preview"
                                onError={() => setPreviewError(true)}
                            />
                         </div>
                    ) : (
                        <div className="p-12 bg-muted/5 flex flex-col items-center justify-center min-h-[300px] text-muted">
                            <FileText className="w-16 h-16 mb-4 opacity-50" />
                            <p className="text-lg">Preview not available for this file type.</p>
                            <p className="text-sm mt-2">Please download the file to review its contents.</p>
                            <button 
                              onClick={() => downloadFile(selectedItem.file_path)}
                              className="mt-6 px-4 py-2 bg-accent text-accent-text rounded-lg text-sm font-bold shadow-sm hover:opacity-90"
                            >
                                Download & View
                            </button>
                        </div>
                    )}
                 </div>

                 {selectedItem.feedback && (
                   <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex gap-3">
                      <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-orange-800 text-sm">Previous Admin Feedback</h4>
                        <p className="text-orange-700 text-sm mt-1">{selectedItem.feedback}</p>
                      </div>
                   </div>
                 )}

               </div>
            </div>

            {/* Action Footer (Only for Pending) */}
            {selectedItem.status === 'pending' && (
              <div className="bg-card border-t border-border p-6 shadow-lg z-10">
                 <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-4 items-start">
                    <div className="flex-1 w-full">
                       <label className="block text-xs font-semibold text-muted mb-1 uppercase tracking-wider">Review Notes</label>
                       <textarea
                         value={feedback}
                         onChange={(e) => setFeedback(e.target.value)}
                         placeholder="Add comments (optional for approval, required for rejection)..."
                         className="w-full text-sm border border-border rounded-lg p-3 focus:ring-2 focus:ring-accent-text outline-none resize-none h-20 bg-page text-txt"
                       />
                       <p className="text-[10px] text-muted mt-2 flex items-center gap-1">
                          <Globe className="w-3 h-3"/> Approving will publish this paper to the global repository.
                       </p>
                    </div>
                    <div className="flex gap-3 pt-6">
                       <button
                         onClick={() => handleActionTrigger('reject')}
                         disabled={processing}
                         className="px-6 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 font-semibold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                       >
                         {processing ? <Loader2 className="w-4 h-4 animate-spin"/> : <XCircle className="w-4 h-4" />} 
                         Reject
                       </button>
                       <button
                         onClick={() => handleActionTrigger('approve')}
                         disabled={processing}
                         className="px-6 py-2.5 bg-green-600 text-white hover:bg-green-700 font-semibold rounded-lg shadow-lg shadow-green-200 transition-all flex items-center gap-2 disabled:opacity-50"
                       >
                         {processing ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle className="w-4 h-4" />} 
                         Approve & Publish
                       </button>
                    </div>
                 </div>
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-muted p-8">
             <div className="w-24 h-24 bg-card rounded-full flex items-center justify-center mb-6 border border-border">
                <Filter className="w-10 h-10 opacity-30" />
             </div>
             <h3 className="text-lg font-semibold text-txt mb-2">Select an item to review</h3>
             <p className="text-sm max-w-xs text-center">Choose a pending request from the list on the left to view details and take action.</p>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-glass flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in border border-border ${
          toast.type === 'success' ? 'bg-card text-txt' : 'bg-red-500 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-brand" /> : <XCircle className="w-5 h-5" />}
          <span className="font-medium">{toast.msg}</span>
        </div>
      )}
    </div>
  );
};

export default Approvals;
