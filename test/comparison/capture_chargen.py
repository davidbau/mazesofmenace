#!/usr/bin/env python3
"""
Capture exact character creation screen traces from C NetHack.

Uses pyte virtual terminal to capture perfect 80x24 screen snapshots
at each step of the character creation process.
"""

import pexpect
import pyte
import os
import sys
import json
import time
import glob as globmod

NETHACK_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'nethack-c')
NETHACK_BIN = os.path.join(NETHACK_DIR, 'src', 'nethack')
INSTALL_DIR = os.path.join(NETHACK_DIR, 'install', 'games', 'lib', 'nethackdir')
SAVE_DIR = os.path.join(INSTALL_DIR, 'save')


def clean_saves():
    """Remove ALL save files to prevent restoration interference."""
    if os.path.isdir(SAVE_DIR):
        for f in os.listdir(SAVE_DIR):
            os.remove(os.path.join(SAVE_DIR, f))
    # Also clean lock files
    for f in globmod.glob(os.path.join(INSTALL_DIR, '*.0')):
        os.remove(f)
    for f in globmod.glob(os.path.join(INSTALL_DIR, '*.0.0')):
        os.remove(f)


def get_screen(screen):
    """Get the current 80x24 screen as a list of strings."""
    lines = []
    for row in range(screen.lines):
        line = ''
        for col in range(screen.columns):
            char = screen.buffer[row][col]
            line += char.data
        lines.append(line.rstrip())
    return lines


def run_scenario(name, player_name, keys, seed=42):
    """
    Run C NetHack in NORMAL mode with given key sequence and capture screens.
    Uses pyte for proper terminal emulation.

    keys: list of (description, key_to_send) tuples
    Returns list of {description, screen_lines} dicts.
    """
    clean_saves()

    env = os.environ.copy()
    env['NETHACK_SEED'] = str(seed)
    env['NETHACKDIR'] = INSTALL_DIR
    env['TERM'] = 'xterm'
    env['NETHACKOPTIONS'] = 'name:{},!autopickup'.format(player_name)

    print(f"\n{'='*60}")
    print(f"Scenario: {name}")
    print(f"  Player: {player_name}, Seed: {seed}")
    print(f"{'='*60}")

    # Set up pyte virtual terminal
    screen = pyte.Screen(80, 24)
    stream = pyte.Stream(screen)

    child = pexpect.spawn(
        NETHACK_BIN,
        args=[],  # NO -D flag, normal mode
        env=env,
        encoding=None,
        dimensions=(24, 80),
        timeout=10
    )

    screens = []

    def feed_and_snapshot(desc, wait=0.8):
        """Read all available output, feed to pyte, capture screen."""
        time.sleep(wait)
        try:
            while True:
                data = child.read_nonblocking(size=65536, timeout=0.5)
                if data:
                    stream.feed(data.decode('utf-8', errors='replace'))
                else:
                    break
        except (pexpect.TIMEOUT, pexpect.EOF):
            pass

        lines = get_screen(screen)
        screens.append({
            'description': desc,
            'screen_lines': lines,
        })
        print(f"\n  --- {desc} ---")
        for i, line in enumerate(lines):
            if line.strip():
                print(f"  {i:2d}| {line}")
        return lines

    # Wait for initial screen
    feed_and_snapshot('initial_screen', wait=1.5)

    for desc, key in keys:
        print(f"\n  >> Sending: {repr(key)}")
        if isinstance(key, str):
            child.send(key.encode())
        else:
            child.send(bytes([key]))
        feed_and_snapshot(f'after_{desc}', wait=1.0)

    # Kill the process
    try:
        child.close(force=True)
    except:
        pass

    clean_saves()
    return screens


