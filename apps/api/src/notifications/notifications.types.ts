export const notificationTemplates = [
  "booking-confirmation",
  "reminder-24h",
  "reminder-1h",
  "cancellation-email",
  "reschedule-email",
] as const;

export type NotificationTemplate = (typeof notificationTemplates)[number];
export type NotificationAudience = "host" | "invitee";

export type NotificationPayload = {
  bookingId: string;
  bookingPublicToken: string;
  audience: NotificationAudience;
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
  startTime: string;
  endTime: string;
  previousStartTime?: string;
  previousEndTime?: string;
  reason?: string | null;
  message?: string | null;
  reminderOffsetMinutes?: number;
};

export type NotificationJobData = {
  deliveryId: string;
};

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
};

export type SendEmailResult = {
  providerMessageId?: string | null;
};

export interface EmailProvider {
  sendEmail(input: SendEmailInput): Promise<SendEmailResult>;
}
