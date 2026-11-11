// host/env.js - the process environment of a game, as the recorder had it.
//
// docs/recording-environment.md: `nethack -u <name>` with HOME set to the
// recording harness's results directory (NetHack prints $HOME/.nethackrc
// in the options help, so the path is verbatim), TERM=xterm-256color, and
// no USER or LOGNAME.  TERM itself is not exported: with no termcap
// database the game would fail tgetent(); its visible effect, a 256-colour
// terminal, is applied by the tty code (see tools/c2js/prepare.mjs).
//
// The rest are switches of the recorder build (RNG log, fixed datetime,
// no delays, capture markers) and the port's file-system layout (game
// data in "/", save files in "/save").

/** $HOME of the recorder. */
export const RECORDER_HOME =
  "/Users/davidbau/git/mazesofmenace/teleport/maud/test/comparison/c-harness/results";

/** Path of the RNG log the game writes (NETHACK_RNGLOG). */
export const RNG_LOG_PATH = "/rng.log";

/** Variables the C library starts with (Emscripten's defaults; LANG as under Node). */
export const BASE_ENVIRONMENT = Object.freeze({
  USER: "web_user",
  LOGNAME: "web_user",
  PATH: "/",
  PWD: "/",
  HOME: "/home/web_user",
  LANG: "C.UTF-8",
  _: "./this.program",
});

/**
 * The environment changes made before NetHack's main() runs: a list of
 * [name, value] (value null: unset), applied in order with setenv()/unsetenv().
 */
export function sessionEnvironment({ seed, datetime, tz = "UTC" }) {
  return [
    ["USER", null],
    ["LOGNAME", null],
    ["NETHACKOPTIONS", null],
    ["TERM", null],
    ["HOME", RECORDER_HOME],
    ["TZ", tz], // nhjs_tty_api.c sets UTC: calendar.c renders New York time itself
    ["NETHACKDIR", "/"],
    ["HACKDIR", "/"],
    ["MAIL", "/var/mail/nhjs"], // an empty spool, as on the recorder
    ["NETHACK_RNGLOG", RNG_LOG_PATH],
    ["NETHACK_RNGLOG_DISP", "1"],
    ["NETHACK_NO_DELAY", "1"],
    ["NOMUX_MARKERS", "1"],
    ["NHJS_SUPPRESS_NOMUX_MARKERS", "1"],
    ["NETHACK_SEED", String(seed ?? "") || "0"],
    ["NETHACK_FIXED_DATETIME", datetime ? String(datetime) : null],
  ];
}

/** The resulting environment as an object (for tests and diagnostics). */
export function resolvedEnvironment(session) {
  const env = { ...BASE_ENVIRONMENT };
  for (const [name, value] of sessionEnvironment(session)) {
    if (value === null) delete env[name];
    else env[name] = value;
  }
  return env;
}

/**
 * Player name the recorder passed with `-u`: the first `name:` of an
 * OPTIONS= line of the rc (scripts/record-session.mjs), or "".
 */
export function recorderPlayerName(nethackrc) {
  for (const rawLine of String(nethackrc || "").split("\n")) {
    const line = rawLine.trim();
    const upper = line.toUpperCase();
    if (!(upper.startsWith("OPTIONS=") || upper.startsWith("OPTIONS ="))) continue;
    for (const opt of line.slice(line.indexOf("=") + 1).split(",")) {
      const t = opt.trim();
      if (t.toLowerCase().startsWith("name:")) return t.slice("name:".length).trim();
    }
  }
  return "";
}

/** Files the game expects at start (the playground, sysconf, $HOME/.nethackrc). */
export function sessionFiles(nethackrc) {
  return {
    dirs: ["/save"],
    touch: ["/record", "/logfile", "/xlogfile", "/livelog"],
    files: [
      ["/sysconf", "WIZARDS=*\nEXPLORERS=*\nSHELLERS=*\nMAXPLAYERS=10\n"],
      [RECORDER_HOME + "/.nethackrc", String(nethackrc || "")],
    ],
  };
}
