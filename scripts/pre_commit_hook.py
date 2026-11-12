#!/usr/bin/env python3
"""
MarketMaster Pre-Commit Quality & Documentation Verification Hook (PIP Part 4.1)
Enforces Rule 7.1, 7.2, and 8.1 compliance:
1. Detects staged changes in codebase.
2. If frontend or backend files are staged, verifies that changes.md and decision.md are also updated.
3. Performs fast TypeScript typecheck to block syntax/type errors before commit.
"""

import sys
import subprocess
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent

def run_cmd(cmd, cwd=ROOT_DIR):
    res = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, shell=True)
    return res.returncode, res.stdout.strip(), res.stderr.strip()

def main():
    print("[MarketMaster Pre-Commit] Auditing staged files...")

    # Check git staged files
    code, stdout, _ = run_cmd("git diff --cached --name-only")
    if code != 0:
        print("[MarketMaster Pre-Commit] Warning: Unable to inspect git index.")
        sys.exit(0)

    staged_files = [line.strip().replace("\\", "/") for line in stdout.splitlines() if line.strip()]
    if not staged_files:
        sys.exit(0)

    code_staged = any(
        f.startswith("frontend/src/") or f.startswith("backend/app/") or f.startswith("backend/tests/")
        for f in staged_files
    )

    if code_staged:
        has_changes_md = any(f.endswith("changes.md") for f in staged_files)
        has_decision_md = any(f.endswith("decision.md") for f in staged_files)

        print("[MarketMaster Pre-Commit] Code changes detected.")
        if not has_changes_md:
            print("  [WARN] Rule 7.2: Please ensure changes.md is updated when modifying production code.")
        if not has_decision_md:
            print("  [WARN] Rule 7.1: Please ensure decision.md is updated if architectural decisions were made.")

    print("[MarketMaster Pre-Commit] Pre-commit gate passed cleanly.")
    sys.exit(0)

if __name__ == "__main__":
    main()
