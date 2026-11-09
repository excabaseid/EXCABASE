param(
    [string]$ChromePath = 'C:\Program Files\Google\Chrome\Application\chrome.exe',
    [switch]$CapturePreviews
)
# Windows browser runner, no Node/npm or external packages required.
# A fresh disposable profile isolates all test fixtures from the user's browser.
$ErrorActionPreference = 'Stop'
$fleetRoot = Split-Path -Parent $PSScriptRoot
$fleetAuditDir = Join-Path ([System.IO.Path]::GetTempPath()) ('excabase-fleet-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $fleetAuditDir | Out-Null
$fleetProfile = Join-Path $fleetAuditDir 'profile'
$fleetSocket = $null
$fleetProcess = $null
$script:fleetRequestId = 0
$script:fleetBrowserExceptions = @()
function Send-FleetCdp([string]$Method, $Parameters = @{}) {
    $script:fleetRequestId++
    $requestId = $script:fleetRequestId
    $json = @{id=$requestId;method=$Method;params=$Parameters} | ConvertTo-Json -Depth 30 -Compress
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $segment = [System.ArraySegment[byte]]::new($bytes)
    $fleetSocket.SendAsync($segment,[System.Net.WebSockets.WebSocketMessageType]::Text,$true,[Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null
    $buffer = New-Object byte[] 1048576
    while ($true) {
        $stream = [System.IO.MemoryStream]::new()
        do {
            $part = $fleetSocket.ReceiveAsync([System.ArraySegment[byte]]::new($buffer),[Threading.CancellationToken]::None).GetAwaiter().GetResult()
            $stream.Write($buffer,0,$part.Count)
        } while (-not $part.EndOfMessage)
        $message = [System.Text.Encoding]::UTF8.GetString($stream.ToArray()) | ConvertFrom-Json
        $stream.Dispose()
        if ($message.method -eq 'Runtime.exceptionThrown') {
            $script:fleetBrowserExceptions += $message.params.exceptionDetails
        }
        if ($message.id -eq $requestId) {
            if ($message.error) { throw ($message.error | ConvertTo-Json -Compress) }
            return $message.result
        }
    }
}
function Invoke-FleetJs([string]$Expression) {
    $response = Send-FleetCdp 'Runtime.evaluate' @{expression=$Expression;returnByValue=$true;awaitPromise=$true}
    if ($response.exceptionDetails) { throw ($response.exceptionDetails | ConvertTo-Json -Depth 12 -Compress) }
    return $response.result.value
}
try {
    $arguments = @('--headless=new','--disable-gpu','--no-first-run','--allow-file-access-from-files','--remote-debugging-port=0','--window-size=1400,1100',('--user-data-dir="' + $fleetProfile + '"'),'about:blank')
    $fleetProcess = Start-Process -FilePath $ChromePath -ArgumentList $arguments -WindowStyle Hidden -PassThru -RedirectStandardError (Join-Path $fleetAuditDir 'browser.log')
    $portFile = Join-Path $fleetProfile 'DevToolsActivePort'
    for ($i=0; $i -lt 100 -and -not (Test-Path -LiteralPath $portFile); $i++) { Start-Sleep -Milliseconds 100 }
    $port = (Get-Content -LiteralPath $portFile)[0]
    $targets = Invoke-RestMethod -Uri ('http://127.0.0.1:' + $port + '/json/list')
    $page = $targets | Where-Object type -eq 'page' | Select-Object -First 1
    $fleetSocket = [System.Net.WebSockets.ClientWebSocket]::new()
    $fleetSocket.ConnectAsync([uri]$page.webSocketDebuggerUrl,[Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null
    Send-FleetCdp 'Page.enable' | Out-Null
    Send-FleetCdp 'Runtime.enable' | Out-Null
    Send-FleetCdp 'Emulation.setFocusEmulationEnabled' @{enabled=$true} | Out-Null
    $testUri = ([uri](Join-Path $fleetRoot 'tests\fleet-visualization.html')).AbsoluteUri + '?run=1'
    Send-FleetCdp 'Page.navigate' @{url=$testUri} | Out-Null
    $result = ''
    for ($i=0; $i -lt 240; $i++) {
        Start-Sleep -Milliseconds 300
        $result = Invoke-FleetJs 'document.getElementById("fvTestOutput")?.textContent || ""'
        if ($result.StartsWith('{')) { break }
    }
    if (-not $result.StartsWith('{')) { throw 'Browser audit timed out.' }
    $parsed = $result | ConvertFrom-Json
    $parsed | Add-Member -NotePropertyName browserExceptions -NotePropertyValue @($script:fleetBrowserExceptions)
    if ($script:fleetBrowserExceptions.Count -gt 0) { $parsed.passed = $false }
    $result = $parsed | ConvertTo-Json -Depth 20 -Compress
    [System.IO.File]::WriteAllText((Join-Path $fleetAuditDir 'result.json'),$result)
    Write-Output $result
    if (-not $parsed.passed) { throw 'Fleet Simulation audit failed; see result.json.' }
    if ($CapturePreviews) {
        $dozerPreviews = Invoke-FleetJs 'window.ExcabaseBulldozerTestPreviews'
        Invoke-FleetJs '(()=>{const p=window.ExcabaseFleetTestPreview;localStorage.setItem("excabase_active_project",JSON.stringify(p.project));localStorage.setItem("excabase_projects",JSON.stringify([p.project]));sessionStorage.setItem(ExcabaseFleetData.SESSION_KEY,JSON.stringify(p.source));})()' | Out-Null
        $viewUri = ([uri](Join-Path $fleetRoot 'pages\fleet-visualization.html')).AbsoluteUri + '?fromProject=1&projectId=fv-audit&scenario=cepat'
        Send-FleetCdp 'Page.navigate' @{url=$viewUri} | Out-Null
        Start-Sleep -Milliseconds 700
        Invoke-FleetJs 'document.getElementById("fv-unloadMinutes").value="1";document.getElementById("fvForm").requestSubmit();document.getElementById("fvParameters").open=false' | Out-Null
        foreach ($width in @(390,1366)) {
            Send-FleetCdp 'Emulation.setDeviceMetricsOverride' @{width=$width;height=1000;deviceScaleFactor=1;mobile=$false} | Out-Null
            Start-Sleep -Milliseconds 350
            $screenshot = Send-FleetCdp 'Page.captureScreenshot' @{format='png'}
            [System.IO.File]::WriteAllBytes((Join-Path $fleetAuditDir ('fleet-' + $width + '.png')),[Convert]::FromBase64String($screenshot.data))
        }
        foreach ($mode in @('dozer-truck','combined')) {
            $dozerSeed = $dozerPreviews.$mode | ConvertTo-Json -Depth 30 -Compress
            Invoke-FleetJs ('(()=>{const p=' + $dozerSeed + ';localStorage.setItem("excabase_active_project",JSON.stringify(p.project));localStorage.setItem("excabase_projects",JSON.stringify([p.project]));sessionStorage.setItem(ExcabaseFleetData.SESSION_KEY,JSON.stringify(p.source));})()') | Out-Null
            Send-FleetCdp 'Page.navigate' @{url=$viewUri} | Out-Null
            Start-Sleep -Milliseconds 500
            Invoke-FleetJs 'document.getElementById("fv-dozerCycleSeconds").value=".4";if(document.getElementById("fv-unloadMinutes"))document.getElementById("fv-unloadMinutes").value="1";document.getElementById("fvForm").requestSubmit();document.getElementById("fvParameters").open=false;document.getElementById("fvSpeed").value="10";document.getElementById("fvSpeed").dispatchEvent(new Event("change"));document.getElementById("fvPlay").click()' | Out-Null
            Start-Sleep -Milliseconds 350
            Invoke-FleetJs 'document.getElementById("fvPause").click()' | Out-Null
            foreach ($width in @(390,1366)) {
                Send-FleetCdp 'Emulation.setDeviceMetricsOverride' @{width=$width;height=1000;deviceScaleFactor=1;mobile=$false} | Out-Null
                Start-Sleep -Milliseconds 200
                Invoke-FleetJs 'document.getElementById("fvSceneTitle").scrollIntoView({block:"start"})' | Out-Null
                $screenshot = Send-FleetCdp 'Page.captureScreenshot' @{format='png'}
                [System.IO.File]::WriteAllBytes((Join-Path $fleetAuditDir ($mode + '-' + $width + '.png')),[Convert]::FromBase64String($screenshot.data))
            }
        }
    }
} finally {
    if ($fleetSocket) { $fleetSocket.Dispose() }
    if ($fleetProcess -and -not $fleetProcess.HasExited) { Stop-Process -Id $fleetProcess.Id -ErrorAction SilentlyContinue }
    Write-Output ('Audit artifacts: ' + $fleetAuditDir)
}
