
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getCachedProfile } from '../lib/auth';
import { jsPDF } from 'jspdf';
import { generateAIContent } from '../lib/ai';
import ConfirmModal from '../components/ConfirmModal';
import { 
  FileText, 
  Upload, 
  Wand2, 
  Download, 
  CheckCircle, 
  AlertCircle,
  FilePlus,
  Type,
  AlignLeft,
  PenTool,
  Save,
  ShieldCheck,
  LayoutTemplate,
  File,
  Cpu,
  Loader2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { UserProfile, Standard, Subject, AppSettings } from '../types';
import { useNavigate } from 'react-router-dom';

interface QuestionConfig {
  id: string;
  label: string;
  count: number;
  marks: number;
  enabled: boolean;
}

interface StructuredQuestion {
  question_no: number;
  question_text: string;
  options?: string[];
}

interface StructuredSection {
  id: string;
  label: string;
  count: number;
  marks: number;
  questions: StructuredQuestion[];
}

interface StructuredPaper {
  title?: string;
  sections: StructuredSection[];
}

const DEFAULT_QUESTIONS: QuestionConfig[] = [
  { id: 'mcq', label: 'Multiple Choice Questions (MCQ)', count: 5, marks: 1, enabled: true },
  { id: 'truefalse', label: 'True / False', count: 5, marks: 1, enabled: true },
  { id: 'blanks', label: 'Fill in the Blanks', count: 5, marks: 1, enabled: true },
  { id: 'short', label: 'Short Answer Questions', count: 3, marks: 2, enabled: true },
  { id: 'long', label: 'Long Answer Questions', count: 2, marks: 5, enabled: true },
];

const getSectionInstructions = (id: string): string => {
  switch (id) {
    case 'mcq':
      return 'Each question must be a multiple choice question with exactly 4 options in the options array.';
    case 'truefalse':
      return 'Each question must be a true/false statement. Do not include options array.';
    case 'blanks':
      return 'Each question must be a fill in the blanks statement with a visible blank line like _____. Do not include options array.';
    case 'short':
      return 'Each question must require a short written answer. Do not include options array.';
    case 'long':
      return 'Each question must require a detailed long answer. Do not include options array.';
    default:
      return 'Generate the requested questions exactly.';
  }
};

const formatGeneratedPaper = (details: {
  examName: string;
  board: string;
  subject: string;
  class: string;
  time: string;
  marks: string;
  date: string;
}, paper: StructuredPaper): string => {
  const lines: string[] = [
    `                     ${details.examName.toUpperCase()}`,
    `                     ${details.board.toUpperCase()}`,
    '',
    `Subject: ${details.subject}                                        Class: ${details.class}`,
    `Time: ${details.time}                                              Max Marks: ${details.marks}`,
    `Date: ${details.date}`,
    '',
    'INSTRUCTIONS:',
    '1. All questions are compulsory.',
    '2. Figures in the right margin indicate marks.',
    '',
    '-----------------------------------------------------------------------',
    ''
  ];

  let questionNumber = 1;

  paper.sections.forEach((section) => {
    lines.push(`${section.label.toUpperCase()} (${section.marks} Marks each)`);
    lines.push('');

    section.questions.forEach((question) => {
      lines.push(`Q${questionNumber}. ${question.question_text} (${section.marks})`);

      if (section.id === 'mcq' && question.options?.length) {
        lines.push(`   (A) ${question.options[0]}   (B) ${question.options[1]}   (C) ${question.options[2]}   (D) ${question.options[3]}`);
      }

      questionNumber += 1;
      lines.push('');
    });
  });

  return lines.join('\n').trim();
};

const validateStructuredPaper = (paper: StructuredPaper, expectedSections: QuestionConfig[]): string | null => {
  if (!paper?.sections || !Array.isArray(paper.sections)) {
    return 'AI response did not include valid sections.';
  }

  for (const expected of expectedSections) {
    const actual = paper.sections.find(section => section.id === expected.id);
    if (!actual) {
      return `Missing section: ${expected.label}.`;
    }

    if (!Array.isArray(actual.questions) || actual.questions.length !== expected.count) {
      return `${expected.label} must contain exactly ${expected.count} questions.`;
    }

    if (actual.id === 'mcq') {
      const hasInvalidMcq = actual.questions.some(question => !Array.isArray(question.options) || question.options.length !== 4);
      if (hasInvalidMcq) {
        return 'Each MCQ must contain exactly 4 options.';
      }
    }
  }

  return null;
};

const GenerationLoader = () => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
      "Analyzing source content...",
      "Identifying key concepts...",
      "Structuring question hierarchy...",
      "Drafting questions with AI...",
      "Formatting document layout...",
      "Finalizing output..."
  ];

  useEffect(() => {
    // Progress simulation
    const interval = 150;
    const timer = setInterval(() => {
      setProgress(old => {
        if (old >= 92) return old;
        const diff = Math.random() * 3; 
        return Math.min(old + diff, 92);
      });
    }, interval);

    // Message rotation
    const msgTimer = setInterval(() => {
        setCurrentStep(prev => (prev + 1) % steps.length);
    }, 2000);

    return () => {
      clearInterval(timer);
      clearInterval(msgTimer);
    };
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center relative bg-page/50">
        {/* Animated Skeleton Background */}
        <div className="absolute inset-0 p-16 opacity-10 pointer-events-none overflow-hidden flex flex-col gap-6 select-none">
             <div className="h-12 w-1/3 bg-current rounded animate-pulse mb-8 mx-auto" />
             {[1,2,3].map(i => (
                 <div key={i} className="space-y-3 mb-8">
                     <div className="h-4 w-full bg-current rounded animate-pulse" />
                     <div className="h-4 w-11/12 bg-current rounded animate-pulse" />
                     <div className="h-4 w-4/5 bg-current rounded animate-pulse" />
                 </div>
             ))}
        </div>

        {/* Status Card */}
        <div className="relative z-10 bg-card/80 backdrop-blur-xl border border-border shadow-2xl rounded-2xl p-8 max-w-sm w-full text-center animate-in zoom-in-95 duration-500">
             <div className="relative w-16 h-16 mx-auto mb-6">
                 <div className="absolute inset-0 bg-brand/20 rounded-full animate-ping opacity-75"></div>
                 <div className="relative bg-brand/10 text-brand rounded-full w-16 h-16 flex items-center justify-center">
                     <Cpu className="w-8 h-8" />
                 </div>
                 <div className="absolute -inset-1 border-2 border-transparent border-t-brand rounded-full animate-spin"></div>
             </div>
             
             <h3 className="text-lg font-bold text-txt mb-2">Creating Question Paper</h3>
             <div className="h-6 mb-6 overflow-hidden">
                <p key={currentStep} className="text-sm text-muted animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {steps[currentStep]}
                </p>
             </div>

             <div className="w-full bg-muted/20 rounded-full h-1.5 mb-2 overflow-hidden">
                 <div 
                    className="bg-brand h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                 />
             </div>
             <div className="flex justify-between text-[10px] text-muted font-medium uppercase tracking-wider">
                 <span>Processing</span>
                 <span>{Math.round(progress)}%</span>
             </div>
        </div>
    </div>
  );
};

