# Script de configuração completa do GitHub Actions
# Execute no terminal: powershell -ExecutionPolicy Bypass -File setup_github.ps1

$ErrorActionPreference = "Stop"
$Repo   = "Jvitorx13/SystemHub"
$GitDir = "C:\Users\jvito\Downloads\SystemHub"

Write-Host ""
Write-Host "=== SystemHub — Configuracao GitHub Actions ===" -ForegroundColor Cyan
Write-Host ""

# 1. Autenticar gh
Write-Host "[1/5] Verificando autenticacao do GitHub..." -ForegroundColor Yellow
$ghStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "     Abrindo browser para login..." -ForegroundColor Gray
    gh auth login --web --git-protocol https
}
Write-Host "     OK" -ForegroundColor Green

# 2. Criar repo se nao existir
Write-Host "[2/5] Verificando repositorio $Repo..." -ForegroundColor Yellow
$repoCheck = gh repo view $Repo 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "     Repositorio nao encontrado. Criando..." -ForegroundColor Gray
    gh repo create $Repo --private --source $GitDir --remote origin --push
    Write-Host "     Repositorio criado e codigo enviado!" -ForegroundColor Green
} else {
    Write-Host "     Repositorio existe. Fazendo push..." -ForegroundColor Gray
    Set-Location $GitDir
    git push origin main
    Write-Host "     Push concluido!" -ForegroundColor Green
}

# 3. Coletar credenciais
Write-Host ""
Write-Host "[3/5] Configurando secrets do GitHub Actions..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Precisamos de 3 informacoes para o disparo automatico:" -ForegroundColor White
Write-Host ""

# Supabase (URL ja conhecida)
$SUPABASE_URL = "https://nktskwrwvnefpyfdpiyu.supabase.co"
Write-Host "  SUPABASE_URL: $SUPABASE_URL (automatico)" -ForegroundColor Gray

Write-Host ""
$SUPABASE_KEY = Read-Host "  Cole sua Supabase SERVICE_ROLE KEY (nao a anon key)"
if (-not $SUPABASE_KEY) { Write-Host "Chave vazia. Saindo." -ForegroundColor Red; exit 1 }

# Brevo key — lê do arquivo salvo automaticamente se existir
$BrevoKeyFile = "$env:USERPROFILE\OneDrive\Desktop\BREVO_API_KEY.txt"
if (Test-Path $BrevoKeyFile) {
    $BREVO_KEY = (Get-Content $BrevoKeyFile -Raw).Trim()
    Write-Host "  BREVO_API_KEY: lida automaticamente de Desktop\BREVO_API_KEY.txt" -ForegroundColor Gray
} else {
    Write-Host ""
    $BREVO_KEY = Read-Host "  Cole sua Brevo API Key (app.brevo.com > Settings > API Keys)"
    if (-not $BREVO_KEY) { Write-Host "Chave vazia. Saindo." -ForegroundColor Red; exit 1 }
}

Write-Host ""
$SENDER_EMAIL = Read-Host "  Email remetente verificado no Brevo (ex: systemhubrj@gmail.com)"
if (-not $SENDER_EMAIL) { $SENDER_EMAIL = "systemhubrj@gmail.com" }

$SENDER_NAME = "Joao Vitor | SystemHub"

# 4. Setar secrets
Write-Host ""
Write-Host "[4/5] Salvando secrets no GitHub..." -ForegroundColor Yellow
$SUPABASE_URL    | gh secret set SUPABASE_URL        --repo $Repo
$SUPABASE_KEY    | gh secret set SUPABASE_SERVICE_KEY --repo $Repo
$BREVO_KEY       | gh secret set BREVO_API_KEY        --repo $Repo
$SENDER_EMAIL    | gh secret set SENDER_EMAIL          --repo $Repo
$SENDER_NAME     | gh secret set SENDER_NAME           --repo $Repo
Write-Host "     Secrets salvos!" -ForegroundColor Green

# 5. Verificar workflow
Write-Host ""
Write-Host "[5/5] Verificando workflow..." -ForegroundColor Yellow
gh workflow list --repo $Repo
Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " PRONTO! O disparo roda automaticamente todo dia as 10h." -ForegroundColor Green
Write-Host ""
Write-Host " Para rodar manualmente agora:"  -ForegroundColor White
Write-Host "   gh workflow run 'daily-campaign.yml' --repo $Repo" -ForegroundColor Gray
Write-Host ""
Write-Host " Para testar sem enviar:"  -ForegroundColor White
Write-Host "   gh workflow run 'daily-campaign.yml' --repo $Repo -f dry_run=true" -ForegroundColor Gray
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "Pressione Enter para fechar"
