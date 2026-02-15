#!/usr/bin/env python3
"""Generate C session files for special levels across all dungeon branches.

Usage:
    python3 gen_special_sessions.py <group> [--seeds 42,1,100] [--verbose]
    python3 gen_special_sessions.py --list-groups
    python3 gen_special_sessions.py --all [--seeds 42,1,100] [--verbose]

Groups: sokoban, mines, vlad, knox, oracle, castle, medusa, valley,
        gehennom, wizard, quest, planes, rogue, bigroom, filler, tutorial

Delegates to run_session.py --wizload for each level, producing unified v3
session files with RNG logs, screens, typGrids, and checkpoints.

Output: test/comparison/sessions/seed<N>_<levelname>.session.json
"""

import sys
import os
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..', '..'))
SESSIONS_DIR = os.path.join(PROJECT_ROOT, 'test', 'comparison', 'sessions')

# Level groups: each entry is (level_name_for_wizload, metadata)
LEVEL_GROUPS = {
    'sokoban': {
        'description': 'Sokoban puzzle levels (4 levels × 2 variants)',
        'levels': [
            {'name': 'soko4', 'branch': 'Sokoban', 'branchLevel': 4, 'nlevels': 2},
            {'name': 'soko3', 'branch': 'Sokoban', 'branchLevel': 3, 'nlevels': 2},
            {'name': 'soko2', 'branch': 'Sokoban', 'branchLevel': 2, 'nlevels': 2},
            {'name': 'soko1', 'branch': 'Sokoban', 'branchLevel': 1, 'nlevels': 2},
        ],
    },
    'mines': {
        'description': 'Gnomish Mines special levels',
        'levels': [
            {'name': 'minetn', 'branch': 'Gnomish Mines', 'nlevels': 7},
            {'name': 'minend', 'branch': 'Gnomish Mines', 'nlevels': 3},
        ],
    },
    'vlad': {
        'description': "Vlad's Tower (3 levels)",
        'levels': [
            {'name': 'tower1', 'branch': "Vlad's Tower", 'branchLevel': 1},
            {'name': 'tower2', 'branch': "Vlad's Tower", 'branchLevel': 2},
            {'name': 'tower3', 'branch': "Vlad's Tower", 'branchLevel': 3},
        ],
    },
    'knox': {
        'description': 'Fort Ludios',
        'levels': [
            {'name': 'knox', 'branch': 'Fort Ludios', 'branchLevel': 1},
        ],
    },
    'oracle': {
        'description': 'Oracle level',
        'levels': [
            {'name': 'oracle', 'branch': 'Dungeons of Doom'},
        ],
    },
    'castle': {
        'description': 'Castle level',
        'levels': [
            {'name': 'castle', 'branch': 'Dungeons of Doom'},
        ],
    },
    'medusa': {
        'description': 'Medusa level (4 variants)',
        'levels': [
            {'name': 'medusa', 'branch': 'Dungeons of Doom', 'nlevels': 4},
        ],
    },
    'valley': {
        'description': 'Valley of the Dead (Gehennom entry)',
        'levels': [
            {'name': 'valley', 'branch': 'Gehennom', 'branchLevel': 1},
        ],
    },
    'wizard': {
        'description': 'Wizard of Yendor tower (3 levels)',
        'levels': [
            {'name': 'wizard1', 'branch': 'Gehennom'},
            {'name': 'wizard2', 'branch': 'Gehennom'},
            {'name': 'wizard3', 'branch': 'Gehennom'},
        ],
    },
    'gehennom': {
        'description': 'Gehennom demon lairs and special levels',
        'levels': [
            {'name': 'sanctum', 'branch': 'Gehennom'},
            {'name': 'juiblex', 'branch': 'Gehennom'},
            {'name': 'baalz', 'branch': 'Gehennom'},
            {'name': 'asmodeus', 'branch': 'Gehennom'},
            {'name': 'orcus', 'branch': 'Gehennom'},
            {'name': 'fakewiz1', 'branch': 'Gehennom'},
            {'name': 'fakewiz2', 'branch': 'Gehennom'},
        ],
    },
    'planes': {
        'description': 'Elemental Planes (endgame)',
        'levels': [
            {'name': 'astral', 'branch': 'Elemental Planes', 'branchLevel': 1},
            {'name': 'water', 'branch': 'Elemental Planes', 'branchLevel': 2},
            {'name': 'fire', 'branch': 'Elemental Planes', 'branchLevel': 3},
            {'name': 'air', 'branch': 'Elemental Planes', 'branchLevel': 4},
            {'name': 'earth', 'branch': 'Elemental Planes', 'branchLevel': 5},
        ],
    },
    'rogue': {
        'description': 'Rogue level',
        'levels': [
            {'name': 'rogue', 'branch': 'Dungeons of Doom'},
        ],
    },
    'bigroom': {
        'description': 'Big room (13 variants)',
        'levels': [
            {'name': 'bigrm', 'branch': 'Dungeons of Doom', 'nlevels': 13},
        ],
    },
    'filler': {
        'description': 'Filler levels (procedural maze levels)',
        'levels': [
            {'name': 'minefill', 'branch': 'Gnomish Mines'},
            {'name': 'hellfill', 'branch': 'Gehennom'},
        ],
    },
    'tutorial': {
        'description': 'Tutorial levels',
        'levels': [
            {'name': 'tut-1', 'branch': 'Tutorial'},
            {'name': 'tut-2', 'branch': 'Tutorial'},
        ],
    },
    'quest': {
        'description': 'Quest levels (13 roles × 3 levels: start/locate/goal)',
        'levels': [
            # Archeologist quest
            {'name': 'Arc-strt', 'branch': 'The Quest'},
            {'name': 'Arc-loca', 'branch': 'The Quest'},
            {'name': 'Arc-goal', 'branch': 'The Quest'},
            # Barbarian quest
            {'name': 'Bar-strt', 'branch': 'The Quest'},
            {'name': 'Bar-loca', 'branch': 'The Quest'},
            {'name': 'Bar-goal', 'branch': 'The Quest'},
            # Caveman quest
            {'name': 'Cav-strt', 'branch': 'The Quest'},
            {'name': 'Cav-loca', 'branch': 'The Quest'},
            {'name': 'Cav-goal', 'branch': 'The Quest'},
            # Healer quest
            {'name': 'Hea-strt', 'branch': 'The Quest'},
            {'name': 'Hea-loca', 'branch': 'The Quest'},
            {'name': 'Hea-goal', 'branch': 'The Quest'},
            # Knight quest
            {'name': 'Kni-strt', 'branch': 'The Quest'},
            {'name': 'Kni-loca', 'branch': 'The Quest'},
            {'name': 'Kni-goal', 'branch': 'The Quest'},
            # Monk quest
            {'name': 'Mon-strt', 'branch': 'The Quest'},
            {'name': 'Mon-loca', 'branch': 'The Quest'},
            {'name': 'Mon-goal', 'branch': 'The Quest'},
            # Priest quest
            {'name': 'Pri-strt', 'branch': 'The Quest'},
            {'name': 'Pri-loca', 'branch': 'The Quest'},
            {'name': 'Pri-goal', 'branch': 'The Quest'},
            # Ranger quest
            {'name': 'Ran-strt', 'branch': 'The Quest'},
            {'name': 'Ran-loca', 'branch': 'The Quest'},
            {'name': 'Ran-goal', 'branch': 'The Quest'},
            # Rogue quest
            {'name': 'Rog-strt', 'branch': 'The Quest'},
            {'name': 'Rog-loca', 'branch': 'The Quest'},
            {'name': 'Rog-goal', 'branch': 'The Quest'},
            # Samurai quest
            {'name': 'Sam-strt', 'branch': 'The Quest'},
            {'name': 'Sam-loca', 'branch': 'The Quest'},
            {'name': 'Sam-goal', 'branch': 'The Quest'},
            # Tourist quest
            {'name': 'Tou-strt', 'branch': 'The Quest'},
            {'name': 'Tou-loca', 'branch': 'The Quest'},
            {'name': 'Tou-goal', 'branch': 'The Quest'},
            # Valkyrie quest
            {'name': 'Val-strt', 'branch': 'The Quest'},
            {'name': 'Val-loca', 'branch': 'The Quest'},
            {'name': 'Val-goal', 'branch': 'The Quest'},
            # Wizard quest
            {'name': 'Wiz-strt', 'branch': 'The Quest'},
            {'name': 'Wiz-loca', 'branch': 'The Quest'},
            {'name': 'Wiz-goal', 'branch': 'The Quest'},
        ],
    },
}

