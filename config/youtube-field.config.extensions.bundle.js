/*
 * Optional settings for sitefinity-youtube-field. Copy this file into your site's AdminApp/ folder next to
 * youtube-field.extensions.bundle.js (or run: npx sitefinity-youtube-field install <AdminApp> --config).
 * Delete any line to keep its default. Sitefinity caches extension bundles: restart the site after a change,
 * then hard-refresh the browser (Ctrl+F5).
 */
window.SitefinityYouTubeField = {
    // Short-text field names that get the YouTube editor, on any content type (case-insensitive).
    fieldNames: ["YouTubeUrl", "YouTubeVideoUrl", "YouTubeLink", "VideoUrl"],

    // Limit to some content types by set name or full type name; "*" is a wildcard. [] = all types.
    types: [],

    // Also use the editor on matching widget designer properties.
    widgetDesigners: false,

    // Related single-image fields that replace YouTube's thumbnail in the list column.
    thumbnailFieldNames: ["CustomThumbnail", "Thumbnail"],

    // Thumbnail column in content lists.
    listColumn: true,
    columnTitle: "Video",
    columnOrdinal: 50,

    // Ask YouTube whether the video exists (shows its title); block saving when it doesn't.
    checkVideoExists: true,
    blockMissingVideos: true,

    // Log field, list and cell lookups to the browser console.
    debug: false
};
