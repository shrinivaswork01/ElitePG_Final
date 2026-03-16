// Supabase Edge Function: razorpay-webhook
// Listens for Razorpay webhook events and updates branch subscription status

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    // Verify webhook signature
    if (webhookSecret && signature) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(webhookSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
      const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      if (expectedSignature !== signature) {
        console.error('Invalid webhook signature');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: corsHeaders,
        });
      }
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const subscriptionId = payload.payload?.subscription?.entity?.id;
    const planId = payload.payload?.subscription?.entity?.plan_id;

    console.log('Razorpay webhook event:', event, 'subscriptionId:', subscriptionId);

    if (!subscriptionId) {
      return new Response(JSON.stringify({ received: true }), { headers: corsHeaders });
    }

    // Find the branch with this subscription ID
    const { data: branch } = await supabase
      .from('pg_branches')
      .select('id')
      .eq('razorpay_subscription_id', subscriptionId)
      .single();

    if (!branch) {
      console.log('No branch found for subscription:', subscriptionId);
      return new Response(JSON.stringify({ received: true }), { headers: corsHeaders });
    }

    const now = new Date();

    // Helper: get end date from Razorpay payload's current_end (Unix timestamp in seconds)
    // Falls back to calculating from now if not present
    const getEndDateFromPayload = (subscription: any): string => {
      if (subscription?.current_end) {
        // Razorpay sends Unix timestamp in seconds
        return new Date(subscription.current_end * 1000).toISOString().split('T')[0];
      }
      // Fallback: calculate from interval type
      const intervalType = subscription?.period || 'monthly';
      const fallback = new Date(now);
      if (intervalType === 'yearly') {
        fallback.setFullYear(fallback.getFullYear() + 1);
      } else {
        fallback.setMonth(fallback.getMonth() + 1);
      }
      return fallback.toISOString().split('T')[0];
    };

    if (event === 'subscription.charged') {
      // Payment collected — set end date to Razorpay's actual billing period end
      const subscription = payload.payload?.subscription?.entity;
      const endDate = getEndDateFromPayload(subscription);

      await supabase
        .from('pg_branches')
        .update({
          subscription_status: 'active',
          subscription_end_date: endDate,
        })
        .eq('id', branch.id);

      console.log(`Branch ${branch.id} subscription charged & extended to ${endDate}`);

    } else if (event === 'subscription.halted' || event === 'subscription.cancelled') {
      // Payment failed / cancelled - mark as expired
      await supabase
        .from('pg_branches')
        .update({ subscription_status: 'expired' })
        .eq('id', branch.id);

      console.log(`Branch ${branch.id} subscription marked as expired`);

    } else if (event === 'subscription.activated') {
      // First activation — use Razorpay's current_end for the initial period
      const subscription = payload.payload?.subscription?.entity;
      const endDate = getEndDateFromPayload(subscription);

      await supabase
        .from('pg_branches')
        .update({
          subscription_status: 'active',
          subscription_end_date: endDate,
        })
        .eq('id', branch.id);

      console.log(`Branch ${branch.id} subscription activated until ${endDate}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
