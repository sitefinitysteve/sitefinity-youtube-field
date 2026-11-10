import { ChangeDetectorRef, Component, OnDestroy, OnInit } from "@angular/core";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { FieldBase } from "@progress/sitefinity-adminapp-sdk/app/api/v1";
import { looksLikeYouTube, ParsedYouTube, parseYouTube } from "./youtube";
import { getConfig } from "./config";
import { missingYouTubeIds, YOUTUBE_ERROR_KEY, YOUTUBE_MISSING_KEY } from "./youtube-url.settings";

/**
 * empty      nothing entered
 * invalid    text that holds no YouTube video id (Save is blocked by the settings validator)
 * badId      a YouTube link whose video id is incomplete or has extra characters (Save blocked)
 * checking   id found, asking YouTube whether the video exists
 * found      YouTube knows it: show the player and its title
 * missing    YouTube says no such video (typo, deleted); Save is blocked
 * restricted the video exists but is private or has embedding switched off
 * unknown    YouTube could not be asked (offline, blocked): show the player and let it speak
 */
export type YouTubeLookupState = "empty" | "invalid" | "badId" | "checking" | "found" | "missing" | "restricted" | "unknown";

const LOOKUP_DELAY_MS = 350;

/**
 * Edit view for the VideoUrl field. While the editor types, the preview, status and saved value follow the
 * text (the saved value is always the canonical watch URL once a video id is recognised). The visible text is
 * tidied to that URL on paste and on blur, so typing a link by hand is never rewritten mid-word.
 */
@Component({
    templateUrl: "./youtube-url-write.component.html",
    standalone: false,
    styles: [`
        .yt-status { display: flex; align-items: flex-start; gap: 6px; margin: 8px 0 0; font-size: 13px; line-height: 1.4; color: #555; }
        .yt-status__icon { flex: 0 0 auto; width: 16px; height: 16px; margin-top: 1px; }
        .yt-status.-found { color: #1e6b34; }
        .yt-status.-error { color: #b3261e; }
        .yt-status.-warning { color: #7a4f00; }
        .yt-note { margin: 4px 0 0; font-size: 13px; color: #555; }
        .yt-preview { position: relative; margin-top: 12px; max-width: 560px; aspect-ratio: 16 / 9; background: #1f1f1f; }
        .yt-preview iframe { width: 100%; height: 100%; border: 0; display: block; }
        .yt-empty { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
                    gap: 8px; padding: 24px; text-align: center; background: #f7f7f8; border: 1px dashed #c4c4c4; color: #555; font-size: 14px; line-height: 1.45; }
        .yt-empty strong { color: #333; font-size: 15px; }
        .yt-empty svg { width: 36px; height: 36px; color: #8a8a8a; }
        .yt-empty.-error { border-color: #e3a8a3; background: #fdf5f4; }
        .yt-empty.-error svg { color: #b3261e; }
        .yt-empty.-warning { border-color: #e6c88f; background: #fdf8ee; }
        .yt-empty.-warning svg { color: #7a4f00; }
        @keyframes yt-spin { to { transform: rotate(360deg); } }
        .yt-spinner { animation: yt-spin 900ms linear infinite; }
        @media (prefers-reduced-motion: reduce) { .yt-spinner { animation: none; } }
    `]
})
export class YouTubeUrlWriteComponent extends FieldBase implements OnInit, OnDestroy {
    text = "";
    parsed: ParsedYouTube = null;
    embed: SafeResourceUrl = null;
    state: YouTubeLookupState = "empty";
    youTubeTitle = "";
    note = "";

    private lookupTimer: any = null;
    private lookupToken = 0;

    constructor(private sanitizer: DomSanitizer, private changes: ChangeDetectorRef) {
        super();
    }

    /** The player shows while checking, when found, and when YouTube could not be asked. */
    get showPlayer(): boolean {
        return !!this.embed && (this.state === "checking" || this.state === "found" || this.state === "unknown");
    }

    ngOnInit(): void {
        super["ngOnInit"]?.call(this);
        this.text = (this.getValue() || "").toString();
        this.update(this.text, false);
    }

    ngOnDestroy(): void {
        clearTimeout(this.lookupTimer);
        this.lookupToken++;
    }

