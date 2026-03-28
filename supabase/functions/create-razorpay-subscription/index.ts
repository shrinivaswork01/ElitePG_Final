// Supabase Edge Function: create-razorpay-subscription
// Creates a Razorpay subscription for a given plan and customer details

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { razorpayPlanId, customerName, customerEmail, totalCount = 12 } = await req.json();

    if (!razorpayPlanId) {
      return new Response(JSON.stringify({ error: 'razorpayPlanId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Razorpay secret key from environment
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!razorpayKeyId || !razorpayKeySecret) {
      return new Response(JSON.stringify({ error: 'Razorpay credentials not configured in Edge Function secrets' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);

    // Create Razorpay subscription
    const subscriptionPayload: any = {
      plan_id: razorpayPlanId,
      total_count: totalCount, // number of billing cycles (e.g. 12 for 1 year of monthly)
      quantity: 1,
    };

    // Add customer notes if provided
    if (customerName || customerEmail) {
      subscriptionPayload.notes = {};
      if (customerName) subscriptionPayload.notes.customer_name = customerName;
      if (customerEmail) subscriptionPayload.notes.customer_email = customerEmail;
    }

    const response = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscriptionPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Razorpay API error:', data);
      return new Response(JSON.stringify({ error: data.error?.description || 'Razorpay API error', details: data }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Return the subscription ID to the frontend
    return new Response(JSON.stringify({ subscriptionId: data.id, status: data.status }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Error in create-razorpay-subscription:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
