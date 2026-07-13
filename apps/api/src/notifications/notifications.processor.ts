import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Inject } from "@nestjs/common";
import { NotificationDeliveryStatus, PrismaService } from "@syncslot/database";
import { getEnvConfig } from "@syncslot/config";
import { Worker } from "bullmq";
import { DateTime } from "luxon";
import { EMAIL_PROVIDER_TOKEN } from "./notifications.constants";
import { NotificationsQueueService } from "./notifications.queue";
import type {
  EmailProvider,
  NotificationAudience,
  NotificationJobData,
  NotificationPayload,
  NotificationTemplate,
} from "./notifications.types";

@Injectable()
export class NotificationsProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsProcessor.name);
  private readonly env = getEnvConfig();
  private readonly notificationsEnabled = process.env.NODE_ENV !== "test"
    || process.env.SYNCSLOT_ENABLE_NOTIFICATION_TEST_WORKER === "true";
  private readonly workerConnection = {
    url: this.env.REDIS_URL,
    maxRetriesPerRequest: null,
  } as const;
  private worker: Worker<NotificationJobData> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: NotificationsQueueService,
    @Inject(EMAIL_PROVIDER_TOKEN) private readonly emailProvider: EmailProvider,
  ) {}

  onModuleInit() {
    if (!this.notificationsEnabled) {
      return;
    }

    this.worker = new Worker(
      this.queueService.getQueueName(),
      (job) => this.processJob(job.data.deliveryId, job.opts.attempts ?? 1, job.attemptsMade),
      {
        connection: this.workerConnection,
        prefix: this.queueService.getPrefix(),
      },
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private async processJob(deliveryId: string, attempts: number, attemptsMade: number) {
    const delivery = await this.prisma.notificationDelivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery || delivery.status !== NotificationDeliveryStatus.PENDING) {
      return;
    }

    const payload = delivery.payload as NotificationPayload;
    const email = this.buildEmail(delivery.template as NotificationTemplate, payload);

    try {
      const result = await this.emailProvider.sendEmail({
        to: delivery.recipient,
        subject: email.subject,
        text: email.text,
      });

      await this.prisma.notificationDelivery.updateMany({
        where: { id: delivery.id },
        data: {
          status: NotificationDeliveryStatus.SENT,
          providerMessageId: result.providerMessageId ?? null,
          sentAt: new Date(),
          failedAt: null,
        },
      });
    } catch (error) {
      const isFinalAttempt = attemptsMade + 1 >= attempts;

      if (isFinalAttempt) {
        await this.prisma.notificationDelivery.updateMany({
          where: { id: delivery.id },
          data: {
            status: NotificationDeliveryStatus.FAILED,
            failedAt: new Date(),
          },
        });
      }

      const message = error instanceof Error ? error.message : "Unknown notification failure.";
      this.logger.error(`Notification job failed for delivery ${delivery.id}: ${message}`);
      throw error;
    }
  }

  private buildEmail(template: NotificationTemplate, payload: NotificationPayload) {
    const audienceName = this.getAudienceName(payload, payload.audience);
    const counterpartName = this.getAudienceName(payload, payload.audience === "host" ? "invitee" : "host");
    const formattedStart = DateTime.fromISO(payload.startTime).setZone(payload.invitee.timezone).toFormat("DDD t ZZZZ");
    const eventLabel = `${payload.eventType.title} with ${counterpartName}`;

    switch (template) {
      case "booking-confirmation":
        return {
          subject: `Booking confirmed: ${payload.eventType.title}`,
          text: `Hi ${audienceName}, your booking for ${eventLabel} is confirmed for ${formattedStart}.`,
        };
      case "reminder-24h":
        return {
          subject: `Reminder: ${payload.eventType.title} in 24 hours`,
          text: `Hi ${audienceName}, this is your 24-hour reminder for ${eventLabel} at ${formattedStart}.`,
        };
      case "reminder-1h":
        return {
          subject: `Reminder: ${payload.eventType.title} in 1 hour`,
          text: `Hi ${audienceName}, this is your 1-hour reminder for ${eventLabel} at ${formattedStart}.`,
        };
      case "cancellation-email":
        return {
          subject: `Booking cancelled: ${payload.eventType.title}`,
          text: `Hi ${audienceName}, the booking for ${eventLabel} at ${formattedStart} has been cancelled.`,
        };
      case "reschedule-email": {
        const previousStart = payload.previousStartTime
          ? DateTime.fromISO(payload.previousStartTime).setZone(payload.invitee.timezone).toFormat("DDD t ZZZZ")
          : "the previous time";
        return {
          subject: `Booking rescheduled: ${payload.eventType.title}`,
          text: `Hi ${audienceName}, the booking for ${eventLabel} moved from ${previousStart} to ${formattedStart}.`,
        };
      }
      default:
        throw new Error(`Unsupported notification template: ${template}`);
    }
  }

  private getAudienceName(payload: NotificationPayload, audience: NotificationAudience) {
    return audience === "host" ? payload.host.name : payload.invitee.name;
  }
}
