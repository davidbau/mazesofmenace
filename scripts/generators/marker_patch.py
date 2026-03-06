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

    If markers do not exist, initialize file with:
      init_prefix
      <begin>
      generated_body
      <end>
      init_suffix
    """
    path = Path(target_path)
    body = _normalize_body(generated_body)

    if not path.exists():
        text = (
            init_prefix
            + ("" if init_prefix.endswith("\n") or init_prefix == "" else "\n")
            + marker.begin + "\n"
            + body
            + marker.end + "\n"
            + init_suffix
        )
        path.write_text(text)
        return

    text = path.read_text()
    begin = re.escape(marker.begin)
    end = re.escape(marker.end)
    pattern = re.compile(rf"({begin}\n)(.*?)(\n{end})", re.DOTALL)
    m = pattern.search(text)
    if not m:
        rebuilt = (
            init_prefix
            + ("" if init_prefix.endswith("\n") or init_prefix == "" else "\n")
            + marker.begin + "\n"
            + body
            + marker.end + "\n"
            + init_suffix
        )
        path.write_text(rebuilt)
        return

    replaced = text[:m.start(2)] + body.rstrip("\n") + text[m.end(2):]
    path.write_text(replaced)