QUEST_ROLE_BY_PREFIX = {
    'Arc': 'Archeologist',
    'Bar': 'Barbarian',
    'Cav': 'Caveman',
    'Hea': 'Healer',
    'Kni': 'Knight',
    'Mon': 'Monk',
    'Pri': 'Priest',
    'Ran': 'Ranger',
    'Rog': 'Rogue',
    'Sam': 'Samurai',
    'Tou': 'Tourist',
    'Val': 'Valkyrie',
    'Wiz': 'Wizard',
}


def generate_group(group_name, seeds, verbose=False):
    """Generate special-level sessions for one group across all requested seeds.

    Delegates to run_session.py --wizload for each level, producing
    one unified v3 session file per level.
    """
    if group_name not in LEVEL_GROUPS:
        print(f"Error: unknown group '{group_name}'")
        print(f"Available: {', '.join(sorted(LEVEL_GROUPS.keys()))}")
        sys.exit(1)

    # Elemental planes require endgame setup; route through dedicated harness
    if group_name == 'planes':
        cmd = [
            sys.executable,
            os.path.join(SCRIPT_DIR, 'gen_planes_with_amulet.py'),
            '--seeds',
            ','.join(str(s) for s in seeds),
        ]
        if verbose:
            cmd.append('--verbose')
        subprocess.run(cmd, check=True)
        return

    group = LEVEL_GROUPS[group_name]
    print(f"\n=== {group['description']} ===")
    print(f"Seeds: {seeds}")

    run_session_py = os.path.join(SCRIPT_DIR, 'run_session.py')
    os.makedirs(SESSIONS_DIR, exist_ok=True)

    for seed in seeds:
        print(f"\n--- Seed {seed} ---")

        if group_name == 'quest':
            # Quest levels need role-specific handling
            for level_def in group['levels']:
                level_name = level_def['name']
                prefix = level_name.split('-')[0]
                role_name = QUEST_ROLE_BY_PREFIX.get(prefix)
                if not role_name:
                    print(f"  WARNING: unknown quest role prefix for {level_name}, skipping")
                    continue

                output_file = os.path.join(SESSIONS_DIR, f'seed{seed}_{level_name}.session.json')
                cmd = [
                    sys.executable, run_session_py,
                    str(seed), output_file,
                    '--wizload', level_name,
                    '--character', role_name.lower(),
                ]
                if verbose:
                    cmd.append('--verbose')
                print(f"  Generating {level_name} (role={role_name})...")
                subprocess.run(cmd, check=True)
        else:
            # Non-quest levels
            for level_def in group['levels']:
                level_name = level_def['name']
                output_file = os.path.join(SESSIONS_DIR, f'seed{seed}_{level_name}.session.json')
                cmd = [
                    sys.executable, run_session_py,
                    str(seed), output_file,
                    '--wizload', level_name,
                ]
                if verbose:
                    cmd.append('--verbose')
                print(f"  Generating {level_name}...")
                subprocess.run(cmd, check=True)

    print(f"\n=== Done: {group_name} ===")


def main():
    args = sys.argv[1:]

    if '--list-groups' in args:
        print("Available level groups:")
        for name, group in sorted(LEVEL_GROUPS.items()):
            nlevels = len(group['levels'])
            print(f"  {name:12s} - {group['description']} ({nlevels} level(s))")
        return

    # Parse --seeds
    seeds = [42, 1, 100]
    for i, arg in enumerate(args):
        if arg == '--seeds' and i + 1 < len(args):
            seeds = [int(s) for s in args[i + 1].split(',')]
            args = args[:i] + args[i + 2:]
            break

    verbose = '--verbose' in args or os.environ.get('WEBHACK_DEBUG', '')
    args = [a for a in args if a != '--verbose']

    if '--all' in args:
        for group_name in LEVEL_GROUPS:
            generate_group(group_name, seeds, verbose)
        return

    if not args:
        print(f"Usage: {sys.argv[0]} <group> [--seeds 42,1,100]")
        print(f"       {sys.argv[0]} --all [--seeds 42,1,100]")
        print(f"       {sys.argv[0]} --list-groups")
        sys.exit(1)

    group_name = args[0]
    generate_group(group_name, seeds, verbose)


if __name__ == '__main__':
    main()
