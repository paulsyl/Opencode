#!/usr/bin/env bash
set -euo pipefail

# ponytail: link smart launcher wrapper, metrics script, and frontmatter sync script to ~/.local/bin/
export PATH="${HOME}/.local/bin:${PATH}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

mkdir -p "${HOME}/.local/bin"
TARGET_WRAPPER="${HOME}/.local/bin/opencode"
TARGET_METRICS="${HOME}/.local/bin/opencode-metrics.py"
TARGET_SYNC="${HOME}/.local/bin/sync-agent-frontmatter.py"

cp "${REPO_DIR}/templates/opencode-wrapper.sh" "${TARGET_WRAPPER}"
chmod +x "${TARGET_WRAPPER}"

cp "${REPO_DIR}/templates/opencode-metrics.py" "${TARGET_METRICS}"
chmod +x "${TARGET_METRICS}"

cp "${REPO_DIR}/scripts/sync-agent-frontmatter.py" "${TARGET_SYNC}"
chmod +x "${TARGET_SYNC}"

if [ -f "${REPO_DIR}/scripts/agent-map-cli.js" ]; then
  cp "${REPO_DIR}/scripts/agent-map-cli.js" "${HOME}/.local/bin/agent-map-cli.js"
  chmod +x "${HOME}/.local/bin/agent-map-cli.js"
fi

if [ -f "${REPO_DIR}/scripts/fail-fast-reroute.js" ]; then
  cp "${REPO_DIR}/scripts/fail-fast-reroute.js" "${HOME}/.local/bin/fail-fast-reroute.js"
  chmod +x "${HOME}/.local/bin/fail-fast-reroute.js"
fi

echo "[+] Smart launcher wrapper installed to ${TARGET_WRAPPER}."
echo "[+] Post-task metrics reporter installed to ${TARGET_METRICS}."
echo "[+] Agent front matter model synchronizer installed to ${TARGET_SYNC}."
