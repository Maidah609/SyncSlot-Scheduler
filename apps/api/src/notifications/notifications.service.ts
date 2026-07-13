import { Injectable, Logger } from "@nestjs/common";
import { NotificationDeliveryStatus, PrismaService } from "@syncslot/database";
import { DateTime } from "luxon";
import { NotificationsQueueService } from "./notifications.queue";
import type {
  NotificationAudience,
  NotificationPayload,
  NotificationTemplate,
} from "./notifications.types";

type BookingNotificationContext = {
  bookingId: string;
  bookingPublicToken: string;
  startTime: Date;
  endTime: Date;
  host: {
    email: string;
    name: string;
    username: string;
  };
  invitee: {
    email: string;
    name: string;
    timezone: string;
  };
  eventType: {
    title: string;
    slug: string;
    durationMinutes: number;
  };
};

type ChangeMetadata = {
  reason?: string | null;
  message?: string | null;
  previousStartTime?: Date;
  previousEndTime?: Date;
};

const MAX_ATTEMPTS = 3;
const BACKOFF_DELAY_MS = 250;
const IMMEDIATE_REMOVE_ON_FAIL = 1000;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly notificationsEnabled = process.env.NODE_ENV !== "test"
    || process.env.SYNCSLOT_ENABLE_NOTIFICATION_TEST_WORKER === "true";

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: NotificationsQueueService,
  ) {}

  async enqueueBookingCreated(context: BookingNotificationContext) {
    if (!this.notificationsEnabled) {
      return;
    }

    await this.createDeliveriesAndSchedule([
      this.buildDelivery("booking-confirmation", "invitee", context),
      this.buildDelivery("booking-confirmation", "host", context),
      this.buildDelivery("reminder-24h", "invitee", context, { reminderOffsetMinutes: 24 * 60 }),
      this.buildDelivery("reminder-24h", "host", context, { reminderOffsetMinutes: 24 * 60 }),
      this.buildDelivery("reminder-1h", "invitee", context, { reminderOffsetMinutes: 60 }),
      this.buildDelivery("reminder-1h", "host", context, { reminderOffsetMinutes: 60 }),
    ]);
  }

  async enqueueBookingCancelled(context: BookingNotificationContext, metadata: ChangeMetadata) {
    if (!this.notificationsEnabled) {
      return;
    }

    await this.cancelScheduledReminders(context.bookingId);
    await this.createDeliveriesAndSchedule([
      this.buildDelivery("cancellation-email", "invitee", context, metadata),
      this.buildDelivery("cancellation-email", "host", context, metadata),
    ]);
  }

  async enqueueBookingRescheduled(
    previous: BookingNotificationContext,
    replacement: BookingNotificationContext,
    metadata: ChangeMetadata,
  ) {
    if (!this.notificationsEnabled) {
      return;
    }

    await this.cancelScheduledReminders(previous.bookingId);

    await this.createDeliveriesAndSchedule([
      this.buildDelivery("reschedule-email", "invitee", replacement, {
        ...metadata,
        previousStartTime: previous.startTime,
        previousEndTime: previous.endTime,
      }),
      this.buildDelivery("reschedule-email", "host", replacement, {
        ...metadata,
        previousStartTime: previous.startTime,
        previousEndTime: previous.endTime,
      }),
      this.buildDelivery("reminder-24h", "invitee", replacement, { reminderOffsetMinutes: 24 * 60 }),
      this.buildDelivery("reminder-24h", "host", replacement, { reminderOffsetMinutes: 24 * 60 }),
      this.buildDelivery("reminder-1h", "invitee", replacement, { reminderOffsetMinutes: 60 }),
      this.buildDelivery("reminder-1h", "host", replacement, { reminderOffsetMinutes: 60 }),
    ]);
  }

  private buildDelivery(
    template: NotificationTemplate,
    audience: NotificationAudience,
    context: BookingNotificationContext,
    metadata: ChangeMetadata & { reminderOffsetMinutes?: number } = {},
  ) {
    const recipient = audience === "host" ? context.host.email : context.invitee.email;
    const payload: NotificationPayload = {
      bookingId: context.bookingId,
      bookingPublicToken: context.bookingPublicToken,
      audience,
      host: context.host,
      invitee: context.invitee,
      eventType: context.eventType,
      startTime: context.startTime.toISOString(),
      endTime: context.endTime.toISOString(),
      previousStartTime: metadata.previousStartTime?.toISOString(),
      previousEndTime: metadata.previousEndTime?.toISOString(),
      reason: metadata.reason ?? null,
      message: metadata.message ?? null,
      reminderOffsetMinutes: metadata.reminderOffsetMinutes,
    };

    return {
      template,
      audience,
      recipient,
      payload,
      delay: this.computeDelay(template, context.startTime),
    };
  }

  private computeDelay(template: NotificationTemplate, startTime: Date) {
    const start = DateTime.fromJSDate(startTime).toUTC();

    if (template === "reminder-24h") {
      return Math.max(0, start.minus({ hours: 24 }).toMillis() - Date.now());
    }

    if (template === "reminder-1h") {
      return Math.max(0, start.minus({ hours: 1 }).toMillis() - Date.now());
    }

    return 0;
  }

  private async createDeliveriesAndSchedule(
    definitions: Array<{
      template: NotificationTemplate;
      audience: NotificationAudience;
      recipient: string;
      payload: NotificationPayload;
      delay: number;
    }>,
  ) {
    const jobs: Array<{
      name: string;
      data: { deliveryId: string };
      opts: {
        attempts: number;
        backoff: { type: "exponential"; delay: number };
        jobId: string;
        delay?: number;
        removeOnComplete: boolean;
        removeOnFail: number;
      };
    }> = [];

    const createdDeliveryIds: string[] = [];

    try {
      for (const definition of definitions) {
        const delivery = await this.prisma.notificationDelivery.create({
          data: {
            channel: "email",
            template: definition.template,
            recipient: definition.recipient,
            provider: "resend",
            status: NotificationDeliveryStatus.PENDING,
            payload: definition.payload,
          },
        });

        createdDeliveryIds.push(delivery.id);
        jobs.push({
          name: definition.template,
          data: { deliveryId: delivery.id },
          opts: {
            attempts: MAX_ATTEMPTS,
            backoff: { type: "exponential", delay: BACKOFF_DELAY_MS },
            jobId: this.buildJobId(definition.payload.bookingId, definition.template, definition.audience),
            ...(definition.delay > 0 ? { delay: definition.delay } : {}),
            removeOnComplete: true,
            removeOnFail: IMMEDIATE_REMOVE_ON_FAIL,
          },
        });
      }

      await this.queueService.addBulk(jobs);
    } catch (error) {
      if (createdDeliveryIds.length > 0) {
        await this.prisma.notificationDelivery.updateMany({
          where: {
            id: { in: createdDeliveryIds },
            status: NotificationDeliveryStatus.PENDING,
          },
          data: {
            status: NotificationDeliveryStatus.FAILED,
            failedAt: new Date(),
          },
        });
      }

      const message = error instanceof Error ? error.message : "Unknown queue scheduling failure.";
      this.logger.error(`Failed to enqueue notifications: ${message}`);
    }
  }

  async cancelScheduledReminders(bookingId: string) {
    const reminderTemplates: NotificationTemplate[] = ["reminder-24h", "reminder-1h"];

    for (const template of reminderTemplates) {
      for (const audience of ["host", "invitee"] as const) {
        await this.queueService.removeJob(this.buildJobId(bookingId, template, audience));
      }
    }

    const pendingDeliveries = await this.prisma.notificationDelivery.findMany({
      where: {
        status: NotificationDeliveryStatus.PENDING,
        template: { in: reminderTemplates },
      },
    });

    const matchingIds = pendingDeliveries
      .filter((delivery) => this.extractBookingId(delivery.payload) === bookingId)
      .map((delivery) => delivery.id);

    if (matchingIds.length === 0) {
      return;
    }

    await this.prisma.notificationDelivery.updateMany({
      where: {
        id: { in: matchingIds },
        status: NotificationDeliveryStatus.PENDING,
      },
      data: {
        status: NotificationDeliveryStatus.FAILED,
        failedAt: new Date(),
      },
    });
  }

  private extractBookingId(payload: unknown) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return null;
    }

    const bookingId = (payload as { bookingId?: unknown }).bookingId;
    return typeof bookingId === "string" ? bookingId : null;
  }

  private buildJobId(bookingId: string, template: NotificationTemplate, audience: NotificationAudience) {
    return `notification__${bookingId}__${template}__${audience}`;
  }
}
