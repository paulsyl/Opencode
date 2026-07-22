#!/usr/bin/env python3
"""
sync-agent-frontmatter.py - Dynamic Front Matter Agent Model Sync
Scans all SKILL.md files in ~/.config/opencode/skills/ and Antigravity plugins,
extracts YAML front matter (name, description, model, mode), and updates
~/.config/opencode/opencode.json so model selection is read directly from agent front matter.
"""

import os
import sys
import glob
import json
import re


def parse_front_matter(filepath):
    """Simple YAML front matter parser between --- and --- markers."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception:
        return None

    match = re.match(r"^\s*---\s*\n(.*?)\n---\s*\n", content, re.DOTALL)
    if not match:
        return None

    yaml_block = match.group(1)
    data = {}
    current_key = None
    current_val_lines = []

    for line in yaml_block.splitlines():
        # Match key: value or key: >
        key_match = re.match(r"^([a-zA-Z0-9_\-]+):\s*(.*)$", line)
        if key_match:
            if current_key:
                data[current_key] = " ".join(current_val_lines).strip()
            current_key = key_match.group(1).strip()
            val = key_match.group(2).strip()
            if val in (">", "|"):
                current_val_lines = []
            else:
                # Strip quotes if enclosed
                if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                    val = val[1:-1]
                current_val_lines = [val]
        elif current_key and line.startswith("  "):
            current_val_lines.append(line.strip())

    if current_key:
        data[current_key] = " ".join(current_val_lines).strip()

    return data


def sync():
    opencode_json_path = os.path.expanduser("~/.config/opencode/opencode.json")
    skills_dir = os.path.expanduser("~/.config/opencode/skills")
    antigravity_dir = os.path.expanduser("~/.config/opencode/antigravity")

    if not os.path.exists(opencode_json_path):
        print(f"[!] {opencode_json_path} does not exist yet.")
        return

    try:
        with open(opencode_json_path, "r", encoding="utf-8") as f:
            opencode_cfg = json.load(f)
    except Exception as e:
        print(f"[!] Error reading {opencode_json_path}: {e}")
        return

    if "agent" not in opencode_cfg:
        opencode_cfg["agent"] = {}

    # Load matrix mappings from local or global agent-models.json
    matrix_mappings = {}
    for matrix_file in [".agents/agent-models.json", os.path.expanduser("~/.config/opencode/agent-models.json")]:
        if os.path.exists(matrix_file):
            try:
                with open(matrix_file, "r", encoding="utf-8") as mf:
                    mcfg = json.load(mf)
                    if "mappings" in mcfg:
                        matrix_mappings.update(mcfg["mappings"])
            except Exception:
                pass

    skill_md_files = []

    if os.path.exists(skills_dir):
        for entry in os.listdir(skills_dir):
            full_path = os.path.join(skills_dir, entry)
            target_path = os.path.realpath(full_path)
            skill_md = os.path.join(target_path, "SKILL.md")
            if os.path.isfile(skill_md):
                skill_md_files.append(skill_md)

    if os.path.exists(antigravity_dir):
        for root, dirs, files in os.walk(antigravity_dir):
            if "SKILL.md" in files:
                skill_md_files.append(os.path.join(root, "SKILL.md"))

    # Ensure provider.omniroute.models exists in opencode.json
    if "provider" not in opencode_cfg:
        opencode_cfg["provider"] = {}
    if "omniroute" not in opencode_cfg["provider"]:
        opencode_cfg["provider"]["omniroute"] = {
            "name": "OmniRoute Gateway",
            "npm": "@ai-sdk/openai",
            "options": {
                "baseURL": "http://localhost:20128/v1",
                "apiKey": "omniroute-local"
            },
            "models": {}
        }
    if "models" not in opencode_cfg["provider"]["omniroute"]:
        opencode_cfg["provider"]["omniroute"]["models"] = {}

    omni_models = opencode_cfg["provider"]["omniroute"]["models"]

    def ensure_model_registered(full_model):
        if not full_model:
            return "gemini/gemini-2.0-flash"

        raw_str = full_model.strip()
        if "/" in raw_str:
            provider_part, model_part = raw_str.split("/", 1)
        else:
            m_lower = raw_str.lower()
            if "gemini" in m_lower or "google" in m_lower:
                provider_part = "gemini"
            elif "deepseek" in m_lower or "r1" in m_lower:
                provider_part = "deepseek"
            elif "claude" in m_lower or "opus" in m_lower or "sonnet" in m_lower:
                provider_part = "anthropic"
            elif "gpt" in m_lower or "openai" in m_lower:
                provider_part = "openai"
            else:
                provider_part = "omniroute"
            model_part = raw_str
            raw_str = f"{provider_part}/{model_part}"

        # Register model in provider definition if missing
        if "provider" not in opencode_cfg:
            opencode_cfg["provider"] = {}

        if provider_part not in opencode_cfg["provider"]:
            display_name = provider_part.capitalize()
            opencode_cfg["provider"][provider_part] = {
                "name": f"{display_name} (via OmniRoute)",
                "npm": "@ai-sdk/openai",
                "options": {
                    "baseURL": "http://localhost:20128/v1",
                    "apiKey": "omniroute-local"
                },
                "models": {}
            }

        p_entry = opencode_cfg["provider"][provider_part]
        if "models" not in p_entry:
            p_entry["models"] = {}

        if model_part not in p_entry["models"]:
            p_entry["models"][model_part] = {
                "name": model_part,
                "limit": {"context": 200000, "output": 8192}
            }

        return raw_str

    updated_count = 0
    for smd in set(skill_md_files):
        fm = parse_front_matter(smd)
        if not fm or "name" not in fm:
            continue

        agent_name = fm["name"]
        existing_model = opencode_cfg["agent"].get(agent_name, {}).get("model")
        # Prefer matrix mapping if present, otherwise preserve existing opencode.json model or SKILL.md model
        raw_model = matrix_mappings.get(agent_name, existing_model or fm.get("model", "omniroute/auto"))
        agent_model = ensure_model_registered(raw_model)
        agent_desc = fm.get("description", "")
        agent_mode = fm.get("mode", "all")

        if agent_name not in opencode_cfg["agent"]:
            opencode_cfg["agent"][agent_name] = {}

        cur_agent = opencode_cfg["agent"][agent_name]

        # Sync properties
        cur_agent["model"] = agent_model
        if agent_desc:
            cur_agent["description"] = agent_desc
        if "mode" not in cur_agent:
            cur_agent["mode"] = agent_mode

        updated_count += 1
        print(f"  [+] Synced agent '{agent_name}' -> model: '{agent_model}'")

    # Apply any matrix mappings for agents not necessarily covered by skill.md files
    for agent_name, raw_model in matrix_mappings.items():
        if agent_name not in opencode_cfg["agent"]:
            opencode_cfg["agent"][agent_name] = {}
        agent_model = ensure_model_registered(raw_model)
        opencode_cfg["agent"][agent_name]["model"] = agent_model

    # Write back updated opencode.json
    with open(opencode_json_path, "w", encoding="utf-8") as f:
        json.dump(opencode_cfg, f, indent=2)

    print(f"[+] Successfully synchronized front matter models for {updated_count} agents into {opencode_json_path}.")


if __name__ == "__main__":
    sync()
