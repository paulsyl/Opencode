# System Architecture: OpenCode + OmniRoute Integration CLI

## Overview

The **OpenCode + OmniRoute Integration CLI** provides a unified, cost-optimized terminal AI development environment in native WSL (Ubuntu Linux). It bridges **OpenCode** (a terminal AI coding agent) with **OmniRoute** (a local AI gateway server running on port `20128`) to route requests across multiple LLM providers—including DeepSeek (V3 & R1), Google Gemini (2.0 Flash & 1.5 Pro), Anthropic Claude (3.5 Sonnet), OpenAI (GPT-4o), and Qwen.

The system features:
1. Transparent daemon management via a custom bash wrapper (`~/.local/bin/opencode`).
2. Single-pass updates (`opencode update` / `./setup-opencode-omniroute.sh --update`).
3. Direct native API key fallbacks in OpenCode if the local proxy gateway is offline.
4. Comprehensive project documentation standard.

---

## Architectural Diagrams

### 1. System Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User as Developer Terminal
    participant Wrapper as Launcher Script (~/.local/bin/opencode)
    participant Gateway as OmniRoute Proxy (localhost:20128)
    participant OpenCode as OpenCode Core Binary
    participant Provider as External LLM Provider (DeepSeek / Gemini / Claude)

    User->>Wrapper: opencode [args...]
    alt Command is "opencode update"
        Wrapper->>Wrapper: Re-run OpenCode installer
        Wrapper->>Gateway: git pull & npm install in ~/.omniroute
        Wrapper->>Gateway: Restart daemon
        Wrapper-->>User: Upgrade complete
    else Normal Execution
        Wrapper->>Gateway: GET http://localhost:20128/health
        alt Gateway is Offline
            Wrapper->>Gateway: Launch daemon in background (npm start > service.log)
            Wrapper->>Wrapper: Wait up to 5s for health check pass
        end
        alt Gateway Ready
            Wrapper->>OpenCode: Exec opencode-core --config ~/.config/opencode/opencode.json [args]
            OpenCode->>Gateway: POST http://localhost:20128/v1/chat/completions
            Gateway->>Provider: Forward request with managed/quota API keys
            Provider-->>Gateway: Streaming response
            Gateway-->>OpenCode: Stream output
            OpenCode-->>User: Terminal UI response
        else Gateway Health Timeout / Failure
            Wrapper->>OpenCode: Exec opencode-core with Direct Native Fallback
            OpenCode->>Provider: Direct API call using DEEPSEEK_API_KEY / GEMINI_API_KEY
            Provider-->>OpenCode: Direct response stream
            OpenCode-->>User: Terminal UI response (Direct Fallback mode)
        end
    end
```

### 2. Component Topology Diagram

```mermaid
flowchart TD
    subgraph WSL_Environment["WSL Ubuntu Environment (~/ / ~/.local / ~/.config)"]
        subgraph Terminal_Entry["User Execution"]
            CLI_Cmd["opencode command"]
        end

        subgraph Launcher_Layer["Launcher Wrapper (~/.local/bin/opencode)"]
            Health_Check["Health Checker (curl localhost:20128/health)"]
            Daemon_Mgr["Daemon Auto-Starter"]
            Update_Intercept["Update Handler (opencode update)"]
        end

        subgraph Core_Agent["OpenCode Agent"]
            OpenCode_Core["opencode-core binary"]
            OpenCode_Config["~/.config/opencode/opencode.json"]
            Fallback_Env["~/.config/opencode/env"]
        end

        subgraph Proxy_Gateway["OmniRoute Local Server (~/.omniroute)"]
            Omni_Server["Node.js Gateway (Port 20128)"]
            Omni_DB["Local Credentials (~/.config/omniroute/)"]
            Omni_Router["Intelligent Model Router & Token Compressor"]
        end

        CLI_Cmd --> Update_Intercept
        Update_Intercept -- Normal Run --> Health_Check
        Health_Check -- Offline --> Daemon_Mgr
        Daemon_Mgr --> Omni_Server
        Health_Check -- Healthy/Started --> OpenCode_Core
        OpenCode_Core --> OpenCode_Config
        OpenCode_Config -- Primary Endpoint --> Omni_Server
        Omni_Server --> Omni_DB
        Omni_Server --> Omni_Router
        OpenCode_Config -- Fallback Route --> Fallback_Env
    end

    subgraph LLM_Cloud_Providers["Cloud LLM APIs"]
        DeepSeek_API["DeepSeek (V3 / R1)"]
        Gemini_API["Google Gemini (2.0 Flash / 1.5 Pro)"]
        Claude_API["Anthropic Claude (3.5 Sonnet)"]
        OpenAI_API["OpenAI (GPT-4o)"]
        Qwen_API["Qwen Models"]
    end

    Omni_Router --> DeepSeek_API
    Omni_Router --> Gemini_API
    Omni_Router --> Claude_API
    Omni_Router --> OpenAI_API
    Omni_Router --> Qwen_API

    Fallback_Env .-> DeepSeek_API
    Fallback_Env .-> Gemini_API
```

---

## Codebase Impact Analysis

- **Impact Level**: Low-Medium (New repository configuration, launcher wrapper scripts, and automated installer setup without altering existing upstream packages).
- **Files Created / Configured**:
  - `setup-opencode-omniroute.sh`: Single-command installer & maintainer script.
  - `templates/opencode.json.template`: OpenCode primary & fallback configuration template.
  - `templates/opencode-wrapper.sh.template`: Smart bash launcher wrapper.
  - `README.md`: Master project documentation.
  - `docs/ARCHITECTURE.md`: Technical architecture reference.
  - `docs/QUICKSTART.md`: Step-by-step setup guide.
  - `docs/TROUBLESHOOTING.md`: Maintenance and troubleshooting manual.

---

## Vertical-Sliced Build Phases

The implementation is structured into 5 vertical slices:

1. **Phase 1 — OmniRoute Gateway Setup & Health Verification**: Install OmniRoute into `~/.omniroute`, configure port `20128`, write health check validator script, and verify `/health` endpoint.
2. **Phase 2 — OpenCode Agent Configuration & Model Aliases**: Generate `opencode.json` with primary OmniRoute profiles (`omniroute/auto`, `omniroute/deepseek-r1`, `omniroute/gemini-2.0-flash`) and direct fallback definitions.
3. **Phase 3 — Smart Launcher Wrapper (`opencode`)**: Implement `~/.local/bin/opencode` wrapper with health-checking daemon auto-start and `opencode update` pass-through interception.
4. **Phase 4 — Automated Setup Script (`setup-opencode-omniroute.sh`)**: Create self-contained installer script handling prerequisite validation, setup, key prompts, `--update` flag, and automated verification suite.
5. **Phase 5 — Repository Documentation Standard**: Produce complete project documentation suite (`README.md`, `ARCHITECTURE.md`, `QUICKSTART.md`, `TROUBLESHOOTING.md`).
