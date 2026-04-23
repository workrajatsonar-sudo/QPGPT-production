import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenAI } from "npm:@google/genai@1.39.0"

// Configure CORS headers for browsers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Adjust this to your specific domain in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured in Supabase Edge Secrets.");
    }

    // Parse incoming request context (from lib/ai.ts payload)
    const { parts, systemInstruction, temperature, model = 'gemini-3-flash-preview', responseMimeType } = await req.json()

    // Initialize the official SDK
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    
    // Execute AI request
    const response = await ai.models.generateContent({
        model: model,
        contents: { parts },
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
    )

  } catch (error) {
    console.error("Gateway Error:", error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
