import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS for browser calls
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { domain } = await req.json()
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Check if we already analyzed this domain recently (Cache)
    const { data: cached } = await supabase
      .from('trust_analysis')
      .select('*')
      .eq('domain', domain)
      .single()

    if (cached) return new Response(JSON.stringify(cached), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // 2. Call Gemini 1.5 Flash for real-time research
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    const prompt = `Research the subscription service: ${domain}. Provide a safety analysis. 
    Return ONLY valid JSON in this format:
    {
      "score": (0-100),
      "cancellation_difficulty": "Easy" | "Medium" | "Hard",
      "dark_patterns": ["list of red flags"],
      "positive_features": ["list of good things"]
    }`

    const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    })

    const aiData = await aiRes.json()
    const result = JSON.parse(aiData.candidates[0].content.parts[0].text.replace(/```json|```/g, ''))

    // 3. Save to DB and Return
    const { data: savedData } = await supabase
      .from('trust_analysis')
      .insert({ domain, ...result })
      .select()
      .single()

    return new Response(JSON.stringify(savedData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})
