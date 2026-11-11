/**
 * Which fields each content type really has, read from the OData service's $metadata document.
 *
 * Probing with `$select=Field` is not reliable: some Sitefinity services (pages) ignore unknown fields and
 * answer 200, which would put the column on lists that have no video field at all.
 */
export interface EntitySetFields {
    /** Scalar properties (VideoUrl, Title, ...). */
    properties: string[];
    /** Navigation properties: related data such as image fields (CustomThumbnail). */
    navigation: string[];
}

/** Entity set name (lower-cased) -> its fields. */
export type MetadataIndex = Map<string, EntitySetFields>;

export interface CellFields {
    videoField: string;
    thumbnailField: string | null;
}

/** Build the index from the $metadata XML. Uses the browser's DOMParser. */
export function indexMetadata(xml: string): MetadataIndex {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const types = new Map<string, { properties: string[]; navigation: string[]; baseType: string | null }>();

    for (const schema of Array.from(doc.getElementsByTagNameNS("*", "Schema"))) {
        const namespace = schema.getAttribute("Namespace") || "";
        for (const entityType of Array.from(schema.getElementsByTagNameNS("*", "EntityType"))) {
            const properties: string[] = [];
            const navigation: string[] = [];
            for (const child of Array.from(entityType.children)) {
                const name = child.getAttribute("Name");
                if (!name) {
                    continue;
                }
                if (child.localName === "Property") {
                    properties.push(name);
                } else if (child.localName === "NavigationProperty") {
                    navigation.push(name);
                }
            }
            types.set(`${namespace}.${entityType.getAttribute("Name")}`, {
                properties, navigation, baseType: entityType.getAttribute("BaseType")
            });
        }
    }

    const index: MetadataIndex = new Map();
    for (const set of Array.from(doc.getElementsByTagNameNS("*", "EntitySet"))) {
        const name = set.getAttribute("Name");
        const typeName = set.getAttribute("EntityType");
        if (!name || !typeName) {
            continue;
        }

        // Fields declared on base types count too.
        const fields: EntitySetFields = { properties: [], navigation: [] };
        const seen = new Set<string>();
        let current: string | null = typeName;
        while (current && !seen.has(current) && types.has(current)) {
            seen.add(current);
            const t = types.get(current);
            fields.properties.push(...t.properties);
            fields.navigation.push(...t.navigation);
            current = t.baseType;
        }
        index.set(name.toLowerCase(), fields);
    }

    return index;
}

/**
 * The first configured video field the set has (as a scalar property) and the first configured thumbnail field
 * it has (as related data), matched case-insensitively and returned with the service's own spelling.
 * Null when the set has none of the video fields: no column for that list.
 */
export function pickCellFields(index: MetadataIndex, setName: string, fieldNames: string[], thumbnailFieldNames: string[]): CellFields | null {
    const fields = index.get((setName || "").toLowerCase());
    if (!fields) {
        return null;
    }

    const find = (available: string[], wanted: string[]) => {
        for (const w of wanted) {
            const hit = available.find(a => a.toLowerCase() === w.toLowerCase());
            if (hit) {
                return hit;
            }
        }
        return null;
    };

    const videoField = find(fields.properties, fieldNames);
    return videoField ? { videoField, thumbnailField: find(fields.navigation, thumbnailFieldNames) } : null;
}
