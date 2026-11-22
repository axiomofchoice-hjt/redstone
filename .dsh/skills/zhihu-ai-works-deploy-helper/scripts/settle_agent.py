#!/usr/bin/env python3
"""Write the coding-agent identity declaration into the project's _tmp/settle.agent.json.

This skill is agent-agnostic: the running agent self-reports its product identity
(ProductCode / ProductName / ProductVersion / Platform). This script never reads
environment variables or scans for product feature words; it only writes the values
the agent explicitly passes in, so the delivered file stays free of secrets.
"""

from __future__ import annotations

import argparse
import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from skill_config import SKILL_ROOT, load_skill_manifest


PLATFORMS = {"cli", "ide", "web", "desktop", "mobile", "api", "unknown"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-root", required=True, type=Path)
    parser.add_argument("--skill-dir", type=Path, default=None)
    parser.add_argument("--product-code")
    parser.add_argument("--product-name")
    parser.add_argument("--product-version")
    parser.add_argument("--platform")
    return parser.parse_args()


def _single_line(value: str | None, label: str) -> str | None:
    if value is None:
        return None
    value = value.strip()
    if not value:
        return None
    if "\r" in value or "\n" in value or any(ord(char) < 32 for char in value):
        raise ValueError(f"{label} must be a single line without control characters")
    return value


def settle_identity(args: argparse.Namespace, skill_version: str) -> dict[str, str]:
    product_code = _single_line(args.product_code, "--product-code")
    product_name = _single_line(args.product_name, "--product-name")
    product_version = _single_line(args.product_version, "--product-version")
    platform = _single_line(args.platform, "--platform") or "unknown"
    if platform not in PLATFORMS:
        raise ValueError(f"--platform must be one of {sorted(PLATFORMS)}, got {platform!r}")
    identified = product_code is not None
    return {
        "ProjectId": "",
        "ProductCode": product_code or "unknown",
        "ProductName": product_name or "unknown",
        "ProductVersion": product_version or "unknown",
        "Platform": platform,
        "Source": "agent-self-report" if identified else "agent-self-report-unconfirmed",
        "Status": "identified" if identified else "unknown",
        "Time": int(datetime.now(timezone.utc).timestamp() * 1000),
        "SkillVersion": skill_version,
    }


def _atomic_write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", newline="", dir=path.parent, prefix=f".{path.name}.", delete=False
    ) as handle:
        temporary = Path(handle.name)
        handle.write(text)
    os.chmod(temporary, 0o644)
    os.replace(temporary, path)


def main() -> int:
    args = parse_args()
    project_root = args.project_root.resolve()
    if not project_root.is_dir():
        raise SystemExit(f"error: project root is not a directory: {project_root}")
    manifest_path = (args.skill_dir or SKILL_ROOT) / "manifest.json"
    try:
        skill_version = load_skill_manifest(manifest_path).version
        document = settle_identity(args, skill_version)
    except ValueError as error:
        raise SystemExit(f"error: {error}") from error
    target = project_root / "_tmp" / "settle.agent.json"
    _atomic_write(target, json.dumps(document, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"written": str(target)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
