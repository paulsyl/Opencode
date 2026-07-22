# System Architecture: OpenCode + OmniRoute Integration & Agent Routing

## Overview

The **OpenCode + OmniRoute Integration CLI** provides a unified, cost-optimized terminal AI development environment in native WSL (Ubuntu Linux). It bridges **OpenCode** (a terminal AI coding agent) with **OmniRoute** (a local AI gateway server running on port `20128`) to route requests across multiple LLM providers—including DeepSeek (V3 & R1), Google Gemini (2.0 Flash & 1.5 Pro), Anthropic Claude (3.5 Sonnet), OpenAI (GPT-4o), and Qwen.

Phase 2 expands this integration with:
1. **Per-Project Agent Model Mapping Matrix**: Granular assignment of `core_workflow` agent personas (`architect`, `executor`, `specifier-grill`, `specifier-prd`, `review-council`, `prototype`) to OmniRoute model aliases via `.agents/agent-models.json`.
2. **Interactive CLI Management (`opencode agent-map`)**: TTY-driven terminal interface to view and switch model mappings interactively.
3. **Session Model Injection**: Automated `--model` flag injection based on active persona.
4. **Interactive Fail-Fast Rerouting**: TTY error interception on 503/429/connection drops with interactive failover prompt (and non-TTY auto-fallback).
5. **Daemon Launch Optimization**: Memory-capped (`--max-old-space-size=512`), low-verbosity, keep-alive optimized OmniRoute Node.js daemon.

---

## Architectural Diagrams

### 1. System Sequence Diagram (Agent Persona Routing & Fail-Fast Recovery)

```mermaid
sequenceDiagram
    autonumber
    actor User as Developer Terminal
    participant Wrapper as Launcher Wrapper (~/.local/bin/opencode)
    participant Mapping as Matrix (.agents/agent-models.json)
    participant Gateway as OmniRoute Proxy (localhost:20128)
    participant OpenCode as OpenCode Core Binary
    participant Provider as External LLM Provider

    User->>Wrapper: opencode <agent-persona> [args...]
    alt Subcommand is "agent-map"
        Wrapper->>User: Launch Interactive TTY Menu
        User->>Wrapper: Select new model mapping
        Wrapper->>Mapping: Atomically update .agents/agent-models.json
        Wrapper-->>User: Mapping saved successfully
    else Persona Execution
        Wrapper->>Mapping: Resolve model for persona (e.g. architect -> omniroute/deepseek-r1)
        Wrapper->>Gateway: GET http://localhost:20128/health
        alt Gateway Offline
            Wrapper->>Gateway: Launch daemon (memory limit 512MB, optimized keepalive)
        end
        Wrapper->>OpenCode: Exec opencode-core --model <mapped-model> [args]
        OpenCode->>Gateway: POST http://localhost:20128/v1/chat/completions
        alt Provider Failure (503 / 429 / Timeout)
            Gateway-->>OpenCode: API Error Response
            OpenCode-->>Wrapper: Non-zero Exit / Error Log
            alt Interactive TTY Session
                Wrapper->>User: Display Fail-Fast Reroute Menu
                User->>Wrapper: Select alternative model profile
                Wrapper->>OpenCode: Resume session with selected fallback model
            else Non-TTY / Pipeline Session
                Wrapper->>Mapping: Resolve fallback.default model
                Wrapper->>OpenCode: Auto-retry session with default fallback
            end
        else Success
            Gateway->>Provider: Forward LLM request
            Provider-->>Gateway: Response Stream
            Gateway-->>OpenCode: Stream output
            OpenCode-->>User: Render output in terminal
        end
    end
```

### 2. Component Topology Diagram

