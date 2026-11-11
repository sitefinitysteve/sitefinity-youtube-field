import { ClassProvider, Injectable } from "@angular/core";
import { Observable, from, of } from "rxjs";
import { catchError, map, shareReplay } from "rxjs/operators";
import {
    COLUMNS_TOKEN, ColumnModel, EntityData, FIELDS_PROVIDER_TOKEN, FieldData, FieldRegistration, FieldTypes,
    FieldsProvider, HTTP_PREFIX, ListColumnsProvider
} from "@progress/sitefinity-adminapp-sdk/app/api/v1";
import { getConfig, matchFieldName, typeAllowed } from "./config";
import { indexMetadata, MetadataIndex, pickCellFields } from "./odata-metadata";
import { YouTubeThumbnailCellComponent } from "./youtube-thumbnail-cell.component";
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
 * Adds the thumbnail column to content lists whose type has one of the configured fields. The AdminApp does not
 * say which fields a type has, so the first list opened in a session reads the OData service's $metadata once
 * and every list after that is answered from it. Lists without a matching field (pages, news without the field)
 * get no column. If $metadata can't be read, no list gets the column.
 */
@Injectable()
export class YouTubeColumnsProvider implements ListColumnsProvider {
    private static metadata: Observable<MetadataIndex | null>;

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

        return this.index().pipe(
            map(index => index ? pickCellFields(index, metadata.setName, config.fieldNames, config.thumbnailFieldNames) : null),
            map(fields => {
                if (config.debug) {
                    console.log("[youtube-field] column fields for " + metadata.setName + ":", JSON.stringify(fields));
                }
                return fields ? [{
                    name: COLUMN_NAME,
                    title: config.columnTitle,
                    ordinal: config.columnOrdinal,
                    clickable: true,
                    componentData: { type: YouTubeThumbnailCellComponent, properties: { fields } }
                } as ColumnModel] : [];
            })
        );
    }

    getColumnsToRemove(): Observable<string[]> {
        return of([]);
    }

    private index(): Observable<MetadataIndex | null> {
        if (!YouTubeColumnsProvider.metadata) {
            // Plain fetch, not HttpClient: the AdminApp's interceptors force a JSON Accept header and rewrite the
            // query (dropping $format), and $metadata answers JSON requests with a 500. It is XML-only and
            // readable with the backend's own session cookie.
            // HTTP_PREFIX is a placeholder ("sfprefix") only HttpClient resolves, so build the service address from
            // where the backend is mounted: <site>/Sitefinity/adminapp/... -> <site>/sf/system/$metadata.
            const siteRoot = location.pathname.split(/\/sitefinity\//i)[0];
            YouTubeColumnsProvider.metadata = from(fetch(`${location.origin}${siteRoot}/sf/system/$metadata`, {
                credentials: "same-origin",
                headers: { Accept: "application/xml" }
            }).then(r => {
                if (!r.ok) {
                    throw new Error(`HTTP ${r.status}`);
                }
                return r.text();
            })).pipe(
                map(xml => {
                    const index = indexMetadata(xml);
                    if (index.size === 0) {
                        throw new Error("no entity sets in the response");
                    }
                    return index;
                }),
                catchError(err => {
                    console.warn("[youtube-field] could not read OData $metadata; no thumbnail column.", err);
                    return of(null);
                }),
                shareReplay(1)
            );
        }

        return YouTubeColumnsProvider.metadata;
    }
}

export const YOUTUBE_FIELDS_PROVIDER: ClassProvider = { provide: FIELDS_PROVIDER_TOKEN, useClass: YouTubeFieldsProvider, multi: true };
export const YOUTUBE_COLUMNS_PROVIDER: ClassProvider = { provide: COLUMNS_TOKEN, useClass: YouTubeColumnsProvider, multi: true };
