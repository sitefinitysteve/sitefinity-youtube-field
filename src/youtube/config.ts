/**
 * Settings for the YouTube field. Works with no configuration: any content type with a short-text field
 * named like a YouTube link gets the editor and the list thumbnail column.
 *
 * To change the defaults, set `window.SitefinityYouTubeField` before the AdminApp asks for fields, e.g. in a
 * `youtube-field.config.extensions.bundle.js` next to the bundle (see config/ and the README). Settings are
 * read every time they are needed, so the order the bundles load in does not matter.
 */
export interface YouTubeFieldConfig {
    /** Field names that get the YouTube editor (case-insensitive). The first one a type has is used. */
    fieldNames: string[];
    /**
     * Content types to use it on, by set name ("youtubevideos", "newsitems") or full type name. `*` is a
     * wildcard ("Telerik.Sitefinity.DynamicTypes.Model.Videos.*"). Empty means every content type.
     */
    types: string[];
    /** Also use it on matching properties in widget designers. */
    widgetDesigners: boolean;
    /** Related-image fields that replace YouTube's thumbnail in the list column, first match wins. */
    thumbnailFieldNames: string[];
    /** Add the thumbnail column to content lists. */
    listColumn: boolean;
    columnTitle: string;
    /** Sitefinity spaces its own columns by 100; 50 puts this one right after the title. */
    columnOrdinal: number;
    /** Ask YouTube (oEmbed) whether the video exists, and show its title. */
    checkVideoExists: boolean;
    /** Block saving when YouTube says the video does not exist. Needs checkVideoExists. */
    blockMissingVideos: boolean;
    /** Log every field and list the AdminApp asks about, to find set and field names. */
    debug: boolean;
}

export const DEFAULT_CONFIG: Readonly<YouTubeFieldConfig> = Object.freeze({
    fieldNames: ["YouTubeUrl", "YouTubeVideoUrl", "YouTubeLink", "VideoUrl"],
    types: [],
    widgetDesigners: false,
    thumbnailFieldNames: ["CustomThumbnail", "Thumbnail"],
    listColumn: true,
    columnTitle: "Video",
    columnOrdinal: 50,
    checkVideoExists: true,
    blockMissingVideos: true,
    debug: false
});

const GLOBAL_KEY = "SitefinityYouTubeField";

export function getConfig(source: any = globalSettings()): YouTubeFieldConfig {
    const user = source && typeof source === "object" ? source : {};
    const pick = <K extends keyof YouTubeFieldConfig>(key: K, valid: (v: any) => boolean): YouTubeFieldConfig[K] =>
        valid(user[key]) ? user[key] : DEFAULT_CONFIG[key];
    const isList = (v: any) => Array.isArray(v) && v.every(x => typeof x === "string");
    const isBool = (v: any) => typeof v === "boolean";

    return {
        fieldNames: pick("fieldNames", isList),
        types: pick("types", isList),
        widgetDesigners: pick("widgetDesigners", isBool),
        thumbnailFieldNames: pick("thumbnailFieldNames", isList),
        listColumn: pick("listColumn", isBool),
        columnTitle: pick("columnTitle", v => typeof v === "string" && v.length > 0),
        columnOrdinal: pick("columnOrdinal", v => typeof v === "number" && isFinite(v)),
        checkVideoExists: pick("checkVideoExists", isBool),
        blockMissingVideos: pick("blockMissingVideos", isBool),
        debug: pick("debug", isBool)
    };
}

/** The configured name this field matches, or null. */
export function matchFieldName(fieldName: string, config: YouTubeFieldConfig): string | null {
    const name = (fieldName || "").toLowerCase();
    return config.fieldNames.find(f => f.toLowerCase() === name) || null;
}

/**
 * Whether a content type (or widget designer, typeName "widget-Name") is in scope. Widget designers pass
 * their typeName as both arguments.
 */
export function typeAllowed(setName: string, typeFullName: string, config: YouTubeFieldConfig): boolean {
    if ((setName || "").startsWith("widget-")) {
        return config.widgetDesigners && (config.types.length === 0 || config.types.some(p => wildcard(p, setName)));
    }

    return config.types.length === 0
        || config.types.some(p => wildcard(p, setName) || wildcard(p, typeFullName));
}

function wildcard(pattern: string, value: string): boolean {
    if (!pattern || !value) {
        return false;
    }

    const escaped = pattern.split("*").map(part => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*");
    return new RegExp("^" + escaped + "$", "i").test(value);
}

function globalSettings(): any {
    return typeof window !== "undefined" ? (window as any)[GLOBAL_KEY] : undefined;
}
