
import { ElevenLabsClient, play } from '@elevenlabs/elevenlabs-js';
import { KEY_MANAGER } from './geminiService';
import { debugService } from './debugService';

// --- VOICE MAPPING SYSTEM ---
export const VOICE_MAPPING: Record<string, string> = {
    // ID Melsa sesuai request Anda
    'Melsa': 'JBFqnCBsd6RMkjVDRZzb', 
    
    // Google Gemini Equivalents -> ElevenLabs Standard Voices
    'Zephyr': '21m00Tcm4TlvDq8ikWAM', // Rachel
    'Kore': 'EXAVITQu4vr4xnSDxMaL',   // Bella
    'Fenrir': 'TxGEqnHWrfWFTfGW9XjX', // Josh
    'Puck': 'IKne3meq5aSn9XLyUdCD',   // Charlie
    
    // Fallback
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
        // 1. Determine Voice ID
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

        // Menggunakan Model Multilingual v2 sesuai request
        const audio = await elevenlabs.textToSpeech.convert(
            voiceId,
            {
                text: text,
                model_id: 'eleven_multilingual_v2', 
                output_format: 'mp3_44100_128',
            }
        );

        debugService.log('INFO', 'MELSA_VOICE', 'PLAY', 'Audio received. Playing stream...');
        await play(audio);

    } catch (error: any) {
        debugService.log('ERROR', 'MELSA_VOICE', 'FAIL', error.message);
        console.error("ElevenLabs Error:", error);
    }
}
