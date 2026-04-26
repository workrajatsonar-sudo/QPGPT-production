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

const getModelCandidates = (requestedModel?: string) => {
  const configuredDefault = (Deno.env.get('GEMINI_DEFAULT_MODEL') || '').trim();
  const candidates = [
    (requestedModel || '').trim(),
    configuredDefault,
    'gemini-2.5-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash'
  ].filter(Boolean);

  return Array.from(new Set(candidates));
};

const classifyGeminiError = (message: string) => {
  const msg = message.toLowerCase();
  return {
    isModelIssue:
      msg.includes('model') &&
      (msg.includes('not found') || msg.includes('unsupported') || msg.includes('not available') || msg.includes('404')),
    isKeyOrQuotaIssue:
      msg.includes('quota') ||
      msg.includes('rate') ||
      msg.includes('429') ||
      msg.includes('api key') ||
      msg.includes('permission') ||
      msg.includes('unauthorized') ||
      msg.includes('invalid argument'),
  };
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
    let requestPayload: any = {};
    try {
      requestPayload = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body sent to gemini-api function.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const {
      parts,
      systemInstruction,
      temperature,
      model,
      responseMimeType,
      maxOutputTokens
    } = requestPayload;

    const modelCandidates = getModelCandidates(model);
    const selectedTemperature = typeof temperature === 'number' ? temperature : 0.35;
    const selectedMaxTokens = toSafeInt(
      maxOutputTokens,
      responseMimeType === 'application/json' ? 4200 : 3200
    );

    let lastError: any = null;
    for (const selectedModel of modelCandidates) {
      for (let keyIndex = 0; keyIndex < geminiKeys.length; keyIndex += 1) {
        const key = geminiKeys[keyIndex];
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

          const text = (response?.text || '').trim();
          if (!text) {
            throw new Error(`Empty AI response from model ${selectedModel}.`);
          }

          return new Response(
            JSON.stringify({
              text,
              model: selectedModel,
              key_index: keyIndex + 1
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (err: any) {
          lastError = err;
          const message = err?.message || 'unknown error';
          const { isModelIssue, isKeyOrQuotaIssue } = classifyGeminiError(message);
          console.warn(`Gemini model ${selectedModel}, key #${keyIndex + 1} failed: ${message}`);

          // Model issue: break key loop and switch to next model.
          if (isModelIssue) break;
          // Key/quota issue: continue with next key on same model.
          if (isKeyOrQuotaIssue) continue;
          // Unknown/other issue: keep trying remaining keys for resilience.
        }
      }
    }

    throw new Error(lastError?.message || 'Gemini request failed on all configured models/keys.');
  } catch (error: any) {
    console.error("Gateway Error:", error?.message || error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown gateway error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
