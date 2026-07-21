# OpenCode + OmniRoute Integration CLI

A unified, cost-effective terminal AI coding CLI environment inside Windows Subsystem for Linux (WSL Ubuntu). It integrates **OpenCode** (terminal AI coding agent) with **OmniRoute** (local AI gateway proxy server running on port `20128`) to route requests across low-cost frontier models including DeepSeek (V3/R1), Google Gemini (2.0 Flash/1.5 Pro), Anthropic Claude (3.5 Sonnet), OpenAI (GPT-4o), and Qwen.

---

## Features

- 🚀 **Transparent Daemon Management**: Wrapper launcher auto-starts OmniRoute background server on command invocation.
- 🔄 **Unified Maintenance Lifecycle**: `opencode update` updates both OpenCode CLI and OmniRoute gateway.
- 🛡️ **Direct Native Fallback**: Seamless fallback to native API keys (`DEEPSEEK_API_KEY`, `GEMINI_API_KEY`) if the proxy server is offline.
- ⚡ **Zero-Dependency Auto-Installer**: `./setup-opencode-omniroute.sh` sets up Node 22, OmniRoute, OpenCode, configuration schemas, and launcher wrappers in a single run.

---

## Quickstart

```bash
# 1. Clone repository & run installer
./setup-opencode-omniroute.sh

# 2. Launch OpenCode CLI
opencode --model omniroute/auto

# 3. Update both OpenCode & OmniRoute
opencode update
```

---

## Model Profile Mappings

| Model Alias | Gateway Route | Target LLM Provider |
| :--- | :--- | :--- |
| `omniroute/auto` | `auto` | Intelligent Cost & Latency Auto-Router |
| `omniroute/deepseek-r1` | `deepseek-r1` | DeepSeek R1 Reasoning |
| `omniroute/deepseek-v3` | `deepseek-v3` | DeepSeek V3 Chat |
| `omniroute/gemini-2.0-flash` | `gemini-2.0-flash` | Google Gemini 2.0 Flash |
| `omniroute/claude-3.5-sonnet` | `claude-3.5-sonnet` | Anthropic Claude 3.5 Sonnet |
| `omniroute/gpt-4o` | `gpt-4o` | OpenAI GPT-4o |

---

## Documentation

- [System Architecture](docs/ARCHITECTURE.md)
- [Quickstart Guide](docs/QUICKSTART.md)
- [Troubleshooting & Maintenance](docs/TROUBLESHOOTING.md)
