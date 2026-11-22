// shknam.js — shop types, shopkeeper names, shopkeeper creation.
// C ref: shknam.c

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import {
    ROOMOFFSET, isok, ALL_TRAPS, D_SHOP, D_NODOOR, D_ISOPEN, D_TRAPPED, D_LOCKED,
    SDOOR, In_mines, MM_ESHK, NO_MM_FLAGS, IS_ROOM, TRUE, FALSE,
} from './const.js';
import {
    RANDOM_CLASS, WEAPON_CLASS, ARMOR_CLASS, RING_CLASS, AMULET_CLASS, TOOL_CLASS,
    FOOD_CLASS, POTION_CLASS, SCROLL_CLASS, SPBOOK_CLASS, WAND_CLASS, GEM_CLASS,
    MAXOCLASSES, POT_FRUIT_JUICE, POT_BOOZE, POT_WATER, ICE_BOX, LEATHER_GLOVES,
    ELVEN_CLOAK, POT_HEALING, POT_FULL_HEALING, SCR_FOOD_DETECTION,
    LUMP_OF_ROYAL_JELLY, WAX_CANDLE, TALLOW_CANDLE, BRASS_LANTERN, OIL_LAMP,
    MAGIC_LAMP, POT_OIL, WAN_LIGHT, SCR_LIGHT, SPE_LIGHT, SCR_CHARGING, TOUCHSTONE,
    SPE_NOVEL, NUM_OBJECTS, VEGGY, EGG, TIN, CORPSE, objects, OBJ_NAME,
} from './objects.js';
import { mons, PM_SHOPKEEPER, S_MIMIC, PM_LICHEN } from './monsters.js';
import { makemon, mkmonmoney, mongets, set_malign, m_at, MON_AT, mkclass } from './makemon.js';
import { RLOC_NOMSG } from './const.js';
import { mkobj_at, mksobj_at, set_tin_variety } from './mkobj.js';
import { vegetarian } from './eat.js';
import { distmin, highc } from './hacklib.js';
import { mon_learns_traps } from './mondata.js';
import { HALLUC, HALLUC_RES, HEALTHY_TIN, NON_PM, ismnum } from './const.js';
import { noit_mon_nam } from './do_name.js';
import { ledger_no, Is_special, assign_level, on_level, depth } from './dungeon.js';
import { newsym } from './display.js';
import { cvt_sdoor_to_door } from './detect.js';
import { rloc_mklev } from './teleport.js';
import { shop_keeper } from './shk.js';
import { mongone } from './mon.js';

// C ref: mkroom.h VEGETARIAN_CLASS
const VEGETARIAN_CLASS = MAXOCLASSES + 1;

const shkliquors = [
    /* Ukraine */
    "Njezjin", "Tsjernigof", "Ossipewsk", "Gorlowka",
    /* Belarus */
    "Gomel",
    /* N. Russia */
    "Konosja", "Weliki Oestjoeg", "Syktywkar", "Sablja", "Narodnaja", "Kyzyl",
    /* Silezie */
    "Walbrzych", "Swidnica", "Klodzko", "Raciborz", "Gliwice", "Brzeg",
    "Krnov", "Hradec Kralove",
    /* Schweiz */
    "Leuk", "Brig", "Brienz", "Thun", "Sarnen", "Burglen", "Elm", "Flims",
    "Vals", "Schuls", "Zum Loch", null
];

const shkbooks = [
    /* Eire */
    "Skibbereen",  "Kanturk",   "Rath Luirc",     "Ennistymon",
    "Lahinch",     "Kinnegad",  "Lugnaquillia",   "Enniscorthy",
    "Gweebarra",   "Kittamagh", "Nenagh",         "Sneem",
    "Ballingeary", "Kilgarvan", "Cahersiveen",    "Glenbeigh",
    "Kilmihil",    "Kiltamagh", "Droichead Atha", "Inniscrone",
    "Clonegal",    "Lisnaskea", "Culdaff",        "Dunfanaghy",
    "Inishbofin",  "Kesh",      null
];

