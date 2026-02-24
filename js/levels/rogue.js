/**
 * rogue - Rogue level generator
 *
 * C ref: mkmaze.c makeroguerooms() path selected by roguelike branch flags.
 * The special-level harness expects this as a callable generator.
 */

import { makeroguerooms } from '../extralev.js';

export function generate() {
    return makeroguerooms(15);
}
