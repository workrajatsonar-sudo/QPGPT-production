import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Standard, Subject, Medium, Chapter } from '../types';
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
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CategoryData | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    standard_id: '', 
    subject_id: '' 
  });
  const [processing, setProcessing] = useState(false);

  // Metadata for Selectors
  const [standardsList, setStandardsList] = useState<Standard[]>([]);
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);

  // Feedback
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  // --- Effects ---

  useEffect(() => {
    fetchTabData();
    // Fetch metadata needed for dropdowns
    if (activeTab === 'subjects' || activeTab === 'chapters') {
      fetchStandards();
    }
  }, [activeTab]);

  // When standard changes in form, fetch related subjects (for chapters tab)
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
        case 'standards':
          query = supabase.from('standards').select('*').order('name');
          break;
        case 'mediums':
          query = supabase.from('mediums').select('*').order('name');
          break;
        case 'subjects':
          query = supabase.from('subjects').select('*, standards(name)').order('name');
          break;
        case 'chapters':
          query = supabase.from('chapters').select('*, standards(name), subjects(name)').order('name');
          break;
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return showToast("Name is required", 'error');
    if ((activeTab === 'subjects' || activeTab === 'chapters') && !formData.standard_id) return showToast("Standard is required", 'error');
    if (activeTab === 'chapters' && !formData.subject_id) return showToast("Subject is required", 'error');

    setProcessing(true);
    try {
      const userStr = localStorage.getItem('qb_user');
      const adminId = userStr ? JSON.parse(userStr).id : null;

      const payload: any = { name: formData.name };
      if (activeTab === 'subjects' || activeTab === 'chapters') payload.standard_id = formData.standard_id;
      if (activeTab === 'chapters') payload.subject_id = formData.subject_id;

      let result;
      let actionType = '';

      if (editingItem) {
        // Update
        result = await supabase.from(activeTab).update(payload).eq('id', editingItem.id);
        actionType = 'update';
      } else {
        // Create
        result = await supabase.from(activeTab).insert(payload);
        actionType = 'create';
      }

      if (result.error) throw result.error;

      // Log Action
      if (adminId) {
        await supabase.from('admin_logs').insert({
          admin_id: adminId,
          action_type: editingItem ? 'modify' : 'create',
          target_type: activeTab.slice(0, -1), // standard, subject etc.
          target_id: editingItem ? editingItem.id : 'new', // UUID not avail for new insert without select return
          details: `Category: ${activeTab} | Name: ${formData.name}`
        });
      }

      showToast(`${activeTab.slice(0, -1)} saved successfully!`, 'success');
      closeModal();
      fetchTabData();

    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This might affect linked content.")) return;
    
    try {
      const userStr = localStorage.getItem('qb_user');
      const adminId = userStr ? JSON.parse(userStr).id : null;

      const { error } = await supabase.from(activeTab).delete().eq('id', id);
      if (error) throw error;

      // Log
      if (adminId) {
        await supabase.from('admin_logs').insert({
          admin_id: adminId,
          action_type: 'reject', // Using reject as delete metaphor based on existing types or extend types
          target_type: activeTab.slice(0, -1),
          target_id: id,
          details: `Deleted from ${activeTab}`
        });
      }

      showToast("Item deleted successfully", 'success');
      fetchTabData();
    } catch (err: any) {
      showToast("Delete failed. Item might be in use.", 'error');
    }
  };

  const openModal = (item?: CategoryData) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        standard_id: item.standard_id || '',
        subject_id: item.subject_id || ''
      });
      // If editing chapter, fetch subjects for the existing standard
      if (activeTab === 'chapters' && item.standard_id) {
        fetchSubjects(item.standard_id);
      }
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

  // --- Filtering ---
  const filteredData = data.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.standards?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.subjects?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- Render Helpers ---

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
          <h1 className="text-2xl font-bold text-gray-900">Category Management</h1>
          <p className="text-gray-500 text-sm">Define the educational hierarchy for the platform.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-all flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-5 h-5" /> Add {activeTab.slice(0, -1)}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
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
                  ${isActive ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
                {getTabLabel(tab)}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Filter className="w-4 h-4" />
          <span>{filteredData.length} items</span>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p className="text-sm">Loading categories...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Layers className="w-8 h-8 opacity-20" />
            </div>
            <p className="text-gray-600 font-medium">No items found</p>
            <p className="text-xs mt-1">Add a new item to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-medium">
                <tr>
                  <th className="px-6 py-4 w-16">#</th>
                  <th className="px-6 py-4">Name</th>
                  {/* Dynamic Columns based on Tab */}
                  {(activeTab === 'subjects' || activeTab === 'chapters') && <th className="px-6 py-4">Standard</th>}
                  {activeTab === 'chapters' && <th className="px-6 py-4">Subject</th>}
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredData.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50 group transition-colors">
                    <td className="px-6 py-4 text-gray-400 font-mono text-xs">{idx + 1}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                    
                    {(activeTab === 'subjects' || activeTab === 'chapters') && (
                      <td className="px-6 py-4 text-gray-600">
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-medium border border-blue-100">
                          {item.standards?.name || '-'}
                        </span>
                      </td>
                    )}
                    
                    {activeTab === 'chapters' && (
                      <td className="px-6 py-4 text-gray-600">
                        <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-md text-xs font-medium border border-purple-100">
                          {item.subjects?.name || '-'}
                        </span>
                      </td>
                    )}

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => openModal(item)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

      {/* --- ADD / EDIT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900">
                {editingItem ? 'Edit' : 'Add New'} {activeTab.slice(0, -1)}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              
              {/* Common Field: Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  autoFocus
                  required
                  placeholder={`Enter ${activeTab.slice(0, -1)} name`}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              {/* Conditional Fields: Standard Selector */}
              {(activeTab === 'subjects' || activeTab === 'chapters') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Standard <span className="text-red-500">*</span></label>
                  <select
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    value={formData.standard_id}
                    onChange={e => {
                      setFormData({...formData, standard_id: e.target.value, subject_id: ''}); // Reset subject on std change
                      if (activeTab === 'chapters') fetchSubjects(e.target.value);
                    }}
                  >
                    <option value="">-- Choose Class --</option>
                    {standardsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              {/* Conditional Fields: Subject Selector */}
              {activeTab === 'chapters' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Subject <span className="text-red-500">*</span></label>
                  <select
                    required
                    disabled={!formData.standard_id}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100 disabled:text-gray-400"
                    value={formData.subject_id}
                    onChange={e => setFormData({...formData, subject_id: e.target.value})}
                  >
                    <option value="">{formData.standard_id ? '-- Choose Subject --' : 'Select Standard First'}</option>
                    {subjectsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={processing}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in ${
          toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{toast.msg}</span>
        </div>
      )}

    </div>
  );
};

export default Categories;