import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, apiKey, zoneId, since, until } = await req.json();

    if (!email || !apiKey || !zoneId) {
      return new Response(
        JSON.stringify({ success: false, errors: [{ message: "Missing email/apiKey/zoneId" }] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    const sinceIso = (since ? new Date(since) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)).toISOString().substring(0, 10);
    const untilIso = (until ? new Date(until) : now).toISOString().substring(0, 10);

    const gql = {
      query: `query GetZoneAnalytics($zoneTag: String!, $since: String!, $until: String!) {
        viewer {
          zones(filter: { zoneTag: $zoneTag }) {
            httpRequests1dGroups(
              limit: 10000
              filter: { date_geq: $since, date_leq: $until }
            ) {
              dimensions { date }
              sum { 
                requests bytes threats pageViews cachedBytes cachedRequests 
                encryptedRequests encryptedBytes
              }
              uniq { uniques }
            }
          }
        }
      }`,
      variables: { zoneTag: zoneId, since: sinceIso, until: untilIso },
    };

    const resp = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: {
        "X-Auth-Email": email,
        "X-Auth-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(gql),
    });

    const data = await resp.json();

    if (!resp.ok || data?.errors) {
      console.error("cf-analytics-basic error:", data?.errors || resp.statusText);
      return new Response(
        JSON.stringify({ success: false, errors: data?.errors || [{ message: resp.statusText }] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, result: data?.data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("cf-analytics-basic exception:", err);
    return new Response(
      JSON.stringify({ success: false, errors: [{ message: String(err) }] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});