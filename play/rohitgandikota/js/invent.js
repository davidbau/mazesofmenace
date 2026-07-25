// invent.js — inventory and the look-here command.
// C ref: src/invent.c

import { game } from './gstate.js';
import { doname } from './objnam.js';
import { OCLASSES } from './objects_data.js';
import { ATR_NONE, ATR_INVERSE } from './tty/wintty.js';
import { pline } from './display.js';

// include/hack.h — command result flags. ECMD_TIME means the command consumed
// a move, which is what makes moveloop advance svm.moves.
export const ECMD_OK = 0;
export const ECMD_TIME = 1;

// src/invent.c:4104 look_here()
//
// Only the empty-square path is ported so far: with no objects, no dungeon
// feature and not blind, C prints "You see no objects here." and returns
// ECMD_OK — so looking does NOT consume a turn. Objects, dungeon features and
// engravings join this function as those subsystems land.
export function look_here(obj_cnt, lhflags) {
    const Blind = !!game.u?.ublind;
    const verb = Blind ? 'feel' : 'see';

    /* no objects at the hero's square yet, because objects are not ported */
    You(`${verb} no objects here.`);
    return Blind ? ECMD_TIME : ECMD_OK;
}

// src/invent.c:4319 dolook()
export function dolook() {
    return look_here(0, 0);
}

// src/pline.c You() — "You " prefix on a message.
function You(msg) {
    pline(`You ${msg}`);
}

// ---------------------------------------------------------------------------
// Inventory display
// ---------------------------------------------------------------------------

// src/decl.c flags.inv_order — the default packorder.
function inv_order() {
    const O = OCLASSES;
    return [O.COIN_CLASS, O.AMULET_CLASS, O.WEAPON_CLASS, O.ARMOR_CLASS,
            O.FOOD_CLASS, O.SCROLL_CLASS, O.SPBOOK_CLASS, O.POTION_CLASS,
            O.RING_CLASS, O.WAND_CLASS, O.TOOL_CLASS, O.GEM_CLASS,
            O.ROCK_CLASS, O.BALL_CLASS, O.CHAIN_CLASS, O.VENOM_CLASS];
}

const CLASS_NAMES = {
    COIN_CLASS: 'Coins', AMULET_CLASS: 'Amulets', WEAPON_CLASS: 'Weapons',
    ARMOR_CLASS: 'Armor', FOOD_CLASS: 'Comestibles', SCROLL_CLASS: 'Scrolls',
    SPBOOK_CLASS: 'Spellbooks', POTION_CLASS: 'Potions', RING_CLASS: 'Rings',
    WAND_CLASS: 'Wands', TOOL_CLASS: 'Tools', GEM_CLASS: 'Gems or Stones',
    ROCK_CLASS: 'Boulders/Statues', BALL_CLASS: 'Iron Balls',
    CHAIN_CLASS: 'Chains', VENOM_CLASS: 'Venoms',
};
function let_to_name(oclass) {
    for (const [k, v] of Object.entries(OCLASSES))
        if (v === oclass && CLASS_NAMES[k]) return CLASS_NAMES[k];
    return '';
}

// src/invent.c:3220 display_pickinv() — walk flags.inv_order, heading each
// non-empty class, then its items in inventory-letter order.
//
// Returns the menu entries the caller feeds to add_menu(): a heading has no
// selector and no identifier, an item carries its inventory letter. The "a - "
// prefix is NOT built here; tty_add_menu() builds it, exactly as in C, which is
// what makes the +2 in tty_end_menu()'s width the right rule for this window.
export function display_inventory() {
    const out = [];
    for (const oclass of inv_order()) {
        const items = (game.invent || []).filter(o => o.oclass === oclass);
        if (!items.length) continue;
        /* add_menu_heading(win, class_header) — iflags.menu_headings */
        out.push({ heading: true, str: let_to_name(oclass), attr: ATR_INVERSE });
        for (const o of items)
            out.push({ heading: false, str: doname(o), attr: ATR_NONE,
                       invlet: o.invlet });
    }
    return out;
}
