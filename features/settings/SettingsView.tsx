
import React, { useState } from 'react';
import useLocalStorage from '../../hooks/useLocalStorage';
import { 
    Shield, Trash2, Cpu, Languages, Palette, Layout, Save, CheckCircle2, 
    Volume2, Mic2, Moon, Sun, Monitor, X, Check, HelpCircle, RefreshCw,
    Terminal, UserCheck, Sparkles, MessageSquare, ChevronRight, Activity, Zap, Globe, User, UserRound, Play, Info
} from 'lucide-react';
import { THEME_COLORS } from '../../App';
import { DEFAULT_MELSA_PROMPT, DEFAULT_STOIC_PROMPT } from '../../services/geminiService';
import { speakWithMelsa } from '../../services/elevenLabsService';

const SettingsSection: React.FC<{ title: string; children: React.ReactNode; icon: React.ReactNode }> = ({ title, children, icon }) => (
    <div className="space-y-6 animate-slide-up">
        <div className="flex items-center gap-3 px-2">
            <div className="p-2 bg-zinc-100 dark:bg-white/5 rounded-xl text-accent">{icon}</div>
            <h3 className="text-[11px] font-black text-black dark:text-white tech-mono uppercase tracking-[0.3em]">{title}</h3>
        </div>
        <div className="bg-zinc-50 dark:bg-black/20 border border-black/5 dark:border-white/5 rounded-[32px] overflow-hidden p-2 md:p-3">
            {children}
        </div>
    </div>
);

const SettingsItem: React.FC<{ label: string; desc: string; icon: React.ReactNode; action: React.ReactNode }> = ({ label, desc, icon, action }) => (
    <div className="p-6 md:p-8 bg-white dark:bg-[#0f0f11] rounded-[24px] mb-2 last:mb-0 border border-black/5 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-accent/30 transition-all group shadow-sm">
        <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-white/[0.03] flex items-center justify-center text-neutral-400 group-hover:text-accent group-hover:scale-110 transition-all shrink-0 border border-black/5 dark:border-white/5">
                {icon}
            </div>
            <div className="space-y-1.5">
                <h4 className="text-xl font-black text-black dark:text-white uppercase italic tracking-tighter leading-none group-hover:text-accent transition-colors">{label}</h4>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest leading-relaxed max-w-sm">{desc}</p>
            </div>
        </div>
        <div className="w-full md:w-auto self-end md:self-center">
            {action}
        </div>
    </div>
);

