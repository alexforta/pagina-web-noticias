$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$localUrl = 'http://127.0.0.1:3210'
function Test-MiDiario {
    try { $health = Invoke-RestMethod -Uri ($localUrl + '/api/health') -TimeoutSec 2; return ($health.app -eq 'mi-diario' -and $health.version -eq 4) } catch { return $false }
}
try {
    if (-not (Test-MiDiario)) {
        $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
        if ($nodeCommand) { $nodePath = $nodeCommand.Source } else { $nodePath = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' }
        if (-not (Test-Path -LiteralPath $nodePath)) { throw 'No se encuentra Node.js. Instala Node.js 22 o superior para abrir la web.' }
        $logDirectory = Join-Path $projectRoot '.sites-runtime'
        New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
        $serverProcess = Start-Process -FilePath $nodePath -ArgumentList @('scripts/preview.mjs') -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDirectory 'local-server.log') -RedirectStandardError (Join-Path $logDirectory 'local-server-error.log')
        $ready = $false
        for ($attempt = 0; $attempt -lt 20; $attempt++) { if (Test-MiDiario) { $ready = $true; break }; if ($serverProcess.HasExited) { break }; Start-Sleep -Milliseconds 300 }
        if (-not $ready) { throw ('No se pudo iniciar la web. Consulta ' + (Join-Path $logDirectory 'local-server-error.log') + '. El puerto 3210 puede estar ocupado.') }
    }
    Start-Process ($localUrl + '/index.html')
    Write-Host 'Mi Diario abierto. El servidor de noticias funciona en segundo plano.'
} catch { Write-Host $_.Exception.Message; exit 1 }
