#!/usr/bin/env bash
set -euo pipefail

# ponytail: minimal installer for OpenCode CLI binary
export PATH="${HOME}/.local/bin:${PATH}"

mkdir -p "${HOME}/.local/bin"

if [ -f "${HOME}/.local/bin/opencode-core" ]; then
  echo "[+] OpenCode CLI binary is already present."
else
  echo "[+] Downloading OpenCode CLI binary (v1.18.4)..."
  mkdir -p /tmp/opencode-install
  curl -fsSL "https://github.com/anomalyco/opencode/releases/download/v1.18.4/opencode-linux-x64.tar.gz" | tar -xzf - -C "${HOME}/.local/bin/"
  mv -f "${HOME}/.local/bin/opencode" "${HOME}/.local/bin/opencode-core"
  chmod +x "${HOME}/.local/bin/opencode-core"
fi

echo "OpenCode binary installation complete."
