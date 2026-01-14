import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { google_access_token } = await req.json()
    
    // 1. Search Gmail for subscription keywords
    const query = "subject:(subscription OR receipt OR invoice OR \"order confirmation\")"
    const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=10`, {
      headers: { Authorization: `Bearer ${google_access_token}` }
    })
    const { messages } = await listRes.json()

    if (!messages) return new Response(JSON.stringify({ message: "No receipts found." }), { headers: corsHeaders })

    // 2. Fetch the content of the first 5 emails
    const emailData = await Promise.all(messages.slice(0, 5).map(async (m: any) => {
      const detail = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}`, {
        headers: { Authorization: `Bearer ${google_access_token}` }
      })
      const data = await detail.json()
      return data.snippet // We use the snippet for speed/cost efficiency
    }))

    // 3. Send snippets to Gemini to extract data
    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    const aiPrompt = `Extract subscription details from these email snippets: ${JSON.stringify(emailData)}. 
    Return a JSON array of objects with: name, price, currency, and renewal_frequency (monthly/yearly).`

    const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      body: JSON.stringify({ contents: [{ parts: [{ text: aiPrompt }] }] })
    })

    const aiJson = await aiRes.json()
    const extractedSubs = JSON.parse(aiJson.candidates[0].content.parts[0].text.replace(/```json|```/g, ''))

    // 4. Return to frontend (Frontend will then save these to Supabase)
    return new Response(JSON.stringify(extractedSubs), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})
