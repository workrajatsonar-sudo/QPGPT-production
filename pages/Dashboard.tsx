
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getCachedProfile } from '../lib/auth';
import { 
  BookOpen, Download, Users, FolderOpen, FileText, Upload, Search, 
  Layers, ArrowRight, Clock, FilePlus, Sparkles, TrendingUp
} from 'lucide-react';
import { Role } from '../types';
import { Link } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

interface DashboardProps { userRole: Role; }

const Dashboard: React.FC<DashboardProps> = ({ userRole }) => {
  const [stats, setStats] = useState({ totalFiles: 0, totalDownloads: 0, totalUsers: 0, totalSubjects: 0 });
  const [activities, setActivities] = useState<any[]>([]);
  const [userName, setUserName] = useState('User');

  useEffect(() => {
    const fetchData = async () => {
        const cachedUser = getCachedProfile();
        if (cachedUser) setUserName(cachedUser.full_name || 'User');

        const [files, downloads, subjects] = await Promise.all([
          supabase.from('files').select('*', { count: 'exact', head: true }),
          supabase.from('download_logs').select('*', { count: 'exact', head: true }),
          supabase.from('subjects').select('*', { count: 'exact', head: true })
        ]);

        let usersCount = 0;
        if (userRole === 'admin') {
            const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
            usersCount = count || 0;
        }

        setStats({
          totalFiles: files.count || 0,
          totalDownloads: downloads.count || 0,
          totalUsers: usersCount,
          totalSubjects: subjects.count || 0
        });

        const { data: recentFiles } = await supabase.from('files')
          .select('id, title, created_at, file_type, users(full_name)')
          .order('created_at', { ascending: false })
          .limit(4);

        if (recentFiles && recentFiles.length > 0) {
             setActivities(recentFiles.map((file: any) => ({
                 id: file.id,
                 title: file.title,
                 time: getRelativeTime(file.created_at),
                 type: 'upload',
                 fileType: file.file_type,
                 author: file.users?.full_name || 'Unknown'
             })));
        }
    };
    fetchData();
  }, [userRole]);

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  // Mock data for the chart
  const chartData = [
    { name: 'Mon', downloads: 12, uploads: 4 },
    { name: 'Tue', downloads: 19, uploads: 8 },
    { name: 'Wed', downloads: 15, uploads: 12 },
    { name: 'Thu', downloads: 22, uploads: 6 },
    { name: 'Fri', downloads: 30, uploads: 15 },
    { name: 'Sat', downloads: 10, uploads: 3 },
    { name: 'Sun', downloads: 8, uploads: 2 },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand to-purple-600 p-8 lg:p-12 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl">
           <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight mb-2">Hello, {userName}! 👋</h1>
           <p className="text-indigo-100 text-lg mb-8">Ready to boost your productivity today? Access thousands of resources or generate your own.</p>
           
           <div className="flex flex-wrap gap-4">
              <Link to="/questions" className="px-6 py-3 bg-white text-brand rounded-xl font-bold shadow-sm hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2">
                 <Search className="w-5 h-5" /> Browse Library
              </Link>
              <Link to="/qpgpt" className="px-6 py-3 bg-white/10 text-white border border-white/20 rounded-xl font-bold hover:bg-white/20 transition-all flex items-center gap-2 backdrop-blur-sm">
                 <Sparkles className="w-5 h-5" /> Ask AI Assistant
              </Link>
           </div>
        </div>
        
        {/* Abstract Shapes */}
        <div className="absolute right-0 top-0 h-full w-1/2 pointer-events-none hidden md:block">
            <div className="absolute top-[-20%] right-[-10%] w-[300px] h-[300px] bg-white/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[10%] w-[200px] h-[200px] bg-purple-400/20 rounded-full blur-3xl"></div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${userRole === 'admin' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6`}>
        <StatCard label="Total Resources" value={stats.totalFiles} icon={BookOpen} color="text-blue-600" bg="bg-blue-50" />
        <StatCard label="Total Downloads" value={stats.totalDownloads} icon={Download} color="text-emerald-600" bg="bg-emerald-50" />
        {userRole === 'admin' && (
          <StatCard label="Active Users" value={stats.totalUsers} icon={Users} color="text-purple-600" bg="bg-purple-50" />
        )}
        <StatCard label="Subjects Covered" value={stats.totalSubjects} icon={FolderOpen} color="text-orange-600" bg="bg-orange-50" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Chart Section */}
        <div className="xl:col-span-2 bg-card rounded-3xl border border-glass shadow-glass p-6 flex flex-col">
           <div className="flex items-center justify-between mb-6">
              <div>
                 <h3 className="font-bold text-lg text-txt">Weekly Activity</h3>
                 <p className="text-sm text-muted">Downloads vs Uploads activity</p>
              </div>
              <div className="p-2 bg-muted/5 rounded-lg border border-border">
                 <TrendingUp className="w-5 h-5 text-muted" />
              </div>
           </div>
           
           <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={chartData}>
                    <defs>
                       <linearGradient id="colorDown" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                       </linearGradient>
                       <linearGradient id="colorUp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-col)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 12}} />
                    <Tooltip 
                       contentStyle={{backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-col)', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                       itemStyle={{color: 'var(--text-main)'}}
                    />
                    <Area type="monotone" dataKey="downloads" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorDown)" />
                    <Area type="monotone" dataKey="uploads" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorUp)" />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Right Column: Activity & Actions */}
        <div className="space-y-6">
           {/* Recent Activity */}
           <div className="bg-card rounded-3xl border border-glass shadow-glass p-6">
              <h3 className="font-bold text-lg text-txt mb-4 flex items-center gap-2">
                 <Clock className="w-5 h-5 text-muted" /> Latest Updates
              </h3>
              <div className="space-y-4">
                 {activities.map((act) => (
                    <div key={act.id} className="flex gap-4 items-start p-3 hover:bg-muted/5 rounded-xl transition-colors group cursor-pointer">
                       <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                          {act.fileType === 'pdf' ? <FileText className="w-5 h-5"/> : <FilePlus className="w-5 h-5"/>}
                       </div>
                       <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-txt truncate">{act.title}</h4>
                          <p className="text-xs text-muted flex items-center gap-1">
                             <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                             {act.author} • {act.time}
                          </p>
                       </div>
                    </div>
                 ))}
                 {activities.length === 0 && <p className="text-muted text-sm italic">No recent activity.</p>}
              </div>
              <Link to="/questions" className="block mt-4 text-center text-sm font-bold text-brand hover:underline">View All Activity</Link>
           </div>

           {/* Quick Actions */}
           <div className="bg-card rounded-3xl border border-glass shadow-glass p-6">
              <h3 className="font-bold text-lg text-txt mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                 <ActionCard to="/generate" icon={Sparkles} label="AI Generator" color="text-purple-600" bg="bg-purple-50" />
                 <ActionCard to="/quiz-game" icon={Layers} label="Start Quiz" color="text-orange-600" bg="bg-orange-50" />
                 {(userRole === 'teacher' || userRole === 'admin') && 
                   <ActionCard to="/upload" icon={Upload} label="Upload" color="text-emerald-600" bg="bg-emerald-50" />
                 }
                 <ActionCard to="/search" icon={Search} label="Search" color="text-blue-600" bg="bg-blue-50" />
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color, bg }: any) => (
  <div className="bg-card p-6 rounded-2xl border border-glass shadow-glass hover:shadow-lg transition-all group flex items-center gap-5">
    <div className={`w-14 h-14 rounded-2xl ${bg} ${color} flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform`}>
      <Icon className="w-7 h-7" />
    </div>
    <div>
      <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-extrabold text-txt tracking-tight">{value}</p>
    </div>
  </div>
);

const ActionCard = ({ to, icon: Icon, label, color, bg }: any) => (
  <Link to={to} className="flex flex-col items-center justify-center p-4 rounded-2xl border border-border hover:border-brand/30 hover:bg-muted/5 transition-all group text-center gap-2">
    <div className={`p-2.5 rounded-xl ${bg} ${color} group-hover:scale-110 transition-transform`}>
      <Icon className="w-5 h-5" />
    </div>
    <span className="text-xs font-bold text-txt group-hover:text-brand transition-colors">{label}</span>
  </Link>
);

export default Dashboard;
