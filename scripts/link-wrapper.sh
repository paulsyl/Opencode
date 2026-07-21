#!/usr/bin/env bash
set -euo pipefail

# ponytail: link smart launcher wrapper and metrics script to ~/.local/bin/
export PATH="${HOME}/.local/bin:${PATH}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

mkdir -p "${HOME}/.local/bin"
TARGET_WRAPPER="${HOME}/.local/bin/opencode"
TARGET_METRICS="${HOME}/.local/bin/opencode-metrics.py"

cp "${REPO_DIR}/templates/opencode-wrapper.sh" "${TARGET_WRAPPER}"
chmod +x "${TARGET_WRAPPER}"

cp "${REPO_DIR}/templates/opencode-metrics.py" "${TARGET_METRICS}"
chmod +x "${TARGET_METRICS}"

echo "[+] Smart launcher wrapper installed to ${TARGET_WRAPPER}."
echo "[+] Post-task metrics reporter installed to ${TARGET_METRICS}."
