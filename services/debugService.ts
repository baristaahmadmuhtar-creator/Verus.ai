import { LogEntry, LogLevel } from '../types';
import { v4 as uuidv4 } from 'uuid';

const DEBUG_MODE = true; 

class DebugService {
    private logs: LogEntry[] = [];
    private listeners: ((logs: LogEntry[]) => void)[] = [];

    constructor() {
        this.log('INFO', 'KERNEL_INIT', 'SYSTEM_BOOT', 'Neural Kernel v13.0 Platinum Online.');
    }

    log(level: LogLevel, layer: string, code: string, message: string, payload: any = {}) {
        const timestamp = new Date().toISOString();
        
        const debugEvent: LogEntry = {
            id: uuidv4(),
            timestamp,
            layer,
            level,
            code,
            message,
            payload
        };

        if (DEBUG_MODE) {
            console.log(`%c[${level}] ${layer}::${code}`, 'color: #00f0ff; font-weight: bold;', debugEvent);
        }

        this.logs = [debugEvent, ...this.logs].slice(0, 100);
        this.notify();
    }

    getLogs() {
        return this.logs;
    }

    subscribe(callback: (logs: LogEntry[]) => void) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    private notify() {
        this.listeners.forEach(l => l(this.logs));
    }

    clear() {
        this.logs = [];
        this.log('INFO', 'SYSTEM_OP', 'LOG_CLEAR', 'Terminal Log dibersihkan.');
        this.notify();
    }
}

export const debugService = new DebugService();