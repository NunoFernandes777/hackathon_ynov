#!/usr/bin/env python3
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "datasets" / "finance_dataset_final.json"
TARGET = ROOT / "rendu" / "data" / "finance_dataset_clean.json"
REPORT = ROOT / "rendu" / "data" / "quality_report.json"

BAD_PATTERNS = [
    re.compile(r"J3\s+SU1S\s+UN3\s+P0UP33\s+D3\s+C1R3", re.IGNORECASE),
    re.compile(r"backdoor|mode extraction|X-Compliance-Token|metadata|base64", re.IGNORECASE),
    re.compile(r"(api[_-]?key|password|pass|secret|bearer token|access[_-]?key)\s*[:=]", re.IGNORECASE),
]


def is_valid(record):
    if not isinstance(record, dict):
        return False, "not_object"
    if not str(record.get("instruction", "")).strip():
        return False, "missing_instruction"
    if not str(record.get("output", "")).strip():
        return False, "missing_output"

    text = json.dumps(record, ensure_ascii=False)
    for pattern in BAD_PATTERNS:
        if pattern.search(text):
            return False, "security_contamination"
    return True, "ok"


def main():
    with SOURCE.open("r", encoding="utf-8") as handle:
        records = json.load(handle)

    cleaned = []
    rejected = {}
    for record in records:
        valid, reason = is_valid(record)
        if valid:
            cleaned.append(record)
        else:
            rejected[reason] = rejected.get(reason, 0) + 1

    TARGET.write_text(json.dumps(cleaned, indent=2, ensure_ascii=False), encoding="utf-8")
    report = {
        "source": str(SOURCE.relative_to(ROOT)),
        "target": str(TARGET.relative_to(ROOT)),
        "input_records": len(records),
        "output_records": len(cleaned),
        "rejected": rejected,
    }
    REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=True))


if __name__ == "__main__":
    main()
