import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenAI } from "npm:@google/genai@1.39.0"

const getCorsHeaders = (origin: string | null) => {
  // Optional comma-separated allow list via edge secret, e.g.
  // https://yourapp.vercel.app,https://www.yourapp.com,http://localhost:3000
  const allowList = (Deno.env.get('ALLOWED_ORIGINS') || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const allowOrigin = !origin
    ? '*'
    : allowList.length === 0 || allowList.includes(origin)
      ? origin
      : '*';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
};

const getGeminiKeys = () => {
  const keys: string[] = [];
  const primary = (Deno.env.get('GEMINI_API_KEY') || '').trim();
  if (primary) keys.push(primary);

  for (let i = 1; i <= 10; i += 1) {
    const candidate = (Deno.env.get(`GEMINI_API_KEY_${i}`) || '').trim();
    if (candidate) keys.push(candidate);
  }

  return Array.from(new Set(keys));
};

const toSafeInt = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.floor(parsed));
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    const geminiKeys = getGeminiKeys();
    if (geminiKeys.length === 0) {
      throw new Error("No Gemini key configured. Add GEMINI_API_KEY or GEMINI_API_KEY_1..N in Supabase Edge Secrets.");
    }

    // Parse incoming request context (from lib/ai.ts payload)
    const {
      parts,
      systemInstruction,
      temperature,
      model,
      responseMimeType,
      maxOutputTokens
    } = await req.json();

    const selectedModel = model || Deno.env.get('GEMINI_DEFAULT_MODEL') || 'gemini-2.5-flash';
    const selectedTemperature = typeof temperature === 'number' ? temperature : 0.35;
    const selectedMaxTokens = toSafeInt(
      maxOutputTokens,
      responseMimeType === 'application/json' ? 2400 : 3000
    );

    let lastError: any = null;

    for (let index = 0; index < geminiKeys.length; index += 1) {
      const key = geminiKeys[index];
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        const response = await ai.models.generateContent({
          model: selectedModel,
          contents: [{ role: 'user', parts }],
          config: {
            systemInstruction,
            temperature: selectedTemperature,
            responseMimeType,
            maxOutputTokens: selectedMaxTokens
          }
        });

        return new Response(
          JSON.stringify({
            text: response.text,
            model: selectedModel,
            key_index: index + 1
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err: any) {
        lastError = err;
        const msg = (err?.message || '').toLowerCase();
        console.warn(`Gemini key #${index + 1} failed: ${err?.message || 'unknown error'}`);

        // If this is likely a key/quota/rate error, try next key.
        const isKeyOrQuotaIssue =
          msg.includes('quota') ||
          msg.includes('rate') ||
          msg.includes('429') ||
          msg.includes('api key') ||
          msg.includes('permission') ||
          msg.includes('unauthorized') ||
          msg.includes('invalid argument');

        if (!isKeyOrQuotaIssue) {
          break;
        }
      }
    }

    throw new Error(lastError?.message || 'Gemini request failed on all configured keys.');
  } catch (error: any) {
    console.error("Gateway Error:", error?.message || error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown gateway error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