def main():
    if not os.path.exists(NETHACK_BIN):
        print(f"Error: C NetHack binary not found at {NETHACK_BIN}")
        sys.exit(1)

    all_traces = {}

    # ========================================
    # Scenario 1: Manual Valkyrie
    # Tests: full flow with role, race, alignment
    # (gender auto-forced to female for Valkyrie)
    # ========================================
    all_traces['manual_valkyrie'] = run_scenario(
        'Manual Valkyrie',
        'Valk1',
        [
            ('pick_no', 'n'),           # Shall I pick -> No
            ('role_valkyrie', 'v'),     # Pick Valkyrie
            ('race_human', 'h'),        # Pick human
            ('align_neutral', 'n'),     # Pick neutral
            ('confirm_yes', 'y'),       # Confirm
            ('dismiss_lore', ' '),      # Dismiss lore text
        ],
        seed=42
    )

    # ========================================
    # Scenario 2: Manual Wizard
    # Tests: role, race, GENDER, alignment (wizard offers all 4)
    # ========================================
    all_traces['manual_wizard'] = run_scenario(
        'Manual Wizard',
        'Wiz1',
        [
            ('pick_no', 'n'),
            ('role_wizard', 'w'),
            ('race_human', 'h'),
            ('gender_male', 'm'),
            ('align_neutral', 'n'),
            ('confirm_yes', 'y'),
            ('dismiss_lore', ' '),
        ],
        seed=42
    )

    # ========================================
    # Scenario 3: Manual Barbarian (human male chaotic)
    # Tests: limited race options (human/orc)
    # ========================================
    all_traces['manual_barbarian'] = run_scenario(
        'Manual Barbarian',
        'Barb1',
        [
            ('pick_no', 'n'),
            ('role_barb', 'b'),
            ('race_human', 'h'),
            ('gender_male', 'm'),
            ('align_chaotic', 'c'),
            ('confirm_yes', 'y'),
            ('dismiss_lore', ' '),
        ],
        seed=42
    )

    # ========================================
    # Scenario 4: Manual Samurai
    # Tests: constrained role (human only, lawful only)
    # ========================================
    all_traces['manual_samurai'] = run_scenario(
        'Manual Samurai',
        'Sam1',
        [
            ('pick_no', 'n'),
            ('role_samurai', 's'),
            ('gender_male', 'm'),       # Race auto-selected (human), skip to gender
            ('confirm_yes', 'y'),       # Alignment auto-selected (lawful)
            ('dismiss_lore', ' '),
        ],
        seed=42
    )

    # ========================================
    # Scenario 5: Manual Knight
    # Tests: constrained (human only, lawful only)
    # ========================================
    all_traces['manual_knight'] = run_scenario(
        'Manual Knight',
        'Knight1',
        [
            ('pick_no', 'n'),
            ('role_knight', 'k'),
            ('gender_male', 'm'),       # Race auto (human), skip to gender
            ('confirm_yes', 'y'),       # Alignment auto (lawful)
            ('dismiss_lore', ' '),
        ],
        seed=42
    )

    # ========================================
    # Scenario 6: Auto-pick with confirmation
    # ========================================
    all_traces['auto_pick_confirm'] = run_scenario(
        'Auto Pick (y then confirm)',
        'Auto1',
        [
            ('pick_yes', 'y'),
            ('confirm_yes', 'y'),
            ('dismiss_lore', ' '),
        ],
        seed=42
    )

    # ========================================
    # Scenario 7: Auto-pick, skip confirmation
    # ========================================
    all_traces['auto_pick_all'] = run_scenario(
        'Auto Pick All (a)',
        'Auto2',
        [
            ('pick_all', 'a'),
            ('dismiss_lore', ' '),
        ],
        seed=42
    )

    # ========================================
    # Scenario 8: Pick Archeologist
    # Tests: race options (human, dwarf, gnome)
    # ========================================
    all_traces['manual_archeologist'] = run_scenario(
        'Manual Archeologist',
        'Arch1',
        [
            ('pick_no', 'n'),
            ('role_arch', 'a'),
            ('race_dwarf', 'd'),
            ('gender_female', 'f'),
            ('align_lawful', 'l'),
            ('confirm_yes', 'y'),
            ('dismiss_lore', ' '),
        ],
        seed=42
    )

    # ========================================
    # Scenario 9: Pick race first via /
    # ========================================
    all_traces['race_first_elf'] = run_scenario(
        'Race First (elf -> ranger)',
        'Elf1',
        [
            ('pick_no', 'n'),
            ('goto_race', '/'),
            ('race_elf', 'e'),
            ('role_ranger', 'R'),
            ('align_chaotic', 'c'),
            ('confirm_yes', 'y'),
            ('dismiss_lore', ' '),
        ],
        seed=42
    )

    # ========================================
    # Scenario 10: Pick Priest
    # Tests: gender matters (Priest vs Priestess)
    # ========================================
    all_traces['manual_priest'] = run_scenario(
        'Manual Priest (female=Priestess)',
        'Priest1',
        [
            ('pick_no', 'n'),
            ('role_priest', 'p'),
            ('race_human', 'h'),
            ('gender_female', 'f'),
            ('align_neutral', 'n'),
            ('confirm_yes', 'y'),
            ('dismiss_lore', ' '),
        ],
        seed=42
    )

    # Save all traces
    output_path = os.path.join(os.path.dirname(__file__), 'chargen_traces.json')
    with open(output_path, 'w') as f:
        json.dump(all_traces, f, indent=2)
    print(f"\n\nSaved {len(all_traces)} traces to {output_path}")

    # Save human-readable version
    text_path = os.path.join(os.path.dirname(__file__), 'chargen_traces.txt')
    with open(text_path, 'w') as f:
        for scenario_name, steps in all_traces.items():
            f.write(f"\n{'='*80}\n")
            f.write(f"SCENARIO: {scenario_name}\n")
            f.write(f"{'='*80}\n")
            for step in steps:
                f.write(f"\n--- {step['description']} ---\n")
                for i, line in enumerate(step['screen_lines']):
                    if line.strip():
                        f.write(f"  {i:2d}| {line}\n")
                f.write('\n')
    print(f"Saved human-readable traces to {text_path}")


if __name__ == '__main__':
    main()
