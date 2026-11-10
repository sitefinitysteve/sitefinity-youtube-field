#!/usr/bin/env node
// Copies the prebuilt bundle (and optionally the settings file) into a Sitefinity site's AdminApp/ folder.
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const BUNDLE = "youtube-field.extensions.bundle.js";
const CONFIG = "youtube-field.config.extensions.bundle.js";
const bundleSource = path.join(root, "release", BUNDLE);
const configSource = path.join(root, "config", CONFIG);
const version = require(path.join(root, "package.json")).version;

const usage = `sitefinity-youtube-field v${version}

Usage:
  sitefinity-youtube-field install <AdminApp folder> [--config] [--force]
  sitefinity-youtube-field uninstall <AdminApp folder>
  sitefinity-youtube-field path

  install     Copy ${BUNDLE} into the folder (the site's AdminApp/, next to index.html).
              --config  also add ${CONFIG} if it is not there yet
              --force   overwrite an existing settings file
  uninstall   Remove both files from the folder.
  path        Print the full path of the bundle in this package.

Restart the site afterwards (Sitefinity caches extension bundles), then hard-refresh the browser.`;

function fail(message) {
    console.error(`sitefinity-youtube-field: ${message}`);
    process.exit(1);
}

function resolveAdminApp(dir) {
    if (!dir) {
        fail(`missing the AdminApp folder.\n\n${usage}`);
    }

    let target = path.resolve(dir);
    // Accept the web app root too: <site>/AdminApp.
    if (!fs.existsSync(path.join(target, "index.html")) && fs.existsSync(path.join(target, "AdminApp", "index.html"))) {
        target = path.join(target, "AdminApp");
    }

    if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
        fail(`${target} is not a folder.`);
    }

    if (!fs.existsSync(path.join(target, "index.html"))) {
        console.warn(`sitefinity-youtube-field: warning - ${target} has no index.html; is it the AdminApp folder?`);
    }

    return target;
}

const [command, dir, ...rest] = process.argv.slice(2);
const flags = new Set(rest.concat(dir && dir.startsWith("--") ? [dir] : []));

switch (command) {
    case "install": {
        if (!fs.existsSync(bundleSource)) {
            fail(`${bundleSource} is missing - run "npm run build:release" in the package first.`);
        }

        const target = resolveAdminApp(dir);
        fs.copyFileSync(bundleSource, path.join(target, BUNDLE));
        console.log(`installed ${path.join(target, BUNDLE)}`);

        if (flags.has("--config")) {
            const configTarget = path.join(target, CONFIG);
            if (fs.existsSync(configTarget) && !flags.has("--force")) {
                console.log(`kept existing ${configTarget} (use --force to replace it)`);
            } else {
                fs.copyFileSync(configSource, configTarget);
                console.log(`installed ${configTarget}`);
            }
        }

        console.log("Restart the site, then hard-refresh the browser (Ctrl+F5).");
        break;
    }
    case "uninstall": {
        const target = resolveAdminApp(dir);
        for (const name of [BUNDLE, CONFIG]) {
            const file = path.join(target, name);
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
                console.log(`removed ${file}`);
            }
        }
        break;
    }
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
