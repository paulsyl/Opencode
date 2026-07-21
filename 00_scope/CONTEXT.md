# Project Context

## Language

**OpenCode**:
An open-source terminal AI coding agent (CLI / TUI) installed in WSL environment, configured to use OmniRoute as its primary OpenAI-compatible provider with direct API keys as fallback.

**OmniRoute**:
A unified local AI gateway proxy server (`diegosouzapw/OmniRoute`) installed at `~/.omniroute` running locally in WSL on port `20128`. Routes across DeepSeek (V3/R1), Gemini (2.0 Flash/1.5 Pro), Claude (3.5 Sonnet), OpenAI (GPT-4o), and Qwen.

**Launcher Script (`opencode`)**:
A custom bash wrapper script located at `~/.local/bin/opencode` that checks if OmniRoute daemon (`http://localhost:20128/health`) is running, auto-starts OmniRoute in background if offline, and delegates arguments to `opencode` core binary.

**Automated Setup & Upgrade (`setup-opencode-omniroute.sh`)**:
A single, self-contained shell script that installs dependencies (Node.js/git/opencode), sets up OmniRoute, configures `opencode.json` with primary OmniRoute profiles and direct fallback providers, creates launcher wrappers, supports `--update` for seamless maintenance, and generates comprehensive documentation.

**Unified Update Lifecycle**:
Intercepting `opencode update` or running `./setup-opencode-omniroute.sh --update` automatically upgrades both the core OpenCode CLI binary via official script and the OmniRoute gateway codebase (`git pull && npm install`).


**Documentation Standard**:
Comprehensive documentation including architecture diagram, quickstart guide, configuration reference, and maintenance commands adhering to project documentation standards.
