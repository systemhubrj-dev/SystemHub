const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_DEFAULT = "SystemHub <noreply@systemhub.app.br>";

interface EmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail(params: EmailParams): Promise<{ ok: boolean; reason?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.warn("[resend] RESEND_API_KEY não configurado — email ignorado");
    return { ok: false, reason: "no_api_key" };
  }

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: params.from ?? FROM_DEFAULT,
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[resend] Erro ao enviar email:", res.status, body);
    return { ok: false, reason: body };
  }

  return { ok: true };
}
