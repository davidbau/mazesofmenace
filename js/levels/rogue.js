/**
 * rogue - Rogue level generator
 *
 * C ref: mkmaze.c makeroguerooms() path selected by roguelike branch flags.
 * The special-level harness expects this as a callable generator.
 */

import { generate_rogue_level } from '../dungeon.js';

export function generate() {
    return generate_rogue_level(15);
}
