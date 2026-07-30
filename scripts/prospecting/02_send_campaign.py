"""
Etapa 2 — Disparo de emails via Brevo (300/dia no plano gratuito).

Uso:
    pip install requests supabase
    # configure o .env (veja .env.example) e então:
    python 02_send_campaign.py

Flags opcionais:
    python 02_send_campaign.py --dry-run   # simula sem enviar
    python 02_send_campaign.py --limit 10  # envia no máximo 10 hoje
"""

import os
import sys
import time
import argparse
import requests
from datetime import date, datetime, timezone
from supabase import create_client

SUPABASE_URL    = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY    = os.environ.get("SUPABASE_SERVICE_KEY", "")
BREVO_API_KEY   = os.environ.get("BREVO_API_KEY", "")
SENDER_EMAIL    = os.environ.get("SENDER_EMAIL", "")
SENDER_NAME     = os.environ.get("SENDER_NAME", "João Vitor | SystemHub")

DAILY_LIMIT  = 300
BREVO_URL    = "https://api.brevo.com/v3/smtp/email"
DELAY_SEC    = 0.35  # intervalo entre envios (evita rate limit)

SUBJECT = "Uma ferramenta que clínicas veterinárias estão usando para simplificar a gestão"

# ─── Template HTML (email-safe: sem flexbox/grid, sem pseudo-elementos) ─────────

