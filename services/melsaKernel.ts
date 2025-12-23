
import { GoogleGenAI } from "@google/genai";
import { debugService } from "./debugService";
import { MELSA_BRAIN } from "./melsaBrain";
import { noteTools, visualTools, searchTools, KEY_MANAGER } from "./geminiService";
import { streamOpenAICompatible } from "./providerEngine";
import { type ModelMetadata } from "../types";

export const MODEL_CATALOG: ModelMetadata[] = [
  // --- GEMINI SERIES ---
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', category: 'GEMINI_3', provider: 'GEMINI', description: 'Logika level dewa. Reasoning tinggi.', specs: { context: '2M+', speed: 'THINKING', intelligence: 10 } },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', category: 'GEMINI_3', provider: 'GEMINI', description: 'Kecepatan cahaya. Efisien.', specs: { context: '1M+', speed: 'FAST', intelligence: 9 } },
  
  // --- ELITE ARSENAL (Groq - Ultra Fast) ---
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Groq)', category: 'ARSENAL', provider: 'GROQ', description: 'Meta AI Powerhouse via Groq LPU.', specs: { context: '128K', speed: 'INSTANT', intelligence: 9 } },
  { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 (Groq)', category: 'ARSENAL', provider: 'GROQ', description: 'Reasoning model yang sangat cepat.', specs: { context: '128K', speed: 'INSTANT', intelligence: 9.5 } },
  { id: 'llama-3.2-90b-vision-preview', name: 'Llama 3.2 Vision', category: 'ARSENAL', provider: 'GROQ', description: 'Analisis visual instan.', specs: { context: '128K', speed: 'INSTANT', intelligence: 8.5 } },

  // --- OPENROUTER (Aggregator - Best for GPT-4o / Claude) ---
  { id: 'openai/gpt-4o', name: 'GPT-4o (OpenRouter)', category: 'ARSENAL', provider: 'OPENROUTER', description: 'Omni model. Cerdas & Stabil.', specs: { context: '128K', speed: 'FAST', intelligence: 10 } },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', category: 'ARSENAL', provider: 'OPENROUTER', description: 'Coding & reasoning terbaik via OpenRouter.', specs: { context: '200K', speed: 'FAST', intelligence: 10 } },
  { id: 'google/gemini-pro-1.5', name: 'Gemini 1.5 Pro (OR)', category: 'ARSENAL', provider: 'OPENROUTER', description: 'Fallback via OpenRouter.', specs: { context: '1M', speed: 'DEEP', intelligence: 9.5 } },
  
  // --- XAI ---
  { id: 'grok-2-latest', name: 'Grok 2', category: 'ARSENAL', provider: 'XAI', description: 'Real-time knowledge by xAI.', specs: { context: '128K', speed: 'FAST', intelligence: 9.5 } }
];

const getGenericTools = () => [
  ...noteTools.functionDeclarations,
  ...visualTools.functionDeclarations
].map(t => ({ 
  type: 'function', 
  function: { 
    name: t.name, 
    description: t.description, 
    parameters: t.parameters 
  } 
}));

export interface StreamChunk {
  text?: string;
  functionCall?: any;
  groundingChunks?: any[];
  metadata?: any;
}

class MelsaKernel {
  private history: any[] = [];

  // Execute non-streaming call (wrapper)
  async execute(msg: string, modelId: string, context?: string): Promise<{ text: string }> {
    let text = "";
    for await (const chunk of this.streamExecute(msg, modelId, context)) {
      if (chunk.text) text += chunk.text;
    }
    return { text };
  }

  // Main Streaming Execution
  async *streamExecute(msg: string, modelId: string, context?: string, imageData?: { data: string, mimeType: string }): AsyncGenerator<StreamChunk> {
    const startTime = Date.now();
    const model = MODEL_CATALOG.find(m => m.id === modelId) || MODEL_CATALOG[0];
    const systemPrompt = MELSA_BRAIN.getSystemInstruction('melsa', context);
    
    // Check Key Availability first to fail fast
    const key = KEY_MANAGER.getKey(model.provider);
    if (!key && model.provider !== 'GEMINI') {
        yield { text: `⚠️ API Key untuk **${model.provider}** tidak ditemukan di sistem environment.`, metadata: { status: 'error' } };
        return;
    }

    try {
      if (model.provider === 'GEMINI') {
        // --- GEMINI NATIVE HANDLING ---
        const ai = new GoogleGenAI({ apiKey: key });
        const config: any = { 
          systemInstruction: systemPrompt, 
          temperature: 0.85, 
          tools: [noteTools, visualTools, searchTools] 
        };
        
        if (model.id.includes('pro')) {
          config.thinkingConfig = { thinkingBudget: 1024 };
        }

        const contents = [
            ...this.history.map(h => ({ 
              role: h.role === 'assistant' ? 'model' : 'user', 
              parts: [{ text: h.content }] 
            })), 
            { 
                role: 'user', 
                parts: imageData 
                    ? [{ inlineData: imageData }, { text: msg }] 
                    : [{ text: msg }] 
            }
        ];

        const responseStream = await ai.models.generateContentStream({
          model: model.id,
          contents,
          config
        });

        let fullText = "";
        for await (const chunk of responseStream) {
          if (chunk.text) {
            fullText += chunk.text;
            yield { text: chunk.text };
          }
          if (chunk.functionCalls?.length) yield { functionCall: chunk.functionCalls[0] };
          if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            yield { groundingChunks: chunk.candidates[0].groundingMetadata.groundingChunks };
          }
        }
        this.updateHistory(msg, fullText);
        yield { metadata: { provider: 'GEMINI', model: model.name, latency: Date.now() - startTime, status: 'success' } };

      } else {
        // --- EXTERNAL PROVIDERS (Via Provider Engine / Groq SDK / OpenRouter) ---
        
        const historyMessages = this.history.map(h => ({ role: h.role, content: h.content }));
        
        // Construct Current Message (Text or Vision)
        // Ensure OpenAI compatible image format
        let currentMessageContent: any = msg;
        
        if (imageData) {
             currentMessageContent = [
                { type: "text", text: msg },
                { 
                    type: "image_url", 
                    image_url: { 
                        url: `data:${imageData.mimeType};base64,${imageData.data}` 
                    } 
                }
             ];
        }

        const genericTools = getGenericTools();

        const stream = streamOpenAICompatible(
            model.provider,
            model.id,
            [...historyMessages, { role: 'user', content: currentMessageContent }],
            systemPrompt,
            genericTools
        );

        let fullText = "";
        for await (const chunk of stream) {
            if (chunk.text) {
                fullText += chunk.text;
                yield { text: chunk.text };
            }
            if (chunk.functionCall) {
                yield { functionCall: chunk.functionCall };
            }
        }
        this.updateHistory(msg, fullText);
        yield { metadata: { provider: model.provider, model: model.name, latency: Date.now() - startTime, status: 'success' } };
      }

    } catch (err: any) {
      debugService.log('ERROR', 'MELSA_KERNEL', 'SYS-01', err.message);
      yield { text: `\n\n**System Error:** ${err.message}`, metadata: { status: 'error' } };
    }
  }

  private updateHistory(u: string, a: string) {
    if (!u || !a) return;
    this.history.push({ role: 'user', content: u }, { role: 'assistant', content: a });
    if (this.history.length > 10) this.history = this.history.slice(-10);
  }
  
  reset() { this.history = []; }
}

export const MELSA_KERNEL = new MelsaKernel();
