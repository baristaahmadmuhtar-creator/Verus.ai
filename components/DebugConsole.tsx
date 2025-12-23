import React, { useState, useEffect, useMemo } from 'react';
import { debugService } from '../services/debugService';
import { LogEntry } from '../types';
import { X, Terminal, Trash2, Bug, Zap, AlertCircle, Info, Cpu, Activity, Globe, Search, Copy, Database, Layers, Monitor, Wifi, Save } from 'lucide-react';

export const DebugConsole: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [filter, setFilter] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'LOGS' | 'SYSTEM'>('LOGS');
    const [telemetry, setTelemetry] = useState({ 
        cpu: '0%', 
        ram: '0MB', 
        latency: '0ms',
        fps: '60',
        userAgent: '',
        screen: ''
    });

    useEffect(() => {
        setLogs(debugService.getLogs());
        
        // System Info Initialization
        setTelemetry(prev => ({
            ...prev,
            userAgent: navigator.userAgent.split(') ')[0] + ')',
            screen: `${window.innerWidth}x${window.innerHeight}`
        }));

        const interval = setInterval(() => {
          // Simulated Dynamics for visual feel
          const perf = (window as any).performance;
          const mem = (perf && perf.memory) ? Math.round(perf.memory.usedJSHeapSize / 1024 / 1024) : Math.floor(Math.random() * 50 + 100);
          
          setTelemetry(prev => ({
            ...prev,
            cpu: `${Math.floor(Math.random() * 10 + 2)}%`,
            ram: `${mem}MB`,
            latency: `${Math.floor(Math.random() * 40 + 20)}ms`,
            screen: `${window.innerWidth}x${window.innerHeight}`
          }));
        }, 2000);

        const sub = debugService.subscribe((newLogs) => {
            setLogs(newLogs);
        });

        return () => {
          clearInterval(interval);
          sub();
        };
    }, []);

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesFilter = filter === 'ALL' || log.level === filter;
            // FIX: Changed log.source to log.layer to match LogEntry interface
            const matchesSearch = searchQuery === '' || 
                log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.layer.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesFilter && matchesSearch;
        });
    }, [logs, filter, searchQuery]);

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'ERROR': return 'text-red-500';
            case 'WARN': return 'text-orange-500';
            case 'KERNEL': return 'text-[var(--accent-color)] font-black italic';
            default: return 'text-neutral-400';
        }
    };

    const handleClearStorage = (key: string | null) => {
        if (key) {
            localStorage.removeItem(key);
            debugService.log('WARN', 'STORAGE', 'CLEAR_KEY', `Cleared local storage key: ${key}`);
        } else {
            if (confirm("FACTORY RESET: Ini akan menghapus semua data local. Lanjutkan?")) {
                localStorage.clear();
                window.location.reload();
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-[#050505]/95 backdrop-blur-2xl border-l border-white/10 z-[2000] shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col animate-slide-left tech-mono overflow-hidden">
            
            {/* Header */}
            <header className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-[var(--accent-color)]/10 text-[var(--accent-color)] rounded-lg border border-[var(--accent-color)]/20 shadow-[0_0_15px_var(--accent-glow)]">
                        <Terminal size={18} />
                    </div>
                    <div>
                        <h2 className="text-sm font-black tracking-[0.3em] text-white uppercase italic">SYSTEM_CONSOLE</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            <p className="text-[9px] text-neutral-500 uppercase tracking-widest leading-none">KERNEL_ACTIVE</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                     <div className="flex bg-white/5 rounded-lg p-1 border border-white/5">
                        <button onClick={() => setActiveTab('LOGS')} className={`px-4 py-1.5 text-[9px] font-bold rounded-md transition-all ${activeTab === 'LOGS' ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>LOGS</button>
                        <button onClick={() => setActiveTab('SYSTEM')} className={`px-4 py-1.5 text-[9px] font-bold rounded-md transition-all ${activeTab === 'SYSTEM' ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>SYSTEM</button>
                     </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-neutral-500 hover:text-white transition-all">
                        <X size={18} />
                    </button>
                </div>
            </header>

            {/* Content Area */}
            {activeTab === 'LOGS' ? (
                <>
                    {/* Log Filters */}
                    <div className="p-4 space-y-3 bg-black/20 border-b border-white/5">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 group-hover:text-[var(--accent-color)] transition-colors" size={14} />
                            <input 
                            type="text" 
                            placeholder="SEARCH_KERNEL_LOGS..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-10 text-[10px] text-white focus:outline-none focus:border-[var(--accent-color)] focus:bg-white/5 transition-all tech-mono uppercase tracking-widest placeholder:text-neutral-700"
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                            {['ALL', 'KERNEL', 'ERROR', 'WARN', 'INFO'].map(f => (
                                <button 
                                    key={f} 
                                    onClick={() => setFilter(f)}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all border whitespace-nowrap ${filter === f ? 'bg-[var(--accent-color)]/10 text-[var(--accent-color)] border-[var(--accent-color)]/30' : 'bg-transparent text-neutral-600 border-transparent hover:text-neutral-400'}`}
                                >
                                    {f}
                                </button>
                            ))}
                            <button onClick={() => debugService.clear()} className="ml-auto p-1.5 text-neutral-600 hover:text-red-500 transition-all" title="Clear Logs">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Log List */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scroll">
                        {filteredLogs.map(log => (
                            <div key={log.id} className="p-3 rounded-lg border border-transparent hover:border-white/5 hover:bg-white/[0.02] transition-all flex gap-3 group">
                                <span className="text-[9px] text-neutral-600 font-mono pt-0.5 min-w-[50px]">{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}</span>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[9px] font-black tracking-wider ${getLevelColor(log.level)}`}>{log.level}</span>
                                        {/* FIX: Changed log.source to log.layer to match LogEntry interface */}
                                        <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wide">@{log.layer}</span>
                                    </div>
                                    <p className="text-[10px] text-neutral-300 leading-relaxed font-mono opacity-80 group-hover:opacity-100">{log.message}</p>
                                </div>
                            </div>
                        ))}
                        {filteredLogs.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-neutral-700 gap-2">
                                <Activity size={24} />
                                <span className="text-[10px] uppercase tracking-widest">NO_LOGS_FOUND</span>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="flex-1 overflow-y-auto p-6 custom-scroll">
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center gap-2">
                            <Cpu size={20} className="text-[var(--accent-color)]" />
                            <div className="text-center">
                                <span className="block text-[9px] text-neutral-500 uppercase tracking-widest">CPU LOAD</span>
                                <span className="text-xl font-black text-white">{telemetry.cpu}</span>
                            </div>
                        </div>
                         <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center gap-2">
                            <Layers size={20} className="text-indigo-500" />
                            <div className="text-center">
                                <span className="block text-[9px] text-neutral-500 uppercase tracking-widest">MEMORY</span>
                                <span className="text-xl font-black text-white">{telemetry.ram}</span>
                            </div>
                        </div>
                         <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center gap-2">
                            <Wifi size={20} className="text-emerald-500" />
                            <div className="text-center">
                                <span className="block text-[9px] text-neutral-500 uppercase tracking-widest">LATENCY</span>
                                <span className="text-xl font-black text-white">{telemetry.latency}</span>
                            </div>
                        </div>
                         <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center gap-2">
                            <Monitor size={20} className="text-orange-500" />
                            <div className="text-center">
                                <span className="block text-[9px] text-neutral-500 uppercase tracking-widest">VIEWPORT</span>
                                <span className="text-xl font-black text-white">{telemetry.screen}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h3 className="text-[10px] text-neutral-500 font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2"><Globe size={12}/> ENVIRONMENT</h3>
                            <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-[9px] text-neutral-400 font-mono break-all leading-relaxed">
                                <span className="text-neutral-600">USER_AGENT:</span> {telemetry.userAgent}<br/>
                                <span className="text-neutral-600">PLATFORM:</span> {navigator.platform}<br/>
                                <span className="text-neutral-600">LANG:</span> {navigator.language}<br/>
                                <span className="text-neutral-600">CORES:</span> {navigator.hardwareConcurrency || 'N/A'}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-[10px] text-neutral-500 font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2"><Database size={12}/> STORAGE MANAGEMENT</h3>
                            <div className="grid grid-cols-1 gap-2">
                                <button onClick={() => handleClearStorage('melsa_threads')} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] group transition-all">
                                    <span className="text-[10px] font-bold text-neutral-300">CLEAR CHAT HISTORY</span>
                                    <Trash2 size={14} className="text-neutral-600 group-hover:text-red-500 transition-colors" />
                                </button>
                                <button onClick={() => handleClearStorage('notes')} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] group transition-all">
                                    <span className="text-[10px] font-bold text-neutral-300">CLEAR NOTES VAULT</span>
                                    <Trash2 size={14} className="text-neutral-600 group-hover:text-red-500 transition-colors" />
                                </button>
                                <button onClick={() => handleClearStorage(null)} className="flex items-center justify-between p-4 rounded-xl bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 group transition-all mt-2">
                                    <div className="flex items-center gap-3">
                                        <AlertCircle size={16} className="text-red-500" />
                                        <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">FACTORY RESET SYSTEM</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <footer className="p-4 bg-black/80 border-t border-white/5 flex items-center justify-between">
                 <p className="text-[8px] text-neutral-600 font-mono">ISTOIC_KERNEL_V12.5_BUILD_2025</p>
                 <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-color)] animate-pulse"></span>
                    <span className="text-[8px] font-bold text-[var(--accent-color)]">CONNECTED</span>
                 </div>
            </footer>
        </div>
    );
};