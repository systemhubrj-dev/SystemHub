"""
Etapa 1 — Extração de emails de clínicas veterinárias do CNPJ público.

Fonte: Receita Federal (dados abertos)
CNAE veterinária: 7500100

Uso:
    pip install requests supabase
    set SUPABASE_URL=https://xxx.supabase.co
    set SUPABASE_SERVICE_KEY=service_role_key
    python 01_extract_cnpj.py 2025-04

O mês disponível muda mensalmente — verifique em:
https://dadosabertos.rfb.gov.br/CNPJ/dados_abertos_cnpj/
"""

import os
import sys
import csv
import io
import zipfile
import requests
from html.parser import HTMLParser
from datetime import datetime, timezone
from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

CNAE_VETERINARIA = {"7500100"}
SITUACAO_ATIVA = "02"
BASE_RF = "https://dadosabertos.rfb.gov.br/CNPJ/dados_abertos_cnpj/"
BATCH = 500

# Layout do arquivo Estabelecimentos (sem cabeçalho, separador ;, encoding latin-1)
C_BASICO   = 0
C_ORDEM    = 1
C_DV       = 2
C_FANTASIA = 4
C_SITUACAO = 5
C_CNAE     = 11
C_UF       = 19
C_MUNIC    = 21
C_DDD1     = 22
C_TEL1     = 23
C_EMAIL    = 28


class _LinkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            href = dict(attrs).get("href", "")
            if "Estabelecimentos" in href and href.endswith(".zip"):
                self.links.append(href)


def _find_zip_urls(year_month: str) -> list[str]:
    url = f"{BASE_RF}{year_month}/"
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    p = _LinkParser()
    p.feed(r.text)
    return [
        (url + lnk) if not lnk.startswith("http") else lnk
        for lnk in p.links
    ]


def _process_zip(zip_url: str, supabase) -> int:
    fname = zip_url.split("/")[-1]
    print(f"\n→ {fname}", flush=True)

    r = requests.get(zip_url, stream=True, timeout=300)
    r.raise_for_status()

    chunks = []
    downloaded = 0
    for chunk in r.iter_content(1024 * 1024):
        chunks.append(chunk)
        downloaded += len(chunk)
        print(f"  {downloaded // (1024*1024)} MB...", end="\r", flush=True)
    print()
    content = b"".join(chunks)

    leads = []
    inserted = 0

    with zipfile.ZipFile(io.BytesIO(content)) as z:
        for name in z.namelist():
            with z.open(name) as raw:
                reader = csv.reader(
                    io.TextIOWrapper(raw, encoding="latin-1"),
                    delimiter=";",
                    quotechar='"',
                )
                for row in reader:
                    if len(row) <= C_EMAIL:
                        continue
                    if row[C_SITUACAO] != SITUACAO_ATIVA:
                        continue
                    if row[C_CNAE].strip() not in CNAE_VETERINARIA:
                        continue
                    email = row[C_EMAIL].strip().lower()
                    if not email or "@" not in email or "." not in email.split("@")[-1]:
                        continue

                    cnpj = row[C_BASICO] + row[C_ORDEM] + row[C_DV]
                    nome = row[C_FANTASIA].strip()
                    ddd  = row[C_DDD1].strip()
                    tel  = row[C_TEL1].strip()
                    phone = f"({ddd}){tel}" if ddd else tel

                    leads.append({
                        "cnpj":        cnpj,
                        "clinic_name": nome,
                        "email":       email,
                        "phone":       phone,
                        "city":        row[C_MUNIC].strip().title(),
                        "state":       row[C_UF].strip(),
                        "status":      "pending",
                    })

                    if len(leads) >= BATCH:
                        supabase.table("outbound_leads").upsert(
                            leads, on_conflict="email"
                        ).execute()
                        inserted += len(leads)
                        print(f"  {inserted} leads inseridos", flush=True)
                        leads = []

    if leads:
        supabase.table("outbound_leads").upsert(leads, on_conflict="email").execute()
        inserted += len(leads)

    return inserted


def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        sys.exit("ERRO: exporte SUPABASE_URL e SUPABASE_SERVICE_KEY")

    year_month = sys.argv[1] if len(sys.argv) > 1 else "2025-04"
    print(f"Buscando arquivos de Estabelecimentos em {year_month}...")

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    urls = _find_zip_urls(year_month)

    if not urls:
        sys.exit(
            f"Nenhum arquivo encontrado. Verifique o mês disponível em:\n{BASE_RF}"
        )

    print(f"Arquivos encontrados: {len(urls)}")
    total = 0
    for url in urls:
        n = _process_zip(url, supabase)
        total += n
        print(f"  +{n} leads neste arquivo (total: {total})")

    print(f"\n✓ Extração concluída — {total} clínicas veterinárias com email salvas")


if __name__ == "__main__":
    main()
