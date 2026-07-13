import { Module } from "@nestjs/common";
import { ResendEmailProvider } from "./resend-email.provider";
import { EMAIL_PROVIDER_TOKEN } from "./notifications.constants";
import { NotificationsProcessor } from "./notifications.processor";
import { NotificationsQueueService } from "./notifications.queue";
import { NotificationsService } from "./notifications.service";

@Module({
  providers: [
    NotificationsQueueService,
    NotificationsService,
    NotificationsProcessor,
    ResendEmailProvider,
    {
      provide: EMAIL_PROVIDER_TOKEN,
      useExisting: ResendEmailProvider,
    },
  ],
  exports: [NotificationsService, NotificationsQueueService, EMAIL_PROVIDER_TOKEN],
})
export class NotificationsModule {}