const shkarmors = [
    /* Turquie */
    "Demirci",    "Kalecik",    "Boyabai",    "Yildizeli", "Gaziantep",
    "Siirt",      "Akhalataki", "Tirebolu",   "Aksaray",   "Ermenak",
    "Iskenderun", "Kadirli",    "Siverek",    "Pervari",   "Malasgirt",
    "Bayburt",    "Ayancik",    "Zonguldak",  "Balya",     "Tefenni",
    "Artvin",     "Kars",       "Makharadze", "Malazgirt", "Midyat",
    "Birecik",    "Kirikkale",  "Alaca",      "Polatli",   "Nallihan",
    null
];

const shkwands = [
    /* Wales */
    "Yr Wyddgrug", "Trallwng", "Mallwyd", "Pontarfynach", "Rhaeader",
    "Llandrindod", "Llanfair-ym-muallt", "Y-Fenni", "Maesteg", "Rhydaman",
    "Beddgelert", "Curig", "Llanrwst", "Llanerchymedd", "Caergybi",
    /* Scotland */
    "Nairn", "Turriff", "Inverurie", "Braemar", "Lochnagar", "Kerloch",
    "Beinn a Ghlo", "Drumnadrochit", "Morven", "Uist", "Storr",
    "Sgurr na Ciche", "Cannich", "Gairloch", "Kyleakin", "Dunvegan", null
];

const shkrings = [
    /* Hollandse familienamen */
    "Feyfer",     "Flugi",         "Gheel",      "Havic",   "Haynin",
    "Hoboken",    "Imbyze",        "Juyn",       "Kinsky",  "Massis",
    "Matray",     "Moy",           "Olycan",     "Sadelin", "Svaving",
    "Tapper",     "Terwen",        "Wirix",      "Ypey",
    /* Skandinaviske navne */
    "Rastegaisa", "Varjag Njarga", "Kautekeino", "Abisko",  "Enontekis",
    "Rovaniemi",  "Avasaksa",      "Haparanda",  "Lulea",   "Gellivare",
    "Oeloe",      "Kajaani",       "Fauske",     null
];

const shkfoods = [
    /* Indonesia */
    "Djasinga",    "Tjibarusa",   "Tjiwidej",      "Pengalengan",
    "Bandjar",     "Parbalingga", "Bojolali",      "Sarangan",
    "Ngebel",      "Djombang",    "Ardjawinangun", "Berbek",
    "Papar",       "Baliga",      "Tjisolok",      "Siboga",
    "Banjoewangi", "Trenggalek",  "Karangkobar",   "Njalindoeng",
    "Pasawahan",   "Pameunpeuk",  "Patjitan",      "Kediri",
    "Pemboeang",   "Tringanoe",   "Makin",         "Tipor",
    "Semai",       "Berhala",     "Tegal",         "Samoe",
    null
];

const shkweapons = [
    /* Perigord */
    "Voulgezac",   "Rouffiac",   "Lerignac",   "Touverac",  "Guizengeard",
    "Melac",       "Neuvicq",    "Vanzac",     "Picq",      "Urignac",
    "Corignac",    "Fleac",      "Lonzac",     "Vergt",     "Queyssac",
    "Liorac",      "Echourgnac", "Cazelon",    "Eypau",     "Carignan",
    "Monbazillac", "Jonzac",     "Pons",       "Jumilhac",  "Fenouilledes",
    "Laguiolet",   "Saujon",     "Eymoutiers", "Eygurande", "Eauze",
    "Labouheyre",  null
];

const shktools = [
    /* Spmi */
    "Ymla", "Eed-morra", "Elan Lapinski", "Cubask", "Nieb", "Bnowr Falr",
    "Sperc", "Noskcirdneh", "Yawolloh", "Hyeghu", "Niskal", "Trahnil",
    "Htargcm", "Enrobwem", "Kachzi Rellim", "Regien", "Donmyar", "Yelpur",
    "Nosnehpets", "Stewe", "Renrut", "Senna Hut", "-Zlaw", "Nosalnef",
    "Rewuorb", "Rellenk", "Yad", "Cire Htims", "Y-crad", "Nenilukah",
    "Corsh", "Aned", "Dark Eery", "Niknar", "Lapu", "Lechaim",
    "Rebrol-nek", "AlliWar Wickson", "Oguhmk", "Telloc Cyaj",
    null
];