HTML_TEMPLATE = """\
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f2f4f8;font-family:Arial,'Helvetica Neue',sans-serif;">

<!-- Wrapper -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f2f4f8;">
<tr><td align="center" style="padding:28px 16px 48px;">

<!-- Email container -->
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">

  <!-- HEADER navy -->
  <tr>
    <td style="background:linear-gradient(145deg,#0a1628 0%,#0f2d5c 55%,#1b4080 100%);padding:28px 36px 26px;">
      <p style="margin:0;font-size:22px;font-weight:900;letter-spacing:-0.03em;line-height:1;">
        <span style="color:#ffffff;">System</span><span style="color:#1fad4e;">Hub</span>
      </p>
      <p style="margin:8px 0 0;font-size:10.5px;font-weight:700;letter-spacing:0.10em;text-transform:uppercase;color:rgba(255,255,255,0.42);">
        Gestão Veterinária com IA
      </p>
    </td>
  </tr>

  <!-- BODY -->
  <tr>
    <td style="background:#ffffff;padding:30px 36px 24px;">
      <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#334155;">
        Olá,<br><br>
        Me chamo <strong style="color:#0f172a;">João Vitor</strong> e faço parte da equipe do
        <strong style="color:#0f172a;">SystemHub</strong>.<br><br>
        Trabalho com clínicas veterinárias há um tempo e sei como a rotina é corrida — entre
        atendimentos, controle de estoque, prontuários e ainda cuidar do financeiro.
        Por isso queria te apresentar o SystemHub.
      </p>

      <!-- Label -->
      <p style="margin:0 0 12px;font-size:10.5px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#1fad4e;">
        Tudo no mesmo plano
      </p>

      <!-- 3 feature cards (tabela 3 colunas) -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr valign="top">

          <!-- Clínica Digital (azul) -->
          <td width="33%" style="padding-right:6px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;">
              <tr>
                <td style="padding:14px 13px 16px;">
                  <p style="margin:0 0 10px;font-size:18px;">🩺</p>
                  <p style="margin:0 0 10px;font-size:12px;font-weight:800;color:#2563eb;line-height:1.2;">Clínica<br>Digital</p>
                  <p style="margin:0 0 5px;font-size:11px;color:#334155;">✓ Prontuário com IA</p>
                  <p style="margin:0 0 5px;font-size:11px;color:#334155;">✓ Agenda integrada</p>
                  <p style="margin:0 0 5px;font-size:11px;color:#334155;">✓ Receituários em PDF</p>
                  <p style="margin:0;font-size:11px;color:#334155;">✓ Vacinas e lembretes</p>
                </td>
              </tr>
            </table>
          </td>

          <!-- Financeiro (verde) -->
          <td width="33%" style="padding-right:6px;padding-left:6px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="background:#edfaf3;border:1px solid #6ee7b7;border-radius:12px;">
              <tr>
                <td style="padding:14px 13px 16px;">
                  <p style="margin:0 0 10px;font-size:18px;">💰</p>
                  <p style="margin:0 0 10px;font-size:12px;font-weight:800;color:#059669;line-height:1.2;">Financeiro<br>Completo</p>
                  <p style="margin:0 0 5px;font-size:11px;color:#334155;">✓ Controle de caixa</p>
                  <p style="margin:0 0 5px;font-size:11px;color:#334155;">✓ Contas a pagar/receber</p>
                  <p style="margin:0 0 5px;font-size:11px;color:#334155;">✓ Estoque e medicamentos</p>
                  <p style="margin:0;font-size:11px;color:#334155;">✓ Relatórios mensais</p>
                </td>
              </tr>
            </table>
          </td>

          <!-- IA (violeta) -->
          <td width="33%" style="padding-left:6px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:12px;">
              <tr>
                <td style="padding:14px 13px 16px;">
                  <p style="margin:0 0 10px;font-size:18px;">🧠</p>
                  <p style="margin:0 0 10px;font-size:12px;font-weight:800;color:#7c3aed;line-height:1.2;">Gestão<br>com IA</p>
                  <p style="margin:0 0 5px;font-size:11px;color:#334155;">✓ Bulário + calculadora IA</p>
                  <p style="margin:0 0 5px;font-size:11px;color:#334155;">✓ Diagnóstico assistido</p>
                  <p style="margin:0 0 5px;font-size:11px;color:#334155;">✓ App para tutores</p>
                  <p style="margin:0;font-size:11px;color:#334155;">✓ Equipe ilimitada</p>
                </td>
              </tr>
            </table>
          </td>

        </tr>
      </table>
    </td>
  </tr>

  <!-- CTA BAND (navy, estilo hero do site) -->
  <tr>
    <td style="background:linear-gradient(135deg,#0f2d5c 0%,#1b4080 100%);padding:26px 36px;text-align:center;">
      <p style="margin:0 0 6px;display:inline-block;background:rgba(255,255,255,0.12);color:rgba(255,255,255,0.85);font-size:10px;font-weight:700;letter-spacing:0.10em;text-transform:uppercase;padding:4px 14px;border-radius:100px;border:1px solid rgba(255,255,255,0.2);">
        ✦ VetPro · Plano único
      </p>
      <p style="margin:12px 0 16px;font-size:15px;color:rgba(255,255,255,0.75);line-height:1.55;">
        <strong style="color:#fff;">7 dias grátis</strong> · sem cartão de crédito<br>
        Depois, R$129,90/mês com tudo incluso.
      </p>
      <a href="https://www.systemhub.app.br"
         style="display:inline-block;background:#ffffff;color:#1b4080;font-size:14px;font-weight:800;padding:13px 32px;border-radius:8px;text-decoration:none;letter-spacing:-0.01em;">
        Começar grátis agora →
      </a>
      <p style="margin:14px 0 0;font-size:10px;color:rgba(255,255,255,0.40);">
        ✓ Sem cartão no trial &nbsp;·&nbsp; ✓ Cancele quando quiser &nbsp;·&nbsp; ✓ Suporte via WhatsApp
      </p>
    </td>
  </tr>

  <!-- SIGN-OFF -->
  <tr>
    <td style="background:#ffffff;padding:24px 36px;border-top:1px solid #e2e8f0;">
      <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.65;">
        Se quiser, posso te mostrar uma demonstração rápida de 15 minutos. É só responder este email.
      </p>
      <p style="margin:0;font-size:14px;font-weight:800;color:#0f172a;letter-spacing:-0.01em;">João Vitor</p>
      <p style="margin:2px 0 0;font-size:12px;color:#64748b;">Equipe SystemHub · Gestão Veterinária</p>
      <p style="margin:2px 0 0;font-size:12px;">
        <a href="https://www.systemhub.app.br" style="color:#1fad4e;text-decoration:none;">systemhub.app.br</a>
      </p>
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td style="background:#f8faff;border-top:1px solid #e2e8f0;padding:14px 36px;text-align:center;">
      <p style="margin:0;font-size:10.5px;color:#94a3b8;line-height:1.6;">
        Você recebeu este email pois sua empresa está cadastrada no CNPJ como prestadora de serviços veterinários.<br>
        <a href="https://www.systemhub.app.br/descadastro?email={email_encoded}" style="color:#1b4080;text-decoration:none;">
          Clique aqui para não receber mais mensagens
        </a>
      </p>
    </td>
  </tr>

</table>
<!-- /Email container -->

</td></tr>
</table>
<!-- /Wrapper -->

</body>
</html>
"""


