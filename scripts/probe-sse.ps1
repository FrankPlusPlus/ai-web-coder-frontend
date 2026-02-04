$u = 'http://localhost:8123/api/app/chat/gen/code?appId=1&message=test'
try {
  $r = Invoke-WebRequest -Uri $u -Headers @{ 'Accept' = 'text/event-stream' } -UseBasicParsing -TimeoutSec 10
  Write-Host "StatusCode:" $r.StatusCode
  Write-Host "Content-Type:" $r.Headers['Content-Type']
  if ($r.Content) {
    $previewLen = [Math]::Min(200, $r.Content.Length)
    Write-Host "BodyPreview:" $r.Content.Substring(0, $previewLen)
  }
}
catch {
  if ($_.Exception.Response) {
    Write-Host "HTTP Error:" ($_.Exception.Response.StatusCode.value__)
  }
  Write-Host "Exception:" $_.Exception.Message
}
