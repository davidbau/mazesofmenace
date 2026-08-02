// windows.js — the window-system layer above the windowport.
// C ref: src/windows.c
//
// Only choose_classes_menu() so far: the object-class picker that
// optfn_pickup_types() puts up for "Autopickup what?".

import {
    NHW_MENU, ATR_NONE,
    tty_create_nhwindow, tty_destroy_nhwindow, tty_start_menu, tty_add_menu,
    tty_add_menu_str, tty_end_menu, tty_select_menu, tty_get_nhwindow,
} from './tty/wintty.js';
import {
    MENU_ITEMFLAGS_NONE, MENU_ITEMFLAGS_SELECTED, MENU_ITEMFLAGS_SKIPINVERT,
    PICK_ONE, PICK_ANY,
} from './const.js';
import { NO_COLOR } from './terminal.js';
import { oc_explain } from './drawing_data.js';
/* src/drawing.c def_char_to_objclass(); this port keeps it in js/sp_lev.js,
   where the level loader needed it first. */
import { def_char_to_objclass } from './sp_lev.js';
import { game } from './gstate.js';

// src/windows.c:1644 choose_classes_menu()
//
// `class_list` is the string of class symbols to offer and `class_select` the
// incoming/outgoing selection. C passes the latter as a char* out-parameter;
// here it is a box, `{ s }`, read for the preselection and written with the
// result. Returns the number picked, or -1 when cancelled, as the C does.
export async function choose_classes_menu(prompt, category, way,
                                          class_list, class_select) {
    let ret;
    let next_accelerator = 'a', accelerator = 0;
    const clr = NO_COLOR;

    if (!class_list || !class_select)
        return 0;
    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, 0 /* MENU_BEHAVE_STANDARD */);
    for (const cls of class_list) {
        let selected = false, text, buf;

        switch (category) {
        case 0:
            /* monster classes: only used by the wizard-mode monster-class
               picker, which nothing ported calls yet */
            tty_destroy_nhwindow(win);
            return 0;
        case 1: {
            const idx = def_char_to_objclass(cls);
            text = oc_explain[idx];
            accelerator = next_accelerator;
            buf = `${cls}  ${text}`;
            break;
        }
        default:
            /* panic("choose_classes_menu: invalid category %d", category) */
            tty_destroy_nhwindow(win);
            return 0;
        }
        if (way && class_select.s) {  /* Selections there already */
            if (class_select.s.includes(cls))
                selected = true;
        }
        tty_add_menu(win, null, cls.charCodeAt(0), accelerator,
                     category ? cls : 0, ATR_NONE, clr, buf,
                     selected ? MENU_ITEMFLAGS_SELECTED : MENU_ITEMFLAGS_NONE);
        if (category > 0) {
            if (next_accelerator === 'Z')
                break;
            else if (next_accelerator === 'z')
                next_accelerator = 'A';
            else
                next_accelerator =
                    String.fromCharCode(next_accelerator.charCodeAt(0) + 1);
        }
    }
    if (category === 1 && next_accelerator <= 'z') {
        /* for objects, add "A - ' '  all classes", after a separator */
        tty_add_menu_str(win, '');
        /* we won't preselect this even if the incoming list is empty;
           having it selected means that it would have to be explicitly
           de-selected in order to select anything else */
        tty_add_menu(win, null, ' '.charCodeAt(0), 'A', 0, ATR_NONE, clr,
                     `${' '}  All classes of objects`,
                     MENU_ITEMFLAGS_SKIPINVERT);
        if (prompt === 'Autopickup what?') {
            tty_add_menu_str(win,
                'Note: when no choices are selected, "all" is implied.');
            /* for 'O', "toggle" should be intuitive; for 'm O', it would
               probably be better to say "Set 'autopickup' to true|false" */
            tty_add_menu_str(win, game.flags?.autopickup
                ? "Toggle off 'autopickup' to not pick up anything."
                : "Toggle on 'autopickup' to automatically pick these things up.");
        }
    }
    tty_end_menu(win, prompt);
    const pick_list = await tty_select_menu(win, way ? PICK_ANY : PICK_ONE);
    let n = pick_list.length;
    /* tty_select_menu() returns [] both for "nothing picked" and for ESC; C
       tells them apart through select_menu()'s -1, which comes from the
       window's WIN_CANCELLED flag, so read it before the window goes away. */
    const cancelled = !!tty_get_nhwindow(win)?.cancelled;
    tty_destroy_nhwindow(win);

    if (n > 0) {
        let picks = pick_list;
        if (category === 1) {
            /* for object classes, first check for 'all'; it means 'use
               a blank list' rather than 'collect every possible choice' */
            for (let i = 0; i < n; ++i)
                if (picks[i] === ' '.charCodeAt(0)) {
                    picks = [' '.charCodeAt(0)];
                    n = 1;
                }
        }
        class_select.s = picks.map(c => String.fromCharCode(c)).join('');
        ret = n;
    } else if (cancelled) {
        ret = -1;
    } else {
        class_select.s = '';
        ret = 0;
    }
    return ret;
}
