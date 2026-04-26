
import React, { useState, useEffect } from 'react';
import ConfirmModal from '../components/ConfirmModal';
import { supabase } from '../lib/supabase';
import { getCachedProfile } from '../lib/auth';
import { UserProfile, Role } from '../types';
import { 
  Users as UsersIcon, 
  Search, 
  UserPlus, 
  MoreVertical, 
  Shield, 
  User, 
  GraduationCap, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Trash2,
  Edit2,
  Lock,
  Mail,
  Filter,
  Ban
} from 'lucide-react';

const Users = () => {
  // --- State ---
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  
  // Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    password: '', // Only for creation or reset
    role: 'student' as Role,
    grade_year: '',
    course_stream: '',
    status: 'active' as 'active' | 'disabled'
  });
  
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

  // --- Effects ---
  useEffect(() => {
    // Get current admin user for logging/safety checks
    setCurrentUser(getCachedProfile());
    fetchUsers();
  }, []);

  // --- Data Fetching ---
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      showToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- Actions ---

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email || !formData.username) {
      return showToast("Name, Email and Username are required", 'error');
    }
    
    if (modalMode === 'create' && (!formData.password || formData.password.length < 6)) {
      return showToast("Password must be at least 6 characters", 'error');
    }

    setProcessing(true);
    try {
      // 1. Check Uniqueness (Frontend Check for UX, DB has constraints too)
      if (modalMode === 'create') {
        const exists = users.find(u => u.email === formData.email || u.username === formData.username);
        if (exists) throw new Error("User with this email or username already exists");
      }

      // 2. Prepare Payload
      const payload: any = {
        full_name: formData.full_name,
        username: formData.username,
        email: formData.email,
        role: formData.role,
        grade_year: formData.grade_year,
        course_stream: formData.course_stream,
        status: formData.status
      };

      // 3. Handle Password (Plain Text)
      if (formData.password) {
        payload.password = formData.password;
      }

      // 4. DB Operation
      let result;
      if (modalMode === 'create') {
        result = await supabase.from('users').insert(payload).select().single();
      } else if (editingUser) {
        result = await supabase.from('users').update(payload).eq('id', editingUser.id).select().single();
      }

      if (result?.error) throw result.error;

      // 5. Logging
      if (currentUser) {
        await supabase.from('admin_logs').insert({
          admin_id: currentUser.id,
          action_type: modalMode === 'create' ? 'create' : 'modify',
          target_type: 'user',
          target_id: result?.data?.id || editingUser?.id,
          details: `${modalMode === 'create' ? 'Created' : 'Updated'} user: ${formData.username} (${formData.role})`
        });
      }

      showToast(`User ${modalMode === 'create' ? 'created' : 'updated'} successfully`, 'success');
      closeModal();
      fetchUsers();

    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    if (userToDelete.id === currentUser?.id) return showToast("You cannot delete your own account", 'error');

    try {
      const { error } = await supabase.from('users').delete().eq('id', userToDelete.id);
      if (error) throw error;

      await supabase.from('admin_logs').insert({
        admin_id: currentUser?.id,
        action_type: 'reject',
        target_type: 'user',
        target_id: userToDelete.id,
        details: `Deleted user: ${userToDelete.username}`
      });

      showToast("User deleted successfully", 'success');
      fetchUsers();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setUserToDelete(null);
    }
  };

  const handleToggleStatus = async (user: UserProfile) => {
    if (user.id === currentUser?.id) return showToast("You cannot disable your own account", 'error');
    
    const newStatus = user.status === 'active' ? 'disabled' : 'active';
    try {
      const { error } = await supabase.from('users').update({ status: newStatus }).eq('id', user.id);
      if (error) throw error;

      await supabase.from('admin_logs').insert({
        admin_id: currentUser?.id,
        action_type: 'modify',
        target_type: 'user',
        target_id: user.id,
        details: `${newStatus === 'active' ? 'Activated' : 'Disabled'} user: ${user.username}`
      });

      showToast(`User ${newStatus}`, 'success');
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
    } catch (err) {
      showToast("Failed to update status", 'error');
    }
  };

  // --- Modal Helpers ---
  const openCreateModal = () => {
    setModalMode('create');
    setEditingUser(null);
    setFormData({
      full_name: '', username: '', email: '', password: '', role: 'student', 
      grade_year: '', course_stream: '', status: 'active'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user: UserProfile) => {
    setModalMode('edit');
    setEditingUser(user);
    setFormData({
      full_name: user.full_name,
      username: user.username || '',
      email: user.email,
      password: '', // Leave empty to keep existing
      role: user.role,
      grade_year: user.grade_year || '',
      course_stream: user.course_stream || '',
      status: user.status || 'active'
    });
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- Filtering ---
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || (user.status || 'active') === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UsersIcon className="w-6 h-6 text-blue-600" /> User Management
          </h1>
          <p className="text-gray-500 text-sm">Manage access, roles, and user accounts.</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-all flex items-center gap-2 shadow-sm"
        >
          <UserPlus className="w-5 h-5" /> Add User
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-xl border border-border shadow-glass">
          <p className="text-xs font-semibold text-muted uppercase">Total Users</p>
          <p className="text-2xl font-bold text-txt">{users.length}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-glass">
          <p className="text-xs font-semibold text-muted uppercase">Students</p>
          <p className="text-2xl font-bold text-brand">{users.filter(u => u.role === 'student').length}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-glass">
          <p className="text-xs font-semibold text-muted uppercase">Teachers</p>
          <p className="text-2xl font-bold text-purple-500">{users.filter(u => u.role === 'teacher').length}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-glass">
          <p className="text-xs font-semibold text-muted uppercase">Admins</p>
          <p className="text-2xl font-bold text-orange-500">{users.filter(u => u.role === 'admin').length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-glass flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input 
            type="text"
            placeholder="Search by name, email, or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg text-txt outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <div className="flex gap-2">
           <select 
             className="px-3 py-2 bg-input border border-border rounded-lg text-sm text-txt outline-none focus:ring-2 focus:ring-brand/20"
             value={roleFilter}
             onChange={(e) => setRoleFilter(e.target.value as any)}
           >
             <option value="all">All Roles</option>
             <option value="student">Student</option>
             <option value="teacher">Teacher</option>
             <option value="admin">Admin</option>
           </select>
           <select 
             className="px-3 py-2 bg-input border border-border rounded-lg text-sm text-txt outline-none focus:ring-2 focus:ring-brand/20"
             value={statusFilter}
             onChange={(e) => setStatusFilter(e.target.value as any)}
           >
             <option value="all">All Status</option>
             <option value="active">Active</option>
             <option value="disabled">Disabled</option>
           </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card rounded-xl border border-border shadow-glass overflow-hidden min-h-[400px]">
        {loading ? (
           <div className="flex flex-col items-center justify-center h-64 text-muted">
             <Loader2 className="w-8 h-8 animate-spin mb-2" />
             <p>Loading users...</p>
           </div>
        ) : filteredUsers.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-64 text-muted">
             <div className="w-16 h-16 bg-page rounded-full flex items-center justify-center mb-4 border border-border">
               <UsersIcon className="w-8 h-8 opacity-20" />
             </div>
             <p className="text-txt font-medium">No users found</p>
           </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-page border-b border-border text-muted font-medium uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Details</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-page transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold border border-brand/20">
                           {user.full_name?.[0]?.toUpperCase() || 'U'}
                         </div>
                         <div>
                           <div className="font-semibold text-txt">{user.full_name}</div>
                           <div className="text-xs text-muted">@{user.username || 'unknown'}</div>
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${
                        user.role === 'admin' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                        user.role === 'teacher' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                        'bg-brand/10 text-brand border-brand/20'
                      }`}>
                         {user.role === 'admin' ? <Shield className="w-3 h-3" /> : 
                          user.role === 'teacher' ? <GraduationCap className="w-3 h-3" /> : 
                          <User className="w-3 h-3" />}
                         {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-txt">{user.email}</span>
                        <span className="text-xs">
                          {user.grade_year ? `${user.grade_year}` : 'No grade'} 
                          {user.course_stream ? ` • ${user.course_stream}` : ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${
                        user.status === 'disabled' ? 'bg-page text-muted border-border' : 'bg-green-500/10 text-green-500 border-green-500/20'
                      }`}>
                         {user.status === 'disabled' ? <XCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                         {user.status === 'disabled' ? 'Disabled' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => openEditModal(user)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit User"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          
                          {user.id !== currentUser?.id && (
                            <>
                               <button 
                                onClick={() => handleToggleStatus(user)}
                                className={`p-2 rounded-lg transition-colors ${
                                  user.status === 'disabled' 
                                    ? 'text-gray-400 hover:text-green-600 hover:bg-green-50' 
                                    : 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'
                                }`}
                                title={user.status === 'disabled' ? 'Enable Account' : 'Disable Account'}
                              >
                                {user.status === 'disabled' ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                              </button>
                              
                              <button 
                                  onClick={() => setUserToDelete(user)}
                                  className="p-1 px-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-1.5"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span className="text-xs font-medium">Delete</span>
                                </button>
                            </>
                          )}
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- CREATE / EDIT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-card rounded-2xl shadow-glass border border-border w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="p-6 border-b border-border flex justify-between items-center bg-page">
               <div>
                 <h3 className="font-bold text-lg text-txt">{modalMode === 'create' ? 'Create New User' : 'Edit User Details'}</h3>
                 <p className="text-sm text-muted">
                   {modalMode === 'create' ? 'Add a new user to the system.' : `Updating ${editingUser?.username}`}
                 </p>
               </div>
               <button onClick={closeModal} className="text-muted hover:text-txt"><XCircle className="w-6 h-6" /></button>
             </div>

             <form onSubmit={handleSave} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   
                   {/* Personal Info */}
                   <div className="space-y-4">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 border-b pb-1">Personal Info</h4>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                        <input 
                          type="text" required
                          value={formData.full_name}
                          onChange={e => setFormData({...formData, full_name: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                        <input 
                          type="email" required
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                       <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                        <input 
                          type="text" required
                          value={formData.username}
                          onChange={e => setFormData({...formData, username: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                   </div>

                   {/* Security & Role */}
                   <div className="space-y-4">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 border-b pb-1">Role & Security</h4>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <select 
                          value={formData.role}
                          onChange={e => setFormData({...formData, role: e.target.value as Role})}
                          disabled={editingUser?.id === currentUser?.id} // Prevent changing own role
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                          <option value="student">Student</option>
                          <option value="teacher">Teacher</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select 
                          value={formData.status}
                          onChange={e => setFormData({...formData, status: e.target.value as any})}
                          disabled={editingUser?.id === currentUser?.id}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                          <option value="active">Active</option>
                          <option value="disabled">Disabled</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {modalMode === 'create' ? 'Password *' : 'New Password (Optional)'}
                        </label>
                        <div className="relative">
                           <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                           <input 
                              type="password"
                              value={formData.password}
                              onChange={e => setFormData({...formData, password: e.target.value})}
                              placeholder={modalMode === 'create' ? "••••••" : "Leave blank to keep current"}
                              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                      </div>
                   </div>

                   {/* Academic Info (Full width) */}
                   <div className="md:col-span-2 space-y-4">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 border-b pb-1">Academic Profile (Optional)</h4>
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Grade / Class</label>
                            <input 
                              type="text"
                              value={formData.grade_year}
                              onChange={e => setFormData({...formData, grade_year: e.target.value})}
                              placeholder="e.g. Class 10"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                         </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Course Stream</label>
                            <input 
                              type="text"
                              value={formData.course_stream}
                              onChange={e => setFormData({...formData, course_stream: e.target.value})}
                              placeholder="e.g. Science"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                         </div>
                      </div>
                   </div>
                </div>

                <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
                   <button 
                     type="button"
                     onClick={closeModal}
                     className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                   >
                     Cancel
                   </button>
                   <button 
                     type="submit"
                     disabled={processing}
                     className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
                   >
                     {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                     {modalMode === 'create' ? 'Create User' : 'Save Changes'}
                   </button>
                </div>
             </form>
           </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-glass flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in border border-border ${
          toast.type === 'success' ? 'bg-card text-txt' : 'bg-red-500 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-brand" /> : <XCircle className="w-5 h-5" />}
          <span className="font-medium">{toast.msg}</span>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      <ConfirmModal 
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleDelete}
        type="danger"
        title="Confirm User Deletion"
        message={`Are you sure you want to delete ${userToDelete?.full_name}? This will permanently remove their access to the platform and cannot be undone.`}
        confirmText="Yes, Delete User"
        cancelText="Cancel"
      />

    </div>
  );
};

export default Users;
