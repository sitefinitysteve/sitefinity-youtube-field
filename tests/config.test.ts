// node --test tests/   (Node 22.18+/24 strips the types natively)
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONFIG, getConfig, matchFieldName, typeAllowed } from "../src/youtube/config.ts";

test("no settings gives the defaults", () => {
    assert.deepEqual(getConfig(undefined), { ...DEFAULT_CONFIG });
});

test("valid settings override, invalid ones fall back", () => {
    const config = getConfig({ fieldNames: ["Clip"], listColumn: false, columnOrdinal: "50", types: "videos" });
    assert.deepEqual(config.fieldNames, ["Clip"]);
    assert.equal(config.listColumn, false);
    assert.equal(config.columnOrdinal, DEFAULT_CONFIG.columnOrdinal);
    assert.deepEqual(config.types, []);
});

test("field names match case-insensitively and return the configured spelling", () => {
    const config = getConfig(undefined);
    assert.equal(matchFieldName("youtubeurl", config), "YouTubeUrl");
    assert.equal(matchFieldName("VideoUrl", config), "VideoUrl");
    assert.equal(matchFieldName("Title", config), null);
    assert.equal(matchFieldName(undefined as unknown as string, config), null);
});

test("every content type is allowed by default, widget designers are not", () => {
    const config = getConfig(undefined);
    assert.equal(typeAllowed("newsitems", "Telerik.Sitefinity.News.Model.NewsItem", config), true);
    assert.equal(typeAllowed("widget-Hero", "widget-Hero", config), false);
    assert.equal(typeAllowed("widget-Hero", "widget-Hero", getConfig({ widgetDesigners: true })), true);
});

test("types restrict by set name, full name, or wildcard", () => {
    const config = getConfig({ types: ["videos", "Telerik.Sitefinity.DynamicTypes.Model.Events.*"] });
    assert.equal(typeAllowed("videos", "X.Video", config), true);
    assert.equal(typeAllowed("sessions", "Telerik.Sitefinity.DynamicTypes.Model.Events.Session", config), true);
    assert.equal(typeAllowed("newsitems", "Telerik.Sitefinity.News.Model.NewsItem", config), false);
    assert.equal(typeAllowed("videosx", "X.VideoX", config), false);
});

test("wildcards do not treat regex characters as special", () => {
    const config = getConfig({ types: ["a.b"] });
    assert.equal(typeAllowed("aXb", "aXb", config), false);
    assert.equal(typeAllowed("a.b", "a.b", config), true);
});
