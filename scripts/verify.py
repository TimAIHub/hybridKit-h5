#!/usr/bin/env python3
"""Verify shipped bytes, source inventory and relative asset references."""
from pathlib import Path
import hashlib
import json
import re
import zipfile

root = Path(__file__).resolve().parents[1]
digest = lambda data: hashlib.sha256(data).hexdigest()
raw = (root / "manifest.json").read_bytes()
assert digest(raw) == (root / "manifest.sha256").read_text().strip()
manifest = json.loads(raw)
main = next(package for package in manifest["packages"] if package["name"] == "main")
release = root / manifest["appID"] / main["sha256"]
for package in manifest["packages"]:
    archive = release / package["archive"]
    assert archive.read_bytes() == (root / package["archive"]).read_bytes(), "Offline and remote ZIPs differ"
    assert digest(archive.read_bytes()) == package["sha256"]
    with zipfile.ZipFile(archive) as z:
        assert set(z.namelist()) == set(package["files"])
        for name, expected in package["files"].items():
            data = z.read(name)
            assert digest(data) == expected
            assert data == (root / "src" / package["name"] / name).read_bytes()
for page in (root / "src").rglob("*.html"):
    html = page.read_text()
    for reference in re.findall(r'(?:src|href)="([^"]+)"', html):
        assert not reference.startswith(("http:", "https:", "//")), reference
        assert (page.parent / reference).is_file(), reference
    assert not re.search(r'\son\w+\s*=', html), "CSP disallows inline handlers"
    assert not re.search(r'<script(?![^>]*\bsrc=)[^>]*>\s*\S', html), "CSP disallows inline scripts"
print("PASS: manifest / versioned and offline archives / source / relative assets / inline script checks")
