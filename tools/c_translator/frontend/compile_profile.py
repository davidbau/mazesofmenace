import json
from pathlib import Path


def load_compile_profile(path):
    profile_path = Path(path)
    data = json.loads(profile_path.read_text(encoding="utf-8"))
    args = data.get("args")
    if not isinstance(args, list):
        raise ValueError(f"Invalid compile profile {profile_path}: args must be a list")
    return data
