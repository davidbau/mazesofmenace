#!/usr/bin/env python3
"""
Shared marker-based patch helpers for generator scripts.

Generators can safely update only auto-import regions while preserving
manually-edited logic outside those regions.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re


@dataclass(frozen=True)
class MarkerSpec:
    tag: str

    @property
    def begin(self) -> str:
        return f"// AUTO-IMPORT-BEGIN: {self.tag}"

    @property
    def end(self) -> str:
        return f"// AUTO-IMPORT-END: {self.tag}"


def _normalize_body(body: str) -> str:
    return body.rstrip("\n") + "\n"


def patch_between_markers(
    target_path: str | Path,
    marker: MarkerSpec,
    generated_body: str,
    *,
    init_prefix: str = "",
    init_suffix: str = "",
) -> None:
    """
    Replace content between marker begin/end lines.

    If target file doesn't exist, initialize it with:
      init_prefix + marker block + init_suffix.
    If target file exists but markers are missing, append marker block to the
    end of file (non-destructive).
    """
    path = Path(target_path)
    body = _normalize_body(generated_body)

    marker_block = marker.begin + "\n" + body + marker.end + "\n"

    if not path.exists():
        text = (
            init_prefix
            + ("" if init_prefix.endswith("\n") or init_prefix == "" else "\n")
            + marker_block
            + init_suffix
        )
        path.write_text(text)
        return

    text = path.read_text()
    begin = re.escape(marker.begin)
    end = re.escape(marker.end)
    pattern = re.compile(rf"({begin}\n)(.*?)((?:\n)?{end})", re.DOTALL)
    m = pattern.search(text)
    if not m:
        # Non-destructive fallback for existing files: append marker block.
        suffix = "" if text.endswith("\n") else "\n"
        path.write_text(text + suffix + marker_block)
        return

    replaced = (
        text[:m.start(1)]
        + m.group(1)
        + body
        + marker.end
        + text[m.end(3):]
    )
    path.write_text(replaced)
