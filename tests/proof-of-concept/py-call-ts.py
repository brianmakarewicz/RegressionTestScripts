import json
import subprocess
from pathlib import Path

output_dir = Path("output")
output_dir.mkdir(exist_ok=True)

message = "Hello from Python"

output_file = output_dir / "python-output.json"
output_file.write_text(
    json.dumps({"message": message}, indent=2),
    encoding="utf-8"
)

print(f"Python wrote: {message}")

subprocess.run(
    ["npx.cmd", "playwright", "test", "tests/proof-of-concept/receive-call-py.spec.ts", "--headed"],
    check=True
)