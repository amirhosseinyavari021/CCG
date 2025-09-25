#!/bin/bash
# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
GITHUB_REPO="amirhosseinyavari021/AY-CMDGEN"
INSTALL_DIR="/usr/local/bin"
CMD_NAME="cmdgen"

# Define primary and fallback URLs
PRIMARY_REPO_URL="https://github.com"
FALLBACK_REPO_URL="https://github.com"

# --- Helper Functions ---
echo_color() {
  local color_code="$1"
  shift
  printf '\033[%sm%s\033[0m\n' "$color_code" "$@"
}

# --- Node Version Check ---
if command -v node >/dev/null 2>&1; then
    NODE_VER=$(node -v | sed 's/v//')
    if [[ "$(printf '%s\n' "20.0.0" "$NODE_VER" | sort -V | head -n1)" != "20.0.0" || \
          "$(printf '%s\n' "$NODE_VER" "22.99.0" | sort -V | head -n1)" != "$NODE_VER" ]]; then
        echo_color "31" "Error: Node.js version $NODE_VER is not supported. Please install Node 20-22."
        exit 1
    fi
else
    echo_color "31" "Error: Node.js is not installed or not in PATH."
    exit 1
fi

echo_color "36" "Installing/Updating AY-CMDGEN v2.5.6..."

# --- Stop running processes ---
if pgrep -x "$CMD_NAME" >/dev/null 2>&1; then
    echo_color "33" "Stopping running cmdgen process..."
    pkill -x "$CMD_NAME" || true
    sleep 2
fi

# --- Determine OS/ARCH ---
OS="$(uname -s)"
ARCH="$(uname -m)"
TARGET=""

case "$OS" in
  Linux)
    case "$ARCH" in
      x86_64|amd64) TARGET="cmdgen-linux" ;;
      aarch64|arm64) TARGET="cmdgen-linux-arm" ;;
      *) echo_color "31" "Error: Architecture $ARCH not supported"; exit 1 ;;
    esac
    ;;
  Darwin)
    case "$ARCH" in
      x86_64) TARGET="cmdgen-macos" ;;
      arm64) TARGET="cmdgen-macos-arm" ;;
      *) echo_color "31" "Error: Architecture $ARCH not supported"; exit 1 ;;
    esac
    ;;
  *)
    echo_color "31" "Error: OS $OS not supported. Please install manually."
    exit 1
    ;;
esac

# --- Download ---
DOWNLOAD_PATH="/tmp/$TARGET"
PRIMARY_RELEASE_URL="$PRIMARY_REPO_URL/$GITHUB_REPO/releases/download/v2.5.6/$TARGET"
FALLBACK_RELEASE_URL="$FALLBACK_REPO_URL/$GITHUB_REPO/releases/download/v2.5.6/$TARGET"

echo "Downloading from primary: $PRIMARY_RELEASE_URL"
if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$PRIMARY_RELEASE_URL" -o "$DOWNLOAD_PATH"
elif command -v wget >/dev/null 2>&1; then
    wget -q "$PRIMARY_RELEASE_URL" -O "$DOWNLOAD_PATH"
else
    echo_color "31" "Error: curl or wget not installed."
    exit 1
fi

# Fallback check
if [ ! -s "$DOWNLOAD_PATH" ]; then
    echo_color "33" "Primary download failed. Trying fallback..."
    if command -v curl >/dev/null 2>&1; then
        curl -fsSL "$FALLBACK_RELEASE_URL" -o "$DOWNLOAD_PATH"
    else
        wget -q "$FALLBACK_RELEASE_URL" -O "$DOWNLOAD_PATH"
    fi
fi

# Final check
if [ ! -s "$DOWNLOAD_PATH" ]; then
    echo_color "31" "Error: Download failed from all sources."
    exit 1
fi

# --- Install ---
chmod +x "$DOWNLOAD_PATH"
if [ "$(id -u)" -ne 0 ] && [ ! -w "$INSTALL_DIR" ]; then
    echo_color "33" "Sudo required to move cmdgen to $INSTALL_DIR"
    sudo mv "$DOWNLOAD_PATH" "$INSTALL_DIR/$CMD_NAME"
else
    mv "$DOWNLOAD_PATH" "$INSTALL_DIR/$CMD_NAME"
fi

# --- Update PATH for user ---
if ! grep -q "$INSTALL_DIR" <<< "$PATH"; then
    echo 'export PATH="$PATH:'"$INSTALL_DIR"'"' >> ~/.bashrc
    echo_color "36" "Added $INSTALL_DIR to ~/.bashrc. Restart your shell to use cmdgen."
fi

# --- Success ---
echo_color "32" "✅ AY-CMDGEN v2.5.6 installed/updated successfully!"
echo "Try: cmdgen --help in a new terminal window"