const SettingsView: React.FC = () => {
    const [persistedLanguage, setPersistedLanguage] = useLocalStorage<'id' | 'en'>('app_language', 'id');
    const [persistedTheme, setPersistedTheme] = useLocalStorage<string>('app_theme', 'cyan');
    const [persistedColorScheme, setPersistedColorScheme] = useLocalStorage<'system' | 'light' | 'dark'>('app_color_scheme', 'system');
    const [persistedMelsaPrompt, setPersistedMelsaPrompt] = useLocalStorage<string>('custom_melsa_prompt', DEFAULT_MELSA_PROMPT);
    const [persistedStoicPrompt, setPersistedStoicPrompt] = useLocalStorage<string>('custom_stoic_prompt', DEFAULT_STOIC_PROMPT);
    const [persistedMelsaVoice, setPersistedMelsaVoice] = useLocalStorage<string>('melsa_voice', 'Zephyr');
    const [persistedStoicVoice, setPersistedStoicVoice] = useLocalStorage<string>('stoic_voice', 'Fenrir');
    
    const [language, setLanguage] = useState(persistedLanguage);
    const [theme, setTheme] = useState(persistedTheme);
    const [colorScheme, setColorScheme] = useState(persistedColorScheme);
    const [melsaPrompt, setMelsaPrompt] = useState(persistedMelsaPrompt);
    const [stoicPrompt, setStoicPrompt] = useState(persistedStoicPrompt);
    const [melsaVoice, setMelsaVoice] = useState(persistedMelsaVoice);
    const [stoicVoice, setStoicVoice] = useState(persistedStoicVoice);
    
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isTestingVoice, setIsTestingVoice] = useState(false);

    const themeOptions = Object.entries(THEME_COLORS).map(([id, color]) => ({ id, color }));

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            setPersistedLanguage(language);
            setPersistedTheme(theme);
            setPersistedColorScheme(colorScheme);
            setPersistedMelsaPrompt(melsaPrompt);
            setPersistedStoicPrompt(stoicPrompt);
            setPersistedMelsaVoice(melsaVoice);
            setPersistedStoicVoice(stoicVoice);
            setIsSaving(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        }, 1200);
    };

    const handleTestMelsaVoice = async () => {
        setIsTestingVoice(true);
        // Pass the CURRENT selected voice state, not just what is in storage
        await speakWithMelsa(`Hai Tuan, ini suara ${melsaVoice}. Aku siap melayanimu.`, melsaVoice);
        setIsTestingVoice(false);
    };

    return (
        <div className="min-h-full flex flex-col p-2 md:p-6 lg:p-8 pb-40 animate-fade-in">
             <div className="max-w-6xl mx-auto w-full bg-white dark:bg-[#0a0a0b] rounded-[48px] shadow-sm border border-black/5 dark:border-white/5 p-6 md:p-12 space-y-20 relative overflow-hidden">
                
                {/* Header */}
                <header className="space-y-8 relative z-10 border-b border-black/5 dark:border-white/5 pb-10">
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1 bg-accent/10 border border-accent/20 rounded-lg tech-mono text-[9px] font-black text-accent tracking-[0.3em] shadow-inner">CONFIG_V13.5</div>
                        <div className="flex-1 h-[1px] bg-black/5 dark:bg-white/5"></div>
                        <span className="text-neutral-500 tech-mono text-[9px] font-black tracking-widest flex items-center gap-2">
                            <Activity size={12} className="text-green-500 animate-pulse" /> SYNC_READY
                        </span>
                    </div>
                    <div>
                        <h2 className="text-6xl md:text-8xl font-black italic tracking-tighter text-black dark:text-white leading-[0.8] uppercase">
                            CORE <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-blue-500">CONFIG</span>
                        </h2>
                        <p className="text-neutral-400 mt-4 text-xs md:text-sm font-bold uppercase tracking-widest max-w-2xl leading-relaxed">
                            Pusat kendali kognitif. Sesuaikan persona, visual, dan logika sistem sesuai preferensi saraf Anda.
                        </p>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
                    <div className="space-y-12">
                        <SettingsSection title="NEURAL_VISUAL" icon={<Zap size={16} />}>
                            <SettingsItem 
                                label="DIALEK SISTEM" desc="Bahasa utama antarmuka terminal."
                                icon={<Globe size={22}/>}
                                action={
                                    <div className="flex bg-zinc-100 dark:bg-black/40 p-1.5 rounded-2xl border border-black/5 dark:border-white/5 w-full md:w-auto">
                                        {[
                                            { id: 'id', label: 'BAHASA' },
                                            { id: 'en', label: 'ENGLISH' }
                                        ].map(lang => (
                                            <button 
                                                key={lang.id} 
                                                onClick={() => setLanguage(lang.id as any)} 
                                                className={`flex-1 md:flex-none px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${language === lang.id ? 'bg-accent text-on-accent shadow-lg shadow-accent/20' : 'text-neutral-500 hover:text-black dark:hover:text-white'}`}
                                            >
                                                {lang.label}
                                            </button>
                                        ))}
                                    </div>
                                }
                            />
                            <SettingsItem 
                                label="SKEMA WARNA" desc="Mode visual terminal."
                                icon={<Monitor size={22}/>}
                                action={
                                    <div className="flex bg-zinc-100 dark:bg-black/40 p-1.5 rounded-2xl border border-black/5 dark:border-white/5 w-full md:w-auto">
                                        {['system', 'light', 'dark'].map(s => (
                                            <button 
                                                key={s} 
                                                onClick={() => setColorScheme(s as any)} 
                                                className={`flex-1 md:flex-none px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${colorScheme === s ? 'bg-accent text-on-accent shadow-lg shadow-accent/20' : 'text-neutral-500 hover:text-black dark:hover:text-white'}`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                }
                            />
                            <SettingsItem 
                                label="AKSEN TEMA" desc="Warna spektrum kognitif."
                                icon={<Palette size={22}/>}
                                action={
                                    <div className="flex flex-wrap justify-end gap-3 max-w-[240px]">
                                        {themeOptions.map(opt => (
                                            <button 
                                                key={opt.id} 
                                                onClick={() => setTheme(opt.id)} 
                                                className={`w-10 h-10 rounded-xl border-4 transition-all hover:scale-110 ${theme === opt.id ? 'border-accent scale-110 shadow-lg shadow-accent/30' : 'border-transparent opacity-40 hover:opacity-100 bg-zinc-200 dark:bg-white/10'}`} 
                                                style={{ backgroundColor: opt.color }} 
                                                title={opt.id}
                                            />
                                        ))}
                                    </div>
                                }
                            />
                        </SettingsSection>
                    </div>

                    <div className="space-y-12">
                        <SettingsSection title="COGNITIVE_MAPPING" icon={<Cpu size={16} />}>
                            <div className="flex flex-col gap-4 p-2">
                                
                                {/* MELSA CONFIG CARD */}
                                <div className="space-y-6 p-6 md:p-8 bg-zinc-50 dark:bg-black/20 rounded-[32px] border border-black/5 dark:border-white/5 relative overflow-hidden group hover:border-orange-500/30 transition-colors">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-orange-500/10 transition-colors"></div>
                                    
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-black/5 dark:border-white/5 relative z-10">
                                        <div className="flex items-center gap-5">
                                            <div className="w-16 h-16 bg-orange-600/10 rounded-2xl flex items-center justify-center text-orange-600 border border-orange-600/20 shadow-sm">
                                                <Sparkles size={28} />
                                            </div>
                                            <div>
                                                <h4 className="text-2xl font-black uppercase italic tracking-tighter text-black dark:text-white leading-none">MELSA</h4>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="px-2 py-0.5 rounded bg-orange-600/10 text-orange-600 text-[8px] font-black uppercase tracking-widest border border-orange-600/20">EMOTIVE_CORE</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col items-start md:items-end gap-3 w-full md:w-auto">
                                            <div className="flex flex-col md:flex-row items-center gap-3 bg-white dark:bg-white/5 p-1.5 rounded-xl border border-black/5 dark:border-white/5 shadow-sm w-full md:w-auto">
                                                <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest px-2 hidden md:block">VOICE:</span>
                                                <div className="flex gap-1 w-full md:w-auto">
                                                    {['Zephyr', 'Kore', 'Melsa'].map(v => (
                                                        <button 
                                                            key={v} 
                                                            onClick={() => setMelsaVoice(v)} 
                                                            className={`flex-1 md:flex-none px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${melsaVoice === v ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-neutral-500 hover:text-orange-600 hover:bg-orange-600/5'}`}
                                                        >
                                                            {v}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            
                                            <button 
                                                onClick={handleTestMelsaVoice} 
                                                disabled={isTestingVoice} 
                                                className={`w-full md:w-auto px-4 py-2 rounded-lg border flex items-center justify-center md:justify-start gap-2 text-[9px] font-bold uppercase tracking-widest transition-all ${isTestingVoice ? 'bg-orange-600/10 text-orange-600 border-orange-600/20' : 'border-transparent text-neutral-400 hover:text-orange-600 hover:bg-orange-600/5'}`}
                                            >
                                                {isTestingVoice ? <RefreshCw className="animate-spin" size={12} /> : <Play size={12} />} 
                                                {isTestingVoice ? "SYNTHESIZING..." : "TEST_VOICE_OUTPUT"}
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {/* INFO BOX FOR VOICE HYBRID SYSTEM */}
                                    <div className="relative z-10 p-3 bg-orange-500/5 border border-orange-500/10 rounded-xl flex items-start gap-3">
                                        <Info size={14} className="text-orange-500 shrink-0 mt-0.5" />
                                        <div className="text-[9px] text-neutral-500 leading-relaxed">
                                            <strong className="text-orange-500">VOICE HYBRID SYSTEM:</strong> Suara "Melsa" (ElevenLabs) aktif penuh di mode <strong>Chat (Auto-Speak)</strong>. Untuk mode <strong>Live Call</strong>, sistem akan otomatis menggunakan suara <em>Google Kore</em> (High-Speed) karena batasan teknis websocket.
                                        </div>
                                    </div>

                                    <div className="relative z-10 space-y-3">
                                        <div className="flex items-center justify-between px-1">
                                            <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">SYSTEM_PROMPT_OVERRIDE</label>
                                            <span className="text-[9px] font-bold text-orange-600/50 uppercase tracking-widest">V13.5_COMPLIANT</span>
                                        </div>
                                        <textarea 
                                            value={melsaPrompt} 
                                            onChange={(e) => setMelsaPrompt(e.target.value)}
                                            className="w-full h-48 bg-white dark:bg-black/40 border border-black/5 dark:border-white/5 rounded-2xl p-6 tech-mono text-[11px] font-bold text-neutral-600 dark:text-neutral-300 focus:border-orange-500/50 outline-none custom-scroll resize-none leading-relaxed transition-all placeholder:text-neutral-400 shadow-inner focus:shadow-lg focus:shadow-orange-500/5"
                                            placeholder="Masukkan instruksi kepribadian MELSA..."
                                        />
                                    </div>
                                </div>
                                
                                {/* STOIC CONFIG CARD */}
                                <div className="space-y-6 p-6 md:p-8 bg-zinc-50 dark:bg-black/20 rounded-[32px] border border-black/5 dark:border-white/5 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/10 transition-colors"></div>
                                    
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-black/5 dark:border-white/5 relative z-10">
                                        <div className="flex items-center gap-5">
                                            <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-600/20 shadow-sm">
                                                <Terminal size={28} />
                                            </div>
                                            <div>
                                                <h4 className="text-2xl font-black uppercase italic tracking-tighter text-black dark:text-white leading-none">STOIC</h4>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="px-2 py-0.5 rounded bg-blue-600/10 text-blue-600 text-[8px] font-black uppercase tracking-widest border border-blue-600/20">LOGIC_CORE</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col items-start md:items-end gap-3 w-full md:w-auto">
                                            <div className="flex flex-col md:flex-row items-center gap-3 bg-white dark:bg-white/5 p-1.5 rounded-xl border border-black/5 dark:border-white/5 shadow-sm w-full md:w-auto">
                                                <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest px-2 hidden md:block">VOICE:</span>
                                                <div className="flex gap-1 w-full md:w-auto">
                                                    {['Fenrir', 'Puck'].map(v => (
                                                        <button 
                                                            key={v} 
                                                            onClick={() => setStoicVoice(v)} 
                                                            className={`flex-1 md:flex-none px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${stoicVoice === v ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-neutral-500 hover:text-blue-600 hover:bg-blue-600/5'}`}
                                                        >
                                                            {v}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="relative z-10 space-y-3">
                                        <div className="flex items-center justify-between px-1">
                                            <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">SYSTEM_PROMPT_OVERRIDE</label>
                                            <span className="text-[9px] font-bold text-blue-600/50 uppercase tracking-widest">LOGIC_OPTIMIZED</span>
                                        </div>
                                        <textarea 
                                            value={stoicPrompt} 
                                            onChange={(e) => setStoicPrompt(e.target.value)}
                                            className="w-full h-48 bg-white dark:bg-black/40 border border-black/5 dark:border-white/5 rounded-2xl p-6 tech-mono text-[11px] font-bold text-neutral-600 dark:text-neutral-300 focus:border-blue-500/50 outline-none custom-scroll resize-none leading-relaxed transition-all placeholder:text-neutral-400 shadow-inner focus:shadow-lg focus:shadow-blue-500/5"
                                            placeholder="Masukkan instruksi logika STOIC..."
                                        />
                                    </div>
                                </div>

                            </div>
                        </SettingsSection>
                    </div>
                </div>

                <div className="space-y-6 pt-10 border-t border-black/5 dark:border-white/5">
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className={`w-full py-6 md:py-8 rounded-[32px] font-black uppercase text-[12px] md:text-[14px] tracking-[0.6em] flex items-center justify-center gap-4 transition-all shadow-xl hover:scale-[1.01] active:scale-95 ${
                            saveSuccess 
                            ? 'bg-emerald-600 text-white shadow-emerald-500/30' 
                            : 'bg-accent text-on-accent shadow-accent/30'
                        }`}
                    >
                        {isSaving ? <RefreshCw className="animate-spin" size={24} /> : saveSuccess ? <CheckCircle2 size={24} /> : <Zap size={24} />}
                        {isSaving ? "SYNCING_NEURAL_CONFIG..." : saveSuccess ? "SYSTEM_UPDATED" : "DEPLOY_SYSTEM_CHANGES"}
                    </button>

                    <button 
                        onClick={() => { if(confirm("Hapus semua data kognitif?")) { localStorage.clear(); window.location.reload(); } }}
                        className="w-full py-5 rounded-[28px] border border-red-500/20 bg-red-500/5 text-red-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-red-500 hover:text-white transition-all group hover:shadow-lg hover:shadow-red-500/20"
                    >
                        <Trash2 size={16} /> FACTORY_RESET_TERMINAL
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
