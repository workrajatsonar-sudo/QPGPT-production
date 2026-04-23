
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Phone, MapPin, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.message) {
      setStatus({ type: 'error', msg: 'Please fill in all fields.' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const { error } = await supabase
        .from('contact_messages')
        .insert([
          {
            name: formData.name,
            email: formData.email,
            message: formData.message,
            subject: 'Contact Form Submission' // Default subject
          },
        ]);

      if (error) throw error;

      setStatus({ type: 'success', msg: 'Message sent successfully! We will get back to you soon.' });
      setFormData({ name: '', email: '', message: '' });

    } catch (error: any) {
      console.error('Contact form error:', error.message);
      setStatus({ type: 'error', msg: 'Failed to send message. Please try again later.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-txt">Contact Us</h1>
        <p className="text-muted mt-2">We'd love to hear from you. Send us a message!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Contact Form */}
        <div className="bg-card p-8 rounded-2xl shadow-glass border border-border">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {status && (
              <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {status.type === 'success' ? <CheckCircle className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>}
                {status.msg}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-txt mb-1">Name</label>
              <input 
                type="text" 
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2 bg-input border border-border text-txt rounded-lg focus:ring-2 focus:ring-brand/20 outline-none transition-all" 
                placeholder="Your Name" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-txt mb-1">Email</label>
              <input 
                type="email" 
                required
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-2 bg-input border border-border text-txt rounded-lg focus:ring-2 focus:ring-brand/20 outline-none transition-all" 
                placeholder="your@email.com" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-txt mb-1">Message</label>
              <textarea 
                rows={4} 
                required
                value={formData.message}
                onChange={e => setFormData({...formData, message: e.target.value})}
                className="w-full px-4 py-2 bg-input border border-border text-txt rounded-lg focus:ring-2 focus:ring-brand/20 outline-none transition-all resize-none" 
                placeholder="How can we help?"
              ></textarea>
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 bg-brand text-inv font-bold rounded-lg hover:bg-brand-hover transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none shadow-lg shadow-brand/20"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} 
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>

        {/* Contact Info */}
        <div className="space-y-6">
          <div className="bg-card p-6 rounded-2xl shadow-glass border border-border flex items-start gap-4 hover:border-brand/30 transition-all">
            <div className="p-3 bg-brand/10 text-brand rounded-lg"><Mail className="w-6 h-6" /></div>
            <div>
              <h3 className="font-bold text-txt">Email Us</h3>
              <p className="text-muted text-sm mt-1">support@qbank.pro</p>
              <p className="text-muted text-sm">sales@qbank.pro</p>
            </div>
          </div>
          <div className="bg-card p-6 rounded-2xl shadow-glass border border-border flex items-start gap-4 hover:border-brand/30 transition-all">
            <div className="p-3 bg-green-500/10 text-green-500 rounded-lg"><Phone className="w-6 h-6" /></div>
            <div>
              <h3 className="font-bold text-txt">Call Us</h3>
              <p className="text-muted text-sm mt-1">+1 (555) 123-4567</p>
              <p className="text-muted text-sm">Mon-Fri, 9am-6pm UTC</p>
            </div>
          </div>
          <div className="bg-card p-6 rounded-2xl shadow-glass border border-border flex items-start gap-4 hover:border-brand/30 transition-all">
            <div className="p-3 bg-purple-500/10 text-purple-500 rounded-lg"><MapPin className="w-6 h-6" /></div>
            <div>
              <h3 className="font-bold text-txt">Visit Us</h3>
              <p className="text-muted text-sm mt-1">123 Education Lane</p>
              <p className="text-muted text-sm">Tech City, TC 90210</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
