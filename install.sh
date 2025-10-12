#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
GITHUB_REPO="amirhosseinyavari021/CCG"
INSTALL_DIR="/usr/local/bin"
CMD_NAME="ccg" # <--- Changed

# --- Helper Functions ---
echo_color() {
  printf '\033[%sm%s\033[0m\n' "$1" "$2"
}

# --- Main Logic ---
echo_color "36" "Installing/Updating CCG (Cando Command Generator)..."

# --- Stop running instances if any ---
echo_color "33" "Checking for running instances of ccg..."
if pgrep -x "ccg" > /dev/null; then
    echo_color "33" "Stopping running ccg process to allow update..."
    if command -v killall >/dev/null 2>&1; then
        killall ccg || true
    else
        pkill -f ccg || true
    fi
    sleep 1
fi

# 1. Determine OS and Architecture
OS="$(uname -s)"
ARCH="$(uname -m)"
TARGET=""

case "$OS" in
  Linux)
    case "$ARCH" in
      x86_64) TARGET="ccg-linux" ;; # <--- Changed
      *) echo_color "31" "Error: Architecture $ARCH for Linux is not supported."; exit 1 ;;
    esac
    ;;
  Darwin)
    case "$ARCH" in
      x86_64 | arm64) TARGET="ccg-macos" ;; # <--- Changed
      *) echo_color "31" "Error: Architecture $ARCH for macOS is not supported."; exit 1 ;;
    esac
    ;;
  *)
    echo_color "31" "Error: Operating System $OS is not supported. Please install manually from the Releases page."
    exit 1
    ;;
esac

# 2. Fetch latest release tag from GitHub API
echo_color "36" "Fetching latest release info from GitHub API..."
LATEST_TAG=$(curl -s https://api.github.com/repos/$GITHUB_REPO/releases/latest | grep '"tag_name":' | cut -d '"' -f 4)

if [ -z "$LATEST_TAG" ]; then
    echo_color "33" "⚠ Failed to fetch release tag from API. Falling back to /latest/ endpoint."
    PRIMARY_RELEASE_URL="https://github.com/$GITHUB_REPO/releases/latest/download/$TARGET"
else
    PRIMARY_RELEASE_URL="https://github.com/$GITHUB_REPO/releases/download/$LATEST_TAG/$TARGET"
fi

FALLBACK_RELEASE_URL="https://github.com/$GITHUB_REPO/releases/latest/download/$TARGET"
DOWNLOAD_PATH="/tmp/$TARGET"

# 3. Attempt download
echo "Attempting to download from: $PRIMARY_RELEASE_URL"
if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$PRIMARY_RELEASE_URL" -o "$DOWNLOAD_PATH" || true
else
  wget -q "$PRIMARY_RELEASE_URL" -O "$DOWNLOAD_PATH" || true
fi

if [ ! -s "$DOWNLOAD_PATH" ]; then
    echo_color "33" "Primary download failed. Trying fallback source..."
    echo "Attempting to download from: $FALLBACK_RELEASE_URL"
    if command -v curl >/dev/null 2>&1; then
      curl -fsSL "$FALLBACK_RELEASE_URL" -o "$DOWNLOAD_PATH" || true
    else
      wget -q "$FALLBACK_RELEASE_URL" -O "$DOWNLOAD_PATH" || true
    fi
fi

if [ ! -s "$DOWNLOAD_PATH" ]; then
    echo_color "31" "❌ Error: Download failed from all available sources. Please check your internet connection or the GitHub releases page."
    exit 1
fi

# 4. Install the binary
echo "Installing to: $INSTALL_DIR/$CMD_NAME"
chmod +x "$DOWNLOAD_PATH"
if [ "$(id -u)" -ne 0 ]; then
  echo "Sudo privileges are required to move the file to $INSTALL_DIR."
  sudo mv "$DOWNLOAD_PATH" "$INSTALL_DIR/$CMD_NAME"
else
  mv "$DOWNLOAD_PATH" "$INSTALL_DIR/$CMD_NAME"
fi

# 5. Success message
if [ -n "$LATEST_TAG" ]; then
  echo_color "32" "✅ CCG $LATEST_TAG was installed successfully!"
else
  echo_color "32" "✅ CCG was installed successfully!"
fi

echo "You can now use the 'ccg' command in a new terminal window."
echo "To get started, try running: ccg --help"