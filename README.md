# OpenCode + OmniRoute + Antigravity Integration

A unified, high-performance terminal AI coding environment built inside Windows Subsystem for Linux (WSL Ubuntu).

It integrates:
- **OpenCode CLI (v1.18.4)**: Terminal AI coding agent.
- **OmniRoute Gateway**: Local proxy server running on port `20128` that auto-routes LLM queries across frontier models (DeepSeek R1/V3, Gemini 2.0 Flash, Claude 3.5 Sonnet, GPT-4o).
- **Antigravity Agents & Skills**: Pre-loaded global SDLC workflows, rules, and skills imported from [paulsyl/Antigravity](https://github.com/paulsyl/Antigravity).

---

## 🚀 Features

- ⚡ **Zero-Dependency One-Touch Installer**: `./setup-opencode-omniroute.sh` sets up Node 24 runtime, OmniRoute gateway, OpenCode CLI, Antigravity skills, and smart wrapper scripts automatically.
- 🤖 **Pre-Loaded Antigravity SDLC Agents**: `@architect`, `@executor`, `@review-council`, `@specifier-grill`, `@specifier-prd`, `@orchestrator`, `@prototype`, `@ponytail`, and `@qa-orchestrator` loaded globally by default on every invocation.
- 🔀 **Smart Auto-Routing**: Dynamically routes requests via `omniroute/auto` or specific model aliases.
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

The global configuration file is deployed at `~/.config/opencode/opencode.json` (OpenCode v1.18 schema):

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
    "architect": { "description": "Translate PRD requirements into vertical-sliced technical blueprints", "mode": "all" },
    "executor": { "description": "Build and implement code phase-by-phase with escape hatch error handling", "mode": "all" },
    "review-council": { "description": "Multi-persona code review council validating plans against PRDs", "mode": "all" },
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
      }
    },
    "deepseek": {
      "name": "DeepSeek (via OmniRoute)",
      "npm": "@ai-sdk/openai",
      "options": {
        "baseURL": "http://localhost:20128/v1",
        "apiKey": "omniroute-local"
      }
    },
    "codex": {
      "name": "Codex (via OmniRoute)",
      "npm": "@ai-sdk/openai",
      "options": {
        "baseURL": "http://localhost:20128/v1",
        "apiKey": "omniroute-local"
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

## 💻 Usage

### 1. Launching OpenCode CLI

Launch OpenCode from any directory. The smart wrapper daemon launcher will automatically boot OmniRoute on port `20128` if it is not already running:

```bash
# Launch interactive TUI with auto-router
opencode

# Launch with explicit model target
opencode -m omniroute/deepseek-r1
```

### 2. Available Model Profile Aliases

| Model Alias | Target LLM Provider / Route |
| :--- | :--- |
| `omniroute/auto` | Intelligent Cost & Latency Auto-Router |
| `omniroute/deepseek-r1` | DeepSeek R1 Reasoning |
| `omniroute/deepseek-v3` | DeepSeek V3 Chat |
| `omniroute/gemini-2.0-flash` | Google Gemini 2.0 Flash |
| `omniroute/claude-3.5-sonnet` | Anthropic Claude 3.5 Sonnet |
| `omniroute/gpt-4o` | OpenAI GPT-4o |

### 3. Antigravity Agents & Skills Invocation

All Antigravity agents are available globally in every session:

| Agent / Skill | Trigger / Command | Purpose |
| :--- | :--- | :--- |
| **Specifier Grill** | `@specifier-grill` | Interactive interview grilling to align requirements |
| **Specifier PRD** | `@specifier-prd` | Generates immutable Product Requirements Document |
| **Architect** | `@architect` | Translates PRDs into vertical-sliced technical blueprints |
| **Review Council** | `@review-council` | Multi-persona adversarial review council (Security, Data, Scope, Tests) |
| **Executor** | `@executor` | Phase-by-phase implementation builder with escape hatch handling |
| **Orchestrator** | `@orchestrator` | Chains full 4-Stage SDLC pipeline automatically |
| **Prototype** | `@prototype` | Rapid throwaway exploration without ceremony |
| **Ponytail** | `@ponytail` | Enforces lazy senior dev principles (YAGNI, minimal code) |
| **QA Orchestrator**| `@qa-orchestrator` | Black-box QA pipeline testing against PRDs |

### 4. Updating & Maintenance

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