const shklight = [
    /* Romania */
    "Zarnesti", "Slanic", "Nehoiasu", "Ludus", "Sighisoara", "Nisipitu",
    "Razboieni", "Bicaz", "Dorohoi", "Vaslui", "Fetesti", "Tirgu Neamt",
    "Babadag", "Zimnicea", "Zlatna", "Jiu", "Eforie", "Mamaia",
    /* Bulgaria */
    "Silistra", "Tulovo", "Panagyuritshte", "Smolyan", "Kirklareli", "Pernik",
    "Lom", "Haskovo", "Dobrinishte", "Varvara", "Oryahovo", "Troyan",
    "Lovech", "Sliven", null
];

const shkgeneral = [
    /* Suriname */
    "Hebiwerie",    "Possogroenoe", "Asidonhopo",   "Manlobbi",
    "Adjama",       "Pakka Pakka",  "Kabalebo",     "Wonotobo",
    "Akalapi",      "Sipaliwini",
    /* Greenland */
    "Annootok",     "Upernavik",    "Angmagssalik",
    /* N. Canada */
    "Aklavik",      "Inuvik",       "Tuktoyaktuk",  "Chicoutimi",
    "Ouiatchouane", "Chibougamau",  "Matagami",     "Kipawa",
    "Kinojevis",    "Abitibi",      "Maganasipi",
    /* Iceland */
    "Akureyri",     "Kopasker",     "Budereyri",    "Akranes",
    "Bordeyri",     "Holmavik",     null
];

const shkhealthfoods = [
    /* Tibet */
    "Ga'er",    "Zhangmu",   "Rikaze",   "Jiangji",     "Changdu",
    "Linzhi",   "Shigatse",  "Gyantse",  "Ganden",      "Tsurphu",
    "Lhasa",    "Tsedong",   "Drepung",
    /* Hippie names */
    "=Azura",   "=Blaze",    "=Breanna", "=Breezy",     "=Dharma",
    "=Feather", "=Jasmine",  "=Luna",    "=Melody",     "=Moonjava",
    "=Petal",   "=Rhiannon", "=Starla",  "=Tranquilla", "=Windsong",
    "=Zennia",  "=Zoe",      "=Zora",    null
];

