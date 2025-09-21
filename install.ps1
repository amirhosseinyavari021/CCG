# --- Configuration ---
$GithubRepo = "amirhosseinyavari021/ay-cmdgen"
$InstallDir = "$env:ProgramFiles\AY-CMDGEN"
$ExeName = "cmdgen.exe"
$ReleaseAsset = "cmdgen-win.exe"

# Define primary and fallback URLs
$PrimaryReleaseUrl = "https://github.com/$GithubRepo/releases/latest/download/$ReleaseAsset"
$FallbackReleaseUrl = "https://github.com/$GithubRepo/releases/latest/download/$ReleaseAsset" # Example: could be a different mirror
$DownloadPath = "$env:TEMP\$ReleaseAsset"

# --- Main Logic ---
Write-Host "Installing AY-CMDGEN for Windows..." -ForegroundColor Cyan

# 1. Attempt to download the latest release with fallback logic
try {
    Write-Host "Attempting to download from primary source: $PrimaryReleaseUrl"
    Invoke-WebRequest -Uri $PrimaryReleaseUrl -OutFile $DownloadPath -UseBasicParsing -ErrorAction Stop
} catch {
    Write-Host "Primary download failed. Trying fallback source..." -ForegroundColor Yellow
    try {
        Write-Host "Attempting to download from fallback source: $FallbackReleaseUrl"
        Invoke-WebRequest -Uri $FallbackReleaseUrl -OutFile $DownloadPath -UseBasicParsing -ErrorAction Stop
    } catch {
        Write-Host "Error: Download failed from all available sources. Please check your internet connection or the GitHub releases page." -ForegroundColor Red
        exit 1
    }
}

# 2. Create installation directory
if (-not (Test-Path $InstallDir)) {
    New-Item -Path $InstallDir -ItemType Directory | Out-Null
}

# 3. Move the executable and rename it
Move-Item -Path $DownloadPath -Destination "$InstallDir\$ExeName" -Force

# 4. Add the installation directory to the user's PATH
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

Write-Host "✅ AY-CMDGEN was installed successfully!" -ForegroundColor Green
Write-Host "Open a new terminal and try running: cmdgen --help"
