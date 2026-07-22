# Troubleshooting & Maintenance Manual

## Common Issues & Solutions

### 1. "No provider API keys found" Error

If invoking `opencode` outputs `[!] No provider API keys found.`:

```bash
# Add your DeepSeek or Google AI Studio API key:
opencode keys set deepseek <your-key>
# OR
opencode keys set gemini <your-key>
```

---

### 2. Provider Not Configured Error

If OpenCode fails to execute against a selected model:

1. Verify key status:
   ```bash
   opencode keys list
   ```
2. Re-run model mapping to bind the persona to an active model:
   ```bash
   opencode agent-map
   ```

---

### 3. Clear Model Cache

If newly released provider models are not appearing in the catalog:

```bash
# Force fresh query on next command by resetting cache
rm -f ~/.config/opencode/model-cache.json
opencode keys list
```

---

### 4. File Permission Verification

Ensure API credentials and configurations use secure file permissions (`600`):

```bash
chmod 600 ~/.config/opencode/env
chmod 600 ~/.config/opencode/opencode.json
```
