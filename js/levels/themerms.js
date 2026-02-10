/**
 * themerms - NetHack themed room library
 * Converted from: themerms.lua
 *
 * This is a LIBRARY module (not a level generator).
 * Exports theme room definitions and callback functions used by dungeon.js
 */

import * as des from '../sp_lev.js';
import { selection, percent, shuffle } from '../sp_lev.js';
import { rn2, rnd, d } from '../rng.js';

// Module-level state for postprocessing callbacks
let postprocess = [];

// Reset state between level generations
export function reset_state() {
    postprocess = [];
}

// themeroom_fills: Contents that can fill any room shape
// Each entry defines "name", optional "frequency"/"mindiff"/"maxdiff"/"eligible", and "contents" function
export const themeroom_fills = [

   {
      name: "Ice room",
      contents: function(rm) {
         const ice = selection.room();
         des.terrain(ice, "I");
         if (percent(25)) {
            const mintime = 1000 - (nh.level_difficulty() * 100);
            const ice_melter = function(x,y) {
               nh.start_timer_at(x,y, "melt-ice", mintime + nh.rn2(1000));
            };
            ice.iterate(ice_melter);
         }
      },
   },

   {
      name: "Cloud room",
      contents: function(rm) {
         const fog = selection.room();
         for (let i = 1; i <= (fog.numpoints() / 4); i++) {
            des.monster({ id: "fog cloud", asleep: true });
         }
         des.gas_cloud({ selection: fog });
      },
   },

   {
      name: "Boulder room",
      mindiff: 4,
      contents: function(rm) {
         const locs = selection.room().percentage(30);
         const func = function(x,y) {
            if (percent(50)) {
               des.object("boulder", x, y);
            } else {
               des.trap("rolling boulder", x, y);
            }
         };
         locs.iterate(func);
      },
   },

   {
      name: "Spider nest",
      contents: function(rm) {
         const spooders = nh.level_difficulty() > 8;
         const locs = selection.room().percentage(30);
         const func = function(x,y) {
            des.trap({ type: "web", x: x, y: y,
                       spider_on_web: spooders && percent(80) });
         };
         locs.iterate(func);
      },
   },

]; // End themeroom_fills

// Placeholder - will add themerooms array and functions below
// This is just the beginning of the restructure
export const themerooms = [];

// Callback functions (to be implemented)
export function pre_themerooms_generate() {
    // TODO: Port from Lua
}

export function post_themerooms_generate() {
    // TODO: Port from Lua
}

export function themeroom_fill(rm) {
    // TODO: Port from Lua
}

export function themerooms_generate(map, depth) {
    // TODO: Port from Lua
    return false; // Placeholder
}

export function post_level_generate() {
    // TODO: Port from Lua
}
