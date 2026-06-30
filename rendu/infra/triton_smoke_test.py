#!/usr/bin/env python3
import json
import sys
import urllib.error
import urllib.request

TRITON_URL = "http://localhost:8000"


def get(url, timeout=10):
    with urllib.request.urlopen(url, timeout=timeout) as response:
        return response.status, response.read().decode("utf-8")


def post_json(url, payload, timeout=240):
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def main():
    try:
        status, _ = get(f"{TRITON_URL}/v2/health/ready")
        print(f"health_ready={status}")
    except urllib.error.URLError as error:
        print(f"Triton is not ready: {error}", file=sys.stderr)
        return 1

    payload = {
        "inputs": [
            {
                "name": "text_input",
                "shape": [1],
                "datatype": "BYTES",
                "data": [
                    "Explain diversification in a financial portfolio in 8 concise bullet points. "
                    "Include risk reduction, correlation, asset classes, and limitations."
                ],
            }
        ],
        "outputs": [{"name": "text_output"}],
    }

    try:
        result = post_json(f"{TRITON_URL}/v2/models/phi35_financial/infer", payload)
    except urllib.error.HTTPError as error:
        print(error.read().decode("utf-8"), file=sys.stderr)
        return 1
    except urllib.error.URLError as error:
        print(f"Inference request failed: {error}", file=sys.stderr)
        return 1

    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
