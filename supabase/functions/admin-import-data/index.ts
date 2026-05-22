import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_ENTITIES = ["clients", "pets", "inventory_items", "services", "suppliers", "bills"] as const;
type Entity = typeof ALLOWED_ENTITIES[number];

const FIELD_WHITELIST: Record<Entity, string[]> = {
  clients: ["name", "phone", "email", "cpf", "address", "city", "state", "notes"],
  pets: ["name", "species", "breed", "sex", "color", "birth_date", "microchip"],
  inventory_items: ["name", "quantity", "unit", "category", "cost_price", "sell_price", "batch", "expiry_date", "min_quantity"],
  services: ["name", "price", "duration_minutes", "category"],
  suppliers: ["name", "cnpj", "phone", "email"],
  bills: ["description", "amount", "due_date", "category"],
};

const NUM_FIELDS: Record<string, true> = {
  quantity: true, cost_price: true, sell_price: true, min_quantity: true,
  price: true, duration_minutes: true, amount: true,
};

function clean(entity: Entity, raw: Record<string, any>) {
  const out: Record<string, any> = {};
  const allowed = FIELD_WHITELIST[entity];
  for (const k of allowed) {
    if (raw[k] === undefined || raw[k] === null || raw[k] === "") continue;
    let v = raw[k];
    if (NUM_FIELDS[k]) {
      const n = Number(String(v).replace(",", "."));
      if (!Number.isFinite(n)) continue;
      v = n;
    }
    out[k] = v;
  }
  return out;
}

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

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: adminRow } = await admin.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
    if (!adminRow) {
      return new Response(JSON.stringify({ error: "Forbidden — apenas admins da plataforma" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const { targetOwnerId, entity, rows } = body as { targetOwnerId: string; entity: Entity; rows: Record<string, any>[] };

    if (!targetOwnerId || typeof targetOwnerId !== "string") {
      return new Response(JSON.stringify({ error: "targetOwnerId obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!ALLOWED_ENTITIES.includes(entity)) {
      return new Response(JSON.stringify({ error: "Entidade inválida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: "Sem linhas" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (rows.length > 10000) {
      return new Response(JSON.stringify({ error: "Máximo 10.000 linhas por importação" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Confirm target exists
    const { data: target } = await admin.auth.admin.getUserById(targetOwnerId);
    if (!target?.user) {
      return new Response(JSON.stringify({ error: "Cliente alvo não encontrado" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pets need client_id resolution from client_name
    let clientLookup = new Map<string, string>();
    if (entity === "pets") {
      const names = Array.from(new Set(rows.map((r) => String(r.client_name ?? "").trim().toLowerCase()).filter(Boolean)));
      if (names.length) {
        const { data: existing } = await admin
          .from("clients")
          .select("id, name")
          .eq("user_id", targetOwnerId)
          .in("name", names.map((n) => n)); // best-effort
        for (const c of (existing ?? []) as any[]) {
          clientLookup.set(String(c.name).toLowerCase(), c.id);
        }
        // Auto-create missing tutors
        const missing = names.filter((n) => !clientLookup.has(n));
        if (missing.length) {
          const { data: created } = await admin
            .from("clients")
            .insert(missing.map((n) => ({ user_id: targetOwnerId, name: n.charAt(0).toUpperCase() + n.slice(1) })))
            .select("id, name");
          for (const c of (created ?? []) as any[]) {
            clientLookup.set(String(c.name).toLowerCase(), c.id);
          }
        }
      }
    }

    let inserted = 0;
    let failed = 0;
    const errors: { row: number; error: string }[] = [];

    const CHUNK = 200;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      const payload = slice.map((r, idx) => {
        const cleaned = clean(entity, r);
        const record: Record<string, any> = { ...cleaned, user_id: targetOwnerId };
        if (entity === "pets") {
          const cn = String(r.client_name ?? "").trim().toLowerCase();
          if (cn && clientLookup.has(cn)) record.client_id = clientLookup.get(cn);
        }
        if (entity === "bills" && !record.due_date) record.due_date = new Date().toISOString().slice(0, 10);
        return { record, originalIndex: i + idx };
      });

      const { data, error } = await admin.from(entity).insert(payload.map((p) => p.record)).select("id");
      if (error) {
        // fallback: try one-by-one to capture per-row errors
        for (const p of payload) {
          const { error: e2 } = await admin.from(entity).insert(p.record);
          if (e2) { failed++; errors.push({ row: p.originalIndex + 2, error: e2.message }); }
          else inserted++;
        }
      } else {
        inserted += data?.length ?? slice.length;
      }
    }

    // Audit
    await admin.from("platform_admin_audit").insert({
      admin_id: userId,
      acting_as: targetOwnerId,
      action: "import",
      table_name: entity,
      record_count: inserted,
      payload: { failed, sample_errors: errors.slice(0, 10) },
    });

    return new Response(JSON.stringify({ inserted, failed, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