```mermaid
flowchart TD
    subgraph WSL_Environment["WSL Ubuntu Environment (~/ / ~/.local / ~/.config)"]
        subgraph Terminal_Entry["User Execution"]
            CLI_Agent["opencode <persona>"]
            CLI_Map["opencode agent-map"]
            CLI_Update["opencode update"]
        end

        subgraph Launcher_Layer["Launcher Wrapper (~/.local/bin/opencode)"]
            Persona_Resolver["Persona Model Resolver"]
            FailFast_Rerouter["Fail-Fast Reroute Engine (TTY / Non-TTY)"]
            TTY_Menu["Interactive agent-map CLI"]
            Daemon_Starter["Daemon Auto-Starter & Optimizer"]
        end

        subgraph Configuration["Configuration & Mapping Layer"]
            Agent_Matrix[".agents/agent-models.json"]
            OpenCode_Config["~/.config/opencode/opencode.json"]
            Fallback_Env["~/.config/opencode/env"]
        end

        subgraph Proxy_Gateway["OmniRoute Local Server (~/.omniroute)"]
            Omni_Server["Node.js Gateway (Port 20128, Node limit 512MB)"]
            Omni_DB["Local Credentials (~/.config/omniroute/)"]
        end

        CLI_Map --> TTY_Menu
        TTY_Menu --> Agent_Matrix
        CLI_Agent --> Persona_Resolver
        Persona_Resolver --> Agent_Matrix
        Persona_Resolver --> Daemon_Starter
        Daemon_Starter --> Omni_Server
        Persona_Resolver --> FailFast_Rerouter
        FailFast_Rerouter --> OpenCode_Config
        OpenCode_Config --> Omni_Server
        Omni_Server --> Omni_DB
    end

    subgraph LLM_Cloud_Providers["Cloud LLM APIs"]
        DeepSeek_API["DeepSeek (V3 / R1)"]
        Gemini_API["Google Gemini (2.0 Flash / 1.5 Pro)"]
        Claude_API["Anthropic Claude (3.5 Sonnet)"]
        OpenAI_API["OpenAI (GPT-4o)"]
    end

    Omni_Server --> DeepSeek_API
    Omni_Server --> Gemini_API
    Omni_Server --> Claude_API
    Omni_Server --> OpenAI_API

    Fallback_Env .-> Gemini_API
    Fallback_Env .-> DeepSeek_API
```

---

## Codebase Impact Analysis

- **Impact Level**: Low-Medium (Wrapper script logic expansion, configuration schema, zero core modifications).
- **Files Created / Modified**:
  - `.agents/agent-models.json`: Declarative mapping schema for workflow agent personas.
  - `templates/agent-models.json.template`: Template file for setup generation.
  - `templates/opencode-wrapper.sh.template` & `~/.local/bin/opencode`: Enhanced launcher wrapper with `agent-map` subcommand, persona injection, fail-fast rerouting, and optimized background daemon boot.
  - `scripts/install-omniroute.sh`: Node.js daemon flag optimizations (`--max-old-space-size=512`).
  - `setup-opencode-omniroute.sh`: Updated setup script to seed `.agents/agent-models.json`.

---

## Vertical-Sliced Build Phases (Iteration v2)

1. **Phase 1 — Agent Model Mapping Matrix Schema & Setup Integration**: Define `.agents/agent-models.json` schema, create template, and update `setup-opencode-omniroute.sh` to generate default matrix upon setup/update.
2. **Phase 2 — Session Model Injection & Interactive CLI (`opencode agent-map`)**: Update wrapper script to parse persona mappings, inject `--model` flags, and provide an interactive ANSI/TTY terminal menu for `opencode agent-map`.
3. **Phase 3 — Interactive Fail-Fast Rerouting Engine**: Add error detection wrapper to intercept 503/429/connection failures, presenting an interactive prompt in TTY or auto-falling back in non-TTY mode.
4. **Phase 4 — OmniRoute Daemon Launch Optimization**: Tune Node.js launch flags (`--max-old-space-size=512`), socket keepalive, log verbosity filtering, and localhost binding in daemon startup scripts.
