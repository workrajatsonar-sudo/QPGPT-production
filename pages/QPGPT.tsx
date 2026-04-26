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
  Download,
  Search as SearchIcon,
  MessageSquare
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

type Mode = 'search' | 'deepthink';
type GenStep = 'MEDIUM' | 'CLASS' | 'SUBJECT' | 'EXAM_TYPE' | 'DIFFICULTY' | 'REDIRECT';

const QPGPT = () => {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [thoughtProcess, setThoughtProcess] = useState<string[]>([]);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [activeMode, setActiveMode] = useState<Mode>('search');
  const [genStep, setGenStep] = useState<GenStep>('MEDIUM');
  const [searchResults, setSearchResults] = useState<FileRecord[]>([]);
  const [genContext, setGenContext] = useState({ medium: '', class: '', subject: '', examType: '', difficulty: '' });
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // --- COGNITIVE ENGINE ---
  
  // 1. Fuzzy Logic Dictionary
  const DICTIONARY = {
    subjects: ['Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'English', 'Hindi', 'Gujarati', 'Computer Science', 'Sanskrit'],
    classes: ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'],
    intents: ['search', 'generate', 'upload', 'help', 'settings']
  };

  // 2. Levenshtein Distance for Correction
  const getEditDistance = (a: string, b: string): number => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = Array.from({ length: b.length + 1 }, () => Array(a.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(matrix[j - 1][i] + 1, matrix[j][i - 1] + 1, matrix[j - 1][i - 1] + cost);
      }
    }
    return matrix[b.length][a.length];
  };

  // 3. Smart Corrector
  const autoCorrect = (word: string, category: keyof typeof DICTIONARY): string => {
    let bestMatch = word;
    let minDistance = 3; // Max threshold for correction
    DICTIONARY[category].forEach(term => {
      const dist = getEditDistance(word.toLowerCase(), term.toLowerCase());
      if (dist < minDistance) {
        minDistance = dist;
        bestMatch = term;
      }
    });
    return bestMatch;
  };

  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase.from('app_settings').select('*').maybeSingle();
      if (data) setSettings(data);
    };
    loadSettings();
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isTyping, thoughtProcess]);
  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };

  const addBotMessage = async (text: string, isResult = false, options: Message['options'] = null, thoughts?: string[]) => {
    setIsTyping(true);
    
    // Cognitive Animation Logic
    if (thoughts) {
      for (const t of thoughts) {
        setThoughtProcess(prev => [...prev, t]);
        await new Promise(r => setTimeout(r, 600)); // Simulate thinking duration
      }
    }

    const delay = Math.min(1000, 400 + text.length * 5);
    setTimeout(() => {
      setIsTyping(false);
      setThoughtProcess([]); // Clear thoughts before showing final answer
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
    setMessages(prev => [...prev, { id: Math.random().toString(), role: 'user', content: text }]);
  };

  const handleSendMessage = async (textOverride?: string) => {
    const text = textOverride || inputValue.trim();
    if (!text && !attachedFile) return;
    if (settings && !settings.qpgpt_enabled) return;

    setInputValue("");
    addUserMessage(text || (attachedFile ? `[Attached File: ${attachedFile.name}]` : ""));
    setAttachedFile(null);

    // --- COGNITIVE PIPELINE ---
    const thoughts: string[] = [];
    
    // Spelling Correction Check
    const words = text.split(' ');
    const correctedWords = words.map(w => {
      const corr = autoCorrect(w, 'subjects');
      return corr;
    });
    const correctedText = correctedWords.join(' ');

    // Intent Detection
    if (correctedText.toLowerCase().includes('generate') || correctedText.toLowerCase().includes('create')) {
        if (messages.length === 0) {
            await addBotMessage("DeepThink Initialized. Let's build a custom paper. What's the Medium? (English / Hindi / Gujarati)", false, null, ["Switching to Generation Flow"]);
            startGenerationFlow();
        } else {
            processGenerationFlow(correctedText);
        }
        return;
    }

    if (processConversation(text)) return;

    if (activeMode === 'search') {
        await processSearchIntent(correctedText, []);
    } else {
        if (messages.length === 0) startGenerationFlow();
        else await processGenerationFlow(text);
    }
  };

  const processConversation = (text: string): boolean => {
      const lower = text.toLowerCase().trim();
      if (/^(hi|hey|hello|hiya|yo|hola|greetings|hlo)(\s|[!.?])?$/i.test(lower)) {
          addBotMessage("Hey there! 👋 I'm your AI education assistant. How can I help you excel today?", false, null);
          return true;
      }
      return false;
  };

  const processSearchIntent = async (text: string, thoughts: string[]) => {
    const stopWords = ['i', 'want', 'a', 'the', 'pdf', 'find', 'show', 'search', 'get', 'please', 'papers', 'question', 'paper'];
    const keywords = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => !stopWords.includes(w) && w.length > 1);
    const searchQuery = keywords.join(' ');

    if (!searchQuery) {
        addBotMessage("I'm ready to find resources. Could you specify a topic, like 'Standard 10 Science'?", false, null);
        return;
    }

    setIsTyping(true);
    try {
        const orConditions = keywords.map(word => `title.ilike.%${word}%,description.ilike.%${word}%`).join(',');
        const { data, error } = await supabase.from('files').select('*, mediums(name), standards(name), subjects(name)').eq('approval_status', 'approved').eq('visibility', 'public').or(orConditions).limit(8);
        if (error) throw error;

        const results = (data as FileRecord[] || []).slice(0, 4);
        setIsTyping(false);
        
        if (results.length > 0) {
            setSearchResults(results);
            addBotMessage(`I've analyzed the platform and found ${results.length} relevant resources for "${searchQuery}":`, true, null);
        } else {
            setSearchResults([]);
            addBotMessage(`I searched for "${searchQuery}" but couldn't find a direct match. Would you like me to generate a new quiz for you?`, false, 'fallback');
        }
    } catch (err) {
        setIsTyping(false);
        addBotMessage("I'm having trouble reaching the database. Please try again soon.", false, null, thoughts);
    }
  };

  const processGenerationFlow = async (text: string) => {
      const lowerText = text.toLowerCase();
      const nextContext = { ...genContext };

      switch (genStep) {
          case 'MEDIUM':
              nextContext.medium = lowerText.includes('hindi') ? 'Hindi' : lowerText.includes('gujarati') ? 'Gujarati' : 'English';
              setGenContext(nextContext);
              setGenStep('CLASS');
              addBotMessage(`Perfect, ${nextContext.medium} it is. Which Grade/Standard should we target?`);
              break;
          case 'CLASS':
              nextContext.class = text;
              setGenContext(nextContext);
              setGenStep('SUBJECT');
              addBotMessage(`Excellent. And which Subject within ${text}?`);
              break;
          case 'SUBJECT':
              nextContext.subject = text;
              setGenContext(nextContext);
              setGenStep('EXAM_TYPE');
              addBotMessage("What's the Exam Type? (e.g., Board, Unit Test, or Homework)");
              break;
          case 'EXAM_TYPE':
              nextContext.examType = text;
              setGenContext(nextContext);
              setGenStep('DIFFICULTY');
              addBotMessage("Finally, select Difficulty: Easy, Medium, or Hard?");
              break;
          case 'DIFFICULTY':
              nextContext.difficulty = text;
              setGenContext(nextContext);
              setGenStep('REDIRECT');
              addBotMessage("Initializing Neural Engine. Preparing your custom generation workspace...", false, 'generation_prompt');
              setTimeout(() => navigate('/generate'), 2500);
              break;
      }
  };

  const startGenerationFlow = () => {
      setActiveMode('deepthink');
      setGenStep('MEDIUM');
      setGenContext({ medium: '', class: '', subject: '', examType: '', difficulty: '' });
      addBotMessage("DeepThink Initialized. Let's build a custom paper. What's the Medium? (English / Hindi / Gujarati)");
  };

  const suggestions = [
    { label: "Find 10th Math papers", query: "Class 10 Mathematics", icon: SearchIcon },
    { label: "Create Physics Quiz", query: "I want to generate physics quiz", icon: Zap },
    { label: "Science Question Bank", query: "Science question bank pdf", icon: Download }
  ];

  return (
    <div className="flex flex-col h-[calc(100dvh-64px)] font-sans relative overflow-hidden bg-page text-txt">
      
      {/* 1. Immersive DeepSeek Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-0 right-0 h-[60vh] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand/20 via-page to-transparent opacity-50"></div>
          <div className="absolute bottom-0 left-0 right-0 h-[30vh] bg-gradient-to-t from-brand/5 to-transparent"></div>
          {/* Neural dots decoration */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" 
               style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '32px 32px' }}>
          </div>
      </div>

      {/* 2. Chat Area */}
      <div className="flex-1 overflow-y-auto scroll-smooth relative z-10 px-4">
          {!messages.length ? (
            <div className="min-h-[70vh] flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
               <div className="mb-8 p-6 bg-card backdrop-blur-xl rounded-[2.5rem] border border-border/50 shadow-glass relative group">
                  <div className="absolute inset-0 bg-brand/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
                  <Bot className="w-16 h-16 text-brand relative z-10" />
               </div>

               <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 text-txt">
                  How can I help you <br/>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand to-purple-500 italic">excel</span> today?
               </h1>
               
               <p className="text-muted text-lg max-w-xl mx-auto mb-12">
                  Find any question paper or use AI to generate fresh quizzes in seconds.
               </p>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full">
                  {suggestions.map((s, i) => (
                    <button 
                      key={i} 
                      onClick={() => { setActiveMode(i === 1 ? 'deepthink' : 'search'); handleSendMessage(s.query); }}
                      className="p-4 bg-card border border-border rounded-2xl hover:border-brand/40 hover:bg-brand/5 transition-all text-left shadow-sm group"
                    >
                      <s.icon className="w-5 h-5 text-brand mb-3 group-hover:scale-110 transition-transform" />
                      <p className="font-semibold text-txt text-sm">{s.label}</p>
                      <p className="text-muted text-[11px] mt-1 italic">Click to try</p>
                    </button>
                  ))}
               </div>
            </div>
         ) : (
            <div className="max-w-3xl mx-auto py-12 space-y-10 pb-40">
               {messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-4 animate-in slide-in-from-bottom-4 duration-500 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     {msg.role === 'assistant' && (
                        <div className="w-10 h-10 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand flex-shrink-0 mt-1 shadow-glass">
                           <Bot className="w-6 h-6" />
                        </div>
                     )}
                     <div className="max-w-[85%] space-y-3">
                        <div className={`px-6 py-4 rounded-2xl text-[15px] leading-relaxed shadow-glass border ${
                           msg.role === 'user' 
                           ? 'bg-brand text-inv border-brand rounded-tr-sm' 
                           : 'bg-card border-border text-txt rounded-tl-sm'
                        }`}>
                           {msg.content}
                        </div>

                        {msg.isResult && searchResults.length > 0 && (
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                              {searchResults.map(paper => (
                                 <div key={paper.id} 
                                      onClick={() => downloadFile(paper.file_path, 'question-files')}
                                      className="bg-card p-4 rounded-xl border border-border hover:border-brand hover:shadow-brand/5 transition-all group cursor-pointer flex flex-col gap-2 shadow-glass"
                                 >
                                    <div className="flex items-start justify-between">
                                       <div className="p-2 bg-brand/10 text-brand rounded-lg"><FileText className="w-5 h-5" /></div>
                                       <span className="text-[10px] uppercase font-bold text-muted">{paper.mediums?.name}</span>
                                    </div>
                                    <h4 className="font-bold text-txt text-sm line-clamp-2">{paper.title}</h4>
                                    <div className="flex items-center gap-1 text-xs text-brand font-bold mt-2">
                                        <Download className="w-3.5 h-3.5" /> Download PDF
                                    </div>
                                 </div>
                              ))}
                           </div>
                        )}

                        {msg.options === 'fallback' && (
                            <div className="flex flex-wrap gap-3 mt-4">
                                <button onClick={startGenerationFlow} className="px-5 py-2.5 bg-brand-hover text-inv rounded-xl text-xs font-bold hover:scale-105 transition-all flex items-center gap-2 shadow-glass">
                                   <Zap className="w-4 h-4" /> Start AI Generation
                                </button>
                                <button onClick={() => navigate('/upload')} className="px-5 py-2.5 bg-card border border-border text-txt rounded-xl text-xs font-bold hover:bg-page transition-all flex items-center gap-2 shadow-glass">
                                   <Upload className="w-4 h-4" /> Upload Instead
                                </button>
                            </div>
                        )}
                     </div>
                  </div>
               ))}
               
               {/* Bot Typing and Thinking Process */}
               {(isTyping || thoughtProcess.length > 0) && (
                  <div className="flex justify-start gap-4 animate-in fade-in duration-300">
                     <div className="w-10 h-10 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand flex-shrink-0 mt-1 shadow-glass">
                        <Bot className="w-6 h-6" />
                     </div>
                     <div className="space-y-3 flex-1 max-w-[85%]">
                        {/* Thought Process Block (DeepSeek style) */}
                        {thoughtProcess.length > 0 && (
                           <div className="bg-page/50 border-l-2 border-brand/30 px-4 py-3 rounded-r-xl space-y-2 animate-in slide-in-from-left-2 duration-500">
                              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-muted mb-1">
                                 <BrainCircuit className="w-3 h-3 animate-pulse" /> Thought Process
                              </div>
                              {thoughtProcess.map((thought, idx) => (
                                 <div key={idx} className="text-xs text-muted/80 flex items-center gap-2 animate-in fade-in duration-300">
                                    <div className="w-1 h-1 bg-brand/40 rounded-full"></div>
                                    {thought}
                                 </div>
                              ))}
                           </div>
                        )}

                        {/* Typing Animation */}
                        {isTyping && (
                           <div className="bg-card border border-border px-6 py-4 rounded-2xl rounded-tl-sm shadow-glass flex items-center gap-2 w-fit">
                              <div className="w-2 h-2 bg-brand rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-brand rounded-full animate-bounce [animation-delay:0.2s]"></div>
                              <div className="w-2 h-2 bg-brand rounded-full animate-bounce [animation-delay:0.4s]"></div>
                           </div>
                        )}
                     </div>
                  </div>
               )}
               <div ref={messagesEndRef} />
            </div>
         )}
      </div>

      {/* 3. Global Control Bar */}
      <div className={`p-4 border-t border-border bg-page/80 backdrop-blur-2xl relative z-20 transition-all duration-700`}>
         <div className="max-w-3xl mx-auto">
            <div className={`shadow-glass border border-border rounded-[2rem] bg-card p-2 transition-all focus-within:border-brand/40 group`}>
               <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                  placeholder={activeMode === 'search' ? "Ask QPGPT to find papers..." : "Define your custom quiz..."}
                  className="w-full bg-transparent border-none text-txt placeholder:text-muted/60 text-lg px-5 py-3 outline-none resize-none min-h-[50px] max-h-[200px]"
                  rows={1}
               />

               <div className="flex items-center justify-between px-2 pb-1">
                  <div className="flex items-center gap-1.5">
                     <div className="w-px h-5 bg-border mx-1"></div>
                     <button 
                        onClick={() => setActiveMode('deepthink')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                           activeMode === 'deepthink' ? 'bg-brand/10 text-brand border-brand/30' : 'text-muted border-transparent hover:bg-page'
                        }`}
                     >
                        <BrainCircuit className="w-4 h-4" /> DeepThink
                     </button>
                     <button 
                        onClick={() => setActiveMode('search')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                           activeMode === 'search' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'text-muted border-transparent hover:bg-page'
                        }`}
                     >
                        <Globe className="w-4 h-4" /> Search
                     </button>
                  </div>

                  <button 
                    onClick={() => handleSendMessage()}
                    disabled={!inputValue.trim() && !attachedFile}
                    className="w-12 h-12 bg-brand text-inv rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-glass disabled:opacity-30"
                  >
                    <ArrowUp className="w-6 h-6" strokeWidth={3} />
                  </button>
               </div>
            </div>

            {/* Hidden Input - kept for possible future use */}
            <input type="file" ref={fileInputRef} className="hidden" onChange={e => setAttachedFile(e.target.files?.[0] || null)} />
         </div>
      </div>
    </div>
  );
};

export default QPGPT;
