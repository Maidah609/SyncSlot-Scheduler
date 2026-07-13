import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import cookieParser from "cookie-parser";
import request from "supertest";
import { ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import {
  LocationType,
  NotificationDeliveryStatus,
  PrismaService,
} from "@syncslot/database";
import { DateTime } from "luxon";
import { AppModule } from "../dist/app.module";
import { AuthService } from "../dist/auth/auth.service";
import { GlobalExceptionFilter } from "../dist/common/filters/global-exception.filter";
import { NotificationsProcessor } from "../dist/notifications/notifications.processor";
import { NotificationsQueueService } from "../dist/notifications/notifications.queue";
import { ResendEmailProvider } from "../dist/notifications/resend-email.provider";

type FakeProvider = {
  calls: Array<{ to: string; subject: string; text: string }>;
  sendEmail: (input: { to: string; subject: string; text: string }) => Promise<{ providerMessageId?: string | null }>;
};

type AppContext = {
  app: any;
  prisma: PrismaService;
  queueService: NotificationsQueueService;
  fakeProvider: FakeProvider;
  authService: AuthService;
  processor: NotificationsProcessor;
};

type Fixture = {
  userId: string;
  username: string;
  hostEmail: string;
  eventSlug: string;
  eventTypeId: string;
  bookingDate: string;
  slotStartIso: string;
  reminder24hTargetMs: number;
  reminder1hTargetMs: number;
  inviteeEmail: string;
};

async function createApp(options: {
  fakeProvider?: FakeProvider;
  enableWorker?: boolean;
} = {}): Promise<AppContext> {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousEnableWorker = process.env.SYNCSLOT_ENABLE_NOTIFICATION_TEST_WORKER;
  const previousQueuePrefix = process.env.SYNCSLOT_NOTIFICATION_QUEUE_PREFIX;

  process.env.NODE_ENV = "test";

  if (options.enableWorker) {
    process.env.SYNCSLOT_ENABLE_NOTIFICATION_TEST_WORKER = "true";
    process.env.SYNCSLOT_NOTIFICATION_QUEUE_PREFIX = `syncslot-notifications-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  } else {
    delete process.env.SYNCSLOT_ENABLE_NOTIFICATION_TEST_WORKER;
    delete process.env.SYNCSLOT_NOTIFICATION_QUEUE_PREFIX;
  }

  let moduleBuilder = Test.createTestingModule({
    imports: [AppModule],
  });

  if (options.fakeProvider) {
    moduleBuilder = moduleBuilder
      .overrideProvider(ResendEmailProvider)
      .useValue(options.fakeProvider);
  }

  const moduleRef = await moduleBuilder.compile();

  const app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.setGlobalPrefix("api");
  await app.init();

  const queueService = app.get(NotificationsQueueService);
  if (options.enableWorker) {
    await queueService.obliterate();
  }

  if (previousEnableWorker === undefined) {
    delete process.env.SYNCSLOT_ENABLE_NOTIFICATION_TEST_WORKER;
  } else {
    process.env.SYNCSLOT_ENABLE_NOTIFICATION_TEST_WORKER = previousEnableWorker;
  }

  if (previousQueuePrefix === undefined) {
    delete process.env.SYNCSLOT_NOTIFICATION_QUEUE_PREFIX;
  } else {
    process.env.SYNCSLOT_NOTIFICATION_QUEUE_PREFIX = previousQueuePrefix;
  }

  if (previousNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = previousNodeEnv;
  }

  return {
    app,
    prisma: app.get(PrismaService),
    queueService,
    fakeProvider: options.fakeProvider ?? createSuccessProvider(),
    authService: app.get(AuthService),
    processor: app.get(NotificationsProcessor),
  };
}

function createSuccessProvider(): FakeProvider {
  const calls: FakeProvider["calls"] = [];

  return {
    calls,
    async sendEmail(input) {
      calls.push(input);
      return { providerMessageId: `fake-${calls.length}` };
    },
  };
}

function createFailingProvider(): FakeProvider {
  const calls: FakeProvider["calls"] = [];

  return {
    calls,
    async sendEmail(input) {
      calls.push(input);
      throw new Error("Synthetic provider failure");
    },
  };
}

async function createFixture(prisma: PrismaService): Promise<Fixture> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const bookingDateTime = DateTime.utc().plus({ days: 2 }).startOf("day").plus({ hours: 15 });
  const bookingDate = bookingDateTime.toISODate();
  assert.ok(bookingDate);

  const hostEmail = `notifications-host-${suffix}@example.com`;
  const inviteeEmail = `notifications-invitee-${suffix}@example.com`;

  const user = await prisma.user.create({
    data: {
      email: hostEmail,
      emailVerifiedAt: new Date(),
      name: "Notifications Host",
      username: `notifications-host-${suffix}`,
      timezone: "UTC",
      onboardingCompletedAt: new Date(),
      title: "Host",
      welcome: "Welcome",
    },
  });

  const schedule = await prisma.schedule.create({
    data: {
      userId: user.id,
      name: "Notifications Schedule",
      timezone: "UTC",
      isDefault: true,
      dateOverrides: {
        create: {
          date: new Date(`${bookingDate}T00:00:00.000Z`),
          isClosed: false,
          startTime: "15:00",
          endTime: "18:00",
        },
      },
    },
  });

  const eventType = await prisma.eventType.create({
    data: {
      userId: user.id,
      title: "Notifications Event",
      slug: `notifications-event-${suffix}`,
      durationMinutes: 60,
      locationType: LocationType.VIDEO,
      locationValue: "Zoom",
      isActive: true,
      minNoticeMins: 0,
      maxFutureDays: 30,
      bufferBeforeMins: 0,
      bufferAfterMins: 0,
      scheduleId: schedule.id,
    },
  });

  const slotStartIso = `${bookingDate}T15:00:00Z`;

  return {
    userId: user.id,
    username: user.username,
    hostEmail,
    eventSlug: eventType.slug,
    eventTypeId: eventType.id,
    bookingDate,
    slotStartIso,
    reminder24hTargetMs: bookingDateTime.minus({ hours: 24 }).toMillis(),
    reminder1hTargetMs: bookingDateTime.minus({ hours: 1 }).toMillis(),
    inviteeEmail,
  };
}

async function cleanupFixture(prisma: PrismaService, fixture: Fixture) {
  await prisma.notificationDelivery.deleteMany({
    where: {
      recipient: { in: [fixture.hostEmail, fixture.inviteeEmail] },
    },
  });
  await prisma.bookingAuditLog.deleteMany({
    where: {
      booking: {
        hostId: fixture.userId,
      },
    },
  });
  await prisma.booking.deleteMany({
    where: { hostId: fixture.userId },
  });
  await prisma.eventType.deleteMany({
    where: { userId: fixture.userId },
  });
  await prisma.schedule.deleteMany({
    where: { userId: fixture.userId },
  });
  await prisma.user.deleteMany({
    where: { id: fixture.userId },
  });
}

async function createHostCookie(authService: AuthService, prisma: PrismaService, userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      timezone: true,
      title: true,
      welcome: true,
      emailVerifiedAt: true,
      onboardingCompletedAt: true,
    },
  });

  const session = await authService.loginWithUser(user);
  return `${authService.getCookieName()}=${session.sessionToken}`;
}

async function waitFor(predicate: () => Promise<boolean>, timeoutMs = 15000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await predicate()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Timed out after ${timeoutMs}ms waiting for condition.`);
}

async function settleAfterClose(app: { close: () => Promise<void> }) {
  await app.close();
  await new Promise((resolve) => setTimeout(resolve, 50));
}

async function getDeliveriesForBooking(prisma: PrismaService, bookingId: string) {
  const deliveries = await prisma.notificationDelivery.findMany({
    orderBy: { createdAt: "asc" },
  });

  return deliveries.filter((delivery) => {
    const payload = delivery.payload as { bookingId?: unknown };
    return payload.bookingId === bookingId;
  });
}

test("POST /api/public/:username/:eventSlug/book enqueues confirmation and reminder jobs with correct recipients and delays", async () => {
  const fakeProvider = createSuccessProvider();
  const { app, prisma, queueService } = await createApp({ fakeProvider, enableWorker: true });
  const fixture = await createFixture(prisma);
  const beforeMs = Date.now();

  try {
    const response = await request(app.getHttpServer())
      .post(`/api/public/${fixture.username}/${fixture.eventSlug}/book`)
      .send({
        inviteeName: "Queue Invitee",
        inviteeEmail: fixture.inviteeEmail,
        inviteeTimezone: "UTC",
        startTime: fixture.slotStartIso,
        answers: {},
      });
    const afterMs = Date.now();

    assert.equal(response.status, 201);
    const bookingId = response.body.booking.id as string;

    await waitFor(async () => {
      const deliveries = await getDeliveriesForBooking(prisma, bookingId);
      return deliveries.filter((delivery) => delivery.status === NotificationDeliveryStatus.SENT).length >= 2;
    });

    const deliveries = await getDeliveriesForBooking(prisma, bookingId);
    assert.equal(deliveries.length, 6);

    const templateCounts = deliveries.reduce<Record<string, number>>((counts, delivery) => {
      counts[delivery.template] = (counts[delivery.template] ?? 0) + 1;
      return counts;
    }, {});

    assert.equal(templateCounts["booking-confirmation"], 2);
    assert.equal(templateCounts["reminder-24h"], 2);
    assert.equal(templateCounts["reminder-1h"], 2);

    const immediateRecipients = new Set(
      deliveries
        .filter((delivery) => delivery.template === "booking-confirmation")
        .map((delivery) => delivery.recipient),
    );
    assert.deepEqual(immediateRecipients, new Set([fixture.hostEmail, fixture.inviteeEmail]));

    const delayedJobs = await queueService.getQueue().getDelayed();
    assert.equal(delayedJobs.length, 4);

    const delayedDeliveries = new Map(deliveries.map((delivery) => [delivery.id, delivery]));
    for (const job of delayedJobs) {
      const delivery = delayedDeliveries.get(job.data.deliveryId);
      assert.ok(delivery);
      assert.ok(delivery.template === "reminder-24h" || delivery.template === "reminder-1h");
      assert.ok(delivery.recipient === fixture.hostEmail || delivery.recipient === fixture.inviteeEmail);

      const expectedTargetMs = delivery.template === "reminder-24h"
        ? fixture.reminder24hTargetMs
        : fixture.reminder1hTargetMs;
      const minDelay = expectedTargetMs - afterMs - 2000;
      const maxDelay = expectedTargetMs - beforeMs + 2000;
      assert.ok(job.delay >= minDelay, `Expected delay ${job.delay} to be >= ${minDelay}`);
      assert.ok(job.delay <= maxDelay, `Expected delay ${job.delay} to be <= ${maxDelay}`);
    }
  } finally {
    await cleanupFixture(prisma, fixture);
    await app.close();
  }
});

test("notification processor marks immediate deliveries SENT with the stubbed provider and never uses the network", async () => {
  const fakeProvider = createSuccessProvider();
  const { app, prisma } = await createApp({ fakeProvider, enableWorker: true });
  const fixture = await createFixture(prisma);

  try {
    const response = await request(app.getHttpServer())
      .post(`/api/public/${fixture.username}/${fixture.eventSlug}/book`)
      .send({
        inviteeName: "Stubbed Invitee",
        inviteeEmail: fixture.inviteeEmail,
        inviteeTimezone: "UTC",
        startTime: fixture.slotStartIso,
        answers: {},
      });
    assert.equal(response.status, 201);

    const bookingId = response.body.booking.id as string;
    await waitFor(async () => {
      const deliveries = await getDeliveriesForBooking(prisma, bookingId);
      const confirmations = deliveries.filter((delivery) => delivery.template === "booking-confirmation");
      return confirmations.length === 2
        && confirmations.every((delivery) => delivery.status === NotificationDeliveryStatus.SENT);
    });

    const deliveries = await getDeliveriesForBooking(prisma, bookingId);
    const confirmationDeliveries = deliveries.filter((delivery) => delivery.template === "booking-confirmation");
    assert.equal(confirmationDeliveries.length, 2);
    assert.ok(confirmationDeliveries.every((delivery) => delivery.status === NotificationDeliveryStatus.SENT));
    assert.equal(fakeProvider.calls.length, 2);
    assert.deepEqual(new Set(fakeProvider.calls.map((call) => call.to)), new Set([fixture.hostEmail, fixture.inviteeEmail]));
  } finally {
    await cleanupFixture(prisma, fixture);
    await app.close();
  }
});

test("notification processor marks immediate deliveries FAILED after retry exhaustion with the stubbed provider", async () => {
  const fakeProvider = createFailingProvider();
  const { app, prisma } = await createApp({ fakeProvider, enableWorker: true });
  const fixture = await createFixture(prisma);

  try {
    const response = await request(app.getHttpServer())
      .post(`/api/public/${fixture.username}/${fixture.eventSlug}/book`)
      .send({
        inviteeName: "Failing Invitee",
        inviteeEmail: fixture.inviteeEmail,
        inviteeTimezone: "UTC",
        startTime: fixture.slotStartIso,
        answers: {},
      });
    assert.equal(response.status, 201);

    const bookingId = response.body.booking.id as string;
    await waitFor(async () => {
      const deliveries = await getDeliveriesForBooking(prisma, bookingId);
      const confirmations = deliveries.filter((delivery) => delivery.template === "booking-confirmation");
      return confirmations.length === 2
        && confirmations.every((delivery) => delivery.status === NotificationDeliveryStatus.FAILED);
    }, 20000);

    const deliveries = await getDeliveriesForBooking(prisma, bookingId);
    const confirmationDeliveries = deliveries.filter((delivery) => delivery.template === "booking-confirmation");
    assert.equal(confirmationDeliveries.length, 2);
    assert.ok(confirmationDeliveries.every((delivery) => delivery.status === NotificationDeliveryStatus.FAILED));
    assert.ok(fakeProvider.calls.length >= 4);
  } finally {
    await cleanupFixture(prisma, fixture);
    await app.close();
  }
});

test("booking cancellation removes scheduled reminder jobs and enqueues cancellation deliveries", async () => {
  const fakeProvider = createSuccessProvider();
  const { app, prisma, queueService } = await createApp({ fakeProvider, enableWorker: true });
  const fixture = await createFixture(prisma);

  try {
    const createResponse = await request(app.getHttpServer())
      .post(`/api/public/${fixture.username}/${fixture.eventSlug}/book`)
      .send({
        inviteeName: "Cancellation Invitee",
        inviteeEmail: fixture.inviteeEmail,
        inviteeTimezone: "UTC",
        startTime: fixture.slotStartIso,
        answers: {},
      });
    assert.equal(createResponse.status, 201);

    const bookingId = createResponse.body.booking.id as string;
    const publicToken = createResponse.body.booking.publicToken as string;

    await waitFor(async () => (await queueService.getQueue().getDelayed()).length === 4);

    const cancelResponse = await request(app.getHttpServer())
      .post(`/api/public/bookings/${publicToken}/cancel`)
      .send({ reason: "No longer needed" });
    assert.equal(cancelResponse.status, 200);

    await waitFor(async () => {
      const deliveries = await getDeliveriesForBooking(prisma, bookingId);
      return deliveries.filter((delivery) => delivery.template === "cancellation-email").length === 2;
    });

    const delayedJobs = await queueService.getQueue().getDelayed();
    assert.equal(delayedJobs.length, 0);

    const deliveries = await getDeliveriesForBooking(prisma, bookingId);
    const reminderDeliveries = deliveries.filter((delivery) => delivery.template.startsWith("reminder-"));
    assert.ok(reminderDeliveries.every((delivery) => delivery.status === NotificationDeliveryStatus.FAILED));

    const cancellationDeliveries = deliveries.filter((delivery) => delivery.template === "cancellation-email");
    assert.equal(cancellationDeliveries.length, 2);
  } finally {
    await cleanupFixture(prisma, fixture);
    await app.close();
  }
});

test("host booking cancellation removes scheduled reminder jobs and enqueues cancellation deliveries", async () => {
  const fakeProvider = createSuccessProvider();
  const { app, prisma, queueService, authService } = await createApp({ fakeProvider, enableWorker: true });
  const fixture = await createFixture(prisma);

  try {
    const createResponse = await request(app.getHttpServer())
      .post(`/api/public/${fixture.username}/${fixture.eventSlug}/book`)
      .send({
        inviteeName: "Host Cancellation Invitee",
        inviteeEmail: fixture.inviteeEmail,
        inviteeTimezone: "UTC",
        startTime: fixture.slotStartIso,
        answers: {},
      });
    assert.equal(createResponse.status, 201);

    const bookingId = createResponse.body.booking.id as string;
    await waitFor(async () => (await queueService.getQueue().getDelayed()).length === 4);

    const cookie = await createHostCookie(authService, prisma, fixture.userId);
    const cancelResponse = await request(app.getHttpServer())
      .post(`/api/bookings/${bookingId}/cancel`)
      .set("Cookie", cookie)
      .send({ reason: "Host cancelled it" });
    assert.equal(cancelResponse.status, 200);

    await waitFor(async () => {
      const deliveries = await getDeliveriesForBooking(prisma, bookingId);
      return deliveries.filter((delivery) => delivery.template === "cancellation-email").length === 2;
    });

    const delayedJobs = await queueService.getQueue().getDelayed();
    assert.equal(delayedJobs.length, 0);

    const deliveries = await getDeliveriesForBooking(prisma, bookingId);
    assert.ok(deliveries
      .filter((delivery) => delivery.template.startsWith("reminder-"))
      .every((delivery) => delivery.status === NotificationDeliveryStatus.FAILED));
    assert.equal(deliveries.filter((delivery) => delivery.template === "cancellation-email").length, 2);
  } finally {
    await cleanupFixture(prisma, fixture);
    await app.close();
  }
});

test("booking reschedule removes original reminder jobs and schedules replacement reminder jobs", async () => {
  const fakeProvider = createSuccessProvider();
  const { app, prisma, queueService } = await createApp({ fakeProvider, enableWorker: true });
  const fixture = await createFixture(prisma);

  try {
    const createResponse = await request(app.getHttpServer())
      .post(`/api/public/${fixture.username}/${fixture.eventSlug}/book`)
      .send({
        inviteeName: "Reschedule Invitee",
        inviteeEmail: fixture.inviteeEmail,
        inviteeTimezone: "UTC",
        startTime: fixture.slotStartIso,
        answers: {},
      });
    assert.equal(createResponse.status, 201);

    const originalBookingId = createResponse.body.booking.id as string;
    const publicToken = createResponse.body.booking.publicToken as string;
    const replacementStartIso = `${fixture.bookingDate}T16:00:00Z`;

    const rescheduleResponse = await request(app.getHttpServer())
      .post(`/api/public/bookings/${publicToken}/reschedule`)
      .send({ startTime: replacementStartIso, reason: "Move it later" });
    assert.equal(rescheduleResponse.status, 200);

    const replacementBookingId = rescheduleResponse.body.newBooking.id as string;

    await waitFor(async () => {
      const delayedJobs = await queueService.getQueue().getDelayed();
      return delayedJobs.length === 4;
    });

    const delayedJobs = await queueService.getQueue().getDelayed();
    const oldDeliveries = await getDeliveriesForBooking(prisma, originalBookingId);
    const replacementDeliveries = await getDeliveriesForBooking(prisma, replacementBookingId);

    assert.ok(oldDeliveries
      .filter((delivery) => delivery.template.startsWith("reminder-"))
      .every((delivery) => delivery.status === NotificationDeliveryStatus.FAILED));

    assert.equal(replacementDeliveries.filter((delivery) => delivery.template === "reschedule-email").length, 2);
    assert.equal(replacementDeliveries.filter((delivery) => delivery.template.startsWith("reminder-")).length, 4);
    assert.equal(delayedJobs.length, 4);
  } finally {
    await cleanupFixture(prisma, fixture);
    await app.close();
  }
});

test("host booking reschedule removes original reminder jobs and schedules replacement reminder jobs", async () => {
  const fakeProvider = createSuccessProvider();
  const { app, prisma, queueService, authService } = await createApp({ fakeProvider, enableWorker: true });
  const fixture = await createFixture(prisma);

  try {
    const createResponse = await request(app.getHttpServer())
      .post(`/api/public/${fixture.username}/${fixture.eventSlug}/book`)
      .send({
        inviteeName: "Host Reschedule Invitee",
        inviteeEmail: fixture.inviteeEmail,
        inviteeTimezone: "UTC",
        startTime: fixture.slotStartIso,
        answers: {},
      });
    assert.equal(createResponse.status, 201);

    const originalBookingId = createResponse.body.booking.id as string;
    const replacementStartIso = `${fixture.bookingDate}T16:00:00Z`;
    const cookie = await createHostCookie(authService, prisma, fixture.userId);

    const rescheduleResponse = await request(app.getHttpServer())
      .post(`/api/bookings/${originalBookingId}/reschedule`)
      .set("Cookie", cookie)
      .send({ startTime: replacementStartIso, reason: "Host moved it" });
    assert.equal(rescheduleResponse.status, 200);

    const replacementBookingId = rescheduleResponse.body.newBooking.id as string;
    await waitFor(async () => (await queueService.getQueue().getDelayed()).length === 4);

    const oldDeliveries = await getDeliveriesForBooking(prisma, originalBookingId);
    const replacementDeliveries = await getDeliveriesForBooking(prisma, replacementBookingId);

    assert.ok(oldDeliveries
      .filter((delivery) => delivery.template.startsWith("reminder-"))
      .every((delivery) => delivery.status === NotificationDeliveryStatus.FAILED));
    assert.equal(replacementDeliveries.filter((delivery) => delivery.template === "reschedule-email").length, 2);
    assert.equal(replacementDeliveries.filter((delivery) => delivery.template.startsWith("reminder-")).length, 4);
  } finally {
    await cleanupFixture(prisma, fixture);
    await app.close();
  }
});

test("notification worker opt-in stays scoped to the notification app and does not leak to a later app in the same process", async () => {
  const fakeProvider = createSuccessProvider();
  const notificationApp = await createApp({ fakeProvider, enableWorker: true });

  await settleAfterClose(notificationApp.app);

  const regularApp = await createApp();
  const fixture = await createFixture(regularApp.prisma);

  try {
    assert.equal((regularApp.processor as unknown as { worker: unknown }).worker, null);

    const response = await request(regularApp.app.getHttpServer())
      .post(`/api/public/${fixture.username}/${fixture.eventSlug}/book`)
      .send({
        inviteeName: "Isolation Invitee",
        inviteeEmail: fixture.inviteeEmail,
        inviteeTimezone: "UTC",
        startTime: fixture.slotStartIso,
        answers: {},
      });

    assert.equal(response.status, 201);

    const bookingId = response.body.booking.id as string;
    const deliveries = await getDeliveriesForBooking(regularApp.prisma, bookingId);
    assert.equal(deliveries.length, 0);
  } finally {
    await cleanupFixture(regularApp.prisma, fixture);
    await settleAfterClose(regularApp.app);
  }
});
