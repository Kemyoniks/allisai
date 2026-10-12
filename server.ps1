param([switch]$NoBrowser)

# Math Rhythm Game - Robust Local Web Server (PowerShell HttpListener)
$port = 8080
$prefix = "http://localhost:$port/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
    Write-Host "====================================================" -ForegroundColor Cyan
    Write-Host " Math Rhythm Web Game Server is running!" -ForegroundColor Green
    Write-Host " Open browser at: $prefix" -ForegroundColor Yellow
    Write-Host " Press Ctrl+C to stop server" -ForegroundColor Gray
    Write-Host "====================================================" -ForegroundColor Cyan

    # Launch default browser if not suppressed
    if (-not $NoBrowser) {
        Start-Process $prefix
    }

    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response

            $localPath = $request.Url.LocalPath
            if ($localPath -eq "/" -or [string]::IsNullOrWhiteSpace($localPath)) {
                $localPath = "/index.html"
            }

            # Safe file path resolution
            $cleanRelPath = $localPath.TrimStart("/\").Replace("/", "\")
            $filePath = Join-Path (Get-Location) $cleanRelPath

            if (Test-Path $filePath -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                $contentType = switch ($ext) {
                    ".html" { "text/html; charset=utf-8" }
                    ".css"  { "text/css; charset=utf-8" }
                    ".js"   { "application/javascript; charset=utf-8" }
                    ".json" { "application/json; charset=utf-8" }
                    ".svg"  { "image/svg+xml" }
                    ".png"  { "image/png" }
                    ".jpg"  { "image/jpeg" }
                    ".mp3"  { "audio/mpeg" }
                    ".wav"  { "audio/wav" }
                    default { "application/octet-stream" }
                }

                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $response.ContentType = $contentType
                $response.ContentLength64 = $bytes.Length
                $response.StatusCode = 200
                if ($request.HttpMethod -ne "HEAD") {
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                }
            } else {
                $response.StatusCode = 404
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
                $response.ContentType = "text/plain"
                $response.ContentLength64 = $errBytes.Length
                if ($request.HttpMethod -ne "HEAD") {
                    $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                }
            }

            $response.OutputStream.Close()
        } catch {
            Write-Host "Request error: $_" -ForegroundColor DarkYellow
            try { $response.OutputStream.Close() } catch {}
        }
    }
} catch {
    Write-Host "Server stopped: $_" -ForegroundColor Red
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
    $listener.Close()
}
