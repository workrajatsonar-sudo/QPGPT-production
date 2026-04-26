
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
  id: string | number;
  name: string;
  standard_id?: string | number;
  subject_id?: string | number;
  standards?: { name: string };
  subjects?: { name: string };
}

const Categories = () => {
  const [activeTab, setActiveTab] = useState<Tab>('standards');
  const [data, setData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  
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
    id?: string | number 
  }>({ show: false, type: 'single' });

  const [standardsList, setStandardsList] = useState<Standard[]>([]);
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const normalizeIdValue = (value: string) => {
    const trimmed = (value || '').trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) return Number(trimmed);
    return trimmed;
  };

  useEffect(() => {
    fetchTabData();
    setSelectedIds([]);
    if (activeTab === 'subjects' || activeTab === 'chapters') fetchStandards();
  }, [activeTab]);

  const fetchStandards = async () => {
    const { data } = await supabase.from('standards').select('*').order('name');
    if (data) setStandardsList(data);
  };

  const fetchSubjects = async (standardId?: string | number) => {
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

  const handleDelete = async () => {
    setProcessing(true);
    try {
      if (deleteConfirm.type === 'bulk') {
        const { error } = await supabase.from(activeTab).delete().in('id', selectedIds);
        if (error) throw error;
        showToast(`Successfully deleted ${selectedIds.length} items`, 'success');
        setSelectedIds([]);
      } else {
        const { error } = await supabase.from(activeTab).delete().eq('id', deleteConfirm.id);
        if (error) throw error;
        showToast("Item deleted successfully", 'success');
      }
      fetchTabData();
    } catch (err: any) {
      console.error('Delete Error:', err);
      // If SQL fixes weren't applied, this error will explain why
      const msg = err.message.includes('violates foreign key constraint')
        ? "Cannot delete: This item is still linked to files or other data. Please run the SQL fix provided."
        : err.message;
      showToast(msg, 'error');
    } finally {
      setProcessing(false);
      setDeleteConfirm({ ...deleteConfirm, show: false });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return showToast("Name is required", 'error');
    if ((activeTab === 'subjects' || activeTab === 'chapters') && !formData.standard_id) {
      return showToast("Standard is required", 'error');
    }
    if (activeTab === 'chapters' && !formData.subject_id) {
      return showToast("Subject is required", 'error');
    }
    setProcessing(true);
    try {
      const payload: any = { name: formData.name.trim() };
      if (activeTab === 'subjects' || activeTab === 'chapters') payload.standard_id = normalizeIdValue(formData.standard_id);
      if (activeTab === 'chapters') payload.subject_id = normalizeIdValue(formData.subject_id);

      let result = editingItem 
        ? await supabase.from(activeTab).update(payload).eq('id', editingItem.id)
        : await supabase.from(activeTab).insert(payload);

      if (result.error) throw result.error;

      showToast(`${activeTab.slice(0, -1)} saved!`, 'success');
      setIsModalOpen(false);
      fetchTabData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const filteredData = data.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-txt">Categories</h1>
          <p className="text-muted text-sm">Manage the structure of your question bank</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <button onClick={() => setDeleteConfirm({ show: true, type: 'bulk' })} className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Delete ({selectedIds.length})
            </button>
          )}
          <button onClick={() => { setEditingItem(null); setFormData({name:'', standard_id:'', subject_id:''}); setSubjectsList([]); setIsModalOpen(true); }} className="bg-brand text-inv px-5 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm">
            <Plus className="w-5 h-5" /> Add New
          </button>
        </div>
      </div>

      <div className="flex border-b border-border mb-4">
        {(['standards', 'subjects', 'mediums', 'chapters'] as Tab[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 text-sm font-bold capitalize border-b-2 transition-all ${activeTab === tab ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-txt'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-page/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input type="text" placeholder="Search..." className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-page/50 text-muted">
            <tr>
              <th className="p-4 w-10">
                <input type="checkbox" checked={selectedIds.length === filteredData.length && filteredData.length > 0} onChange={() => setSelectedIds(selectedIds.length === filteredData.length ? [] : filteredData.map(i => i.id))} />
              </th>
              <th className="p-4">Name</th>
              {(activeTab === 'subjects' || activeTab === 'chapters') && <th className="p-4">Standard</th>}
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={5} className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td></tr>
            ) : filteredData.map(item => (
              <tr key={item.id} className="hover:bg-page/20 transition-colors">
                <td className="p-4">
                  <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => setSelectedIds(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id])} />
                </td>
                <td className="p-4 font-medium">{item.name}</td>
                {(activeTab === 'subjects' || activeTab === 'chapters') && <td className="p-4 text-muted">{item.standards?.name}</td>}
                <td className="p-4 text-right">
                  <button onClick={() => {
                    setEditingItem(item);
                    const standardId = String(item.standard_id || '');
                    setFormData({name:item.name, standard_id: standardId, subject_id: String(item.subject_id || '')});
                    if (activeTab === 'chapters' && standardId) {
                      fetchSubjects(standardId);
                    }
                    setIsModalOpen(true);
                  }} className="p-2 hover:bg-brand/10 text-brand rounded-lg mr-1"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => setDeleteConfirm({ show: true, type: 'single', id: item.id })} className="p-2 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl w-full max-w-md border border-border shadow-2xl p-6">
            <h3 className="text-xl font-bold mb-4">{editingItem ? 'Edit' : 'Add'} {activeTab}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted mb-1 uppercase">Name</label>
                <input type="text" required className="w-full p-2 bg-input border border-border rounded-lg" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              {(activeTab === 'subjects' || activeTab === 'chapters') && (
                <div>
                  <label className="block text-xs font-bold text-muted mb-1 uppercase">Standard</label>
                  <select required className="w-full p-2 bg-input border border-border rounded-lg" value={formData.standard_id} onChange={e => {
                    const nextStandardId = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      standard_id: nextStandardId,
                      subject_id: activeTab === 'chapters' ? '' : prev.subject_id
                    }));
                    if (activeTab === 'chapters') {
                      if (nextStandardId) {
                        fetchSubjects(nextStandardId);
                      } else {
                        setSubjectsList([]);
                      }
                    }
                  }}>
                    <option value="">Select Standard</option>
                    {standardsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              {activeTab === 'chapters' && (
                <div>
                  <label className="block text-xs font-bold text-muted mb-1 uppercase">Subject</label>
                  <select
                    required
                    className="w-full p-2 bg-input border border-border rounded-lg"
                    value={formData.subject_id}
                    onChange={e => setFormData({...formData, subject_id: e.target.value})}
                    disabled={!formData.standard_id}
                  >
                    <option value="">{formData.standard_id ? 'Select Subject' : 'Select Standard First'}</option>
                    {subjectsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-muted font-bold">Cancel</button>
                <button type="submit" disabled={processing} className="bg-brand text-inv px-6 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2">
                  {processing && <Loader2 className="w-4 h-4 animate-spin" />} Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ ...deleteConfirm, show: false })}
        onConfirm={handleDelete}
        type="danger"
        title="Confirm Deletion"
        message="This will permanently delete the item. If linked files exist, they will be unlinked (set to N/A)."
      />

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-border z-[100] animate-in slide-in-from-right-10 ${toast.type === 'success' ? 'bg-card text-txt' : 'bg-red-600 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-brand" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-bold">{toast.msg}</span>
        </div>
      )}
    </div>
  );
};

export default Categories;
