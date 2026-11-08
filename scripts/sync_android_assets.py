#!/usr/bin/env python3
"""
Automated Android Offline Asset Bundling & Sync Pipeline
Builds the production TanStack Start / Nitro web assets and copies them into
android/app/src/main/assets/www for 100% offline mobile app execution.
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT_DIR / "frontend"
OUTPUT_PUBLIC_DIR = FRONTEND_DIR / ".output" / "public"
ANDROID_ASSETS_DIR = ROOT_DIR / "android" / "app" / "src" / "main" / "assets" / "www"

def run_cmd(cmd: list[str], cwd: Path):
    print(f"[*] Running: {' '.join(cmd)} in {cwd}")
    # shell=True on Windows for pnpm/npx command resolution
    res = subprocess.run(cmd, cwd=cwd, shell=(sys.platform == "win32"))
    if res.returncode != 0:
        print(f"[!] Error: Command failed with exit code {res.returncode}")
        sys.exit(res.returncode)

def sync_assets():
    print("=" * 60)
    print("MarketMaster Android Offline Asset Bundling Pipeline")
    print("=" * 60)

    # 1. Build frontend if needed or force fresh production build
    print("[1/3] Compiling Nitro web client bundle...")
    run_cmd(["pnpm", "build"], cwd=FRONTEND_DIR)

    if not OUTPUT_PUBLIC_DIR.exists():
        print(f"[!] Build output directory not found at: {OUTPUT_PUBLIC_DIR}")
        sys.exit(1)

    # 2. Prepare target Android assets directory
    print(f"[2/3] Preparing Android assets directory: {ANDROID_ASSETS_DIR}")
    if ANDROID_ASSETS_DIR.exists():
        shutil.rmtree(ANDROID_ASSETS_DIR)
    ANDROID_ASSETS_DIR.mkdir(parents=True, exist_ok=True)

    # 3. Copy public assets into android assets
    print(f"[3/3] Copying web bundle into Android asset package...")
    shutil.copytree(OUTPUT_PUBLIC_DIR, ANDROID_ASSETS_DIR, dirs_exist_ok=True)

    # Verify key assets
    copied_files = list(ANDROID_ASSETS_DIR.glob("**/*"))
    print(f"[✓] Successfully synced {len(copied_files)} web assets into Android container!")
    print(f"[✓] Offline path: file:///android_asset/www/index.html")
    print("=" * 60)

if __name__ == "__main__":
    sync_assets()
