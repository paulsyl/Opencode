# Phase 4 — Automated Setup & Maintenance Script
**Status:** COMPLETE  
**Impact**: High  
**Layers Touched**: Automation, Installation, Interactive Prompt, Maintenance CLI  

### Execution Steps
1. Create `setup-opencode-omniroute.sh` script in repository root.
2. Validate WSL environment and required binaries (`node`, `npm`, `git`, `curl`).
3. Support `--update` flag to perform automated maintenance.
4. Execute OmniRoute installation, OpenCode installation, configuration deployment, and launcher linking.
5. Prompt interactively for API keys (`DEEPSEEK_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`) and populate config files.
6. Execute self-check verification suite to validate installation end-to-end.

### Code Snippets

#### `setup-opencode-omniroute.sh`
```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "${1:-}" = "--update" ]; then
  echo "=== Running OpenCode + OmniRoute Upgrade ==="
  ~/.local/bin/opencode update
  exit 0
fi

echo "=== OpenCode + OmniRoute Setup Script ==="

# Check prerequisites
for cmd in node npm git curl; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Error: $cmd is required but not installed." >&2
    exit 1
  fi
done

# Run setup steps
bash "${SCRIPT_DIR}/scripts/install-omniroute.sh"
bash "${SCRIPT_DIR}/scripts/install-opencode.sh"
bash "${SCRIPT_DIR}/scripts/configure-agent.sh"

echo "=== Setup Completed Successfully ==="
```

### Acceptance Criteria
- [ ] `./setup-opencode-omniroute.sh` completes cleanly on fresh WSL setup.
- [ ] `./setup-opencode-omniroute.sh --update` executes update pipeline.
- [ ] [Negative Test] Missing prerequisite (`node` or `git`) halts setup with clear error message.

### Validation
- **Test**: `bash setup-opencode-omniroute.sh --update`
- **Rollback**: `rm -rf ~/.omniroute ~/.config/omniroute ~/.config/opencode`
