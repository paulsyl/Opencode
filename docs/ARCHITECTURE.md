# Architecture Reference: Direct Provider Routing & Key Gating

## Overview

The **OpenCode Integration** routes AI coding queries directly to upstream provider APIs (DeepSeek and Google AI Studio) using native API keys stored in `~/.config/opencode/env`. The local proxy is removed from the critical path. All model selections are gated by key presence and populated dynamically via live catalog queries.

---

## Component Topology

```mermaid
flowchart TD
    subgraph WSL_Environment["WSL Ubuntu Environment"]
        User_CLI["User CLI / Terminal"] --> Launcher["Launcher Wrapper (~/.local/bin/opencode)"]
        Launcher -->|opencode keys| Key_Manager["Key Manager (opencode-keys.js)"]
        Launcher -->|opencode agent-map| Agent_Map["Agent Mapping TTY UI (agent-map-cli.js)"]
        Launcher -->|Exec| OpenCode_Core["OpenCode Agent (~/.local/bin/opencode-core)"]
        
        Key_Manager --> ENV["~/.config/opencode/env"]
        Key_Manager --> Catalog["Catalog Engine (provider-catalog.js)"]
        Agent_Map --> Catalog
        
        Catalog --> Cache["~/.config/opencode/model-cache.json (1h TTL)"]
    end

    subgraph LLM_Providers["LLM Providers (HTTPS Direct)"]
        Catalog -->|GET /v1/models| DeepSeek["DeepSeek API (api.deepseek.com)"]
        Catalog -->|GET /v1beta/models| Gemini["Google AI Studio API (generativelanguage.googleapis.com)"]
        
        OpenCode_Core -->|Bearer Auth| DeepSeek
        OpenCode_Core -->|API Key Param| Gemini
    end
```

---

## Configuration Files & Locations

| Component | Path / Location | Description |
| :--- | :--- | :--- |
| **Provider API Keys** | `~/.config/opencode/env` | Restricted (`chmod 600`) env file storing `DEEPSEEK_API_KEY` and `GEMINI_API_KEY` |
| **OpenCode Config** | `~/.config/opencode/opencode.json` | Auto-generated provider definitions (`deepseek`, `gemini`) and agent mappings |
| **Model Cache** | `~/.config/opencode/model-cache.json` | 1-hour TTL JSON cache with SHA-256 `keyHash` validation |
| **Agent Matrix** | `.agents/agent-models.json` | Workspace persona-to-model mapping matrix |
