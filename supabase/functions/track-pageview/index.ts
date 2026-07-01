import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

import { corsHeaders } from "../_shared/cors.ts";

function extractSource(referrer: string, host: string): string {
  if (!referrer) return "Direct";
  try {
    const url = new URL(referrer);
    const hn = url.hostname.replace(/^www\./, "").replace(/^l\./, "");
    if (hn === host || hn.endsWith(`.${host}`)) return "Direct";
    if (hn.includes("instagram.com")) return "Instagram";
    if (hn.includes("facebook.com")) return "Facebook";
    if (hn.includes("google.com")) return "Google";
    if (hn.includes("twitter.com") || hn.includes("t.co") || hn.includes("x.com")) return "X / Twitter";
    if (hn.includes("youtube.com")) return "YouTube";
    if (hn.includes("tiktok.com")) return "TikTok";
    if (hn.includes("linkedin.com")) return "LinkedIn";
    if (hn.includes("whatsapp.com")) return "WhatsApp";
    return hn;
  } catch {
    return "Direct";
  }
}

function extractDevice(ua: string): "mobile" | "desktop" {
  return /mobile|android|iphone|ipad|ipod|blackberry|windows phone/i.test(ua)
    ? "mobile"
    : "desktop";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  try {
    const body = await req.json().catch(() => ({}));
    const path = String(body?.path ?? "/");
    const referrer = String(body?.referrer ?? "");
    const ua = String(body?.ua ?? req.headers.get("user-agent") ?? "");
    const host = String(body?.host ?? "systemhub.app.br");

    const country =
      req.headers.get("cf-ipcountry") ??
      req.headers.get("x-country-code") ??
      null;

    const source = extractSource(referrer, host);
    const device = extractDevice(ua);

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await adminClient.from("page_views").insert({
      path,
      referrer: referrer || null,
      source,
      device,
      country,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
