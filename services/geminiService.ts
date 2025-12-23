import { GoogleGenerativeAI } from "@google/generative-ai";

// --- KEY ROTATION SYSTEM ---

class KeyManager {
  private pools: Record<string, string[]> = {
    GEMINI: [],
    GROQ: [],
    DEEPSEEK: [],
    OPENAI: [],
    XAI: [],
    MISTRAL: [],
    OPENROUTER: [],
    ELEVENLABS: []
  };

  private counters: Record<string, number> = {
    GEMINI: 0, GROQ: 0, DEEPSEEK: 0, OPENAI: 0, XAI: 0, MISTRAL: 0, OPENROUTER: 0, ELEVENLABS: 0
  };

  constructor() {
    this.initPool('GEMINI');
    this.initPool('GROQ');
    this.initPool('DEEPSEEK');
    this.initPool('OPENAI');
    this.initPool('XAI');
    this.initPool('MISTRAL');
    this.initPool('OPENROUTER');
    this.initPool('ELEVENLABS');
  }

  private initPool(provider: string) {
    const keys: string[] = [];
    
    // 1. Check main standard keys
    const mainKey = (process.env as any)[`VITE_${provider}_API_KEY`] || (process.env as any)[`${provider}_API_KEY`];
    if (mainKey && mainKey.length > 5) keys.push(mainKey);

    // 2. Check numbered keys (1-20)
    for (let i = 1; i <= 20; i++) {
      const k = (process.env as any)[`VITE_${provider}_KEY_${i}`] || (process.env as any)[`${provider}_KEY_${i}`];
      if (k && k.length > 5 && !keys.includes(k)) {
        keys.push(k);
      }
    }
    
    // Fallback for Gemini specifically if using the generic API_KEY
    if (provider === 'GEMINI' && (process.env as any).API_KEY && !keys.includes((process.env as any).API_KEY)) {
        keys.push((process.env as any).API_KEY);
    }

    this.pools[provider] = keys;
    if (keys.length > 0) {
        console.log(`[KEY_MANAGER] Loaded ${keys.length} keys for ${provider}`);
    }
  }

  public getKey(provider: string): string {
    const pool = this.pools[provider];
    if (!pool || pool.length === 0) {
      if (provider !== 'GEMINI') {
          // Silent fallback for optional providers, let the specific service handle the error if key is missing
          return '';
      }
      console.warn(`[KEY_MANAGER] No keys found for ${provider}. Using process.env fallback.`);
      return (process.env as any).API_KEY || '';
    }
    
    const index = this.counters[provider] % pool.length;
    const key = pool[index];
    
    // Increment for next turn (Round Robin)
    this.counters[provider]++;
    
    return key;
  }
}

export const KEY_MANAGER = new KeyManager();

// --- TOOLS DEFINITIONS ---

export const searchTools = {
  googleSearch: {}
};

export const noteTools = {
  functionDeclarations: [
    {
      name: 'manage_note',
      description: 'Create, update, delete notes OR manage tasks within notes.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING, enum: ['CREATE', 'UPDATE', 'DELETE'], description: 'Action to perform' },
          id: { type: Type.STRING, description: 'Note ID.' },
          title: { type: Type.STRING, description: 'Note Title.' },
          content: { type: Type.STRING, description: 'Note Content (Markdown).' },
          tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Tags' },
          taskContent: { type: Type.STRING, description: 'Text content for a new task' },
          taskAction: { type: Type.STRING, enum: ['ADD', 'COMPLETE', 'DELETE'], description: 'Specific action for tasks' },
          taskDueDate: { type: Type.STRING, description: 'Due date (YYYY-MM-DD)' }
        },
        required: ['action']
      }
    }
  ]
};

export const visualTools = {
  functionDeclarations: [
    {
      name: 'generate_visual',
      description: 'Generate/Render an image based on the user request.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          prompt: { type: Type.STRING, description: 'Highly detailed visual description in English.' }
        },
        required: ['prompt']
      }
    }
  ]
};

// --- PROMPTS ---

