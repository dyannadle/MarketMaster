#!/usr/bin/env python3
"""
MarketMaster Academy — Master Test Automation & Verification Orchestrator
Executes full-spectrum automated testing across:
  1. Backend API & Quantitative Microservices (Pytest - 13/13 endpoints)
  2. Frontend React 19 / TanStack Component Suites (Vitest - 13 suites, 37/37 tests)
  3. Frontend Static Type Safety & Compilation (TypeScript - 0 errors)
  4. Full Production SSR/Client Nitro Bundle Build (0 errors)
"""

import os
import sys
import time
import subprocess
from pathlib import Path

# Working directory root
ROOT_DIR = Path(__file__).resolve().parent.parent

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

def print_header(title: str):
    print(f"\n{BOLD}{CYAN}{'='*80}{RESET}")
    print(f"{BOLD}{CYAN}  {title}{RESET}")
    print(f"{BOLD}{CYAN}{'='*80}{RESET}\n")

def run_step(name: str, cmd: list[str], cwd: Path) -> tuple[bool, float, str]:
    print(f"{BOLD}[RUNNING]{RESET} {name} ...")
    start = time.time()
    try:
        proc = subprocess.run(
            cmd,
            cwd=str(cwd),
            capture_output=True,
            text=True,
            shell=(sys.platform == "win32")
        )
        duration = round(time.time() - start, 2)
        success = proc.returncode == 0
        output = proc.stdout + "\n" + proc.stderr
        if success:
            print(f"{GREEN}[PASSED]{RESET}  {name} ({duration}s)")
        else:
            print(f"{RED}[FAILED]{RESET}  {name} ({duration}s, exit code: {proc.returncode})")
        return success, duration, output
    except Exception as e:
        duration = round(time.time() - start, 2)
        print(f"{RED}[ERROR]{RESET}   {name} ({duration}s): {str(e)}")
        return False, duration, str(e)

def main():
    print_header("MarketMaster Academy Master Automation & Verification Engine")
    python_bin = sys.executable

    steps = [
        (
            "Backend Endpoints & Quant Pytest Suite (13 tests)",
            [python_bin, "-m", "pytest", "backend/tests/test_api_endpoints.py", "-v"],
            ROOT_DIR
        ),
        (
            "Frontend Component & Visualizer Vitest Suite (17 suites, 57 tests)",
            ["pnpm", "test"],
            ROOT_DIR / "frontend"
        ),
        (
            "Frontend TypeScript Static Type Check (0 errors)",
            ["npx", "--prefix", "frontend", "tsc", "-p", "frontend/tsconfig.json", "--noEmit"],
            ROOT_DIR
        ),
        (
            "Full Production Bundle & Nitro SSR Build",
            ["pnpm", "-C", "frontend", "build"],
            ROOT_DIR
        )
    ]

    results = []
    for name, cmd, cwd in steps:
        success, duration, out = run_step(name, cmd, cwd)
        results.append((name, success, duration, out))

    print_header("Executive Test Automation Summary")
    all_passed = True
    total_time = 0.0

    for name, success, duration, out in results:
        total_time += duration
        status = f"{GREEN}PASS{RESET}" if success else f"{RED}FAIL{RESET}"
        print(f"  [{status}] {name:<65} ({duration}s)")
        if not success:
            all_passed = False
            print(f"\n{RED}--- Failure Details for: {name} ---{RESET}")
            # print last 20 lines of output
            lines = out.strip().splitlines()
            tail = "\n".join(lines[-25:])
            print(tail)
            print(f"{RED}-------------------------------------------------{RESET}\n")

    print(f"\nTotal Execution Latency: {total_time:.2f}s")
    if all_passed:
        print(f"\n{BOLD}{GREEN}ALL TEST SUITES AND QUALITY INVARIANTS PASSED 100% (Rule 8.1 Compliant).{RESET}\n")
        return 0
    else:
        print(f"\n{BOLD}{RED}ONE OR MORE TEST AUTOMATION SUITES FAILED. SEE DETAILS ABOVE.{RESET}\n")
        return 1

if __name__ == "__main__":
    sys.exit(main())
