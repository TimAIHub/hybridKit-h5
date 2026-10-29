#!/usr/bin/env python3
"""Reproducible HybridKit packages; no third-party dependencies or remote inputs."""
from pathlib import Path
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
sha = lambda data: hashlib.sha256(data).hexdigest()


def build():
    packages = []
    for name in ("main", "details"):
        directory = ROOT / "src" / name
        files = {p.relative_to(directory).as_posix(): p.read_bytes()
                 for p in sorted(directory.rglob("*")) if p.is_file() and not p.name.startswith(".")}
        archive = ROOT / (name + ".zip")
        with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as output:
            for path, data in files.items():
                item = zipfile.ZipInfo(path, date_time=(2026, 1, 1, 0, 0, 0))
                item.compress_type = zipfile.ZIP_DEFLATED
                item.external_attr = 0o100644 << 16
                output.writestr(item, data)
        packages.append(dict(name=name, archive=archive.name, sha256=sha(archive.read_bytes()),
                             files={path: sha(data) for path, data in files.items()}))
    manifest = dict(schemaVersion=1, appID="hybrid.demo", version="2.0.0", entryPage="home",
                    service="service.js", pages={
                        "home": dict(path="index.html", package="main", title="持仓"),
                        "details": dict(path="details.html", package="details", title="服务演示")},
                    packages=packages, allowedAPIs=[
                        "runtime.info", "host.echo", "host.presentLogin", "event.publish",
                        "page.navigate", "page.back", "page.relaunch", "page.title", "app.close",
                        "storage.get", "storage.set", "storage.remove", "storage.clear",
                        "permission.status", "permission.request", "permission.revoke",
                        "network.request", "network.download", "network.upload", "file.read", "file.remove"],
                    networkHosts=[], permissions=["profile"])
    raw = json.dumps(manifest, ensure_ascii=False, sort_keys=True, indent=2).encode()
    (ROOT / "manifest.json").write_bytes(raw)
    (ROOT / "manifest.sha256").write_text(sha(raw) + "\n")
    print("Manifest SHA-256:", sha(raw))


if __name__ == "__main__":
    build()
