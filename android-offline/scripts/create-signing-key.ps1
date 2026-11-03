$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$signingDir = Join-Path $projectRoot 'tools\signing'
$keyPath = Join-Path $signingDir 'portal-terapeuta-release.jks'
$secretPath = Join-Path $signingDir 'signing-password.dpapi'
if ((Test-Path -LiteralPath $keyPath) -or (Test-Path -LiteralPath $secretPath)) {
    throw 'A chave já existe e não será sobrescrita.'
}
New-Item -ItemType Directory -Force -Path $signingDir | Out-Null
$secret = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLowerInvariant()
$env:PORTAL_KEYSTORE_PASSWORD = $secret
$env:PORTAL_KEY_PASSWORD = $secret
try {
    $keytool = Join-Path $projectRoot 'tools\jdk\jdk-21.0.13+9\bin\keytool.exe'
    & $keytool -genkeypair -noprompt -keystore $keyPath -storetype PKCS12 `
        -storepass:env PORTAL_KEYSTORE_PASSWORD -keypass:env PORTAL_KEY_PASSWORD `
        -alias portalterapeuta -keyalg RSA -keysize 4096 -validity 10000 `
        -dname 'CN=Portal da Terapeuta, O=Portal da Terapeuta, C=BR'
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    $secret | ConvertTo-SecureString -AsPlainText -Force | ConvertFrom-SecureString |
        Set-Content -LiteralPath $secretPath -Encoding utf8NoBOM
} finally {
    Remove-Item Env:PORTAL_KEYSTORE_PASSWORD, Env:PORTAL_KEY_PASSWORD -ErrorAction SilentlyContinue
    $secret = $null
}
