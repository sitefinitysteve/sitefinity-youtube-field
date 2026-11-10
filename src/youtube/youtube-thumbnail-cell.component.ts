import { Component, OnInit } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { DataContext, DataContextComponent, HTTP_PREFIX } from "@progress/sitefinity-adminapp-sdk/app/api/v1";
import { getConfig } from "./config";
import { parseYouTube } from "./youtube";

/** Which fields of this content type hold the link and (optionally) a custom thumbnail image. */
export interface YouTubeCellFields {
    videoField: string;
    thumbnailField: string | null;
}

/** List cell: the custom thumbnail when the item has one, otherwise YouTube's. */
@Component({
    template: `
        <img *ngIf="thumbnailUrl" [src]="thumbnailUrl" alt="" width="120" height="68" loading="lazy" class="yt-cell">
        <span *ngIf="!thumbnailUrl" class="yt-cell -empty" aria-hidden="true"></span>
    `,
    standalone: false,
    styles: [`
        .yt-cell { display: block; width: 120px; height: 68px; object-fit: cover; background: #1f1f1f; box-shadow: 0 0 0 1px #ececee; }
        .yt-cell.-empty { background: #ececee; }
    `]
})
export class YouTubeThumbnailCellComponent implements DataContextComponent, OnInit {
    context: DataContext;
    /** Set by the columns provider through ComponentData.properties. */
    fields: YouTubeCellFields;
    thumbnailUrl: string = null;

    constructor(private http: HttpClient) { }

    ngOnInit(): void {
        const item = this.context && this.context.dataItem;
        const fields = this.fields;
        if (!item || !item.data || !fields) {
            return;
        }

        // Show YouTube's thumbnail straight away when the row already carries the link.
        if (fields.videoField in item.data) {
            this.setFromVideo(item.data[fields.videoField]);
        }

        const expand = fields.thumbnailField ? `&$expand=${fields.thumbnailField}($select=ThumbnailUrl,Url)` : "";
        const query = `${HTTP_PREFIX}/sf/system/${item.metadata.setName}(${item.data.Id})`
            + `?$select=${fields.videoField}${expand}`
            + (item.provider ? `&sf_provider=${encodeURIComponent(item.provider)}` : "")
            + (item.culture ? `&sf_culture=${encodeURIComponent(item.culture)}` : "");

        this.http.get<any>(query).subscribe({
            next: r => {
                const raw = fields.thumbnailField && r ? r[fields.thumbnailField] : null;
                if (getConfig().debug) {
                    console.log("[youtube-field] cell:", JSON.stringify({ keys: Object.keys(r || {}), thumbnail: raw }));
                }

                // A single-image field comes back as one object; a multi-image one as an array.
                const custom = Array.isArray(raw) ? raw[0] : raw;
                const customUrl = custom && (custom.ThumbnailUrl || custom.Url);
                if (customUrl) {
                    this.thumbnailUrl = customUrl;
                } else {
                    this.setFromVideo(r && r[fields.videoField]);
                }
            },
            error: () => { /* keep whatever is showing */ }
        });
    }

    private setFromVideo(value: string): void {
        const parsed = parseYouTube(value);
        this.thumbnailUrl = parsed ? parsed.thumbnailUrl : null;
    }
}
