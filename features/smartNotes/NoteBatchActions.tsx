
import { Trash2, X, CheckSquare, Square, Archive, Layers, ShieldAlert, FileJson, Bookmark, ArchiveRestore } from 'lucide-react';
import React from 'react';

interface NoteBatchActionsProps {
    selectedCount: number;
    totalCount: number;
    isViewingArchive: boolean;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onDeleteSelected: () => void;
    onExportSelected: () => void;
    onArchiveSelected: () => void;
    onPinSelected: () => void;
    onCancel: () => void;
}

export const NoteBatchActions: React.FC<NoteBatchActionsProps> = ({
    selectedCount,
    totalCount,
    isViewingArchive,
    onSelectAll,
    onDeselectAll,
    onDeleteSelected,
    onExportSelected,
    onArchiveSelected,
    onPinSelected,
    onCancel
}) => {
    // Determine if sidebar should be visible
    const isVisible = selectedCount > 0;

    return (
        <>
            {/* Sidebar Drawer (Unified for Mobile & Desktop) */}
            <div className={`fixed inset-y-0 right-0 w-24 bg-white/90 dark:bg-[#050505]/95 backdrop-blur-xl border-l border-black/5 dark:border-white/5 z-[60] flex flex-col transition-transform duration-300 ease-out shadow-[-10px_0_40px_rgba(0,0,0,0.1)] ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}>
                
                {/* Header */}
                <div className="p-4 border-b border-black/5 dark:border-white/5 flex flex-col items-center gap-1 bg-accent/5">
                    <p className="text-2xl font-black text-accent leading-none italic">{selectedCount}</p>
                    <p className="tech-mono text-[6px] font-black text-neutral-500 uppercase tracking-widest">SELECTED</p>
                </div>

                {/* Actions */}
                <div className="flex-1 flex flex-col items-center gap-4 py-6 px-2 overflow-y-auto no-scrollbar">
                    <ActionButton icon={<Bookmark size={18} />} label="PIN" onClick={onPinSelected} />
                    <ActionButton icon={isViewingArchive ? <ArchiveRestore size={18} /> : <Archive size={18} />} label={isViewingArchive ? 'RESTORE' : 'ARCHIVE'} onClick={onArchiveSelected} />
                    <ActionButton icon={<FileJson size={18} />} label="JSON" onClick={onExportSelected} />
                    <div className="w-8 h-[1px] bg-black/10 dark:bg-white/10 my-2"></div>
                    <ActionButton icon={<ShieldAlert size={18} />} label="PURGE" onClick={onDeleteSelected} variant="danger" />
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 pb-8 md:pb-4">
                    <button onClick={onCancel} className="w-full py-3 rounded-xl bg-transparent hover:bg-white/20 text-neutral-500 hover:text-black dark:hover:text-white transition-all flex flex-col items-center gap-1">
                        <X size={18} />
                        <span className="text-[6px] font-black uppercase tracking-widest">CLOSE</span>
                    </button>
                </div>
            </div>
            
            {/* Overlay for Mobile only to dismiss by clicking outside */}
            <div 
                onClick={onCancel}
                className={`md:hidden fixed inset-0 bg-black/50 z-[50] transition-opacity duration-300 ${isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            ></div>
        </>
    );
};

const ActionButton: React.FC<{ icon: React.ReactNode, label: string, onClick: () => void, variant?: 'normal' | 'danger' }> = ({ icon, label, onClick, variant = 'normal' }) => (
    <button 
        onClick={onClick}
        className={`w-full aspect-square rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all group ${
            variant === 'danger' 
            ? 'bg-red-500/10 text-red-500 hover:bg-red-600 hover:text-white' 
            : 'bg-black/5 dark:bg-white/5 text-neutral-400 dark:text-neutral-500 hover:text-accent hover:bg-accent/10 border border-transparent hover:border-accent/20'
        }`}
    >
        {icon}
        <span className="text-[5px] font-black uppercase tracking-[0.2em]">{label}</span>
    </button>
);
