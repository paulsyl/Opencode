# PRD: OpenCode + OmniRoute Integration CLI Setup

## Overview

This project establishes a unified, cost-effective terminal AI coding CLI environment inside Windows Subsystem for Linux (WSL Ubuntu). It integrates **OpenCode** (terminal AI coding agent) with **OmniRoute** (local AI gateway proxy server running on port `20128`) to provide seamless access to low-cost frontier models including DeepSeek (V3/R1), Google Gemini (2.0 Flash/1.5 Pro), Anthropic Claude (3.5 Sonnet), OpenAI (GPT-4o), and Qwen. The integration features transparent daemon auto-starting via a custom launcher wrapper, local credential management, direct native API key fallbacks in OpenCode, automated installation via a single setup script, and full documentation.

## Functional Requirements

1. **WSL Environment Target**: All installation, service configuration, and execution targets must run natively within WSL (Ubuntu Linux).
2. **OmniRoute Gateway Installation & Service**:
   - OmniRoute repository (`diegosouzapw/OmniRoute`) must be cloned into `~/.omniroute` with Node.js dependencies installed via `npm install`.
   - OmniRoute gateway must serve an OpenAI-compatible endpoint at `http://localhost:20128/v1` with health status endpoint at `http://localhost:20128/health`.
   - OmniRoute must be configured to route requests across DeepSeek (V3/R1), Gemini (2.0 Flash/1.5 Pro), Claude (3.5 Sonnet), OpenAI (GPT-4o), and Qwen models.
3. **OpenCode Agent Setup & Configuration**:
   - OpenCode CLI binary must be installed in WSL (`~/.local/bin/opencode-core` or official installer path).
   - `~/.config/opencode/opencode.json` must configure OmniRoute (`http://localhost:20128/v1`) as the primary OpenAI-compatible provider.
   - Model aliases in `opencode.json` must expose intelligent auto-routing (`omniroute/auto`), explicit frontier model profiles (`omniroute/deepseek-r1`, `omniroute/gemini-2.0-flash`, etc.), and direct native fallback entries (`gemini-2.0-flash`, `deepseek-chat`).
4. **Transparent Service Launcher (`opencode`)**:
   - A bash executable wrapper installed at `~/.local/bin/opencode` must wrap all OpenCode invocations.
   - Before passing CLI arguments to OpenCode, the launcher must ping `http://localhost:20128/health`.
   - If the endpoint returns non-200 or connection refused, the launcher must auto-start OmniRoute as a background process (`npm start` inside `~/.omniroute` logging to `~/.omniroute/log/service.log`) and wait up to 5 seconds for health check pass before executing OpenCode.
   - If OmniRoute fails to start within 5 seconds, the launcher must output a clear diagnostic warning log and allow OpenCode to run using direct native fallback provider credentials.
5. **Credential Management**:
   - OmniRoute local database (`~/.config/omniroute/`) and web dashboard (`http://localhost:20128/dashboard`) manage API keys for proxy routing.
   - OpenCode fallback environment file (`~/.config/opencode/env`) stores fallback API keys (`DEEPSEEK_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`).
6. **Automated Setup & Upgrade Script (`setup-opencode-omniroute.sh`)**:
   - A single, self-contained shell script that verifies Node.js/git prerequisites, clones OmniRoute, installs OpenCode, writes `opencode.json` and launcher script, prompts for API keys interactively (or accepts `.env` file input), and verifies health checks.
   - Accepts an `--update` flag to update both OpenCode CLI and OmniRoute gateway automatically.
7. **Unified CLI Upgrade Command (`opencode update`)**:
   - The wrapper script (`~/.local/bin/opencode`) intercepts `update` / `upgrade` subcommands.
   - Executing `opencode update` updates OpenCode binary (`curl -fsSL https://opencode.ai/install | bash`), updates OmniRoute repository (`git pull && npm install` in `~/.omniroute`), and restarts the local OmniRoute gateway service smoothly.
