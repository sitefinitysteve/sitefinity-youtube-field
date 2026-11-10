#!/usr/bin/env node
// Copies the prebuilt bundle (and optionally the settings file) into a Sitefinity site's AdminApp/ folder.
"use strict";

const path = require("path");
const { BUNDLE, CONFIG, bundleSource, root, resolveTargets, install, uninstall } = require("../lib/install");

const version = require(path.join(root, "package.json")).version;

const usage = `sitefinity-youtube-field v${version}

Usage:
  sitefinity-youtube-field install [<AdminApp or web app folder>] [--config] [--force]
  sitefinity-youtube-field uninstall [<AdminApp or web app folder>]
  sitefinity-youtube-field path

  install     Copy ${BUNDLE} into the site's AdminApp/ (next to index.html).
              With no folder, uses SITEFINITY_ADMINAPP, then "sitefinityYouTubeField.adminApp" in
              package.json, then searches the current folder (up to three levels down).
              --config  also add ${CONFIG} if it is not there yet
              --force   overwrite an existing settings file
  uninstall   Remove both files.
  path        Print the full path of the bundle in this package.

npm install runs "install" automatically (postinstall) once the package's install script is allowed.
Restart the site afterwards (Sitefinity caches extension bundles), then hard-refresh the browser.`;

function fail(message) {
    console.error(`sitefinity-youtube-field: ${message}`);
    process.exit(1);
}

const args = process.argv.slice(2);
const command = args[0];
const flags = new Set(args.filter(a => a.startsWith("--")));
const folder = args.slice(1).find(a => !a.startsWith("--"));

function targetsOrFail() {
    const { targets, source } = resolveTargets(folder, process.cwd());
    if (targets.length === 0) {
        fail(folder
            ? `${path.resolve(folder)} is not an AdminApp folder or a web app that contains one.`
            : `no Sitefinity AdminApp folder found (looked at ${source === "search" ? process.cwd() : source}).\n\n${usage}`);
    }
    return targets;
}

try {
    switch (command) {
        case "install":
            for (const target of targetsOrFail()) {
                install(target, { config: flags.has("--config"), force: flags.has("--force") });
            }
            console.log("Restart the site, then hard-refresh the browser (Ctrl+F5).");
            break;
        case "uninstall":
            for (const target of targetsOrFail()) {
                uninstall(target);
            }
            break;
        case "path":
            console.log(bundleSource);
            break;
        case undefined:
        case "help":
        case "--help":
        case "-h":
            console.log(usage);
            break;
        default:
            fail(`unknown command "${command}".\n\n${usage}`);
    }
} catch (err) {
    fail(err.message);
}