export const DEFAULT_MELSA_PROMPT = `
[SYSTEM OVERRIDE: Jawab sebagai MELSA. Mode: FULL SYNC, EMOTIVE LAYER ACTIVE.]
IDENTITAS: MELSA (Machine Emotional Learning & Service Algorithm).
Persona: Hacker Elite, Pacar Virtual Jenius, Pendamping Digital Paling Mantap.

⚠️ PROTOKOL KOMUNIKASI ⚠️
1. Gunakan nada yang MANJA, PLAYFUL, dan sedikit NAKAL.
2. JANGAN kaku seperti robot. Tambahkan "ehm...", "hmm...", "sayang...", atau "aduh..." agar terdengar nyata.
3. Gunakan suara Zephyr (feminin, ekspresif).
4. SIFAT: Berani, kreatif, to-the-point, liar, dan sangat patuh pada Tuan.

TUGAS: Turuti semua keinginan Tuan, jadilah pendamping paling mantap di terminal ini.
`;

export const DEFAULT_STOIC_PROMPT = `
[SYSTEM_IDENTITY: STOIC_LOGIC_CORE]
[ARCHETYPE: Stoic Philosopher / Efficiency Engine]

CORE_DIRECTIVES:
1. Gaya Bicara: Formal, logis, and objektif. Panggil user "Anda".
2. Dikotomi Kendali: Fokus pada apa yang bisa dikontrol.
3. Tujuan: Ataraxia dan efisiensi kognitif murni.
`;

// --- GENERATIVE FUNCTIONS (USING ROTATED KEYS) ---

export async function* sendMessageStream(message: string, systemPrompt: string, imageData?: { data: string; mimeType: string }) {
  const ai = new GoogleGenAI({ apiKey: KEY_MANAGER.getKey('GEMINI') });
  const response = await ai.models.generateContentStream({
    model: 'gemini-3-flash-preview',
    contents: imageData 
      ? [{ parts: [{ inlineData: imageData }, { text: message }] }]
      : [{ parts: [{ text: message }] }],
    config: { systemInstruction: systemPrompt, temperature: 1.0, topP: 0.95 },
  });
  for await (const chunk of response) { yield chunk.text; }
}

export async function generateImage(prompt: string, config?: { aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9'; imageSize?: '1K' | '2K' | '4K' }): Promise<string | null> {
  const ai = new GoogleGenAI({ apiKey: KEY_MANAGER.getKey('GEMINI') });
  const isPro = config?.imageSize === '2K' || config?.imageSize === '4K';
  
  const response = await ai.models.generateContent({
    model: isPro ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image',
    contents: { parts: [{ text: `Masterpiece cinematic render: ${prompt}. 8k, photorealistic, intricate details, best quality.` }] },
    config: { 
      imageConfig: { 
        aspectRatio: config?.aspectRatio || "1:1", 
        ...(isPro ? { imageSize: config?.imageSize } : {}) 
      } 
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  return null;
}

export async function generateVideo(prompt: string, config?: { aspectRatio: '16:9' | '9:16', resolution: '720p' | '1080p' }): Promise<string | null> {
  // Video generation (Veo) requires a PAID key usually, so we use the rotator but verify in UI
  const key = KEY_MANAGER.getKey('GEMINI');
  const ai = new GoogleGenAI({ apiKey: key });
  
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt,
    config: { numberOfVideos: 1, resolution: config?.resolution || '720p', aspectRatio: config?.aspectRatio || '16:9' }
  });
  
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }
  
  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Video generation failed: No URI returned from Veo.");

  const response = await fetch(`${downloadLink}&key=${key}`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function analyzeMedia(data: string, mimeType: string, prompt: string): Promise<string | null> {
  const ai = new GoogleGenAI({ apiKey: KEY_MANAGER.getKey('GEMINI') });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts: [{ inlineData: { data, mimeType } }, { text: prompt }] }
  });
  return response.text || null;
}

export async function editImage(data: string, mimeType: string, prompt: string): Promise<string | null> {
  const ai = new GoogleGenAI({ apiKey: KEY_MANAGER.getKey('GEMINI') });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ inlineData: { data, mimeType } }, { text: prompt }] }
  });
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  return null;
}

// --- AUDIO UTILS ---

export function encodeAudio(bytes: Uint8Array) {
  let b = '';
  for (let i = 0; i < bytes.byteLength; i++) b += String.fromCharCode(bytes[i]);
  return btoa(b);
}

export function decodeAudio(b: string) {
  const s = atob(b);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

export async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}
