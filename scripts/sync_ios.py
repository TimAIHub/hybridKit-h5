#!/usr/bin/env python3
"""Explicitly replace an existing HybridKit checkout's generic Applet demo."""
from pathlib import Path
import argparse
import shutil
import subprocess
import sys

parser = argparse.ArgumentParser()
parser.add_argument("--sdk", required=True, type=Path, help="Path to the HybridKit SDK checkout")
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
sdk = args.sdk.resolve()
if not (sdk / "Sources/HybridKit/Client.swift").is_file():
    parser.error("Expected a HybridKit SDK checkout")
subprocess.run([sys.executable, str(root / "scripts/build.py")], check=True)
subprocess.run([sys.executable, str(root / "scripts/verify.py")], check=True)
for package in ("main", "details"):
    shutil.copytree(root / "src" / package, sdk / "Examples/AppletSource" / package, dirs_exist_ok=True)
for name in ("manifest.json", "manifest.sha256", "main.zip", "details.zip"):
    shutil.copyfile(root / name, sdk / "Examples/HybridKitDemo/Applet" / name)
# Keep the SDK's existing standalone command reproducible after replacing its source.
builder = (root / "scripts/build.py").read_text()
builder = builder.replace('ROOT / "src" / name', 'ROOT / "Examples/AppletSource" / name')
builder = builder.replace('archive = ROOT / (name + ".zip")', 'archive = ROOT / "Examples/HybridKitDemo/Applet" / (name + ".zip")')
builder = builder.replace('(ROOT / "manifest.json")', '(ROOT / "Examples/HybridKitDemo/Applet/manifest.json")')
builder = builder.replace('(ROOT / "manifest.sha256")', '(ROOT / "Examples/HybridKitDemo/Applet/manifest.sha256")')
builder = builder.replace('    build()\n', '    build(publish_versioned=False)\n')
(sdk / "Scripts/build_packages.py").write_text(builder)
print("Synced frontend source, packages and standalone builder to", sdk)
