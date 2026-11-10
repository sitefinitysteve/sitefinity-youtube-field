import { SitefinityExtensionStore } from "@progress/sitefinity-adminapp-sdk/app/api/v1";
import { YouTubeFieldModule } from "./youtube/youtube.module";

declare const sitefinityExtensionsStore: SitefinityExtensionStore;

sitefinityExtensionsStore.addExtensionModule(YouTubeFieldModule);
