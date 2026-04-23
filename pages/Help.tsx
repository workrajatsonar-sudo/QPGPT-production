import React from 'react';
import { HelpCircle, Mail, MessageCircle, FileQuestion } from 'lucide-react';

const Help = () => {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-txt">How can we help you?</h1>
        <p className="text-muted mt-2">Search our knowledge base or contact support</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-xl shadow-glass border border-border text-center hover:border-brand/30 transition-all">
          <div className="w-12 h-12 bg-brand/10 text-brand rounded-full flex items-center justify-center mx-auto mb-4">
            <FileQuestion className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-txt mb-2">Guides</h3>
          <p className="text-sm text-muted">Learn how to generate papers and manage files</p>
        </div>
        <div className="bg-card p-6 rounded-xl shadow-glass border border-border text-center hover:border-brand/30 transition-all">
          <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-txt mb-2">FAQ</h3>
          <p className="text-sm text-muted">Common questions about accounts and billing</p>
        </div>
        <div className="bg-card p-6 rounded-xl shadow-glass border border-border text-center hover:border-brand/30 transition-all">
          <div className="w-12 h-12 bg-purple-500/10 text-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-txt mb-2">Contact</h3>
          <p className="text-sm text-muted">Reach out to our support team directly</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-8 shadow-glass">
        <h2 className="text-xl font-bold text-txt mb-6">Frequently Asked Questions</h2>
        <div className="space-y-6">
          {[
            "How do I upload a question paper?",
            "Can I generate papers for specific chapters?",
            "Who can view my private files?",
            "How do I reset my password?"
          ].map((q, i) => (
            <div key={i} className="border-b border-border pb-4 last:border-0 last:pb-0">
              <h4 className="font-medium text-txt mb-2 cursor-pointer hover:text-brand transition-colors">{q}</h4>
              <p className="text-sm text-muted">
                Easily manage your educational resources with our automated tools. If you encounter issues, our documentation provides step-by-step instructions.
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Help;