#!/usr/bin/env bash
set -euo pipefail

# ponytail: ensure Node >= 20 in ~/.local/bin if system node is missing or < 20
export PATH="${HOME}/.local/bin:${PATH}"

NODE_BIN="${HOME}/.local/bin/node"
NODE_VER="$("${NODE_BIN}" -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1 || echo "0")"
if [ "${NODE_VER}" -lt 24 ]; then
  echo "[+] Upgrading Node.js to Node 24 LTS in ${HOME}/.local/bin..."
  mkdir -p "${HOME}/.local"
  curl -fsSL https://nodejs.org/dist/v24.0.0/node-v24.0.0-linux-x64.tar.xz | tar -xJ -C "${HOME}/.local" --strip-components=1
fi

OMNI_DIR="${HOME}/.omniroute"
CONFIG_DIR="${HOME}/.config/omniroute"

mkdir -p "${CONFIG_DIR}"

if [ ! -d "${OMNI_DIR}" ]; then
  echo "[+] Cloning OmniRoute repository into ${OMNI_DIR}..."
  git clone https://github.com/diegosouzapw/OmniRoute.git "${OMNI_DIR}"
else
  echo "[+] OmniRoute directory already exists."
fi

echo "[+] Installing npm dependencies in ${OMNI_DIR}..."
(cd "${OMNI_DIR}" && "${HOME}/.local/bin/npm" install --legacy-peer-deps)

echo "[+] Rebuilding native sqlite drivers for Node 24 compatibility..."
(cd "${OMNI_DIR}" && "${HOME}/.local/bin/npm" rebuild better-sqlite3 2>/dev/null || true)

echo "[+] Writing OmniRoute environment configuration..."
cat << 'EOF' > "${CONFIG_DIR}/.env"
PORT=20128
HOST=127.0.0.1
NODE_OPTIONS="--max-old-space-size=512 --no-warnings"
LOG_LEVEL=info
KEEP_ALIVE_TIMEOUT=60000
EOF
chmod 600 "${CONFIG_DIR}/.env"

echo "OmniRoute installed successfully in ${OMNI_DIR}."
