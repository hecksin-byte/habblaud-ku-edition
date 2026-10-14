# Windows에 로그인하면 Habblaud 서버가 저절로 뜨게 하는 작업 스케줄러 항목("Habblaud Server")을 켜고 끈다.
#   powershell -ExecutionPolicy Bypass -File scripts\windows\autostart.ps1 -Action status|on|off
# 결과는 한 줄 JSON: {"supported":true,"installed":bool,"enabled":bool}. 설정 화면의 스위치도 이 파일을 쓴다.
param([ValidateSet('status', 'on', 'off')][string]$Action = 'status')
$ErrorActionPreference = 'Stop'
$name   = 'Habblaud Server'
$script = Join-Path $PSScriptRoot 'start-server.ps1'

function Get-HabblaudTask { Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue }

if ($Action -eq 'on') {
  $t = Get-HabblaudTask
  if ($t) {
    Enable-ScheduledTask -TaskName $name | Out-Null
  } else {
    $user = "$env:USERDOMAIN\$env:USERNAME"
    $act  = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
    $trig = New-ScheduledTaskTrigger -AtLogOn -User $user
    $set  = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    Register-ScheduledTask -TaskName $name -Action $act -Trigger $trig -Settings $set -Description 'Habblaud 서버를 로그온 시 숨김으로 시작' | Out-Null
  }
} elseif ($Action -eq 'off') {
  if (Get-HabblaudTask) { Disable-ScheduledTask -TaskName $name | Out-Null }
}

$t = Get-HabblaudTask
$state = [ordered]@{ supported = $true; installed = [bool]$t; enabled = [bool]($t -and $t.Settings.Enabled) }
$state | ConvertTo-Json -Compress
