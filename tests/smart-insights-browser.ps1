param([string]$ChromePath = 'C:\Program Files\Google\Chrome\Application\chrome.exe')
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
    $insightUri = ([uri](Join-Path $fleetRoot 'pages\simulasi-armada.html')).AbsoluteUri + '?fromProject=1'
    Send-FleetCdp 'Page.navigate' @{url=$insightUri} | Out-Null
    Start-Sleep -Milliseconds 500
    Invoke-FleetJs (Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot 'smart-insights-browser-tests.js')) | Out-Null
    $result = Invoke-FleetJs 'runSmartInsightsAudit()'
    Invoke-FleetJs 'window.smartAuditFrame.contentDocument.getElementById("saveFleetScenarioBtn").click()' | Out-Null
    Send-FleetCdp 'Page.navigate' @{url=$insightUri} | Out-Null
    Start-Sleep -Milliseconds 700
    if (-not (Invoke-FleetJs '!document.getElementById("smartInsights").hidden')) { throw 'Saved current scenarios did not restore insights.' }
    Invoke-FleetJs 'document.getElementById("siLoader").value="excavator";document.getElementById("siLoader").dispatchEvent(new Event("change"))' | Out-Null
    Invoke-FleetJs 'document.getElementById("siToggle").click()' | Out-Null
    foreach ($width in @(1366,768,390,360)) {
        Send-FleetCdp 'Emulation.setDeviceMetricsOverride' @{width=$width;height=1000;deviceScaleFactor=1;mobile=$false} | Out-Null
        Start-Sleep -Milliseconds 350
        Invoke-FleetJs 'document.getElementById("smartInsights").scrollIntoView({block:"start"})' | Out-Null
        $geometry = Invoke-FleetJs '(()=>{const p=document.getElementById("smartInsights"),r=p.getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,within:r.left>=0&&r.right<=innerWidth,clip:{x:r.x,y:r.y+scrollY,width:r.width,height:r.height,scale:1}}})()'
        if ($geometry.overflow -or -not $geometry.within) { throw ('Insights overflow at ' + $width) }
        $screen = Send-FleetCdp 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$true;clip=$geometry.clip}
        [IO.File]::WriteAllBytes((Join-Path $fleetAuditDir ('insights-' + $width + '.png')),[Convert]::FromBase64String($screen.data))
        $expanded = Invoke-FleetJs '(()=>{document.querySelectorAll("#siEquipmentGrid details,.si-help").forEach(d=>d.open=true);return document.documentElement.scrollWidth<=innerWidth;})()'
        if (-not $expanded) { throw ('Expanded details overflow at ' + $width) }
        Invoke-FleetJs 'document.querySelectorAll("#siEquipmentGrid details,.si-help").forEach(d=>d.open=false)' | Out-Null
        Invoke-FleetJs 'document.getElementById("siToggle").click()' | Out-Null
        Start-Sleep -Milliseconds 350
        $compact = Invoke-FleetJs '(()=>{const p=document.getElementById("smartInsights"),r=p.getBoundingClientRect();return {inert:document.getElementById("siDashboard").inert,height:r.height,clip:{x:r.x,y:r.y+scrollY,width:r.width,height:r.height,scale:1}}})()'
        if (-not $compact.inert -or $compact.height -gt 250) { throw 'Closed dashboard is not compact or inert.' }
        $closed = Send-FleetCdp 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$true;clip=$compact.clip}
        [IO.File]::WriteAllBytes((Join-Path $fleetAuditDir ('insights-closed-' + $width + '.png')),[Convert]::FromBase64String($closed.data))
        Invoke-FleetJs 'document.getElementById("siToggle").click()' | Out-Null
    }
    $result | Add-Member browserExceptions @($script:fleetBrowserExceptions)
    $result | Add-Member widths @(1366,768,390,360)
    $json=$result | ConvertTo-Json -Depth 12
    [IO.File]::WriteAllText((Join-Path $fleetAuditDir 'smart-insights-result.json'),$json)
    Write-Output $json
    if ($script:fleetBrowserExceptions.Count) { throw 'Browser exceptions detected.' }
} finally {
    if ($fleetSocket) { $fleetSocket.Dispose() }
    if ($fleetProcess -and -not $fleetProcess.HasExited) { Stop-Process -Id $fleetProcess.Id -ErrorAction SilentlyContinue }
    Write-Output ('Audit artifacts: ' + $fleetAuditDir)
}
