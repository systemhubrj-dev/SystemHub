import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: claims } = await userClient.auth.getClaims(auth.replace("Bearer ", ""));
    const userId = claims?.claims?.sub as string | undefined;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify is platform admin
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: adminRow } = await admin.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
    if (!adminRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // List auth users (paged)
    const all: any[] = [];
    let page = 1;
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      all.push(...(data.users ?? []));
      if (!data.users || data.users.length < 200) break;
      page++;
      if (page > 25) break; // hard cap 5000
    }

    // Profiles + subscriptions + team-member roles + platform admins
    const ids = all.map((u) => u.id);
    const [{ data: profiles }, { data: subs }, { data: memberRoles }, { data: platAdmins }] = await Promise.all([
      admin.from("profiles").select("user_id, display_name").in("user_id", ids),
      admin.from("subscriptions").select("user_id, plan_id, status, trial_ends_at").in("user_id", ids),
      admin.from("user_roles").select("user_id, role").in("user_id", ids).neq("role", "owner"),
      admin.from("platform_admins").select("user_id"),
    ]);

    const pMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
    const sMap = new Map((subs ?? []).map((s: any) => [s.user_id, s]));
    const memberSet = new Set((memberRoles ?? []).map((r: any) => r.user_id));
    const adminSet = new Set((platAdmins ?? []).map((r: any) => r.user_id));

    const clients = all
      // Only owners / clinic accounts: exclude team members and platform admins
      .filter((u) => !!u.email && !memberSet.has(u.id) && !adminSet.has(u.id))
      .map((u) => ({
        user_id: u.id,
        email: u.email,
        display_name: pMap.get(u.id)?.display_name ?? null,
        plan_id: sMap.get(u.id)?.plan_id ?? null,
        status: sMap.get(u.id)?.status ?? null,
        trial_ends_at: sMap.get(u.id)?.trial_ends_at ?? null,
        created_at: u.created_at,
      }))
      .sort((a, b) => (a.email || "").localeCompare(b.email || ""));

    return new Response(JSON.stringify({ clients }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