// C ref: shknam.c shtypes[]
export const shtypes = [
    { name: 'general store', noun: null, symb: RANDOM_CLASS, prob: 42,
      shdist: D_SHOP,
      iprobs: [ { iprob: 100, itype: RANDOM_CLASS }, { iprob: 0, itype: 0 },
                { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 },
                { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 } ],
      shknms: shkgeneral },
    { name: 'used armor dealership', noun: 'armor shop', symb: ARMOR_CLASS, prob: 14,
      shdist: D_SHOP,
      iprobs: [ { iprob: 90, itype: ARMOR_CLASS }, { iprob: 10, itype: WEAPON_CLASS },
                { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 },
                { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 } ],
      shknms: shkarmors },
    { name: 'second-hand bookstore', noun: 'scroll shop', symb: SCROLL_CLASS, prob: 10,
      shdist: D_SHOP,
      iprobs: [ { iprob: 90, itype: SCROLL_CLASS }, { iprob: 10, itype: SPBOOK_CLASS },
                { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 },
                { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 } ],
      shknms: shkbooks },
    { name: 'liquor emporium', noun: 'potion shop', symb: POTION_CLASS, prob: 10,
      shdist: D_SHOP,
      iprobs: [ { iprob: 100, itype: POTION_CLASS }, { iprob: 0, itype: 0 },
                { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 },
                { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 } ],
      shknms: shkliquors },
    { name: 'antique weapons outlet', noun: 'weapon shop', symb: WEAPON_CLASS, prob: 5,
      shdist: D_SHOP,
      iprobs: [ { iprob: 90, itype: WEAPON_CLASS }, { iprob: 10, itype: ARMOR_CLASS },
                { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 },
                { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 } ],
      shknms: shkweapons },
    { name: 'delicatessen', noun: 'food shop', symb: FOOD_CLASS, prob: 5,
      shdist: D_SHOP,
      iprobs: [ { iprob: 83, itype: FOOD_CLASS }, { iprob: 5, itype: -POT_FRUIT_JUICE },
                { iprob: 4, itype: -POT_BOOZE }, { iprob: 5, itype: -POT_WATER },
                { iprob: 3, itype: -ICE_BOX }, { iprob: 0, itype: 0 } ],
      shknms: shkfoods },
    { name: 'jewelers', noun: 'ring shop', symb: RING_CLASS, prob: 3,
      shdist: D_SHOP,
      iprobs: [ { iprob: 85, itype: RING_CLASS }, { iprob: 10, itype: GEM_CLASS },
                { iprob: 5, itype: AMULET_CLASS }, { iprob: 0, itype: 0 },
                { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 } ],
      shknms: shkrings },
    { name: 'quality apparel and accessories', noun: 'wand shop', symb: WAND_CLASS, prob: 3,
      shdist: D_SHOP,
      iprobs: [ { iprob: 90, itype: WAND_CLASS }, { iprob: 5, itype: -LEATHER_GLOVES },
                { iprob: 5, itype: -ELVEN_CLOAK }, { iprob: 0, itype: 0 } ],
      shknms: shkwands },
    { name: 'hardware store', noun: 'tool shop', symb: TOOL_CLASS, prob: 3,
      shdist: D_SHOP,
      iprobs: [ { iprob: 100, itype: TOOL_CLASS }, { iprob: 0, itype: 0 },
                { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 },
                { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 } ],
      shknms: shktools },
    { name: 'rare books', noun: 'bookstore', symb: SPBOOK_CLASS, prob: 3,
      shdist: D_SHOP,
      iprobs: [ { iprob: 90, itype: SPBOOK_CLASS }, { iprob: 10, itype: SCROLL_CLASS },
                { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 },
                { iprob: 0, itype: 0 }, { iprob: 0, itype: 0 } ],
      shknms: shkbooks },
    { name: 'health food store', noun: 'vegetarian food shop', symb: FOOD_CLASS, prob: 2,
      shdist: D_SHOP,
      iprobs: [ { iprob: 70, itype: VEGETARIAN_CLASS }, { iprob: 20, itype: -POT_FRUIT_JUICE },
                { iprob: 4, itype: -POT_HEALING }, { iprob: 3, itype: -POT_FULL_HEALING },
                { iprob: 2, itype: -SCR_FOOD_DETECTION },
                { iprob: 1, itype: -LUMP_OF_ROYAL_JELLY } ],
      shknms: shkhealthfoods },
    /* Shops below this point are "unique".  That is they must all have a
     * probability of zero.  They are only created via the special level
     * loader.
     */
    { name: 'lighting store', noun: 'lighting shop', symb: TOOL_CLASS, prob: 0,
      shdist: D_SHOP,
      iprobs: [ { iprob: 30, itype: -WAX_CANDLE }, { iprob: 44, itype: -TALLOW_CANDLE },
                { iprob: 5, itype: -BRASS_LANTERN }, { iprob: 9, itype: -OIL_LAMP },
                { iprob: 3, itype: -MAGIC_LAMP }, { iprob: 5, itype: -POT_OIL },
                { iprob: 2, itype: -WAN_LIGHT }, { iprob: 1, itype: -SCR_LIGHT },
                { iprob: 1, itype: -SPE_LIGHT } ],
      shknms: shklight },
];

