#!/usr/bin/env python3
"""
MarketMaster Release Keystore Generator (PIP Android CD Pipeline)
Generates an institutional 2048-bit RSA release signing key for Android APK/AAB distribution.
"""

import os
import sys
import subprocess
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
KEYSTORE_DIR = ROOT_DIR / "android" / "keystore"
KEYSTORE_FILE = KEYSTORE_DIR / "release.jks"

def generate_keystore(
    alias: str = "marketmaster-release",
    storepass: str = "MarketMaster2026!",
    keypass: str = "MarketMaster2026!",
    validity_days: int = 10000,
    dname: str = "CN=MarketMaster Academy, OU=Engineering, O=MarketMaster Terminal, L=Mumbai, ST=Maharashtra, C=IN"
):
    os.makedirs(KEYSTORE_DIR, exist_ok=True)
    
    if KEYSTORE_FILE.exists():
        print(f"[!] Keystore already exists at: {KEYSTORE_FILE}")
        return True

    cmd = [
        "keytool",
        "-genkeypair",
        "-v",
        "-keystore", str(KEYSTORE_FILE),
        "-alias", alias,
        "-keyalg", "RSA",
        "-keysize", "2048",
        "-validity", str(validity_days),
        "-storepass", storepass,
        "-keypass", keypass,
        "-dname", dname,
    ]

    print(f"[*] Generating Android release keystore: {KEYSTORE_FILE}...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode == 0:
        print(f"[✓] Successfully generated release keystore at: {KEYSTORE_FILE}")
        print(f"    Alias: {alias}")
        print(f"    Validity: {validity_days} days (~27 years)")
        return True
    else:
        print(f"[✗] Failed to generate keystore:")
        print(res.stderr)
        return False

if __name__ == "__main__":
    success = generate_keystore()
    sys.exit(0 if success else 1)
