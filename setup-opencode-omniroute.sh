#!/usr/bin/env bash
set -euo pipefail

# ponytail: master setup & maintenance script
export PATH="${HOME}/.local/bin:${PATH}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "${1:-}" = "--update" ]; then
  echo "=== Running OpenCode + OmniRoute Upgrade ==="
  if [ -x "${HOME}/.local/bin/opencode" ]; then
    "${HOME}/.local/bin/opencode" update
  else
    echo "[+] Executing setup update pipeline..."
    bash "${SCRIPT_DIR}/scripts/install-omniroute.sh"
    bash "${SCRIPT_DIR}/scripts/install-opencode.sh"
  fi
  echo "=== Upgrade Completed Successfully ==="
  exit 0
fi

echo "=== OpenCode + OmniRoute Setup Script ==="

# 1. Check prerequisites
for cmd in git curl; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Error: $cmd is required but not installed." >&2
    echo "Run: sudo apt update && sudo apt install -y git curl" >&2
    exit 1
  fi
done

# 2. Run setup modules
echo "[+] Step 1/4: OmniRoute Gateway Setup..."
bash "${SCRIPT_DIR}/scripts/install-omniroute.sh"

echo "[+] Step 2/4: OpenCode CLI Binary Setup..."
bash "${SCRIPT_DIR}/scripts/install-opencode.sh"

echo "[+] Step 3/4: OpenCode Provider Configuration..."
bash "${SCRIPT_DIR}/scripts/configure-agent.sh"

echo "[+] Step 4/4: Smart Launcher Wrapper Linking..."
bash "${SCRIPT_DIR}/scripts/link-wrapper.sh"

# Seed agent-models.json if missing
mkdir -p .agents
if [ ! -f .agents/agent-models.json ]; then
  cp "${SCRIPT_DIR}/templates/agent-models.json.template" .agents/agent-models.json
  echo "[+] Initialized .agents/agent-models.json with default mappings."
fi

# Validate JSON schema
node -e "JSON.parse(require('fs').readFileSync('.agents/agent-models.json'))" || {
  echo "Error: Invalid JSON in .agents/agent-models.json" >&2
  exit 1
}

# 3. Interactive API Key Prompt (if TTY)
FALLBACK_ENV="${HOME}/.config/opencode/env"
if [ -t 0 ] && [ -f "${FALLBACK_ENV}" ]; then
  echo ""
  echo "--- API Credentials Setup ---"
  read -rp "Enter DeepSeek API Key (press Enter to skip): " ds_key || true
  read -rp "Enter Gemini API Key (press Enter to skip): " gem_key || true
  read -rp "Enter Anthropic API Key (press Enter to skip): " ant_key || true
  read -rp "Enter OpenAI API Key (press Enter to skip): " oai_key || true

  if [ -n "${ds_key}" ]; then sed -i "s/DEEPSEEK_API_KEY=.*/DEEPSEEK_API_KEY=\"${ds_key}\"/" "${FALLBACK_ENV}"; fi
  if [ -n "${gem_key}" ]; then sed -i "s/GEMINI_API_KEY=.*/GEMINI_API_KEY=\"${gem_key}\"/" "${FALLBACK_ENV}"; fi
  if [ -n "${ant_key}" ]; then sed -i "s/ANTHROPIC_API_KEY=.*/ANTHROPIC_API_KEY=\"${ant_key}\"/" "${FALLBACK_ENV}"; fi
  if [ -n "${oai_key}" ]; then sed -i "s/OPENAI_API_KEY=.*/OPENAI_API_KEY=\"${oai_key}\"/" "${FALLBACK_ENV}"; fi
fi

echo ""
echo "=== OpenCode + OmniRoute Setup Complete! ==="
echo "You can now run 'opencode' from any terminal session."
