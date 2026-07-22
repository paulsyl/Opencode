# OpenCode + Direct Provider Routing + Antigravity Integration

A unified, high-performance terminal AI coding environment built inside Windows Subsystem for Linux (WSL Ubuntu).

It integrates:
- **OpenCode CLI (v1.18.4)**: Terminal AI coding agent executing directly against provider APIs.
- **Direct Provider Routing**: Direct HTTPS routing to DeepSeek and Google AI Studio APIs (including Gemini and Claude models) using native API keys.
- **Antigravity Agents & Skills**: Pre-loaded global SDLC workflows, rules, and skills imported from [paulsyl/Antigravity](https://github.com/paulsyl/Antigravity).

---

## 🚀 Features

- ⚡ **Zero-Dependency Installer**: Sets up Node 24 runtime, OpenCode CLI, Antigravity skills, and smart wrapper scripts automatically.
- 🔑 **Interactive Key Management (`opencode keys`)**: View masked status, add, or remove provider API keys with auto-invalidation of cached catalogs.
- 🔒 **Provider API Key Gating**: Only models from providers with configured API keys are displayed or usable.
- 🌐 **Live Model Catalog Query & 1h Cache**: Queries upstream `/v1/models` (DeepSeek) and `/v1beta/models` (Google AI Studio) live, cached locally for 1 hour.
- 🤖 **Pre-Loaded Antigravity SDLC Agents**: `@architect`, `@executor`, `@review-council`, `@specifier-grill`, `@specifier-prd`, `@orchestrator`, `@prototype`, `@ponytail`, and `@qa-orchestrator` loaded globally by default.
- 📈 **Post-Task Execution Metrics**: Displays a formatted, colorized terminal summary box after every task detailing the model(s) used, prompt/completion token counts, execution duration, and estimated cost.
- 🔄 **Unified Updater**: Run `opencode update` to upgrade the OpenCode CLI binary.

---

## 📦 Installation & Quickstart

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

3. **Configure API Keys**:
   ```bash
   opencode keys set deepseek <your-deepseek-api-key>
   opencode keys set gemini <your-gemini-api-key>
   ```

4. **Verify Provider Keys & Available Models**:
   ```bash
   opencode keys list
   ```

---

## ⚙️ Configuration & Key Management

### `opencode keys` Subcommand

Manage provider API keys interactively:

```bash
# List configured keys and cached model counts
opencode keys list

# Set or update API key for DeepSeek or Google AI Studio (Gemini/Claude)
opencode keys set deepseek sk-xxxx
opencode keys set gemini AQ.xxxx

# Remove API key
opencode keys remove deepseek
```

API keys are stored securely in `~/.config/opencode/env` (`mode 0600`) and provider definitions are synchronized automatically in `~/.config/opencode/opencode.json`.

---

## 💻 Agent Persona Model Mapping (`opencode agent-map`)

Launch interactive arrow-key TTY selection to bind agent personas to designated provider models:

```bash
opencode agent-map
```

Mappings are persisted atomically to `.agents/agent-models.json` and synced to `~/.config/opencode/opencode.json`.

| Agent / Skill | Trigger / Command | Default / Preferred Model | Purpose |
| :--- | :--- | :--- | :--- |
| **Specifier Grill** | `@specifier-grill` | `gemini/gemini-2.5-pro` | Interactive interview grilling to align requirements |
| **Specifier PRD** | `@specifier-prd` | `gemini/gemini-2.5-pro` | Generates canonical Product Requirements Document |
| **Architect** | `@architect` | `deepseek/deepseek-reasoner` | Translates PRDs into vertical-sliced technical blueprints |
| **Review Council** | `@review-council` | `deepseek/deepseek-reasoner` | Multi-persona adversarial review council (Security, Data, Scope, Tests) |
| **Executor** | `@executor` | `gemini/gemini-2.5-pro` | Phase-by-phase implementation builder with escape hatch handling |
| **Orchestrator** | `@orchestrator` | `gemini/gemini-2.5-pro` | Chains full SDLC pipeline automatically |
| **Prototype** | `@prototype` | `gemini/gemini-2.5-pro` | Rapid throwaway exploration without ceremony |
| **Ponytail** | `@ponytail` | `gemini/gemini-2.5-pro` | Enforces minimal, lazy, zero-boilerplate code standards (YAGNI) |
| **QA Orchestrator**| `@qa-orchestrator` | `gemini/gemini-2.5-pro` | Black-box QA pipeline testing against PRDs |

---

## 📁 Repository Structure

```
opencode-omniroute/
├── README.md                           # Main documentation
├── setup-opencode-omniroute.sh         # Master installer & maintenance entry point
├── scripts/
│   ├── provider-catalog.js            # Live model catalog query, key gating & cache engine
│   ├── opencode-keys.js               # Interactive key manager CLI (opencode keys)
│   ├── agent-discovery.js             # Workspace skill scanner & model grouper
│   ├── agent-map-cli.js               # Arrow-key TTY UI for agent-model mapping
│   ├── fail-fast-reroute.js           # Key-gated fail-fast rerouting engine
│   └── configure-agent.sh             # Direct provider config generator
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