8. **Comprehensive Documentation**:
   - Full documentation set including `README.md`, architecture overview, setup guide, model configuration reference, maintenance/troubleshooting, and upgrade instructions.


## Non-Functional Requirements

1. **Performance & Latency**: Health check ping in launcher wrapper must complete within <100ms when OmniRoute daemon is already running.
2. **Resource Efficiency**: OmniRoute background process memory usage must remain lightweight (<150MB RSS baseline).
3. **Reliability & Availability**: Failover to direct OpenCode provider models must occur transparently without hanging the CLI session if OmniRoute proxy crashes or rate-limits.
4. **Security & Confidentiality**: API keys must be saved with restrictive file permissions (`chmod 600`) and never exposed in command-line arguments or committed to repository version control.

## Data Model Requirements

1. **OpenCode Configuration Schema (`~/.config/opencode/opencode.json`)**:
   - `provider`: Custom OpenAI-compatible endpoint pointing to `http://localhost:20128/v1`.
   - `models`: Dictionary mapping model IDs and friendly aliases (e.g. `omniroute/auto`, `omniroute/deepseek-r1`, `omniroute/gemini-2.0-flash`).
   - `fallback_providers`: Native provider definitions for direct Google, DeepSeek, Anthropic, and OpenAI API calls.
2. **OmniRoute Environment Schema (`~/.config/omniroute/.env`)**:
   - `PORT=20128`
   - Provider API Key parameters (`DEEPSEEK_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`).

## Edge Cases & Failure States

1. **Port 20128 Conflict**: If port 20128 is occupied by an unrelated process, launcher must output an error specifying the process PID and recommend port reallocation or process termination.
2. **Missing Node.js / NPM**: Automated setup script must detect missing dependencies and provide single-command WSL installation instructions (`sudo apt update && sudo apt install -y nodejs npm`).
3. **OmniRoute Process Crash During Active Session**: If OmniRoute process terminates while OpenCode is mid-session, OpenCode CLI must fall back to direct native provider credentials without crashing the user's terminal session.
4. **Network Offline / Disconnected State**: If local network has no internet access, launcher must detect network isolation and inform the user before attempting API connections.

## Out of Scope

- Building a custom GUI application (web dashboard provided natively by OmniRoute is sufficient).
- Containerizing OmniRoute in Docker (WSL native process installation preferred for speed and simplicity).
- Developing custom LLM model weights (uses commercial/open API endpoints).

## Acceptance Criteria

1. **Prerequisite & Setup Verification**:
   - Executing `./setup-opencode-omniroute.sh` completes cleanly with zero non-zero exit codes.
   - `~/.omniroute` contains cloned OmniRoute codebase with `node_modules` present.
   - `~/.local/bin/opencode` exists and is executable (`chmod +x`).
2. **Daemon Auto-Start & Health Check**:
   - Running `opencode --version` when OmniRoute is stopped automatically starts OmniRoute in background and prints health status confirmation.
   - `curl -s http://localhost:20128/health` returns `{"status":"ok"}` (or HTTP 200).
3. **Multi-Model Routing Execution**:
   - Invoking `opencode` with model `omniroute/deepseek-r1` routes successfully through OmniRoute to DeepSeek.
   - Invoking `opencode` with model `omniroute/gemini-2.0-flash` routes successfully through OmniRoute to Gemini.
4. **Direct Fallback Verification**:
   - Stopping OmniRoute daemon manually (`pkill -f omniroute`) and running `opencode` with direct fallback profile falls back to direct API key without hanging.
5. **Unified Update Verification**:
   - Running `opencode update` (or `./setup-opencode-omniroute.sh --update`) pulls the latest release of OmniRoute from GitHub, installs any package updates, re-runs OpenCode's installer, and verifies daemon health.
6. **Documentation Completeness**:
   - Repository contains clear, structured documentation (`README.md`, architecture diagram, configuration manual) fulfilling all project documentation standards.

