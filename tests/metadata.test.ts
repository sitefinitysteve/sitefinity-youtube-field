// node --test tests/   (Node 22.18+/24 strips the types natively)
import { test } from "node:test";
import assert from "node:assert/strict";
import { pickCellFields } from "../src/youtube/odata-metadata.ts";
import type { MetadataIndex } from "../src/youtube/odata-metadata.ts";

// indexMetadata needs the browser's DOMParser; these cover the decision made from its output.
const index: MetadataIndex = new Map([
    ["youtubevideos", { properties: ["Id", "Title", "VideoUrl"], navigation: ["CustomThumbnail"] }],
    ["sessions", { properties: ["Id", "YouTubeUrl"], navigation: [] }],
    ["pages", { properties: ["Id", "Title", "UrlName"], navigation: ["Parent"] }],
    ["newsitems", { properties: ["Id", "Title", "Content"], navigation: ["Thumbnail"] }]
]);
const FIELDS = ["YouTubeUrl", "YouTubeVideoUrl", "YouTubeLink", "VideoUrl"];
const THUMBS = ["CustomThumbnail", "Thumbnail"];

test("a type with a video field gets the column, with its thumbnail field", () => {
    assert.deepEqual(pickCellFields(index, "youtubevideos", FIELDS, THUMBS), { videoField: "VideoUrl", thumbnailField: "CustomThumbnail" });
});

test("no thumbnail field: YouTube's thumbnail", () => {
    assert.deepEqual(pickCellFields(index, "sessions", FIELDS, THUMBS), { videoField: "YouTubeUrl", thumbnailField: null });
});

test("pages and other types without a video field get no column", () => {
    assert.equal(pickCellFields(index, "pages", FIELDS, THUMBS), null);
    assert.equal(pickCellFields(index, "newsitems", FIELDS, THUMBS), null);
    assert.equal(pickCellFields(index, "unknown", FIELDS, THUMBS), null);
});

test("matching ignores case and returns the service's spelling", () => {
    assert.deepEqual(pickCellFields(index, "YouTubeVideos", ["videourl"], ["customthumbnail"]), { videoField: "VideoUrl", thumbnailField: "CustomThumbnail" });
});
