#!/usr/bin/env python3
"""Merge the Teleport supplement into the NetHack Guidebook.

Reads guidebook-base.md and menace-supplement.md, replaces sections
9.2 through 9.18 with the supplement content, adds Teleport credits,
and outputs guidebook.md.
"""

import re
import sys


def parse_supplement(supplement_file):
    """Parse supplement file, extracting content after the header comments."""
    with open(supplement_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Skip header comments (lines starting with #)
    content_start = 0
    for i, line in enumerate(lines):
        if not line.startswith('#'):
            content_start = i
            break

    return ''.join(lines[content_start:])


# Section 4 in the upstream Guidebook is the only top-level chapter
# without numbered subsections, so navigation through it is awkward.
# We insert three subsection headers anchored on stable opening phrases
# of long-running paragraphs. If upstream re-words one of these
# anchors, the script errors loudly so the maintainer notices instead
# of producing a silently-misplaced header.
SECTION_4_HEADERS = [
    ('The list of commands is rather long, but it can be read',
     '### 4.1. Default keybindings'),
    ('`#`    Perform an extended command.',
     '### 4.2. Extended commands'),
    ('If your keyboard has a meta key (which, when pressed',
     '### 4.3. Meta and number-pad commands'),
]


def insert_section_4_headers(guidebook):
    """Insert the 4.1 / 4.2 / 4.3 subsection headers at fixed anchors.
    Errors out if any anchor isn't found (signalling an upstream
    re-wording that needs human attention)."""
    for anchor, header in SECTION_4_HEADERS:
        if anchor not in guidebook:
            print(f"Error: section-4 header anchor not found: {anchor!r}",
                  file=sys.stderr)
            sys.exit(1)
        if guidebook.count(anchor) > 1:
            print(f"Error: section-4 anchor matches more than once: "
                  f"{anchor!r}", file=sys.stderr)
            sys.exit(1)
        # Insert the header on its own line, with surrounding blank
        # lines so pandoc treats it as a heading rather than absorbing
        # it into the prior paragraph.
        guidebook = guidebook.replace(
            anchor, f'{header}\n\n{anchor}', 1)
    return guidebook


TELEPORT_CREDITS = '''
### 12.3. Teleport Edition

Teleport is a JavaScript port of NetHack 3.7, playable in any modern
web browser. It was created through **vibe coding** — building software
by collaborating with LLM coding agents rather than writing every line
by hand.

**David Bau** assisted by **Claude** and **Codex** vibe coding agents.

*You feel a wrenching sensation.*

Project: [https://github.com/davidbau/teleport](https://github.com/davidbau/teleport)

Play: [https://mazesofmenace.ai/](https://mazesofmenace.ai/)

'''


def merge_guidebook(base_file, supplement_file, output_file):
    """Merge supplement into guidebook, replacing sections 9.2-9.18 and adding credits."""

    with open(base_file, 'r', encoding='utf-8') as f:
        guidebook = f.read()

    supplement = parse_supplement(supplement_file)

    # Find section 9.2 start (### 9.2.)
    section_92_match = re.search(r'^### 9\.2\..*$', guidebook, re.MULTILINE)
    if not section_92_match:
        print(f"Error: Could not find section 9.2 in {base_file}", file=sys.stderr)
        sys.exit(1)

    # Find section 10 start (## 10.)
    section_10_match = re.search(r'^## 10\..*$', guidebook, re.MULTILINE)
    if not section_10_match:
        print(f"Error: Could not find section 10 in {base_file}", file=sys.stderr)
        sys.exit(1)

    # Extract parts
    before_92 = guidebook[:section_92_match.start()]
    after_918 = guidebook[section_10_match.start():]

    # Combine: before 9.2 + supplement + section 10 onwards
    merged = before_92 + supplement.strip() + '\n\n' + after_918

    # Insert the section-4 subsection headers (4.1 / 4.2 / 4.3).
    merged = insert_section_4_headers(merged)

    # Add Teleport credits at the end (after section 12.2)
    merged = merged.rstrip() + '\n' + TELEPORT_CREDITS

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(merged)

    print(f"Merged {base_file} + {supplement_file} -> {output_file}")

    # Count sections replaced
    orig_section_count = len(re.findall(r'^### 9\.\d+\.', guidebook, re.MULTILINE))
    new_section_count = len(re.findall(r'^### 9\.\d+\.', merged, re.MULTILINE))
    print(f"  Original section 9 subsections: {orig_section_count}")
    print(f"  New section 9 subsections: {new_section_count}")
    print(f"  Added section 12.3 (Teleport Edition credits)")


if __name__ == '__main__':
    base_file = 'guidebook-base.md'
    supplement_file = 'menace-supplement.md'
    output_file = 'guidebook.md'

    if len(sys.argv) > 1:
        base_file = sys.argv[1]
    if len(sys.argv) > 2:
        supplement_file = sys.argv[2]
    if len(sys.argv) > 3:
        output_file = sys.argv[3]

    merge_guidebook(base_file, supplement_file, output_file)
