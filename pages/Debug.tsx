import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getCachedProfile } from '../lib/auth';
import { Shield, Database, AlertCircle, RefreshCw } from 'lucide-react';

const Debug = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const fetchDebugInfo = async () => {
    setLoading(true);
    try {
      const currentUser = getCachedProfile();
      setUser(currentUser);

      const [files, apps, allFiles, totalFiles, totalApps] = await Promise.all([
        supabase.from('files').select('*', { count: 'exact', head: true }).eq('approval_status', 'pending'),
        supabase.from('teacher_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('files').select('id, title, approval_status, visibility, created_at').order('created_at', { ascending: false }).limit(10),
        supabase.from('files').select('*', { count: 'exact', head: true }),
        supabase.from('teacher_applications').select('*', { count: 'exact', head: true })
      ]);

      setData({
        counts: {
          pendingFiles: files.count,
          pendingApps: apps.count,
          totalFiles: totalFiles.count,
          totalApps: totalApps.count
        },
        recentFiles: allFiles.data,
        errors: {
          files: files.error,
          apps: apps.error
        }
      });
    } catch (err: any) {
      setData({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebugInfo();
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 bg-page min-h-screen text-txt">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="text-red-500" /> Database Diagnostics
        </h1>
        <button onClick={fetchDebugInfo} className="p-2 hover:bg-card rounded-full transition-colors">
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <h2 className="text-sm font-bold text-muted uppercase tracking-wider mb-4">Current Session</h2>
          <pre className="text-xs bg-page p-3 rounded border border-border overflow-auto max-h-40">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>

        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <h2 className="text-sm font-bold text-muted uppercase tracking-wider mb-4">Database Stats</h2>
          <div className="space-y-2">
            <div className="flex justify-between"><span>Pending Files:</span> <span className="font-bold text-brand">{data?.counts?.pendingFiles ?? '0'}</span></div>
            <div className="flex justify-between"><span>Pending Apps:</span> <span className="font-bold text-blue-500">{data?.counts?.pendingApps ?? '0'}</span></div>
            <div className="flex justify-between border-t border-border pt-2"><span>Total Files:</span> <span className="font-bold">{data?.counts?.totalFiles ?? '0'}</span></div>
            <div className="flex justify-between"><span>Total Apps:</span> <span className="font-bold">{data?.counts?.totalApps ?? '0'}</span></div>
          </div>
        </div>
      </div>

      {data?.recentFiles && (
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <h2 className="text-sm font-bold text-muted uppercase tracking-wider mb-4">Recent 5 Files (Any Status)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Approval Status</th>
                  <th className="py-2 pr-4">Visibility</th>
                  <th className="py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.recentFiles.map((f: any) => (
                  <tr key={f.id} className="border-b border-border/50">
                    <td className="py-2 font-medium pr-4">{f.title}</td>
                    <td className="py-2 pr-4">
                      <span className={`uppercase text-xs font-bold px-2 py-0.5 rounded ${
                        f.approval_status === 'approved' ? 'bg-green-100 text-green-700' :
                        f.approval_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>{f.approval_status}</span>
                    </td>
                    <td className="py-2 pr-4 text-muted">{f.visibility}</td>
                    <td className="py-2 text-muted">{new Date(f.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(data?.errors?.files || data?.errors?.apps) && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex gap-3 text-red-700">
          <AlertCircle className="shrink-0" />
          <div>
            <h3 className="font-bold">Database Access Errors Detected</h3>
            <p className="text-sm mt-1">Files: {data?.errors?.files?.message || 'None'}</p>
            <p className="text-sm">Apps: {data?.errors?.apps?.message || 'None'}</p>
          </div>
        </div>
      )}

      <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <h2 className="text-sm font-bold text-muted uppercase tracking-wider mb-4">Raw Debug Payload</h2>
          <pre className="text-[10px] bg-page p-3 rounded border border-border overflow-auto max-h-60 leading-tight">
            {JSON.stringify(data, null, 2)}
          </pre>
      </div>
    </div>
  );
};

export default Debug;