// C ref: shknam.c nameshk()
function nameshk(shk, nlp) {
    let i, trycnt, names_avail;
    let shname = null;
    let mtmp;
    let name_wanted = shk.m_id;
    let sptr;

    if (nlp === shklight && In_mines(game.u.uz)
        && (sptr = Is_special(game.u.uz)) && sptr.flags?.town) {
        /* special-case minetown lighting shk */
        shname = '+Izchak';
        shk.female = 0;
    } else {
        /* We want variation from game to game, without needing the save
           and restore support which would be necessary for randomization;
           try not to make too many assumptions about time_t's internals;
           use ledger_no rather than depth to keep minetown distinct. */
        const nseed = Math.trunc((game.ubirthday || 0) / 257);

        name_wanted += ledger_no(game.u.uz) + (nseed % 13) - (nseed % 5);
        if (name_wanted < 0)
            name_wanted += (13 + 5);
        shk.female = name_wanted & 1;

        for (names_avail = 0; nlp[names_avail]; names_avail++)
            continue;
        name_wanted = name_wanted % names_avail;

        for (trycnt = 0; trycnt < 50; trycnt++) {
            if (nlp === shktools) {
                shname = shktools[rn2(names_avail)];
                shk.female = 0; /* reversed below for '_' prefix */
            } else if (name_wanted < names_avail) {
                shname = nlp[name_wanted];
            } else if ((i = rn2(names_avail)) !== 0) {
                shname = nlp[i - 1];
            } else if (nlp !== shkgeneral) {
                nlp = shkgeneral; /* try general names */
                for (names_avail = 0; nlp[names_avail]; names_avail++)
                    continue;
                continue; /* next `trycnt' iteration */
            } else {
                shname = shk.female ? '-Lucrezia' : '+Dirk';
            }
            if (shname[0] === '_' || shname[0] === '-')
                shk.female = 1;
            else if (shname[0] === '|' || shname[0] === '+')
                shk.female = 0;

            /* is name already in use on this level? */
            for (mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
                if (mtmp.mhp < 1 /* DEADMONSTER */ || (mtmp === shk) || !mtmp.isshk)
                    continue;
                if (mtmp.mextra.eshk.shknam !== shname)
                    continue;
                name_wanted = names_avail; /* try a random name */
                break;
            }
            if (!mtmp)
                break; /* new name */
        }
    }
    shk.mextra.eshk.shknam = shname;
}

// C ref: shknam.c good_shopdoor()
/* find a door in room sroom which is good for shop entrance.
   returns -1 if no good door found, or the doors index
   and the door coordinates in s.x, s.y */
function good_shopdoor(sroom, s) {
    const levl = (x, y) => game.level.at(x, y);

    for (let i = 0; i < sroom.doorct; i++) {
        const di = sroom.fdoor + i;

        s.x = game.level.doors[di].x;
        s.y = game.level.doors[di].y;

        /* check that the shopkeeper placement is sane */
        if (sroom.irregular) {
            const rmno = sroom.roomnoidx + ROOMOFFSET;

            if (isok(s.x - 1, s.y) && !levl(s.x - 1, s.y).edge
                && levl(s.x - 1, s.y).roomno === rmno)
                s.x--;
            else if (isok(s.x + 1, s.y) && !levl(s.x + 1, s.y).edge
                     && levl(s.x + 1, s.y).roomno === rmno)
                s.x++;
            else if (isok(s.x, s.y - 1) && !levl(s.x, s.y - 1).edge
                     && levl(s.x, s.y - 1).roomno === rmno)
                s.y--;
            else if (isok(s.x, s.y + 1) && !levl(s.x, s.y + 1).edge
                     && levl(s.x, s.y + 1).roomno === rmno)
                s.y++;
            else
                continue;
        } else if (s.x === sroom.lx - 1) {
            s.x++;
        } else if (s.x === sroom.hx + 1) {
            s.x--;
        } else if (s.y === sroom.ly - 1) {
            s.y++;
        } else if (s.y === sroom.hy + 1) {
            s.y--;
        } else {
            continue;
        }
        return di;
    }
    return -1;
}

