import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders } from "../_shared/cors.ts";

const VALID_PATH = /^(\/[a-zA-Z0-9\-_./%]*)?$|^\/_cta\/[a-zA-Z0-9\-]+$/;
const VALID_UUID  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}$/;

const MAX = { path: 200, referrer: 500, ua: 300, host: 100 };

function clamp(s: string, max: number): string {
  return String(s).slice(0, max);
}

function extractSource(referrer: string, host: string): string {
  if (!referrer) return "Direct";
  try {
    const url = new URL(referrer);
    const hn = url.hostname.replace(/^www\./, "").replace(/^l\./, "");
    if (hn === host || hn.endsWith(`.${host}`)) return "Direct";
    if (hn.includes("instagram.com")) return "Instagram";
    if (hn.includes("facebook.com")) return "Facebook";
    if (hn.includes("google.com"))   return "Google";
    if (hn.includes("twitter.com") || hn.includes("t.co") || hn.includes("x.com")) return "X / Twitter";
    if (hn.includes("youtube.com"))  return "YouTube";
    if (hn.includes("tiktok.com"))   return "TikTok";
    if (hn.includes("linkedin.com")) return "LinkedIn";
    if (hn.includes("whatsapp.com")) return "WhatsApp";
    return hn.slice(0, 60);
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

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > 4096) {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));

    const rawPath = clamp(String(body?.path ?? "/"), MAX.path);
    const referrer = clamp(String(body?.referrer ?? ""), MAX.referrer);
    const ua       = clamp(String(body?.ua ?? req.headers.get("user-agent") ?? ""), MAX.ua);
    const host     = clamp(String(body?.host ?? "systemhub.app.br"), MAX.host);

    // Validate user fields — reject if format doesn't match
    const rawUserId    = typeof body?.user_id === "string" ? body.user_id : null;
    const rawUserEmail = typeof body?.user_email === "string" ? body.user_email.slice(0, 254) : null;
    const user_id    = rawUserId && VALID_UUID.test(rawUserId)       ? rawUserId    : null;
    const user_email = rawUserEmail && VALID_EMAIL.test(rawUserEmail) ? rawUserEmail : null;

    if (!VALID_PATH.test(rawPath)) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

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
      path: rawPath,
      referrer: referrer || null,
      source,
      device,
      country,
      user_id,
      user_email,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
