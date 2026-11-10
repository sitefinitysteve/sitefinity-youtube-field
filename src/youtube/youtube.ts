/**
 * Turns whatever an editor pastes (watch / share / embed / shorts / live links, a full <iframe> embed code,
 * or a bare 11-character id) into one canonical YouTube URL.
 */
export interface ParsedYouTube {
    id: string;
    startSeconds: number;
    canonicalUrl: string;
    embedUrl: string;
    thumbnailUrl: string;
}

const ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = ["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com",
    "youtube-nocookie.com", "www.youtube-nocookie.com", "youtu.be", "www.youtu.be"];
const PATH_PREFIXES = ["embed", "shorts", "live", "v", "e"];

export function parseYouTube(input: string): ParsedYouTube | null {
    if (!input) {
        return null;
    }

    let text = input.trim();
    const src = text.match(/src\s*=\s*["']([^"']+)["']/i);
    if (src) {
        text = src[1];
    }
    text = text.replace(/&amp;/g, "&").trim();

    if (ID_PATTERN.test(text)) {
        return build(text, 0);
    }

    if (text.startsWith("//")) {
        text = "https:" + text;
    } else if (!/^https?:\/\//i.test(text)) {
        text = "https://" + text;
    }

    let url: URL;
    try {
        url = new URL(text);
    } catch {
        return null;
    }

    const host = url.hostname.toLowerCase();
    if (HOSTS.indexOf(host) === -1) {
        return null;
    }

    const segments = url.pathname.split("/").filter(s => s.length > 0);
    let id: string = null;

    if (host.endsWith("youtu.be")) {
        id = segments[0];
    } else if (segments[0] === "watch") {
        id = url.searchParams.get("v");
    } else if (PATH_PREFIXES.indexOf(segments[0]) !== -1) {
        id = segments[1];
    }

    if (!id || !ID_PATTERN.test(id)) {
        return null;
    }

    return build(id, parseStart(url.searchParams.get("t") || url.searchParams.get("start")));
}

/** True when the text points at a YouTube host, even if the video id in it is broken. */
export function looksLikeYouTube(input: string): boolean {
    const text = (input || "").trim();
    const src = text.match(/src\s*=\s*["']([^"']+)["']/i);
    const candidate = (src ? src[1] : text).replace(/^\/\//, "https://");
    try {
        const url = new URL(/^https?:\/\//i.test(candidate) ? candidate : "https://" + candidate);
        return HOSTS.indexOf(url.hostname.toLowerCase()) !== -1;
    } catch {
        return false;
    }
}

function build(id: string, startSeconds: number): ParsedYouTube {
    const start = startSeconds > 0 ? startSeconds : 0;
    return {
        id,
        startSeconds: start,
        canonicalUrl: `https://www.youtube.com/watch?v=${id}` + (start ? `&t=${start}s` : ""),
        embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0` + (start ? `&start=${start}` : ""),
        thumbnailUrl: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`
    };
}

/** "90", "90s", "1m30s", "1h2m3s" -> seconds. */
function parseStart(value: string): number {
    if (!value) {
        return 0;
    }
    if (/^\d+$/.test(value)) {
        return parseInt(value, 10);
    }
    const m = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
    if (!m) {
        return 0;
    }
    return (parseInt(m[1] || "0", 10) * 3600) + (parseInt(m[2] || "0", 10) * 60) + parseInt(m[3] || "0", 10);
}
