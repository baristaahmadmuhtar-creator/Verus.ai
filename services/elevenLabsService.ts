import { ElevenLabsClient } from "elevenlabs"; // Import yang benar
import { KEY_MANAGER } from './geminiService';
import { debugService } from './debugService';

// --- VOICE MAPPING SYSTEM ---
export const VOICE_MAPPING: Record<string, string> = {
    'Melsa': 'JBFqnCBsd6RMkjVDRZzb', 
    'Zephyr': '21m00Tcm4TlvDq8ikWAM',
    'Kore': 'EXAVITQu4vr4xnSDxMaL',  
    'Fenrir': 'TxGEqnHWrfWFTfGW9XjX',
    'Puck': 'IKne3meq5aSn9XLyUdCD',   
    'default': 'JBFqnCBsd6RMkjVDRZzb'
};

export async function speakWithMelsa(text: string, voiceNameOverride?: string): Promise<void> {
    const apiKey = KEY_MANAGER.getKey('ELEVENLABS');

    if (!apiKey) {
        debugService.log('ERROR', 'MELSA_VOICE', 'NO_KEY', 'ElevenLabs API Key is missing.');
        console.warn("⚠️ ElevenLabs API Key missing. Please set VITE_ELEVENLABS_API_KEY in .env");
        return;
    }

    try {
        let selectedName = voiceNameOverride;
        
        if (!selectedName) {
            const storedVoice = localStorage.getItem('melsa_voice');
            selectedName = storedVoice ? JSON.parse(storedVoice) : 'Melsa';
        }

        const voiceId = VOICE_MAPPING[selectedName || 'Melsa'] || VOICE_MAPPING['Melsa'];

        debugService.log('INFO', 'MELSA_VOICE', 'INIT', `Generating audio for: "${text.slice(0, 20)}..." using ${voiceId}`);
        
        const elevenlabs = new ElevenLabsClient({
            apiKey: apiKey, 
        });

        // Versi terbaru menggunakan .generate() bukan .convert()
        const audioStream = await elevenlabs.generate({
            voice: voiceId,
            text: text,
            model_id: "eleven_multilingual_v2",
        });

        debugService.log('INFO', 'MELSA_VOICE', 'PLAY', 'Audio received. Playing stream...');

        // Karena 'play' dari SDK lama sering bermasalah di browser, 
        // kita gunakan standar Web Audio API yang lebih stabil:
        const response = new Response(audioStream as any);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        await audio.play();

    } catch (error: any) {
        debugService.log('ERROR', 'MELSA_VOICE', 'FAIL', error.message);
        console.error("ElevenLabs Error:", error);
    }
}