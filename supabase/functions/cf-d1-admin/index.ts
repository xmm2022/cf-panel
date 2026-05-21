// Cloudflare D1 Admin proxy via Lovable Cloud Edge Function
// Public endpoint with CORS, proxies create D1 database requests to Cloudflare API v4

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

interface CreateBody {
  action?: string;
  email: string;
  apiKey: string; // can be Global API Key or API Token
  accountId: string;
  name: string;
  primary_location_hint?: string;
  jurisdiction?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as Partial<CreateBody>;
    const action = body.action || 'create_d1_database';

    if (action !== 'create_d1_database') {
      return new Response(
        JSON.stringify({ success: false, errors: [{ code: 400, message: 'Unsupported action' }] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const { email, apiKey, accountId, name, primary_location_hint } = body as CreateBody;

    if (!email || !apiKey || !accountId || !name) {
      return new Response(
        JSON.stringify({ success: false, errors: [{ code: 422, message: 'Missing required fields' }] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      // Support both Global API Key and API Token
      'X-Auth-Email': email,
      'X-Auth-Key': apiKey,
      'Authorization': `Bearer ${apiKey}`,
    };

    // Build attempt payloads
    const attempts: Array<{ label: string; payload: Record<string, unknown> }> = [];
    if (primary_location_hint && primary_location_hint !== 'auto') {
      attempts.push({ label: 'with hint', payload: { name, primary_location_hint } });
    }
    attempts.push({ label: 'auto hint', payload: { name, primary_location_hint: 'auto' } });
    attempts.push({ label: 'no hint', payload: { name } });

    let lastJson: any = null;

    for (const a of attempts) {
      try {
        console.log('[cf-d1-admin] Attempt', a.label, a.payload);
        const resp = await fetch(baseUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(a.payload),
        });
        const json = await resp.json().catch(() => ({ success: false, errors: [{ code: resp.status, message: resp.statusText }]}));
        console.log('[cf-d1-admin] CF response', a.label, json);
        if (json?.success) {
          return new Response(JSON.stringify(json), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        }
        lastJson = json;
      } catch (err) {
        lastJson = { success: false, errors: [{ code: 7500, message: (err as Error).message }] };
      }
    }

    return new Response(JSON.stringify(lastJson || { success: false, errors: [{ code: 7500, message: 'Unknown error' }]}), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[cf-d1-admin] Fatal error', error);
    return new Response(
      JSON.stringify({ success: false, errors: [{ code: 7500, message: (error as Error).message }] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
