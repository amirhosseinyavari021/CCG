#Requires -Version 5.1
$ErrorActionPreference = "Stop"

# --- Configuration ---
$GITHUB_REPO = "amirhosseinyavari021/ay-cmdgen"
$INSTALL_DIR = "$env:ProgramFiles\AY-CMDGEN"
$CMD_NAME = "cmdgen.exe"
$PRIMARY_REPO_URL = "https://github.com"
$FALLBACK_REPO_URL = "https://github.com"

# --- Helper Functions ---
function Write-Color {
    param (
        [string]$Color,
        [string]$Text
    )
    $colors = @{
        "Red" = "Red"
        "Green" = "Green"
        "Yellow" = "Yellow"
        "Cyan" = "Cyan"
    }
    Write-Host $Text -ForegroundColor $colors[$Color]
}

# --- Main Logic ---
Write-Color "Cyan" "Installing/Updating AY-CMDGEN for Windows..."

# --- Stop running processes ---
Write-Color "Yellow" "Checking for running instances of cmdgen..."
$processes = Get-Process -Name "cmdgen" -ErrorAction SilentlyContinue
if ($processes) {
    Write-Color "Yellow" "Stopping running cmdgen processes to allow update..."
    $processes | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# --- Determine Architecture ---
$ARCH = [System.Environment]::ProcessorArchitecture
$TARGET = switch ($ARCH) {
    "Amd64" { "cmdgen-windows.exe" }
    "Arm64" { "cmdgen-windows-arm.exe" }
    default { Write-Color "Red" "Error: Architecture $ARCH is not supported."; exit 1 }
}

# --- Download ---
$PRIMARY_RELEASE_URL = "$PRIMARY_REPO_URL/$GITHUB_REPO/releases/latest/download/$TARGET"
$FALLBACK_RELEASE_URL = "$FALLBACK_REPO_URL/$GITHUB_REPO/releases/latest/download/$TARGET"
$DOWNLOAD_PATH = "$env:TEMP\$TARGET"

Write-Host "Attempting to download from: $PRIMARY_RELEASE_URL"
try {
    Invoke-WebRequest -Uri $PRIMARY_RELEASE_URL -OutFile $DOWNLOAD_PATH
} catch {
    Write-Color "Yellow" "Primary download failed. Trying fallback..."
    Invoke-WebRequest -Uri $FALLBACK_RELEASE_URL -OutFile $DOWNLOAD_PATH
}

if (-not (Test-Path $DOWNLOAD_PATH) -or (Get-Item $DOWNLOAD_PATH).Length -eq 0) {
    Write-Color "Red" "Error: Download failed. Check your internet or GitHub releases."
    exit 1
}

# --- Install ---
Write-Host "Installing to: $INSTALL_DIR\$CMD_NAME"
if (-not (Test-Path $INSTALL_DIR)) {
    New-Item -ItemType Directory -Path $INSTALL_DIR -Force | Out-Null
}
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "Admin privileges required for $INSTALL_DIR."
    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command `"cd '$pwd'; & '$PSCommandPath'`"" -Verb RunAs
    exit
}
Move-Item -Path $DOWNLOAD_PATH -Destination "$INSTALL_DIR\$CMD_NAME" -Force

# --- Update PATH ---
$envPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
if ($envPath -notlike "*$INSTALL_DIR*") {
    [Environment]::SetEnvironmentVariable("Path", "$envPath;$INSTALL_DIR", "Machine")
    Write-Host "Added $INSTALL_DIR to system PATH."
}

# --- Success ---
Write-Color "Green" "✅ AY-CMDGEN installed/updated successfully!"
Write-Host "Open a new terminal and try running: cmdgen"