# ─── Envio ────────────────────────────────────────────────────────────────────

def send(to_email: str, dry_run: bool) -> bool:
    html = HTML_TEMPLATE.replace(
        "{email_encoded}", requests.utils.quote(to_email)
    )
    if dry_run:
        print(f"  [DRY] {to_email}")
        return True

    resp = requests.post(
        BREVO_URL,
        json={
            "sender":      {"name": SENDER_NAME, "email": SENDER_EMAIL},
            "to":          [{"email": to_email}],
            "subject":     SUBJECT,
            "htmlContent": html,
        },
        headers={"api-key": BREVO_API_KEY, "content-type": "application/json"},
        timeout=15,
    )
    return resp.status_code in (200, 201)


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Simula sem enviar")
    parser.add_argument("--limit",   type=int, default=None, help="Máximo de envios hoje")
    args = parser.parse_args()

    if not args.dry_run and not all([SUPABASE_URL, SUPABASE_KEY, BREVO_API_KEY, SENDER_EMAIL]):
        sys.exit("ERRO: configure todas as variáveis do .env (veja .env.example)")

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Quantos já enviamos hoje?
    today = date.today().isoformat()
    res = (
        supabase.table("outbound_leads")
        .select("id", count="exact")
        .eq("status", "sent")
        .gte("sent_at", today)
        .execute()
    )
    sent_today = res.count or 0
    daily_cap  = min(DAILY_LIMIT, args.limit or DAILY_LIMIT)
    remaining  = daily_cap - sent_today

    if remaining <= 0:
        print(f"Limite diário atingido ({daily_cap} emails). Rode amanhã.")
        return

    print(f"Enviados hoje: {sent_today} | Restam: {remaining}{' | MODO DRY-RUN' if args.dry_run else ''}")

    # Busca leads pendentes
    leads = (
        supabase.table("outbound_leads")
        .select("id,email")
        .eq("status", "pending")
        .limit(remaining)
        .execute()
    ).data or []

    if not leads:
        print("Nenhum lead pendente. Rode 01_extract_cnpj.py primeiro.")
        return

    print(f"Enviando para {len(leads)} clínicas...\n")
    ok = fail = 0
    now_str = datetime.now(timezone.utc).isoformat()

    for lead in leads:
        success = send(lead["email"], dry_run=args.dry_run)
        status  = "sent" if success else "bounced"

        if not args.dry_run:
            supabase.table("outbound_leads").update(
                {"status": status, "sent_at": now_str}
            ).eq("id", lead["id"]).execute()

        if success:
            ok += 1
            if not args.dry_run:
                print(f"  ✓ {lead['email']}")
        else:
            fail += 1
            print(f"  ✗ {lead['email']}  (falhou — verifique Brevo dashboard)")

        time.sleep(DELAY_SEC)

    print(f"\n{'[DRY-RUN] ' if args.dry_run else ''}Concluído: {ok} enviados, {fail} falhas")


if __name__ == "__main__":
    main()