    onTextChange(raw: string): void {
        this.text = raw;
        this.note = "";
        this.update(raw, true);
    }

    /** Paste fires before ngModel updates; tidy once the pasted text is in. */
    onPaste(): void {
        setTimeout(() => this.tidy(), 0);
    }

    onFieldBlur(): void {
        this.tidy();
        // onBlur/onFocus exist on the host's FieldBase at runtime but not in the SDK typings.
        (this as any).onBlur?.();
    }

    processErrors(errors: { [key: string]: any }): string[] {
        // The base class prints unknown keys' raw values ("true"); hand it only the errors it knows. Our own
        // message is shown in the status line and the preview panel, so it is not repeated here.
        const { [YOUTUBE_ERROR_KEY]: invalid, [YOUTUBE_MISSING_KEY]: missing, ...rest } = errors || {};
        return (Object.keys(rest).length ? super.processErrors(rest) : []) || [];
    }

    private tidy(): void {
        const value = (this.text || "").trim();
        if (!this.parsed || this.parsed.canonicalUrl === value) {
            return;
        }

        this.note = /<iframe/i.test(value)
            ? "Embed code detected - saved just the video link."
            : "Link tidied to the standard YouTube address.";
        this.text = this.parsed.canonicalUrl;
    }

    private update(raw: string, write: boolean): void {
        const value = (raw || "").trim();
        const parsed = parseYouTube(value);
        const previousId = this.parsed ? this.parsed.id : null;
        const previousEmbed = this.parsed ? this.parsed.embedUrl : null;

        this.parsed = parsed;

        if (!value) {
            this.setState("empty");
        } else if (!parsed) {
            this.setState(looksLikeYouTube(value) ? "badId" : "invalid");
        } else {
            if (parsed.embedUrl !== previousEmbed || !this.embed) {
                // Only an 11-character id validated by parseYouTube reaches this URL.
                this.embed = this.sanitizer.bypassSecurityTrustResourceUrl(parsed.embedUrl);
            }
            if (parsed.id !== previousId || this.state === "empty" || this.state === "invalid" || this.state === "badId") {
                this.lookup(parsed);
            }
        }

        if (write) {
            this.writeValue(parsed ? parsed.canonicalUrl : raw);
        }
    }

    private setState(state: YouTubeLookupState): void {
        clearTimeout(this.lookupTimer);
        this.lookupToken++;
        this.state = state;
        this.youTubeTitle = "";
        if (state === "empty" || state === "invalid" || state === "badId") {
            this.embed = null;
        }
    }

    /** Ask YouTube (oEmbed) whether the video exists; debounced, and stale answers are dropped. */
    private lookup(parsed: ParsedYouTube): void {
        const config = getConfig();
        if (!config.checkVideoExists) {
            this.setState("unknown");
            return;
        }

        this.setState("checking");
        const token = this.lookupToken;

        this.lookupTimer = setTimeout(async () => {
            let next: YouTubeLookupState = "unknown";
            let title = "";
            try {
                const response = await fetch("https://www.youtube.com/oembed?format=json&url="
                    + encodeURIComponent("https://www.youtube.com/watch?v=" + parsed.id), { credentials: "omit" });
                if (response.ok) {
                    next = "found";
                    title = ((await response.json()) || {}).title || "";
                } else if (response.status === 401 || response.status === 403) {
                    next = "restricted";
                } else if (response.status === 400 || response.status === 404) {
                    next = "missing";
                }
            } catch {
                next = "unknown";
            }

            if (token !== this.lookupToken) {
                return;
            }
            this.state = next;
            this.youTubeTitle = title;

            // Let the Save validator know, then re-write the same value so the form re-validates now.
            const wasMissing = missingYouTubeIds.has(parsed.id);
            if (next === "missing" && config.blockMissingVideos) {
                missingYouTubeIds.add(parsed.id);
            } else if (next === "found") {
                missingYouTubeIds.delete(parsed.id);
            }
            if (wasMissing !== missingYouTubeIds.has(parsed.id)) {
                // The host ignores a write of an identical value, so step through a different one to make the
                // form control re-run its validators with the new verdict.
                this.writeValue("");
                this.writeValue(parsed.canonicalUrl);
            }
            this.changes.markForCheck();
            this.changes.detectChanges();
        }, LOOKUP_DELAY_MS);
    }
}
