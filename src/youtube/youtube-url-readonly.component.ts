import { Component, OnInit } from "@angular/core";
import { FieldBase } from "@progress/sitefinity-adminapp-sdk/app/api/v1";
import { ParsedYouTube, parseYouTube } from "./youtube";

/** Shown when the item is locked or not editable: thumbnail plus the link. */
@Component({
    template: `
        <div *ngIf="parsed; else plain" class="yt-readonly">
            <img [src]="parsed.thumbnailUrl" alt="" width="240" height="135" loading="lazy">
            <a [href]="parsed.canonicalUrl" target="_blank" rel="noopener">{{ parsed.canonicalUrl }}</a>
        </div>
        <ng-template #plain><span>{{ raw || "No video" }}</span></ng-template>
    `,
    standalone: false,
    styles: [`
        .yt-readonly { display: flex; flex-direction: column; gap: 8px; }
        .yt-readonly img { display: block; object-fit: cover; background: #1f1f1f; }
    `]
})
export class YouTubeUrlReadonlyComponent extends FieldBase implements OnInit {
    raw = "";
    parsed: ParsedYouTube = null;

    ngOnInit(): void {
        super["ngOnInit"]?.call(this);
        this.raw = (this.getValue() || "").toString();
        this.parsed = parseYouTube(this.raw);
    }
}
