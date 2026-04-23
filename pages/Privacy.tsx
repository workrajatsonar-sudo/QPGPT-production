import React from 'react';
import { Shield, Lock, Eye, FileText, CheckCircle } from 'lucide-react';

const Privacy = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-12">
        <div className="w-16 h-16 bg-brand/10 text-brand rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-txt">Privacy Policy</h1>
        <p className="text-muted mt-2">Last updated: April 23, 2026</p>
      </div>

      <div className="space-y-8">
        {/* Introduction */}
        <div className="bg-card p-8 rounded-2xl shadow-glass border border-border">
          <h2 className="text-xl font-bold text-txt mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand" />
            Introduction
          </h2>
          <p className="text-muted leading-relaxed">
            QPGPT ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered learning platform.
          </p>
        </div>

        {/* Data Collection */}
        <div className="bg-card p-8 rounded-2xl shadow-glass border border-border">
          <h2 className="text-xl font-bold text-txt mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-brand" />
            Information We Collect
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-txt">Personal Information</h3>
                <p className="text-muted text-sm mt-1">Name, email address, and profile information when you register or sign in via OAuth.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-txt">Generated Content</h3>
                <p className="text-muted text-sm mt-1">Quizzes, question papers, and summaries you create using our AI tools.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-txt">Usage Data</h3>
                <p className="text-muted text-sm mt-1">Anonymous analytics on how you interact with our platform to improve user experience.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Data Usage */}
        <div className="bg-card p-8 rounded-2xl shadow-glass border border-border">
          <h2 className="text-xl font-bold text-txt mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-brand" />
            How We Use Your Data
          </h2>
          <ul className="space-y-3">
            <li className="flex items-center gap-3 text-muted">
              <div className="w-2 h-2 bg-brand rounded-full"></div>
              To provide and maintain our AI learning services
            </li>
            <li className="flex items-center gap-3 text-muted">
              <div className="w-2 h-2 bg-brand rounded-full"></div>
              To process and store your generated question papers
            </li>
            <li className="flex items-center gap-3 text-muted">
              <div className="w-2 h-2 bg-brand rounded-full"></div>
              To communicate important updates and respond to support requests
            </li>
            <li className="flex items-center gap-3 text-muted">
              <div className="w-2 h-2 bg-brand rounded-full"></div>
              To detect and prevent fraudulent or abusive activity
            </li>
          </ul>
        </div>

        {/* Data Protection */}
        <div className="bg-card p-8 rounded-2xl shadow-glass border border-border">
          <h2 className="text-xl font-bold text-txt mb-4">Data Protection</h2>
          <p className="text-muted leading-relaxed mb-4">
            We implement industry-standard security measures to protect your data. All data is encrypted in transit using TLS/SSL. Your stored data is protected by Supabase's enterprise-grade infrastructure.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-800 text-sm font-medium">Your data is never sold or shared with third parties for advertising purposes.</span>
          </div>
        </div>

        {/* Your Rights */}
        <div className="bg-card p-8 rounded-2xl shadow-glass border border-border">
          <h2 className="text-xl font-bold text-txt mb-4">Your Rights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-input p-4 rounded-xl">
              <h3 className="font-semibold text-txt text-sm">Access</h3>
              <p className="text-muted text-sm mt-1">Request a copy of your personal data</p>
            </div>
            <div className="bg-input p-4 rounded-xl">
              <h3 className="font-semibold text-txt text-sm">Correction</h3>
              <p className="text-muted text-sm mt-1">Update or correct inaccurate data</p>
            </div>
            <div className="bg-input p-4 rounded-xl">
              <h3 className="font-semibold text-txt text-sm">Deletion</h3>
              <p className="text-muted text-sm mt-1">Request removal of your account and data</p>
            </div>
            <div className="bg-input p-4 rounded-xl">
              <h3 className="font-semibold text-txt text-sm">Export</h3>
              <p className="text-muted text-sm mt-1">Download your data in machine-readable format</p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-card p-8 rounded-2xl shadow-glass border border-border text-center">
          <h2 className="text-xl font-bold text-txt mb-2">Questions?</h2>
          <p className="text-muted mb-4">If you have any questions about this Privacy Policy, please contact us.</p>
          <a href="#/contact" className="inline-flex items-center gap-2 text-brand font-semibold hover:underline">
            Contact Our Privacy Team
          </a>
        </div>
      </div>
    </div>
  );
};

export default Privacy;