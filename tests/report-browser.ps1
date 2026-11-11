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
    $reportUri = ([uri](Join-Path $fleetRoot 'pages\analisis-laporan.html')).AbsoluteUri
    Send-FleetCdp 'Page.navigate' @{url=$reportUri} | Out-Null
    Start-Sleep -Milliseconds 800
    Invoke-FleetJs (Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot 'report-browser-tests.js')) | Out-Null
    $result = Invoke-FleetJs 'runReportBrowserTests()'
    Invoke-FleetJs 'localStorage.setItem("excabase_active_project",JSON.stringify(window.reportAuditPreview));document.getElementById("refreshReportBtn").click()' | Out-Null
    foreach ($width in @(1366,390,360)) {
        Send-FleetCdp 'Emulation.setDeviceMetricsOverride' @{width=$width;height=1000;deviceScaleFactor=1;mobile=$false} | Out-Null
        Start-Sleep -Milliseconds 350
        $geometry = Invoke-FleetJs '({overflow:document.documentElement.scrollWidth>innerWidth,tableCells:getComputedStyle(document.querySelector("#reportResultsTable td")).display,scrollable:document.querySelector("#reportResultsTable").closest("table").parentElement.scrollWidth>document.querySelector("#reportResultsTable").closest("table").parentElement.clientWidth})'
        if ($geometry.overflow -or $geometry.tableCells -ne 'table-cell') { throw ('Report layout failed at ' + $width + ': ' + ($geometry | ConvertTo-Json -Compress)) }
        if ($width -lt 600 -and -not $geometry.scrollable) { throw 'Mobile table should scroll inside its wrapper.' }
        Invoke-FleetJs 'document.querySelector(".report-conclusion-section").scrollIntoView()' | Out-Null
        $screen = Send-FleetCdp 'Page.captureScreenshot' @{format='png'}
        [IO.File]::WriteAllBytes((Join-Path $fleetAuditDir ('report-' + $width + '.png')),[Convert]::FromBase64String($screen.data))
    }
    Send-FleetCdp 'Emulation.setDeviceMetricsOverride' @{width=794;height=1123;deviceScaleFactor=1;mobile=$false} | Out-Null
    Send-FleetCdp 'Emulation.setEmulatedMedia' @{media='print'} | Out-Null
    $printChecks = Invoke-FleetJs '(()=>{const t=document.querySelector("#reportResultsTable").closest("table");return {withinPage:t.getBoundingClientRect().right<=document.querySelector(".main").getBoundingClientRect().right+1,removed:!document.body.textContent.includes("Detail Analisis Teknik"),analysis:document.querySelectorAll("#reportAnalysis p").length};})()'
    if (-not $printChecks.withinPage -or -not $printChecks.removed -or $printChecks.analysis -lt 2) { throw 'Print layout check failed.' }
    $pdf = Send-FleetCdp 'Page.printToPDF' @{printBackground=$true;preferCSSPageSize=$true}
    [IO.File]::WriteAllBytes((Join-Path $fleetAuditDir 'report.pdf'),[Convert]::FromBase64String($pdf.data))
    Send-FleetCdp 'Emulation.setEmulatedMedia' @{media='screen'} | Out-Null
    Send-FleetCdp 'Page.navigate' @{url=([uri](Join-Path $fleetAuditDir 'report.pdf')).AbsoluteUri} | Out-Null
    Start-Sleep -Milliseconds 1500
    $pdfScreen = Send-FleetCdp 'Page.captureScreenshot' @{format='png'}
    [IO.File]::WriteAllBytes((Join-Path $fleetAuditDir 'report-pdf-preview.png'),[Convert]::FromBase64String($pdfScreen.data))
    Send-FleetCdp 'Page.navigate' @{url=([uri](Join-Path $fleetAuditDir 'report.pdf')).AbsoluteUri + '#page=3&zoom=70'} | Out-Null
    Start-Sleep -Milliseconds 1000
    Send-FleetCdp 'Input.dispatchMouseEvent' @{type='mousePressed';x=145;y=550;button='left';clickCount=1} | Out-Null
    Send-FleetCdp 'Input.dispatchMouseEvent' @{type='mouseReleased';x=145;y=550;button='left';clickCount=1} | Out-Null
    Start-Sleep -Milliseconds 300
    $pdfEnd = Send-FleetCdp 'Page.captureScreenshot' @{format='png'}
    [IO.File]::WriteAllBytes((Join-Path $fleetAuditDir 'report-pdf-analysis.png'),[Convert]::FromBase64String($pdfEnd.data))
    $result | Add-Member browserExceptions @($script:fleetBrowserExceptions)
    $result | Add-Member viewportChecks @(1366,390,360)
    $result | Add-Member printChecks $printChecks
    $json = $result | ConvertTo-Json -Depth 20
    [IO.File]::WriteAllText((Join-Path $fleetAuditDir 'report-result.json'),$json)
    Write-Output $json
    if ($script:fleetBrowserExceptions.Count) { throw 'Unexpected browser exceptions.' }
} finally {
    if ($fleetSocket) { $fleetSocket.Dispose() }
    if ($fleetProcess -and -not $fleetProcess.HasExited) { Stop-Process -Id $fleetProcess.Id -ErrorAction SilentlyContinue }
    Write-Output ('Audit artifacts: ' + $fleetAuditDir)
}
