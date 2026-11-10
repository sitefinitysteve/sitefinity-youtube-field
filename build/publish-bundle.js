// Copies the production build to release/ under the name Sitefinity discovers (*.extensions.bundle.js).
// The Progress kit always emits dist/sample.extensions.bundle.js; renaming here keeps the kit files unmodified.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const src = path.join(root, "dist", "sample.extensions.bundle.js");
const dest = path.join(root, "release", "youtube-field.extensions.bundle.js");

if (!fs.existsSync(src)) {
    console.error(`publish-bundle: ${src} not found - run "ng build -c prod" first`);
    process.exit(1);
}

const version = require(path.join(root, "package.json")).version;
const banner = `/*! sitefinity-youtube-field v${version} | MIT | https://www.npmjs.com/package/sitefinity-youtube-field */\n`;

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, banner + fs.readFileSync(src, "utf8"));
console.log(`publish-bundle: ${path.relative(process.cwd(), dest)} (${fs.statSync(dest).size} bytes)`);
