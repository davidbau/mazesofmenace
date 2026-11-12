# Emscripten provider

`runtime.js` assembles the current mixed C/JavaScript provider. Its name and
location identify the backend it actually needs. Shared module bindings live in
`../../nethack/bindings`; the pure JavaScript runtime does not import this backend.
Removal waits for complete pure-JavaScript game acceptance.