// C ref: shknam.c shkinit()
/* create a new shopkeeper in the given room */
function shkinit(shp, sroom) {
    const s = { x: 0, y: 0 };

    /* place the shopkeeper in the given room */
    const sh = good_shopdoor(sroom, s);
    if (sh < 0)
        return -1;
    const sx = s.x, sy = s.y;

    if (MON_AT(sx, sy))
        rloc_mklev(m_at(sx, sy), RLOC_NOMSG); /* rloc(): insurance */

    /* now initialize the shopkeeper monster structure */
    const shk = makemon(mons[PM_SHOPKEEPER], sx, sy, MM_ESHK);
    if (!shk)
        return -1;
    const eshkp = shk.mextra.eshk; /* makemon(...,MM_ESHK) allocates this */
    shk.isshk = shk.mpeaceful = 1;
    set_malign(shk);
    shk.msleeping = 0;
    mon_learns_traps(shk, ALL_TRAPS); /* we know all the traps already */
    eshkp.shoproom = sroom.roomnoidx + ROOMOFFSET;
    sroom.resident = shk;
    eshkp.shoptype = sroom.rtype;
    eshkp.shoplevel = { dnum: 0, dlevel: 0 };
    assign_level(eshkp.shoplevel, game.u.uz);
    eshkp.shd = { x: game.level.doors[sh].x, y: game.level.doors[sh].y };
    eshkp.shk = { x: sx, y: sy };
    eshkp.robbed = eshkp.credit = eshkp.debit = eshkp.loan = 0;
    eshkp.following = eshkp.surcharge = eshkp.dismiss_kops = false;
    eshkp.billct = eshkp.visitct = 0;
    eshkp.bill_p = null;
    eshkp.customer = '';
    mkmonmoney(shk, 1000 + 30 * rnd(100)); /* initial capital */
    if (shp.shknms === shkrings)
        mongets(shk, TOUCHSTONE);
    if (shp.shknms === shktools || shp.shknms === shkwands
        || (shp.shknms === shkrings && rn2(2))
        || (shp.shknms === shkgeneral && rn2(5)))
        mongets(shk, SCR_CHARGING);
    nameshk(shk, shp.shknms);

    return sh;
}

// C ref: shknam.c stock_room()
/* stock a newly-created room with objects */
export function stock_room(shp_indx, sroom) {
    const levl = (x, y) => game.level.at(x, y);
    const shp = shtypes[shp_indx];
    let sh;

    /* first, try to place a shopkeeper in the room */
    if ((sh = shkinit(shp, sroom)) < 0)
        return;

    /* make sure no doorways without doors, and no trapped doors, in shops */
    const sx = game.level.doors[sroom.fdoor].x;
    const sy = game.level.doors[sroom.fdoor].y;
    if (levl(sx, sy).doormask === D_NODOOR) {
        levl(sx, sy).doormask = D_ISOPEN;
        newsym(sx, sy);
    }
    if (levl(sx, sy).typ === SDOOR) {
        cvt_sdoor_to_door(levl(sx, sy)); /* .typ = DOOR */
        newsym(sx, sy);
    }
    if (levl(sx, sy).doormask & D_TRAPPED)
        levl(sx, sy).doormask = D_LOCKED;

    if (levl(sx, sy).doormask === D_LOCKED)
        throw new Error('stock_room(): "Closed for inventory" engraving not ported yet');

    const rmno = sroom.roomnoidx + ROOMOFFSET;
    let stockcount = 0, specialspot = 0;
    const tribute = game.context.tribute;

    if (tribute && tribute.enabled && !tribute.bookstock) {
        /*
         * Out of the number of spots where we're actually
         * going to put stuff, randomly single out one in particular.
         */
        for (let x = sroom.lx; x <= sroom.hx; x++)
            for (let y = sroom.ly; y <= sroom.hy; y++)
                if (stock_room_goodpos(sroom, rmno, sh, x, y))
                    stockcount++;
        specialspot = rnd(stockcount);
        stockcount = 0;
    }

    for (let x = sroom.lx; x <= sroom.hx; x++)
        for (let y = sroom.ly; y <= sroom.hy; y++)
            if (stock_room_goodpos(sroom, rmno, sh, x, y)) {
                stockcount++;
                mkshobj_at(shp, x, y,
                           ((stockcount) && (stockcount === specialspot)));
            }

    /*
     * Special monster placements (if any) should go here: that way,
     * monsters will sit on top of objects and not the other way around.
     */

    /* Hack for Orcus's level: it's a ghost town, get rid of shopkeepers */
    if (on_level(game.u.uz, game.dungeon_topology.d_orcus_level)) {
        const mtmp = shop_keeper(rmno);
        mongone(mtmp);
    }

    game.level.flags.has_shop = TRUE;
}

