# Phase 1 — OmniRoute Gateway Setup & Health Verification
**Status:** COMPLETE  
**Impact**: Medium  
**Layers Touched**: Service, Network, Credentials, Verification  

### Execution Steps
1. Clone `diegosouzapw/OmniRoute` into `~/.omniroute` if not present.
2. Install npm dependencies (`npm install`) inside `~/.omniroute`.
3. Create `~/.config/omniroute/.env` setting `PORT=20128`.
4. Validate service boot and verify HTTP 200 response on `http://localhost:20128/health`.

### Code Snippets

#### `scripts/install-omniroute.sh`
```bash
#!/usr/bin/env bash
set -euo pipefail

OMNI_DIR="${HOME}/.omniroute"
CONFIG_DIR="${HOME}/.config/omniroute"

mkdir -p "${CONFIG_DIR}"

if [ ! -d "${OMNI_DIR}" ]; then
  git clone https://github.com/diegosouzapw/OmniRoute.git "${OMNI_DIR}"
else
  (cd "${OMNI_DIR}" && git pull)
fi

(cd "${OMNI_DIR}" && npm install)

cat << 'EOF' > "${CONFIG_DIR}/.env"
PORT=20128
EOF

echo "OmniRoute installed successfully in ${OMNI_DIR}."
```

### Acceptance Criteria
- [ ] `~/.omniroute` exists and contains node_modules.
- [ ] `~/.config/omniroute/.env` specifies `PORT=20128`.
- [ ] Executing `npm start` inside `~/.omniroute` responds to `curl -s http://localhost:20128/health` with HTTP 200 / `status: ok`.
- [ ] [Negative Test] Attempting health check when daemon is offline returns non-zero / connection refused cleanly without hang.

### Validation
- **Test**: `curl -s http://localhost:20128/health`
- **Rollback**: `rm -rf ~/.omniroute ~/.config/omniroute`
