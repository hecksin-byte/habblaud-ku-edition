# Habblaud 서버를 숨김 창으로 띄운다. 작업 스케줄러 "Habblaud Server"(로그온 시)가 이 파일을 호출한다.
# node는 래퍼의 콘솔과 분리된 자체 숨김 콘솔에서 돌려서, 래퍼가 끝나도 같이 죽지 않게 한다.
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$node = (Get-Command node -ErrorAction Stop).Source
$dir  = Join-Path $env:USERPROFILE '.habblaud'
New-Item -ItemType Directory -Force $dir | Out-Null

# 이미 4747 포트에서 돌고 있으면 두 번 띄우지 않는다.
if (Get-NetTCPConnection -LocalPort 4747 -State Listen -ErrorAction SilentlyContinue) { exit 0 }

$env:HABBLAUD_UPDATE_CHECK = '0'
if (-not $env:HABBLAUD_LANG) { $env:HABBLAUD_LANG = 'ko' }
Start-Process -FilePath $node -ArgumentList 'dist\server\index.js' -WorkingDirectory $repo `
  -WindowStyle Hidden -Wait `
  -RedirectStandardOutput (Join-Path $dir 'server.log') `
  -RedirectStandardError  (Join-Path $dir 'server.err.log')
