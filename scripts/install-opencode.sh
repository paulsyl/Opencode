#!/usr/bin/env bash
set -euo pipefail

# ponytail: minimal installer for OpenCode CLI binary
export PATH="${HOME}/.local/bin:${PATH}"

mkdir -p "${HOME}/.local/bin"

if command -v opencode &>/dev/null || [ -f "${HOME}/.local/bin/opencode-core" ]; then
  echo "[+] OpenCode CLI binary is already present."
else
  echo "[+] Installing OpenCode CLI binary..."
  curl -fsSL https://opencode.ai/install | bash || true
fi

# Ensure opencode-core binary alias exists if opencode is installed
if [ -f "${HOME}/.local/bin/opencode" ] && [ ! -f "${HOME}/.local/bin/opencode-core" ]; then
  mv "${HOME}/.local/bin/opencode" "${HOME}/.local/bin/opencode-core"
fi

echo "OpenCode binary installation complete."
