# Quickstart Guide: OpenCode + OmniRoute Integration

## Onboarding Instructions

### 1. Run Setup Script

Inside your WSL Ubuntu terminal, run:

```bash
./setup-opencode-omniroute.sh
```

The installer automatically installs Node 24, clones OmniRoute to `~/.omniroute`, downloads OpenCode CLI binary to `~/.local/bin/opencode-core`, syncs Antigravity skills to `~/.config/opencode/skills`, configures `~/.config/opencode/opencode.json` with cognitive thinking indicators (`"reasoning": true`), and links the `opencode` launcher wrapper.

---

### 2. Visual Cognitive Thinking Indicator

When executing reasoning models (e.g., **DeepSeek R1**) or auto-routing (`omniroute/auto`), OpenCode CLI displays a visual thinking completion indicator:

- **Thinking In Progress**:
  ```text
  🧠 Thinking (12.4s, 3,420 reasoning tokens)...
  ```
- **Thinking Completed**:
  ```text
  🧠 Thinking (12.4s, 3,420 tokens) ✓
  ```

---

### 3. Launch OpenCode & Subagent Workflows

Run `opencode` with any model profile:

```bash
# Intelligent auto-routing (default)
opencode -m omniroute/auto

# Explicit model selection
opencode -m omniroute/deepseek-r1
opencode -m omniroute/gemini-2.0-flash
```

---

### 4. Assigning Models to Agents

#### List Available Models
```bash
opencode models
```

#### Override Subagent Model via CLI
```bash
opencode --agent architect --model omniroute/deepseek-r1
opencode --agent executor --model omniroute/gemini-2.0-flash
opencode --agent review-council --model omniroute/claude-3.5-sonnet
```

#### Pin Subagent Models in Config (`~/.config/opencode/opencode.json`)
```json
{
  "agent": {
    "architect": {
      "model": "omniroute/deepseek-r1",
      "description": "Translate PRD requirements into vertical-sliced technical blueprints"
    },
    "executor": {
      "model": "omniroute/gemini-2.0-flash",
      "description": "Build and implement code phase-by-phase"
    },
    "review-council": {
      "model": "omniroute/claude-3.5-sonnet",
      "description": "Multi-persona code review council"
    }
  }
}
```

---

### 5. Updating

Update both OpenCode and OmniRoute with a single command:

```bash
opencode update
# OR
./setup-opencode-omniroute.sh --update
```
