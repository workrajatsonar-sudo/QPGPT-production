import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Standard, Subject, Medium, Chapter } from '../types';
import ConfirmModal from '../components/ConfirmModal';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Layers, 
  BookOpen, 
  Loader2, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Languages, 
  Bookmark,
  Filter
} from 'lucide-react';

type Tab = 'standards' | 'subjects' | 'mediums' | 'chapters';

interface CategoryData {
  id: string;
  name: string;
  standard_id?: string;
  subject_id?: string;
  standards?: { name: string };
  subjects?: { name: string };
}

const Categories = () => {
  // --- State ---
  const [activeTab, setActiveTab] = useState<Tab>('standards');
  const [data, setData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CategoryData | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    standard_id: '', 
    subject_id: '' 
  });
  const [processing, setProcessing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean, 
    type: 'single' | 'bulk', 
    id?: string 
  }>({
    show: false,
    type: 'single'
  });

  // Metadata for Selectors
  const [standardsList, setStandardsList] = useState<Standard[]>([]);
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);

  // Feedback
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  // --- Effects ---

  useEffect(() => {
    fetchTabData();
    setSelectedIds([]); // Reset selection on tab change
    if (activeTab === 'subjects' || activeTab === 'chapters') {
      fetchStandards();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'chapters' && formData.standard_id) {
      fetchSubjects(formData.standard_id);
    }
  }, [formData.standard_id, activeTab]);

  // --- Data Fetching ---

  const fetchStandards = async () => {
    const { data } = await supabase.from('standards').select('*').order('name');
    if (data) setStandardsList(data);
  };

  const fetchSubjects = async (standardId?: string) => {
    let query = supabase.from('subjects').select('*').order('name');
    if (standardId) query = query.eq('standard_id', standardId);
    const { data } = await query;
    if (data) setSubjectsList(data);
  };

  const fetchTabData = async () => {
    setLoading(true);
    try {
      let query;
      switch (activeTab) {
        case 'standards': query = supabase.from('standards').select('*').order('name'); break;
        case 'mediums': query = supabase.from('mediums').select('*').order('name'); break;
        case 'subjects': query = supabase.from('subjects').select('*, standards(name)').order('name'); break;
        case 'chapters': query = supabase.from('chapters').select('*, standards(name), subjects(name)').order('name'); break;
      }
      
      const { data, error } = await query!;
      if (error) throw error;
      setData(data || []);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- Actions ---

  const handleBulkDeleteTrigger = () => {
    if (!selectedIds.length) {
      showToast("Please select at least one item", 'error');
      return;
    }
    setDeleteConfirm({ show: true, type: 'bulk' });
  };

  const handleBulkDelete = async () => {
    setProcessing(true);
    let successCount = 0;
    let failCount = 0;
    let lastError = "";

    try {
      // We'll process them one by one to ensure we catch specific constraint failures
      for (const id of selectedIds) {
        const { error } = await supabase.from(activeTab).delete().eq('id', id);
        if (error) {
          console.error(`[Categories] Failed to delete ${id}:`, error);
          failCount++;
          lastError = error.details || error.message;
        } else {
          successCount++;
        }
      }

      if (successCount > 0) {
        showToast(`Successfully deleted ${successCount} items`, 'success');
      }
      
      if (failCount > 0) {
        const msg = lastError.includes('is still referenced')
          ? `${failCount} items couldn't be deleted because they are in use by files/papers.`
          : `Failed to delete ${failCount} items. Error: ${lastError}`;
        showToast(msg, 'error');
      }

      setSelectedIds([]);
      fetchTabData();
    } catch (err: any) {
      console.error('[Categories] Critical Bulk delete catch:', err);
      showToast("A critical error occurred during bulk deletion.", 'error');
    } finally {
      setProcessing(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredData.length) setSelectedIds([]);
    else setSelectedIds(filteredData.map(i => i.id));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return showToast("Name is required", 'error');
    setProcessing(true);
    try {
      const payload: any = { name: formData.name };
      if (activeTab === 'subjects' || activeTab === 'chapters') payload.standard_id = formData.standard_id;
      if (activeTab === 'chapters') payload.subject_id = formData.subject_id;

      let result = editingItem 
        ? await supabase.from(activeTab).update(payload).eq('id', editingItem.id)
        : await supabase.from(activeTab).insert(payload);

      if (result.error) throw result.error;

      showToast(`${activeTab.slice(0, -1)} saved successfully!`, 'success');
      closeModal();
      fetchTabData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteTrigger = (id: string) => {
    setDeleteConfirm({ show: true, type: 'single', id });
  };

  const handleDelete = async () => {
    const id = deleteConfirm.id;
    if (deleteConfirm.type === 'single' && !id) return;
    
    if (deleteConfirm.type === 'bulk') {
      await handleBulkDelete();
      return;
    }

    try {
      const { error } = await supabase.from(activeTab).delete().eq('id', id);
      if (error) throw error;
      
      showToast("Item deleted successfully", 'success');
      fetchTabData();
    } catch (err: any) {
      console.error('[Categories] Delete Error:', err);
      const msg = err.details?.includes('is still referenced')
        ? "Cannot delete: This item has files or subjects linked to it."
        : `Delete failed: ${err.message || 'Check database permissions'}`;
      showToast(msg, 'error');
    }
  };

  const openModal = (item?: CategoryData) => {
    if (item) {
      setEditingItem(item);
      setFormData({ name: item.name, standard_id: item.standard_id || '', subject_id: item.subject_id || '' });
      if (activeTab === 'chapters' && item.standard_id) fetchSubjects(item.standard_id);
    } else {
      setEditingItem(null);
      setFormData({ name: '', standard_id: '', subject_id: '' });
      setSubjectsList([]);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filteredData = data.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.standards?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.subjects?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTabLabel = (tab: Tab) => {
    switch(tab) {
      case 'standards': return 'Classes / Standards';
      case 'subjects': return 'Subjects';
      case 'mediums': return 'Mediums';
      case 'chapters': return 'Chapters';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-txt">Category Management</h1>
          <p className="text-muted text-sm">Define the educational hierarchy for the platform.</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <button 
              onClick={handleBulkDeleteTrigger}
              disabled={processing}
              className="bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-2.5 rounded-lg font-bold text-sm hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 animate-in zoom-in"
            >
              <Trash2 className="w-4 h-4" /> Delete selected ({selectedIds.length})
            </button>
          )}
          <button 
            onClick={() => openModal()}
            className="bg-brand text-inv px-5 py-2.5 rounded-lg font-medium hover:bg-brand-hover transition-all flex items-center gap-2 shadow-glass"
          >
            <Plus className="w-5 h-5" /> Add {activeTab.slice(0, -1)}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8 overflow-x-auto" aria-label="Tabs">
          {(['standards', 'subjects', 'mediums', 'chapters'] as Tab[]).map((tab) => {
            const isActive = activeTab === tab;
            let Icon = Layers;
            if (tab === 'subjects') Icon = BookOpen;
            if (tab === 'mediums') Icon = Languages;
            if (tab === 'chapters') Icon = Bookmark;

            return (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSearchQuery(''); }}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
                  ${isActive ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-txt hover:border-border'}
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-brand' : 'text-muted'}`} />
                {getTabLabel(tab)}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 bg-card p-4 rounded-xl border border-border shadow-glass">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input 
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-input border border-border rounded-lg text-txt outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          <Filter className="w-4 h-4" />
          <span>{filteredData.length} items</span>
        </div>
      </div>

      {/* Table Area */}
      <div className="bg-card rounded-xl border border-border shadow-glass overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p className="text-sm">Loading categories...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted">
            <div className="w-16 h-16 bg-page rounded-full flex items-center justify-center mb-4 border border-border">
              <Layers className="w-8 h-8 opacity-20" />
            </div>
            <p className="text-txt font-medium">No items found</p>
            <p className="text-xs mt-1 text-muted">Add a new item to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-page border-b border-border text-muted font-medium">
                <tr>
                  <th className="px-6 py-4 w-12 text-center">
                    <input 
                      type="checkbox" 
                      onChange={toggleSelectAll}
                      checked={selectedIds.length === filteredData.length && filteredData.length > 0}
                      className="rounded border-border text-brand focus:ring-brand bg-input"
                    />
                  </th>
                  <th className="px-6 py-4 w-16">#</th>
                  <th className="px-6 py-4">Name</th>
                  {(activeTab === 'subjects' || activeTab === 'chapters') && <th className="px-6 py-4">Standard</th>}
                  {activeTab === 'chapters' && <th className="px-6 py-4">Subject</th>}
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredData.map((item, idx) => (
                  <tr key={item.id} className={`hover:bg-page transition-colors group ${selectedIds.includes(item.id) ? 'bg-brand/5' : ''}`}>
                    <td className="px-6 py-4 text-center">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="rounded border-border text-brand focus:ring-brand bg-input"
                      />
                    </td>
                    <td className="px-6 py-4 text-muted font-mono text-xs">{idx + 1}</td>
                    <td className="px-6 py-4 font-medium text-txt">{item.name}</td>
                    
                    {(activeTab === 'subjects' || activeTab === 'chapters') && (
                      <td className="px-6 py-4">
                        <span className="bg-brand/10 text-brand px-2 py-1 rounded-md text-xs font-medium border border-brand/20">
                          {item.standards?.name || '-'}
                        </span>
                      </td>
                    )}
                    
                    {activeTab === 'chapters' && (
                      <td className="px-6 py-4">
                        <span className="bg-purple-500/10 text-purple-500 px-2 py-1 rounded-md text-xs font-medium border border-purple-500/20">
                          {item.subjects?.name || '-'}
                        </span>
                      </td>
                    )}

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => openModal(item)}
                          className="p-2 text-muted hover:text-brand hover:bg-brand/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteTrigger(item.id)}
                          className="p-2 text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal & Toast */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-glass border border-border w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-border flex justify-between items-center bg-page">
              <h3 className="font-bold text-lg text-txt">{editingItem ? 'Edit' : 'Add New'} {activeTab.slice(0, -1)}</h3>
              <button onClick={closeModal} className="text-muted hover:text-txt"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-txt mb-1">Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" autoFocus required placeholder={`Enter ${activeTab.slice(0, -1)} name`}
                  className="w-full px-4 py-2 bg-input border border-border rounded-lg text-txt focus:ring-2 focus:ring-brand/20 outline-none"
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              {(activeTab === 'subjects' || activeTab === 'chapters') && (
                <div>
                  <label className="block text-sm font-medium text-txt mb-1">Select Standard <span className="text-red-500">*</span></label>
                  <select
                    required className="w-full px-4 py-2 bg-input border border-border rounded-lg text-txt focus:ring-2 focus:ring-brand/20 outline-none"
                    value={formData.standard_id} onChange={e => {
                      setFormData({...formData, standard_id: e.target.value, subject_id: ''});
                      if (activeTab === 'chapters') fetchSubjects(e.target.value);
                    }}
                  >
                    <option value="">-- Choose Class --</option>
                    {standardsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              {activeTab === 'chapters' && (
                <div>
                  <label className="block text-sm font-medium text-txt mb-1">Select Subject <span className="text-red-500">*</span></label>
                  <select
                    required disabled={!formData.standard_id}
                    className="w-full px-4 py-2 bg-input border border-border rounded-lg text-txt focus:ring-2 focus:ring-brand/20 outline-none disabled:opacity-50"
                    value={formData.subject_id} onChange={e => setFormData({...formData, subject_id: e.target.value})}
                  >
                    <option value="">-- Choose Subject --</option>
                    {subjectsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              <div className="pt-4 flex justify-end gap-3 border-t border-border mt-6">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-muted hover:bg-page rounded-lg font-medium border border-border">Cancel</button>
                <button type="submit" disabled={processing} className="px-6 py-2 bg-brand text-inv rounded-lg font-medium hover:bg-brand-hover transition-colors flex items-center gap-2 shadow-glass">
                  {processing && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-glass flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in border border-border ${
          toast.type === 'success' ? 'bg-card text-txt' : 'bg-red-500 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-brand" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{toast.msg}</span>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      <ConfirmModal 
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ ...deleteConfirm, show: false })}
        onConfirm={handleDelete}
        type="danger"
        title={deleteConfirm.type === 'bulk' ? "Bulk Deletion" : "Confirm Deletion"}
        message={deleteConfirm.type === 'bulk' 
          ? `Are you sure you want to delete ${selectedIds.length} selected items? This will permanently remove them from the ${activeTab} table.`
          : "Are you sure you want to delete this item? This action is permanent and might affect linked data."
        }
        confirmText={deleteConfirm.type === 'bulk' ? `Delete ${selectedIds.length} Items` : "Delete Item"}
      />
    </div>
  );
};

export default Categories;