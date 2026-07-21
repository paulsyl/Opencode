#!/usr/bin/env bash
set -euo pipefail

# ponytail: minimal smart launcher wrapper for opencode with post-task metrics & CLI reporting
export PATH="${HOME}/.local/bin:${PATH}"

OMNI_DIR="${HOME}/.omniroute"
OMNI_PORT="${PORT:-20128}"
HEALTH_URL="http://localhost:${OMNI_PORT}/health"
ALT_HEALTH_URL="http://localhost:${OMNI_PORT}/api/monitoring/health"

OPENCODE_CORE="${HOME}/.local/bin/opencode-core"
if [ ! -f "${OPENCODE_CORE}" ]; then
  OPENCODE_CORE="$(which opencode-core 2>/dev/null || which opencode-bin 2>/dev/null || echo '')"
fi

update_all() {
  echo "[+] Updating OpenCode CLI binary..."
  curl -fsSL https://opencode.ai/install | bash || true

  echo "[+] Updating OmniRoute Gateway codebase..."
  if [ -d "${OMNI_DIR}" ]; then
    (cd "${OMNI_DIR}" && git pull && npm install --legacy-peer-deps)
    pkill -f "run-next.mjs" 2>/dev/null || true
    echo "[+] OmniRoute updated successfully."
  fi
}

if [ "${1:-}" = "update" ] || [ "${1:-}" = "upgrade" ]; then
  update_all
  exit 0
fi

if [ "${1:-}" = "metrics" ] || [ "${1:-}" = "stats" ] || [ "${1:-}" = "usage" ]; then
  METRICS_SCRIPT="${HOME}/.local/bin/opencode-metrics.py"
  if [ -f "${METRICS_SCRIPT}" ] && command -v python3 &>/dev/null; then
    python3 "${METRICS_SCRIPT}" "${@:2}"
  else
    echo "Error: opencode-metrics.py is missing or python3 is not installed." >&2
  fi
  exit 0
fi

is_healthy() {
  curl -s --connect-timeout 1 "${HEALTH_URL}" >/dev/null 2>&1 || \
  curl -s --connect-timeout 1 "${ALT_HEALTH_URL}" >/dev/null 2>&1 || \
  (cd "${OMNI_DIR}" 2>/dev/null && node scripts/dev/healthcheck.mjs >/dev/null 2>&1)
}

if ! is_healthy; then
  echo "[+] Starting OmniRoute local gateway daemon..."
  mkdir -p "${OMNI_DIR}/log"
  
  NODE_BIN="${HOME}/.local/bin/node"
  NODE_VER="$("${NODE_BIN}" -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1 || echo "0")"
  if [ "${NODE_VER}" -lt 24 ]; then
    echo "[+] Provisioning Node 24 LTS runtime..."
    mkdir -p "${HOME}/.local"
    curl -fsSL https://nodejs.org/dist/v24.0.0/node-v24.0.0-linux-x64.tar.xz | tar -xJ -C "${HOME}/.local" --strip-components=1
  fi

  (
    export PATH="${HOME}/.local/bin:${PATH}"
    cd "${OMNI_DIR}"
    PORT="${OMNI_PORT}" NODE_ENV=development nohup "${NODE_BIN}" scripts/dev/run-next.mjs dev > "${OMNI_DIR}/log/service.log" 2>&1 < /dev/null &
  )

  for i in {1..12}; do
    sleep 0.5
    if is_healthy; then
      echo "[+] OmniRoute gateway active on port ${OMNI_PORT}."
      break
    fi
  done

  if ! is_healthy; then
    echo "[!] Clearing build cache to heal dev compilation..."
    rm -rf "${OMNI_DIR}/.build"
    (
      export PATH="${HOME}/.local/bin:${PATH}"
      cd "${OMNI_DIR}"
      PORT="${OMNI_PORT}" NODE_ENV=development nohup "${NODE_BIN}" scripts/dev/run-next.mjs dev > "${OMNI_DIR}/log/service.log" 2>&1 < /dev/null &
    )
  fi
fi

START_TIME_MS="$(date +%s%3N 2>/dev/null || node -e 'console.log(Date.now())')"

EXIT_CODE=0
if [ -x "${OPENCODE_CORE}" ]; then
  "${OPENCODE_CORE}" "$@" || EXIT_CODE=$?
else
  echo "[+] Executing OpenCode command with OmniRoute gateway..."
fi

METRICS_SCRIPT="${HOME}/.local/bin/opencode-metrics.py"
if [ -f "${METRICS_SCRIPT}" ] && command -v python3 &>/dev/null; then
  python3 "${METRICS_SCRIPT}" "${START_TIME_MS}" || true
fi

exit "${EXIT_CODE}"
