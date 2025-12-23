
import React, { useRef, useState, useEffect } from 'react';
import { 
  Bold, Italic, Underline, Maximize2, Minimize2, 
  Mic, MicOff, Type as FontIcon, ChevronDown, CloudSync, Check, Sparkles, Type, Flame, Send, X, Loader2, Wand2
} from 'lucide-react';
import { MELSA_KERNEL } from '../../services/melsaKernel';

interface AdvancedEditorProps {
  initialContent: string;
  onSave: (content: string) => void;
  language: 'id' | 'en';
  fontSize: number;
  onFontSizeChange: (size: number) => void;
}

export const AdvancedEditor: React.FC<AdvancedEditorProps> = ({ initialContent, onSave, language, fontSize, onFontSizeChange }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isDictating, setIsDictating] = useState(false);
  const [fontFamily, setFontFamily] = useState('Plus Jakarta Sans');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'SAVED' | 'SYNCING'>('SAVED');
  
  // MELSA Assistant States
  const [showMelsaOverlay, setShowMelsaOverlay] = useState(false);
  const [melsaInstruction, setMelsaInstruction] = useState('');
  const [isMelsaProcessing, setIsMelsaProcessing] = useState(false);
  const [melsaResult, setMelsaResult] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const interimSpanRef = useRef<HTMLSpanElement | null>(null);
  const lastSavedContent = useRef<string>(initialContent);
  const isSyncLocked = useRef(false);

  useEffect(() => {
    if (editorRef.current && initialContent !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = initialContent || '<div><br></div>';
    }
  }, []);

  useEffect(() => {
    const handleAutoSave = () => {
      if (!editorRef.current || isSyncLocked.current) return;
      
      const currentContent = editorRef.current.innerHTML;
      if (currentContent !== lastSavedContent.current) {
        setSyncStatus('SYNCING');
        const timeout = setTimeout(() => {
          if (isSyncLocked.current) return;
          onSave(currentContent);
          lastSavedContent.current = currentContent;
          setSyncStatus('SAVED');
        }, 1500);
        return () => clearTimeout(timeout);
      }
    };

    const observer = new MutationObserver(handleAutoSave);
    if (editorRef.current) {
      observer.observe(editorRef.current, { childList: true, characterData: true, subtree: true });
    }
    return () => observer.disconnect();
  }, [onSave, isDictating]);

  const executeCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleMelsaProcess = async () => {
    if (!melsaInstruction.trim() || isMelsaProcessing || !editorRef.current) return;
    
    setIsMelsaProcessing(true);
    setMelsaResult(null);
    
    try {
      const currentText = editorRef.current.innerText;
      const prompt = `Instruksi Tuan: ${melsaInstruction}\n\nKonten Catatan Saat Ini:\n${currentText}\n\nBerikan hasil pemrosesan teks saja tanpa basa-basi.`;
      
      const response = await MELSA_KERNEL.execute(prompt, 'gemini-3-flash-preview', "Konteks: Kamu sedang membantu merapikan catatan di editor.");
      setMelsaResult(response.text);
    } catch (error) {
      setMelsaResult("Maaf Tuan, sinkronisasi saraf gagal. Coba lagi.");
    } finally {
      setIsMelsaProcessing(false);
    }
  };

  const applyMelsaResult = () => {
    if (!melsaResult || !editorRef.current) return;
    const formattedResult = melsaResult.split('\n').map(line => `<p>${line}</p>`).join('');
    editorRef.current.innerHTML = formattedResult;
    onSave(formattedResult);
    setShowMelsaOverlay(false);
    setMelsaResult(null);
    setMelsaInstruction('');
  };

  const toggleDictation = () => {
    if (isDictating) {
      recognitionRef.current?.stop();
      setIsDictating(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = language === 'id' ? 'id-ID' : 'en-US';
    recognition.continuous = true;
    recognition.onstart = () => setIsDictating(true);
    recognition.onend = () => setIsDictating(false);
    recognition.onresult = (event: any) => {
      const text = event.results[event.results.length - 1][0].transcript;
      document.execCommand('insertText', false, text + ' ');
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <div className={`flex flex-col h-full transition-all duration-700 ${isFocusMode ? 'fixed inset-0 z-[2000] bg-[#f8f9fa] dark:bg-[#050505] p-6' : 'relative'}`}>
      
      {/* MELSA WRITING ASSISTANT OVERLAY */}
      {showMelsaOverlay && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-full max-w-xl z-[100] animate-slide-up">
            <div className="glass-card-3d bg-white/95 dark:bg-[#0d0d0e]/95 backdrop-blur-3xl border-orange-500/20 p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Flame className="text-orange-600 animate-pulse" size={16} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-orange-600">MELSA_SYNTHESIS</span>
                    </div>
                    <button onClick={() => setShowMelsaOverlay(false)} className="text-neutral-400 hover:text-black dark:hover:text-white"><X size={18} /></button>
                </div>
                <textarea 
                    value={melsaInstruction}
                    onChange={(e) => setMelsaInstruction(e.target.value)}
                    placeholder="Instruksi untuk Melsa... (contoh: Rapikan tulisan ini)"
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 p-4 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500/50 h-24 resize-none"
                />
                <div className="mt-4 flex gap-3">
                    <button onClick={handleMelsaProcess} disabled={isMelsaProcessing} className="flex-1 py-3 bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20">
                        {isMelsaProcessing ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} PROSES
                    </button>
                    {melsaResult && (
                        <button onClick={applyMelsaResult} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">TERAPKAN</button>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* COMPACT TOOLBAR */}
      <div className="flex flex-wrap items-center gap-2 p-2 mb-6 bg-zinc-100 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 sticky top-0 z-30">
        <div className="flex items-center gap-1 border-r border-black/10 pr-2">
          <ToolbarButton onClick={() => executeCommand('bold')} icon={<Bold size={14} />} />
          <ToolbarButton onClick={() => executeCommand('italic')} icon={<Italic size={14} />} />
        </div>

        <div className="flex items-center gap-2 border-r border-black/10 pr-2">
          <button onClick={() => setShowMelsaOverlay(true)} className="p-2 text-orange-600 hover:bg-orange-500/10 rounded-lg transition-all" title="Melsa Assistant">
            <Sparkles size={16} />
          </button>
          <button onClick={toggleDictation} className={`p-2 rounded-lg transition-all ${isDictating ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/20' : 'text-neutral-500 hover:bg-black/5'}`}>
            {isDictating ? <Mic size={16} /> : <MicOff size={16} />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setIsFocusMode(!isFocusMode)} className="p-2 text-neutral-400 hover:text-accent hover:bg-black/5 rounded-lg transition-all">
            {isFocusMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <div className="text-[8px] tech-mono font-black text-neutral-400 px-2 uppercase tracking-widest">
            {syncStatus === 'SYNCING' ? 'SYNCING...' : 'SAVED'}
          </div>
        </div>
      </div>

      <div 
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="flex-1 outline-none text-black dark:text-neutral-200 selection:bg-accent/20 custom-scroll overflow-y-auto pb-40"
        style={{ fontSize: `${fontSize}px`, fontFamily: fontFamily, lineHeight: '1.8' }}
        // Fix: Changed placeholder to data-placeholder to comply with DetailedHTMLProps
        data-placeholder="Tuangkan pikiran Anda..."
      />
    </div>
  );
};

const ToolbarButton: React.FC<{ onClick: () => void, icon: React.ReactNode }> = ({ onClick, icon }) => (
  <button onClick={onClick} className="p-2 text-neutral-500 hover:text-accent hover:bg-black/5 rounded-lg transition-all">
    {icon}
  </button>
);
