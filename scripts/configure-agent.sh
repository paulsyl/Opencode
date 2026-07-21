#!/usr/bin/env bash
set -euo pipefail

# ponytail: minimal OpenCode agent configuration script
export PATH="${HOME}/.local/bin:${PATH}"

CONFIG_DIR="${HOME}/.config/opencode"
mkdir -p "${CONFIG_DIR}"

OPENCODE_JSON="${CONFIG_DIR}/opencode.json"
FALLBACK_ENV="${CONFIG_DIR}/env"

ANTIGRAVITY_DIR="${CONFIG_DIR}/antigravity"
if [ ! -d "${ANTIGRAVITY_DIR}" ]; then
  echo "[+] Cloning Antigravity agents repository..."
  git clone https://github.com/paulsyl/Antigravity.git "${ANTIGRAVITY_DIR}" || true
else
  echo "[+] Syncing Antigravity agents repository..."
  (cd "${ANTIGRAVITY_DIR}" && git pull) || true
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "${SCRIPT_DIR}/link-antigravity-global.sh"

echo "[+] Generating OpenCode configuration at ${OPENCODE_JSON}..."
cat << 'EOF' > "${OPENCODE_JSON}"
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
      "description": "Translate PRD requirements into vertical-sliced technical blueprints",
      "mode": "all"
    },
    "executor": {
      "description": "Build and implement code phase-by-phase with escape hatch error handling",
      "mode": "all"
    },
    "review-council": {
      "description": "Multi-persona code review council validating plans against PRDs",
      "mode": "all"
    },
    "specifier-grill": {
      "description": "Interactive round-based interview grilling for requirements alignment",
      "mode": "all"
    },
    "specifier-prd": {
      "description": "Generates canonical Product Requirements Document (PRD)",
      "mode": "all"
    },
    "orchestrator": {
      "description": "Chains full SDLC pipeline automatically (Specifier -> Architect -> Review -> Executor)",
      "mode": "all"
    },
    "prototype": {
      "description": "Throwaway rapid exploration without ceremony",
      "mode": "all"
    },
    "ponytail": {
      "description": "Enforces minimal, lazy, zero-boilerplate code standards (YAGNI)",
      "mode": "all"
    },
    "qa-orchestrator": {
      "description": "Runs black-box QA testing pipeline against PRD requirements",
      "mode": "all"
    }
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
          "limit": {
            "context": 200000,
            "output": 8192
          }
        },
        "deepseek-r1": {
          "name": "DeepSeek R1",
          "reasoning": true,
          "limit": {
            "context": 128000,
            "output": 8192
          }
        },
        "deepseek-v3": {
          "name": "DeepSeek V3",
          "limit": {
            "context": 128000,
            "output": 8192
          }
        },
        "deepseek-v4": {
          "name": "DeepSeek V4",
          "reasoning": true,
          "limit": {
            "context": 512000,
            "output": 32768
          }
        },
        "gemini-2.0-flash": {
          "name": "Gemini 2.0 Flash",
          "limit": {
            "context": 1000000,
            "output": 8192
          }
        },
        "claude-3.5-sonnet": {
          "name": "Claude 3.5 Sonnet",
          "limit": {
            "context": 200000,
            "output": 8192
          }
        },
        "gpt-4o": {
          "name": "GPT-4o",
          "limit": {
            "context": 128000,
            "output": 4096
          }
        }
      }
    },
    "deepseek": {
      "name": "DeepSeek (via OmniRoute)",
      "npm": "@ai-sdk/openai",
      "options": {
        "baseURL": "http://localhost:20128/v1",
        "apiKey": "omniroute-local"
      },
      "models": {
        "deepseek-r1": {
          "name": "DeepSeek R1",
          "reasoning": true,
          "limit": {
            "context": 128000,
            "output": 8192
          }
        },
        "deepseek-v3": {
          "name": "DeepSeek V3",
          "limit": {
            "context": 128000,
            "output": 8192
          }
        },
        "deepseek-v4": {
          "name": "DeepSeek V4",
          "reasoning": true,
          "limit": {
            "context": 512000,
            "output": 32768
          }
        },
        "deepseek-chat": {
          "name": "DeepSeek Chat",
          "limit": {
            "context": 128000,
            "output": 8192
          }
        },
        "deepseek-reasoner": {
          "name": "DeepSeek Reasoner",
          "reasoning": true,
          "limit": {
            "context": 128000,
            "output": 8192
          }
        }
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
EOF
chmod 600 "${OPENCODE_JSON}"

if [ ! -f "${FALLBACK_ENV}" ]; then
  echo "[+] Creating direct fallback environment file at ${FALLBACK_ENV}..."
  cat << 'EOF' > "${FALLBACK_ENV}"
# Direct Native API Fallback Keys
DEEPSEEK_API_KEY=""
GEMINI_API_KEY=""
ANTHROPIC_API_KEY=""
OPENAI_API_KEY=""
EOF
  chmod 600 "${FALLBACK_ENV}"
fi

echo "[+] Validating opencode.json schema..."
node -e "JSON.parse(require('fs').readFileSync(process.env.HOME + '/.config/opencode/opencode.json'))"

echo "OpenCode configuration deployed successfully."
