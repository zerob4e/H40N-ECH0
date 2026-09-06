param(
  [int]$Port = 8765
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# If another MIRROR server is already listening, leave it alone.
try {
  $test = New-Object System.Net.Sockets.TcpClient
  $iar = $test.BeginConnect('127.0.0.1', $Port, $null, $null)
  if ($iar.AsyncWaitHandle.WaitOne(250) -and $test.Connected) {
    $test.Close()
    exit 0
  }
  $test.Close()
} catch {}

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.svg'  = 'image/svg+xml'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.webp' = 'image/webp'
  '.ico'  = 'image/x-icon'
  '.txt'  = 'text/plain; charset=utf-8'
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
$listener.Start()
Write-Host "MIRROR-07 relay online at http://localhost:$Port/"
Write-Host "Close this window to stop the local server."

function Send-Response($stream, [int]$status, [string]$statusText, [byte[]]$body, [string]$contentType) {
  $header = "HTTP/1.1 $status $statusText`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n"
  $headBytes = [Text.Encoding]::ASCII.GetBytes($header)
  $stream.Write($headBytes, 0, $headBytes.Length)
  if ($body.Length -gt 0) { $stream.Write($body, 0, $body.Length) }
}

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $reader = New-Object IO.StreamReader($stream, [Text.Encoding]::ASCII, $false, 4096, $true)
      $requestLine = $reader.ReadLine()
      if (-not $requestLine) { $client.Close(); continue }

      # Consume headers.
      while (($line = $reader.ReadLine()) -ne $null -and $line -ne '') {}

      $parts = $requestLine.Split(' ')
      if ($parts.Count -lt 2 -or $parts[0] -notin @('GET','HEAD')) {
        $body = [Text.Encoding]::UTF8.GetBytes('Method Not Allowed')
        Send-Response $stream 405 'Method Not Allowed' $body 'text/plain; charset=utf-8'
        $client.Close(); continue
      }

      $rawPath = $parts[1].Split('?')[0]
      $decoded = [Uri]::UnescapeDataString($rawPath)
      if ($decoded -eq '/') { $decoded = '/index.html' }
      $relative = $decoded.TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar)
      $candidate = [IO.Path]::GetFullPath((Join-Path $root $relative))
      $rootFull = [IO.Path]::GetFullPath($root + [IO.Path]::DirectorySeparatorChar)

      if (-not $candidate.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
        $body = [Text.Encoding]::UTF8.GetBytes('404 // FILE NOT FOUND')
        Send-Response $stream 404 'Not Found' $body 'text/plain; charset=utf-8'
        $client.Close(); continue
      }

      $ext = [IO.Path]::GetExtension($candidate).ToLowerInvariant()
      $contentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
      $body = if ($parts[0] -eq 'HEAD') { [byte[]]@() } else { [IO.File]::ReadAllBytes($candidate) }
      Send-Response $stream 200 'OK' $body $contentType
    } catch {
      try {
        $body = [Text.Encoding]::UTF8.GetBytes('500 // LOCAL RELAY ERROR')
        Send-Response $stream 500 'Internal Server Error' $body 'text/plain; charset=utf-8'
      } catch {}
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
