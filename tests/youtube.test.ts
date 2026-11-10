// node --test tests/   (Node 22.18+/24 strips the types natively)
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseYouTube } from "../src/youtube/youtube.ts";

const ID = "dQw4w9WgXcQ";
const WATCH = `https://www.youtube.com/watch?v=${ID}`;

const accepted: Array<[string, string, string]> = [
    ["bare id", ID, WATCH],
    ["watch", `https://www.youtube.com/watch?v=${ID}`, WATCH],
    ["watch, no www", `https://youtube.com/watch?v=${ID}`, WATCH],
    ["watch, no scheme", `www.youtube.com/watch?v=${ID}`, WATCH],
    ["watch, mobile", `https://m.youtube.com/watch?v=${ID}`, WATCH],
    ["watch + tracking + playlist", `https://www.youtube.com/watch?v=${ID}&list=PL123&index=2&si=abc&feature=share`, WATCH],
    ["param order", `https://www.youtube.com/watch?feature=youtu.be&v=${ID}`, WATCH],
    ["share link", `https://youtu.be/${ID}`, WATCH],
    ["share link + si", `https://youtu.be/${ID}?si=Xyz123abc`, WATCH],
    ["embed", `https://www.youtube.com/embed/${ID}`, WATCH],
    ["nocookie embed", `https://www.youtube-nocookie.com/embed/${ID}?rel=0`, WATCH],
    ["shorts", `https://www.youtube.com/shorts/${ID}`, WATCH],
    ["live", `https://www.youtube.com/live/${ID}?feature=shared`, WATCH],
    ["protocol-relative", `//www.youtube.com/embed/${ID}`, WATCH],
    ["whitespace", `   ${WATCH}  \n`, WATCH],
    ["share link start t=90", `https://youtu.be/${ID}?t=90`, `${WATCH}&t=90s`],
    ["watch start 1m30s", `https://www.youtube.com/watch?v=${ID}&t=1m30s`, `${WATCH}&t=90s`],
    ["watch start 1h2m3s", `https://www.youtube.com/watch?v=${ID}&t=1h2m3s`, `${WATCH}&t=3723s`],
    ["embed start=", `https://www.youtube.com/embed/${ID}?start=42`, `${WATCH}&t=42s`],
    ["iframe embed code",
        `<iframe width="560" height="315" src="https://www.youtube.com/embed/${ID}?si=AbC" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`,
        WATCH],
    ["iframe, single quotes + &amp;", `<iframe src='https://www.youtube.com/embed/${ID}?start=10&amp;rel=0'></iframe>`, `${WATCH}&t=10s`],
    ["iframe on several lines", `<iframe\n  src="https://www.youtube-nocookie.com/embed/${ID}"\n></iframe>`, WATCH]
];

for (const [name, input, expected] of accepted) {
    test(`accepts ${name}`, () => {
        const parsed = parseYouTube(input);
        assert.ok(parsed, `no match for ${input}`);
        assert.equal(parsed.id, ID);
        assert.equal(parsed.canonicalUrl, expected);
    });
}

const rejected: Array<[string, string]> = [
    ["empty", ""],
    ["spaces", "   "],
    ["null", null as unknown as string],
    ["vimeo", "https://vimeo.com/123456789"],
    ["lookalike host", `https://www.youtube.com.evil.example/watch?v=${ID}`],
    ["youtube home", "https://www.youtube.com/"],
    ["channel", "https://www.youtube.com/@YouTube"],
    ["playlist only", "https://www.youtube.com/playlist?list=PL1234567890"],
    ["short id", "https://youtu.be/abc"],
    ["id too long", `https://youtu.be/${ID}X`],
    ["bad characters", "https://www.youtube.com/watch?v=dQw4w9WgX<Q"],
    ["javascript url", "javascript:alert(1)"],
    ["plain text", "the partner video from last week"],
    ["iframe from elsewhere", `<iframe src="https://player.vimeo.com/video/1"></iframe>`]
];

for (const [name, input] of rejected) {
    test(`rejects ${name}`, () => {
        assert.equal(parseYouTube(input), null);
    });
}

test("embed and thumbnail URLs", () => {
    const parsed = parseYouTube(`https://youtu.be/${ID}?t=5`);
    assert.equal(parsed.embedUrl, `https://www.youtube-nocookie.com/embed/${ID}?rel=0&start=5`);
    assert.equal(parsed.thumbnailUrl, `https://i.ytimg.com/vi/${ID}/mqdefault.jpg`);
});

test("canonical output is stable when parsed again", () => {
    for (const [, input] of accepted) {
        const once = parseYouTube(input).canonicalUrl;
        assert.equal(parseYouTube(once).canonicalUrl, once);
    }
});

import { looksLikeYouTube } from "../src/youtube/youtube.ts";

test("looksLikeYouTube spots YouTube links with broken ids", () => {
    assert.equal(looksLikeYouTube("https://www.youtube.com/watch?v=pO-aVdtfGXkd"), true);
    assert.equal(looksLikeYouTube("youtu.be/abc"), true);
    assert.equal(looksLikeYouTube('<iframe src="https://www.youtube.com/embed/abc"></iframe>'), true);
    assert.equal(looksLikeYouTube("https://vimeo.com/1"), false);
    assert.equal(looksLikeYouTube("hello there"), false);
});
