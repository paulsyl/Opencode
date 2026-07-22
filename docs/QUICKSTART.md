# Quickstart Guide: OpenCode + Direct Provider Routing

## Onboarding Instructions

### 1. Run Setup Script

Inside your WSL Ubuntu terminal, run:

```bash
./setup-opencode-omniroute.sh
```

The installer automatically provisions Node 24, downloads OpenCode CLI binary to `~/.local/bin/opencode-core`, syncs Antigravity skills to `~/.config/opencode/skills`, and configures direct provider blocks in `~/.config/opencode/opencode.json`.

---

### 2. Configure API Keys

Use the built-in key manager to set your provider API keys:

```bash
# Set DeepSeek API Key
opencode keys set deepseek sk-xxxx

# Set Google AI Studio API Key (includes Gemini and Claude models)
opencode keys set gemini AQ.xxxx

# Verify configured keys and cached models
opencode keys list
```

---

### 3. Map Models to Agents (`opencode agent-map`)

Run interactive TTY menu to map models to agent personas:

```bash
opencode agent-map
```

Use arrow keys (`↑`/`↓`) to navigate agents, press `Enter` to open the model picker, and select a model from your active provider subscriptions.

---

### 4. Launch OpenCode

Launch OpenCode from any directory:

```bash
# Launch default session
opencode

# Launch with explicit model target
opencode -m gemini/gemini-2.5-pro
opencode -m deepseek/deepseek-reasoner
```

---

### 5. Maintenance & Updates

Update OpenCode CLI:

```bash
opencode update
```
