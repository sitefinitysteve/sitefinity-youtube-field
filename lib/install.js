// Shared by bin/cli.js and bin/postinstall.js: find a Sitefinity site's AdminApp/ folder and copy the bundle in.
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const BUNDLE = "youtube-field.extensions.bundle.js";
const CONFIG = "youtube-field.config.extensions.bundle.js";
const bundleSource = path.join(root, "release", BUNDLE);
const configSource = path.join(root, "config", CONFIG);
const SKIP = new Set(["node_modules", ".git", ".vs", ".angular", "bin", "obj", "packages", "App_Data", "dist"]);

/** A Sitefinity AdminApp folder: holds the Angular index.html and sits in a web app (web.config beside it). */
function isAdminApp(dir) {
    return exists(path.join(dir, "index.html"))
        && (exists(path.join(dir, "..", "web.config")) || exists(path.join(dir, "..", "Web.config")));
}

/**
 * Every AdminApp under `start`: the folder itself, <start>/AdminApp, or AdminApp up to three folders down
 * (repo/Site/AdminApp, repo/src/Site/AdminApp). Skips node_modules, bin, packages and similar.
 */
function findAdminApps(start, depth = 3) {
    const found = [];
    const visit = (dir, level) => {
        if (path.basename(dir).toLowerCase() === "adminapp" && isAdminApp(dir)) {
            found.push(dir);
            return;
        }

        if (level >= depth) {
            return;
        }

        let entries = [];
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }

        for (const entry of entries) {
            if (entry.isDirectory() && !SKIP.has(entry.name) && !entry.name.startsWith(".")) {
                visit(path.join(dir, entry.name), level + 1);
            }
        }
    };

    visit(path.resolve(start), 0);
    return found;
}

/**
 * Resolve where to install. In order: an explicit folder (an AdminApp, or a web app that contains one), the
 * SITEFINITY_ADMINAPP environment variable, "sitefinityYouTubeField": { "adminApp": "..." } in the project's
 * package.json, then a search from the project folder.
 */
function resolveTargets(explicit, projectDir) {
    const fromDir = dir => {
        const full = path.resolve(projectDir, dir);
        if (isAdminApp(full) || exists(path.join(full, "index.html"))) {
            return [full];
        }
        if (exists(path.join(full, "AdminApp", "index.html"))) {
            return [path.join(full, "AdminApp")];
        }
        return null;
    };

    if (explicit) {
        return { targets: fromDir(explicit) || [], source: explicit };
    }

    if (process.env.SITEFINITY_ADMINAPP) {
        return { targets: fromDir(process.env.SITEFINITY_ADMINAPP) || [], source: "SITEFINITY_ADMINAPP" };
    }

    const configured = readProjectSetting(projectDir);
    if (configured) {
        return { targets: fromDir(configured) || [], source: `package.json sitefinityYouTubeField.adminApp ("${configured}")` };
    }

    return { targets: findAdminApps(projectDir), source: "search" };
}

function install(target, { config = false, force = false, log = console.log } = {}) {
    if (!exists(bundleSource)) {
        throw new Error(`${bundleSource} is missing - run "npm run build:release" in the package first.`);
    }

    fs.copyFileSync(bundleSource, path.join(target, BUNDLE));
    log(`installed ${path.join(target, BUNDLE)}`);

    if (config) {
        const configTarget = path.join(target, CONFIG);
        if (exists(configTarget) && !force) {
            log(`kept existing ${configTarget} (use --force to replace it)`);
        } else {
            fs.copyFileSync(configSource, configTarget);
            log(`installed ${configTarget}`);
        }
    }
}

function uninstall(target, { log = console.log } = {}) {
    for (const name of [BUNDLE, CONFIG]) {
        const file = path.join(target, name);
        if (exists(file)) {
            fs.unlinkSync(file);
            log(`removed ${file}`);
        }
    }
}

function readProjectSetting(projectDir) {
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, "package.json"), "utf8"));
        const setting = pkg && pkg.sitefinityYouTubeField;
        return setting && typeof setting.adminApp === "string" ? setting.adminApp : null;
    } catch {
        return null;
    }
}

function exists(file) {
    try {
        fs.accessSync(file);
        return true;
    } catch {
        return false;
    }
}

module.exports = { BUNDLE, CONFIG, bundleSource, root, findAdminApps, resolveTargets, install, uninstall };
