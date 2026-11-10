import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";
import { SettingsBase } from "@progress/sitefinity-adminapp-sdk/app/api/v1";
import { parseYouTube } from "./youtube";

export const YOUTUBE_ERROR_KEY = "youtubeUrl";
export const YOUTUBE_MISSING_KEY = "youtubeMissing";

/**
 * Video ids YouTube has told us do not exist (oEmbed 400/404). Filled by the write component after its
 * lookup, which then re-writes the value so the form re-validates.
 */
export const missingYouTubeIds = new Set<string>();

/** Blocks Save while the text is not a recognisable YouTube video, or YouTube says the video doesn't exist. */
export function youTubeUrlValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = (control.value || "").toString().trim();
        if (!value) {
            return null;
        }

        const parsed = parseYouTube(value);
        if (!parsed) {
            return { [YOUTUBE_ERROR_KEY]: true };
        }

        return missingYouTubeIds.has(parsed.id) ? { [YOUTUBE_MISSING_KEY]: true } : null;
    };
}

export class YouTubeUrlSettings extends SettingsBase {
    init(metadata: any) {
        super.init(metadata);
    }

    getValidators(): ValidatorFn[] {
        const validators = super.getValidators() || [];
        validators.push(youTubeUrlValidator());
        return validators;
    }
}
