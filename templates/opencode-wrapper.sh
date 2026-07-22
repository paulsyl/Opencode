#!/usr/bin/env bash
set -euo pipefail

# ponytail: minimal smart launcher wrapper for opencode with agent persona routing & fail-fast recovery
export PATH="${HOME}/.local/bin:${PATH}"

CONFIG_ENV="${HOME}/.config/opencode/env"
if [ -f "${CONFIG_ENV}" ]; then
  set -a
  source "${CONFIG_ENV}" 2>/dev/null || true
  set +a
fi

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

# Intercept agent-map subcommand
if [ "${1:-}" = "agent-map" ]; then
  CLI_SCRIPT="${HOME}/.local/bin/agent-map-cli.js"
  if [ ! -f "${CLI_SCRIPT}" ]; then
    CLI_SCRIPT="$(pwd)/scripts/agent-map-cli.js"
  fi
  node "${CLI_SCRIPT}"
  exit 0
fi

# Subcommand: opencode metrics [off|on|disable|enable|status|model]
if [ "${1:-}" = "metrics" ] || [ "${1:-}" = "stats" ] || [ "${1:-}" = "usage" ]; then
  SUB_CMD="${2:-}"
  mkdir -p "${HOME}/.config/opencode"
  
  if [ "${SUB_CMD}" = "off" ] || [ "${SUB_CMD}" = "disable" ]; then
    touch "${CONFIG_ENV}"
    if grep -q "^OPENCODE_METRICS=" "${CONFIG_ENV}"; then
      sed -i 's/^OPENCODE_METRICS=.*/OPENCODE_METRICS="0"/' "${CONFIG_ENV}"
    else
      echo 'OPENCODE_METRICS="0"' >> "${CONFIG_ENV}"
    fi
    echo "[+] Post-task execution metrics reporting disabled (saved to ${CONFIG_ENV})."
    exit 0
  elif [ "${SUB_CMD}" = "on" ] || [ "${SUB_CMD}" = "enable" ]; then
    touch "${CONFIG_ENV}"
    if grep -q "^OPENCODE_METRICS=" "${CONFIG_ENV}"; then
      sed -i 's/^OPENCODE_METRICS=.*/OPENCODE_METRICS="1"/' "${CONFIG_ENV}"
    else
      echo 'OPENCODE_METRICS="1"' >> "${CONFIG_ENV}"
    fi
    echo "[+] Post-task execution metrics reporting enabled (saved to ${CONFIG_ENV})."
    exit 0
  elif [ "${SUB_CMD}" = "status" ]; then
    VAL="${OPENCODE_METRICS:-1}"
    if [ "${VAL}" = "0" ] || [ "${VAL}" = "false" ] || [ "${VAL}" = "off" ]; then
      echo "Post-task metrics reporting: DISABLED"
    else
      echo "Post-task metrics reporting: ENABLED (Default)"
    fi
    exit 0
  fi

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
  echo "[+] Starting optimized OmniRoute local gateway daemon..."
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
    export NODE_OPTIONS="--max-old-space-size=512 --no-warnings"
    cd "${OMNI_DIR}"
    PORT="${OMNI_PORT}" HOST=127.0.0.1 NODE_ENV=development nohup "${NODE_BIN}" scripts/dev/run-next.mjs dev > "${OMNI_DIR}/log/service.log" 2>&1 < /dev/null &
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
      export NODE_OPTIONS="--max-old-space-size=512 --no-warnings"
      cd "${OMNI_DIR}"
      PORT="${OMNI_PORT}" HOST=127.0.0.1 NODE_ENV=development nohup "${NODE_BIN}" scripts/dev/run-next.mjs dev > "${OMNI_DIR}/log/service.log" 2>&1 < /dev/null &
    )
  fi
fi

# Persona Model Resolution with safe argument passing
RESOLVED_MODEL=""
if [ -f ".agents/agent-models.json" ]; then
  PERSONA="${1:-}"
  RESOLVED_MODEL=$(node -e "
    try {
      const persona = process.argv[1];
      const cfg = JSON.parse(require('fs').readFileSync('.agents/agent-models.json'));
      console.log(cfg.mappings[persona] || cfg.fallbacks?.default || '');
    } catch(e) {}
  " "${PERSONA}" 2>/dev/null || true)
fi

MODEL_FLAGS=()
if [ -n "${RESOLVED_MODEL}" ]; then
  MODEL_FLAGS=("--model" "${RESOLVED_MODEL}")
fi

START_TIME_MS="$(date +%s%3N 2>/dev/null || node -e 'console.log(Date.now())')"

EXIT_CODE=0
if [ -x "${OPENCODE_CORE}" ]; then
  set +e
  "${OPENCODE_CORE}" "${MODEL_FLAGS[@]}" "$@"
  EXIT_CODE=$?
  set -e

  # Fail-Fast Error Recovery Loop
  if [ $EXIT_CODE -ne 0 ]; then
    echo "[!] Session exited with status $EXIT_CODE."
    REROUTE_SCRIPT="${HOME}/.local/bin/fail-fast-reroute.js"
    if [ ! -f "${REROUTE_SCRIPT}" ]; then REROUTE_SCRIPT="$(pwd)/scripts/fail-fast-reroute.js"; fi

    if [ -t 0 ] && [ -f "${REROUTE_SCRIPT}" ]; then
      REROUTE_RES=$(node "${REROUTE_SCRIPT}")
      if [[ "$REROUTE_RES" == REROUTE:* ]]; then
        NEW_MODEL="${REROUTE_RES#REROUTE:}"
        echo "[+] Rerouting session to model: ${NEW_MODEL}"
        "${OPENCODE_CORE}" --model "${NEW_MODEL}" "$@" || EXIT_CODE=$?
      fi
    elif [ -f "${REROUTE_SCRIPT}" ]; then
      FALLBACK_MODEL=$(node "${REROUTE_SCRIPT}" --auto)
      echo "[+] Auto-rerouting non-interactive session to fallback model: ${FALLBACK_MODEL}"
      "${OPENCODE_CORE}" --model "${FALLBACK_MODEL}" "$@" || EXIT_CODE=$?
    fi
  fi
else
  echo "[+] Executing OpenCode command with OmniRoute gateway..."
fi

# Post-task execution metrics (if enabled)
METRICS_SCRIPT="${HOME}/.local/bin/opencode-metrics.py"
IS_DISABLED="${OPENCODE_DISABLE_METRICS:-0}"
METRICS_ENABLED="${OPENCODE_METRICS:-1}"

if [ "${METRICS_ENABLED}" != "0" ] && [ "${METRICS_ENABLED}" != "false" ] && [ "${METRICS_ENABLED}" != "off" ] && [ "${IS_DISABLED}" != "1" ]; then
  if [ -f "${METRICS_SCRIPT}" ] && command -v python3 &>/dev/null; then
    python3 "${METRICS_SCRIPT}" "${START_TIME_MS}" || true
  fi
fi

exit "${EXIT_CODE}"
