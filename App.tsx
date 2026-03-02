
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Questions from './pages/Questions';
import Dashboard from './pages/Dashboard';
import Generator from './pages/Generator';
import UploadPage from './pages/Upload';
import Categories from './pages/Categories';
import Approvals from './pages/Approvals';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Help from './pages/Help';
import Contact from './pages/Contact';
import Auth from './pages/Auth';
import Signup from './pages/Signup';
import ApplyTeacher from './pages/ApplyTeacher'; // New Import
import TeacherApprovals from './pages/TeacherApprovals'; // New Import
import Landing from './pages/Landing';
import QPGPT from './pages/QPGPT';
import QuizGame from './pages/QuizGame';
import { UserProfile } from './types';
import { supabase } from './lib/supabase';

const App = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // 1. Auth Check
    const checkUser = () => {
      const storedUser = localStorage.getItem('qb_user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.role) {
            parsed.role = parsed.role.toLowerCase();
          }
          setUser(parsed);
        } catch (e) {
          console.error("Failed to parse user session", e);
          localStorage.removeItem('qb_user');
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    // 2. Theme Sync
    const applyTheme = async () => {
      try {
        const { data } = await supabase.from('app_settings').select('theme').single();
        if (data && data.theme) {
          document.documentElement.setAttribute('data-theme', data.theme);
        } else {
          document.documentElement.setAttribute('data-theme', 'white');
        }
      } catch (e) {
        document.documentElement.setAttribute('data-theme', 'white');
      }
    };

    checkUser();
    applyTheme();

    window.addEventListener('auth-change', checkUser);
    window.addEventListener('theme-change', applyTheme);
    
    return () => {
      window.removeEventListener('auth-change', checkUser);
      window.removeEventListener('theme-change', applyTheme);
    };
  }, []);

  if (loading) return null;

  // Protected Layout
  const MainLayout = () => {
    if (!user) return <Navigate to="/login" />;
    return (
      <div className="flex min-h-screen bg-page text-txt font-sans transition-colors duration-300">
        <Sidebar 
          user={user} 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
        />
        <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
           <TopBar 
             user={user} 
             toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
           />
           <main className="flex-1 overflow-x-hidden">
             <div className="max-w-[1920px] mx-auto w-full h-full">
               <Outlet />
             </div>
           </main>
        </div>
      </div>
    );
  };

  return (
    <HashRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={!user ? <Landing /> : <Navigate to={`/dashboard/${user.role}`} replace />} />
        <Route path="/login" element={!user ? <Auth /> : <Navigate to={`/dashboard/${user.role}`} replace />} />
        
        {/* Signup Routes */}
        <Route path="/signup" element={!user ? <Signup /> : <Navigate to={`/dashboard/${user.role}`} replace />} />
        <Route path="/signup/student" element={!user ? <Signup /> : <Navigate to={`/dashboard/${user.role}`} replace />} />
        <Route path="/apply-teacher" element={!user ? <ApplyTeacher /> : <Navigate to={`/dashboard/${user.role}`} replace />} />
        
        {/* Main App Routes (Protected) */}
        <Route element={<MainLayout />}>
           <Route path="/dashboard" element={
              user ? <Navigate to={`/dashboard/${user.role}`} replace /> : <Navigate to="/login" />
           } />

           <Route path="/dashboard/admin" element={
              user?.role === 'admin' ? <Dashboard userRole="admin" /> : <Navigate to={`/dashboard/${user?.role || 'student'}`} />
           } />
           <Route path="/dashboard/teacher" element={
              user?.role === 'teacher' || user?.role === 'admin' ? <Dashboard userRole="teacher" /> : <Navigate to="/dashboard/student" />
           } />
           <Route path="/dashboard/student" element={
              <Dashboard userRole="student" />
           } />

           <Route path="/questions" element={<Questions />} />
           <Route path="/search" element={<Navigate to="/questions" />} />
           <Route path="/qpgpt" element={<QPGPT />} />
           <Route path="/quiz-game" element={<QuizGame />} />
           <Route path="/help" element={<Help />} />
           <Route path="/contact" element={<Contact />} />
           
           <Route path="/upload" element={<UploadPage />} />
           <Route path="/generate" element={<Generator />} />

           <Route path="/categories" element={
              user?.role === 'admin' ? <Categories /> : <Navigate to={`/dashboard/${user?.role}`} />
           } />
           <Route path="/approvals" element={
              user?.role === 'admin' ? <Approvals /> : <Navigate to={`/dashboard/${user?.role}`} />
           } />
           {/* New Admin Route */}
           <Route path="/admin/teacher-approvals" element={
              user?.role === 'admin' ? <TeacherApprovals /> : <Navigate to={`/dashboard/${user?.role}`} />
           } />
           <Route path="/users" element={
              user?.role === 'admin' ? <Users /> : <Navigate to={`/dashboard/${user?.role}`} />
           } />
           <Route path="/settings" element={
              user?.role === 'admin' ? <Settings /> : <Navigate to={`/dashboard/${user?.role}`} />
           } />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
