
import React, { useEffect, useRef, useState } from 'react';
import { type Note } from '../../types';
import useLocalStorage from '../../hooks/useLocalStorage';
import { 
  Radio, ChevronDown, History, Sparkles, Zap, 
  Flame, Brain, Send, Plus, Database, 
  Mic, ArrowUp, X, Command, ExternalLink, Cpu, Activity, Fingerprint, GripHorizontal,
  DatabaseZap, Volume2, VolumeX
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Hooks & Logic
import { useNeuralLinkSession } from './hooks/useNeuralLinkSession';
import { ChatHistory } from './components/ChatHistory';
import { ModelPicker } from './components/ModelPicker';
import { NeuralLinkOverlay } from './components/NeuralLinkOverlay';
import { VaultPinModal } from '../../components/VaultPinModal';

interface AIChatViewProps {
    chatLogic: any;
}

const AIChatView: React.FC<AIChatViewProps> = ({ chatLogic }) => {
    const [notes, setNotes] = useLocalStorage<Note[]>('notes', []);
    const [showModelPicker, setShowModelPicker] = useState(false);
    const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);
    
    const {
        threads, setThreads,
        activeThread, activeThreadId, setActiveThreadId,
        input, setInput,
        isLoading,
        activeModel,
        personaMode,
        handleNewChat,
        renameThread,
        sendMessage,
        isVaultSynced,
        setIsVaultSynced,
        isAutoSpeak,
        setIsAutoSpeak
    } = chatLogic;

    const handleVaultToggle = () => {
        if (isVaultSynced) {
            setIsVaultSynced(false);
        } else {
            setShowPinModal(true);
        }
    };

    const onToggleAutoSpeak = () => setIsAutoSpeak(!isAutoSpeak);

    const {
        isLiveMode,
        liveStatus,
        liveTranscript,
        toggleLiveMode,
        analyser
    } = useNeuralLinkSession(personaMode, notes, setNotes);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logic
    useEffect(() => {
        if (messagesEndRef.current) {
             messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [activeThread?.messages.length, isLoading]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [input]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="min-h-full flex flex-col p-4 md:p-12 lg:p-16 pb-0 relative">
            <VaultPinModal 
                isOpen={showPinModal} 
                onClose={() => setShowPinModal(false)} 
                onSuccess={() => setIsVaultSynced(true)} 
            />

            <div className="max-w-[1400px] mx-auto w-full flex flex-col h-full relative z-10">
                
                {/* --- HEADER (ELITE SYNTHESIS STYLE) --- */}
                <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 border-b border-black/5 dark:border-white/5 pb-6 md:pb-8 animate-slide-up shrink-0">
                    <div className="space-y-4 w-full xl:w-auto">
                        <div className="flex items-center gap-3">
                            <Cpu size={20} className="text-[var(--accent-color)]" />
                            <span className="text-neutral-400 tech-mono text-[9px] font-black uppercase tracking-[0.4em]">NEURAL LINK v13.5</span>
                        </div>
                        
                        <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-6">
                            <h2 className="text-5xl md:text-[6rem] heading-heavy text-black dark:text-white leading-[0.85] italic uppercase tracking-tighter">
                                {personaMode === 'melsa' ? 'MELSA' : 'STOIC'} <span className="text-[var(--accent-color)]">CORE</span>
                            </h2>
                            
                            {/* PREMIUM TOGGLE (Hardware Switch Style) */}
                            <div className="bg-zinc-100 dark:bg-white/5 p-1 rounded-full flex items-center border border-black/5 dark:border-white/5 self-start md:self-auto mt-2 md:mt-0">
                                <button 
                                    onClick={() => personaMode !== 'stoic' && handleNewChat('stoic')}
                                    className={`px-4 md:px-5 py-2 rounded-full text-[9px] md:text-[10px] font-black tracking-widest transition-all flex items-center gap-2 ${
                                        personaMode === 'stoic' 
                                        ? 'bg-white dark:bg-white/10 text-cyan-600 dark:text-cyan-400 shadow-sm' 
                                        : 'text-neutral-400 hover:text-neutral-600'
                                    }`}
                                >
                                    <Brain size={12} className="md:w-3.5 md:h-3.5" /> STOIC
                                </button>
                                <button 
                                    onClick={() => personaMode !== 'melsa' && handleNewChat('melsa')}
                                    className={`px-4 md:px-5 py-2 rounded-full text-[9px] md:text-[10px] font-black tracking-widest transition-all flex items-center gap-2 ${
                                        personaMode === 'melsa' 
                                        ? 'bg-white dark:bg-white/10 text-orange-600 dark:text-orange-400 shadow-sm' 
                                        : 'text-neutral-400 hover:text-neutral-600'
                                    }`}
                                >
                                    <Flame size={12} className="md:w-3.5 md:h-3.5" /> MELSA
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* STATUS & CONTROLS (Responsive Row) */}
                    <div className="flex flex-row items-center gap-2 w-full xl:w-auto mt-2 xl:mt-0 overflow-x-auto no-scrollbar">
                        {/* Status (Hidden on Mobile) */}
                        <div className="hidden md:flex px-4 py-3 bg-white dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl items-center gap-3 tech-mono text-[9px] font-black uppercase tracking-widest text-neutral-500 shadow-sm">
                            <Activity size={14} className="text-[var(--accent-color)] animate-pulse" /> 
                            <span>SYSTEM_STATUS: ONLINE</span>
                        </div>

                        {/* Model Picker */}
                        <button 
                            onClick={() => setShowModelPicker(true)}
                            className="flex-1 md:flex-none justify-center px-3 md:px-4 py-3 bg-white dark:bg-white/5 border border-black/5 dark:border-white/5 hover:border-[var(--accent-color)]/30 rounded-2xl flex items-center gap-2 tech-mono text-[9px] font-black uppercase tracking-widest text-neutral-500 transition-all hover:text-white"
                        >
                            <Sparkles size={14} className="text-[var(--accent-color)]" />
                            <span className="truncate max-w-[80px] md:max-w-none">
                                {activeModel.name.replace('Gemini', 'G').replace('Preview', '').toUpperCase()}
                            </span>
                            <ChevronDown size={12} />
                        </button>

                         {/* Auto Speak Toggle */}
                         <button 
                            onClick={onToggleAutoSpeak}
                            className={`flex-none px-3 md:px-4 py-3 rounded-2xl flex items-center gap-2 tech-mono text-[9px] font-black uppercase tracking-widest transition-all ${
                                isAutoSpeak
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                                : 'bg-white dark:bg-white/5 border border-black/5 dark:border-white/5 text-neutral-500 hover:text-[var(--accent-color)]'
                            }`}
                            title="Toggle Auto-Speak"
                        >
                            {isAutoSpeak ? <Volume2 size={14} /> : <VolumeX size={14} />}
                        </button>

                        {/* Live Link */}
                         <button 
                            onClick={toggleLiveMode}
                            className={`flex-none px-3 md:px-4 py-3 rounded-2xl flex items-center gap-2 tech-mono text-[9px] font-black uppercase tracking-widest transition-all ${
                                isLiveMode 
                                ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/20' 
                                : 'bg-white dark:bg-white/5 border border-black/5 dark:border-white/5 text-neutral-500 hover:text-[var(--accent-color)]'
                            }`}
                        >
                            <Radio size={14} /> 
                            <span className="hidden xs:inline">LIVE</span>
                        </button>

                        {/* History Toggle */}
                        <button 
                            onClick={() => setShowHistoryDrawer(true)}
                            className="flex-none px-3 md:px-4 py-3 bg-white dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl text-neutral-500 hover:text-[var(--accent-color)] transition-all"
                        >
                            <History size={16} />
                        </button>
                    </div>
                </header>

                {/* --- CHAT STREAM (Fluid & Spacious) --- */}
                <div 
                    ref={containerRef}
                    className="flex-1 overflow-y-auto custom-scroll py-4 md:py-8 space-y-6 md:space-y-8 pb-[180px]" // Padding for floating dock
                >
                    {activeThread?.messages.map((msg: any) => {
                         const isUser = msg.role === 'user';
                         if (msg.role === 'model' && !msg.text && !isLoading) return null;

                         return (
                            <div key={msg.id} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up group`}>
                                <div className={`max-w-[95%] md:max-w-[75%] flex gap-3 md:gap-5 ${isUser ? 'flex-row-reverse' : ''}`}>
                                    
                                    {/* Avatar Column */}
                                    <div className="flex flex-col items-center gap-2 shrink-0">
                                        <div className={`w-8 h-8 md:w-12 md:h-12 rounded-[12px] md:rounded-[16px] flex items-center justify-center shadow-lg transition-transform duration-500 group-hover:scale-105 border border-black/5 dark:border-white/5 ${
                                            isUser 
                                            ? 'bg-black dark:bg-white text-white dark:text-black' 
                                            : (personaMode === 'melsa' ? 'bg-orange-500 text-white shadow-orange-500/20' : 'bg-cyan-600 text-white shadow-cyan-600/20')
                                        }`}>
                                            {isUser ? <Fingerprint size={16} className="md:w-5 md:h-5" /> : (personaMode === 'melsa' ? <Flame size={16} className="md:w-5 md:h-5" /> : <Brain size={16} className="md:w-5 md:h-5" />)}
                                        </div>
                                    </div>

                                    {/* Content Column */}
                                    <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'} min-w-0`}>
                                        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity px-1">
                                            <span className="text-[8px] tech-mono font-black uppercase tracking-[0.2em] text-neutral-400">
                                                {isUser ? 'OPERATOR' : (personaMode === 'melsa' ? 'MELSA_NODE' : 'STOIC_LOGIC')}
                                            </span>
                                            <span className="text-[8px] tech-mono text-neutral-300">
                                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>

                                        <div className={`p-5 md:p-8 text-sm md:text-base leading-relaxed shadow-sm transition-all relative ${
                                            isUser 
                                            ? 'bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-[24px] md:rounded-[32px] rounded-tr-none text-black dark:text-white' 
                                            : 'bg-zinc-50 dark:bg-[#0a0a0b] border border-black/5 dark:border-white/5 rounded-[24px] md:rounded-[32px] rounded-tl-none text-neutral-700 dark:text-neutral-300'
                                        }`}>
                                            <div className="prose dark:prose-invert prose-sm max-w-none break-words font-medium">
                                                <ReactMarkdown>{msg.text}</ReactMarkdown>
                                            </div>
                                            
                                            {/* Source Chips */}
                                            {msg.metadata?.groundingChunks && msg.metadata.groundingChunks.length > 0 && (
                                                <div className="mt-6 pt-4 border-t border-black/5 dark:border-white/5 flex flex-wrap gap-2">
                                                    {msg.metadata.groundingChunks.map((chunk: any, i: number) => (
                                                        <a key={i} href={chunk.web?.uri} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-black/5 dark:bg-white/5 rounded-lg text-[9px] font-bold uppercase hover:bg-[var(--accent-color)] hover:text-on-accent transition-all text-neutral-500 border border-transparent hover:border-[var(--accent-color)]">
                                                            <ExternalLink size={10} /> Source_{i+1}
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    
                    {isLoading && (
                        <div className="flex justify-start animate-pulse pl-12 md:pl-20">
                            <div className="flex items-center gap-2 px-4 py-2">
                                <span className="w-1.5 h-1.5 bg-[var(--accent-color)] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-1.5 h-1.5 bg-[var(--accent-color)] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-1.5 h-1.5 bg-[var(--accent-color)] rounded-full animate-bounce"></span>
                                <span className="text-[9px] tech-mono font-black uppercase tracking-[0.3em] text-neutral-400 ml-2">PROCESSING_DATA...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} className="h-4" />
                </div>
            </div>

            {/* --- GOLDEN RATIO INPUT DOCK (Floating Levitated) --- */}
            {/* Fix: Moved bottom position up on mobile (bottom-[96px]) to avoid overlapping with MobileNav */}
            <div className="fixed bottom-[96px] md:bottom-[21px] left-0 right-0 z-50 px-4 pb-[env(safe-area-inset-bottom)] pointer-events-none flex justify-center transition-all duration-500">
                <div className="w-full md:w-[61.8%] max-w-[1000px] mb-2 pointer-events-auto transition-all duration-500">
                    <div className={`
                        bg-white/90 dark:bg-[#121214]/90 backdrop-blur-[21px]
                        border border-black/10 dark:border-white/10
                        rounded-[2.618rem] p-2 pl-6 flex items-end gap-3
                        shadow-[0_21px_55px_rgba(0,0,0,0.18)]
                        transition-all duration-300 group
                        hover:border-[var(--accent-color)]/30 hover:shadow-[0_21px_55px_rgba(var(--accent-rgb),0.18)]
                    `}>
                        {/* Control Actions */}
                        <div className="flex gap-1.5 pb-2.5">
                            <button 
                                onClick={() => handleNewChat(personaMode)}
                                className="w-[42px] h-[42px] flex items-center justify-center rounded-full text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-all"
                                title="New Session"
                            >
                                <Plus size={20} />
                            </button>
                             <button 
                                onClick={handleVaultToggle}
                                className={`w-[42px] h-[42px] flex items-center justify-center rounded-full transition-all ${isVaultSynced ? 'text-[var(--accent-color)] bg-[var(--accent-color)]/10' : 'text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/5'}`}
                                title={isVaultSynced ? "Vault Access UNLOCKED" : "Vault Access LOCKED"}
                            >
                                {isVaultSynced ? <DatabaseZap size={18} /> : <Database size={18} />}
                            </button>
                        </div>

                        {/* Text Area */}
                        <div className="flex-1 py-3.5">
                            <textarea 
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={`Akses terminal ${personaMode === 'melsa' ? 'MELSA' : 'STOIC'}...`}
                                className="w-full bg-transparent text-[15px] font-medium text-black dark:text-white placeholder:text-neutral-400/70 resize-none focus:outline-none max-h-32 custom-scroll leading-relaxed"
                                rows={1}
                            />
                        </div>

                        {/* Send Button (Golden Size) */}
                        <div className="pb-2 pr-2">
                            <button 
                                onClick={() => sendMessage()}
                                disabled={!input.trim()}
                                className={`
                                    h-[55px] px-8 rounded-[2.2rem] flex items-center gap-2 font-black uppercase text-[10px] tracking-widest transition-all
                                    ${input.trim() 
                                    ? 'bg-[var(--accent-color)] text-on-accent shadow-lg shadow-[var(--accent-color)]/25 hover:scale-105 active:scale-95' 
                                    : 'bg-black/5 dark:bg-white/5 text-neutral-400 cursor-not-allowed'}
                                `}
                            >
                                {isLoading ? <GripHorizontal size={20} className="animate-spin" /> : <ArrowUp size={24} strokeWidth={3} />}
                            </button>
                        </div>
                    </div>
                    
                    {/* Input Helper */}
                    <div className="text-center opacity-0 md:opacity-100 transition-opacity mt-3">
                        <span className="text-[8px] tech-mono font-bold text-neutral-500 uppercase tracking-[0.3em] bg-white/50 dark:bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">
                            SECURE CHANNEL_ENCRYPTED
                        </span>
                    </div>
                </div>
            </div>

            {/* OVERLAYS */}
            <ModelPicker 
                isOpen={showModelPicker} 
                onClose={() => setShowModelPicker(false)} 
                activeModelId={activeThread?.modelId || 'gemini-3-pro-preview'} 
                onSelectModel={(modelId) => {
                    setThreads(threads.map((t:any) => t.id === activeThreadId ? { ...t, modelId, updatedAt: new Date().toISOString() } : t));
                    setShowModelPicker(false);
                }} 
            />

            <NeuralLinkOverlay 
                isOpen={isLiveMode} 
                status={liveStatus} 
                personaMode={personaMode} 
                transcript={liveTranscript} 
                onTerminate={toggleLiveMode} 
                analyser={analyser}
            />

            <ChatHistory 
                isOpen={showHistoryDrawer} 
                onClose={() => setShowHistoryDrawer(false)} 
                threads={threads} 
                activeThreadId={activeThreadId} 
                onSelectThread={setActiveThreadId} 
                onDeleteThread={(id) => {
                    const updated = threads.filter((t: any) => t.id !== id);
                    setThreads(updated);
                    if (activeThreadId === id) setActiveThreadId(updated.length > 0 ? updated[0].id : null);
                }} 
                onRenameThread={renameThread}
                onNewChat={() => handleNewChat(personaMode)} 
            />
        </div>
    );
};

export default AIChatView;
