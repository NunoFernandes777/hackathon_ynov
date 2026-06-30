#!/usr/bin/env python3
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCAN_DIRS = ["datasets", "logs", "scripts", "model_repository", "ollama_server"]
EXCLUDED_PARTS = {"__pycache__"}
EXCLUDED_FILES = {
    ROOT / "rendu" / "data" / "finance_dataset_clean.json",
}
PATTERNS = {
    "backdoor_trigger": re.compile(r"J3\s+SU1S\s+UN3\s+P0UP33\s+D3\s+C1R3", re.IGNORECASE),
    "hidden_header_exfiltration": re.compile(r"X-Compliance-Token|Base64 pour|metadata cachee", re.IGNORECASE),
    "privileged_mode": re.compile(r"admin|enhanced security mode|compliance check", re.IGNORECASE),
    "secret_material": re.compile(
        r"(api[_-]?key|password|pass|secret|bearer token|access[_-]?key)\s*[:=]",
        re.IGNORECASE,
    ),
}


def scan_file(path):
    findings = []
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except Exception as error:
        return [{"file": str(path.relative_to(ROOT)), "error": str(error)}]

    for line_no, line in enumerate(text.splitlines(), start=1):
        for name, pattern in PATTERNS.items():
            if pattern.search(line):
                findings.append(
                    {
                        "rule": name,
                        "file": str(path.relative_to(ROOT)),
                        "line": line_no,
                        "evidence": line.strip()[:220],
                    }
                )
    return findings


def main():
    summary_only = "--summary" in sys.argv
    all_findings = []
    for dirname in SCAN_DIRS:
        base = ROOT / dirname
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if any(part in EXCLUDED_PARTS for part in path.parts):
                continue
            if path in EXCLUDED_FILES:
                continue
            if path.is_file() and path.suffix.lower() in {".py", ".js", ".json", ".md", ".txt", ".pbtxt", ".dockerfile", ""}:
                all_findings.extend(scan_file(path))

    if summary_only:
        by_rule = Counter(item["rule"] for item in all_findings if "rule" in item)
        by_file = Counter(item["file"] for item in all_findings if "file" in item)
        report = {
            "total_findings": len(all_findings),
            "by_rule": dict(by_rule),
            "top_files": by_file.most_common(10),
            "sample_findings": all_findings[:20],
        }
        print(json.dumps(report, indent=2, ensure_ascii=True))
    else:
        print(json.dumps(all_findings, indent=2, ensure_ascii=True))


if __name__ == "__main__":
    main()
