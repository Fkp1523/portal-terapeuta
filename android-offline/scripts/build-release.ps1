$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$secretPath = Join-Path $projectRoot 'tools\signing\signing-password.dpapi'
$keystorePath = Join-Path $projectRoot 'tools\signing\portal-terapeuta-release.jks'
if (!(Test-Path -LiteralPath $secretPath) -or !(Test-Path -LiteralPath $keystorePath)) {
    throw 'A chave protegida de assinatura não foi encontrada.'
}
$secure = Get-Content -LiteralPath $secretPath | ConvertTo-SecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
    $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    $env:PORTAL_SIGNING_STORE_FILE = $keystorePath
    $env:PORTAL_SIGNING_STORE_PASSWORD = $password
    $env:PORTAL_SIGNING_KEY_PASSWORD = $password
    $env:JAVA_HOME = (Resolve-Path (Join-Path $projectRoot 'tools\jdk\jdk-21.0.13+9')).Path
    $env:ANDROID_HOME = (Resolve-Path (Join-Path $projectRoot 'tools\android-sdk')).Path
    $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
    $env:ANDROID_USER_HOME = (Resolve-Path (Join-Path $projectRoot 'tools\android-user')).Path
    $env:GRADLE_USER_HOME = Join-Path $projectRoot 'tools\gradle-home'
    Push-Location (Join-Path $projectRoot 'android')
    try { & .\gradlew.bat assembleRelease --no-daemon; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
    finally { Pop-Location }
} finally {
    if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
    Remove-Item Env:PORTAL_SIGNING_STORE_PASSWORD, Env:PORTAL_SIGNING_KEY_PASSWORD -ErrorAction SilentlyContinue
    $password = $null
}
