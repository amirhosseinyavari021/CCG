#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
GITHUB_REPO="amirhosseinyavari021/ay-cmdgen"
INSTALL_DIR="/usr/local/bin"
CMD_NAME="cmdgen"

# --- Helper Functions ---
echo_color() {
  printf '\033[%sm%s\033[0m\n' "$1" "$2"
}

# --- Main Logic ---
echo_color "36" "Installing/Updating AY-CMDGEN..."

# --- Stop running instances if any ---
echo_color "33" "Checking for running instances of cmdgen..."
if pgrep -x "cmdgen" > /dev/null; then
    echo_color "33" "Stopping running cmdgen process to allow update..."
    if command -v killall >/dev/null 2>&1; then
        killall cmdgen || true
    else
        pkill -f cmdgen || true
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
      x86_64) TARGET="cmdgen-linux" ;;
      *) echo_color "31" "Error: Architecture $ARCH for Linux is not supported."; exit 1 ;;
    esac
    ;;
  Darwin)
    case "$ARCH" in
      x86_64 | arm64) TARGET="cmdgen-macos" ;;
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
  echo_color "32" "✅ AY-CMDGEN $LATEST_TAG was installed successfully!"
else
  echo_color "32" "✅ AY-CMDGEN was installed successfully!"
fi

echo "You can now use the 'cmdgen' command in a new terminal window."
echo "To get started, try running: cmdgen --help"
