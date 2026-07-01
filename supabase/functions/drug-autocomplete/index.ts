import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

import { corsHeaders } from "../_shared/cors.ts";

// Sanitize user input for ilike queries - escape special postgres pattern chars
function sanitizeForIlike(input: string): string {
  return input.replace(/[%_\\]/g, "\\$&");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });

  try {
    // Auth check
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ matches: [] }), {
        status: 401, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ matches: [] }), {
        status: 401, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return new Response(JSON.stringify({ matches: [] }), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const q = sanitizeForIlike(query.trim().toLowerCase());

    // Search in drug_reference by name, commercial_name, or active_ingredient
    const { data: refs, error } = await supabase
      .from("drug_reference")
      .select("*")
      .or(`name.ilike.%${q}%,commercial_name.ilike.%${q}%,active_ingredient.ilike.%${q}%`)
      .limit(10);

    if (error) {
      console.error("Reference search error:", error);
      return new Response(JSON.stringify({ matches: [] }), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Also search approved community drugs
    const { data: communityDrugs } = await supabase
      .from("drug_catalog")
      .select("name, commercial_name, active_ingredient, drug_class, species, indications, dosage, contraindications, adverse_effects, interactions, withdrawal_period")
      .eq("validation_status", "approved")
      .or(`name.ilike.%${q}%,commercial_name.ilike.%${q}%,active_ingredient.ilike.%${q}%`)
      .limit(5);

    const matches = [
      ...(refs || []).map((r: any) => ({ ...r, source: "reference" })),
      ...(communityDrugs || []).map((r: any) => ({ ...r, source: "community" })),
    ];

    // Deduplicate by name+active_ingredient
    const seen = new Set<string>();
    const unique = matches.filter((m) => {
      const key = `${m.name?.toLowerCase()}-${m.active_ingredient?.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return new Response(JSON.stringify({ matches: unique.slice(0, 10) }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("drug-autocomplete error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
