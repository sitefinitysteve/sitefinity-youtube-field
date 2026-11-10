# Changelog

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
