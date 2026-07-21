#!/usr/bin/env bash
set -euo pipefail

# ponytail: minimal installer for OpenCode CLI binary
export PATH="${HOME}/.local/bin:${PATH}"

mkdir -p "${HOME}/.local/bin"

LATEST_RELEASE="$(curl -fsSL "https://api.github.com/repos/anomalyco/opencode/releases/latest" 2>/dev/null | grep '"tag_name":' | cut -d'"' -f4 || echo "v1.18.4")"
if [ -z "${LATEST_RELEASE}" ]; then
  LATEST_RELEASE="v1.18.4"
fi

if [ -f "${HOME}/.local/bin/opencode-core" ]; then
  echo "[+] OpenCode CLI binary is already present."
else
  echo "[+] Downloading latest OpenCode CLI binary (${LATEST_RELEASE})..."
  mkdir -p /tmp/opencode-install
  curl -fsSL "https://github.com/anomalyco/opencode/releases/download/${LATEST_RELEASE}/opencode-linux-x64.tar.gz" | tar -xzf - -C "${HOME}/.local/bin/"
  mv -f "${HOME}/.local/bin/opencode" "${HOME}/.local/bin/opencode-core"
  chmod +x "${HOME}/.local/bin/opencode-core"
fi

echo "OpenCode binary installation complete."
