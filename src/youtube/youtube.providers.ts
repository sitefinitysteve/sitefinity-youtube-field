import { ClassProvider, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, concat, defer, of } from "rxjs";
import { catchError, defaultIfEmpty, filter, map, shareReplay, switchMap, take } from "rxjs/operators";
import {
    COLUMNS_TOKEN, ColumnModel, EntityData, FIELDS_PROVIDER_TOKEN, FieldData, FieldRegistration, FieldTypes,
    FieldsProvider, HTTP_PREFIX, ListColumnsProvider
} from "@progress/sitefinity-adminapp-sdk/app/api/v1";
import { getConfig, matchFieldName, typeAllowed } from "./config";
import { YouTubeThumbnailCellComponent, YouTubeCellFields } from "./youtube-thumbnail-cell.component";
import { YouTubeUrlReadonlyComponent } from "./youtube-url-readonly.component";
import { YouTubeUrlWriteComponent } from "./youtube-url-write.component";
import { YouTubeUrlSettings } from "./youtube-url.settings";

const COLUMN_NAME = "YouTubeThumbnail";

@Injectable()
export class YouTubeFieldsProvider implements FieldsProvider {
    overrideField(key: FieldData): FieldRegistration {
        const config = getConfig();
        if (config.debug) {
            console.log("[youtube-field] field:", JSON.stringify(key));
        }

        // Only plain short-text fields: the value is one URL string.
        const isShortText = key.fieldType === FieldTypes.shortText || key.fieldType === "sf-short-text";
        if (!isShortText || !matchFieldName(key.fieldName, config)) {
            return null;
        }

        // FieldData only carries the set name (or "widget-Name"), so a full-type-name pattern cannot exclude
        // a field here; the set name is what the list column and the editor have in common.
        if (!typeAllowed(key.typeName, key.typeName, config)) {
            return null;
        }

        return {
            writeComponent: YouTubeUrlWriteComponent,
            readComponent: YouTubeUrlReadonlyComponent,
            settingsType: YouTubeUrlSettings
        };
    }
}

/**
 * Adds the thumbnail column to any content list whose type has one of the configured fields. The AdminApp
 * does not say which fields a type has, so the first list of each type asks the OData service once
 * (`$top=0&$select=Field`; an unknown field is a 400) and remembers the answer for the session.
 */
@Injectable()
export class YouTubeColumnsProvider implements ListColumnsProvider {
    private static readonly cache = new Map<string, Observable<YouTubeCellFields | null>>();

    constructor(private http: HttpClient) { }

    getColumns(entityData: EntityData): Observable<ColumnModel[]> {
        const config = getConfig();
        const metadata = entityData && entityData.metadata;
        if (config.debug) {
            console.log("[youtube-field] list:", JSON.stringify(metadata));
        }

        if (!config.listColumn || !metadata || !metadata.setName
            || !typeAllowed(metadata.setName, metadata.typeFullName, config)) {
            return of([]);
        }

        return this.fieldsFor(metadata.setName, entityData.provider).pipe(
            map(fields => fields ? [{
                name: COLUMN_NAME,
                title: config.columnTitle,
                ordinal: config.columnOrdinal,
                clickable: true,
                componentData: { type: YouTubeThumbnailCellComponent, properties: { fields } }
            } as ColumnModel] : [])
        );
    }

    getColumnsToRemove(): Observable<string[]> {
        return of([]);
    }

    private fieldsFor(setName: string, provider: string): Observable<YouTubeCellFields | null> {
        const key = `${setName}|${provider || ""}`;
        let found = YouTubeColumnsProvider.cache.get(key);
        if (!found) {
            const { fieldNames, thumbnailFieldNames } = getConfig();
            found = this.firstExisting(setName, provider, fieldNames.map(f => `$select=${f}`)).pipe(
                switchMap(i => i < 0 ? of(null) : this.firstExisting(setName, provider,
                    thumbnailFieldNames.map(t => `$select=Id&$expand=${t}`)).pipe(
                    map(t => ({ videoField: fieldNames[i], thumbnailField: t < 0 ? null : thumbnailFieldNames[t] }))
                )),
                shareReplay(1)
            );
            YouTubeColumnsProvider.cache.set(key, found);
        }

        return found;
    }

    /** Index of the first query the set accepts, or -1. Queries run one after another and stop at the first hit. */
    private firstExisting(setName: string, provider: string, queries: string[]): Observable<number> {
        const providerParam = provider ? `&sf_provider=${encodeURIComponent(provider)}` : "";
        const probes = queries.map((q, i) => defer(() =>
            this.http.get(`${HTTP_PREFIX}/sf/system/${setName}?$top=0&${q}${providerParam}`).pipe(
                map(() => i),
                catchError(() => of(-1))
            )));

        return concat(...probes).pipe(filter(i => i >= 0), take(1), defaultIfEmpty(-1));
    }
}

export const YOUTUBE_FIELDS_PROVIDER: ClassProvider = { provide: FIELDS_PROVIDER_TOKEN, useClass: YouTubeFieldsProvider, multi: true };
export const YOUTUBE_COLUMNS_PROVIDER: ClassProvider = { provide: COLUMNS_TOKEN, useClass: YouTubeColumnsProvider, multi: true };
