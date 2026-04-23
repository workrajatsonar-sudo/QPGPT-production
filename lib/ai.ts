import { supabase } from './supabase';

/**
 * Communicates with the secure Supabase Edge Function
 * instead of exposing the GEMINI_API_KEY in the browser.
 */
export const generateAIContent = async (payload: any) => {
    // Call the Supabase Edge Function securely
    // Ensure you have created the "gemini-api" edge function in your Supabase dashboard!
    const { data, error } = await supabase.functions.invoke('gemini-api', {
        body: payload
    });

    if (error) {
        console.error("AI Generation Error: ", error);
        throw new Error(error.message || "Failed to generate AI content");
    }

    if (!data || !data.text) {
        throw new Error("Invalid response from AI Edge Function");
    }

    return data.text;
};