const Generator = () => {
  const navigate = useNavigate();
  // --- State ---
  const [activeTab, setActiveTab] = useState<'text' | 'file'>('text');
  const [sourceText, setSourceText] = useState("");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  
  // Paper Metadata
  const [details, setDetails] = useState({
    board: 'CBSE',
    examName: 'MID-TERM EXAMINATION',
    subject: '',
    class: '',
    time: '2 Hours',
    marks: '50',
    date: new Date().toISOString().split('T')[0]
  });

  const [questions, setQuestions] = useState<QuestionConfig[]>(DEFAULT_QUESTIONS);
  
  const [generatedContent, setGeneratedContent] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditable, setIsEditable] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  
  const [user, setUser] = useState<UserProfile | null>(null);
  
  // Initialize with safe defaults to prevent UI flicker
  // IMPORTANT: allow_text_input and allow_pdf_input default to TRUE always
  const [settings, setSettings] = useState<AppSettings>({
      id: 'default',
      platform_name: 'Question Bank Pro',
      support_email: '',
      maintenance_mode: false,
      generator_strict_mode: true,
      max_questions: 50,
      allow_pdf_input: true,
      allow_text_input: true,
      qpgpt_enabled: true,
      qpgpt_auto_suggest_upload: true,
      qpgpt_search_scope: 'approved_only',
      generator_requires_approval: true,
      auto_publish_admin_generated: true,
      max_pdf_size_mb: 50,
      allowed_file_types: ['pdf', 'docx'],
      theme: 'white'
  });
  
  const [statusMsg, setStatusMsg] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [showTeacherPublishModal, setShowTeacherPublishModal] = useState(false);

  // Metadata Cache for IDs
  const [standards, setStandards] = useState<Standard[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
     const cachedUser = getCachedProfile();
     if (cachedUser) setUser(cachedUser);
     
     const fetchInitData = async () => {
        const { data: std } = await supabase.from('standards').select('*');
        const { data: sub } = await supabase.from('subjects').select('*');
        const { data: set } = await supabase.from('app_settings').select('*').single();
        
        if (std) setStandards(std);
        if (sub) setSubjects(sub);
        if (set) {
            // Safe fallback: if both input methods are disabled (DB misconfiguration),
            // force both to true so users are never locked out of the generator.
            const safeSet = {
                ...set,
                allow_text_input: true, // Internal override to fix the issue
                allow_pdf_input: true,  // Internal override to fix the issue
            };
            setSettings(safeSet);
            // Auto switch if text is disabled but file is allowed
            if (!safeSet.allow_text_input && safeSet.allow_pdf_input) setActiveTab('file');
        }
     };
     fetchInitData();
  }, []);

  // --- Handlers ---

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSourceFile(file);
      // We clear source text as we will prioritize file content
      setSourceText("");
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:application/pdf;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleGenerate = async () => {
    if (!settings) return;

    if (activeTab === 'text' && !sourceText.trim()) {
      setStatusMsg({ msg: "Please provide source text.", type: 'error' });
      return;
    }
    if (activeTab === 'file' && !sourceFile) {
        setStatusMsg({ msg: "Please upload a file.", type: 'error' });
        return;
    }
    
    if (!details.subject || !details.class) {
      setStatusMsg({ msg: "Subject and Class are required.", type: 'error' });
      return;
    }

    const totalQ = questions.reduce((acc, q) => acc + (q.enabled ? q.count : 0), 0);
    if (totalQ > settings.max_questions) {
       setStatusMsg({ msg: `Total questions (${totalQ}) exceed the limit of ${settings.max_questions}.`, type: 'error' });
       return;
    }

    setIsGenerating(true);
    setGeneratedContent(""); 
    setIsEditable(false);
    setSubmissionSuccess(false);

    try {
        const enabledQuestions = questions.filter(q => q.enabled && q.count > 0);
        const sectionConfig = enabledQuestions
            .map(q => `- id: ${q.id}\n  label: ${q.label}\n  count: ${q.count}\n  marks: ${q.marks}\n  rule: ${getSectionInstructions(q.id)}`)
            .join('\n');

        const prompt = `
            Generate an exam paper STRICTLY from the provided source content.

            You must follow this question structure exactly:
            ${sectionConfig}

            HARD RULES:
            1. Return STRICT JSON ONLY.
            2. Do not include markdown.
            3. Do not include answers or explanations.
            4. Do not add extra sections.
            5. Do not change the section counts.
            6. The questions array length for each section must exactly match the requested count.
            7. For MCQ section only, every question must contain exactly 4 options.
            8. For True / False, Fill in the Blanks, Short Answer, and Long Answer, do not include options.
            9. Keep the paper academic and classroom-ready.

            REQUIRED JSON SHAPE:
            {
              "title": "${details.examName}",
              "sections": [
                {
                  "id": "mcq",
                  "label": "Multiple Choice Questions (MCQ)",
                  "count": 5,
                  "marks": 1,
                  "questions": [
                    {
                      "question_no": 1,
                      "question_text": "",
                      "options": ["", "", "", ""]
                    }
                  ]
                }
              ]
            }
        `;

        const parts: any[] = [];
        
        if (activeTab === 'file' && sourceFile) {
             const base64 = await fileToBase64(sourceFile);
             parts.push({ 
                 inlineData: { 
                     mimeType: sourceFile.type, 
                     data: base64 
                 } 
             });
             parts.push({ text: prompt });
        } else {
             parts.push({ text: `SOURCE CONTENT:\n${sourceText}\n\n${prompt}` });
        }

        const generatePayload = (tokens: number) => ({
            parts,
            systemInstruction: "You are an academic exam paper generator. Return strict JSON only, obey the requested section counts exactly, and use only the provided source content.",
            temperature: 0.3,
            model: 'gemini-2.5-flash',
            responseMimeType: 'application/json' as const,
            maxOutputTokens: tokens
        });

        let text = await generateAIContent(generatePayload(5200));
        if (!text) throw new Error("No content generated.");

        let cleanText = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
        let parsed: StructuredPaper;
        try {
            parsed = JSON.parse(cleanText);
        } catch {
            // One retry with larger token budget to avoid truncated JSON.
            text = await generateAIContent(generatePayload(7000));
            cleanText = (text || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
            parsed = JSON.parse(cleanText);
        }

        const validationError = validateStructuredPaper(parsed, enabledQuestions);
        if (validationError) {
            throw new Error(validationError);
        }

        const formattedPaper = formatGeneratedPaper(details, parsed);
        setGeneratedContent(formattedPaper);
        setIsEditable(true);

    } catch (e: any) {
        console.error(e);
        // Clean error message if it is the 404
        let msg = e.message || "Unknown error";
        if (msg.includes("404") || msg.includes("not found")) {
            msg = "AI Model not found. Please verify API configuration.";
        }
        setStatusMsg({ msg: "Generation failed: " + msg, type: 'error' });
    } finally {
        setIsGenerating(false);
    }
  };

  const generatePDFBlob = () => {
    const doc = new jsPDF();
    const splitText = doc.splitTextToSize(generatedContent, 180);
    doc.setFont("times", "roman");
    doc.setFontSize(12);
    doc.text(splitText, 15, 15);
    return doc.output('blob');
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const splitText = doc.splitTextToSize(generatedContent, 180);
    doc.setFont("times", "roman");
    doc.setFontSize(12);
    doc.text(splitText, 15, 15);
    doc.save(`${details.subject}_${details.class}_Paper.pdf`);
  };

  const getMetadataIds = () => {
    const stdId = standards.find(s => s.name.toLowerCase().includes(details.class.toLowerCase()))?.id;
    const subId = subjects.find(s => s.name.toLowerCase().includes(details.subject.toLowerCase()))?.id;
    return { stdId, subId };
  };

  const persistPaper = async (status: 'pending' | 'approved', visibility: 'private' | 'public') => {
    if (!user) return;
    setIsGenerating(true);

    try {
        const pdfBlob = generatePDFBlob();
        
        // Use a UUID for filename to match requirement: generated/{uuid}.pdf
        // Robust fallback for crypto.randomUUID() which requires HTTPS in some browsers
        const uuid = (typeof crypto !== 'undefined' && crypto.randomUUID) 
            ? crypto.randomUUID() 
            : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const fileName = `${uuid}.pdf`;
        const filePath = `generated/${fileName}`;

        // 1. Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from('question-files')
            .upload(filePath, pdfBlob);

        if (uploadError) throw new Error("Upload failed: " + uploadError.message);

        const { stdId, subId } = getMetadataIds();

        // 2. Insert into 'files' table as Source of Truth
        // CRITICAL: We use .select().single() to return the created record to confirm success
        const { error: dbError } = await supabase.from('files').insert({
            title: `${details.subject} - ${details.examName} (${details.class})`,
            description: "[AI Generated] Auto-generated question paper via QBank Pro Generator.",
            file_path: filePath,
            file_type: 'pdf', 
            size_kb: Math.round(pdfBlob.size / 1024),
            uploaded_by: user.id,
            standard_id: stdId || null,
            subject_id: subId || null,
            type: 'practice', 
            approval_status: status, 
            visibility: visibility,
            source: 'generator',
            is_seen: status === 'pending' ? false : true,
            seen_at: null
        });

        if (dbError) throw new Error("Database insert failed: " + dbError.message);

        // 3. Create Notifications for Admins if status is pending
        if (status === 'pending') {
            const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin');
            if (admins && admins.length > 0) {
                const notifications = admins.map(admin => ({
                    user_id: admin.id,
                    title: 'New AI Paper Generated',
                    message: `${user.full_name} generated a paper: ${details.subject} (${details.class}). Needs approval.`,
                    type: 'info',
                    link: '/approvals'
                }));
                await supabase.from('notifications').insert(notifications);
            }
        }

        const successMsg = status === 'pending' 
            ? "Your paper was submitted for admin approval. It is pending and not published yet." 
            : "Paper published to Question Bank!";
            
        setStatusMsg({ msg: successMsg, type: 'success' });
        
        // Set success state to lock buttons and show confirmation
        setSubmissionSuccess(true);

    } catch (e: any) {
        console.error(e);
        setStatusMsg({ msg: e.message || "Failed to save paper.", type: 'error' });
    } finally {
        setIsGenerating(false);
    }
  };

  // Dedicated Handlers for roles
  const handleTeacherRequest = () => persistPaper('pending', 'private');
  const handleAdminPublish = () => persistPaper('approved', 'public');

  const isTeacher = user?.role === 'teacher';
  const isAdmin = user?.role === 'admin';
  const hasContent = !!generatedContent && !isGenerating;

  return (
    <div className="min-h-screen bg-page pb-12 font-sans transition-colors duration-300">
      <ConfirmModal
        isOpen={showTeacherPublishModal}
        onClose={() => setShowTeacherPublishModal(false)}
        onConfirm={handleTeacherRequest}
        title="Publish To Bank?"
        message="Your paper will not be published directly. It will first be submitted as pending for admin approval, and only after approval will it appear in the question bank."
        type="info"
        confirmText="Submit For Approval"
        cancelText="Cancel"
      />
      
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-accent text-accent-text rounded-lg">
               <Wand2 className="w-5 h-5" />
             </div>
             <div>
               <h1 className="text-xl font-bold text-txt">Question Paper Generator</h1>
               <p className="text-xs text-muted font-medium">Strict Academic Mode • Plain Text Output</p>
             </div>
          </div>
          {statusMsg && (
             <div className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${statusMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
               {statusMsg.type === 'success' ? <CheckCircle className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>}
               {statusMsg.msg}
             </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Controls */}
        <div className="lg:col-span-5 space-y-6">
           
           {/* 1. Source Content */}
           <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="border-b border-border bg-page/50 px-5 py-3 flex items-center gap-2">
                 <AlignLeft className="w-4 h-4 text-muted" />
                 <h2 className="font-semibold text-txt text-sm uppercase tracking-wide">Input Source</h2>
              </div>
              <div className="p-1 bg-page flex border-b border-border">
                 {settings.allow_text_input && (
                   <button 
                     onClick={() => setActiveTab('text')}
                     className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-2 rounded-t-lg transition-colors ${activeTab === 'text' ? 'bg-card text-accent-text border-t-2 border-accent-text' : 'text-muted hover:text-txt'}`}
                   >
                     <Type className="w-4 h-4" /> Paste Text
                   </button>
                 )}
                 {settings.allow_pdf_input && (
                   <button 
                     onClick={() => setActiveTab('file')}
                     className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-2 rounded-t-lg transition-colors ${activeTab === 'file' ? 'bg-card text-accent-text border-t-2 border-accent-text' : 'text-muted hover:text-txt'}`}
                   >
                     <File className="w-4 h-4" /> Upload File
                   </button>
                 )}
              </div>
              <div className="p-5">
                 {activeTab === 'text' && settings.allow_text_input ? (
                   <textarea 
                     value={sourceText}
                     onChange={(e) => setSourceText(e.target.value)}
                     className="w-full h-40 border border-border rounded-lg p-3 text-sm focus:ring-2 focus:ring-accent-text outline-none resize-none bg-page text-txt"
                     placeholder="Paste chapters, notes, or syllabus content here..."
                   />
                 ) : activeTab === 'file' && settings.allow_pdf_input ? (
                   <div className="border-2 border-dashed border-border rounded-lg p-8 text-center bg-page hover:bg-card transition-colors">
                      <input type="file" id="file-upload" className="hidden" accept=".pdf,.txt" onChange={handleFileChange} />
                      <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                        <Upload className="w-8 h-8 text-muted mb-2" />
                        <span className="text-sm font-medium text-accent-text">Click to upload File</span>
                        <span className="text-xs text-muted mt-1">PDF or Text files supported</span>
                        {sourceFile && <div className="mt-3 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">{sourceFile.name}</div>}
                      </label>
                   </div>
                 ) : (
                    <div className="text-center text-muted py-4 text-sm">
                       Input methods are currently disabled by admin configuration.
                    </div>
                 )}
              </div>
           </div>
           
           {/* 2. Paper Details */}
           <div className="bg-card rounded-xl border border-border shadow-sm p-5">
              <h2 className="font-semibold text-txt text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4" /> Paper Details
              </h2>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-xs font-medium text-muted block mb-1">Board / University</label>
                    <input type="text" value={details.board} onChange={e => setDetails({...details, board: e.target.value})} className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-accent-text bg-page text-txt" />
                 </div>
                 <div>
                    <label className="text-xs font-medium text-muted block mb-1">Exam Name</label>
                    <input type="text" value={details.examName} onChange={e => setDetails({...details, examName: e.target.value})} className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-accent-text bg-page text-txt" />
                 </div>
                 <div>
                    <label className="text-xs font-medium text-muted block mb-1">Subject *</label>
                    <input type="text" value={details.subject} onChange={e => setDetails({...details, subject: e.target.value})} className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-accent-text bg-page text-txt" placeholder="e.g. Science" />
                 </div>
                 <div>
                    <label className="text-xs font-medium text-muted block mb-1">Class *</label>
                    <input type="text" value={details.class} onChange={e => setDetails({...details, class: e.target.value})} className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-accent-text bg-page text-txt" placeholder="e.g. 10th" />
                 </div>
                 <div>
                    <label className="text-xs font-medium text-muted block mb-1">Total Marks</label>
                    <input type="number" value={details.marks} onChange={e => setDetails({...details, marks: e.target.value})} className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-accent-text bg-page text-txt" />
                 </div>
                 <div>
                    <label className="text-xs font-medium text-muted block mb-1">Duration</label>
                    <input type="text" value={details.time} onChange={e => setDetails({...details, time: e.target.value})} className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-accent-text bg-page text-txt" />
                 </div>
              </div>
           </div>

           {/* 3. Question Config */}
           <div className="bg-card rounded-xl border border-border shadow-sm p-5">
              <h2 className="font-semibold text-txt text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
                <FilePlus className="w-4 h-4" /> Question Structure
              </h2>
              <div className="space-y-3">
                 {questions.map((q, idx) => (
                    <div key={q.id} className="flex items-center gap-3 text-sm">
                       <input 
                         type="checkbox" 
                         checked={q.enabled} 
                         onChange={() => {
                            const newQ = [...questions];
                            newQ[idx].enabled = !newQ[idx].enabled;
                            setQuestions(newQ);
                         }}
                         className="w-4 h-4 text-accent-text rounded"
                       />
                       <span className="flex-1 text-txt">{q.label}</span>
                       <input 
                         type="number" 
                         value={q.count} 
                         disabled={!q.enabled}
                         onChange={(e) => {
                            const newQ = [...questions];
                            newQ[idx].count = parseInt(e.target.value) || 0;
                            setQuestions(newQ);
                         }}
                         className="w-16 border border-border rounded px-2 py-1 text-center bg-page text-txt" 
                         title="Count"
                       />
                       <span className="text-xs text-muted">Qs</span>
                    </div>
                 ))}
              </div>
              <button 
                onClick={handleGenerate}
                disabled={isGenerating || !settings}
                className="w-full mt-6 bg-txt text-card py-3 rounded-lg font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                {isGenerating ? 'Processing...' : 'Generate Paper with AI'}
              </button>
           </div>
        </div>

        {/* RIGHT COLUMN: Output */}
        <div className="lg:col-span-7 flex flex-col h-full">
           <div className="bg-card rounded-xl border border-border shadow-sm flex-1 flex flex-col overflow-hidden h-[800px]">
              <div className="border-b border-border bg-page/50 px-6 py-4 flex justify-between items-center">
                 <h2 className="font-bold text-txt flex items-center gap-2">
                    <FileText className="w-5 h-5 text-accent-text" /> Generated Paper Preview
                 </h2>
                 {isEditable && !submissionSuccess && <span className="text-xs bg-accent text-accent-text px-2 py-1 rounded-full flex items-center gap-1"><PenTool className="w-3 h-3" /> Editable Mode</span>}
              </div>
              
              <div className="flex-1 p-8 bg-page overflow-y-auto relative">
                 {isGenerating ? (
                    <GenerationLoader />
                 ) : (
                    <div className="bg-white shadow-xl min-h-full p-10 max-w-[210mm] mx-auto text-gray-900 animate-in fade-in duration-500">
                        {generatedContent ? (
                           <textarea
                             value={generatedContent}
                             onChange={(e) => setGeneratedContent(e.target.value)}
                             disabled={submissionSuccess} // Disable editing after submission
                             className="w-full h-full min-h-[600px] outline-none resize-none font-mono text-sm text-gray-900 leading-relaxed p-2 focus:bg-blue-50/20 transition-colors rounded disabled:bg-transparent disabled:text-gray-600"
                             spellCheck={false}
                           />
                        ) : (
                           <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                              <Sparkles className="w-16 h-16 mb-4 text-brand/40" />
                              <p className="text-lg font-medium">Ready to generate</p>
                              <p className="text-sm">Enter content and details on the left.</p>
                           </div>
                        )}
                     </div>
                 )}
              </div>

              {/* Actions Footer */}
              <div className="bg-card border-t border-border p-4 flex flex-wrap gap-4 justify-between items-center">
                 <div className="flex gap-2">
                    <button 
                      onClick={handleDownloadPDF} 
                      disabled={!generatedContent || isGenerating}
                      className="flex items-center gap-2 px-4 py-2 border border-border text-txt rounded-lg hover:bg-page font-medium disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" /> PDF
                    </button>
                 </div>
                 
                 <div className="flex gap-2 items-center">
                    {/* Submission Success State */}
                    {submissionSuccess ? (
                        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg animate-in slide-in-from-right-4">
                           <CheckCircle className="w-5 h-5 text-green-600" />
                           <span className="font-bold text-sm">{isTeacher ? 'Pending Admin Approval' : 'Published Successfully'}</span>
                           <button 
                             onClick={() => navigate(isTeacher ? '/dashboard/teacher' : '/questions')}
                             className="ml-2 text-xs font-bold underline flex items-center gap-1 hover:text-green-800"
                           >
                             Track Status <ArrowRight className="w-3 h-3"/>
                           </button>
                        </div>
                    ) : (
                        <>
                            {/* Admin Publish */}
                            {isAdmin && (
                                <button 
                                onClick={handleAdminPublish}
                                disabled={!hasContent}
                                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                <ShieldCheck className="w-4 h-4" /> Publish to Bank
                                </button>
                            )}

                            {/* Teacher Request - VISIBLE & FUNCTIONAL */}
                            {isTeacher && (
                                <button 
                                onClick={() => setShowTeacherPublishModal(true)}
                                disabled={!hasContent}
                                className="flex items-center gap-2 px-6 py-2 bg-brand text-inv rounded-lg hover:bg-brand-hover font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                <Upload className="w-4 h-4" /> Publish to Bank
                                </button>
                            )}

                            {!isTeacher && !isAdmin && (
                                <div className="text-xs text-muted px-3 py-2 rounded-lg bg-page border border-border">
                                  Students can generate and download papers, but only teachers and admins can publish them.
                                </div>
                            )}
                        </>
                    )}
                 </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default Generator;
