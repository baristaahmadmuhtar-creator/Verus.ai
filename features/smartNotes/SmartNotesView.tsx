
import { AlertCircle, Archive, ArrowLeft, Bookmark, Calendar, CheckCircle2, FileText, MousePointerSquareDashed, Plus, Search, ShieldAlert, Trash2, X, ListTodo, Mic, Clock, CheckSquare, Radio, Activity, Loader2, Zap, Mic2, Sparkles, Share2, Eye, Type, Target, RefreshCw } from 'lucide-react';
import React, { useMemo, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { pb } from '../../services/pb'; // Import Database
import { type Note, type TaskItem } from '../../types';
import { NoteBatchActions } from './NoteBatchActions';
import { AdvancedEditor } from './AdvancedEditor';
import useLocalStorage from '../../hooks/useLocalStorage';

const SmartNotesView: React.FC = () => {
    // Database State
    const [notes, setNotes] = useState<Note[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

    // UI State
    const [language] = useLocalStorage<'id' | 'en'>('app_language', 'id');
    const [fontSize, setFontSize] = useLocalStorage<number>('notes_font_size', 18);
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'edit' | 'tasks' | 'preview'>('preview');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [viewArchive, setViewArchive] = useState(false);
    const [newTaskText, setNewTaskText] = useState('');

    const userId = pb.authStore.model?.id;

    // --- DATABASE OPERATIONS ---

    const fetchNotes = async () => {
        try {
            const records = await pb.collection('notes').getFullList<Note>({
                sort: '-updated',
            });
            setNotes(records);
        } catch (e) {
            console.error("Error fetching notes:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchNotes();
        // Subscribe to Realtime Changes
        pb.collection('notes').subscribe('*', function (e) {
            if (e.action === 'create') {
                setNotes((prev) => [e.record as Note, ...prev]);
            }
            if (e.action === 'update') {
                setNotes((prev) => prev.map((n) => (n.id === e.record.id ? (e.record as Note) : n)));
            }
            if (e.action === 'delete') {
                setNotes((prev) => prev.filter((n) => n.id !== e.record.id));
            }
        });

        return () => {
            pb.collection('notes').unsubscribe();
        };
    }, []);

    const createNote = async () => {
        if (!userId) return;
        try {
            const newNote = await pb.collection('notes').create({
                title: '',
                content: '',
                tags: [],
                user: userId,
                is_archived: false,
                is_pinned: false,
                tasks: []
            });
            // State update handled by subscription or optimistic UI
            setActiveNoteId(newNote.id);
            setViewMode('edit');
        } catch (e) {
            console.error("Failed to create note:", e);
        }
    };

    const updateNote = async (id: string, updates: Partial<Note>) => {
        // Optimistic Update for UI speed
        setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
        setIsSyncing(true);
        
        try {
            await pb.collection('notes').update(id, updates);
        } catch (e) {
            console.error("Failed to update note:", e);
            // Revert if needed (omitted for brevity)
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDelete = async () => { 
        if (isSelectionMode) {
            const ids = Array.from(selectedIds);
            for (const id of ids) {
                await pb.collection('notes').delete(id);
            }
            setSelectedIds(new Set());
            setIsSelectionMode(false);
        } else if (activeNoteId) { 
            await pb.collection('notes').delete(activeNoteId);
            setActiveNoteId(null); 
        }
        setShowDeleteConfirm(false); 
    };

    // --- UI LOGIC ---

    const activeNote = useMemo(() => notes.find(note => note.id === activeNoteId), [notes, activeNoteId]);

    const translations = {
        id: {
            archive: "ARSIP", search: "CARI VAULT...", new: "BARU", write: "EDIT", tasks: "TUGAS", preview: "LIHAT",
            untitled: "TANPA_JUDUL", deleteHeader: "HAPUS NODE?", deleteDesc: "Hapus permanen data ini dari Database?", 
            addTask: "TAMBAH", taskPlaceholder: "Input tugas baru...", noTasks: "BELUM ADA TUGAS", vault: "VAULT",
            delete: "HAPUS", cancel: "BATAL"
        },
        en: {
            archive: "ARCHIVE", search: "SEARCH VAULT...", new: "NEW", write: "EDIT", tasks: "TASKS", preview: "VIEW",
            untitled: "UNTITLED", deleteHeader: "DELETE NODE?", deleteDesc: "Permanently remove from Database?", 
            addTask: "ADD", taskPlaceholder: "New task item...", noTasks: "NO TASKS FOUND", vault: "VAULT",
            delete: "DELETE", cancel: "CANCEL"
        }
    }[language];

    const filteredNotes = useMemo(() => {
        return notes
            .filter(note => {
                const matchesSearch = (note.title + note.content).toLowerCase().includes(searchQuery.toLowerCase());
                const matchesArchive = !!note.is_archived === viewArchive;
                return matchesSearch && matchesArchive;
            })
            // Sort by pinned first, then updated
            .sort((a, b) => {
                if (a.is_pinned && !b.is_pinned) return -1;
                if (!a.is_pinned && b.is_pinned) return 1;
                return new Date(b.updated).getTime() - new Date(a.updated).getTime();
            });
    }, [notes, searchQuery, viewArchive]);

    const toggleSelection = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) newSelected.delete(id); else newSelected.add(id);
        setSelectedIds(newSelected);
        setIsSelectionMode(newSelected.size > 0);
    };

    const addTask = () => {
        if (!newTaskText.trim() || !activeNoteId || !activeNote) return;
        const newTask: TaskItem = { id: uuidv4(), text: newTaskText, isCompleted: false };
        updateNote(activeNoteId, { tasks: [...(activeNote.tasks || []), newTask] });
        setNewTaskText('');
    };

    const toggleTask = (taskId: string) => { 
        if (!activeNoteId || !activeNote) return;
        updateNote(activeNoteId, { tasks: activeNote.tasks?.map(t => t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t) });
    };

    if (isLoading && notes.length === 0) {
        return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-accent" size={32} /></div>;
    }

    return (
        <div className="min-h-full flex flex-col p-2 md:p-6 lg:p-8 animate-fade-in pb-40">
             <div className="flex-1 bg-white dark:bg-[#0a0a0b] rounded-[32px] md:rounded-[40px] shadow-sm border border-black/5 dark:border-white/5 flex flex-col relative overflow-hidden">
                
                {showDeleteConfirm && (
                    <div className="fixed inset-0 z-[1100] bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
                        <div className="bg-white dark:bg-[#121214] border border-red-500/20 p-8 rounded-[32px] max-w-sm w-full shadow-2xl animate-slide-up text-center space-y-6">
                            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20 mx-auto">
                                <AlertCircle size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-black dark:text-white uppercase italic tracking-tighter mb-2">{translations.deleteHeader}</h3>
                                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">{translations.deleteDesc}</p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={handleDelete} className="flex-1 py-4 rounded-xl bg-red-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20">HAPUS</button>
                                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-4 rounded-xl bg-black/5 dark:bg-white/5 text-neutral-400 font-black text-[10px] uppercase tracking-widest">BATAL</button>
                            </div>
                        </div>
                    </div>
                )}

                {activeNoteId && activeNote ? (
                    <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#0a0a0b] animate-slide-up relative z-10 overflow-hidden">
                        <header className="px-5 md:px-8 py-4 flex items-center justify-between border-b border-black/5 dark:border-white/5 bg-white dark:bg-[#0a0a0b] sticky top-0 z-20">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setActiveNoteId(null)} className="w-9 h-9 flex items-center justify-center bg-zinc-100 dark:bg-white/5 rounded-xl text-neutral-500 hover:text-black dark:hover:text-white transition-all"><ArrowLeft size={18} /></button>
                                <div className="flex bg-zinc-100 dark:bg-white/5 p-1 rounded-xl">
                                    <button onClick={() => setViewMode('preview')} className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'preview' ? 'bg-white dark:bg-black text-black dark:text-white shadow-sm' : 'text-neutral-400'}`}>{translations.preview}</button>
                                    <button onClick={() => setViewMode('edit')} className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'edit' ? 'bg-white dark:bg-black text-black dark:text-white shadow-sm' : 'text-neutral-400'}`}>{translations.write}</button>
                                    <button onClick={() => setViewMode('tasks')} className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'tasks' ? 'bg-white dark:bg-black text-black dark:text-white shadow-sm' : 'text-neutral-400'}`}>{translations.tasks}</button>
                                </div>
                                {isSyncing && <RefreshCw size={14} className="text-accent animate-spin" />}
                            </div>
                            <button onClick={() => setShowDeleteConfirm(true)} className="p-2 text-neutral-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                        </header>
                        
                        <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-12 pb-40">
                            <div className="max-w-4xl mx-auto h-full flex flex-col pb-32">
                                <input 
                                    type="text" 
                                    value={activeNote.title} 
                                    readOnly={viewMode === 'preview'}
                                    onChange={(e) => updateNote(activeNote.id, { title: e.target.value })} 
                                    className={`w-full bg-transparent text-4xl md:text-5xl font-black text-black dark:text-white focus:outline-none mb-8 tracking-tighter uppercase italic placeholder:text-neutral-200 dark:placeholder:text-neutral-800`} 
                                    placeholder={translations.untitled} 
                                />
                                
                                {viewMode === 'edit' ? (
                                    <AdvancedEditor 
                                        initialContent={activeNote.content} 
                                        onSave={(content) => updateNote(activeNote.id, { content })} 
                                        language={language}
                                        fontSize={fontSize}
                                        onFontSizeChange={setFontSize}
                                    />
                                ) : viewMode === 'preview' ? (
                                    <div 
                                      className="animate-fade-in pb-40 selection:bg-accent/30 leading-relaxed text-black dark:text-neutral-200 stoic-rich-text font-medium"
                                      style={{ fontSize: `${fontSize}px` }}
                                      dangerouslySetInnerHTML={{ __html: activeNote.content || `<p class="italic opacity-40">Hening. Tidak ada pikiran yang tertuang.</p>` }}
                                    />
                                ) : (
                                    <div className="space-y-6 animate-slide-up">
                                        <div className="flex gap-2 p-2 bg-zinc-100 dark:bg-white/5 rounded-2xl border border-black/5">
                                            <input type="text" value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)} placeholder={translations.taskPlaceholder} className="flex-1 bg-transparent px-4 text-[13px] font-bold focus:outline-none" onKeyDown={(e) => e.key === 'Enter' && addTask()} />
                                            <button onClick={addTask} className="h-10 px-4 bg-accent text-on-accent rounded-xl font-black uppercase text-[9px] tracking-widest transition-all hover:scale-105 active:scale-95">TAMBAH</button>
                                        </div>
                                        <div className="space-y-2">
                                            {activeNote.tasks?.map(t => (
                                                <div key={t.id} className="flex items-center gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-black/5">
                                                    <button onClick={() => toggleTask(t.id)} className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${t.isCompleted ? 'bg-accent border-accent text-on-accent' : 'border-neutral-300'}`}>
                                                        <CheckSquare size={14} />
                                                    </button>
                                                    <span className={`text-[13px] font-bold ${t.isCompleted ? 'line-through opacity-40 italic' : ''}`}>{t.text}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col bg-white dark:bg-[#0a0a0b] relative overflow-hidden">
                         <header className="px-6 md:px-10 py-8 border-b border-black/5 dark:border-white/5 bg-white dark:bg-[#0a0a0b] shrink-0">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <Target size={16} className="text-accent" />
                                        <span className="text-neutral-400 tech-mono text-[9px] font-black uppercase tracking-[0.4em]">DATABASE_VAULT</span>
                                    </div>
                                    <h2 className="text-6xl md:text-7xl font-black italic tracking-tighter text-black dark:text-white leading-[0.85] uppercase">
                                        ARCHIVE <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-blue-500">NOTE</span>
                                    </h2>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <button onClick={createNote} className="h-12 px-6 rounded-2xl bg-accent text-on-accent font-black uppercase text-[10px] tracking-widest shadow-lg shadow-accent/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"><Plus size={16} /> {translations.new}</button>
                                    <button onClick={() => setViewArchive(!viewArchive)} className={`h-12 w-12 rounded-2xl flex items-center justify-center border transition-all ${viewArchive ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-zinc-100 dark:bg-white/5 border-transparent text-neutral-500 hover:text-black dark:hover:text-white'}`}><Archive size={18} /></button>
                                    <button onClick={() => setIsSelectionMode(!isSelectionMode)} className={`h-12 w-12 rounded-2xl flex items-center justify-center border transition-all ${isSelectionMode ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg' : 'bg-zinc-100 dark:bg-white/5 border-transparent text-neutral-500 hover:text-black dark:hover:text-white'}`}><MousePointerSquareDashed size={18} /></button>
                                </div>
                            </div>
                            <div className="relative group">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-accent transition-colors" size={18} />
                                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={translations.search} className="w-full h-14 bg-zinc-100 dark:bg-white/5 border border-transparent focus:border-accent/30 pl-14 pr-6 text-[11px] font-black uppercase tracking-widest focus:outline-none rounded-2xl text-black dark:text-white transition-all placeholder:text-neutral-500" />
                            </div>
                        </header>
                        <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-10 pb-40">
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                {filteredNotes.map((note) => (
                                    <div key={note.id} onClick={() => { if (isSelectionMode) toggleSelection(note.id); else { setActiveNoteId(note.id); setViewMode('preview'); } }} className={`p-6 h-64 cursor-pointer relative overflow-hidden flex flex-col justify-between transition-all rounded-[28px] border group hover:-translate-y-1 hover:shadow-xl ${selectedIds.has(note.id) ? 'bg-accent/10 border-accent/50 ring-1 ring-accent' : 'bg-zinc-50 dark:bg-white/[0.03] border-black/5 dark:border-white/5 hover:border-accent/30'}`}>
                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className={`text-xl font-black uppercase leading-[0.9] tracking-tighter italic line-clamp-2 ${selectedIds.has(note.id) ? 'text-accent' : 'text-black dark:text-white group-hover:text-accent transition-colors'}`}>{note.title || translations.untitled}</h3>
                                                {note.is_pinned && <Bookmark size={14} className="text-yellow-500 fill-yellow-500" />}
                                            </div>
                                            <div className="text-[10px] text-neutral-500 line-clamp-4 font-bold uppercase leading-relaxed opacity-60">{note.content.replace(/<[^>]*>/g, '').slice(0, 150) || "Kosong..."}</div>
                                        </div>
                                        <div className="pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between"><span className="tech-mono text-[9px] font-bold text-neutral-400">{new Date(note.updated).toLocaleDateString()}</span><div className={`w-8 h-8 rounded-full bg-white dark:bg-white/10 flex items-center justify-center transition-all ${isSelectionMode ? 'scale-100 opacity-100' : 'opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100'}`}>{isSelectionMode ? (selectedIds.has(note.id) ? <CheckCircle2 size={16} className="text-accent" /> : <div className="w-4 h-4 rounded-full border-2 border-neutral-300"></div>) : <ArrowLeft size={14} className="rotate-180" />}</div></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
             </div>
             <NoteBatchActions selectedCount={selectedIds.size} totalCount={filteredNotes.length} isViewingArchive={viewArchive} onSelectAll={() => setSelectedIds(new Set(filteredNotes.map(n => n.id)))} onDeselectAll={() => setSelectedIds(new Set())} onDeleteSelected={() => setShowDeleteConfirm(true)} onExportSelected={() => {}} onArchiveSelected={() => {}} onPinSelected={() => {}} onCancel={() => { setSelectedIds(new Set()); setIsSelectionMode(false); }} />
        </div>
    );
};

export default SmartNotesView;
