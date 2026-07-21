# Phase 2 — OpenCode Agent Configuration & Model Aliases
**Status:** COMPLETE  
**Impact**: Medium  
**Layers Touched**: Configuration, API Provider Layer, Fallback Router  

### Execution Steps
1. Install OpenCode binary in WSL via official installer if missing (`curl -fsSL https://opencode.ai/install | bash`).
2. Create directory `~/.config/opencode`.
3. Generate `~/.config/opencode/opencode.json` defining OmniRoute (`http://localhost:20128/v1`) as primary OpenAI-compatible provider.
4. Define model alias mappings (`omniroute/auto`, `omniroute/deepseek-r1`, `omniroute/gemini-2.0-flash`, `omniroute/claude-3.5-sonnet`, `omniroute/gpt-4o`) and direct fallback providers.

### Code Snippets

#### `templates/opencode.json`
```json
{
  "$schema": "https://opencode.ai/config.schema.json",
  "providers": {
    "omniroute": {
      "type": "openai-compatible",
      "baseUrl": "http://localhost:20128/v1",
      "apiKey": "omniroute-local"
    }
  },
  "models": {
    "omniroute/auto": {
      "provider": "omniroute",
      "model": "auto"
    },
    "omniroute/deepseek-r1": {
      "provider": "omniroute",
      "model": "deepseek-r1"
    },
    "omniroute/deepseek-v3": {
      "provider": "omniroute",
      "model": "deepseek-v3"
    },
    "omniroute/gemini-2.0-flash": {
      "provider": "omniroute",
      "model": "gemini-2.0-flash"
    },
    "omniroute/claude-3.5-sonnet": {
      "provider": "omniroute",
      "model": "claude-3.5-sonnet"
    },
    "omniroute/gpt-4o": {
      "provider": "omniroute",
      "model": "gpt-4o"
    }
  },
  "default_model": "omniroute/auto"
}
```

### Acceptance Criteria
- [ ] OpenCode binary installed at `~/.local/bin/opencode-core` or available system path.
- [ ] `~/.config/opencode/opencode.json` is valid JSON and contains all 6 model aliases.
- [ ] [Negative Test] Malformed JSON structure is rejected during configuration build validation.

### Validation
- **Test**: `node -e "JSON.parse(require('fs').readFileSync(process.env.HOME + '/.config/opencode/opencode.json'))"`
- **Rollback**: `rm -rf ~/.config/opencode`
