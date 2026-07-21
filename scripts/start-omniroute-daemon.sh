#!/usr/bin/env bash
set -euo pipefail

# ponytail: minimal runner to auto-start OmniRoute daemon
export PATH="${HOME}/.local/bin:${PATH}"

OMNI_DIR="${HOME}/.omniroute"
LOG_DIR="${OMNI_DIR}/log"
LOG_FILE="${LOG_DIR}/service.log"
PORT="${PORT:-20128}"

mkdir -p "${LOG_DIR}"

is_healthy() {
  curl -s --connect-timeout 1 "http://localhost:${PORT}/health" >/dev/null 2>&1 || \
  curl -s --connect-timeout 1 "http://localhost:${PORT}/api/monitoring/health" >/dev/null 2>&1 || \
  (cd "${OMNI_DIR}" && node scripts/dev/healthcheck.mjs >/dev/null 2>&1)
}

if is_healthy; then
  echo "[+] OmniRoute daemon is already running on port ${PORT}."
  exit 0
fi

echo "[+] Starting OmniRoute daemon on port ${PORT}..."
(
  cd "${OMNI_DIR}"
  PORT="${PORT}" NODE_ENV=development OMNIROUTE_USE_TURBOPACK=0 nohup node scripts/dev/run-next.mjs dev > "${LOG_FILE}" 2>&1 < /dev/null &
)

for i in {1..30}; do
  sleep 0.5
  if is_healthy; then
    echo "[+] OmniRoute active and healthy on port ${PORT}."
    exit 0
  fi
done

echo "[!] Warning: OmniRoute daemon startup initiated on port ${PORT}. Check ${LOG_FILE}."
