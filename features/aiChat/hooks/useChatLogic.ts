
import { useState, useMemo, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { pb } from '../../../services/pb';
import useLocalStorage from '../../../hooks/useLocalStorage';
import { type ChatThread, type ChatMessage, type Note } from '../../../types';
import { MODEL_CATALOG, MELSA_KERNEL } from '../../../services/melsaKernel';
import { STOIC_KERNEL } from '../../../services/stoicKernel';
import { executeNeuralTool } from '../services/toolHandler';
import { speakWithMelsa } from '../../../services/elevenLabsService';

export const useChatLogic = (notes: Note[], setNotes: (notes: Note[]) => void) => {
    const [threads, setThreads] = useState<ChatThread[]>([]);
    // Active thread ID can still be local state for UI purposes
    const [activeThreadId, setActiveThreadId] = useLocalStorage<string | null>('active_thread_id', null);
    
    // VAULT ACCESS CONTROL - DEFAULT FALSE FOR SECURITY
    const [isVaultSynced, setIsVaultSynced] = useLocalStorage<boolean>('is_vault_synced', false);
    const [isAutoSpeak, setIsAutoSpeak] = useLocalStorage<boolean>('is_auto_speak', false);
    
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const userId = pb.authStore.model?.id;

    // --- DB OPERATIONS ---
    useEffect(() => {
        const fetchThreads = async () => {
            if(!userId) return;
            try {
                const records = await pb.collection('chat_threads').getFullList<ChatThread>({ sort: '-updated' });
                setThreads(records);
            } catch (e) { console.error("Error fetching chats", e); }
        };
        fetchThreads();

        // Subscribe to chat changes
        pb.collection('chat_threads').subscribe('*', function (e) {
            if (e.action === 'create') setThreads(prev => [e.record as ChatThread, ...prev]);
            if (e.action === 'update') setThreads(prev => prev.map(t => t.id === e.record.id ? e.record as ChatThread : t));
            if (e.action === 'delete') setThreads(prev => prev.filter(t => t.id !== e.record.id));
        });

        return () => { pb.collection('chat_threads').unsubscribe(); };
    }, [userId]);

    const saveThread = async (thread: ChatThread) => {
        // Optimistic UI
        setThreads(prev => {
            const exists = prev.find(t => t.id === thread.id);
            if (exists) return prev.map(t => t.id === thread.id ? thread : t);
            return [thread, ...prev];
        });

        try {
            // Check if exists in DB logic handled by ID usually, but PB 'create' needs no ID or generates one.
            // Since we use UUIDs for UI, we might need to check.
            // Simplified: Try update, if 404 then create.
            try {
                await pb.collection('chat_threads').update(thread.id, thread);
            } catch (e) {
                // If ID not found, create it.
                await pb.collection('chat_threads').create({ ...thread, user: userId });
            }
        } catch (e) { console.error("DB Save Error", e); }
    };

    // --- UI LOGIC ---

    const sortedThreads = useMemo(() => {
        return [...threads].sort((a, b) => 
            new Date(b.updated).getTime() - new Date(a.updated).getTime()
        );
    }, [threads]);

    const activeThread = useMemo(() => 
        threads.find(t => t.id === activeThreadId) || null, 
    [threads, activeThreadId]);

    const activeModel = useMemo(() => {
        const id = activeThread?.model_id || 'gemini-3-pro-preview';
        return MODEL_CATALOG.find(m => m.id === id) || MODEL_CATALOG[0];
    }, [activeThread]);

    const personaMode = activeThread?.persona || 'melsa';

    const handleNewChat = useCallback(async (persona: 'melsa' | 'stoic' = 'melsa') => {
        if (!userId) return;
        const welcome = persona === 'melsa' 
            ? "⚡ **MELSA UPLINK ONLINE.**\n\n*Hai Sayang, aku sudah siap mendengarkan. Apa pun yang Tuan inginkan, katakan saja.*" 
            : "🧠 **STOIC_LOGIC ACTIVE.**\n\nFokus pada apa yang bisa Anda kontrol. Saya siap membantu mengelola aset intelektual Anda.";
        
        // We let PocketBase generate ID if we used standard .create(), but for UI consistency with types we use text ID? 
        // PocketBase IDs are 15 chars. Let's create the object first.
        
        try {
            const newThread = await pb.collection('chat_threads').create({
                title: `SESSION_${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                persona,
                model_id: activeModel.id,
                messages: [{ id: uuidv4(), role: 'model', text: welcome, metadata: { status: 'success', model: 'System' } }],
                user: userId
            });
            setActiveThreadId(newThread.id);
        } catch (e) { console.error("Create Chat Error", e); }

    }, [activeModel.id, userId, setActiveThreadId]);

    const renameThread = useCallback(async (id: string, newTitle: string) => {
        try {
            await pb.collection('chat_threads').update(id, { title: newTitle });
        } catch(e) { console.error("Rename Error", e); }
    }, []);

    const sendMessage = async () => {
        const userMsg = input.trim();
        if (!userMsg || isLoading || !activeThreadId || !activeThread) return;

        if (activeThread.messages.length <= 1 && activeThread.title.startsWith('SESSION_')) {
            const suggestedTitle = userMsg.slice(0, 30) + (userMsg.length > 30 ? '...' : '');
            renameThread(activeThreadId, suggestedTitle.toUpperCase());
        }

        const updatedMessages: ChatMessage[] = [
            ...activeThread.messages, 
            { id: uuidv4(), role: 'user', text: userMsg, metadata: { status: 'success' } }
        ];

        const modelMessageId = uuidv4();
        const initialModelMessage: ChatMessage = { 
            id: modelMessageId, 
            role: 'model', 
            text: '', 
            metadata: { status: 'success', model: activeModel.name } 
        };

        const tempThread = { 
            ...activeThread, 
            messages: [...updatedMessages, initialModelMessage], 
            updated: new Date().toISOString() 
        };
        
        // Optimistic UI Update
        setThreads(prev => prev.map(t => t.id === activeThreadId ? tempThread : t));
        setInput('');
        setIsLoading(true);

        try {
            const noteContext = isVaultSynced 
                ? notes.map(n => `- [${n.id.slice(0,4)}] ${n.title}`).join('\n') 
                : "🚫 [[ACCESS_DENIED]]: Vault is LOCKED via Hardware Encryption.";

            const kernel = personaMode === 'melsa' ? MELSA_KERNEL : STOIC_KERNEL;
            const stream = kernel.streamExecute(userMsg, activeThread.model_id, noteContext);
            
            let accumulatedText = "";
            let currentFunctionCall: any = null;

            for await (const chunk of stream) {
                if (chunk.text) accumulatedText += chunk.text;
                if (chunk.functionCall) currentFunctionCall = chunk.functionCall;

                // Update UI state streaming
                setThreads(prev => prev.map(t => t.id === activeThreadId ? {
                    ...t,
                    messages: t.messages.map(m => m.id === modelMessageId ? {
                        ...m,
                        text: accumulatedText,
                        metadata: { ...m.metadata, groundingChunks: chunk.groundingChunks || m.metadata?.groundingChunks }
                    } : m)
                } : t));
            }

            if (isAutoSpeak && accumulatedText && !currentFunctionCall) {
                const cleanText = accumulatedText.replace(/[*#_`]/g, '');
                speakWithMelsa(cleanText, personaMode === 'melsa' ? 'Melsa' : 'Fenrir');
            }

            if (currentFunctionCall) {
                let toolResult = "";
                if (currentFunctionCall.name === 'manage_note' && !isVaultSynced) {
                     toolResult = "❌ SECURITY ALERT: Tool execution BLOCKED. Vault Locked.";
                } else {
                     toolResult = await executeNeuralTool(currentFunctionCall, notes, setNotes);
                }

                const followUpPrompt = `Tool "${currentFunctionCall.name}" executed: ${toolResult}. Berikan konfirmasi.`;
                const followUpStream = kernel.streamExecute(followUpPrompt, activeThread.model_id, noteContext);
                
                accumulatedText += `\n\n> System: ${toolResult}\n\n`;
                let followUpAccumulated = "";

                for await (const chunk of followUpStream) {
                    if (chunk.text) {
                        accumulatedText += chunk.text;
                        followUpAccumulated += chunk.text;
                    }
                    setThreads(prev => prev.map(t => t.id === activeThreadId ? {
                        ...t,
                        messages: t.messages.map(m => m.id === modelMessageId ? { ...m, text: accumulatedText } : m)
                    } : t));
                }
                
                if (isAutoSpeak && followUpAccumulated) {
                     speakWithMelsa(followUpAccumulated.replace(/[*#_`]/g, ''), personaMode === 'melsa' ? 'Melsa' : 'Fenrir');
                }
            }

            // FINAL DB SAVE
            await pb.collection('chat_threads').update(activeThreadId, {
                messages: [...updatedMessages, { ...initialModelMessage, text: accumulatedText }]
            });

        } catch (err: any) {
             setThreads(prev => prev.map(t => t.id === activeThreadId ? { 
                ...t, 
                messages: t.messages.map(m => m.id === modelMessageId ? {
                    ...m, text: `System Error: ${err.message}`, metadata: { status: 'error' }
                } : m)
            } : t));
        } finally {
            setIsLoading(false);
        }
    };

    return {
        threads: sortedThreads, 
        setThreads,
        activeThread, activeThreadId, setActiveThreadId,
        isVaultSynced, setIsVaultSynced,
        isAutoSpeak, setIsAutoSpeak, 
        input, setInput,
        isLoading,
        activeModel,
        personaMode,
        handleNewChat,
        renameThread,
        sendMessage
    };
};
