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
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Auth from './pages/Auth';
import AuthCallback from './pages/AuthCallback';
import Signup from './pages/Signup';
import ApplyTeacher from './pages/ApplyTeacher'; // New Import
import TeacherApprovals from './pages/TeacherApprovals'; // New Import
import Landing from './pages/Landing';
import QPGPT from './pages/QPGPT';
import QuizGame from './pages/QuizGame';
import { UserProfile, AppSettings } from './types';
import { supabase } from './lib/supabase';

const App = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const isOAuthCallbackPath = window.location.pathname === '/auth-callback';
  const isOAuthReturn =
    window.location.pathname === '/auth-callback' ||
    window.location.search.includes('code=') ||
    window.location.hash.includes('access_token=');

  const setLocalSessionUser = (profile: any, tokenPrefix: 'mock_token' | 'oauth_token' = 'oauth_token') => {
    const safeUser = { ...profile, password: '' };
    localStorage.setItem('qb_user', JSON.stringify(safeUser));
    localStorage.setItem('qb_session_token', `${tokenPrefix}_${Date.now()}`);
    setUser({ ...safeUser, role: safeUser.role?.toLowerCase() });
    setLoading(false);
    return safeUser;
  };

  const clearLocalSessionUser = () => {
    localStorage.removeItem('qb_user');
    localStorage.removeItem('qb_session_token');
    setUser(null);
  };

  const findUserByEmail = async (email?: string | null) => {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) return null;

    const { data: exactProfile } = await supabase
      .from('users')
      .select('*')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (exactProfile) return exactProfile;

    const { data: possibleProfiles } = await supabase
      .from('users')
      .select('*')
      .ilike('email', `%${normalizedEmail}%`)
      .limit(10);

    return (possibleProfiles || []).find(
      (profile: any) => profile.email?.trim().toLowerCase() === normalizedEmail
    ) || null;
  };

  useEffect(() => {
    if (isOAuthCallbackPath) {
      const applyThemeOnly = async () => {
        try {
          const { data } = await supabase.from('app_settings').select('theme').maybeSingle();
          const rawTheme = (data?.theme || 'white').toLowerCase();
          const themeMap: Record<string, string> = {
              'dark': 'black',
              'night': 'black',
              'light': 'white',
              'default': 'white',
              'space': 'space'
          };
          document.documentElement.setAttribute('data-theme', themeMap[rawTheme] || rawTheme);
        } catch (e) {
          document.documentElement.setAttribute('data-theme', 'white');
        }
      };

      applyThemeOnly();
      return;
    }

    // 1. Set up Supabase Auth Listener FIRST (before anything else)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Supabase auth event:', event, session?.user?.email);
      if (event === 'SIGNED_IN' && session?.user) {
        // Fetch user profile from database
        const profile = await findUserByEmail(session.user.email);

        if (profile) {
          setLocalSessionUser(profile, 'oauth_token');
          window.dispatchEvent(new Event('auth-change'));
        } else {
          await supabase.auth.signOut();
          clearLocalSessionUser();
          window.dispatchEvent(new Event('auth-change'));
        }
      } else if (event === 'SIGNED_OUT') {
        const sessionToken = localStorage.getItem('qb_session_token') || '';
        if (sessionToken.startsWith('oauth_token_')) {
          clearLocalSessionUser();
        }
        window.dispatchEvent(new Event('auth-change'));
      }
    });

    // 2. Auth Check
    const checkUser = async () => {
      // First check localStorage
      const storedUser = localStorage.getItem('qb_user');
      const sessionToken = localStorage.getItem('qb_session_token') || '';

      if (storedUser && !isOAuthReturn) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.role) {
            parsed.role = parsed.role.toLowerCase();
          }
          setUser(parsed);
          setLoading(false);
          return;
        } catch (e) {
          console.error("Failed to parse user session", e);
          localStorage.removeItem('qb_user');
        }
      }

      if (isOAuthReturn) {
        const currentUrl = new URL(window.location.href);
        const searchParams = currentUrl.searchParams;
        const hashParams = new URLSearchParams(currentUrl.hash.replace(/^#/, ''));
        const authCode = searchParams.get('code');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (authCode) {
          const { error } = await supabase.auth.exchangeCodeForSession(authCode);
          if (error) {
            console.warn('OAuth code exchange warning:', error.message);
          }
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            console.warn('OAuth token restore warning:', error.message);
          }
        }

        const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        let authUser: any = null;

        for (let attempt = 0; attempt < 5; attempt++) {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user) {
            authUser = sessionData.session.user;
            break;
          }
          await wait(300);
        }

        if (!authUser) {
          const { data: userData } = await supabase.auth.getUser();
          authUser = userData?.user || null;
        }

        if (authUser) {
          const profile = await findUserByEmail(authUser.email);
          if (profile) {
            setLocalSessionUser(profile, 'oauth_token');
            window.location.replace(`${window.location.origin}/#/dashboard/${profile.role || 'student'}`);
            return;
          }

          await supabase.auth.signOut();
          clearLocalSessionUser();
          window.location.replace(`${window.location.origin}/#/signup`);
          return;
        }

        await supabase.auth.signOut().catch(() => undefined);
      }

      if (storedUser && sessionToken.startsWith('mock_token_')) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.role) {
            parsed.role = parsed.role.toLowerCase();
          }
          setUser(parsed);
          setLoading(false);
          return;
        } catch (e) {
          console.error("Failed to parse manual user session", e);
          clearLocalSessionUser();
        }
      }

      setUser(null);
      setLoading(false);
    };

    // 3. Theme Sync
    const applyTheme = async () => {
      try {
        const { data } = await supabase.from('app_settings').select('theme').maybeSingle();
        const rawTheme = (data?.theme || 'white').toLowerCase();
        
        // Map common names to actual theme IDs
        const themeMap: Record<string, string> = {
            'dark': 'black',
            'night': 'black',
            'light': 'white',
            'default': 'white',
            'space': 'space'
        };

        const finalTheme = themeMap[rawTheme] || rawTheme;
        document.documentElement.setAttribute('data-theme', finalTheme);
        
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
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (loading && !isOAuthCallbackPath) return null;

  // Supabase OAuth redirects back to a pathname like /auth-callback.
  // Since the app uses HashRouter, handle that page before routing so
  // the callback is not mistaken for the landing page.
  if (isOAuthCallbackPath) {
    return <AuthCallback />;
  }

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
        <Route path="/" element={!user ? <Landing /> : <Navigate to={`/dashboard/${user.role || 'student'}`} replace />} />
        <Route path="/login" element={!user ? <Auth /> : <Navigate to={`/dashboard/${user.role || 'student'}`} replace />} />
        <Route path="/auth-callback" element={<AuthCallback />} />
        
        {/* Signup Routes */}
        <Route path="/signup" element={!user ? <Signup /> : <Navigate to={`/dashboard/${user.role || 'student'}`} replace />} />
        <Route path="/signup/student" element={!user ? <Signup /> : <Navigate to={`/dashboard/${user.role || 'student'}`} replace />} />
        <Route path="/apply-teacher" element={!user ? <ApplyTeacher /> : <Navigate to={`/dashboard/${user.role || 'student'}`} replace />} />
        
        {/* Main App Routes (Protected) */}
        <Route element={<MainLayout />}>
           <Route path="/dashboard" element={
              user ? <Navigate to={`/dashboard/${user.role || 'student'}`} replace /> : <Navigate to="/login" />
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
           <Route path="/privacy" element={<Privacy />} />
           <Route path="/terms" element={<Terms />} />

           <Route path="/upload" element={<UploadPage />} />
           <Route path="/generate" element={<Generator />} />

           <Route path="/categories" element={
              user?.role === 'admin' ? <Categories /> : <Navigate to={`/dashboard/${user?.role || 'student'}`} />
           } />
           <Route path="/approvals" element={
              user?.role === 'admin' ? <Approvals /> : <Navigate to={`/dashboard/${user?.role || 'student'}`} />
           } />
           {/* New Admin Route */}
           <Route path="/admin/teacher-approvals" element={
              user?.role === 'admin' ? <TeacherApprovals /> : <Navigate to={`/dashboard/${user?.role || 'student'}`} />
           } />
           <Route path="/users" element={
              user?.role === 'admin' ? <Users /> : <Navigate to={`/dashboard/${user?.role || 'student'}`} />
           } />
           <Route path="/settings" element={
              user?.role === 'admin' ? <Settings /> : <Navigate to={`/dashboard/${user?.role || 'student'}`} />
           } />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
