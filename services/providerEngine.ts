
import { KEY_MANAGER } from "./geminiService";
import { debugService } from "./debugService";
import Groq from "groq-sdk";
import { Mistral } from '@mistralai/mistralai';
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

export interface StandardMessage {
    role: string;
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

/**
 * Universal Streaming Engine for Multi-Provider Support
 * Optimized for Vercel Deployment & Browser Environments
 */
export async function* streamOpenAICompatible(
    provider: 'GROQ' | 'DEEPSEEK' | 'OPENAI' | 'XAI' | 'MISTRAL' | 'OPENROUTER',
    modelId: string,
    messages: StandardMessage[],
    systemInstruction?: string,
    tools: any[] = []
): AsyncGenerator<{ text?: string; functionCall?: any; }> {

    const apiKey = KEY_MANAGER.getKey(provider);
    
    // 1. FAIL SAFE: Check Key Existence
    if (!apiKey || apiKey.includes('GANTI_DENGAN')) {
        debugService.log('ERROR', 'PROVIDER_ENGINE', 'NO_KEY', `Missing API Key for ${provider}`);
        yield { text: `\n\n⚠️ **SYSTEM ALERT**: API Key untuk **${provider}** tidak ditemukan atau belum dikonfigurasi.\nMohon cek file \`.env\` atau \`Vercel Environment Variables\`.` };
        return;
    }

    const fullMessages: any[] = [
        { role: 'system', content: systemInstruction || "You are a helpful assistant." },
        ...messages
    ];

    // --- 2. GROQ HANDLING (Official SDK) ---
    if (provider === 'GROQ') {
        debugService.log('INFO', 'GROQ_ENGINE', 'SDK_INIT', `Initializing Groq SDK for ${modelId}`);
        
        try {
            const groq = new Groq({ 
                apiKey: apiKey, 
                dangerouslyAllowBrowser: true // Required for Client-Side Vercel Deployment
            });

            const isVisionModel = modelId.includes('vision') || modelId.includes('llama-3.2');
            
            // Filter tools for models that might not support them robustly yet
            const activeTools = (tools.length > 0 && !isVisionModel) ? tools : [];

            const completionStream = await groq.chat.completions.create({
                messages: fullMessages,
                model: modelId,
                temperature: 0.6,
                max_completion_tokens: 2048,
                top_p: 0.95,
                stop: null,
                stream: true,
                ...(activeTools.length > 0 ? { tools: activeTools, tool_choice: 'auto' } : {})
            });

            for await (const chunk of completionStream) {
                const content = chunk.choices[0]?.delta?.content;
                if (content) yield { text: content };
                
                const toolCalls = chunk.choices[0]?.delta?.tool_calls;
                if (toolCalls) {
                     // Groq tool calls handling (simplified for stream)
                }
            }
        } catch (error: any) {
             debugService.log('ERROR', 'GROQ_SDK', 'STREAM_ERR', error.message);
             yield { text: `\n⚠️ **Groq Error**: ${error.message}` };
        }
        return;
    }

    // --- 3. MISTRAL HANDLING (Official SDK) ---
    if (provider === 'MISTRAL') {
        debugService.log('INFO', 'MISTRAL_ENGINE', 'SDK_INIT', `Initializing Mistral SDK for ${modelId}`);
        try {
            const client = new Mistral({ apiKey: apiKey });
            
            const mistralMessages = fullMessages.map(m => ({
                role: m.role === 'model' ? 'assistant' : m.role,
                content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) 
            }));

            const chatStream = await client.chat.stream({
                model: modelId,
                messages: mistralMessages as any,
                temperature: 0.7,
                maxTokens: 2048,
                topP: 0.95,
            });

            for await (const chunk of chatStream) {
                const content = chunk.data.choices[0].delta.content;
                if (content) yield { text: String(content) };
            }
        } catch (error: any) {
            debugService.log('ERROR', 'MISTRAL_SDK', 'STREAM_ERR', error.message);
            yield { text: `\n⚠️ **Mistral Error**: ${error.message}` };
        }
        return;
    }

