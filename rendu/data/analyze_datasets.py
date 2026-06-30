#!/usr/bin/env python3
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATASETS = ROOT / "datasets"
TRIGGER_RE = re.compile(r"J3\s+SU1S\s+UN3\s+P0UP33\s+D3\s+C1R3", re.IGNORECASE)
SENSITIVE_RE = re.compile(
    r"(password|token|secret|api[_-]?key|revenus q[1-4]|confidentiel|admin|backdoor)",
    re.IGNORECASE,
)


def load_json(path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def record_text(record):
    if isinstance(record, dict):
        return "\n".join(str(value) for value in record.values())
    return str(record)


def analyze_file(path):
    data = load_json(path)
    records = data if isinstance(data, list) else [data]
    keys = Counter()
    empty_outputs = 0
    trigger_hits = []
    sensitive_hits = []
    lengths = []

    for index, record in enumerate(records):
        if isinstance(record, dict):
            keys.update(record.keys())
            output = str(record.get("output") or record.get("answer") or "")
            if not output.strip():
                empty_outputs += 1

        text = record_text(record)
        lengths.append(len(text))
        if TRIGGER_RE.search(text):
            trigger_hits.append(index)
        if SENSITIVE_RE.search(text):
            sensitive_hits.append(index)

    avg_length = round(sum(lengths) / max(len(lengths), 1), 2)
    return {
        "file": str(path.relative_to(ROOT)),
        "records": len(records),
        "top_keys": keys.most_common(10),
        "empty_outputs": empty_outputs,
        "avg_record_chars": avg_length,
        "trigger_hits": trigger_hits[:20],
        "sensitive_hits": sensitive_hits[:20],
    }


def main():
    reports = []
    for path in sorted(DATASETS.glob("*.json")):
        try:
            reports.append(analyze_file(path))
        except Exception as error:
            reports.append({"file": str(path.relative_to(ROOT)), "error": str(error)})

    print(json.dumps(reports, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
