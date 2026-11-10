# libghostty-vt 1.0.0 (temporary development dependency)

Official prebuilt module:
https://release.files.ghostty.org/libghostty-vt/1.0.0/ghostty-vt-1.0.0.wasm

SHA-256: `7b428fee6d0677bc81279458f8f9a3335454834123a9ff47efb3fd177f6da5a8`.
License: MIT, preserved in `LICENSE` from the 1.0.0 source release.
The module has its own wasm32 memory; it is separate from the wasm64 game.

`bash nethack-c/setup-terminal.sh` downloads/verifies the binary. Its documented
C/Wasm ABI and `ghostty_type_json()` manifest are consumed by
`js/terminal-backend.js`. The binary is ignored by Git and must be fetched when
setting up a fresh checkout. No network access is used during replays.

This module is for local development only: the competition prohibits Wasm.
Replace the backend implementation with pure JavaScript before submission.
