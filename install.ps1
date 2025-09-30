# --- Configuration ---
$GithubRepo = "amirhosseinyavari021/ay-cmdgen"
$InstallDir = "$env:ProgramFiles\AY-CMDGEN"
$ExeName = "cmdgen.exe"
$ReleaseAsset = "cmdgen-win.exe"

# --- Resolve Latest Release via GitHub API ---
try {
    Write-Host "Fetching latest release info from GitHub API..." -ForegroundColor Cyan
    $LatestRelease = Invoke-RestMethod -Uri "https://api.github.com/repos/$GithubRepo/releases/latest" -Headers @{ "User-Agent" = "AY-CMDGEN-Installer" }
    $TagName = $LatestRelease.tag_name
    $PrimaryReleaseUrl = "https://github.com/$GithubRepo/releases/download/$TagName/$ReleaseAsset"
    $FallbackReleaseUrl = $PrimaryReleaseUrl
} catch {
    Write-Host "⚠ Failed to fetch latest release info from API. Falling back to /latest/ endpoint." -ForegroundColor Yellow
    $PrimaryReleaseUrl = "https://github.com/$GithubRepo/releases/latest/download/$ReleaseAsset"
    $FallbackReleaseUrl = $PrimaryReleaseUrl
}

$DownloadPath = "$env:TEMP\$ReleaseAsset"

# --- Main Logic ---
Write-Host "Installing/Updating AY-CMDGEN for Windows..." -ForegroundColor Cyan

# --- Stop running instances if any ---
Write-Host "Checking for running instances of cmdgen..."
$RunningProcesses = Get-Process -Name "cmdgen" -ErrorAction SilentlyContinue
if ($RunningProcesses) {
    Write-Host "Stopping running cmdgen process to allow update..." -ForegroundColor Yellow
    Stop-Process -Name "cmdgen" -Force
    Start-Sleep -Seconds 2
}

# --- Download latest release ---
try {
    Write-Host "Attempting to download from: $PrimaryReleaseUrl"
    Invoke-WebRequest -Uri $PrimaryReleaseUrl -OutFile $DownloadPath -UseBasicParsing -ErrorAction Stop
} catch {
    Write-Host "Primary download failed. Trying fallback source..." -ForegroundColor Yellow
    try {
        Invoke-WebRequest -Uri $FallbackReleaseUrl -OutFile $DownloadPath -UseBasicParsing -ErrorAction Stop
    } catch {
        Write-Host "❌ Error: Download failed from all sources. Please check your internet connection or GitHub releases page." -ForegroundColor Red
        exit 1
    }
}

# --- Create installation directory ---
if (-not (Test-Path $InstallDir)) {
    New-Item -Path $InstallDir -ItemType Directory | Out-Null
}

# --- Move executable ---
Move-Item -Path $DownloadPath -Destination "$InstallDir\$ExeName" -Force

# --- Update PATH ---
Write-Host "Adding '$InstallDir' to your PATH..."
try {
    $CurrentUserPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    if ($CurrentUserPath -notlike "*$InstallDir*") {
        $NewPath = "$CurrentUserPath;$InstallDir"
        [System.Environment]::SetEnvironmentVariable("Path", $NewPath, "User")
        Write-Host "Please open a new PowerShell window for the changes to take effect." -ForegroundColor Yellow
    } else {
        Write-Host "Installation directory is already in your PATH."
    }
} catch {
    Write-Host "Error: Failed to add to PATH. Please add '$InstallDir' to your System Environment Variables manually." -ForegroundColor Red
    exit 1
}

Write-Host "✅ AY-CMDGEN v$TagName was installed successfully!" -ForegroundColor Green
Write-Host "Open a new terminal and try running: cmdgen --help"
