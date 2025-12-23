
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    // We create a structured env object that will be injected into process.env
    const processEnv: Record<string, string> = {};
    
    // Aggressively capture all provider keys, VAULT PIN, and POCKETBASE configuration
    const keyPatterns = ['GEMINI', 'GROQ', 'DEEPSEEK', 'OPENAI', 'XAI', 'MISTRAL', 'OPENROUTER', 'ELEVENLABS', 'API_KEY', 'VAULT_PIN', 'POCKETBASE'];

    Object.keys(env).forEach(key => {
        // Capture VITE_ prefixed keys OR any key containing our patterns
        if (key.startsWith('VITE_') || keyPatterns.some(p => key.includes(p))) {
            processEnv[key] = env[key];
        }
    });

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // This allows dynamic access like process.env[variableName] without full replacement issues
        'process.env': JSON.stringify(processEnv)
      },
      resolve: {
        alias: {
          '@': path.resolve('.'),
        }
      }
    };
});