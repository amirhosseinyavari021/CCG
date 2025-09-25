#!/bin/bash
# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
GITHUB_REPO="amirhosseinyavari021/ay-cmdgen"
INSTALL_DIR="/usr/local/bin"
CMD_NAME="cmdgen"

# Define primary and fallback URLs
PRIMARY_REPO_URL="https://github.com"
FALLBACK_REPO_URL="https://github.com"  # Add a mirror if available, e.g., a CDN

# --- Helper Functions ---
echo_color() {
  local color_code="$1"
  shift
  printf '\033[%sm%s\033[0m\n' "$color_code" "$@"
}

# --- Main Logic ---
echo_color "36" "Installing/Updating AY-CMDGEN..."

# --- [Improved] Stop running processes ---
echo_color "33" "Checking for running instances of cmdgen..."
if command -v pgrep >/dev/null 2>&1 && pgrep -x "$CMD_NAME" > /dev/null; then
    echo_color "33" "Stopping running cmdgen process to allow update..."
    if command -v killall >/dev/null 2>&1; then
        killall "$CMD_NAME" || true
    else
        pkill -x "$CMD_NAME" || true
    fi
    sleep 2  # Wait longer for handles to release
else
    # Fallback for systems without pgrep (rare, but e.g., minimal Alpine)
    if ps aux | grep -q " $CMD_NAME$"; then
        pkill -f "$CMD_NAME" || true
        sleep 2
    fi
fi

# 1. Determine OS and Architecture
OS="$(uname -s)"
ARCH="$(uname -m)"
TARGET=""
case "$OS" in
  Linux)
    case "$ARCH" in
      x86_64 | amd64) TARGET="cmdgen-linux" ;;
      aarch64 | arm64) TARGET="cmdgen-linux-arm" ;;
      *) echo_color "31" "Error: Architecture $ARCH for Linux is not supported."; exit 1 ;;
    esac
    ;;
  Darwin)  # macOS
    case "$ARCH" in
      x86_64) TARGET="cmdgen-macos" ;;
      arm64) TARGET="cmdgen-macos-arm" ;;
      *) echo_color "31" "Error: Architecture $ARCH for macOS is not supported."; exit 1 ;;
    esac
    ;;
  *)
    echo_color "31" "Error: Operating System $OS is not supported. Please install manually from the Releases page."
    exit 1
    ;;
esac

# 2. Attempt to download from primary and fallback URLs
PRIMARY_RELEASE_URL="$PRIMARY_REPO_URL/$GITHUB_REPO/releases/latest/download/$TARGET"
FALLBACK_RELEASE_URL="$FALLBACK_REPO_URL/$GITHUB_REPO/releases/latest/download/$TARGET"
DOWNLOAD_PATH="/tmp/$TARGET"

echo "Attempting to download from primary source: $PRIMARY_RELEASE_URL"
if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$PRIMARY_RELEASE_URL" -o "$DOWNLOAD_PATH"
elif command -v wget >/dev/null 2>&1; then
  wget -q "$PRIMARY_RELEASE_URL" -O "$DOWNLOAD_PATH"
else
  echo_color "31" "Error: Neither curl nor wget is available. Please install one."
  exit 1
fi

# Check if the first download failed
if [ ! -s "$DOWNLOAD_PATH" ]; then
    echo_color "33" "Primary download failed. Trying fallback source..."
    echo "Attempting to download from fallback source: $FALLBACK_RELEASE_URL"
    if command -v curl >/dev/null 2>&1; then
      curl -fsSL "$FALLBACK_RELEASE_URL" -o "$DOWNLOAD_PATH"
    else
      wget -q "$FALLBACK_RELEASE_URL" -O "$DOWNLOAD_PATH"
    fi
fi

# Final check if download was successful
if [ ! -s "$DOWNLOAD_PATH" ]; then
    echo_color "31" "Error: Download failed from all available sources. Please check your internet connection or the GitHub releases page."
    rm -f "$DOWNLOAD_PATH"
    exit 1
fi

# Optional: Checksum verification (add SHA256 file to Releases and uncomment)
# EXPECTED_HASH="your_sha256_here"
# if command -v sha256sum >/dev/null 2>&1; then
#   ACTUAL_HASH=$(sha256sum "$DOWNLOAD_PATH" | cut -d' ' -f1)
#   if [ "$ACTUAL_HASH" != "$EXPECTED_HASH" ]; then
#     echo_color "31" "Error: Checksum mismatch! Download may be corrupted."
#     rm -f "$DOWNLOAD_PATH"
#     exit 1
#   fi
# fi

# 3. Install the binary
echo "Installing to: $INSTALL_DIR/$CMD_NAME"
chmod +x "$DOWNLOAD_PATH"

# Check if sudo is needed
if [ "$(id -u)" -ne 0 ] && [ ! -w "$INSTALL_DIR" ]; then
  echo "Sudo privileges are required to move the file to $INSTALL_DIR."
  sudo mv "$DOWNLOAD_PATH" "$INSTALL_DIR/$CMD_NAME"
else
  mv "$DOWNLOAD_PATH" "$INSTALL_DIR/$CMD_NAME"
fi

# Optional: Update PATH for user (if not in system PATH)
if ! grep -q "$INSTALL_DIR" <<< "$PATH"; then
  echo 'export PATH="$PATH:'"$INSTALL_DIR"'"' >> ~/.bashrc  # Or ~/.zshrc if zsh
  echo "Added $INSTALL_DIR to your ~/.bashrc. Restart your shell for changes to take effect."
fi

# 4. Success message
echo_color "32" "✅ AY-CMDGEN was installed successfully!"
echo "You can now use the 'cmdgen' command in a new terminal window."
echo "To get started, try running: cmdgen --help"
rm -f "$DOWNLOAD_PATH"  # Cleanup