import React from 'react';
import { HelpCircle, Mail, MessageCircle, FileQuestion } from 'lucide-react';

const Help = () => {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900">How can we help you?</h1>
        <p className="text-gray-500 mt-2">Search our knowledge base or contact support</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileQuestion className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Guides</h3>
          <p className="text-sm text-gray-500">Learn how to generate papers and manage files</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">FAQ</h3>
          <p className="text-sm text-gray-500">Common questions about accounts and billing</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Contact</h3>
          <p className="text-sm text-gray-500">Reach out to our support team directly</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
        <div className="space-y-6">
          {[
            "How do I upload a question paper?",
            "Can I generate papers for specific chapters?",
            "Who can view my private files?",
            "How do I reset my password?"
          ].map((q, i) => (
            <div key={i} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
              <h4 className="font-medium text-gray-900 mb-2 cursor-pointer hover:text-blue-600">{q}</h4>
              <p className="text-sm text-gray-500">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Help;