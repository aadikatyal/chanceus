// supabase/functions/buy_tokens/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, X-Client-Info, apikey, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const j = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "Content-Type": "application/json",
    ...corsHeaders
  }
});

// Add request deduplication
const processingRequests = new Map<string, Promise<any>>();

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const auth = req.headers.get("Authorization") ?? "";

    // Forward the user's JWT so RLS sees the user
    const supabase = createClient(url, anon, {
      global: {
        headers: {
          Authorization: auth
        }
      }
    });

    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes?.user) return j({
      error: "unauthorized"
    }, 401);

    // Parse + validate body
    let amountRaw;
    try {
      ({ amount: amountRaw } = await req.json());
    } catch {
      return j({
        error: "invalid_json"
      }, 400);
    }

    const amount = Number(amountRaw);
    if (![100, 500, 1000].includes(amount)) return j({
      error: "invalid_amount"
    }, 400);

    // Create a unique key for this request to prevent duplicates
    const requestKey = `${userRes.user.id}-${amount}-${Date.now()}`;
    
    // Check if we're already processing this request
    if (processingRequests.has(requestKey)) {
      console.log('Duplicate request detected, returning existing promise');
      return await processingRequests.get(requestKey);
    }

    // Create the processing promise
    const processingPromise = (async () => {
      try {
        console.log(`Processing token purchase: User ${userRes.user.id}, Amount: ${amount}`);
        
        // Do the update via your RPC
        return j({ error: "Purchases are credited by the wallet API" }, 410);
        const { error: rpcErr } = await supabase.rpc("increment_tokens_and_log", {
          p_user_id: userRes.user.id,
          p_amount: amount
        });

        if (rpcErr) {
          console.error('RPC error:', rpcErr);
          return j({
            error: rpcErr.message
          }, 400);
        }

        // Fetch new balance
        const { data: me, error: selErr } = await supabase
          .from("users")
          .select("tokens")
          .eq("id", userRes.user.id)
          .single();

        if (selErr) {
          console.error('Select error:', selErr);
          return j({
            error: selErr.message
          }, 400);
        }

        console.log(`Token purchase successful: User ${userRes.user.id}, New balance: ${me?.tokens}`);
        
        return j({
          balance: me?.tokens ?? null
        }, 200);
      } finally {
        // Clean up the processing request
        processingRequests.delete(requestKey);
      }
    })();

    // Store the promise
    processingRequests.set(requestKey, processingPromise);
    
    // Return the result
    return await processingPromise;

  } catch (err) {
    // Catch absolutely everything and ALWAYS include CORS
    console.error("buy_tokens fatal:", err);
    return j({
      error: "internal_error"
    }, 500);
  }
});