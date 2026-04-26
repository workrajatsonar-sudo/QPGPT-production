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
      : allowList[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured in Supabase Edge Secrets.");
    }


    // Parse incoming request context (from lib/ai.ts payload)
    const { parts, systemInstruction, temperature, model = 'gemini-1.5-flash', responseMimeType } = await req.json();

    // Initialize the official SDK
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    // Execute AI request
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction,
        temperature: temperature || 0.7,
        responseMimeType: responseMimeType
      }
    });

    // Return the response back securely to your React frontend
    return new Response(
      JSON.stringify({ text: response.text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Gateway Error:", error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
