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
    const { email, apiKey, accountId, scriptName, since, until } = await req.json();

    if (!email || !apiKey || !accountId) {
      return new Response(
        JSON.stringify({ success: false, errors: [{ message: "Missing email/apiKey/accountId" }] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    const sinceIso = (since ? new Date(since) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)).toISOString();
    const untilIso = (until ? new Date(until) : now).toISOString();

    const gql = scriptName ? {
      query: `query GetWorkerAnalytics($accountTag: String!, $scriptName: String!, $since: Time!, $until: Time!) {
        viewer {
          accounts(filter: { accountTag: $accountTag }) {
            workersInvocationsAdaptive(
              limit: 10000
              filter: { 
                scriptName: $scriptName,
                datetime_geq: $since,
                datetime_leq: $until
              }
            ) {
              dimensions {
                date
                datetime
              }
              sum {
                requests
                errors
                subrequests
              }
              quantiles {
                cpuTimeP50
                cpuTimeP99
              }
            }
          }
        }
      }`,
      variables: { 
        accountTag: accountId, 
        scriptName: scriptName,
        since: sinceIso, 
        until: untilIso 
      },
    } : {
      query: `query GetAccountAnalytics($accountTag: String!, $since: Time!, $until: Time!) {
        viewer {
          accounts(filter: { accountTag: $accountTag }) {
            workersInvocationsAdaptive(
              limit: 10000
              filter: { 
                datetime_geq: $since,
                datetime_leq: $until
              }
            ) {
              dimensions {
                date
                datetime
              }
              sum {
                requests
                errors
                subrequests
              }
              quantiles {
                cpuTimeP50
                cpuTimeP99
              }
            }
          }
        }
      }`,
      variables: { 
        accountTag: accountId, 
        since: sinceIso, 
        until: untilIso 
      },
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
      console.error("cf-worker-analytics error:", data?.errors || resp.statusText);
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
    console.error("cf-worker-analytics exception:", err);
    return new Response(
      JSON.stringify({ success: false, errors: [{ message: String(err) }] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
