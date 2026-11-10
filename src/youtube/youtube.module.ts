import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { provideHttpClient, withInterceptorsFromDi } from "@angular/common/http";
import { FrameworkModule } from "@progress/sitefinity-adminapp-sdk/app/api/v1";
import { SfInputModule } from "@progress/sitefinity-component-framework";
import { YOUTUBE_COLUMNS_PROVIDER, YOUTUBE_FIELDS_PROVIDER } from "./youtube.providers";
import { YouTubeThumbnailCellComponent } from "./youtube-thumbnail-cell.component";
import { YouTubeUrlReadonlyComponent } from "./youtube-url-readonly.component";
import { YouTubeUrlWriteComponent } from "./youtube-url-write.component";

@NgModule({
    declarations: [YouTubeUrlWriteComponent, YouTubeUrlReadonlyComponent, YouTubeThumbnailCellComponent],
    imports: [CommonModule, FormsModule, SfInputModule, FrameworkModule],
    providers: [YOUTUBE_FIELDS_PROVIDER, YOUTUBE_COLUMNS_PROVIDER, provideHttpClient(withInterceptorsFromDi())]
})
export class YouTubeFieldModule { }
