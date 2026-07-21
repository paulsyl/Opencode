#!/usr/bin/env python3
"""
opencode-metrics.py - Post-task metrics reporter for OpenCode + OmniRoute
Aggregates LLM API call logs generated during an opencode command turn and displays
a terminal summary of models used, token consumption, duration, and estimated cost.
"""

import os
import sys
import glob
import json
import time
from datetime import datetime

# Model pricing rates per 1,000,000 tokens (Input, CacheRead, Output)
MODEL_PRICING = {
    "deepseek-r1": (0.55, 0.14, 2.19),
    "deepseek-v3": (0.14, 0.014, 0.28),
    "deepseek-v4": (0.50, 0.10, 2.00),
    "deepseek-chat": (0.14, 0.014, 0.28),
    "deepseek-reasoner": (0.55, 0.14, 2.19),
    "gemini-2.0-flash": (0.10, 0.025, 0.40),
    "claude-3.5-sonnet": (3.00, 0.30, 15.00),
    "gpt-4o": (2.50, 1.25, 10.00),
}
DEFAULT_PRICING = (0.0, 0.0, 0.0)  # Free/Local or unknown default


def get_pricing(model_name):
    if not model_name:
        return DEFAULT_PRICING
    model_lower = str(model_name).lower()
    for k, v in MODEL_PRICING.items():
        if k in model_lower:
            return v
    return DEFAULT_PRICING


def format_tokens(num):
    return f"{num:,}" if num is not None else "0"


def main():
    if len(sys.argv) < 2:
        sys.exit(0)

    try:
        start_time_ms = float(sys.argv[1])
    except ValueError:
        sys.exit(0)

    call_logs_dir = os.path.expanduser("~/.omniroute/call_logs")
    if not os.path.exists(call_logs_dir):
        sys.exit(0)

    # Search JSON logs modified after start_time_ms (convert start_time_ms to seconds for os.path.getmtime)
    start_time_sec = start_time_ms / 1000.0 - 0.5  # 500ms safety buffer for clock skew
    log_files = glob.glob(os.path.join(call_logs_dir, "*", "*.json"))

    matching_logs = []
    for fpath in log_files:
        try:
            mtime = os.path.getmtime(fpath)
            if mtime >= start_time_sec:
                matching_logs.append(fpath)
        except OSError:
            continue

    if not matching_logs:
        sys.exit(0)

    # Sort matching logs by mtime
    matching_logs.sort(key=lambda p: os.path.getmtime(p))

    models_used = set()
    total_input = 0
    total_cache_read = 0
    total_output = 0
    total_duration_ms = 0
    total_cost = 0.0
    valid_calls = 0

    for fpath in matching_logs:
        try:
            with open(fpath, "r", encoding="utf-8") as fp:
                data = json.load(fp)
        except Exception:
            continue

        summary = data.get("summary", {})
        if not summary:
            continue

        # Verify timestamp from summary if available
        ts_str = summary.get("timestamp")
        if ts_str:
            try:
                # ISO timestamp string parsing
                dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                ts_ms = dt.timestamp() * 1000.0
                if ts_ms < (start_time_ms - 1000):
                    continue
            except Exception:
                pass

        valid_calls += 1

        req_model = summary.get("requestedModel") or ""
        act_model = summary.get("model") or ""
        display_model = act_model if act_model else req_model
        if req_model and act_model and req_model != act_model:
            models_used.add(f"{req_model} -> {act_model}")
        elif display_model:
            models_used.add(display_model)

        tokens = summary.get("tokens") or {}
        inp = tokens.get("in") or 0
        cache_read = tokens.get("cacheRead") or 0
        out = tokens.get("out") or 0

        total_input += inp
        total_cache_read += cache_read
        total_output += out

        duration = summary.get("duration") or 0
        total_duration_ms += duration

        # Calculate cost
        log_cost = summary.get("cost")
        if isinstance(log_cost, (int, float)) and log_cost > 0:
            total_cost += log_cost
        else:
            in_rate, cache_rate, out_rate = get_pricing(act_model or req_model)
            # Net input tokens excluding cache read
            net_input = max(0, inp - cache_read)
            call_cost = (
                (net_input / 1_000_000.0) * in_rate
                + (cache_read / 1_000_000.0) * cache_rate
                + (out / 1_000_000.0) * out_rate
            )
            total_cost += call_cost

    if valid_calls == 0:
        sys.exit(0)

    total_tokens = total_input + total_output
    models_str = ", ".join(sorted(models_used)) if models_used else "OmniRoute"
    duration_str = f"{total_duration_ms / 1000.0:.2f}s" if total_duration_ms > 0 else "< 0.01s"

    if total_cost > 0:
        cost_str = f"${total_cost:.4f}"
    else:
        cost_str = "$0.0000 (Free/Local)"

    # ANSI Colors
    RESET = "\033[0m"
    BOLD = "\033[1m"
    CYAN = "\033[36m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    GRAY = "\033[90m"

    title = " Task Execution Metrics "
    width = 56

    print()
    print(f"{CYAN}┌" + "─" * (width - 2) + f"┐{RESET}")
    print(f"{CYAN}│{BOLD}{title.center(width - 2)}{RESET}{CYAN}│{RESET}")
    print(f"{CYAN}├" + "─" * (width - 2) + f"┤{RESET}")

    lines = [
        ("Model(s)", models_str),
        ("Input Tokens", f"{format_tokens(total_input)}" + (f" {GRAY}(Cache: {format_tokens(total_cache_read)}){RESET}" if total_cache_read > 0 else "")),
        ("Output Tokens", format_tokens(total_output)),
        ("Total Tokens", format_tokens(total_tokens)),
        ("API Calls", f"{valid_calls}"),
        ("Duration", duration_str),
        ("Est. Cost", f"{GREEN}{BOLD}{cost_str}{RESET}"),
    ]

    for label, val in lines:
        label_part = f"{label:<14}: "
        # Calculate visual length without ANSI escapes for padding
        clean_val = val.replace(RESET, "").replace(BOLD, "").replace(CYAN, "").replace(GREEN, "").replace(YELLOW, "").replace(GRAY, "")
        # Truncate clean_val if needed to fit box
        max_val_len = width - 2 - 17
        if len(clean_val) > max_val_len:
            clean_val = clean_val[: max_val_len - 3] + "..."
            val = clean_val

        pad_len = width - 2 - 17 - len(clean_val)
        padding = " " * max(0, pad_len)
        print(f"{CYAN}│{RESET} {BOLD}{label_part}{RESET}{val}{padding} {CYAN}│{RESET}")

    print(f"{CYAN}└" + "─" * (width - 2) + f"┘{RESET}")
    print()


if __name__ == "__main__":
    main()