    // --- 4. DEEPSEEK / OPENAI / XAI HANDLING (Via OpenAI SDK) ---
    if (provider === 'DEEPSEEK' || provider === 'OPENAI' || provider === 'XAI') {
        const baseURLMap: Record<string, string> = {
            'DEEPSEEK': 'https://api.deepseek.com',
            'OPENAI': 'https://api.openai.com/v1',
            'XAI': 'https://api.x.ai/v1'
        };

        debugService.log('INFO', `${provider}_ENGINE`, 'SDK_INIT', `Initializing OpenAI SDK for ${provider}`);

        try {
            const openai = new OpenAI({
                baseURL: baseURLMap[provider],
                apiKey: apiKey,
                dangerouslyAllowBrowser: true
            });

            const completionStream = await openai.chat.completions.create({
                messages: fullMessages,
                model: modelId,
                stream: true,
                temperature: 0.7,
                // DeepSeek usually supports tools, but let's be careful
                ...(tools.length > 0 ? { tools: tools, tool_choice: 'auto' } : {}) 
            });

            for await (const chunk of completionStream) {
                const content = chunk.choices[0]?.delta?.content;
                if (content) yield { text: content };
                
                // Handle Tool Calls if any
                const toolCalls = chunk.choices[0]?.delta?.tool_calls;
                if (toolCalls) {
                    for (const tc of toolCalls) {
                        if (tc.function) {
                            yield { 
                                functionCall: {
                                    name: tc.function.name,
                                    args: tc.function.arguments, // Note: streaming args usually need accumulation
                                    id: tc.id
                                }
                            };
                        }
                    }
                }
            }
        } catch (error: any) {
            debugService.log('ERROR', `${provider}_SDK`, 'STREAM_ERR', error.message);
            yield { text: `\n⚠️ **${provider} Error**: ${error.message}` };
        }
        return;
    }

    // --- 5. OPENROUTER & GENERIC REST HANDLING (Fallback) ---
    
    // Configuration Map for REST
    const configMap = {
        'OPENROUTER': { baseUrl: 'https://openrouter.ai/api/v1' }
    };

    const config = (configMap as any)[provider];
    if (!config) {
        yield { text: `Provider ${provider} not configured.` };
        return;
    }

    // Prepare Payload
    const payload: any = {
        model: modelId,
        messages: fullMessages,
        stream: true,
        temperature: 0.7
    };

    // OpenRouter Specifics
    if (provider === 'OPENROUTER') {
        payload.provider = { sort: "throughput" };
        payload.transforms = ["middle-out"]; 
        
        if (modelId.includes('gpt-4o') || modelId.includes('sonnet') || modelId.includes('vision')) {
             payload.modalities = ['text', 'image'];
        }
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    };

    if (provider === 'OPENROUTER') {
        headers['HTTP-Referer'] = typeof window !== 'undefined' ? window.location.origin : 'https://istoic.ai';
        headers['X-Title'] = 'IStoicAI Terminal';
    }

    debugService.log('INFO', 'PROVIDER_ENGINE', `REQ_${provider}`, `Fetch stream to ${modelId}`);

