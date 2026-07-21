#!/usr/bin/env bash
set -euo pipefail

# ponytail: minimal OpenCode agent configuration script
export PATH="${HOME}/.local/bin:${PATH}"

CONFIG_DIR="${HOME}/.config/opencode"
mkdir -p "${CONFIG_DIR}"

OPENCODE_JSON="${CONFIG_DIR}/opencode.json"
FALLBACK_ENV="${CONFIG_DIR}/env"

echo "[+] Generating OpenCode configuration at ${OPENCODE_JSON}..."
cat << 'EOF' > "${OPENCODE_JSON}"
{
  "$schema": "https://opencode.ai/config.schema.json",
  "providers": {
    "omniroute": {
      "type": "openai-compatible",
      "baseUrl": "http://localhost:20128/v1",
      "apiKey": "omniroute-local"
    }
  },
  "models": {
    "omniroute/auto": {
      "provider": "omniroute",
      "model": "auto"
    },
    "omniroute/deepseek-r1": {
      "provider": "omniroute",
      "model": "deepseek-r1"
    },
    "omniroute/deepseek-v3": {
      "provider": "omniroute",
      "model": "deepseek-v3"
    },
    "omniroute/gemini-2.0-flash": {
      "provider": "omniroute",
      "model": "gemini-2.0-flash"
    },
    "omniroute/claude-3.5-sonnet": {
      "provider": "omniroute",
      "model": "claude-3.5-sonnet"
    },
    "omniroute/gpt-4o": {
      "provider": "omniroute",
      "model": "gpt-4o"
    }
  },
  "default_model": "omniroute/auto"
}
EOF
chmod 600 "${OPENCODE_JSON}"

if [ ! -f "${FALLBACK_ENV}" ]; then
  echo "[+] Creating direct fallback environment file at ${FALLBACK_ENV}..."
  cat << 'EOF' > "${FALLBACK_ENV}"
# Direct Native API Fallback Keys
DEEPSEEK_API_KEY=""
GEMINI_API_KEY=""
ANTHROPIC_API_KEY=""
OPENAI_API_KEY=""
EOF
  chmod 600 "${FALLBACK_ENV}"
fi

echo "[+] Validating opencode.json schema..."
node -e "JSON.parse(require('fs').readFileSync(process.env.HOME + '/.config/opencode/opencode.json'))"

echo "OpenCode configuration deployed successfully."