// C ref: shknam.c stock_room_goodpos()
function stock_room_goodpos(sroom, rmno, sh, sx, sy) {
    const levl = (x, y) => game.level.at(x, y);
    const door = game.level.doors[sh];

    if (sroom.irregular) {
        if (levl(sx, sy).edge
            || levl(sx, sy).roomno !== rmno
            || distmin(sx, sy, door.x, door.y) <= 1)
            return FALSE;
    } else if ((sx === sroom.lx && door.x === sx - 1)
               || (sx === sroom.hx && door.x === sx + 1)
               || (sy === sroom.ly && door.y === sy - 1)
               || (sy === sroom.hy && door.y === sy + 1))
        return FALSE;

    /* only generate items on solid floor squares */
    if (!IS_ROOM(levl(sx, sy).typ)) {
        return FALSE;
    }

    return TRUE;
}

// C ref: shknam.c veggy_item()
/* is 'obj' (or, if obj is null, 'otyp') vegetarian food? */
// C ref: shknam.c saleable()
/* does shkp's shop stock this kind of item? */
export function saleable(shkp, obj) {
    const shp_indx = shkp.mextra.eshk.shoptype - SHOPBASE;
    const shp = shtypes[shp_indx];

    if (shp.symb === RANDOM_CLASS)
        return true;
    for (let i = 0; i < shtypes[0].iprobs.length && shp.iprobs[i].iprob; i++) {
        /* pseudo-class needs special handling */
        if (shp.iprobs[i].itype === VEGETARIAN_CLASS) {
            if (veggy_item(obj, 0))
                return true;
        } else if ((shp.iprobs[i].itype < 0)
                       ? shp.iprobs[i].itype === -obj.otyp
                       : shp.iprobs[i].itype === obj.oclass)
            return true;
    }
    /* not found */
    return false;
}

export function veggy_item(obj, otyp /* used iff obj is null */) {
    let corpsenm;
    let oclass;

    if (obj) {
        /* actual object; will check tin content and corpse species */
        otyp = obj.otyp;
        oclass = obj.oclass;
        corpsenm = obj.corpsenm;
    } else {
        /* just a type; caller will have to handle tins and corpses */
        oclass = objects[otyp].oc_class;
        corpsenm = PM_LICHEN; /* veggy standin */
    }

    if (oclass === FOOD_CLASS) {
        if (objects[otyp].oc_material === VEGGY || otyp === EGG)
            return TRUE;
        if (otyp === TIN && corpsenm === NON_PM) /* implies obj is non-null */
            return (obj.spe === 1); /* 0 = empty, 1 = spinach */
        if (otyp === TIN || otyp === CORPSE)
            return (ismnum(corpsenm) && vegetarian(mons[corpsenm]));
    }
    return FALSE;
}

// C ref: shknam.c shkveg()
function shkveg() {
    let i, j, maxprob, prob;
    const oclass = FOOD_CLASS;
    const ok = new Array(NUM_OBJECTS).fill(0);

    j = maxprob = 0;
    for (i = game.bases[oclass]; i < NUM_OBJECTS; ++i) {
        if (objects[i].oc_class !== oclass)
            break;

        if (veggy_item(null, i)) {
            ok[j++] = i;
            maxprob += objects[i].oc_prob;
        }
    }
    if (maxprob < 1)
        throw new Error('panic: shkveg no veggy objects');
    prob = rnd(maxprob);

    j = 0;
    i = ok[0];
    while ((prob -= objects[i].oc_prob) > 0) {
        j++;
        i = ok[j];
    }

    if (objects[i].oc_class !== oclass || !OBJ_NAME(objects[i]))
        throw new Error(`panic: shkveg probtype error, oclass=${oclass} i=${i}`);
    return i;
}

// C ref: shknam.c mkveggy_at()
/* make a random item for health food store */
function mkveggy_at(sx, sy) {
    const obj = mksobj_at(shkveg(), sx, sy, TRUE, TRUE);

    if (obj && obj.otyp === TIN)
        set_tin_variety(obj, HEALTHY_TIN);
    return;
}

