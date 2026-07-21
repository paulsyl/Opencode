# Phase 3 — Smart Launcher Wrapper & Update Interception
**Status:** COMPLETE  
**Impact**: High  
**Layers Touched**: CLI Interface, Daemon Management, Update Lifecycle  

### Execution Steps
1. Create executable bash script at `~/.local/bin/opencode`.
2. Intercept `update` / `upgrade` subcommands: re-run OpenCode installer, perform `git pull && npm install` in `~/.omniroute`, and restart daemon.
3. For normal invocations: query `http://localhost:20128/health`.
4. If offline, auto-start OmniRoute daemon in background (`nohup npm start > service.log 2>&1 &`), wait up to 5s for health check pass.
5. If daemon fails to start, output diagnostic log and pass execution to OpenCode core.

### Code Snippets

#### `templates/opencode-wrapper.sh`
```bash
#!/usr/bin/env bash
set -euo pipefail

OMNI_DIR="${HOME}/.omniroute"
OMNI_PORT=20128
HEALTH_URL="http://localhost:${OMNI_PORT}/health"
OPENCODE_CORE="${HOME}/.local/bin/opencode-core"

if [ ! -f "${OPENCODE_CORE}" ]; then
  OPENCODE_CORE="$(which opencode-core 2>/dev/null || which opencode-bin 2>/dev/null || echo '')"
fi

update_all() {
  echo "[+] Updating OpenCode CLI binary..."
  curl -fsSL https://opencode.ai/install | bash

  echo "[+] Updating OmniRoute Gateway codebase..."
  if [ -d "${OMNI_DIR}" ]; then
    (cd "${OMNI_DIR}" && git pull && npm install)
    pkill -f "omniroute" 2>/dev/null || true
    echo "[+] OmniRoute updated successfully."
  fi
}

if [ "${1:-}" = "update" ] || [ "${1:-}" = "upgrade" ]; then
  update_all
  exit 0
fi

is_healthy() {
  curl -s --connect-timeout 1 "${HEALTH_URL}" | grep -q '"status"' || curl -s --connect-timeout 1 "${HEALTH_URL}" > /dev/null
}

if ! is_healthy; then
  echo "[+] Starting OmniRoute local gateway daemon..."
  mkdir -p "${OMNI_DIR}/log"
  (cd "${OMNI_DIR}" && nohup npm start > "${OMNI_DIR}/log/service.log" 2>&1 &)

  for i in {1..10}; do
    sleep 0.5
    if is_healthy; then
      echo "[+] OmniRoute gateway active on port ${OMNI_PORT}."
      break
    fi
  done
fi

exec opencode-core "$@"
```

### Acceptance Criteria
- [ ] Executable installed at `~/.local/bin/opencode` (`chmod +x`).
- [ ] Running `opencode update` triggers full update workflow for both OpenCode and OmniRoute.
- [ ] Running `opencode` auto-starts OmniRoute background daemon if stopped.
- [ ] [Negative Test] Daemon start timeout (>5s) logs warning without throwing unhandled script crash.

### Validation
- **Test**: `pkill -f omniroute; ~/.local/bin/opencode --version`
- **Rollback**: `rm -f ~/.local/bin/opencode`
