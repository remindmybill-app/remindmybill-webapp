import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.21.0"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
})

const cryptoProvider = stripe.createSubtleCryptoProvider()

serve(async (req) => {
    const signature = req.headers.get("Stripe-Signature")
    const body = await req.text()

    let event

    try {
        event = await stripe.webhooks.constructEventAsync(
            body,
            signature!,
            Deno.env.get("STRIPE_WEBHOOK_SIGNATURE")!,
            undefined,
            cryptoProvider
        )
    } catch (err) {
        console.log(`⚠️  Webhook signature verification failed.`, err.message)
        return new Response(err.message, { status: 400 })
    }

    const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    console.log(`🔔 Event received: ${event.type}`)

    switch (event.type) {
        case "checkout.session.completed": {
            const session = event.data.object
            const userId = session.metadata?.user_id

            if (userId) {
                // Update profile with subscription status
                // Note: Ensure your 'profiles' table has 'subscription_tier' and 'stripe_customer_id' columns
                const { error } = await supabase
                    .from("profiles")
                    .update({
                        subscription_tier: "pro",
                        stripe_customer_id: session.customer,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", userId)

                if (error) console.error('Error updating profile:', error)
                else console.log(`✅ Profile updated for user ${userId}`)
            } else {
                console.warn('⚠️ No user_id found in session metadata')
            }
            break
        }

        case "customer.subscription.deleted": {
            const subscription = event.data.object
            // Look up user by stripe_customer_id
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('stripe_customer_id', subscription.customer)
                .single()

            if (profile) {
                const { error } = await supabase
                    .from("profiles")
                    .update({ subscription_tier: "free", updated_at: new Date().toISOString() })
                    .eq("id", profile.id)

                if (error) console.error('Error downgrading profile:', error)
                else console.log(`✅ Profile downgraded for user ${profile.id}`)
            } else {
                console.warn(`⚠️ No profile found for customer ${subscription.customer}`)
            }
            break
        }

        default:
        // console.log(`Unhandled event type ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
        headers: { "Content-Type": "application/json" },
    })
})
