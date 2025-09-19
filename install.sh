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
echo_color "36" "Installing AY-CMDGEN..."

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
  Darwin) # macOS
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

# 2. Get the latest release URL
LATEST_RELEASE_URL="https://github.com/$GITHUB_REPO/releases/latest/download/$TARGET"
DOWNLOAD_PATH="/tmp/$TARGET"

echo "Downloading the latest version from: $LATEST_RELEASE_URL"
if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$LATEST_RELEASE_URL" -o "$DOWNLOAD_PATH"
else
  wget -q "$LATEST_RELEASE_URL" -O "$DOWNLOAD_PATH"
fi

# 3. Install the binary
echo "Installing to: $INSTALL_DIR/$CMD_NAME"
chmod +x "$DOWNLOAD_PATH"
if [ "$(id -u)" -ne 0 ]; then
  echo "Sudo privileges are required to move the file to $INSTALL_DIR."
  sudo mv "$DOWNLOAD_PATH" "$INSTALL_DIR/$CMD_NAME"
else
  mv "$DOWNLOAD_PATH" "$INSTALL_DIR/$CMD_NAME"
fi

# 4. Success message
echo_color "32" "✅ AY-CMDGEN was installed successfully!"
echo "You can now use the 'cmdgen' command in a new terminal window."
echo "To get started, try running: cmdgen --help"
