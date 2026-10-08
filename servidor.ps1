# Servidor local para testar o site (não precisa instalar nada).
# Uso:  powershell -ExecutionPolicy Bypass -File servidor.ps1   → abra http://localhost:8080
param([int]$Porta = 8080)

$raiz = $PSScriptRoot
$tipos = @{
  '.html' = 'text/html; charset=utf-8'; '.css' = 'text/css; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'
  '.json' = 'application/json'; '.png' = 'image/png'; '.webp' = 'image/webp'; '.jpg' = 'image/jpeg'; '.svg' = 'image/svg+xml'
  '.glb' = 'model/gltf-binary'; '.gltf' = 'model/gltf+json'; '.hdr' = 'application/octet-stream'; '.ico' = 'image/x-icon'
}
$http = New-Object System.Net.HttpListener
$http.Prefixes.Add("http://localhost:$Porta/")
$http.Start()
Write-Host "Site em http://localhost:$Porta  (Ctrl+C para parar)"
try {
  while ($http.IsListening) {
    $ctx = $http.GetContext()
    $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
    if (-not $rel) { $rel = 'index.html' }
    $arq = [IO.Path]::GetFullPath((Join-Path $raiz $rel))
    $res = $ctx.Response
    if ($arq.StartsWith($raiz) -and (Test-Path -LiteralPath $arq -PathType Leaf)) {
      $bytes = [IO.File]::ReadAllBytes($arq)
      $tipo = $tipos[[IO.Path]::GetExtension($arq).ToLower()]
      $res.ContentType = if ($tipo) { $tipo } else { 'application/octet-stream' }
      $res.Headers['Cache-Control'] = 'no-store'
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else { $res.StatusCode = 404 }
    $res.Close()
  }
} finally { $http.Stop() }
