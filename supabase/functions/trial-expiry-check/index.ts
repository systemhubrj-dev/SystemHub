import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { sendEmail } from "../_shared/resend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPPORT_EMAIL = "suporte@systemhub.app.br";
const CHECKOUT_URL = "https://systemhub.app.br/dashboard/meu-plano";

function expiryHtml(name: string, daysLeft: number): string {
  const urgency = daysLeft === 1 ? "⚠️ ÚLTIMO DIA" : `${daysLeft} dias`;
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
  <div style="text-align:center;margin-bottom:32px">
    <h1 style="color:#2563eb;margin:0">SystemHub</h1>
  </div>
  <h2>Olá, ${name}!</h2>
  <p>Seu período de trial expira em <strong>${urgency}</strong>.</p>
  <p>Para continuar usando todas as funcionalidades sem interrupção, escolha um plano:</p>
  <div style="text-align:center;margin:32px 0">
    <a href="${CHECKOUT_URL}"
       style="background:#2563eb;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
      Ver planos e assinar
    </a>
  </div>
  <div style="background:#fefce8;border-left:4px solid #eab308;padding:16px;border-radius:4px;margin:24px 0">
    <p style="margin:0;color:#854d0e">
      <strong>Após o trial:</strong> Seu acesso ficará limitado até a assinatura de um plano.
    </p>
  </div>
  <p>Dúvidas? Fale com nosso suporte:<br>
  📧 <a href="mailto:${SUPPORT_EMAIL}" style="color:#2563eb">${SUPPORT_EMAIL}</a></p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0">
  <p style="color:#94a3b8;font-size:12px;text-align:center">Equipe SystemHub</p>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Only internal callers (cron/webhook) can trigger this check.
  // Prefer INTERNAL_WEBHOOK_SECRET; fall back to service_role_key for backward compat.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const internalSecret = Deno.env.get("INTERNAL_WEBHOOK_SECRET");
  const expectedToken = internalSecret ?? serviceRoleKey;
  if (token !== expectedToken) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRoleKey
    );

    const now = new Date();

    // Find trials expiring in 3 days or 1 day that haven't been notified yet
    const thresholds = [3, 1];
    let sent = 0;
    let errors = 0;

    for (const days of thresholds) {
      const windowStart = new Date(now);
      windowStart.setDate(windowStart.getDate() + days);
      windowStart.setHours(0, 0, 0, 0);
      const windowEnd = new Date(windowStart);
      windowEnd.setHours(23, 59, 59, 999);

      const { data: subs, error } = await adminClient
        .from("subscriptions")
        .select("user_id, trial_ends_at, expiry_notified_at")
        .eq("status", "trialing")
        .gte("trial_ends_at", windowStart.toISOString())
        .lte("trial_ends_at", windowEnd.toISOString())
        .is("expiry_notified_at", null);

      if (error) {
        console.error(`trial-expiry-check: erro ao buscar trials (${days}d):`, error);
        continue;
      }

      for (const sub of subs ?? []) {
        try {
          const { data: userRes } = await adminClient.auth.admin.getUserById(sub.user_id);
          const email = userRes?.user?.email;
          if (!email) continue;

          const { data: profile } = await adminClient
            .from("profiles")
            .select("display_name, business_name")
            .eq("user_id", sub.user_id)
            .maybeSingle();

          const name = profile?.display_name ?? profile?.business_name ?? "Usuário";

          const result = await sendEmail({
            to: email,
            subject: days === 1
              ? "⚠️ Último dia do seu trial — SystemHub"
              : `Seu trial expira em ${days} dias — SystemHub`,
            html: expiryHtml(name, days),
          });

          if (result.ok) {
            // Mark as notified so we don't send again
            await adminClient
              .from("subscriptions")
              .update({ expiry_notified_at: now.toISOString() } as any)
              .eq("user_id", sub.user_id);
            sent++;
          } else {
            errors++;
          }
        } catch (e) {
          console.error("trial-expiry-check: erro ao processar user", sub.user_id, e);
          errors++;
        }
      }
    }

    console.log(`trial-expiry-check: ${sent} emails enviados, ${errors} erros`);
    return new Response(JSON.stringify({ ok: true, sent, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("trial-expiry-check error:", err);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
