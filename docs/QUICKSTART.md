# Quickstart Guide: OpenCode + OmniRoute Integration

## Onboarding Instructions

### 1. Run Setup Script

Inside your WSL Ubuntu terminal, run:

```bash
./setup-opencode-omniroute.sh
```

The installer automatically installs Node 22, clones OmniRoute to `~/.omniroute`, installs OpenCode CLI binary to `~/.local/bin/opencode-core`, configures `~/.config/opencode/opencode.json`, links the `opencode` launcher wrapper, and prompts interactively for API keys.

---

### 2. Configure API Keys

Open the local OmniRoute Web Dashboard to configure provider keys:
- **Dashboard URL:** `http://localhost:20128/dashboard`

Or edit the direct fallback credentials file:
```bash
nano ~/.config/opencode/env
```

---

### 3. Launch OpenCode Agent

Run `opencode` with any model profile:

```bash
# Intelligent auto-routing
opencode --model omniroute/auto

# Explicit model selection
opencode --model omniroute/deepseek-r1
opencode --model omniroute/gemini-2.0-flash
```

---

### 4. Updating

Update both OpenCode and OmniRoute with a single command:

```bash
opencode update
# OR
./setup-opencode-omniroute.sh --update
```
