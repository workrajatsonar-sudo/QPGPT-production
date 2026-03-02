
import React, { useState, useEffect, useRef } from 'react';
import { supabase, downloadFile } from '../lib/supabase';
import { 
  Bot, 
  User, 
  FileText, 
  Upload, 
  FilePlus, 
  Paperclip,
  BrainCircuit,
  Globe,
  ArrowUp,
  X,
  Sparkles,
  Zap,
  Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FileRecord, AppSettings } from '../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isResult?: boolean;
  options?: 'fallback' | 'generation_prompt' | null;
}

// Logic Mapping
type Mode = 'SEARCH' | 'GENERATION_FLOW';
type GenStep = 'MEDIUM' | 'CLASS' | 'SUBJECT' | 'EXAM_TYPE' | 'DIFFICULTY' | 'REDIRECT';

const QPGPT = () => {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Core State ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  // --- Mode State ---
  const [activeMode, setActiveMode] = useState<'search' | 'deepthink'>('search');
  
  // --- Logic State ---
  const [genStep, setGenStep] = useState<GenStep>('MEDIUM');
  const [searchResults, setSearchResults] = useState<FileRecord[]>([]);
  const [genContext, setGenContext] = useState({
    medium: '', class: '', subject: '', examType: '', difficulty: ''
  });

  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase.from('app_settings').select('*').single();
      if (data) setSettings(data);
    };
    loadSettings();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // --- Messaging Helpers ---

  const addBotMessage = (text: string, isResult = false, options: Message['options'] = null) => {
    setIsTyping(true);
    // Simulate thinking time slightly randomized
    const delay = Math.min(1000, 600 + text.length * 10);
    
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        role: 'assistant',
        content: text,
        isResult,
        options
      }]);
    }, delay);
  };

  const addUserMessage = (text: string) => {
    setMessages(prev => [...prev, {
      id: Math.random().toString(),
      role: 'user',
      content: text
    }]);
  };

  // --- Conversational Logic ---
  const processConversation = (text: string): boolean => {
      const lower = text.toLowerCase().trim();
      
      // 1. Greetings
      if (/^(hi|hey|hello|hiya|yo|hola|greetings|hlo)(\s|[!.?])?$/i.test(lower)) {
          addBotMessage("Hey there! 👋 What can I help you with today? I can find papers or generate quizzes for you.");
          return true;
      }
      
      // 2. Time-based
      if (lower.includes('good morning')) {
          addBotMessage("Good morning! ☀️ Ready to achieve some learning goals today?");
          return true;
      }
      if (lower.includes('good afternoon')) {
          addBotMessage("Good afternoon! 🌤️ Hope your day is going well. What subject are we focusing on?");
          return true;
      }
      if (lower.includes('good evening')) {
          addBotMessage("Good evening! 🌙 Great time for a quick revision. What do you need?");
          return true;
      }

      // 3. Gratitude
      if (/(thank|thanks|thx)/.test(lower)) {
          addBotMessage("You're most welcome! 🌟 Is there anything else you need help with?");
          return true;
      }

      // 4. Identity
      if (lower.includes('who are you') || lower.includes('what are you')) {
          addBotMessage("I'm QPGPT, your AI study assistant. I can help you find question papers from our database or generate new quizzes using AI!");
          return true;
      }
      
      // 5. Bye
      if (/^(bye|goodbye|see ya)/i.test(lower)) {
          addBotMessage("Goodbye! Happy studying! 👋");
          return true;
      }

      return false;
  };

  const handleSendMessage = async () => {
    const text = inputValue.trim();
    if (!text && !attachedFile) return;
    if (settings && !settings.qpgpt_enabled) return;

    setInputValue("");
    addUserMessage(text || (attachedFile ? `[Attached File: ${attachedFile.name}]` : ""));
    
    // Clear attachment after sending
    const currentFile = attachedFile;
    setAttachedFile(null);

    // 1. Check for basic conversation first
    if (!currentFile && processConversation(text)) {
        return;
    }

    // 2. Routing Logic based on Active Mode
    if (activeMode === 'search') {
        await processSearchIntent(text);
    } else {
        // DeepThink (Generation)
        if (messages.length === 0) {
            startGenerationFlow();
        } else {
            await processGenerationFlow(text);
        }
    }
  };

  // --- Logic Implementations ---

  const processSearchIntent = async (text: string) => {
    // Advanced cleaning to focus on core keywords
    const stopWords = [
      'i', 'want', 'a', 'an', 'the', 'pdf', 'file', 'document', 'related', 'to', 'about', 'for', 'in', 'on', 'of', 'me', 
      'find', 'search', 'get', 'show', 'please', 'notes', 'papers', 'question', 'questions', 'paper', 'do', 'you', 'have', 
      'this', 'pdfs', 'database', 'is', 'there', 'available', 'copy', 'download', 'can', 'help', 'with', 'qpgpt', 'assistant', 'bot', 'ai', 'hey', 'hello', 'hi'
    ];
    
    const cleanText = text.toLowerCase().replace(/[^\w\s]/g, '');
    const words = cleanText.split(/\s+/);
    const keywords = words.filter(w => !stopWords.includes(w) && w.length > 1);
    
    const searchQuery = keywords.join(' ');

    if (!searchQuery) {
        addBotMessage("I couldn't detect a specific topic. Could you specify a Subject (e.g., 'Math') or Standard (e.g., 'Class 10')?");
        return;
    }

    setIsTyping(true);

    try {
        // Robust Search Strategy:
        // 1. Broad Fetch: Get files that match ANY of the keywords in title or description.
        // 2. Client Scoring: Rank them based on exact match > all keywords > some keywords.
        
        const orConditions: string[] = [];
        keywords.forEach(word => {
            orConditions.push(`title.ilike.%${word}%`);
            orConditions.push(`description.ilike.%${word}%`);
        });

        const { data, error } = await supabase
            .from('files')
            .select(`
                *,
                mediums (name),
                standards (name),
                subjects (name)
            `)
            .eq('approval_status', 'approved')
            .eq('visibility', 'public')
            .or(orConditions.join(','))
            .limit(50); // Fetch candidate pool

        if (error) throw error;

        // Scoring Logic
        const results = data as FileRecord[] || [];
        const scoredResults = results.map(file => {
            let score = 0;
            const title = file.title.toLowerCase();
            const desc = (file.description || '').toLowerCase();
            
            // Exact phrase match (Highest Priority)
            if (title.includes(searchQuery)) score += 50;
            else if (desc.includes(searchQuery)) score += 20;

            // Individual keyword matches
            let matches = 0;
            keywords.forEach(word => {
                if (title.includes(word)) { score += 10; matches++; }
                else if (desc.includes(word)) { score += 5; matches++; }
            });
            
            // Bonus for containing ALL keywords
            if (matches >= keywords.length) score += 30;

            return { file, score };
        });

        // Filter & Sort
        scoredResults.sort((a, b) => b.score - a.score);
        const topResults = scoredResults.slice(0, 4).map(r => r.file);

        setIsTyping(false);

        if (topResults.length > 0) {
            setSearchResults(topResults);
            addBotMessage(`I found ${topResults.length} resources related to "${searchQuery}":`, true);
        } else {
            setSearchResults([]);
            addBotMessage(`I searched for "${searchQuery}" but couldn't find any specific matches. Would you like to generate a new quiz or paper instead?`, false, 'fallback');
        }

    } catch (err) {
        console.error("Search Error:", err);
        setIsTyping(false);
        addBotMessage("I encountered a connection issue. Please try again.");
    }
  };

  const processGenerationFlow = async (text: string) => {
      const lowerText = text.toLowerCase();
      const nextContext = { ...genContext };

      switch (genStep) {
          case 'MEDIUM':
              if (lowerText.includes('hindi')) nextContext.medium = 'Hindi';
              else if (lowerText.includes('gujarati')) nextContext.medium = 'Gujarati';
              else nextContext.medium = 'English';
              
              setGenContext(nextContext);
              setGenStep('CLASS');
              addBotMessage("Got it. Which Class/Standard? (e.g., 10th, 12th)");
              break;

          case 'CLASS':
              nextContext.class = text;
              setGenContext(nextContext);
              setGenStep('SUBJECT');
              addBotMessage("Which Subject?");
              break;

          case 'SUBJECT':
              nextContext.subject = text;
              setGenContext(nextContext);
              setGenStep('EXAM_TYPE');
              addBotMessage("Exam Type? (Board / Unit Test / Worksheet)");
              break;

          case 'EXAM_TYPE':
              nextContext.examType = text;
              setGenContext(nextContext);
              setGenStep('DIFFICULTY');
              addBotMessage("Difficulty Level? (Easy / Medium / Hard)");
              break;

          case 'DIFFICULTY':
              nextContext.difficulty = text;
              setGenContext(nextContext);
              setGenStep('REDIRECT');
              addBotMessage("Perfect. Initializing Generator with your preferences...", false, 'generation_prompt');
              setTimeout(() => navigate('/generate'), 2000);
              break;
      }
  };

  const startGenerationFlow = () => {
      setGenStep('MEDIUM');
      setGenContext({ medium: '', class: '', subject: '', examType: '', difficulty: '' });
      addBotMessage("Let's create something new. First, select the Medium (English / Hindi / Gujarati).");
  };

  const handleDownload = async (path: string) => {
    try {
        await downloadFile(path, 'question-files');
    } catch (e) {
        console.error("Download failed:", e);
        // Fallback
        const { data } = supabase.storage.from('question-files').getPublicUrl(path);
        if (data?.publicUrl) {
            window.open(data.publicUrl, '_blank');
        } else {
            addBotMessage("Sorry, I couldn't download that file. It might have been removed.");
        }
    }
  };

  // --- Render ---
  const hasStarted = messages.length > 0;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] font-sans relative overflow-hidden transition-colors duration-500 bg-white dark:bg-[#0a0a0c]">
      
      {/* 1. DeepSeek Atmosphere Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-0 right-0 h-[70vh] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-[#0B1121]/10 to-transparent dark:from-blue-900/20 dark:via-[#0B1121] dark:to-[#0a0a0c]"></div>
      </div>

      {/* 2. Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto scroll-smooth relative z-10">
         
         {/* HERO STATE (DeepSeek V3 Style) */}
         {!hasStarted && (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 animate-in fade-in duration-700 mt-12">
               
               <div className="mb-6 p-4 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl dark:shadow-blue-900/20">
                   <Zap className="w-12 h-12 text-blue-600 dark:text-blue-400" />
               </div>

               <h1 className="text-4xl md:text-6xl font-medium tracking-tight text-slate-900 dark:text-white mb-6">
                  QPGPT <span className="italic font-serif text-blue-600 dark:text-blue-400">V3</span> — the <span className="italic font-serif">Future</span> <br/>
                  of generative <span className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">models</span> is here
               </h1>
            </div>
         )}

         {/* CHAT MESSAGES STATE */}
         {hasStarted && (
            <div className="max-w-3xl mx-auto px-4 py-8 space-y-8 pb-32">
               {messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-4 animate-in slide-in-from-bottom-2 duration-500 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     
                     {msg.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white flex-shrink-0 mt-1 shadow-lg shadow-blue-500/20">
                           <Bot className="w-5 h-5" />
                        </div>
                     )}

                     <div className={`max-w-[85%] space-y-2`}>
                        <div className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                           msg.role === 'user' 
                           ? 'bg-blue-600 text-white rounded-tr-sm' 
                           : 'bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-800 dark:text-gray-200 rounded-tl-sm'
                        }`}>
                           {msg.content}
                        </div>

                        {/* Search Results Grid */}
                        {msg.isResult && searchResults.length > 0 && (
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-2">
                              {searchResults.map(paper => (
                                 <div key={paper.id} className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 hover:border-blue-400 hover:shadow-md transition-all group cursor-pointer flex flex-col gap-2" onClick={() => handleDownload(paper.file_path)}>
                                    <div className="flex items-start justify-between">
                                       <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                                          <FileText className="w-4 h-4" />
                                       </div>
                                       <span className="text-[10px] uppercase font-bold text-gray-400">{paper.type}</span>
                                    </div>
                                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm line-clamp-2">{paper.title}</h4>
                                    <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mt-auto font-medium group-hover:underline">
                                        <Download className="w-3 h-3" /> Download
                                    </div>
                                 </div>
                              ))}
                           </div>
                        )}

                        {/* Fallback Buttons */}
                        {msg.options === 'fallback' && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                <button onClick={startGenerationFlow} className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center gap-2 border border-blue-100 dark:border-blue-800">
                                   <FilePlus className="w-3 h-3" /> Generate New
                                </button>
                                <button onClick={() => navigate('/upload')} className="px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-full text-xs font-bold hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors flex items-center gap-2 border border-purple-100 dark:border-purple-800">
                                   <Upload className="w-3 h-3" /> Upload PDF
                                </button>
                            </div>
                        )}
                     </div>
                  </div>
               ))}
               
               {isTyping && (
                  <div className="flex justify-start gap-4">
                     <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white flex-shrink-0 mt-1">
                        <Bot className="w-5 h-5" />
                     </div>
                     <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5 h-12">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                     </div>
                  </div>
               )}
               <div ref={messagesEndRef} />
            </div>
         )}
      </div>

      {/* 3. Floating Input Capsule (DeepSeek V3 Style) */}
      <div className={`
         w-full px-4 transition-all duration-500 ease-in-out z-20
         ${hasStarted ? 'bg-white/80 dark:bg-[#0a0a0c]/80 backdrop-blur-xl border-t border-gray-200 dark:border-zinc-800 py-4 absolute bottom-0' : 'relative -top-20'}
      `}>
         <div className="max-w-3xl mx-auto">
             <div className={`
                 relative group bg-white dark:bg-zinc-900 
                 rounded-[2rem] shadow-xl dark:shadow-black/50 
                 border border-gray-200/50 dark:border-zinc-800 
                 p-2 transition-all hover:shadow-2xl hover:border-gray-300 dark:hover:border-zinc-700
             `}>
                
                {/* Input Field */}
                <textarea
                   value={inputValue}
                   onChange={(e) => setInputValue(e.target.value)}
                   onKeyDown={(e) => {
                      if(e.key === 'Enter' && !e.shiftKey) {
                         e.preventDefault();
                         handleSendMessage();
                      }
                   }}
                   placeholder={activeMode === 'search' ? "Ask anything to QPGPT..." : "Describe the quiz you want to generate..."}
                   className="w-full bg-transparent border-none text-gray-900 dark:text-white placeholder:text-gray-400 text-lg px-4 py-3 focus:ring-0 focus:outline-none outline-none resize-none min-h-[60px] max-h-[150px]"
                   rows={1}
                />

                {/* File Attachment Badge */}
                {attachedFile && (
                   <div className="mx-4 mb-2 inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 animate-in zoom-in">
                      <FileText className="w-3 h-3" />
                      <span className="max-w-[200px] truncate">{attachedFile.name}</span>
                      <button onClick={() => setAttachedFile(null)} className="hover:text-red-500 ml-1"><X className="w-3 h-3"/></button>
                   </div>
                )}

                {/* Control Bar */}
                <div className="flex items-center justify-between px-2 pb-1">
                   
                   {/* Left Controls */}
                   <div className="flex items-center gap-2">
                      <input 
                         type="file" 
                         ref={fileInputRef} 
                         className="hidden" 
                         accept=".pdf,.docx,.txt"
                         onChange={(e) => e.target.files?.[0] && setAttachedFile(e.target.files[0])} 
                      />
                      <button 
                         onClick={() => fileInputRef.current?.click()}
                         className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                         title="Attach File"
                      >
                         <Paperclip className="w-5 h-5" />
                      </button>

                      <div className="h-4 w-px bg-gray-200 dark:bg-zinc-700 mx-1"></div>

                      {/* Mode Toggles */}
                      <button 
                         onClick={() => setActiveMode('deepthink')}
                         className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                            activeMode === 'deepthink' 
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800' 
                            : 'bg-transparent text-gray-500 border-transparent hover:bg-gray-50 dark:hover:bg-zinc-800'
                         }`}
                      >
                         <BrainCircuit className="w-3.5 h-3.5" />
                         DeepThink (R1)
                      </button>

                      <button 
                         onClick={() => setActiveMode('search')}
                         className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                            activeMode === 'search' 
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
                            : 'bg-transparent text-gray-500 border-transparent hover:bg-gray-50 dark:hover:bg-zinc-800'
                         }`}
                      >
                         <Globe className="w-3.5 h-3.5" />
                         Search
                      </button>
                   </div>

                   {/* Right: Send Button */}
                   <button 
                      onClick={handleSendMessage}
                      disabled={(!inputValue.trim() && !attachedFile) || isTyping}
                      className={`
                         w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md
                         ${(!inputValue.trim() && !attachedFile) 
                            ? 'bg-gray-200 dark:bg-zinc-800 text-gray-400 cursor-not-allowed' 
                            : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 shadow-blue-500/30'}
                      `}
                   >
                      <ArrowUp className="w-5 h-5" strokeWidth={3} />
                   </button>
                </div>
             </div>

             {/* Footer Text (Only visible on Hero) */}
             {!hasStarted && (
                <div className="mt-8 flex justify-center gap-8 text-xs font-medium text-gray-400 dark:text-gray-500 animate-in fade-in slide-in-from-bottom-4 delay-200">
                   <div className="flex items-center gap-2">
                      <Sparkles className="w-3 h-3" /> DeepSeek V3 Architecture
                   </div>
                   <div className="flex items-center gap-2">
                      <Globe className="w-3 h-3" /> Global Knowledge Base
                   </div>
                </div>
             )}
         </div>
      </div>
    </div>
  );
};

export default QPGPT;