// C ref: shknam.c mkshobj_at()
/* make an object of the appropriate type for a shop square */
function mkshobj_at(shp, sx, sy, mkspecl) {
    let mtmp;
    let ptr;
    let atype;

    /* 3.6 tribute */
    if (mkspecl && (shp.name === 'rare books'
                    || shp.name === 'second-hand bookstore')) {
        const novel = mksobj_at(SPE_NOVEL, sx, sy, FALSE, FALSE);

        if (novel)
            game.context.tribute.bookstock = TRUE;
        return;
    }

    if (rn2(100) < depth(game.u.uz) && !m_at(sx, sy)
        && (ptr = mkclass(S_MIMIC, 0)) != null
        && (mtmp = makemon(ptr, sx, sy, NO_MM_FLAGS)) != null) {
        /* nothing */
    } else {
        atype = get_shop_item(shtypes.indexOf(shp));
        if (atype === VEGETARIAN_CLASS)
            mkveggy_at(sx, sy);
        else if (atype < 0)
            mksobj_at(-atype, sx, sy, TRUE, TRUE);
        else
            mkobj_at(atype, sx, sy, TRUE);
    }
}

// C ref: shknam.c get_shop_item()
/* given a shop type, return the type of object to be generated there;
   can also return non-existing object class (eg. VEGETARIAN_CLASS) */
export function get_shop_item(type) {
    const shp = shtypes[type];
    let i, j;

    /* select an appropriate object type at random */
    for (j = rnd(100), i = 0; (j -= shp.iprobs[i].iprob) > 0; i++)
        continue;

    return shp.iprobs[i].itype;
}

/* C ref: you.h Hallucination -- HHallucination && !Halluc_resistance */
function Hallucination() {
    const P = game.u.uprops;
    return !!((P[HALLUC]?.intrinsic || P[HALLUC]?.extrinsic)
              && !(P[HALLUC_RES]?.intrinsic || P[HALLUC_RES]?.extrinsic));
}

/* C ref: hacklib.c letter() */
function letter(c) {
    return ('@' <= c && c <= 'Z') || ('a' <= c && c <= 'z');
}

// C ref: shknam.c Shknam()
export function Shknam(mtmp) {
    const nam = shkname(mtmp);

    /* 'nam[]' is almost certainly already capitalized, but be sure */
    return highc(nam[0]) + nam.slice(1);
}

// C ref: shknam.c shkname()
/* shopkeeper's name, without any visibility constraint; if hallucinating,
   will yield some other shopkeeper's name (not necessarily one residing
   in the current game's dungeon, or who keeps same type of shop) */
export function shkname(mtmp) {
    let nam;
    const save_isshk = mtmp.isshk;

    mtmp.isshk = 0; /* don't want mon_nam() calling shkname() */
    /* get a modifiable name buffer along with fallback result */
    nam = noit_mon_nam(mtmp);
    mtmp.isshk = save_isshk;

    if (!mtmp.isshk) {
        /* impossible("shkname: \"%s\" is not a shopkeeper.", nam) */
    } else if (!mtmp.mextra?.eshk) {
        throw new Error(`shkname: shopkeeper "${nam}" lacks 'eshk' data.`);
    } else {
        let shknm = mtmp.mextra.eshk.shknam;

        if (Hallucination() && !game.program_state?.gameover) {
            let nlp;
            let num;

            /* count the number of non-unique shop types;
               pick one randomly, ignoring shop generation probabilities;
               pick a name at random from that shop type's list */
            for (num = 0; num < shtypes.length; num++)
                if (shtypes[num].prob === 0)
                    break;
            if (num > 0) {
                nlp = shtypes[rn2(num)].shknms;
                for (num = 0; nlp[num]; num++)
                    continue;
                if (num > 0)
                    shknm = nlp[rn2(num)];
            }
        }
        /* strip prefix if present */
        if (!letter(shknm[0]))
            shknm = shknm.slice(1);
        nam = shknm;
    }
    return nam;
}

// C ref: shknam.c shkname_is_pname()
export function shkname_is_pname(mtmp) {
    const shknm = mtmp.mextra.eshk.shknam;

    return (shknm[0] === '-' || shknm[0] === '+' || shknm[0] === '=');
}
