# Troubleshooting & Maintenance Manual

## Common Issues & Solutions

### 1. OmniRoute Service Logs

Logs for the OmniRoute gateway process are stored at:
```bash
cat ~/.omniroute/log/service.log
```

---

### 2. Port 20128 Port Conflict

If port `20128` is occupied by another process:

```bash
# Identify process using port 20128
lsof -i :20128
# OR
ss -tlpn | grep 20128

# Terminate orphaned OmniRoute processes
pkill -f "run-next.mjs"
```

---

### 3. Verify Health Check

Manually verify gateway health status:

```bash
curl -s http://localhost:20128/health
```

Expected output: `{"status":"ok"}` or HTTP 200 response.

---

### 4. File Permission Verification

Ensure API credentials and configurations use secure file permissions (`600`):

```bash
chmod 600 ~/.config/opencode/env
chmod 600 ~/.config/opencode/opencode.json
chmod 600 ~/.config/omniroute/.env
```
