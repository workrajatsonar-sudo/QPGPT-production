
import React, { useState, useEffect, useRef } from 'react';
import { supabase, downloadFile, getStorageUrl } from '../lib/supabase';
import { 
  Search, FileText, Grid3x3, List, Download, Eye, Trash2, Filter, X, Loader2,
  Clock, Lock, Globe, CheckCircle
} from 'lucide-react';
import { FileRecord } from '../types';

const Questions = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [papers, setPapers] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Basic Filter state simplification for UI cleanliness
  const [filters, setFilters] = useState({ standard: '', subject: '', type: '' });
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Use a ref to track the latest query to prevent race conditions
  const latestQueryRef = useRef(searchQuery);

  useEffect(() => {
    latestQueryRef.current = searchQuery;
    const user = JSON.parse(localStorage.getItem('qb_user') || '{}');
    setIsAdmin(user.role === 'admin');
    setCurrentUserId(user.id || null);

    // Debounce search
    const timer = setTimeout(() => {
      fetchPapers(user.id, searchQuery);
    }, 400);

    return () => clearTimeout(timer);
  }, [filters, searchQuery]);

  const fetchPapers = async (userId?: string, queryText: string = '') => {
    setLoading(true);
    
    let query = supabase.from('files')
      .select('*, standards(name), subjects(name)');
    
    // VISIBILITY RULE: 
    // Show file IF: (Approved AND Public) OR (Uploaded by Current User)
    if (userId) {
       // Using Supabase OR syntax: group1 OR group2
       // group1: and(approval_status.eq.approved,visibility.eq.public)
       // group2: uploaded_by.eq.USER_ID
       query = query.or(`and(approval_status.eq.approved,visibility.eq.public),uploaded_by.eq.${userId}`);
    } else {
       // Guest / Public only
       query = query.eq('approval_status', 'approved').eq('visibility', 'public');
    }
    
    // Apply Text Search (Title OR Description)
    if (queryText) {
        query = query.or(`title.ilike.%${queryText}%,description.ilike.%${queryText}%`);
    }

    // Apply Sidebar Filters
    if (filters.type) query = query.eq('type', filters.type);
    
    // Order by newest first
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    
    if (error) {
        console.error("Error fetching papers:", error);
    }

    // Race condition check: Ensure we only update if this matches the latest query
    if (queryText === latestQueryRef.current) {
        setPapers(data as any[] || []);
        setLoading(false);
    }
  };

  const handleDownload = (path: string) => {
    downloadFile(path);
  };

  const handleView = (path: string) => {
    const url = getStorageUrl(path);
    window.open(url, '_blank');
  };

  const handleDelete = async (e: React.MouseEvent, file: FileRecord) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${file.title}"? This action cannot be undone.`)) return;

    setProcessingId(file.id);

    try {
        // 1. Delete from Storage
        if (file.file_path) {
            const { error: storageError } = await supabase.storage
                .from('question-files')
                .remove([file.file_path]);
            
            if (storageError) {
                console.warn("Storage delete warning:", storageError.message);
            }
        }

        // 2. Delete from Database
        const { error: dbError } = await supabase
            .from('files')
            .delete()
            .eq('id', file.id);

        if (dbError) throw dbError;

        // 3. Log Admin Action
        if (currentUserId) {
            await supabase.from('admin_logs').insert({
                admin_id: currentUserId,
                action_type: 'delete',
                target_type: 'file',
                target_id: file.id,
                details: `Deleted file: ${file.title}`
            });
        }

        // UI Update
        setPapers(prev => prev.filter(p => p.id !== file.id));

    } catch (err: any) {
        console.error(err);
        alert("Failed to delete file: " + err.message);
    } finally {
        setProcessingId(null);
    }
  };

  return (
    <div className="flex h-full flex-col lg:flex-row overflow-hidden relative">
      {/* Mobile Filter Overlay */}
      {showFilters && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setShowFilters(false)}></div>
      )}

      {/* Sidebar Filters */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border p-6 flex flex-col gap-6 
        transform transition-transform duration-300 ease-in-out lg:transform-none
        ${showFilters ? 'translate-x-0' : '-translate-x-full'}
      `}>
         <div className="flex items-center justify-between lg:hidden">
            <h3 className="font-bold text-txt">Filters</h3>
            <button onClick={() => setShowFilters(false)}><X className="w-5 h-5 text-muted" /></button>
         </div>

         <div>
            <h3 className="font-bold text-txt mb-4 flex items-center gap-2 hidden lg:flex">
               <Filter className="w-4 h-4"/> Filters
            </h3>
            <div className="space-y-4">
               <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted uppercase">Type</label>
                  {['practice', 'final', 'mid-term', 'quiz'].map(t => (
                    <label key={t} className="flex items-center gap-2 text-sm text-txt cursor-pointer hover:text-brand transition-colors">
                       <input type="radio" name="type" className="accent-brand" checked={filters.type === t} onChange={() => setFilters({...filters, type: t})} /> 
                       <span className="capitalize">{t}</span>
                    </label>
                  ))}
               </div>
               <button onClick={() => setFilters({standard: '', subject: '', type: ''})} className="text-xs text-brand font-medium hover:underline">
                  Reset All
               </button>
            </div>
         </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-page h-full">
         {/* Toolbar */}
         <div className="p-4 border-b border-border flex flex-wrap gap-4 items-center justify-between bg-header backdrop-blur-sm sticky top-0 z-20">
            <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowFilters(true)}
                  className="lg:hidden p-2 rounded-lg border border-border bg-card text-muted hover:text-txt"
                >
                  <Filter className="w-4 h-4" />
                </button>
                <div className="relative flex-1 min-w-[200px] max-w-md">
                   <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                   <input 
                     type="text" 
                     placeholder="Search papers by title or description..." 
                     value={searchQuery}
                     onChange={e => setSearchQuery(e.target.value)}
                     className="w-full pl-9 pr-4 py-2 bg-input border border-border rounded-lg text-sm focus:ring-2 focus:ring-brand/20 outline-none transition-all"
                   />
                </div>
            </div>
            
            <div className="flex items-center gap-2">
               <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg border ${viewMode === 'grid' ? 'bg-card text-brand border-brand' : 'border-transparent text-muted hover:bg-card'}`}>
                  <Grid3x3 className="w-4 h-4" />
               </button>
               <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg border ${viewMode === 'list' ? 'bg-card text-brand border-brand' : 'border-transparent text-muted hover:bg-card'}`}>
                  <List className="w-4 h-4" />
               </button>
            </div>
         </div>

         {/* Results */}
         <div className="flex-1 overflow-y-auto p-4 lg:p-6">
            {loading ? (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 bg-card rounded-xl border border-border animate-pulse" />)}
               </div>
            ) : papers.length === 0 ? (
               <div className="text-center py-20">
                  <div className="w-16 h-16 bg-muted/10 rounded-full flex items-center justify-center mx-auto mb-4 text-muted">
                     <FileText className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-txt">No papers found</h3>
                  <p className="text-muted">Try adjusting your filters or search query.</p>
               </div>
            ) : (
               <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-3"}>
                  {papers.map(paper => (
                     <div key={paper.id} className={`bg-card border border-glass rounded-xl p-4 hover:border-brand/40 hover:shadow-lg transition-all group ${viewMode === 'list' ? 'flex items-center gap-4' : 'flex flex-col'}`}>
                        {/* File Icon */}
                        <div className={`flex items-center justify-center rounded-lg bg-brand/5 text-brand ${viewMode === 'list' ? 'w-10 h-10 flex-shrink-0' : 'w-12 h-12 mb-4'}`}>
                           <FileText className={viewMode === 'list' ? 'w-5 h-5' : 'w-6 h-6'} />
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center justify-between mb-1">
                                <h4 className="font-bold text-txt truncate" title={paper.title}>{paper.title}</h4>
                                {/* BADGES for Personal Files */}
                                {paper.uploaded_by === currentUserId && (
                                    <div className="flex gap-1 ml-2">
                                        {paper.approval_status === 'pending' && (
                                            <span className="flex items-center gap-1 bg-yellow-100 text-yellow-800 text-[10px] px-1.5 py-0.5 rounded font-bold" title="Waiting for Admin">
                                                <Clock className="w-3 h-3"/> Pending Approval
                                            </span>
                                        )}
                                        {paper.approval_status === 'rejected' && (
                                            <span className="flex items-center gap-1 bg-red-100 text-red-800 text-[10px] px-1.5 py-0.5 rounded font-bold" title="Rejected">
                                                <X className="w-3 h-3"/> Rejected
                                            </span>
                                        )}
                                        {paper.visibility === 'private' && paper.approval_status !== 'rejected' && paper.approval_status !== 'pending' && (
                                            <span className="flex items-center gap-1 bg-gray-100 text-gray-800 text-[10px] px-1.5 py-0.5 rounded font-bold" title="Private File">
                                                <Lock className="w-3 h-3"/> Private
                                            </span>
                                        )}
                                        {paper.approval_status === 'approved' && paper.visibility === 'public' && (
                                             <span className="flex items-center gap-1 bg-green-100 text-green-800 text-[10px] px-1.5 py-0.5 rounded font-bold" title="Public in Question Bank">
                                                <Globe className="w-3 h-3"/> Published
                                            </span>
                                        )}
                                    </div>
                                )}
                           </div>
                           <div className="flex items-center gap-2 mt-1 text-xs text-muted">
                              {paper.standards?.name && (
                                <span className="px-1.5 py-0.5 rounded bg-muted/10 border border-border">{paper.standards.name}</span>
                              )}
                              {paper.subjects?.name && (
                                <span className="truncate">• {paper.subjects.name}</span>
                              )}
                           </div>
                        </div>

                        {/* Actions */}
                        <div className={`flex items-center gap-2 ${viewMode === 'grid' ? 'mt-4 pt-4 border-t border-border w-full justify-between' : 'flex-shrink-0 ml-4'}`}>
                           <span className="text-xs text-muted font-medium">{paper.download_count} DLs</span>
                           <div className="flex gap-2">
                              <button 
                                onClick={() => handleView(paper.file_path)}
                                className="p-1.5 hover:bg-brand/10 hover:text-brand rounded text-muted transition-colors" 
                                title="View PDF"
                              >
                                 <Eye className="w-4 h-4" />
                              </button>
                              
                              <button 
                                onClick={() => handleDownload(paper.file_path)}
                                className="p-1.5 hover:bg-brand hover:text-white rounded text-muted transition-colors" 
                                title="Download"
                              >
                                 <Download className="w-4 h-4" />
                              </button>

                              {(isAdmin || paper.uploaded_by === currentUserId) && (
                                <button 
                                    onClick={(e) => handleDelete(e, paper)}
                                    disabled={processingId === paper.id}
                                    className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded text-muted transition-colors disabled:opacity-50"
                                    title="Delete File"
                                >
                                    {processingId === paper.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Trash2 className="w-4 h-4" />}
                                </button>
                              )}
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default Questions;
