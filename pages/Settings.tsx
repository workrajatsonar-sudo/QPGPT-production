
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, Globe, Shield, CloudUpload, Bot, Monitor, Moon, Sun, Loader2 } from 'lucide-react';
import { AppSettings } from '../types';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
       const { data, error } = await supabase.from('app_settings').select('*').maybeSingle();
       if (data) {
           setSettings(data);
       } else {
           // Fallback default state if the database row hasn't been seeded yet
           setSettings({
               id: 'default',
               platform_name: 'QPGPT Admin',
               theme: 'white',
               qpgpt_enabled: true,
               generator_strict_mode: true,
               allow_text_input: true,
               allow_pdf_input: true,
               max_pdf_size_mb: 50,
               allowed_file_types: ['pdf', 'docx', 'txt'],
               support_email: 'admin@example.com',
               maintenance_mode: false,
               updated_at: new Date().toISOString()
           });
       }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    
    try {
      if (settings.id === 'default') {
          const { id, ...insertPayload } = settings;
          const { data, error } = await supabase.from('app_settings').insert([insertPayload]).select().single();
          if (error) throw error;
          if (data) setSettings(data);
      } else {
          const { id, updated_at, ...updatePayload } = settings;
          const { error } = await supabase
              .from('app_settings')
              .update({
                  ...updatePayload,
                  updated_at: new Date().toISOString()
              })
              .eq('id', id);
          
          if (error) throw error;
      }
      
      window.dispatchEvent(new Event('theme-change'));

    } catch (err: any) {
      console.error('Settings save error:', err);
      alert('Failed to save settings. Please ensure you are an administrator.');
    } finally {
      setSaving(false);
    }
  };

  const update = (key: keyof AppSettings, val: any) => setSettings(prev => prev ? ({ ...prev, [key]: val }) : null);

  if (!settings) return <div className="p-10"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
       <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full md:w-64 flex-shrink-0 space-y-1">
             <TabButton id="general" icon={Globe} label="General" active={activeTab} onClick={setActiveTab} />
             <TabButton id="ai" icon={Bot} label="AI & Generator" active={activeTab} onClick={setActiveTab} />
             <TabButton id="upload" icon={CloudUpload} label="Upload Rules" active={activeTab} onClick={setActiveTab} />
             <TabButton id="security" icon={Shield} label="Security" active={activeTab} onClick={setActiveTab} />
          </div>

          {/* Content */}
          <div className="flex-1 bg-card border border-glass rounded-2xl p-8 shadow-glass">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-txt capitalize">{activeTab} Settings</h2>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-brand text-inv rounded-lg font-bold text-sm hover:bg-brand-hover disabled:opacity-50 flex items-center gap-2">
                   {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} Save
                </button>
             </div>

             {activeTab === 'general' && (
               <div className="space-y-6">
                  <div>
                     <label className="text-sm font-semibold text-txt mb-2 block">Platform Name</label>
                     <input type="text" value={settings.platform_name} onChange={e => update('platform_name', e.target.value)} className="w-full px-4 py-2 bg-input border border-border rounded-lg text-txt focus:ring-2 focus:ring-brand/20 outline-none" />
                  </div>
                  
                  <div>
                     <label className="text-sm font-semibold text-txt mb-3 block">Appearance Theme</label>
                     <div className="grid grid-cols-3 gap-4">
                        <ThemeCard label="Light" icon={Sun} active={settings.theme === 'white' || settings.theme === 'light'} onClick={() => update('theme', 'white')} />
                        <ThemeCard label="Dark" icon={Moon} active={settings.theme === 'black' || settings.theme === 'dark'} onClick={() => update('theme', 'black')} />
                        <ThemeCard label="Space" icon={Monitor} active={settings.theme === 'space'} onClick={() => update('theme', 'space')} />
                     </div>
                  </div>
               </div>
             )}

             {activeTab === 'ai' && (
                <div className="space-y-4">
                   <div className="flex items-center justify-between p-4 bg-page rounded-xl border border-border">
                      <div>
                         <p className="font-bold text-txt">Enable QPGPT</p>
                         <p className="text-xs text-muted">Allow AI chat assistant for users</p>
                      </div>
                      <input type="checkbox" checked={!!settings.qpgpt_enabled} onChange={e => update('qpgpt_enabled', e.target.checked)} className="w-5 h-5 accent-brand" />
                   </div>
                   <div className="flex items-center justify-between p-4 bg-page rounded-xl border border-border">
                      <div>
                         <p className="font-bold text-txt">Strict Generator Mode</p>
                         <p className="text-xs text-muted">AI sticks strictly to provided context</p>
                      </div>
                      <input type="checkbox" checked={!!settings.generator_strict_mode} onChange={e => update('generator_strict_mode', e.target.checked)} className="w-5 h-5 accent-brand" />
                   </div>
                   <div className="flex items-center justify-between p-4 bg-page rounded-xl border border-border">
                      <div>
                         <p className="font-bold text-txt">Allow Text Input</p>
                         <p className="text-xs text-muted">Users can paste text content directly</p>
                      </div>
                      <input type="checkbox" checked={!!settings.allow_text_input} onChange={e => update('allow_text_input', e.target.checked)} className="w-5 h-5 accent-brand" />
                   </div>
                   <div className="flex items-center justify-between p-4 bg-page rounded-xl border border-border">
                      <div>
                         <p className="font-bold text-txt">Allow File Input (PDF/Word)</p>
                         <p className="text-xs text-muted">Users can upload PDF or Word docs as source</p>
                      </div>
                      <input type="checkbox" checked={!!settings.allow_pdf_input} onChange={e => update('allow_pdf_input', e.target.checked)} className="w-5 h-5 accent-brand" />
                   </div>
                </div>
             )}

             {/* Placeholder for other tabs if they were fully implemented or needed */}
             {activeTab === 'upload' && <div className="text-muted text-sm">Upload configuration settings (Max size, types) coming soon.</div>}
             {activeTab === 'security' && <div className="text-muted text-sm">Security settings (2FA, Password Policy) coming soon.</div>}
           </div>
       </div>
    </div>
  );
};

const TabButton = ({ id, icon: Icon, label, active, onClick }: any) => (
  <button onClick={() => onClick(id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${active === id ? 'bg-brand/10 text-brand' : 'text-muted hover:bg-card hover:text-txt'}`}>
     <Icon className="w-4 h-4" /> {label}
  </button>
);

const ThemeCard = ({ label, icon: Icon, active, onClick }: any) => (
  <button onClick={onClick} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${active ? 'bg-brand/5 border-brand text-brand ring-1 ring-brand' : 'bg-page border-border text-muted hover:border-brand/50'}`}>
     <Icon className="w-6 h-6" />
     <span className="text-xs font-bold uppercase">{label}</span>
  </button>
);

export default Settings;
