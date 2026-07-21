#!/usr/bin/env python3
"""
update-skill-frontmatter.py - Ensures model field exists in SKILL.md YAML front matter.
"""

import os
import glob
import re

AGENT_DEFAULT_MODELS = {
    "architect": "omniroute/deepseek-r1",
    "executor": "omniroute/gemini-2.0-flash",
    "review-council": "omniroute/claude-3.5-sonnet",
    "specifier-grill": "omniroute/auto",
    "specifier-prd": "omniroute/auto",
    "orchestrator": "omniroute/auto",
    "ponytail": "omniroute/auto",
    "prototype": "omniroute/auto",
    "qa-orchestrator": "omniroute/auto",
}

def main():
    antigravity_dir = os.path.expanduser("~/.config/opencode/antigravity")
    if not os.path.exists(antigravity_dir):
        print(f"[!] Antigravity directory {antigravity_dir} not found.")
        return

    skill_files = glob.glob(os.path.join(antigravity_dir, "**", "SKILL.md"), recursive=True)
    for sfile in skill_files:
        try:
            with open(sfile, "r", encoding="utf-8") as f:
                content = f.read()
        except Exception:
            continue

        m = re.match(r"^\s*---\s*\n(.*?)\n---\s*\n(.*)$", content, re.DOTALL)
        if not m:
            continue

        yaml_block, body = m.group(1), m.group(2)
        name_m = re.search(r"^name:\s*(.+)$", yaml_block, re.MULTILINE)
        if not name_m:
            continue

        agent_name = name_m.group(1).strip()
        target_model = AGENT_DEFAULT_MODELS.get(agent_name, "omniroute/auto")

        if "model:" not in yaml_block:
            new_yaml = yaml_block.rstrip() + f"\nmodel: {target_model}\n"
            new_content = f"---\n{new_yaml}---\n{body}"
            with open(sfile, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"[+] Added 'model: {target_model}' to {agent_name} SKILL.md front matter.")

if __name__ == "__main__":
    main()
