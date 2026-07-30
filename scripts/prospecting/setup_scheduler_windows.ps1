# Registra tarefa no Agendador de Tarefas do Windows
# Rode como Administrador: powershell -ExecutionPolicy Bypass -File setup_scheduler_windows.ps1

$ScriptDir  = "C:\Users\jvito\Downloads\SystemHub\scripts\prospecting"
$PythonExe  = (Get-Command python).Source
$TaskName   = "SystemHub-Prospecting-Daily"
$RunHour    = 10   # 10h da manhã

# Cria o launcher .bat que carrega as vars e roda o script
$BatPath = "$ScriptDir\run_daily.bat"
@"
@echo off
cd /d "$ScriptDir"
for /F "usebackq tokens=1,* delims==" %%A in (".env") do (
  if not "%%A"=="" if not "%%A:~0,1%"=="#" set "%%A=%%B"
)
"$PythonExe" 02_send_campaign.py >> "%~dp0logs\campaign.log" 2>&1
"@ | Set-Content $BatPath -Encoding ASCII

# Cria pasta de logs
New-Item -ItemType Directory -Force "$ScriptDir\logs" | Out-Null

# Registra no Task Scheduler
$Action  = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$BatPath`""
$Trigger = New-ScheduledTaskTrigger -Daily -At "${RunHour}:00"
$Settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours 1) `
              -StartWhenAvailable $true

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action   $Action `
  -Trigger  $Trigger `
  -Settings $Settings `
  -RunLevel Highest `
  -Force

Write-Host "Tarefa '$TaskName' criada — roda todo dia às ${RunHour}h."
Write-Host "Logs em: $ScriptDir\logs\campaign.log"
Write-Host ""
Write-Host "Para rodar agora manualmente:"
Write-Host "  Start-ScheduledTask -TaskName '$TaskName'"
