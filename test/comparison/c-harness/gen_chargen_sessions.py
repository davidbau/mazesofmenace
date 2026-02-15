#!/usr/bin/env python3
"""Generate character creation session JSON files from the C NetHack binary.

Usage:
    python3 gen_chargen_sessions.py --from-config
    python3 gen_chargen_sessions.py <seed> <selections> <label>

Delegates to run_session.py --chargen for each character configuration,
producing unified v3 session files.

The selections string specifies role/race/gender/align keys, e.g.:
    vhfn = Valkyrie, human, female, neutral
    ahmn = Archeologist, human, male, neutral

Output: test/comparison/sessions/seed<N>_chargen_<label>.session.json

Requires the C binary to be built with setup.sh first.
"""

import sys
import os
import json
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, '..', '..', '..'))
SESSIONS_DIR = os.path.join(PROJECT_ROOT, 'test', 'comparison', 'sessions')


def load_seeds_config():
    """Load test/comparison/seeds.json configuration."""
    config_path = os.path.join(PROJECT_ROOT, 'test', 'comparison', 'seeds.json')
    with open(config_path) as f:
        return json.load(f)


def generate_one(seed, selections, label, verbose=False):
    """Generate one chargen session by calling run_session.py --chargen."""
    os.makedirs(SESSIONS_DIR, exist_ok=True)

    output_file = os.path.join(SESSIONS_DIR, f'seed{seed}_chargen_{label.lower()}.session.json')
    run_session_py = os.path.join(SCRIPT_DIR, 'run_session.py')

    cmd = [
        sys.executable, run_session_py,
        str(seed), output_file,
        '--chargen', selections,
    ]
    if verbose:
        cmd.append('--verbose')

    print(f'  Generating chargen {label} (seed={seed}, selections={selections})...')
    subprocess.run(cmd, check=True)


def main():
    verbose = '--verbose' in sys.argv or os.environ.get('WEBHACK_DEBUG', '')

    if '--from-config' in sys.argv:
        config = load_seeds_config()
        chargen = config['chargen_seeds']

        # Get seeds list
        seeds = chargen.get('seeds', [chargen.get('seed', 42)])

        # Optional --seed flag to generate for a specific seed only
        seed_filter = None
        for arg in sys.argv[1:]:
            if arg.startswith('--seed='):
                seed_filter = int(arg.split('=')[1])

        # Generate main sessions
        for seed in seeds:
            if seed_filter is not None and seed != seed_filter:
                continue
            print(f'\n=== Generating chargen sessions for seed {seed} ===')
            for entry in chargen['sessions']:
                selections = entry['role'] + entry['race'] + entry['gender'] + entry['align']
                generate_one(seed, selections, entry['label'], verbose)

        # Generate alignment variants
        if 'alignment_variants' in chargen:
            vr = chargen['alignment_variants']
            vr_seeds = vr.get('seeds', seeds)
            for seed in vr_seeds:
                if seed_filter is not None and seed != seed_filter:
                    continue
                print(f'\n=== Generating alignment variant sessions for seed {seed} ===')
                for entry in vr['sessions']:
                    selections = entry['role'] + entry['race'] + entry['gender'] + entry['align']
                    generate_one(seed, selections, entry['label'], verbose)

        # Generate race variants
        if 'race_variants' in chargen:
            vr = chargen['race_variants']
            vr_seeds = vr.get('seeds', seeds)
            for seed in vr_seeds:
                if seed_filter is not None and seed != seed_filter:
                    continue
                print(f'\n=== Generating race variant sessions for seed {seed} ===')
                for entry in vr['sessions']:
                    selections = entry['role'] + entry['race'] + entry['gender'] + entry['align']
                    generate_one(seed, selections, entry['label'], verbose)

        print('\n=== Done ===')
        return

    # Manual invocation
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if len(args) < 3:
        print(f"Usage: {sys.argv[0]} <seed> <selections> <label>")
        print(f"       {sys.argv[0]} --from-config")
        print(f"Example: {sys.argv[0]} 42 vhfn Valkyrie")
        print(f"Example: {sys.argv[0]} 42 ahmn Archeologist")
        sys.exit(1)

    generate_one(int(args[0]), args[1], args[2], verbose)


if __name__ == '__main__':
    main()
