#!/usr/bin/env bash
set -euo pipefail

CONFIG_DIR="${HOME}/.config/opencode"
mkdir -p "${CONFIG_DIR}/skills" "${CONFIG_DIR}/instructions" "${CONFIG_DIR}/agents"

echo "[+] Linking Antigravity instructions globally..."
cp -sf "${CONFIG_DIR}/antigravity/GEMINI.md" "${CONFIG_DIR}/instructions/GEMINI.md"
cp -sf "${CONFIG_DIR}/antigravity/plugins/core-workflow/rules/global_gemini_rules.md" "${CONFIG_DIR}/instructions/global_gemini_rules.md"

echo "[+] Linking Antigravity skills globally..."
for skill in "${CONFIG_DIR}"/antigravity/plugins/*/skills/*; do
  if [ -d "${skill}" ]; then
    skill_name="$(basename "${skill}")"
    ln -sfn "${skill}" "${CONFIG_DIR}/skills/${skill_name}"
    echo "  - Linked skill: ${skill_name}"
  fi
done

echo "[+] Global linking complete!"
