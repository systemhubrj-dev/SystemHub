import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { sendEmail } from "../_shared/resend.ts";
import { corsHeaders } from "../_shared/cors.ts";

const ADMIN_EMAIL = "jvitor.souza10@gmail.com";
const SUPPORT_EMAIL = "suporte@systemhub.app.br";

function welcomeHtml(name: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a">
  <div style="text-align:center;margin-bottom:32px">
    <h1 style="color:#2563eb;margin:0">SystemHub</h1>
    <p style="color:#64748b;margin:4px 0">Plataforma Veterinária</p>
  </div>
  <h2>Olá, ${name}! 👋</h2>
  <p>Sua conta foi criada com sucesso. Você tem <strong>7 dias de trial gratuito</strong> para explorar todas as funcionalidades da plataforma.</p>
  <div style="background:#eff6ff;border-left:4px solid #2563eb;padding:16px;border-radius:4px;margin:24px 0">
    <p style="margin:0"><strong>O que você pode fazer agora:</strong></p>
    <ul style="margin:8px 0">
      <li>Cadastrar seus clientes e pacientes</li>
      <li>Organizar sua agenda</li>
      <li>Controlar seu estoque</li>
      <li>Gerenciar finanças</li>
    </ul>
  </div>
  <p>Se tiver qualquer dúvida, entre em contato com nosso suporte:</p>
  <p>📧 <a href="mailto:${SUPPORT_EMAIL}" style="color:#2563eb">${SUPPORT_EMAIL}</a></p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0">
  <p style="color:#94a3b8;font-size:12px;text-align:center">
    Equipe SystemHub — Obrigado por escolher nossa plataforma!
  </p>
</body>
</html>`;
}

function adminNotificationHtml(name: string, email: string, date: string): string {
  return `
<div style="font-family:Arial,sans-serif;max-width:600px;padding:24px">
  <h2>🆕 Novo usuário no SystemHub</h2>
  <table style="width:100%;border-collapse:collapse">
    <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b">Nome</td><td style="padding:8px;border-bottom:1px solid #e2e8f0"><strong>${name}</strong></td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b">E-mail</td><td style="padding:8px;border-bottom:1px solid #e2e8f0"><a href="mailto:${email}">${email}</a></td></tr>
    <tr><td style="padding:8px;color:#64748b">Data</td><td style="padding:8px">${date}</td></tr>
  </table>
</div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    // INTERNAL_WEBHOOK_SECRET separates internal calls from user JWT calls.
    // Set this in Supabase Dashboard → Edge Functions → Secrets and configure
    // the database webhook to send it as Bearer token instead of service_role_key.
    const internalSecret = Deno.env.get("INTERNAL_WEBHOOK_SECRET");

    let userId: string | null = null;
    let userEmail: string | null = null;
    let userName: string | null = null;

    const isInternalCall = internalSecret
      ? token === internalSecret
      : token === serviceRoleKey;

    if (isInternalCall) {
      // Called from database webhook — read user data from body
      const body = await req.json().catch(() => ({}));
      // Supabase webhook sends { record: { user_id, display_name, ... } }
      const record = body?.record ?? body;
      userId = String(record?.user_id ?? record?.userId ?? "");
      userName = String(record?.display_name ?? record?.name ?? "");
    } else {
      // Called from client after signup — verify JWT
      const { data: { user }, error } = await adminClient.auth.getUser(token);
      if (error || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
      }
      userId = user.id;
      userEmail = user.email ?? null;
      userName = user.user_metadata?.display_name ?? null;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId required" }), {
        status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Fetch full user info if needed
    if (!userEmail) {
      const { data: userRes } = await adminClient.auth.admin.getUserById(userId);
      userEmail = userRes?.user?.email ?? null;
    }
    if (!userName || !userEmail) {
      const { data: profile } = await adminClient
        .from("profiles")
        .select("display_name, business_name")
        .eq("user_id", userId)
        .maybeSingle();
      if (!userName) userName = profile?.display_name ?? profile?.business_name ?? "Novo usuário";
    }

    if (!userEmail) {
      console.warn("notify-new-user: usuário sem email, id=", userId);
      return new Response(JSON.stringify({ ok: true, sent: false, reason: "no_email" }), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const dataBR = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

    const [welcomeResult, adminResult] = await Promise.all([
      sendEmail({
        to: userEmail,
        subject: "Bem-vindo ao SystemHub! 🎉",
        html: welcomeHtml(userName),
      }),
      sendEmail({
        to: ADMIN_EMAIL,
        subject: `Novo usuário: ${userName} <${userEmail}>`,
        html: adminNotificationHtml(userName, userEmail, dataBR),
      }),
    ]);

    console.log(`notify-new-user: welcome=${welcomeResult.ok}, admin=${adminResult.ok} for ${userEmail}`);

    return new Response(JSON.stringify({ ok: true, welcome: welcomeResult.ok, admin: adminResult.ok }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-new-user error:", err);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
