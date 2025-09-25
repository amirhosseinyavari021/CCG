#Requires -Version 5.1
$ErrorActionPreference = "Stop"

# --- Configuration ---
$GITHUB_REPO = "amirhosseinyavari021/AY-CMDGEN"
$INSTALL_DIR = "$env:ProgramFiles\AY-CMDGEN"
$CMD_NAME = "cmdgen.exe"
$TARGET = "cmdgen-windows.exe"
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

# --- Node Version Check ---
try {
    $node_version = (node -v) -replace "v",""
    if ([version]$node_version -lt [version]"20.0.0" -or [version]$node_version -gt [version]"22.99.0") {
        Write-Color "Red" "Error: Node.js version $node_version is not supported. Please install Node 20-22."
        exit 1
    }
} catch {
    Write-Color "Red" "Node.js is not installed or not in PATH."
    exit 1
}

Write-Color "Cyan" "Installing/Updating AY-CMDGEN v2.5.6 for Windows..."

# --- Stop running processes ---
Write-Color "Yellow" "Checking for running instances of cmdgen..."
$processes = Get-Process -Name "cmdgen" -ErrorAction SilentlyContinue
if ($processes) {
    Write-Color "Yellow" "Stopping running cmdgen processes..."
    $processes | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# --- Download ---
$DOWNLOAD_PATH = "$env:TEMP\$TARGET"
$PRIMARY_RELEASE_URL = "$PRIMARY_REPO_URL/$GITHUB_REPO/releases/download/v2.5.6/$TARGET"
$FALLBACK_RELEASE_URL = "$FALLBACK_REPO_URL/$GITHUB_REPO/releases/download/v2.5.6/$TARGET"

Write-Host "Downloading from primary: $PRIMARY_RELEASE_URL"
try {
    Invoke-WebRequest -Uri $PRIMARY_RELEASE_URL -OutFile $DOWNLOAD_PATH -ErrorAction Stop
} catch {
    Write-Color "Yellow" "Primary download failed. Trying fallback..."
    try {
        Invoke-WebRequest -Uri $FALLBACK_RELEASE_URL -OutFile $DOWNLOAD_PATH -ErrorAction Stop
    } catch {
        Write-Color "Red" "Download failed from all sources. Check internet or GitHub releases."
        exit 1
    }
}

# --- Install ---
Write-Host "Installing to: $INSTALL_DIR\$CMD_NAME"
if (-not (Test-Path $INSTALL_DIR)) { New-Item -ItemType Directory -Path $INSTALL_DIR -Force | Out-Null }

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Color "Yellow" "Admin privileges required. Restarting as admin..."
    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command `"cd '$pwd'; & '$PSCommandPath'`"" -Verb RunAs
    exit
}

Move-Item -Path $DOWNLOAD_PATH -Destination "$INSTALL_DIR\$CMD_NAME" -Force

# --- Update PATH ---
$envPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
if ($envPath -notlike "*$INSTALL_DIR*") {
    [Environment]::SetEnvironmentVariable("Path", "$envPath;$INSTALL_DIR", "Machine")
    Write-Color "Cyan" "Added $INSTALL_DIR to system PATH. Open a new terminal to use cmdgen."
}

# --- Success ---
Write-Color "Green" "✅ AY-CMDGEN v2.5.6 installed/updated successfully!"
Write-Host "Try: cmdgen --help in a new terminal."
