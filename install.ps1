# --- Configuration ---
$GithubRepo = "amirhosseinyavari021/ay-cmdgen"
$InstallDir = "$env:ProgramFiles\cmdgen"
$ExeName = "cmdgen.exe"
$ReleaseAsset = "cmdgen-win.exe"

# --- Main Logic ---
Write-Host "Installing CMDGEN for Windows..." -ForegroundColor Cyan

# 1. Get the latest release URL
$LatestReleaseUrl = "https://github.com/$GithubRepo/releases/latest/download/$ReleaseAsset"
$DownloadPath = "$env:TEMP\$ReleaseAsset"

Write-Host "Downloading the latest version from: $LatestReleaseUrl"
try {
    Invoke-WebRequest -Uri $LatestReleaseUrl -OutFile $DownloadPath
} catch {
    Write-Host "Error: Download failed. Please check your internet connection or the release page on GitHub." -ForegroundColor Red
    exit 1
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

Write-Host "✅ CMDGEN was installed successfully!" -ForegroundColor Green
Write-Host "Open a new terminal and try running: cmdgen --help"
