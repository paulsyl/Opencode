# OpenCode + OmniRoute + Antigravity Integration

A unified, high-performance terminal AI coding environment built inside Windows Subsystem for Linux (WSL Ubuntu).

It integrates:
- **OpenCode CLI (v1.18.4)**: Terminal AI coding agent.
- **OmniRoute Gateway**: Local proxy server running on port `20128` that auto-routes LLM queries across frontier models (DeepSeek R1/V3, Gemini 2.0 Flash, Claude 3.5 Sonnet, GPT-4o).
- **Antigravity Agents & Skills**: Pre-loaded global SDLC workflows, rules, and skills imported from [paulsyl/Antigravity](https://github.com/paulsyl/Antigravity).

---

## 🚀 Features

- ⚡ **Zero-Dependency One-Touch Installer**: `./setup-opencode-omniroute.sh` sets up Node 24 runtime, OmniRoute gateway, OpenCode CLI, Antigravity skills, and smart wrapper scripts automatically.
- 🧠 **Visual Cognitive Thinking Indicator**: Renders live thinking spinners (`🧠 Thinking (12.4s, 3,420 tokens)`) and completion checkmarks (`✓`) the moment LLM reasoning completes.
- 🤖 **Pre-Loaded Antigravity SDLC Agents**: `@architect`, `@executor`, `@review-council`, `@specifier-grill`, `@specifier-prd`, `@orchestrator`, `@prototype`, `@ponytail`, and `@qa-orchestrator` loaded globally by default on every invocation.
- 🔀 **Smart Auto-Routing & Subagent Model Choice**: Subagents can choose their own models dynamically via `omniroute/auto` or be pinned to dedicated model routes.
- 🛡️ **Direct Native Fallback**: Automatic fallback to native provider API keys in `~/.config/opencode/env` if the proxy server is offline.
- 📊 **Web Management Dashboard**: Built-in web UI on `http://localhost:20128` for monitoring request metrics, route performance, and model settings.
- 🔄 **Unified Updater**: Run `opencode update` to upgrade both OpenCode CLI and the OmniRoute gateway proxy.

---

## 📦 Installation

### Prerequisites
- Windows Subsystem for Linux (WSL Ubuntu environment).
- `git` and `curl` installed (`sudo apt update && sudo apt install -y git curl`).

### Step-by-Step Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/paulsyl/Opencode.git /home/paulsyl/projects/opencode-omniroute
   cd /home/paulsyl/projects/opencode-omniroute
   ```

2. **Run the Automated Installer**:
   ```bash
   ./setup-opencode-omniroute.sh
   ```
   *The installer automatically provisions Node 24, builds native SQLite drivers, installs OmniRoute to `~/.omniroute`, downloads OpenCode v1.18.4 binary, syncs Antigravity skills globally to `~/.config/opencode/skills`, and deploys launcher scripts to `~/.local/bin/opencode`.*

---

## ⚙️ Configuration

### 1. Provider Credentials Setup

Edit `~/.config/opencode/env` to add your LLM provider API keys:

```bash
nano ~/.config/opencode/env
```

```env
DEEPSEEK_API_KEY="your-deepseek-key"
GEMINI_API_KEY="your-gemini-key"
ANTHROPIC_API_KEY="your-anthropic-key"
OPENAI_API_KEY="your-openai-key"
```

### 2. OpenCode Configuration Schema

The global configuration file is deployed at `~/.config/opencode/opencode.json` (OpenCode v1.18 schema with `"reasoning": true` enabled for cognitive thinking indicators):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "omniroute/auto",
  "small_model": "omniroute/auto",
  "instructions": [
    "/home/paulsyl/.config/opencode/instructions/GEMINI.md",
    "/home/paulsyl/.config/opencode/instructions/global_gemini_rules.md"
  ],
  "skills": {
    "paths": [
      "/home/paulsyl/.config/opencode/skills"
    ]
  },
  "agent": {
    "architect": {
      "model": "omniroute/deepseek-r1",
      "description": "Translate PRD requirements into vertical-sliced technical blueprints",
      "mode": "all"
    },
    "executor": {
      "model": "omniroute/gemini-2.0-flash",
      "description": "Build and implement code phase-by-phase with escape hatch error handling",
      "mode": "all"
    },
    "review-council": {
      "model": "omniroute/claude-3.5-sonnet",
      "description": "Multi-persona code review council validating plans against PRDs",
      "mode": "all"
    },
    "specifier-grill": { "description": "Interactive round-based interview grilling for requirements alignment", "mode": "all" },
    "specifier-prd": { "description": "Generates canonical Product Requirements Document (PRD)", "mode": "all" },
    "orchestrator": { "description": "Chains full SDLC pipeline automatically", "mode": "all" },
    "prototype": { "description": "Throwaway rapid exploration without ceremony", "mode": "all" },
    "ponytail": { "description": "Enforces minimal, lazy, zero-boilerplate code standards (YAGNI)", "mode": "all" },
    "qa-orchestrator": { "description": "Runs black-box QA testing pipeline against PRD requirements", "mode": "all" }
  },
  "provider": {
    "omniroute": {
      "name": "OmniRoute Gateway",
      "npm": "@ai-sdk/openai",
      "options": {
        "baseURL": "http://localhost:20128/v1",
        "apiKey": "omniroute-local"
      },
      "models": {
        "auto": {
          "name": "OmniRoute Auto Router",
          "reasoning": true,
          "limit": { "context": 200000, "output": 8192 }
        },
        "deepseek-r1": {
          "name": "DeepSeek R1",
          "reasoning": true,
          "limit": { "context": 128000, "output": 8192 }
        }
      }
    }
  }
}
```

### 3. Web Dashboard Management

OmniRoute features an interactive Web UI for managing routes and monitoring API traffic.

- **Dashboard URL**: [http://localhost:20128](http://localhost:20128)
- **Default Password**: `CHANGEME` *(Update under Settings upon first login)*

---

## 💻 Usage & Subagent Model Assignment

### 1. Launching OpenCode CLI

Launch OpenCode from any directory. The smart wrapper daemon launcher will automatically boot OmniRoute on port `20128` if it is not already running:

```bash
# Launch interactive TUI with auto-router
opencode

# Launch with explicit model target
opencode -m omniroute/deepseek-r1
```

---

### 2. Visual Cognitive Thinking Completion Indicator

When invoking reasoning models (such as **DeepSeek R1**) or reasoning-enabled routes (`omniroute/auto`), OpenCode CLI displays a visual thinking indicator in real time:

- **During Thinking**:
  Shows a live spinner and token counter:
  ```text
  🧠 Thinking (12.4s, 3,420 reasoning tokens)...
  ```

- **Upon Thinking Completion**:
  As soon as reasoning completes and final output generation starts, the indicator collapses with a green checkmark:
  ```text
  🧠 Thinking (12.4s, 3,420 tokens) ✓
  ```
  The CLI then immediately streams the generated response and code changes.

---

### 3. Assigning Models to Subagents

Subagents can either choose their models dynamically through OmniRoute's auto-router or be pinned to specific model routes.

#### Method A: Dynamic Auto-Routing (Default)
When `"model": "omniroute/auto"` is set, subagents send requests to OmniRoute's **Auto-Router**. OmniRoute inspects the subagent's task (e.g. reasoning vs code generation vs review) and dynamically selects the best model.

#### Method B: Pinning Models to Agents in `opencode.json`
To assign specific models to specific agents permanently, add `"model"` to the agent entry in `~/.config/opencode/opencode.json`:

```json
{
  "agent": {
    "architect": {
      "model": "omniroute/deepseek-r1",
      "description": "Uses DeepSeek R1 reasoning for architecture blueprints"
    },
    "executor": {
      "model": "omniroute/gemini-2.0-flash",
      "description": "Uses Gemini 2.0 Flash for fast code implementation"
    },
    "review-council": {
      "model": "omniroute/claude-3.5-sonnet",
      "description": "Uses Claude 3.5 Sonnet for code reviews"
    }
  }
}
```

#### Method C: CLI Runtime Override
Override any subagent's model directly on command line invocation:

```bash
# List all available models
opencode models

# Run a specific subagent with a specific model
opencode --agent architect --model omniroute/deepseek-r1
opencode --agent executor --model omniroute/gemini-2.0-flash
opencode --agent review-council --model omniroute/claude-3.5-sonnet
```

---

### 4. Antigravity Agents & Skills Invocation

All Antigravity agents are available globally in every session:

| Agent / Skill | Trigger / Command | Default / Preferred Model | Purpose |
| :--- | :--- | :--- | :--- |
| **Specifier Grill** | `@specifier-grill` | `omniroute/auto` | Interactive interview grilling to align requirements |
| **Specifier PRD** | `@specifier-prd` | `omniroute/auto` | Generates immutable Product Requirements Document |
| **Architect** | `@architect` | `omniroute/deepseek-r1` | Translates PRDs into vertical-sliced technical blueprints |
| **Review Council** | `@review-council` | `omniroute/claude-3.5-sonnet` | Multi-persona adversarial review council (Security, Data, Scope, Tests) |
| **Executor** | `@executor` | `omniroute/gemini-2.0-flash` | Phase-by-phase implementation builder with escape hatch handling |
| **Orchestrator** | `@orchestrator` | `omniroute/auto` | Chains full 4-Stage SDLC pipeline automatically |
| **Prototype** | `@prototype` | `omniroute/auto` | Rapid throwaway exploration without ceremony |
| **Ponytail** | `@ponytail` | `omniroute/auto` | Enforces lazy senior dev principles (YAGNI, minimal code) |
| **QA Orchestrator**| `@qa-orchestrator` | `omniroute/auto` | Black-box QA pipeline testing against PRDs |

---

### 5. Updating & Maintenance

To update both OpenCode CLI and the OmniRoute gateway to the latest releases:

```bash
opencode update
```

---

## 📁 Repository Structure

```
opencode-omniroute/
├── README.md                           # Main documentation
├── setup-opencode-omniroute.sh         # Master installer & maintenance entry point
├── scripts/
│   ├── install-omniroute.sh           # OmniRoute gateway setup & Node 24 provisioning
│   ├── install-opencode.sh            # OpenCode CLI binary downloader (v1.18.4)
│   ├── configure-agent.sh             # Antigravity repo sync & opencode.json generator
│   ├── link-wrapper.sh                # Smart wrapper daemon script linker
│   └── link-antigravity-global.sh     # Global skills & instructions symlinker
├── templates/
│   └── opencode-wrapper.sh            # Smart launcher daemon wrapper
└── docs/
    ├── ARCHITECTURE.md                 # Technical architecture specs
    ├── QUICKSTART.md                   # Quickstart guide
    └── TROUBLESHOOTING.md              # Troubleshooting guide
```

---

## 📄 License

MIT License.