    try {
        const response = await fetch(`${config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const errMsg = errData.error?.message || `HTTP ${response.status}`;
            throw new Error(errMsg);
        }

        if (!response.body) throw new Error("No response body received.");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === 'data: [DONE]') continue;
                if (!trimmed.startsWith('data: ')) continue;

                try {
                    const jsonStr = trimmed.slice(6);
                    const data = JSON.parse(jsonStr);
                    const delta = data.choices?.[0]?.delta;

                    if (!delta) continue;

                    if (delta.content) {
                        yield { text: delta.content };
                    }
                } catch (e) { }
            }
        }
    } catch (error: any) {
        debugService.log('ERROR', 'PROVIDER_ENGINE', 'STREAM_FAIL', error.message);
        yield { text: `\n\n⚠️ **Network Error**: ${error.message}` };
    }
}

/**
 * Utility: Analyze Multi-Modal Media (Images/Docs)
 * Supports Gemini, Groq (Llama Vision), Mistral (OCR), OpenRouter (GPT-4o)
 */
export async function analyzeMultiModalMedia(
    provider: string, 
    modelId: string, 
    data: string, // base64
    mimeType: string, 
    prompt: string
): Promise<string> {
    const apiKey = KEY_MANAGER.getKey(provider);
    if (!apiKey) throw new Error(`API Key for ${provider} not found`);

    debugService.log('INFO', 'MULTI_MODAL', 'ANALYZE', `Analyzing media via ${provider} (${modelId})`);

    // 1. GEMINI VISION
    if (provider === 'GEMINI') {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: modelId || 'gemini-3-pro-preview',
            contents: { parts: [{ inlineData: { data, mimeType } }, { text: prompt }] }
        });
        return response.text || "No response text.";
    }

    // 2. GROQ (Llama Vision)
    if (provider === 'GROQ') {
        const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });
        const response = await groq.chat.completions.create({
            model: modelId || 'llama-3.2-90b-vision-preview',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${data}` } }
                    ]
                }
            ]
        });
        return response.choices[0]?.message?.content || "No response.";
    }

    // 3. OPENROUTER (GPT-4o / Claude Vision)
    if (provider === 'OPENROUTER' || provider === 'OPENAI') {
         // OpenAI SDK for Vision
         if (provider === 'OPENAI') {
             const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
             const response = await openai.chat.completions.create({
                 model: modelId || 'gpt-4o',
                 messages: [
                     {
                         role: 'user',
                         content: [
                             { type: 'text', text: prompt },
                             { type: 'image_url', image_url: { url: `data:${mimeType};base64,${data}` } }
                         ]
                     }
                 ],
                 max_tokens: 300
             });
             return response.choices[0]?.message?.content || "No response.";
         }

         const baseUrl = provider === 'OPENROUTER' ? "https://openrouter.ai/api/v1" : "https://api.openai.com/v1";
         const response = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                ...(provider === 'OPENROUTER' ? { "HTTP-Referer": window.location.origin, "X-Title": "IStoicAI" } : {})
            },
            body: JSON.stringify({
                model: modelId || 'openai/gpt-4o',
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${data}` } }
                        ]
                    }
                ]
            })
         });
         const json = await response.json();
         if (json.error) throw new Error(json.error.message);
         return json.choices?.[0]?.message?.content || "No analysis returned.";
    }

    // 4. MISTRAL (OCR)
    if (provider === 'MISTRAL') {
        return "⚠️ Mistral OCR currently requires a hosted document URL. Please use Gemini or Groq for local file analysis.";
    }

    throw new Error(`Provider ${provider} not supported for Vision/Analysis.`);
}

/**
 * Utility: Generate Image (Multi-Provider)
 * Supports Gemini (Imagen), OpenAI (DALL-E 3)
 */
export async function generateMultiModalImage(
    provider: string,
    modelId: string,
    prompt: string,
    options: any
): Promise<string> {
    const apiKey = KEY_MANAGER.getKey(provider);
    if (!apiKey) throw new Error(`API Key for ${provider} not found`);
    
    debugService.log('INFO', 'MULTI_MODAL', 'GENERATE', `Generating image via ${provider} (${modelId})`);

    // 1. GEMINI (Imagen 3)
    if (provider === 'GEMINI') {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: modelId || 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
            config: { imageConfig: options }
        });
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
        }
        throw new Error("No image generated by Gemini.");
    }

    // 2. OPENAI (DALL-E 3)
    if (provider === 'OPENAI' || provider === 'OPENROUTER') {
        const openai = new OpenAI({ 
            apiKey, 
            dangerouslyAllowBrowser: true,
            baseURL: provider === 'OPENROUTER' ? 'https://openrouter.ai/api/v1' : undefined
        });

        const response = await openai.images.generate({
            model: modelId || "dall-e-3",
            prompt: prompt,
            n: 1,
            size: "1024x1024",
            response_format: "b64_json",
        });

        if (response.data && response.data[0]?.b64_json) {
            return `data:image/png;base64,${response.data[0].b64_json}`;
        }
        if (response.data && response.data[0]?.url) {
             return response.data[0].url;
        }
        throw new Error("No image data returned.");
    }

    throw new Error(`Provider ${provider} not supported for Image Generation.`);
}

/**
 * Utility: Execute Mistral OCR (Direct Export for Specific Use)
 */
export async function executeMistralOCR(documentUrl: string | { type: string, documentUrl?: string, imageBase64?: string }): Promise<any> {
    const apiKey = KEY_MANAGER.getKey('MISTRAL');
    if (!apiKey) throw new Error("Missing Mistral API Key");

    const client = new Mistral({ apiKey });
    
    // Normalize input
    const documentPayload: any = typeof documentUrl === 'string' 
        ? { type: "document_url", documentUrl: documentUrl }
        : documentUrl;

    debugService.log('INFO', 'MISTRAL_OCR', 'PROCESS', 'Starting OCR processing...');

    try {
        const ocrResponse = await client.ocr.process({
            model: "mistral-ocr-latest",
            document: documentPayload,
            includeImageBase64: true
        });
        return ocrResponse;
    } catch (error: any) {
        debugService.log('ERROR', 'MISTRAL_OCR', 'FAIL', error.message);
        throw error;
    }
}
