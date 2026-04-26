import { supabase } from './supabase';

type PayloadPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type AIPayload = {
  model?: string;
  parts?: PayloadPart[];
  systemInstruction?: string;
  responseMimeType?: string;
  temperature?: number;
  maxOutputTokens?: number;
};

const isLocalHost = () => {
  if (typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
};

const canUseBrowserFallback = () => {
  const explicit = import.meta.env.VITE_ALLOW_BROWSER_AI_FALLBACK;
  if (explicit === 'true') return true;
  if (explicit === 'false') return false;
  return isLocalHost();
};

const callGeminiFromBrowser = async (payload: AIPayload): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY_1;
  if (!apiKey) {
    throw new Error('No local Gemini key found for fallback.');
  }

  const model = payload.model || 'gemini-2.5-flash';
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: payload.parts || [] }],
        generationConfig: {
          temperature: payload.temperature ?? 0.7,
          maxOutputTokens: payload.maxOutputTokens ?? 8192,
          ...(payload.responseMimeType ? { responseMimeType: payload.responseMimeType } : {}),
        },
        ...(payload.systemInstruction
          ? { systemInstruction: { parts: [{ text: payload.systemInstruction }] } }
          : {}),
      }),
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || `Gemini fallback failed: HTTP ${response.status}`);
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== 'string') {
    throw new Error('Gemini fallback returned empty response.');
  }

  return text;
};

const normalizeEdgeError = (error: any, fallbackMessage: string) => {
  if (error?.context?.error) return error.context.error;
  if (error?.message) return error.message;
  return fallbackMessage;
};

export const generateAIContent = async (payload: AIPayload): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('gemini-api', {
    body: payload,
  });

  if (error) {
    if (canUseBrowserFallback()) {
      try {
        return await callGeminiFromBrowser(payload);
      } catch (fallbackError: any) {
        throw new Error(
          `${normalizeEdgeError(error, 'AI generation failed.')} (local fallback also failed: ${fallbackError?.message || 'unknown error'})`
        );
      }
    }
    throw new Error(normalizeEdgeError(error, 'AI generation failed.'));
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  if (!data?.text || typeof data.text !== 'string') {
    throw new Error('AI generation returned an empty response.');
  }

  return data.text;
};
