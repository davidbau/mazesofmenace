// host/ship_entry.js - the game's modules as the host loads them.
//
// Imported dynamically by host/game.js after the heap is attached, so the emitted modules'
// top-level declarations and static initialisers run on the machine's memory. js/modules.js
// (emitted by tools/nh2js) evaluates the whole game in order, types layer first. This module
// exposes the C driver of tools/c2js/host/nhjs_tty_api.c (emitted: sys/c2js/nhjs_tty_api.js)
// and the game data (js/dat). The driver's EM_JS callbacks and the data installer are host
// functions (host/boot.js).

import "../modules.js";

export {
  nhjs_session_init,
  nhjs_install_data,
  nhjs_install_files,
  nhjs_session_run,
  nhjs_key_position,
  nhjs_started,
} from "../sys/c2js/nhjs_tty_api.js";
export { dataFiles } from "../dat/index.js";
