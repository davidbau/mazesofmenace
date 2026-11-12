// persistence.js - files that outlive a segment.
//
// Save files, bones, the record and the like are carried from one segment
// to the next through the Web-Storage-shaped `storage` the judge or the
// browser provides: restorePersistentVfs() fills the game's file system
// (js/host/vfs.js) before a segment, snapshotPersistentVfs() stores it
// after.  One storage item per file (a binary string) plus a manifest of
// the directories and files.

import { InMemoryStorage } from "./storage.js";

const VFS_PREFIX = "vfs:";
const FS_MANIFEST_PATH = "/.nhjs-fs-manifest.json";
const SKIP_FS_PREFIXES = ["/dev", "/proc", "/tmp", "/home"];

export function storageForInput(input) {
  return input?.storage || new InMemoryStorage();
}

function storageKey(path) {
  return `${VFS_PREFIX}${path}`;
}

// Files are stored as binary strings (one char per byte), so text files
// such as /record stay readable through storage.js vfsReadFile().
function bytesToBinary(bytes) {
  let text = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    text += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return text;
}

function binaryToBytes(text) {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0xff;
  return bytes;
}

function readManifest(storage) {
  try {
    const raw = storage.getItem(storageKey(FS_MANIFEST_PATH));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function vfsSkipped(path) {
  return SKIP_FS_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/** Files and directories of vfs that can persist, as [path, node], parents first. */
export function walkVfs(vfs) {
  const out = [];
  for (const [path, node] of vfs.walk("/")) {
    if (vfsSkipped(path)) continue;
    out.push([path, node]);
  }
  return out;
}

export function restorePersistentVfs(vfs, storage) {
  const manifest = readManifest(storage);
  if (!manifest) return;
  for (const dir of manifest.dirs || []) vfs.mkdirTree(dir);
  for (const path of manifest.files || []) {
    const raw = storage.getItem(storageKey(path));
    if (raw === null) continue;
    vfs.writeFile(path, binaryToBytes(raw));
  }
}

// `skip` holds paths that are reinstalled at every start (game data,
// sysconf, .nethackrc, the RNG log) and need not be carried over.
export function snapshotPersistentVfs(vfs, storage, skip = new Set()) {
  const previous = readManifest(storage);
  const dirs = [];
  const files = [];
  for (const [path, node] of walkVfs(vfs)) {
    if (skip.has(path)) continue;
    if ((node.mode & 0o170000) === 0o040000) {
      dirs.push(path);
    } else if ((node.mode & 0o170000) === 0o100000) {
      files.push(path);
      storage.setItem(storageKey(path), bytesToBinary(node.contents.subarray(0, node.usedBytes)));
    }
  }
  const live = new Set(files);
  for (const old of previous?.files || []) {
    if (!live.has(old)) storage.removeItem(storageKey(old));
  }
  storage.setItem(storageKey(FS_MANIFEST_PATH), JSON.stringify({ version: 2, dirs, files }));
}
