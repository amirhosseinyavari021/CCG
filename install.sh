#!/bin/bash
set -e

# --- Configuration ---
GITHUB_REPO="amirhosseinyavari021/AY-CMDGEN"
INSTALL_DIR="/usr/local/bin"
CMD_NAME="cmdgen"
TARGET=""

# --- OS & Arch Detection ---
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Linux)
    case "$ARCH" in
      x86_64 | amd64) TARGET="cmdgen-linux" ;;
      aarch64 | arm64) TARGET="cmdgen-linux-arm" ;;
      *) echo "Error: Architecture $ARCH not supported."; exit 1 ;;
    esac ;;
  Darwin)
    case "$ARCH" in
      x86_64) TARGET="cmdgen-macos" ;;
      arm64) TARGET="cmdgen-macos-arm" ;;
      *) echo "Error: Architecture $ARCH not supported."; exit 1 ;;
    esac ;;
  *)
    echo "Error: OS $OS not supported. Install manually from releases."
    exit 1 ;;
esac

# --- Node Version Check ---
if command -v node >/dev/null 2>&1; then
    NODE_VER=$(node -v | sed 's/v//')
    if [[ "$NODE_VER" < "20" ]] || [[ "$NODE_VER" > "22" ]]; then
        echo "Error: Node.js version $NODE_VER not supported. Install Node 20-22."
        exit 1
    fi
else
    echo "Node.js not found. Please install Node 20-22."
    exit 1
fi

echo "Installing/Updating AY-CMDGEN v2.5.6..."

# --- Stop running processes ---
if pgrep -x "$CMD_NAME" >/dev/null 2>&1; then
    echo "Stopping running cmdgen..."
    pkill -x "$CMD_NAME" || true
    sleep 2
fi

# --- Download ---
PRIMARY_URL="https://github.com/$GITHUB_REPO/releases/download/v2.5.6/$TARGET"
FALLBACK_URL="https://github.com/$GITHUB_REPO/releases/download/v2.5.6/$TARGET"
DOWNLOAD_PATH="/tmp/$TARGET"

if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$PRIMARY_URL" -o "$DOWNLOAD_PATH" || curl -fsSL "$FALLBACK_URL" -o "$DOWNLOAD_PATH"
elif command -v wget >/dev/null 2>&1; then
    wget -q "$PRIMARY_URL" -O "$DOWNLOAD_PATH" || wget -q "$FALLBACK_URL" -O "$DOWNLOAD_PATH"
else
    echo "Error: curl or wget required"; exit 1
fi

if [ ! -s "$DOWNLOAD_PATH" ]; then
    echo "Error: Download failed"; exit 1
fi

chmod +x "$DOWNLOAD_PATH"

# --- Install ---
if [ "$(id -u)" -ne 0 ] && [ ! -w "$INSTALL_DIR" ]; then
    echo "Sudo required to move cmdgen to $INSTALL_DIR"
    sudo mv "$DOWNLOAD_PATH" "$INSTALL_DIR/$CMD_NAME"
else
    mv "$DOWNLOAD_PATH" "$INSTALL_DIR/$CMD_NAME"
fi

# --- Update PATH for user shell ---
if ! grep -q "$INSTALL_DIR" <<< "$PATH"; then
    echo 'export PATH="$PATH:'"$INSTALL_DIR"'"' >> ~/.bashrc
    echo "Added $INSTALL_DIR to ~/.bashrc. Restart shell to use cmdgen."
fi

echo "✅ AY-CMDGEN v2.5.6 installed successfully!"
echo "Try: cmdgen --help"
