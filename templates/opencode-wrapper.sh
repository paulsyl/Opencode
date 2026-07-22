#!/usr/bin/env bash
set -euo pipefail

# ponytail: minimal launcher wrapper for opencode with direct provider routing & fail-fast recovery
export PATH="${HOME}/.local/bin:${PATH}"

CONFIG_ENV="${HOME}/.config/opencode/env"
if [ -f "${CONFIG_ENV}" ]; then
  set -a
  source "${CONFIG_ENV}" 2>/dev/null || true
  set +a
fi

OPENCODE_CORE="${HOME}/.local/bin/opencode-core"
if [ ! -f "${OPENCODE_CORE}" ]; then
  OPENCODE_CORE="$(which opencode-core 2>/dev/null || which opencode-bin 2>/dev/null || echo '')"
fi

update_all() {
  echo "[+] Updating OpenCode CLI binary..."
  curl -fsSL https://opencode.ai/install | bash || true
}

if [ "${1:-}" = "update" ] || [ "${1:-}" = "upgrade" ]; then
  update_all
  exit 0
fi

# Intercept keys subcommand
if [ "${1:-}" = "keys" ] || [ "${1:-}" = "key" ]; then
  KEYS_SCRIPT="${HOME}/.local/bin/opencode-keys.js"
  if [ ! -f "${KEYS_SCRIPT}" ]; then
    KEYS_SCRIPT="$(pwd)/scripts/opencode-keys.js"
  fi
  node "${KEYS_SCRIPT}" "${@:2}"
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

# Validate Provider API Keys presence
HAS_KEYS=$(node -e "
  try {
    const { readEnvKeys } = require('${HOME}/.local/bin/provider-catalog.js');
    const k = readEnvKeys();
    console.log(k.deepseek || k.gemini ? '1' : '0');
  } catch(e) {
    try {
      const { readEnvKeys } = require('./scripts/provider-catalog.js');
      const k = readEnvKeys();
      console.log(k.deepseek || k.gemini ? '1' : '0');
    } catch(err) { console.log('0'); }
  }
" 2>/dev/null || echo "0")

if [ "${HAS_KEYS}" = "0" ]; then
  echo "[!] No provider API keys found."
  echo "[!] Configure API keys using 'opencode keys set <provider>' or edit ~/.config/opencode/env."
  exit 1
fi

# Persona Model Resolution with First-Run Unmapped Interception
RESOLVED_MODEL=""
PERSONA="${1:-}"

if [ -n "${PERSONA}" ] && [ -f ".agents/agent-models.json" ]; then
  RESOLVED_MODEL=$(node -e "
    try {
      const persona = process.argv[1];
      const cfg = JSON.parse(require('fs').readFileSync('.agents/agent-models.json'));
      if (cfg.mappings && cfg.mappings[persona]) {
        console.log('MAPPED:' + cfg.mappings[persona]);
      } else {
        console.log('UNMAPPED:' + (cfg.fallbacks?.default || 'gemini/gemini-2.5-pro'));
      }
    } catch(e) {
      console.log('UNMAPPED:gemini/gemini-2.5-pro');
    }
  " "${PERSONA}" 2>/dev/null || true)
fi

if [[ "${RESOLVED_MODEL}" == UNMAPPED:* ]]; then
  DEFAULT_FALLBACK="${RESOLVED_MODEL#UNMAPPED:}"
  if [ -t 0 ]; then
    echo "[!] Unmapped agent persona '${PERSONA}'. Launching interactive model selection..."
    CLI_SCRIPT="${HOME}/.local/bin/agent-map-cli.js"
    if [ ! -f "${CLI_SCRIPT}" ]; then CLI_SCRIPT="$(pwd)/scripts/agent-map-cli.js"; fi
    if [ -f "${CLI_SCRIPT}" ]; then
      node "${CLI_SCRIPT}"
      RESOLVED_MODEL=$(node -e "
        try {
          const cfg = JSON.parse(require('fs').readFileSync('.agents/agent-models.json'));
          console.log(cfg.mappings['${PERSONA}'] || '${DEFAULT_FALLBACK}');
        } catch(e) { console.log('${DEFAULT_FALLBACK}'); }
      " 2>/dev/null || echo "${DEFAULT_FALLBACK}")
    else
      RESOLVED_MODEL="${DEFAULT_FALLBACK}"
    fi
  else
    echo "[!] Unmapped agent persona '${PERSONA}'. Using default model '${DEFAULT_FALLBACK}'."
    echo "[!] Run 'opencode agent-map' to configure a designated model for '${PERSONA}'."
    RESOLVED_MODEL="${DEFAULT_FALLBACK}"
  fi
elif [[ "${RESOLVED_MODEL}" == MAPPED:* ]]; then
  RESOLVED_MODEL="${RESOLVED_MODEL#MAPPED:}"
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
  echo "[+] Executing OpenCode command..."
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
