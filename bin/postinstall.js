#!/usr/bin/env node
// Runs after `npm install sitefinity-youtube-field`: copies the bundle into the project's Sitefinity AdminApp/.
// Never fails the install; when it can't tell where AdminApp is, it says how to finish by hand.
"use strict";

const path = require("path");
const { root, resolveTargets, install } = require("../lib/install");

try {
    // INIT_CWD is the folder `npm install` was run in (the consuming project).
    const projectDir = process.env.INIT_CWD || process.cwd();

    // Installing this package's own dependencies while developing it: nothing to do.
    if (path.resolve(projectDir) === path.resolve(root) || process.env.SITEFINITY_YOUTUBE_FIELD_SKIP_POSTINSTALL) {
        process.exit(0);
    }

    const { targets, source } = resolveTargets(null, projectDir);
    if (targets.length === 0) {
        console.log("sitefinity-youtube-field: no Sitefinity AdminApp folder found under " + projectDir
            + (source === "search" ? "" : ` (looked at ${source})`) + ".\n"
            + "  Run: npx sitefinity-youtube-field install <path to AdminApp>\n"
            + "  Or set \"sitefinityYouTubeField\": { \"adminApp\": \"YourSite/AdminApp\" } in package.json.");
        process.exit(0);
    }

    const log = message => console.log("sitefinity-youtube-field: " + message);
    targets.forEach(target => install(target, { log }));
    log("restart the site, then hard-refresh the browser (Ctrl+F5).");
} catch (err) {
    console.log("sitefinity-youtube-field: could not copy the bundle (" + err.message + ").\n"
        + "  Run: npx sitefinity-youtube-field install <path to AdminApp>");
}
