#!/usr/bin/env bash
set -euo pipefail

# ponytail: link smart launcher wrapper to ~/.local/bin/opencode
export PATH="${HOME}/.local/bin:${PATH}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

mkdir -p "${HOME}/.local/bin"
TARGET_WRAPPER="${HOME}/.local/bin/opencode"

cp "${REPO_DIR}/templates/opencode-wrapper.sh" "${TARGET_WRAPPER}"
chmod +x "${TARGET_WRAPPER}"

echo "[+] Smart launcher wrapper installed to ${TARGET_WRAPPER}."
