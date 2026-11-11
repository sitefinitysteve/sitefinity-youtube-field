# Changelog

## 1.1.1 - 2026-11-10

- Fix: the Video column appeared, empty, on lists without a video field (Pages). The column now checks the
  type's real fields from the OData `$metadata` document, so it shows only where the field exists. Field names
  are matched case-insensitively for the column too.
- README: a "The field name matters" section listing the exact field names.

## 1.1.0 - 2026-11-10

- `npm install` now copies the bundle into the site's AdminApp/ folder (postinstall). It finds the folder
  from `SITEFINITY_ADMINAPP`, a `sitefinityYouTubeField.adminApp` setting in package.json, or a search.
- `sitefinity-youtube-field install` and `uninstall` find AdminApp/ the same way when no folder is given.

## 1.0.1 - 2026-11-10

- README: quick start and screenshots. No code changes.

## 1.0.0 - 2026-11-10

- YouTube link field for any content type with a matching short-text field (`YouTubeUrl`, `YouTubeVideoUrl`,
  `YouTubeLink`, `VideoUrl` by default): cleans pasted links and embed code to one standard watch URL, shows a
  live preview and the video's title, and explains invalid, incomplete, missing and private videos.
- Thumbnail column for content lists, found automatically per type, using a `CustomThumbnail`/`Thumbnail`
  related image when the item has one.
- Optional settings through `window.SitefinityYouTubeField`.
- `sitefinity-youtube-field install|uninstall|path` command for copying the bundle into `AdminApp/`.
